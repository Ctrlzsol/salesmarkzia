import React, { useRef, useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence, useMotionValue, animate } from "motion/react";
import { SaleRecord } from "../types";
import { analyzeWorkbook, type WorkbookPreview, type ColumnMapping } from "../lib/parseWorkbook";
import { ImportPreview } from "./ImportPreview";
import {
  UploadCloud, Loader2, AlertTriangle, X,
  Table2, Sparkles, TrendingUp, BarChart3, Wallet, ShieldCheck, Layers, Activity
} from "lucide-react";

// ─── Animated landing hero ────────────────────────────────────────────
function AnimatedCounter({ to, duration = 2 }: { to: number; duration?: number }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState("0");
  useEffect(() => {
    const controls = animate(mv, to, {
      duration,
      ease: "easeOut",
      onUpdate: v => setDisplay(Math.round(v).toLocaleString("en-US")),
    });
    return () => controls.stop();
  }, [to, duration, mv]);
  return <>{display}</>;
}

const INFO_BRANCHES = [
  { label: "الجاردنز", color: "#2563eb" },
  { label: "خلدا",     color: "#10b981" },
  { label: "أخرى",     color: "#f59e0b" },
];
// Cycled bar snapshots give the chart a subtle "live, updating" feel.
const INFO_SNAPSHOTS = [
  [58, 92, 48],
  [72, 74, 60],
  [52, 96, 66],
  [82, 70, 54],
];

function LiveInfographic() {
  const [snap, setSnap] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSnap(s => (s + 1) % INFO_SNAPSHOTS.length), 2600);
    return () => clearInterval(id);
  }, []);
  const heights = INFO_SNAPSHOTS[snap];

  const R = 34, C = 2 * Math.PI * R, pct = 0.607;

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Floating chips */}
      <motion.div
        className="absolute -top-5 right-2 z-20 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-xl ring-1 ring-slate-100"
        animate={{ y: [0, -9, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="leading-none">
          <p className="text-[10px] font-bold text-slate-400">نمو شهري</p>
          <p className="text-sm font-black text-emerald-600">+18.4%</p>
        </div>
      </motion.div>

      <motion.div
        className="absolute -bottom-5 left-2 z-20 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-xl ring-1 ring-slate-100"
        animate={{ y: [0, 9, 0] }} transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
          <Wallet className="h-4 w-4 text-blue-600" />
        </div>
        <div className="leading-none">
          <p className="text-[10px] font-bold text-slate-400">متوسط الفاتورة</p>
          <p className="text-sm font-black text-slate-800">312 د.أ</p>
        </div>
      </motion.div>

      {/* Main canvas card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-2xl shadow-slate-300/40">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <p className="text-sm font-black text-slate-800">لوحة التحليل الحيّة</p>
          </div>
          <BarChart3 className="h-4 w-4 text-slate-300" />
        </div>

        {/* Revenue counter */}
        <div className="mb-5">
          <p className="text-[11px] font-bold text-slate-400">إجمالي الإيرادات</p>
          <div className="flex items-end gap-1.5">
            <p className="text-3xl font-black tracking-tight text-slate-900">
              <AnimatedCounter to={104130} duration={2.2} />
            </p>
            <span className="mb-1 text-sm font-bold text-slate-400">د.أ</span>
          </div>
        </div>

        {/* Bars + donut */}
        <div className="flex items-end gap-5">
          <div className="flex h-28 flex-1 items-end justify-around gap-3 rounded-2xl bg-slate-50 px-3 pb-3 pt-2">
            {INFO_BRANCHES.map((b, i) => (
              <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-20 w-full items-end">
                  <motion.div
                    className="w-full rounded-t-lg"
                    style={{ backgroundColor: b.color }}
                    animate={{ height: `${heights[i]}%` }}
                    transition={{ duration: 0.9, ease: "easeInOut" }}
                  />
                </div>
                <span className="text-[9px] font-bold text-slate-500">{b.label}</span>
              </div>
            ))}
          </div>

          <div className="relative flex h-28 w-28 items-center justify-center">
            <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
              <circle cx="40" cy="40" r={R} fill="none" stroke="#eef2f7" strokeWidth="9" />
              <motion.circle
                cx="40" cy="40" r={R} fill="none" stroke="#2563eb" strokeWidth="9" strokeLinecap="round"
                strokeDasharray={C}
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: C * (1 - pct) }}
                transition={{ duration: 1.6, ease: "easeOut", delay: 0.3 }}
              />
            </svg>
            <div className="absolute text-center leading-none">
              <p className="text-lg font-black text-slate-900">61%</p>
              <p className="text-[8px] font-bold text-slate-400">دفع إلكتروني</p>
            </div>
          </div>
        </div>

        {/* Trend sparkline */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400">اتجاه المبيعات اليومي</p>
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <svg viewBox="0 0 280 70" className="h-16 w-full">
            <defs>
              <linearGradient id="infoArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path
              d="M0 58 L40 46 L80 50 L120 34 L160 40 L200 22 L240 28 L280 14 L280 70 L0 70 Z"
              fill="url(#infoArea)"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1 }}
            />
            <motion.path
              d="M0 58 L40 46 L80 50 L120 34 L160 40 L200 22 L240 28 L280 14"
              fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8, ease: "easeInOut", delay: 0.4 }}
            />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}

function BackdropBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div
        className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-emerald-200/25 blur-3xl"
        animate={{ x: [0, -24, 0], y: [0, 28, 0] }} transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div
        className="absolute -bottom-28 right-1/4 h-80 w-80 rounded-full bg-amber-200/20 blur-3xl"
        animate={{ x: [0, 22, 0], y: [0, -18, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }} />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────
interface FileUploadProps {
  onUpload: (data: SaleRecord[], filename?: string, mapping?: ColumnMapping) => void;
  isAnalyzing: boolean;
  clientName?: string;
  // Last-confirmed mapping for this client, pre-applied in the preview.
  savedMapping?: ColumnMapping | null;
}

// ─── Component ────────────────────────────────────────────────────────
export function FileUpload({ onUpload, isAnalyzing, clientName = "المركزية", savedMapping }: FileUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDrag, setIsDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const processFile = async (file: File) => {
    setError(null); setPreview(null); setWorkbook(null); setLoading(true); setProgress(5);
    setProgressMsg(`قراءة: ${file.name}`);
    try {
      await delay(60);
      const buf = await file.arrayBuffer();
      setProgress(30); setProgressMsg("فك تشفير الخلايا بدقة...");
      await delay(60);

      // NOTE: cellDates is intentionally OFF. With cellDates:true SheetJS builds
      // Date objects anchored at local midnight ± floating-point error, which in
      // timezones ahead of UTC (e.g. Jordan, UTC+3) shifts a date onto the
      // previous calendar day (June 1 → May 31), fabricating phantom months.
      // Reading raw serials lets parseDate() convert them with exact integer math.
      const wb = XLSX.read(buf, { type: "array", cellNF: true });
      setProgress(65); setProgressMsg("اكتشاف الأعمدة والأوراق تلقائياً...");
      await delay(80);

      const analysis = analyzeWorkbook(wb);
      setProgress(95);
      await delay(60);

      if (analysis.sheets.length === 0) {
        throw new Error(
          "لم يُعثر على أي أوراق قابلة للقراءة.\n" +
          `الأوراق الموجودة: ${wb.SheetNames.join(" | ")}`
        );
      }

      setWorkbook(wb);
      setPreview(analysis);
      setFileName(file.name);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.message ?? "فشل قراءة الملف — تأكد من صيغة Excel.");
    }
  };

  const cancelPreview = () => { setPreview(null); setWorkbook(null); setFileName(""); };

  // Preview / mapping-correction step before committing the import.
  if (preview && workbook && !loading) {
    return (
      <ImportPreview
        preview={preview}
        workbook={workbook}
        fileName={fileName}
        saving={isAnalyzing}
        savedMapping={savedMapping}
        onConfirm={(records, mapping) => onUpload(records, fileName, mapping)}
        onCancel={cancelPreview}
      />
    );
  }

  const showLoader = loading || isAnalyzing;

  return (
    <div dir="rtl" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50"
      style={{ fontFamily: "'Tajawal', sans-serif" }}>

      <BackdropBlobs />

      <div className="relative w-full max-w-6xl px-5 py-10">
        <AnimatePresence mode="wait">
          {showLoader ? (

            /* ─── Loading ─── */
            <motion.div key="loader" initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
              exit={{ opacity:0 }} className="mx-auto flex max-w-md flex-col items-center gap-6 rounded-3xl border border-slate-200 bg-white p-10 shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-black text-slate-900 text-lg mb-1">
                  {isAnalyzing ? "تحليل بالذكاء الاصطناعي..." : progressMsg}
                </p>
                <p className="text-slate-500 text-sm">يرجى الانتظار — نقرأ كل خلية بدقة</p>
              </div>
              <div className="w-full">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full bg-blue-600"
                    animate={{ width: `${isAnalyzing ? 90 : progress}%` }} transition={{ duration:0.4 }} />
                </div>
                <p className="text-center text-blue-600 font-black text-sm mt-1.5">
                  {isAnalyzing ? 90 : progress}%
                </p>
              </div>
            </motion.div>

          ) : (

            /* ─── Upload + animated hero ─── */
            <motion.div key="upload" initial={{ opacity:0 }} animate={{ opacity:1 }}
              className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

              {/* Brand + upload column */}
              <motion.div initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}>

                {/* Kicker */}
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-blue-700">منصة التحليل الذكي للمبيعات</span>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-black leading-[1.15] text-slate-900 sm:text-[2.6rem]">
                  نظام كانفاس الذكي{" "}
                  <span className="bg-gradient-to-l from-blue-600 to-emerald-500 bg-clip-text text-transparent">لتحليل المبيعات</span>
                </h1>

                {/* Client */}
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 shadow-lg">
                    <span className="text-lg font-black text-white">م</span>
                  </div>
                  <div className="leading-tight">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">العميل</p>
                    <p className="text-base font-black text-slate-900">{clientName}</p>
                  </div>
                </div>

                <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-500">
                  ارفع ملف Excel ليتحوّل فوراً إلى لوحة تحليل متكاملة — قراءة دقيقة للتواريخ والمبالغ، ودعم كامل لـ Power Query وتعدد الأوراق.
                </p>

                {/* Drop Zone */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="ارفع ملف Excel — اسحب الملف أو اضغط Enter للاختيار"
                  onDragOver={e => { e.preventDefault(); setIsDrag(true); }}
                  onDragLeave={() => setIsDrag(false)}
                  onDrop={e => { e.preventDefault(); setIsDrag(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
                  className={`group mt-6 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                    ${isDrag ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-white/70 backdrop-blur hover:border-blue-400 hover:bg-blue-50/50"}`}>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
                  <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl transition-all
                    ${isDrag ? "bg-blue-600" : "bg-blue-50 group-hover:bg-blue-100"}`}>
                    <UploadCloud className={`h-6 w-6 transition-colors ${isDrag ? "text-white" : "text-blue-600"}`} />
                  </div>
                  <p className="mb-1 font-bold text-slate-700">{isDrag ? "أفلت الملف هنا" : "اسحب ملف Excel أو انقر للاختيار"}</p>
                  <p className="text-sm text-slate-400">يدعم .xlsx • .xls • .csv</p>
                </div>

                {/* Trust badges */}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {[
                    { icon: ShieldCheck, text: "قراءة دقيقة للتواريخ" },
                    { icon: Layers,      text: "دمج متعدد الأوراق" },
                    { icon: Table2,      text: "دعم Power Query" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs font-bold text-slate-500">{text}</span>
                    </div>
                  ))}
                </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                    className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                    <AlertTriangle className="w-4.5 h-4.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-700 text-sm font-bold leading-relaxed whitespace-pre-line">{error}</p>
                    </div>
                    <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              </motion.div>

              {/* Animated infographic column */}
              <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
                transition={{ duration:0.6, delay:0.15 }}>
                <LiveInfographic />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
