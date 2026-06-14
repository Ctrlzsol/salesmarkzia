import React, { useState } from "react";
import { DashboardData, SaleRecord } from "../types";
import { formatCurrency } from "../lib/utils";
import { ShieldAlert, ShieldCheck, Database, Search, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";

interface QualityTabProps {
  data: DashboardData;
  records: SaleRecord[];
  onUpdateRecord: (id: string, field: keyof SaleRecord, value: number) => void;
}

const card = "bg-white rounded-2xl border border-slate-200 shadow-sm";
const ani = { hidden:{opacity:0,y:14}, show:{opacity:1,y:0,transition:{type:"spring" as const,stiffness:260,damping:22}} };
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export function QualityTab({ data, records, onUpdateRecord }: QualityTabProps) {
  const { quality } = data;
  const isGood = quality.score >= 85;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 15;

  const filtered = records.filter(r =>
    !search || [r.deptAr, r.cashierAr, r.branchAr, r.dayAr].some(v =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const startIdx = (page - 1) * perPage;
  const pageRows = filtered.slice(startIdx, startIdx + perPage);

  const months = Array.from(new Set(records.map(r => {
    const d = new Date(r.date);
    return isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }))).filter(Boolean).sort();

  const branches = Array.from(new Set(records.map(r => r.branchAr))).filter(Boolean);
  const depts    = Array.from(new Set(records.map(r => r.deptAr))).filter(Boolean);

  const payFields: { field: keyof SaleRecord; label: string }[] = [
    {field:"visa",label:"فيزا"},{field:"cash",label:"كاش"},{field:"klik",label:"كلك"},
    {field:"orders",label:"طلبات"},{field:"cream",label:"كريم"},{field:"ashyaei",label:"اشيائي"},
    {field:"callcenter",label:"كول سنتر"},{field:"other",label:"أخرى"},
  ];

  return (
    <motion.div dir="rtl" initial="hidden" animate="show"
      variants={{ hidden:{}, show:{ transition:{ staggerChildren:0.06 } } }}
      className="space-y-5 pb-10">

      {/* Quality Score */}
      <motion.div variants={ani} className={`${card} p-6`}>
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* SVG Circle */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#F1F5F9" strokeWidth="10" />
              <motion.circle cx="60" cy="60" r="50" fill="none"
                stroke={isGood?"#059669":"#D97706"} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2*Math.PI*50}
                initial={{ strokeDashoffset:2*Math.PI*50 }}
                animate={{ strokeDashoffset:2*Math.PI*50*(1-quality.score/100) }}
                transition={{ duration:1.5, ease:"easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-900">{quality.score}٪</span>
              <span className="text-[10px] text-slate-400 font-bold">جودة</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isGood?"bg-emerald-50":"bg-amber-50"}`}>
                {isGood
                  ? <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  : <ShieldAlert className="w-5 h-5 text-amber-600" />}
              </div>
              <div>
                <h3 className="text-slate-900 font-black text-base">
                  {isGood ? "البيانات بجودة ممتازة — لا مشاكل جوهرية" : "بعض التحذيرات تستحق المراجعة"}
                </h3>
                <p className="text-slate-400 text-xs font-medium mt-0.5">
                  تحليل {records.length.toLocaleString()} سجل مالي
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { label:"إجمالي السجلات",    val: records.length.toLocaleString(),  color:"text-blue-700",   bg:"bg-blue-50"   },
                { label:"الأشهر المكتشفة",   val: months.length.toString(),         color:"text-emerald-700",bg:"bg-emerald-50" },
                { label:"الفروع",             val: branches.length.toString(),       color:"text-amber-700",  bg:"bg-amber-50"  },
                { label:"الأقسام الفريدة",   val: depts.length.toString(),          color:"text-violet-700", bg:"bg-violet-50" },
              ].map(({ label, val, color, bg }) => (
                <div key={label} className={`text-center rounded-xl py-3 ${bg}`}>
                  <p className={`font-black text-lg ${color}`}>{val}</p>
                  <p className="text-slate-500 text-[10px] font-bold mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Month tags */}
            {months.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {months.map(m => {
                  const [yr, mn] = m.split("-");
                  return (
                    <span key={m} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
                      {MONTHS_AR[parseInt(mn)-1]} {yr}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Sheets */}
            {quality.sheetsProcessed && quality.sheetsProcessed.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold self-center">الأوراق المحلَّلة:</span>
                {quality.sheetsProcessed.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                    <Database className="w-3 h-3" />
                    {s.name} ({s.rows.toLocaleString()})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Issues */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <p className="text-slate-700 font-black text-sm mb-3">تقرير جودة البيانات</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {quality.issues.map((issue, idx) => (
              <div key={idx} className="flex items-start gap-2.5 rounded-xl px-4 py-3 bg-slate-50 border border-slate-200">
                {isGood
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                <span className="text-slate-600 text-xs font-bold leading-relaxed">{issue}</span>
              </div>
            ))}
            {quality.issues.length === 0 && (
              <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-emerald-700 text-xs font-bold">لا مشاكل مرصودة — البيانات سليمة</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Records Explorer */}
      <motion.div variants={ani} className={`${card} overflow-hidden`}>
        {/* Toolbar */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-slate-900 font-black text-sm">مستعرض السجلات الكامل</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              انقر على الخانة لتعديلها
            </span>
          </div>
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            <input type="text" placeholder="ابحث عن قسم / كاشير / فرع..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-xl pr-8 pl-3 py-2 text-xs font-bold outline-none bg-white border border-slate-200 text-slate-700 focus:border-blue-400 transition-colors" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["اليوم","التاريخ","الفرع","القسم","الكاشير","فيزا","كاش","كلك","طلبات","كريم","اشيائي","كول سنتر","أخرى","الإجمالي"].map(h=>(
                  <th key={h} className={`px-3 py-3 font-black text-xs ${h==="الإجمالي"?"text-blue-700":"text-slate-500"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pageRows.map(row => {
                const d = new Date(row.date);
                const dateStr = isNaN(d.getTime()) ? "-" : `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
                return (
                  <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-slate-700">{row.dayAr}</td>
                    <td className="px-3 py-2.5 text-slate-500 font-medium">{dateStr}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black
                        ${row.branch==="G"?"bg-blue-100 text-blue-700":"bg-teal-100 text-teal-700"}`}>
                        {row.branchAr}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-700 max-w-[100px] truncate">{row.deptAr}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-500 max-w-[90px] truncate">{row.cashierAr}</td>
                    {payFields.map(({ field }) => (
                      <td key={field} className="px-1.5 py-1.5">
                        <input type="number" value={row[field] as number || ""}
                          onChange={e => onUpdateRecord(row.id, field, parseFloat(e.target.value)||0)}
                          className="w-16 text-center rounded-lg px-1 py-1.5 font-bold outline-none transition-all text-slate-600 border border-transparent hover:border-slate-300 focus:border-blue-400 focus:bg-blue-50 text-xs"
                          placeholder="0" />
                      </td>
                    ))}
                    <td className="px-3 py-2.5 font-black text-blue-700 text-center">{formatCurrency(row.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            {startIdx+1}–{Math.min(startIdx+perPage,filtered.length)} من {filtered.length.toLocaleString()} سجل
          </span>
          <div className="flex items-center gap-2">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors">
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <span className="text-xs font-black text-slate-600 px-2">{page} / {totalPages}</span>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
