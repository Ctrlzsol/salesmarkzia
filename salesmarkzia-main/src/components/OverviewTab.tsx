import React from "react";
import { DashboardData } from "../types";
import { formatCurrency, formatPercent } from "../lib/utils";
import {
  DollarSign, Receipt, TrendingUp, TrendingDown,
  CalendarDays, Building2, ArrowUpRight, ArrowDownRight,
  Flame, Star, Banknote, Smartphone, CreditCard
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from "recharts";
import { motion } from "motion/react";

const card = "bg-white rounded-2xl border border-slate-200 shadow-sm";
const PALETTE = ["#2563EB","#0891B2","#7C3AED","#059669","#D97706","#DC2626","#DB2777","#EA580C"];

const ani = {
  hidden: { opacity:0, y:14 },
  show:   { opacity:1, y:0, transition:{ type:"spring" as const, stiffness:280, damping:24 } },
};

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs font-bold shadow-xl bg-white border border-slate-200"
      style={{ fontFamily:"'Tajawal', sans-serif" }}>
      <p className="text-slate-500 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

export function OverviewTab({ data }: { data: DashboardData }) {
  const { kpis, operational, monthComparison } = data;
  const hasMulti = monthComparison.months.length >= 2;
  const hasSingle = monthComparison.months.length === 1;
  const realGrowth = monthComparison.avgMonthlyGrowth;

  // Honest growth: a real % only when ≥2 months exist; otherwise surface the
  // analyzed period (e.g. "9 days") instead of a fabricated growth figure.
  const kpiCards = [
    {
      label: "إجمالي الإيرادات",
      sub: "مجموع جميع وسائل الدفع",
      value: formatCurrency(kpis.totalSales),
      badge: hasMulti
        ? `${monthComparison.totalGrowth >= 0 ? "+" : ""}${(monthComparison.totalGrowth * 100).toFixed(1)}٪`
        : `${kpis.activeDays} يوم`,
      positive: hasMulti ? monthComparison.totalGrowth >= 0 : true,
      neutral: !hasMulti,
      icon: DollarSign, color: "#2563EB", bg: "#EFF6FF",
    },
    {
      label: "عدد السجلات المحلَّلة",
      sub: "إجمالي السجلات اليومية في الفترة",
      value: kpis.invoiceCount.toLocaleString(),
      badge: `معدل يومي ${formatCurrency(kpis.avgDailySales)}`,
      positive: true,
      neutral: true,
      icon: Receipt, color: "#059669", bg: "#ECFDF5",
    },
    {
      label: "نسبة الدفع الإلكتروني",
      sub: `الكاش: ${formatPercent(1 - kpis.digitalPaymentRatio)} من الإجمالي`,
      value: formatPercent(kpis.digitalPaymentRatio),
      badge: kpis.digitalPaymentRatio >= 0.4 ? "مستوى جيد" : "يحتاج تطوير",
      positive: kpis.digitalPaymentRatio >= 0.4,
      neutral: false,
      icon: Smartphone, color: "#7C3AED", bg: "#F5F3FF",
    },
    hasMulti
      ? {
          label: "النمو الشهري للأعمال",
          sub: `${monthComparison.months.length} أشهر محللة`,
          value: `${realGrowth >= 0 ? "+" : ""}${(realGrowth * 100).toFixed(1)}٪`,
          badge: realGrowth >= 0 ? "اتجاه إيجابي" : "يستدعي المراجعة",
          positive: realGrowth >= 0,
          neutral: false,
          icon: realGrowth >= 0 ? TrendingUp : TrendingDown,
          color: realGrowth >= 0 ? "#059669" : "#DC2626",
          bg: realGrowth >= 0 ? "#ECFDF5" : "#FEF2F2",
        }
      : {
          label: "الفترة المحللة",
          sub: "شهر واحد — لا تتوفر مقارنة شهرية بعد",
          value: `${kpis.activeDays} يوم`,
          badge: monthComparison.months[0]?.monthLabel?.split(" ")[0] ?? "—",
          positive: true,
          neutral: true,
          icon: CalendarDays, color: "#2563EB", bg: "#EFF6FF",
        },
  ];

  const hasOtherBranch = monthComparison.months.some(m => (m.branchO ?? 0) > 0);
  const monthChartData = monthComparison.months.map(m => ({
    name: m.monthLabel.split(" ")[0],
    "الجاردنز":      Math.round(m.branchG),
    "خلدا":          Math.round(m.branchK),
    ...(hasOtherBranch ? { "اضاحي / أخرى": Math.round(m.branchO ?? 0) } : {}),
  }));

  const dayData = operational.byDay.map(d => ({
    name: d.dayAr.replace(/^ال/, ""), full: d.dayAr, total: d.total, g: d.branchG, k: d.branchK,
  }));

  const payPie = operational.byPaymentMethod
    .filter(p => p.value > 0)
    .map((p, i) => ({ name: p.name, value: Math.round(p.value), share: p.share, color: PALETTE[i] ?? "#94a3b8" }));

  return (
    <motion.div dir="rtl" initial="hidden" animate="show"
      variants={{ hidden:{}, show:{ transition:{ staggerChildren:0.06 } } }}
      className="space-y-5 pb-10">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(k => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} variants={ani} className={`${card} p-4 flex flex-col gap-3`}>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: k.color }} />
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5
                  ${k.neutral
                    ? "bg-slate-100 text-slate-500 border border-slate-200"
                    : k.positive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                  {k.neutral
                    ? <CalendarDays className="w-3 h-3"/>
                    : k.positive ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
                  {k.badge}
                </span>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] font-bold mb-0.5">{k.label}</p>
                <p className="text-slate-900 font-black text-xl leading-tight">{k.value}</p>
                <p className="text-slate-400 text-[10px] font-medium mt-1">{k.sub}</p>
              </div>
              <div className="h-0.5 rounded-full" style={{ background: `${k.color}20` }}>
                <div className="h-full rounded-full w-2/3" style={{ background: k.color, opacity:0.5 }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Single-Month Banner ── */}
      {hasSingle && (
        <motion.div variants={ani} className={`${card} p-5`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <CalendarDays className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div>
              <p className="text-slate-900 font-black text-sm">{monthComparison.months[0]?.monthLabel}</p>
              <p className="text-slate-400 text-xs font-medium">ملخص الشهر المحلّل — {monthComparison.months[0]?.daysActive ?? 0} يوم نشاط</p>
            </div>
          </div>
          {(() => {
            const m0 = monthComparison.months[0];
            const hasO = (m0?.branchO ?? 0) > 0;
            const items = [
              { label:"إجمالي الإيراد", val: formatCurrency(m0?.total ?? 0),   color:"text-blue-700",   bg:"bg-blue-50" },
              { label:"الجاردنز",        val: formatCurrency(m0?.branchG ?? 0), color:"text-indigo-700", bg:"bg-indigo-50" },
              { label:"خلدا",            val: formatCurrency(m0?.branchK ?? 0), color:"text-teal-700",   bg:"bg-teal-50" },
              ...(hasO ? [{ label:"اضاحي / أخرى", val: formatCurrency(m0?.branchO ?? 0), color:"text-violet-700", bg:"bg-violet-50" }] : []),
              { label:"أيام نشاط",       val: `${m0?.daysActive ?? 0} يوم`,    color:"text-amber-700",  bg:"bg-amber-50" },
            ];
            return (
              <div className={`grid gap-3 ${hasO ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}>
                {items.map(({ label, val, color, bg }) => (
                  <div key={label} className={`text-center rounded-xl py-3 ${bg}`}>
                    <p className={`font-black text-sm ${color}`}>{val}</p>
                    <p className="text-slate-500 text-[10px] font-bold mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* ── Multi-Month Comparison ── */}
      {hasMulti && (
        <motion.div variants={ani} className={`${card} p-5 space-y-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <CalendarDays className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-slate-900 font-black text-sm">المقارنة الشهرية للفروع</h3>
                <p className="text-slate-400 text-xs font-medium mt-0.5">
                  {monthComparison.months.length} أشهر — نمو إجمالي {monthComparison.totalGrowth >= 0 ? "+" : ""}{(monthComparison.totalGrowth * 100).toFixed(1)}٪
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                أفضل: {monthComparison.bestMonth.split(" ")[0]}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200">
                أدنى: {monthComparison.worstMonth.split(" ")[0]}
              </span>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthChartData} margin={{ top:5, right:5, bottom:0, left:5 }}>
                <defs>
                  <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gK" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0891B2" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#0891B2" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fill:"#94a3b8", fontSize:10, fontWeight:700 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fill:"#94a3b8", fontSize:9, fontWeight:700 }} axisLine={false} tickLine={false} width={38} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="الجاردنز" stroke="#2563EB" strokeWidth={2.5} fill="url(#gG)"
                  dot={{ r:4, fill:"#2563EB", strokeWidth:0 }} activeDot={{ r:6 }} />
                <Area type="monotone" dataKey="خلدا" stroke="#0891B2" strokeWidth={2.5} fill="url(#gK)"
                  dot={{ r:4, fill:"#0891B2", strokeWidth:0 }} activeDot={{ r:6 }} />
                {hasOtherBranch && (
                  <Area type="monotone" dataKey="اضاحي / أخرى" stroke="#7C3AED" strokeWidth={2.5} fill="url(#gO)"
                    dot={{ r:4, fill:"#7C3AED", strokeWidth:0 }} activeDot={{ r:6 }} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center gap-4 justify-center text-xs font-bold text-slate-500 flex-wrap">
            {[
              {label:"الجاردنز",c:"#2563EB"},
              {label:"خلدا",c:"#0891B2"},
              ...(hasOtherBranch ? [{label:"اضاحي / أخرى",c:"#7C3AED"}] : []),
            ].map(l=>(
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 rounded-full" style={{background:l.c}}/>
                {l.label}
              </div>
            ))}
          </div>

          {/* Month cards */}
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-3 min-w-max">
              {monthComparison.months.map((m, i) => {
                const mom = monthComparison.monthOverMonth[i - 1];
                const grow = !mom || mom.change >= 0;
                return (
                  <div key={m.monthKey} className="flex-shrink-0 rounded-xl border border-slate-200 p-3.5 min-w-[155px] bg-slate-50">
                    <p className="text-xs font-black text-slate-700 mb-1">{m.monthLabel}</p>
                    <p className="text-slate-900 font-black text-base leading-none">{formatCurrency(m.total)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] text-slate-400 font-bold">{m.invoiceCount} سجل / {m.daysActive} يوم</span>
                      {mom && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${grow ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"}`}>
                          {grow?"+":""}{(mom.change*100).toFixed(1)}٪
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      <div className="text-center rounded-lg py-1 bg-blue-50">
                        <p className="text-[9px] text-slate-400 font-bold">جاردنز</p>
                        <p className="text-[10px] text-blue-700 font-black">{Math.round(m.branchG/1000)}k</p>
                      </div>
                      <div className="text-center rounded-lg py-1 bg-teal-50">
                        <p className="text-[9px] text-slate-400 font-bold">خلدا</p>
                        <p className="text-[10px] text-teal-700 font-black">{Math.round(m.branchK/1000)}k</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── 2-Col: Day Chart + Branch Performance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Day of Week */}
        <motion.div variants={ani} className={`${card} p-5`}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Flame className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-black text-sm">إيرادات أيام الأسبوع</h3>
              <p className="text-slate-400 text-xs font-medium">أعلى يوم: <span className="text-amber-700 font-bold">{kpis.bestDay}</span></p>
            </div>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayData} margin={{ top:4, right:4, bottom:0, left:-18 }} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" interval={0} tick={{ fill:"#94a3b8", fontSize:9, fontWeight:700 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}k`} tick={{ fill:"#94a3b8", fontSize:9, fontWeight:700 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v:number)=>[formatCurrency(v),"المبيعات"]}
                  contentStyle={{ borderRadius:"10px", border:"1px solid #e2e8f0", fontFamily:"'Tajawal', sans-serif", fontSize:"12px" }} />
                <Bar dataKey="total" radius={[5,5,0,0]}>
                  {dayData.map((d,i) => <Cell key={i} fill={d.full===kpis.bestDay?"#D97706":"#2563EB"} fillOpacity={d.full===kpis.bestDay?0.9:0.65} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Branch Split */}
        <motion.div variants={ani} className={`${card} p-5`}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-black text-sm">مقارنة أداء الفروع</h3>
              <p className="text-slate-400 text-xs font-medium">حصة كل فرع من الإيراد الكلي</p>
            </div>
          </div>
          <div className="space-y-4">
            {operational.byBranch.map((b, idx) => {
              const color = idx===0 ? "#2563EB" : "#0891B2";
              return (
                <div key={b.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-800 font-black text-sm">{b.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-bold">{formatPercent(b.share)}</span>
                      <span className="text-slate-900 font-black text-sm">{formatCurrency(b.value)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} animate={{width:`${b.share*100}%`}} transition={{duration:0.8,delay:idx*0.1}}
                      className="h-full rounded-full" style={{background:`linear-gradient(90deg,${color},${color}99)`}} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="text-center rounded-xl py-2.5 bg-blue-50">
              <p className="text-[9px] text-slate-500 font-bold">متوسط يومي — الجاردنز</p>
              <p className="text-blue-700 font-black text-sm mt-0.5">{formatCurrency(kpis.avgInvoiceValueG)}</p>
            </div>
            <div className="text-center rounded-xl py-2.5 bg-teal-50">
              <p className="text-[9px] text-slate-500 font-bold">متوسط يومي — خلدا</p>
              <p className="text-teal-700 font-black text-sm mt-0.5">{formatCurrency(kpis.avgInvoiceValueK)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Payment Methods + Top Departments ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Donut + Legend */}
        <motion.div variants={ani} className={`${card} p-5 lg:col-span-2`}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-black text-sm">توزيع وسائل الدفع</h3>
              <p className="text-slate-400 text-xs font-medium">{kpis.paymentFragmentationIndex} قناة دفع نشطة</p>
            </div>
          </div>
          {payPie.length > 0 && (
            <div className="h-40 mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={payPie} cx="50%" cy="50%" innerRadius={44} outerRadius={62}
                    dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                    {payPie.map((p,i) => <Cell key={i} fill={p.color} />)}
                  </Pie>
                  <Tooltip formatter={(v:number)=>[formatCurrency(v),"المبيعات"]}
                    contentStyle={{ borderRadius:"10px", border:"1px solid #e2e8f0", fontFamily:"'Tajawal', sans-serif" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="space-y-2">
            {payPie.slice(0,5).map(p => (
              <div key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{background:p.color}} />
                  <span className="text-xs font-bold text-slate-600">{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">{formatCurrency(p.value)}</span>
                  <span className="text-xs font-black" style={{color:p.color}}>{formatPercent(p.share)}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Departments */}
        <motion.div variants={ani} className={`${card} p-5 lg:col-span-3`}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Star className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-slate-900 font-black text-sm">أعلى الأقسام إيراداً</h3>
          </div>
          <div className="space-y-2">
            {operational.byDepartment.slice(0, 8).map((dept, idx) => {
              const color = PALETTE[idx % PALETTE.length];
              return (
                <div key={dept.name} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-colors">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0
                    ${idx===0?"bg-amber-100 text-amber-700":idx===1?"bg-slate-200 text-slate-600":"bg-slate-100 text-slate-500"}`}>
                    {idx+1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-800 truncate">{dept.name}</span>
                      <span className="font-black text-slate-900 text-sm mr-2">{formatCurrency(dept.value)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{width:0}} animate={{width:`${dept.share*100}%`}} transition={{duration:0.6,delay:idx*0.04}}
                        className="h-full rounded-full" style={{background:color}} />
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 w-9 text-left">{formatPercent(dept.share)}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ── Payment Breakdown Cards ── */}
      <motion.div variants={ani} className={`${card} p-5`}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
            <Banknote className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-slate-900 font-black text-sm">تفصيل قنوات الإيراد</h3>
            <p className="text-slate-400 text-xs font-medium">كاش / إلكتروني / توصيل / صالة مباشرة</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:"النقد الكاش",       val:kpis.cashSalesTotal,      pct:1-kpis.digitalPaymentRatio, color:"#D97706", bg:"#FEF3C7" },
            { label:"الدفع الإلكتروني",  val:kpis.electronicSalesTotal,pct:kpis.digitalPaymentRatio,   color:"#2563EB", bg:"#EFF6FF" },
            { label:"التوصيل (أبليكيشن)",val:kpis.deliverySalesTotal,  pct:kpis.totalSales>0?kpis.deliverySalesTotal/kpis.totalSales:0,color:"#7C3AED",bg:"#F5F3FF" },
            { label:"الصالة مباشرة",     val:kpis.directStoreSalesTotal,pct:kpis.totalSales>0?kpis.directStoreSalesTotal/kpis.totalSales:0,color:"#059669",bg:"#ECFDF5" },
          ].map(({ label, val, pct, color, bg }) => (
            <div key={label} className="rounded-xl p-4 border border-slate-100" style={{background:bg+"80"}}>
              <p className="text-[10px] font-bold text-slate-500 mb-1">{label}</p>
              <p className="font-black text-slate-900 text-sm mb-2">{formatCurrency(val)}</p>
              <div className="h-1.5 bg-white rounded-full overflow-hidden mb-1">
                <motion.div initial={{width:0}} animate={{width:`${pct*100}%`}} transition={{duration:0.8}}
                  className="h-full rounded-full" style={{background:color}} />
              </div>
              <p className="text-[10px] font-black" style={{color}}>{formatPercent(pct)}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Payment Channel Composition + App Dependency ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={ani} className={`${card} p-5`}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-slate-900 font-black text-sm">تكوين قنوات الدفع</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm font-bold text-slate-600">دفع في الصالة (كاش + بطاقات)</p>
                <p className="text-xl font-black text-slate-900">{formatCurrency(kpis.inStorePaymentTotal)}</p>
              </div>
              <span className="text-lg font-black text-slate-400">{formatPercent(kpis.inStorePaymentRatio)}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${kpis.inStorePaymentRatio * 100}%` }}></div>
            </div>

            <div className="flex justify-between items-end pt-3">
              <div>
                <p className="text-sm font-bold text-slate-600">دفع عن بعد (منصات + حوالات)</p>
                <p className="text-xl font-black text-slate-900">{formatCurrency(kpis.remotePaymentTotal)}</p>
              </div>
              <span className="text-lg font-black text-slate-400">{formatPercent(1 - kpis.inStorePaymentRatio)}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-slate-400 h-2 rounded-full" style={{ width: `${(1 - kpis.inStorePaymentRatio) * 100}%` }}></div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={ani} className={`${card} p-5`}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-slate-900 font-black text-sm">اعتمادية تطبيقات التوصيل</h3>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">مبيعات التطبيقات</p>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(kpis.appSalesTotal)}</p>
              <p className="text-xs text-slate-500 mt-1">نسبة الاعتماد: {formatPercent(kpis.appDependencyRatio)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">عمولات تقديرية</p>
              <p className="text-2xl font-black text-amber-600">{formatCurrency(kpis.estimatedCommissionCost)}</p>
              <p className="text-[10px] text-amber-600/70 mt-1 font-bold tracking-wide">تقديري — بناءً على النسب المعتادة</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-bold text-slate-700">تطبيق أشيائي (الخاص)</span>
              <span className="text-sm font-black text-slate-900">{formatCurrency(kpis.ownAppSalesTotal)}</span>
            </div>
            <p className="text-xs text-slate-500">يمثل {formatPercent(kpis.ownAppAdoptionRate)} من إجمالي مبيعات التطبيقات — تم توفير {formatCurrency(kpis.ownAppCommissionSaved)} تقديراً</p>
          </div>
        </motion.div>
      </div>

      {/* ── Highlights ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:"أفضل يوم",  val:kpis.bestDay,            icon:Flame,       color:"text-amber-600",   bg:"bg-amber-50" },
          { label:"أدنى يوم",  val:kpis.worstDay,           icon:TrendingDown,color:"text-slate-500",   bg:"bg-slate-100" },
          { label:"أفضل شهر",  val:kpis.bestMonth || "-",   icon:TrendingUp,  color:"text-emerald-600", bg:"bg-emerald-50" },
          { label:"أدنى شهر",  val:kpis.worstMonth || "-",  icon:CalendarDays,color:"text-blue-600",    bg:"bg-blue-50" },
        ].map(({ label, val, icon:Icon, color, bg }) => (
          <motion.div key={label} variants={ani} className={`${card} p-5`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{label}</p>
            <p className="text-lg font-black text-slate-800">{val}</p>
          </motion.div>
        ))}
      </div>

    </motion.div>
  );
}
