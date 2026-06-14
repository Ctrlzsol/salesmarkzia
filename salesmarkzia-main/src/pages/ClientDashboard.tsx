import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { analyzeData } from "../lib/analyzer";
import { DashboardData, SaleRecord } from "../types";
import { exportToExcel } from "../lib/exportExcel";
import { exportToPdf } from "../lib/exportPdf";
import { Layout } from "../components/Layout";
import { FileUpload } from "../components/FileUpload";
import { MONTHS_AR, type ColumnMapping } from "../lib/parseWorkbook";
import { ManualEntry } from "../components/ManualEntry";
import { Loader2, Building2, ArrowRight, Database, PlusCircle } from "lucide-react";

interface ClientInfo { id: number; name: string; slug: string; logoUrl: string | null; columnMapping?: ColumnMapping | null; }

interface BatchInfo {
  id: number;
  filename: string | null;
  uploadedAt: string;
  rowCount: number;
  firstDay: string | null;
  lastDay: string | null;
}

// A "كشف" (statement) is one uploaded file. Label it by the period it covers
// (statements are inherently about a date range) and fall back to the filename
// or upload date so re-uploads of the same month stay distinguishable.
function formatBatchPeriod(first: string | null, last: string | null): string {
  if (!first || !last) return "";
  const [ay, am] = first.split("-");
  const [by, bm] = last.split("-");
  const a = MONTHS_AR[parseInt(am, 10) - 1];
  const b = MONTHS_AR[parseInt(bm, 10) - 1];
  if (ay === by && am === bm) return `${a} ${ay}`;
  if (ay === by) return `${a} – ${b} ${ay}`;
  return `${a} ${ay} – ${b} ${by}`;
}

function batchLabel(b: BatchInfo): string {
  const period = formatBatchPeriod(b.firstDay, b.lastDay);
  let name = b.filename || period;
  if (!name) {
    const d = new Date(b.uploadedAt);
    name = isNaN(d.getTime()) ? `كشف #${b.id}` : `رفع ${d.toLocaleDateString("en-GB")}`;
  } else if (b.filename && period) {
    name = `${period} — ${b.filename}`;
  }
  return `${name} · ${b.rowCount.toLocaleString()} سجل`;
}

export function ClientDashboard() {
  const { clientSlug = "" } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientInfo | null>(null);
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [scenario, setScenario] = useState<number>(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cachedAiInsights, setCachedAiInsights] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filterBranch, setFilterBranch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterCashier, setFilterCashier] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const clearFilters = () => {
    setFilterBranch(""); setFilterCat(""); setFilterDept("");
    setFilterCashier(""); setFilterDay(""); setFilterMonth(""); setFilterBatch("");
    setFilterFrom(""); setFilterTo("");
  };

  // Run the AI summary once per loaded dataset. Insights merge into the
  // dashboard in the background; the local engine fallback is shown meanwhile.
  const runAiAnalysis = useCallback(async (recs: SaleRecord[]) => {
    if (!recs.length) return;
    setIsAnalyzing(true);
    try {
      const tempAnalyzed = analyzeData(recs, 1);
      const monthsAnalyzed = tempAnalyzed.monthComparison.months.length;
      const summaryData = {
        totalSales: tempAnalyzed.kpis.totalSales,
        // Honest growth: only a real month-over-month figure when ≥2 months
        // exist; otherwise null so the AI does not fabricate growth.
        monthsAnalyzed,
        activeDays: tempAnalyzed.kpis.activeDays,
        monthlyGrowth: monthsAnalyzed >= 2 ? tempAnalyzed.monthComparison.avgMonthlyGrowth : null,
        invoiceCount: tempAnalyzed.kpis.invoiceCount,
        topBranches: tempAnalyzed.operational.byBranch.slice(0, 3).map(b => ({ name: b.name, value: b.value })),
        topProducts: tempAnalyzed.bi.top10Products.slice(0, 5).map(p => ({ name: p.name, share: p.share })),
      };
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryData }),
      });
      if (response.ok) setCachedAiInsights(await response.json());
    } catch (err) {
      console.warn("AI analysis fallback to local engine.", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const loadData = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientSlug)}/data`);
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      setClient(json.client);
      const recs: SaleRecord[] = Array.isArray(json.records) ? json.records : [];
      setRecords(recs);
      setBatches(Array.isArray(json.batches) ? json.batches : []);
      setLoading(false);
      runAiAnalysis(recs);
    } catch (e) {
      console.error("loadData error", e);
      setLoading(false);
    }
  }, [clientSlug, runAiAnalysis]);

  // Admin session check (independent of data)
  useEffect(() => {
    fetch("/api/admin/session")
      .then(r => r.json())
      .then(d => setIsAdmin(!!d.authenticated))
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpdateRecord = (id: string, field: keyof SaleRecord, value: number) => {
    setRecords(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: Number(value) || 0 };
      updated.total =
        (Number(updated.visa) || 0) + (Number(updated.cash) || 0) + (Number(updated.klik) || 0) +
        (Number(updated.orders) || 0) + (Number(updated.cream) || 0) + (Number(updated.ashyaei) || 0) +
        (Number(updated.callcenter) || 0) + (Number(updated.other) || 0);
      return updated;
    }));
  };

  const handleAdminUpload = async (parsed: SaleRecord[], filename?: string, mapping?: ColumnMapping) => {
    if (!parsed || parsed.length === 0) { setShowUpload(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientSlug)}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: parsed, filename: filename ?? null, mapping: mapping ?? null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        window.alert(d.error || "تعذر حفظ السجلات");
        setSaving(false);
        return;
      }
      const d = await res.json().catch(() => ({} as any));
      setShowUpload(false);
      setSaving(false);
      clearFilters();
      setScenario(1);
      setCachedAiInsights(null);
      await loadData({ silent: true });
      if (d && typeof d.rejected === "number" && d.rejected > 0) {
        window.alert(
          `تم حفظ ${d.inserted} صف، وتم تجاهل ${d.rejected} صف بسبب تاريخ غير صالح أو بيانات تالفة`
        );
      }
    } catch (e) {
      console.error(e);
      window.alert("تعذر حفظ السجلات");
      setSaving(false);
    }
  };

  const handleManualSubmit = async (manualRecords: SaleRecord[]) => {
    if (!manualRecords || manualRecords.length === 0) { setShowManual(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientSlug)}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: manualRecords, filename: "إدخال يدوي" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        window.alert(d.error || "تعذر حفظ السجل");
        setSaving(false);
        return;
      }
      setShowManual(false);
      setSaving(false);
      setCachedAiInsights(null);
      await loadData({ silent: true });
    } catch (e) {
      console.error(e);
      window.alert("تعذر حفظ السجل");
      setSaving(false);
    }
  };

  const handleDeleteBatch = async (batchId: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الكشف وكل البيانات التابعة له؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        window.alert(d.error || "تعذر حذف الكشف");
        return;
      }
      if (filterBatch === String(batchId)) {
        setFilterBatch("");
      }
      setCachedAiInsights(null);
      await loadData({ silent: true });
    } catch (e) {
      console.error(e);
      window.alert("تعذر حذف الكشف");
    }
  };

  // Filter records
  const filteredRecords = records.filter(r => {
    let matchesMonth = true;
    if (filterMonth) {
      const d = new Date(r.date);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      matchesMonth = mStr === filterMonth;
    }
    return (
      (!filterBranch || r.branch === filterBranch) &&
      (!filterCat || r.cat === filterCat) &&
      (!filterDept || r.deptAr === filterDept) &&
      (!filterCashier || r.cashierAr === filterCashier) &&
      (!filterDay || r.day === filterDay) &&
      (!filterBatch || String(r.batchId) === filterBatch) &&
      (!filterFrom || (r.date || "").slice(0, 10) >= filterFrom) &&
      (!filterTo || (r.date || "").slice(0, 10) <= filterTo) &&
      matchesMonth
    );
  });

  let data: DashboardData | null = null;
  if (records.length > 0) {
    try {
      const hasFilter = !!(filterBranch || filterCat || filterDept || filterCashier || filterDay || filterMonth || filterBatch || filterFrom || filterTo);
      data = analyzeData(hasFilter ? filteredRecords : records, scenario);
      // Overlay server AI insights, but only fields that are actually populated —
      // a sparse fallback must never wipe the richer local analyzer baseline.
      if (cachedAiInsights && data) {
        const merged: any = { ...data.ai };
        for (const [k, v] of Object.entries(cachedAiInsights)) {
          if (typeof v === "string" && v.trim()) merged[k] = v;
          else if (Array.isArray(v) && v.length > 0) merged[k] = v;
        }
        data.ai = merged;
      }
    } catch (e) {
      console.error("Analytics error:", e);
    }
  }

  // Options for dropdowns
  const branchOptions = Array.from(new Set(records.map(r => r.branch))).filter(Boolean);
  const catOptions = Array.from(new Set(records.map(r => r.cat))).filter(Boolean);
  const deptOptions = Array.from(new Set(records.map(r => r.deptAr))).filter(Boolean).sort();
  const cashierOptions = Array.from(new Set(records.map(r => r.cashierAr))).filter(Boolean).sort();
  const dayOptions = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].filter(d => records.some(r => r.day === d));
  const monthOptions = Array.from(new Set(records.map(r => {
    const d = new Date(r.date);
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }))).filter(Boolean).sort();
  const batchOptions = batches.map(b => ({ value: String(b.id), label: batchLabel(b) }));
  const allDays = records.map(r => (r.date || "").slice(0, 10)).filter(Boolean).sort();
  const dayMin = allDays[0] || "";
  const dayMax = allDays[allDays.length - 1] || "";

  const filterStates = {
    filterBranch, setFilterBranch, filterCat, setFilterCat,
    filterDept, setFilterDept, filterCashier, setFilterCashier,
    filterDay, setFilterDay, filterMonth, setFilterMonth,
    filterBatch, setFilterBatch,
    filterFrom, setFilterFrom, filterTo, setFilterTo, dayMin, dayMax,
    branchOptions, catOptions, deptOptions, cashierOptions, dayOptions, monthOptions, batchOptions,
    onClearAll: clearFilters,
  };

  // Human-readable labels for the active filters, mirrored into the exports so
  // PDF/Excel clearly state which slice of data they represent.
  const BRANCH_LABELS: Record<string, string> = { G: "الجاردنز", K: "خلدا", O: "اضاحي / أخرى" };
  const buildActiveFilters = (): string[] => {
    const out: string[] = [];
    if (filterBranch) out.push(`الفرع: ${BRANCH_LABELS[filterBranch] || filterBranch}`);
    if (filterMonth) {
      const [yr, mn] = filterMonth.split("-");
      out.push(`الشهر: ${MONTHS_AR[parseInt(mn, 10) - 1]} ${yr}`);
    }
    if (filterDept) out.push(`القسم: ${filterDept}`);
    if (filterCashier) out.push(`الكاشير: ${filterCashier}`);
    if (filterDay) out.push(`اليوم: ${filterDay}`);
    if (filterBatch) {
      const b = batches.find(x => String(x.id) === filterBatch);
      out.push(`الكشف: ${b ? batchLabel(b) : filterBatch}`);
    }
    return out;
  };

  const hasActiveFilter = !!(filterBranch || filterCat || filterDept || filterCashier || filterDay || filterMonth || filterBatch);

  const handleExportExcel = () => {
    if (!data) return;
    exportToExcel(data, hasActiveFilter ? filteredRecords : records, {
      clientName: client?.name || "العميل",
      activeFilters: buildActiveFilters(),
    });
  };

  const handleExportPdf = async () => {
    if (!data) return;
    await exportToPdf(data, filteredRecords, {
      clientName: client?.name || "العميل",
      logoUrl: client?.logoUrl ?? null,
      activeFilters: buildActiveFilters(),
    });
  };

  // ─── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50"
        style={{ fontFamily: "'Tajawal', sans-serif" }}>
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ─── Not found ────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-5"
        style={{ fontFamily: "'Tajawal', sans-serif" }}>
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Building2 className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-lg font-black text-slate-800">العميل غير موجود</p>
          <p className="mt-1.5 text-sm text-slate-500">تعذّر العثور على هذا العميل.</p>
          {isAdmin && (
            <Link to="/"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-500">
              <ArrowRight className="h-4 w-4" />
              العودة لقائمة العملاء
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ─── Client/Admin upload view (first upload, or "add more") ───────────────
  if (records.length === 0 || showUpload) {
    return (
      <div className="relative">
        {showUpload && records.length > 0 && (
          <button onClick={() => setShowUpload(false)}
            dir="rtl"
            className="fixed left-5 top-5 z-50 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-lg transition-all hover:bg-slate-50"
            style={{ fontFamily: "'Tajawal', sans-serif" }}>
            <ArrowRight className="h-3.5 w-3.5" />
            العودة للوحة
          </button>
        )}
        <button onClick={() => setShowManual(true)}
          dir="rtl"
          className="fixed bottom-5 left-5 z-50 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:bg-slate-800"
          style={{ fontFamily: "'Tajawal', sans-serif" }}>
          <PlusCircle className="h-4 w-4" />
          إدخال يدوي
        </button>
        <FileUpload onUpload={handleAdminUpload} isAnalyzing={saving} clientName={client?.name || "العميل"} logoUrl={client?.logoUrl ?? null} savedMapping={client?.columnMapping ?? null} />
        {showManual && (
          <ManualEntry
            clientName={client?.name || "العميل"}
            saving={saving}
            onSubmit={handleManualSubmit}
            onClose={() => setShowManual(false)}
          />
        )}
      </div>
    );
  }

  // ─── Non-admin, no data yet ───────────────────────────────────────
  if (records.length === 0 || !data) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-5"
        style={{ fontFamily: "'Tajawal', sans-serif" }}>
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <Database className="h-7 w-7 text-blue-500" />
          </div>
          <p className="text-lg font-black text-slate-800">لا توجد بيانات بعد</p>
          <p className="mt-1.5 text-sm text-slate-500">
            لم تُرفع أي بيانات لـ «{client?.name || "هذا العميل"}» حتى الآن.
          </p>
          {isAdmin && (
            <Link to="/"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-500">
              <ArrowRight className="h-4 w-4" />
              العودة لقائمة العملاء
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ─── Dashboard ────────────────────────────────────────────────────
  return (
    <>
      <Layout
        data={data}
        records={records}
        client={client ? { name: client.name, logoUrl: client.logoUrl } : undefined}
        onReset={() => setShowUpload(true)}
        onManualEntry={() => setShowManual(true)}
        onHome={() => navigate("/")}
        isAdmin={isAdmin}
        onUpdateRecord={handleUpdateRecord}
        scenario={scenario}
        setScenario={setScenario}
        filterStates={filterStates}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        batches={batches}
        onDeleteBatch={handleDeleteBatch}
      />
      {showManual && (
        <ManualEntry
          clientName={client?.name || "العميل"}
          saving={saving}
          onSubmit={handleManualSubmit}
          onClose={() => setShowManual(false)}
        />
      )}
    </>
  );
}
