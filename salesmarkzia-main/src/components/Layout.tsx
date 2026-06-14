import React, { useState } from "react";
import { DashboardData, SaleRecord } from "../types";
import { OverviewTab }   from "./OverviewTab";
import { OperationsTab } from "./OperationsTab";
import { BITab }         from "./BITab";
import { AITab }         from "./AITab";
import { QualityTab }    from "./QualityTab";
import { ComparisonTab } from "./ComparisonTab";
import { BatchesTab }    from "./BatchesTab";
import { formatCurrency } from "../lib/utils";
import {
  LayoutDashboard, Activity, BarChart2, BrainCircuit, ShieldCheck,
  Upload, TrendingUp, TrendingDown, Menu, X, ChevronDown,
  CalendarDays, Building2, Zap, Home, Layers, PlusCircle,
  FileSpreadsheet, FileText, Loader2, GitCompareArrows
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FilterStates {
  filterBranch: string; setFilterBranch: (v: string) => void;
  filterCat:    string; setFilterCat:    (v: string) => void;
  filterDept:   string; setFilterDept:   (v: string) => void;
  filterCashier:string; setFilterCashier:(v: string) => void;
  filterDay:    string; setFilterDay:    (v: string) => void;
  filterMonth:  string; setFilterMonth:  (v: string) => void;
  filterBatch:  string; setFilterBatch:  (v: string) => void;
  filterFrom:   string; setFilterFrom:   (v: string) => void;
  filterTo:     string; setFilterTo:     (v: string) => void;
  dayMin: string; dayMax: string;
  branchOptions:  string[]; catOptions:     string[];
  deptOptions:    string[]; cashierOptions: string[];
  dayOptions:     string[]; monthOptions:   string[];
  batchOptions:   { value: string; label: string }[];
  onClearAll: () => void;
}

interface BatchInfo {
  id: number;
  filename: string | null;
  uploadedAt: string;
  rowCount: number;
  firstDay: string | null;
  lastDay: string | null;
}

interface LayoutProps {
  data: DashboardData;
  records: SaleRecord[];
  client?: { name: string; logoUrl: string | null };
  onReset: () => void;
  onManualEntry?: () => void;
  onUpdateRecord: (id: string, field: keyof SaleRecord, value: number) => void;
  scenario: number;
  setScenario: (v: number) => void;
  filterStates: FilterStates;
  isAdmin?: boolean;
  onHome?: () => void;
  onExportExcel?: () => void;
  onExportPdf?: () => Promise<void> | void;
  batches?: BatchInfo[];
  onDeleteBatch?: (id: number) => Promise<void> | void;
}

const TABS = [
  { id:"overview",    label:"نظرة عامة",         icon:LayoutDashboard, color:"#2563EB" },
  { id:"operations",  label:"التحليل التشغيلي",   icon:Activity,        color:"#059669" },
  { id:"comparison",  label:"مقارنة الفترات",     icon:GitCompareArrows,color:"#4F46E5" },
  { id:"bi",          label:"ذكاء الأعمال",        icon:BarChart2,       color:"#D97706" },
  { id:"ai",          label:"توصيات ذكاء اصطناعي",icon:BrainCircuit,    color:"#7C3AED" },
  { id:"quality",     label:"جودة البيانات",       icon:ShieldCheck,     color:"#0891B2" },
  { id:"batches",     label:"الكشوف والملفات",    icon:Layers,          color:"#EC4899" },
];

const SCENARIOS = [
  { value:0.80, label:"تراجع ٢٠٪"  },
  { value:0.90, label:"محافظ ١٠٪ أقل" },
  { value:1.00, label:"الأرقام الفعلية" },
  { value:1.10, label:"نمو ١٠٪"    },
  { value:1.20, label:"متفائل ٢٠٪" },
];

const BRANCH_LABELS: Record<string,string> = { G:"الجاردنز", K:"خلدا", O:"اضاحي / أخرى" };
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export function Layout({ data, records, client, onReset, onManualEntry, onUpdateRecord, scenario, setScenario, filterStates, isAdmin = false, onHome, onExportExcel, onExportPdf, batches = [], onDeleteBatch }: LayoutProps) {
  const [activeTab, setActiveTab]   = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handlePdf = async () => {
    if (!onExportPdf || pdfLoading) return;
    setPdfLoading(true);
    try { await onExportPdf(); }
    catch (e) { console.error("PDF export failed", e); window.alert("تعذر إنشاء ملف PDF"); }
    finally { setPdfLoading(false); }
  };
  const { kpis, operational } = data;
  const { filterBranch, setFilterBranch, filterMonth, setFilterMonth, monthOptions, branchOptions,
    filterBatch, setFilterBatch, batchOptions,
    filterFrom, setFilterFrom, filterTo, setFilterTo, dayMin, dayMax } = filterStates;

  const topBranches = operational.byBranch.slice(0, 3);
  const hasFilters = !!(filterBranch || filterMonth || filterBatch || filterStates.filterDept || filterStates.filterCashier || filterFrom || filterTo);
  const activeTabDef = TABS.find(t => t.id === activeTab)!;

  // Honest growth: only a real month-over-month figure when ≥2 months exist.
  // Otherwise show the analyzed period (e.g. "9 days") instead of a fabricated %.
  const hasMoM = data.monthComparison.months.length >= 2;
  const moGrowth = data.monthComparison.avgMonthlyGrowth;

  const renderTab = () => {
    switch (activeTab) {
      case "overview":    return <OverviewTab    data={data} />;
      case "operations":  return <OperationsTab  data={data} />;
      case "comparison":  return <ComparisonTab  records={records} scenario={scenario} />;
      case "bi":          return <BITab          data={data} />;
      case "ai":          return <AITab          data={data} />;
      case "quality":     return <QualityTab     data={data} records={records} onUpdateRecord={onUpdateRecord} />;
      case "batches":     return <BatchesTab     batches={batches} filterBatch={filterBatch} setFilterBatch={setFilterBatch} isAdmin={isAdmin} onDeleteBatch={onDeleteBatch} />;
      default:            return <OverviewTab    data={data} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100" dir="rtl"
      style={{ fontFamily:"'Tajawal', sans-serif" }}>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* ═══════ SIDEBAR ═══════ */}
      <aside className={`fixed lg:static inset-y-0 right-0 z-30 w-64 flex-shrink-0 flex flex-col
          bg-gradient-to-b from-[#1c1d24] via-[#14151b] to-[#0d0e12] text-white transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "translate-x-full"} lg:translate-x-0 border-l border-white/5`}>

        {/* Brand: App Name */}
        <div className="px-5 pt-6 pb-4 border-b border-white/10 bg-black/15">
          {/* Mobile close */}
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">القائمة الجانبية</span>
            <button className="text-slate-400 hover:text-white flex-shrink-0 p-1 rounded-lg hover:bg-white/5" onClick={() => setSidebarOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex flex-col gap-1">
            <h2 className="text-blue-400 text-[10px] font-black tracking-widest leading-none">نظام كانفاس الذكي</h2>
            <h1 className="text-white text-base font-black leading-tight tracking-wide mt-1">لتحليل المبيعات</h1>
          </div>
        </div>

        {/* Client Profile Info */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3 bg-white/[0.02]">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white/10 bg-white/5">
            {client?.logoUrl ? (
              <img src={client.logoUrl} alt={client.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-black text-base">{client?.name?.trim().charAt(0) || "م"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-xs font-black leading-tight truncate">{client?.name || "العميل"}</p>
            <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[9px] font-black text-blue-300 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" /> لوحة التحليل النشطة
            </span>
          </div>
        </div>

        {/* Total Revenue Widget */}
        <div className="px-5 py-4 border-b border-white/10 bg-white/[0.01]">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-600 to-indigo-700 p-4 shadow-lg shadow-blue-900/20 relative overflow-hidden">
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/15 via-transparent to-transparent pointer-events-none" />
            
            <p className="text-blue-100/80 text-[10px] font-bold tracking-wider mb-1.5">إجمالي مبيعات الفترة</p>
            <p className="text-white font-black text-2xl tracking-tight leading-none font-sans">{formatCurrency(kpis.totalSales)}</p>
            
            <div className="flex items-center gap-1.5 mt-3">
              {hasMoM ? (
                <div className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black
                  ${moGrowth >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                  {moGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{moGrowth >= 0 ? "+" : ""}{(moGrowth * 100).toFixed(1)}٪ شهرياً</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5 text-[10px] font-black text-blue-200">
                  <CalendarDays className="w-3 h-3" />
                  <span>{kpis.activeDays} يوم تحليل</span>
                </div>
              )}
            </div>
          </div>

          {/* Top branches snippet */}
          <div className={`grid gap-1.5 mt-3 ${topBranches.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {topBranches.map((b, i) => {
              const borderColors = ["border-blue-500/20","border-emerald-500/20","border-violet-500/20"];
              const dotColors = ["bg-blue-400","bg-emerald-400","bg-violet-400"];
              return (
                <div key={b.name} className={`rounded-xl border ${borderColors[i] || "border-white/5"} bg-white/3 p-2 text-right`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${dotColors[i] || "bg-slate-400"}`} />
                    <p className="text-slate-400 font-bold text-[9px] truncate">{b.name}</p>
                  </div>
                  <p className="text-slate-100 font-black text-[11px] font-sans">{formatCurrency(b.value)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          <p className="text-slate-500 text-[9px] font-black tracking-widest uppercase px-3.5 mb-2.5">لوحات التحليل</p>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-right transition-all duration-200 border-r-2
                  ${active 
                    ? "bg-gradient-to-l from-white/8 via-white/4 to-transparent text-white border-blue-500 shadow-inner" 
                    : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/3"}`}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
                  style={{ background: active ? `${tab.color}25` : "rgba(255,255,255,0.04)" }}>
                  <Icon className="w-4 h-4" style={{ color: active ? tab.color : "#94a3b8" }} />
                </div>
                <span className="text-xs font-black">{tab.label}</span>
                {active && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
              </button>
            );
          })}
        </nav>

        {/* Projections Scenario Selector */}
        <div className="px-5 py-4 border-t border-white/10 bg-white/[0.01]">
          <p className="text-slate-450 text-[9px] font-black tracking-wider uppercase px-1 mb-2.5">سيناريو التوقعات المستقبلية</p>
          <div className="relative">
            <select value={scenario} onChange={e => setScenario(parseFloat(e.target.value))}
              className="w-full rounded-xl pr-3.5 pl-8 py-2.5 text-[11px] font-black appearance-none outline-none text-slate-200 border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer focus:ring-1 focus:ring-blue-500"
              style={{ background: "rgba(255,255,255,0.06)" }}>
              {SCENARIOS.map(s => <option key={s.value} value={s.value} style={{ background: "#14151a", color: "#cbd5e1" }}>{s.label}</option>)}
            </select>
            <ChevronDown className="absolute left-3.5 top-3.5 w-3 h-3 text-slate-455 pointer-events-none" />
          </div>
        </div>

        {/* Quick stats + Reset */}
        <div className="px-5 pb-6 pt-4 space-y-3 border-t border-white/10 bg-black/10 mt-auto">
          {/* Quick stats */}
          <div className="space-y-1.5 border-b border-white/5 pb-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-455 font-bold">إجمالي السجلات</span>
              <span className="text-slate-200 font-black font-sans">{records.length.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-455 font-bold">اليوم الأعلى مبيعاً</span>
              <span className="text-slate-200 font-black">{kpis.bestDay}</span>
            </div>
          </div>

          {/* Export actions */}
          {(onExportExcel || onExportPdf) && (
            <div className="grid grid-cols-2 gap-2">
              {onExportExcel && (
                <button onClick={onExportExcel}
                  title="تصدير Excel"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all bg-emerald-600 hover:bg-emerald-500 hover:-translate-y-0.5 text-white shadow shadow-emerald-900/30">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  إكسل
                </button>
              )}
              {onExportPdf && (
                <button onClick={handlePdf} disabled={pdfLoading}
                  title="تصدير PDF"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all bg-red-650 hover:bg-red-500 hover:-translate-y-0.5 text-white disabled:opacity-60 disabled:cursor-wait shadow shadow-red-900/30">
                  {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  تقرير PDF
                </button>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-1.5">
            <button onClick={onReset}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-black transition-all bg-blue-600 hover:bg-blue-500 hover:-translate-y-0.5 text-white shadow shadow-blue-900/20">
              <Upload className="w-3.5 h-3.5" />
              رفع كشوف جديدة
            </button>
            
            {onManualEntry && (
              <button onClick={onManualEntry}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-black transition-all bg-white/8 hover:bg-white/12 text-slate-100 shadow border border-white/5">
                <PlusCircle className="w-3.5 h-3.5" />
                إدخال يدوي ديناميكي
              </button>
            )}
            
            {isAdmin && onHome && (
              <button onClick={onHome}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-black transition-all hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-white/10 mt-1">
                <Home className="w-3.5 h-3.5" />
                قائمة جميع العملاء
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ═══════ MAIN ═══════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Bar */}
        <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 lg:px-5 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <Menu className="w-4.5 h-4.5" />
          </button>

          {/* Page title */}
          <div className="hidden sm:flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${activeTabDef.color}15` }}>
              <activeTabDef.icon className="w-4 h-4" style={{ color:activeTabDef.color }} />
            </div>
            <div>
              <h1 className="text-slate-900 font-black text-sm leading-none">{activeTabDef.label}</h1>
              <p className="text-slate-400 text-[10px] font-bold mt-0.5">{records.length.toLocaleString()} سجل محلَّل</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex-1 flex items-center justify-center gap-2 overflow-x-auto">
            <div className="relative flex-shrink-0">
              <Building2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
                className={`rounded-xl pr-8 pl-3 py-2 text-xs font-bold appearance-none cursor-pointer outline-none transition-all border
                  ${filterBranch ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300"}`}>
                <option value="">جميع الفروع</option>
                {branchOptions.map(b => <option key={b} value={b}>{BRANCH_LABELS[b] || b}</option>)}
              </select>
            </div>
            {monthOptions.length > 1 && (
              <div className="relative flex-shrink-0">
                <CalendarDays className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                  className={`rounded-xl pr-8 pl-3 py-2 text-xs font-bold appearance-none cursor-pointer outline-none transition-all border
                    ${filterMonth ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300"}`}>
                  <option value="">جميع الأشهر</option>
                  {monthOptions.map(m => {
                    const [yr, mn] = m.split("-");
                    return <option key={m} value={m}>{MONTHS_AR[parseInt(mn)-1]} {yr}</option>;
                  })}
                </select>
              </div>
            )}
            {batchOptions.length > 1 && (
              <div className="relative flex-shrink-0">
                <Layers className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)}
                  title="تصفية حسب الكشف (الملف المرفوع)"
                  className={`max-w-[220px] truncate rounded-xl pr-8 pl-3 py-2 text-xs font-bold appearance-none cursor-pointer outline-none transition-all border
                    ${filterBatch ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300"}`}>
                  <option value="">كل الكشوف</option>
                  {batchOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
            {dayMin && (
              <div className="flex-shrink-0 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                <input type="date" value={filterFrom} min={dayMin} max={dayMax} title="من يوم"
                  onChange={e => setFilterFrom(e.target.value)}
                  className={`rounded-lg px-1.5 py-1 text-xs font-bold outline-none border ${filterFrom ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-600"}`} />
                <span className="text-[10px] text-slate-400 font-bold">←</span>
                <input type="date" value={filterTo} min={dayMin} max={dayMax} title="إلى يوم"
                  onChange={e => setFilterTo(e.target.value)}
                  className={`rounded-lg px-1.5 py-1 text-xs font-bold outline-none border ${filterTo ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-600"}`} />
              </div>
            )}
            {hasFilters && (
              <button onClick={filterStates.onClearAll}
                className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors">
                ✕ إلغاء التصفية
              </button>
            )}
          </div>

          {/* Right stats */}
          <div className="hidden lg:flex items-center gap-5 flex-shrink-0">
            <div className="text-right">
              <p className="text-[9px] text-slate-400 font-bold">إجمالي الفترة</p>
              <p className="text-sm font-black text-slate-900">{formatCurrency(kpis.totalSales)}</p>
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${hasMoM ? (moGrowth >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200") : "bg-blue-50 border border-blue-200"}`}>
              {hasMoM
                ? (moGrowth >= 0 ? <Zap className="w-3.5 h-3.5 text-emerald-600" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />)
                : <CalendarDays className="w-3.5 h-3.5 text-blue-600" />}
              <span className={`text-sm font-black ${hasMoM ? (moGrowth >= 0 ? "text-emerald-700" : "text-red-600") : "text-blue-700"}`}>
                {hasMoM ? `${moGrowth >= 0 ? "+" : ""}${(moGrowth * 100).toFixed(1)}٪ نمو شهري` : `تحليل ${kpis.activeDays} يوم`}
              </span>
            </div>
          </div>
        </header>

        {/* Tab bar */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 lg:px-5 flex items-center gap-0.5 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold flex-shrink-0 border-b-2 transition-all ${active ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-5 bg-slate-50">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
              exit={{ opacity:0 }} transition={{ duration:0.15 }}>
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
