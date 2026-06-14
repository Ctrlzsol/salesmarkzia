import React, { useMemo, useState } from "react";
import { SaleRecord } from "../types";
import { analyzeData } from "../lib/analyzer";
import { formatCurrency } from "../lib/utils";
import { GitCompareArrows, CalendarRange, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface Props {
  records: SaleRecord[];
  scenario: number;
}

const dayOf = (r: SaleRecord) => (r.date ? r.date.slice(0, 10) : "");
const inRange = (r: SaleRecord, from: string, to: string) => {
  const d = dayOf(r);
  if (!d) return false;
  return (!from || d >= from) && (!to || d <= to);
};

// Add `n` days to a YYYY-MM-DD string (anchored at local noon to avoid drift).
function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n, 12, 0, 0, 0);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function ComparisonTab({ records, scenario }: Props) {
  const days = useMemo(
    () => Array.from(new Set(records.map(dayOf).filter(Boolean))).sort(),
    [records]
  );
  const minDay = days[0] || "";
  const maxDay = days[days.length - 1] || "";

  // Sensible default: first day vs last day (the "compare day 1 vs day N" case).
  const [aFrom, setAFrom] = useState(minDay);
  const [aTo, setATo] = useState(minDay);
  const [bFrom, setBFrom] = useState(maxDay);
  const [bTo, setBTo] = useState(maxDay);

  const recsA = useMemo(() => records.filter(r => inRange(r, aFrom, aTo)), [records, aFrom, aTo]);
  const recsB = useMemo(() => records.filter(r => inRange(r, bFrom, bTo)), [records, bFrom, bTo]);
  const dataA = useMemo(() => analyzeData(recsA, scenario), [recsA, scenario]);
  const dataB = useMemo(() => analyzeData(recsB, scenario), [recsB, scenario]);

  const metrics: { label: string; a: number; b: number; money?: boolean }[] = [
    { label: "إجمالي المبيعات", a: dataA.kpis.totalSales, b: dataB.kpis.totalSales, money: true },
    { label: "عدد السجلات", a: dataA.kpis.invoiceCount, b: dataB.kpis.invoiceCount },
    { label: "متوسط المبيعات اليومي", a: dataA.kpis.avgDailySales, b: dataB.kpis.avgDailySales, money: true },
    { label: "أيام النشاط", a: dataA.kpis.activeDays, b: dataB.kpis.activeDays },
    { label: "مبيعات الكاش", a: dataA.kpis.cashSalesTotal, b: dataB.kpis.cashSalesTotal, money: true },
    { label: "المبيعات الإلكترونية", a: dataA.kpis.electronicSalesTotal, b: dataB.kpis.electronicSalesTotal, money: true },
    { label: "مبيعات التوصيل", a: dataA.kpis.deliverySalesTotal, b: dataB.kpis.deliverySalesTotal, money: true },
  ];

  const fmt = (v: number, money?: boolean) =>
    money ? formatCurrency(v) : Math.round(v).toLocaleString();

  const fmtRange = (from: string, to: string) =>
    !from && !to ? "كل الفترة" : from === to ? from : `${from || "البداية"} ← ${to || "النهاية"}`;

  if (days.length === 0) {
    return (
      <div dir="rtl" className="max-w-2xl mx-auto rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-bold text-slate-500">لا توجد بيانات كافية للمقارنة.</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-5 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <GitCompareArrows className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">مقارنة الفترات</h2>
            <p className="text-xs font-bold text-slate-400">قارن بين فترتين زمنيتين — يوم واحد، عدة أيام، أو كشوف مختلفة</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PeriodPicker title="الفترة (أ)" color="blue"
            from={aFrom} to={aTo} min={minDay} max={maxDay}
            setFrom={setAFrom} setTo={setATo} />
          <PeriodPicker title="الفترة (ب)" color="violet"
            from={bFrom} to={bTo} min={minDay} max={maxDay}
            setFrom={setBFrom} setTo={setBTo} />
        </div>

        {/* Quick presets */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400">اختصارات:</span>
          <PresetBtn label="أول ٤ أيام مقابل آخر ٤ أيام" onClick={() => {
            setAFrom(minDay); setATo(addDays(minDay, 3));
            setBFrom(addDays(maxDay, -3)); setBTo(maxDay);
          }} />
          <PresetBtn label="اليوم الأول مقابل الأخير" onClick={() => {
            setAFrom(minDay); setATo(minDay); setBFrom(maxDay); setBTo(maxDay);
          }} />
        </div>
      </section>

      {/* Period summary */}
      <section className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border-r-4 border-blue-500 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 mb-1">
            <CalendarRange className="h-3.5 w-3.5" /> الفترة (أ) · {recsA.length.toLocaleString()} سجل
          </div>
          <p className="text-sm font-black text-slate-800">{fmtRange(aFrom, aTo)}</p>
          <p className="text-lg font-black text-blue-700 mt-1">{formatCurrency(dataA.kpis.totalSales)}</p>
        </div>
        <div className="rounded-2xl border-r-4 border-violet-500 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600 mb-1">
            <CalendarRange className="h-3.5 w-3.5" /> الفترة (ب) · {recsB.length.toLocaleString()} سجل
          </div>
          <p className="text-sm font-black text-slate-800">{fmtRange(bFrom, bTo)}</p>
          <p className="text-lg font-black text-violet-700 mt-1">{formatCurrency(dataB.kpis.totalSales)}</p>
        </div>
      </section>

      {/* Metric comparison table */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-500 border-b border-slate-100">
          <div className="col-span-4">المؤشر</div>
          <div className="col-span-3 text-center">الفترة (أ)</div>
          <div className="col-span-3 text-center">الفترة (ب)</div>
          <div className="col-span-2 text-center">التغير</div>
        </div>
        {metrics.map((m, i) => {
          const delta = m.b - m.a;
          const pct = m.a !== 0 ? (delta / m.a) * 100 : (m.b > 0 ? 100 : 0);
          const up = delta > 0.0001, down = delta < -0.0001;
          return (
            <div key={i} className={`grid grid-cols-12 items-center px-4 py-3 text-sm ${i % 2 ? "bg-slate-50/40" : ""}`}>
              <div className="col-span-4 font-bold text-slate-700">{m.label}</div>
              <div className="col-span-3 text-center font-black text-slate-800">{fmt(m.a, m.money)}</div>
              <div className="col-span-3 text-center font-black text-slate-800">{fmt(m.b, m.money)}</div>
              <div className={`col-span-2 flex items-center justify-center gap-1 font-black ${up ? "text-emerald-600" : down ? "text-rose-600" : "text-slate-400"}`}>
                {up ? <ArrowUp className="h-3.5 w-3.5" /> : down ? <ArrowDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                {Math.abs(pct).toFixed(0)}٪
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function PeriodPicker({
  title, color, from, to, min, max, setFrom, setTo,
}: {
  title: string; color: "blue" | "violet";
  from: string; to: string; min: string; max: string;
  setFrom: (v: string) => void; setTo: (v: string) => void;
}) {
  const ring = color === "blue" ? "border-blue-200 bg-blue-50/40" : "border-violet-200 bg-violet-50/40";
  const dot = color === "blue" ? "bg-blue-500" : "bg-violet-500";
  return (
    <div className={`rounded-2xl border ${ring} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <p className="text-sm font-black text-slate-800">{title}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold text-slate-400">من</span>
          <input type="date" value={from} min={min} max={max} onChange={e => setFrom(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-400" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold text-slate-400">إلى</span>
          <input type="date" value={to} min={min} max={max} onChange={e => setTo(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-400" />
        </label>
      </div>
    </div>
  );
}

function PresetBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
      {label}
    </button>
  );
}
