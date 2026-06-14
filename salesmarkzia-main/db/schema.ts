import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Clients (tenants) ────────────────────────────────────────────────
export const clients = pgTable(
  "clients",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logoUrl: text("logo_url"),
    // Last-confirmed import column mapping ({ normalizedHeader: fieldKey }) so the
    // next import for this client can pre-apply it in the preview.
    columnMapping: jsonb("column_mapping"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    slugUnique: uniqueIndex("clients_slug_unique").on(t.slug),
  })
);

// ─── Upload batches (one per uploaded Excel file) ─────────────────────
export const uploadBatches = pgTable(
  "upload_batches",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    filename: text("filename"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
    rowCount: integer("row_count").default(0).notNull(),
    mappingJson: jsonb("mapping_json"),
    status: text("status").default("completed").notNull(),
  },
  (t) => ({
    clientIdx: index("upload_batches_client_idx").on(t.clientId),
  })
);

// ─── Sales records ────────────────────────────────────────────────────
// IMPORTANT: `date` is stored as TEXT — the exact ISO string the client-side
// parser produces (anchored at LOCAL NOON). Storing it as a timestamp would
// re-introduce the SheetJS timezone bug (a June 1 record drifting into May).
// `saleDay` (YYYY-MM-DD) and `monthKey` (YYYY-MM) are derived once at insert
// time for cheap filtering without reparsing the ISO string.
export const salesRecords = pgTable(
  "sales_records",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    batchId: integer("batch_id").references(() => uploadBatches.id, {
      onDelete: "cascade",
    }),
    date: text("date").notNull(),
    saleDay: text("sale_day").notNull(),
    monthKey: text("month_key").notNull(),
    day: text("day").notNull(),
    dayAr: text("day_ar").notNull(),
    cat: text("cat").notNull(),
    catAr: text("cat_ar").notNull(),
    branch: text("branch").notNull(),
    branchAr: text("branch_ar").notNull(),
    cashier: text("cashier").notNull(),
    cashierAr: text("cashier_ar").notNull(),
    dept: text("dept").notNull(),
    deptAr: text("dept_ar").notNull(),
    visa: doublePrecision("visa").default(0).notNull(),
    cash: doublePrecision("cash").default(0).notNull(),
    klik: doublePrecision("klik").default(0).notNull(),
    orders: doublePrecision("orders").default(0).notNull(),
    cream: doublePrecision("cream").default(0).notNull(),
    ashyaei: doublePrecision("ashyaei").default(0).notNull(),
    callcenter: doublePrecision("callcenter").default(0).notNull(),
    other: doublePrecision("other").default(0).notNull(),
    total: doublePrecision("total").default(0).notNull(),
    sheetName: text("sheet_name"),
    sourceRow: integer("source_row"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    clientMonthIdx: index("sales_client_month_idx").on(t.clientId, t.monthKey),
    clientBatchIdx: index("sales_client_batch_idx").on(t.clientId, t.batchId),
    clientDayIdx: index("sales_client_day_idx").on(t.clientId, t.saleDay),
  })
);

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type UploadBatch = typeof uploadBatches.$inferSelect;
export type NewUploadBatch = typeof uploadBatches.$inferInsert;
export type SalesRecordRow = typeof salesRecords.$inferSelect;
export type NewSalesRecordRow = typeof salesRecords.$inferInsert;
