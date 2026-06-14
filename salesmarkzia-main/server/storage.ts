import { eq, and, gte, lte, asc, desc, sql } from "drizzle-orm";
import { db, clients, uploadBatches, salesRecords } from "../db";
import type { NewSalesRecordRow } from "../db/schema";
import type { SaleRecord } from "../src/types";

// ─── Slug helpers ─────────────────────────────────────────────────────
export function slugify(input: string): string {
  const base = (input || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return base || `c-${Date.now().toString(36)}`;
}

// Slugs that collide with app routes ("/admin", "/api/...") must never be
// assigned to a client, or the client page would be unreachable.
const RESERVED_SLUGS = new Set(["admin", "api"]);

async function ensureUniqueSlug(base: string, excludeId?: number): Promise<string> {
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.slug, candidate));
    const taken = RESERVED_SLUGS.has(candidate) || rows.some((row) => row.id !== excludeId);
    if (!taken) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

// ─── Date key derivation ──────────────────────────────────────────────
// Calendar-aware day count for a 1-based month, with leap-year handling, so a
// shape-valid but impossible date (Feb 31, month 99) can be rejected.
function daysInMonth(y: number, m: number): number {
  if (m < 1 || m > 12) return 0;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

// The stored `date` is the parser's UTC ISO string of a LOCAL-NOON instant, so
// its leading "YYYY-MM-DD" is the correct calendar day for the target region
// (Jordan). Slice it instead of re-parsing through Date to stay independent of
// the server's timezone. The leading shape is validated as a REAL calendar date
// (month 1-12, day within the month) before it is trusted — otherwise a
// malformed payload like "2024-99-99" or "2024-02-31" would persist a broken
// saleDay/monthKey. A shape match that fails calendar validation returns
// "unknown" directly (never falling through to `new Date`, which would silently
// roll "2024-02-31" forward to March 2).
function deriveKeys(dateIso: string): { saleDay: string; monthKey: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateIso || "");
  if (m) {
    const y = +m[1], mo = +m[2], da = +m[3];
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= daysInMonth(y, mo)) {
      return { saleDay: `${m[1]}-${m[2]}-${m[3]}`, monthKey: `${m[1]}-${m[2]}` };
    }
    return { saleDay: "unknown", monthKey: "unknown" };
  }
  const d = new Date(dateIso);
  if (!isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const da = String(d.getUTCDate()).padStart(2, "0");
    return { saleDay: `${y}-${mo}-${da}`, monthKey: `${y}-${mo}` };
  }
  return { saleDay: "unknown", monthKey: "unknown" };
}

function parseSourceRow(id: string | undefined): number | null {
  if (!id) return null;
  const m = /(\d+)\s*$/.exec(id);
  return m ? parseInt(m[1], 10) : null;
}

// Coerce any incoming value into a finite, non-negative number. Strings with
// thousands separators ("1,234") are tolerated; anything unparseable becomes 0
// so a stray "*"/"N/A"/null can never corrupt a stored payment total.
function coerceNum(v: unknown): number {
  if (typeof v === "number") return isFinite(v) ? Math.abs(v) : 0;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/[,،\s]/g, ""));
    return isFinite(n) ? Math.abs(n) : 0;
  }
  return 0;
}

// Whether the parser-style ISO date can be reduced to a real calendar day.
// Mirrors deriveKeys: a value that would yield "unknown" is rejected so a bad
// monthKey/saleDay never reaches the database.
function hasValidDate(dateIso: unknown): boolean {
  if (typeof dateIso !== "string") return false;
  return deriveKeys(dateIso).saleDay !== "unknown";
}

export interface RecordValidation {
  accepted: SaleRecord[];
  rejected: { index: number; reason: string }[];
}

// Server-side guard for ingestion: validate/coerce every incoming SaleRecord so
// a malformed payload (from any source, not just the trusted client parser) can
// never silently corrupt a client's dashboard.
//  - numeric payment fields are coerced to finite, non-negative numbers (→ 0);
//  - `total` is recomputed from the payment components, falling back to the
//    declared total only when the breakdown sums to 0 (total-only sheets);
//  - rows whose date is unparseable are rejected instead of persisted.
export function validateRecords(records: SaleRecord[]): RecordValidation {
  const accepted: SaleRecord[] = [];
  const rejected: { index: number; reason: string }[] = [];

  records.forEach((rec, index) => {
    if (!rec || typeof rec !== "object") {
      rejected.push({ index, reason: "صف غير صالح" });
      return;
    }
    if (!hasValidDate(rec.date)) {
      rejected.push({ index, reason: "تاريخ غير صالح" });
      return;
    }

    const visa = coerceNum(rec.visa);
    const cash = coerceNum(rec.cash);
    const klik = coerceNum(rec.klik);
    const orders = coerceNum(rec.orders);
    const cream = coerceNum(rec.cream);
    const ashyaei = coerceNum(rec.ashyaei);
    const callcenter = coerceNum(rec.callcenter);
    const other = coerceNum(rec.other);

    const componentSum = visa + cash + klik + orders + cream + ashyaei + callcenter + other;
    const declared = coerceNum(rec.total);
    const total = componentSum > 0 ? componentSum : declared;

    accepted.push({
      ...rec,
      visa,
      cash,
      klik,
      orders,
      cream,
      ashyaei,
      callcenter,
      other,
      total,
    });
  });

  return { accepted, rejected };
}

function toRow(clientId: number, batchId: number, rec: SaleRecord): NewSalesRecordRow {
  const { saleDay, monthKey } = deriveKeys(rec.date);
  const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);
  return {
    clientId,
    batchId,
    date: rec.date,
    saleDay,
    monthKey,
    day: rec.day ?? "",
    dayAr: rec.dayAr ?? "",
    cat: rec.cat ?? "",
    catAr: rec.catAr ?? "",
    branch: rec.branch ?? "",
    branchAr: rec.branchAr ?? "",
    cashier: rec.cashier ?? "",
    cashierAr: rec.cashierAr ?? "",
    dept: rec.dept ?? "",
    deptAr: rec.deptAr ?? "",
    visa: num(rec.visa),
    cash: num(rec.cash),
    klik: num(rec.klik),
    orders: num(rec.orders),
    cream: num(rec.cream),
    ashyaei: num(rec.ashyaei),
    callcenter: num(rec.callcenter),
    other: num(rec.other),
    total: num(rec.total),
    sheetName: rec.sheetName ?? null,
    sourceRow: parseSourceRow(rec.id),
  };
}

function toSaleRecord(row: typeof salesRecords.$inferSelect): SaleRecord {
  return {
    id: String(row.id),
    day: row.day,
    dayAr: row.dayAr,
    cat: row.cat,
    catAr: row.catAr,
    date: row.date,
    branch: row.branch,
    branchAr: row.branchAr,
    cashier: row.cashier,
    cashierAr: row.cashierAr,
    dept: row.dept,
    deptAr: row.deptAr,
    visa: row.visa,
    cash: row.cash,
    klik: row.klik,
    orders: row.orders,
    cream: row.cream,
    ashyaei: row.ashyaei,
    callcenter: row.callcenter,
    other: row.other,
    total: row.total,
    sheetName: row.sheetName ?? undefined,
    batchId: row.batchId ?? undefined,
  };
}

// ─── Clients ──────────────────────────────────────────────────────────
export async function listClients() {
  return db
    .select({
      id: clients.id,
      name: clients.name,
      slug: clients.slug,
      logoUrl: clients.logoUrl,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .orderBy(asc(clients.name));
}

export async function getClientBySlug(slug: string) {
  const rows = await db.select().from(clients).where(eq(clients.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getClientById(id: number) {
  const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createClient(input: {
  name: string;
  slug?: string;
  logoUrl?: string | null;
}) {
  const slug = await ensureUniqueSlug(slugify(input.slug || input.name));
  const [created] = await db
    .insert(clients)
    .values({ name: input.name, slug, logoUrl: input.logoUrl ?? null })
    .returning();
  return created;
}

export async function updateClient(
  id: number,
  patch: { name?: string; slug?: string; logoUrl?: string | null }
) {
  const values: Record<string, unknown> = {};
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.logoUrl !== undefined) values.logoUrl = patch.logoUrl;
  if (patch.slug !== undefined) values.slug = await ensureUniqueSlug(slugify(patch.slug), id);
  if (Object.keys(values).length === 0) return getClientById(id);
  const [updated] = await db
    .update(clients)
    .set(values)
    .where(eq(clients.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteClient(id: number) {
  const [deleted] = await db.delete(clients).where(eq(clients.id, id)).returning();
  return deleted ?? null;
}

// Persist the last-confirmed import column mapping for a client so the next
// import can pre-apply it. Stored as { normalizedHeader: fieldKey }.
export async function saveClientMapping(id: number, mapping: unknown) {
  const [updated] = await db
    .update(clients)
    .set({ columnMapping: (mapping as any) ?? null })
    .where(eq(clients.id, id))
    .returning();
  return updated ?? null;
}

// ─── Sales records ────────────────────────────────────────────────────
export async function countRecords(clientId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(salesRecords)
    .where(eq(salesRecords.clientId, clientId));
  return row?.count ?? 0;
}

export async function getRecordsByClient(
  clientId: number,
  opts: { from?: string; to?: string } = {}
): Promise<SaleRecord[]> {
  const conds = [eq(salesRecords.clientId, clientId)];
  if (opts.from) conds.push(gte(salesRecords.monthKey, opts.from));
  if (opts.to) conds.push(lte(salesRecords.monthKey, opts.to));
  const rows = await db
    .select()
    .from(salesRecords)
    .where(and(...conds))
    .orderBy(asc(salesRecords.date));
  return rows.map(toSaleRecord);
}

export interface BatchSummary {
  id: number;
  filename: string | null;
  uploadedAt: string;
  rowCount: number;
  firstDay: string | null;
  lastDay: string | null;
}

// One "كشف" (statement) per uploaded file. firstDay/lastDay are the actual
// calendar range covered by the batch's records (cheap to compute via the
// (clientId, batchId) index) so the UI can label statements by their period.
export async function listBatchesByClient(clientId: number): Promise<BatchSummary[]> {
  const rows = await db
    .select({
      id: uploadBatches.id,
      filename: uploadBatches.filename,
      uploadedAt: uploadBatches.uploadedAt,
      rowCount: uploadBatches.rowCount,
      firstDay: sql<string | null>`min(${salesRecords.saleDay})`,
      lastDay: sql<string | null>`max(${salesRecords.saleDay})`,
    })
    .from(uploadBatches)
    .leftJoin(
      salesRecords,
      and(eq(salesRecords.batchId, uploadBatches.id), eq(salesRecords.clientId, clientId))
    )
    .where(eq(uploadBatches.clientId, clientId))
    .groupBy(uploadBatches.id)
    .orderBy(desc(uploadBatches.uploadedAt));
  return rows.map((r) => ({
    id: r.id,
    filename: r.filename ?? null,
    uploadedAt: r.uploadedAt instanceof Date ? r.uploadedAt.toISOString() : String(r.uploadedAt),
    rowCount: r.rowCount,
    firstDay: r.firstDay ?? null,
    lastDay: r.lastDay ?? null,
  }));
}

export async function insertBatch(
  clientId: number,
  filename: string | null,
  mapping: unknown,
  records: SaleRecord[]
) {
  return db.transaction(async (tx) => {
    const [batch] = await tx
      .insert(uploadBatches)
      .values({
        clientId,
        filename: filename ?? null,
        mappingJson: (mapping as any) ?? null,
        rowCount: records.length,
        status: "completed",
      })
      .returning();

    const rows = records.map((r) => toRow(clientId, batch.id, r));
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      if (slice.length) await tx.insert(salesRecords).values(slice);
    }
    return batch;
  });
}
