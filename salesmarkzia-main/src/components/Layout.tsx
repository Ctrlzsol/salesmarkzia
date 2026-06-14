import React, { useState } from "react";
import { DashboardData, SaleRecord } from "../types";
import { OverviewTab }   from "./OverviewTab";
import { OperationsTab } from "./OperationsTab";
import { BITab }         from "./BITab";
import { AITab }         from "./AITab";
import { QualityTab }    from "./QualityTab";
import { ComparisonTab } from "./ComparisonTab";
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
}

const TABS = [
  { id:"overview",    label:"نظرة عامة",         icon:LayoutDashboard, color:"#2563EB" },
  { id:"operations",  label:"التحليل التشغيلي",   icon:Activity,        color:"#059669" },
  { id:"comparison",  label:"مقارنة الفترات",     icon:GitCompareArrows,color:"#4F46E5" },
  { id:"bi",          label:"ذكاء الأعمال",        icon:BarChart2,       color:"#D97706" },
  { id:"ai",          label:"توصيات ذكاء اصطناعي",icon:BrainCircuit,    color:"#7C3AED" },
  { id:"quality",     label:"جودة البيانات",       icon:ShieldCheck,     color:"#0891B2" },
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

export function Layout({ data, records, client, onReset, onManualEntry, onUpdateRecord, scenario, setScenario, filterStates, isAdmin = false, onHome, onExportExcel, onExportPdf }: LayoutProps) {
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
      default:            return <OverviewTab    data={data} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100" dir="rtl"
      style={{ fontFamily:"'Tajawal', sans-serif" }}>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* ═══════ SIDEBAR ═══════ */}
      <aside className={`fixed lg:static inset-y-0 right-0 z-30 w-64 flex-shrink-0 flex flex-col
          bg-gradient-to-b from-[#1d1e26] via-[#16171d] to-[#0f1014] text-white transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "translate-x-full"} lg:translate-x-0`}>

        {/* Brand */}
        <div className="px-5 pt-5 pb-4 border-b border-white/10">
          {/* Mobile close */}
          <div className="flex items-center justify-end mb-3 lg:hidden">
            <button className="text-slate-400 hover:text-white flex-shrink-0" onClick={() => setSidebarOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Client brand: logo + name */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg ring-1 ring-white/15 bg-white/10">
              {client?.logoUrl ? (
                <img src={client.logoUrl} alt={client.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-lg">{client?.name?.trim().charAt(0) || "م"}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm leading-tight truncate">{client?.name || "العميل"}</p>
              <p className="text-slate-400 text-[10px] font-bold mt-0.5">لوحة المعلومات</p>
            </div>
          </div>
        </div>

        {/* Total Revenue Widget */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-3.5">
            <p className="text-blue-100 text-[10px] font-bold mb-1.5">إجمالي الإيرادات</p>
            <p className="text-white font-black text-lg leading-none">{formatCurrency(kpis.totalSales)}</p>
            <div className="flex items-center gap-1.5 mt-2">
              {hasMoM ? (
                <>
                  {moGrowth >= 0
                    ? <TrendingUp  className="w-3 h-3 text-emerald-300" />
                    : <TrendingDown className="w-3 h-3 text-red-300" />}
                  <span className={`text-[11px] font-bold ${moGrowth >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {moGrowth >= 0 ? "+" : ""}{(moGrowth * 100).toFixed(1)}٪ نمو شهري
                  </span>
                </>
              ) : (
                <>
                  <CalendarDays className="w-3 h-3 text-blue-200" />
                  <span className="text-[11px] font-bold text-blue-100">
                    تحليل {kpis.activeDays} يوم
                  </span>
                </>
              )}
            </div>
          </div>
          <div className={`grid gap-2 mt-2 ${topBranches.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {topBranches.map((b, i) => {
              const colors = ["text-blue-400","text-teal-400","text-violet-400"];
              return (
                <div key={b.name} className="rounded-lg bg-white/5 p-2">
                  <p className={`text-[9px] font-bold ${colors[i] ?? "text-slate-400"} mb-0.5 truncate`}>{b.name}</p>
                  <p className="text-white font-black text-[10px]">{formatCurrency(b.value)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
          <p className="text-slate-500 text-[9px] font-bold tracking-widest uppercase px-3 mb-2">لوحات التحليل</p>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right transition-all ${active ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: active ? `${tab.color}30` : "rgba(255,255,255,0.05)" }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: active ? tab.color : undefined }} />
                </div>
                <span className="text-sm font-bold">{tab.label}</span>
                {active && <div className="mr-auto w-1.5 h-1.5 rounded-full" style={{ background: tab.color }} />}
              </button>
            );
          })}
        </nav>

        {/* Scenario Selector */}
        <div className="px-3 py-3 border-t border-white/10">
          <p className="text-slate-500 text-[9px] font-bold tracking-widest uppercase px-1 mb-2">سيناريو التوقعات</p>
          <div className="relative">
            <select value={scenario} onChange={e => setScenario(parseFloat(e.target.value))}
              className="w-full rounded-xl px-3 py-2.5 text-xs font-bold appearance-none outline-none bg-white/7 text-slate-200 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
              style={{ background:"rgba(255,255,255,0.07)" }}>
              {SCENARIOS.map(s => <option key={s.value} value={s.value} style={{ background:"#1e293b" }}>{s.label}</option>)}
            </select>
            <ChevronDown className="absolute left-3 top-3 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Quick stats + Reset */}
        <div className="px-3 pb-4 space-y-2 border-t border-white/10 pt-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-bold">عدد السجلات</span>
            <span className="text-slate-300 font-black">{records.length.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-bold">أفضل يوم</span>
            <span className="text-slate-300 font-black">{kpis.bestDay}</span>
          </div>

          {(onExportExcel || onExportPdf) && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {onExportExcel && (
                <button onClick={onExportExcel}
                  title="تصدير Excel"
                  className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[11px] font-bold transition-all bg-emerald-600/90 hover:bg-emerald-500 text-white">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Excel
                </button>
              )}
              {onExportPdf && (
                <button onClick={handlePdf} disabled={pdfLoading}
                  title="تصدير PDF"
                  className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[11px] font-bold transition-all bg-red-600/90 hover:bg-red-500 text-white disabled:opacity-60 disabled:cursor-wait">
                  {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  PDF
                </button>
              )}
            </div>
          )}

          <button onClick={onReset}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-blue-600 hover:bg-blue-500 text-white mt-1">
            <Upload className="w-3.5 h-3.5" />
            رفع بيانات جديدة
          </button>
          {onManualEntry && (
            <button onClick={onManualEntry}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-white/10 hover:bg-white/15 text-white mt-1">
              <PlusCircle className="w-3.5 h-3.5" />
              إدخال يدوي
            </button>
          )}
          {isAdmin && onHome && (
            <button onClick={onHome}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/10 text-slate-300 border border-white/10 mt-1">
              <Home className="w-3.5 h-3.5" />
              كل العملاء
            </button>
          )}
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
