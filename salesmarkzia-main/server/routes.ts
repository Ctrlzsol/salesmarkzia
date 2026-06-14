import { Router } from "express";
import {
  requireAdmin,
  verifyCsrf,
  checkPassword,
  setAdminCookie,
  clearAdminCookie,
  isAuthed,
} from "./auth";
import * as storage from "./storage";
import { handleAnalyze } from "./analyze";

const MAX_LOGO_BYTES = 700 * 1024; // ~700 KB
const MAX_RECORDS_PER_BATCH = 200000;

function validateLogo(logoUrl: unknown): string | null {
  if (logoUrl === undefined || logoUrl === null || logoUrl === "") return null; // optional
  if (typeof logoUrl !== "string") return "صيغة الشعار غير صالحة";
  const m = /^data:image\/(png|jpe?g|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/.exec(logoUrl);
  if (!m) return "صيغة الشعار يجب أن تكون PNG أو JPG أو WEBP أو SVG";
  const bytes = Math.floor((m[2].length * 3) / 4);
  if (bytes > MAX_LOGO_BYTES) return "حجم الشعار يتجاوز الحد المسموح (700 كيلوبايت)";
  return null;
}

export function createApiRouter(): Router {
  const r = Router();

  // ─── AI analysis (public) ───────────────────────────────────────────
  r.post("/analyze", handleAnalyze);

  // ─── Admin auth ─────────────────────────────────────────────────────
  r.get("/admin/session", (req, res) => {
    res.json({ authenticated: isAuthed(req) });
  });

  r.post("/admin/login", verifyCsrf, (req, res) => {
    const { password } = req.body || {};
    if (!checkPassword(password)) {
      res.status(401).json({ error: "كلمة المرور غير صحيحة" });
      return;
    }
    setAdminCookie(res);
    res.json({ authenticated: true });
  });

  r.post("/admin/logout", verifyCsrf, (req, res) => {
    clearAdminCookie(res);
    res.json({ authenticated: false });
  });

  // ─── Clients ────────────────────────────────────────────────────────
  r.get("/clients", async (_req, res) => {
    try {
      res.json(await storage.listClients());
    } catch (e: any) {
      console.error("listClients error:", e?.message || e);
      res.status(500).json({ error: "تعذر جلب قائمة العملاء" });
    }
  });

  r.post("/clients", verifyCsrf, requireAdmin, async (req, res) => {
    const { name, slug, logoUrl } = req.body || {};
    if (!name || !String(name).trim()) {
      res.status(400).json({ error: "اسم العميل مطلوب" });
      return;
    }
    const logoErr = validateLogo(logoUrl);
    if (logoErr) {
      res.status(400).json({ error: logoErr });
      return;
    }
    try {
      const created = await storage.createClient({
        name: String(name).trim(),
        slug: slug ? String(slug) : undefined,
        logoUrl: logoUrl || null,
      });
      res.status(201).json(created);
    } catch (e: any) {
      console.error("createClient error:", e?.message || e);
      res.status(500).json({ error: "تعذر إنشاء العميل" });
    }
  });

  r.patch("/clients/:id", verifyCsrf, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "معرف غير صالح" });
      return;
    }
    const { name, slug, logoUrl } = req.body || {};
    if (name !== undefined && !String(name).trim()) {
      res.status(400).json({ error: "اسم العميل مطلوب" });
      return;
    }
    if (logoUrl !== undefined) {
      const logoErr = validateLogo(logoUrl);
      if (logoErr) {
        res.status(400).json({ error: logoErr });
        return;
      }
    }
    try {
      const updated = await storage.updateClient(id, {
        name: name !== undefined ? String(name).trim() : undefined,
        slug: slug !== undefined ? String(slug) : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl || null : undefined,
      });
      if (!updated) {
        res.status(404).json({ error: "العميل غير موجود" });
        return;
      }
      res.json(updated);
    } catch (e: any) {
      console.error("updateClient error:", e?.message || e);
      res.status(500).json({ error: "تعذر تحديث العميل" });
    }
  });

  r.delete("/clients/:id", verifyCsrf, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "معرف غير صالح" });
      return;
    }
    try {
      const deleted = await storage.deleteClient(id);
      if (!deleted) {
        res.status(404).json({ error: "العميل غير موجود" });
        return;
      }
      res.json({ ok: true });
    } catch (e: any) {
      console.error("deleteClient error:", e?.message || e);
      res.status(500).json({ error: "تعذر حذف العميل" });
    }
  });

  // ─── Client data (public read) ──────────────────────────────────────
  r.get("/clients/:slug/data", async (req, res) => {
    try {
      const client = await storage.getClientBySlug(req.params.slug);
      if (!client) {
        res.status(404).json({ error: "العميل غير موجود" });
        return;
      }
      const from = typeof req.query.from === "string" ? req.query.from : undefined;
      const to = typeof req.query.to === "string" ? req.query.to : undefined;
      const [records, batches] = await Promise.all([
        storage.getRecordsByClient(client.id, { from, to }),
        storage.listBatchesByClient(client.id),
      ]);
      res.json({
        client: {
          id: client.id,
          name: client.name,
          slug: client.slug,
          logoUrl: client.logoUrl,
          columnMapping: client.columnMapping ?? null,
        },
        records,
        batches,
      });
    } catch (e: any) {
      console.error("getClientData error:", e?.message || e);
      res.status(500).json({ error: "تعذر جلب بيانات العميل" });
    }
  });

  // ─── Client data ingestion ──────────────────────────────────
  r.post("/clients/:slug/records", verifyCsrf, async (req, res) => {
    try {
      const client = await storage.getClientBySlug(req.params.slug);
      if (!client) {
        res.status(404).json({ error: "العميل غير موجود" });
        return;
      }
      const { records, filename, mapping } = req.body || {};
      if (!Array.isArray(records) || records.length === 0) {
        res.status(400).json({ error: "لا توجد سجلات لحفظها" });
        return;
      }
      if (records.length > MAX_RECORDS_PER_BATCH) {
        res.status(413).json({ error: "عدد السجلات يتجاوز الحد المسموح" });
        return;
      }
      // Server-side validation/coercion: drop rows with unparseable dates and
      // normalize payment fields/totals so a malformed payload can't corrupt
      // the dashboard, regardless of the source.
      const { accepted, rejected } = storage.validateRecords(records);
      if (accepted.length === 0) {
        res.status(400).json({
          error: "تعذر حفظ السجلات: جميع الصفوف غير صالحة (تاريخ غير صالح أو بيانات تالفة)",
          accepted: 0,
          rejected: rejected.length,
        });
        return;
      }
      const batch = await storage.insertBatch(
        client.id,
        filename ? String(filename) : null,
        mapping ?? null,
        accepted
      );
      // Remember the confirmed column mapping for this client so the next import
      // pre-applies it. Best-effort: a mapping save must not fail the import.
      if (
        mapping &&
        typeof mapping === "object" &&
        !Array.isArray(mapping) &&
        Object.keys(mapping).length > 0
      ) {
        try {
          await storage.saveClientMapping(client.id, mapping);
        } catch (e: any) {
          console.error("saveClientMapping error:", e?.message || e);
        }
      }
      const totalRecords = await storage.countRecords(client.id);
      res.status(201).json({
        batch,
        inserted: accepted.length,
        rejected: rejected.length,
        totalRecords,
      });
    } catch (e: any) {
      console.error("insertBatch error:", e?.message || e);
      res.status(500).json({ error: "تعذر حفظ السجلات" });
    }
  });

  return r;
}
