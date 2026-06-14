import React from "react";
import { DashboardData } from "../types";
import { formatCurrency, formatPercent } from "../lib/utils";
import { BarChart3, Filter, Users, TrendingUp, Award, Smartphone, ShoppingBag, Boxes } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { motion } from "motion/react";

const card = "bg-white rounded-2xl border border-slate-200 shadow-sm";
const PALETTE = ["#2563EB","#0891B2","#7C3AED","#059669","#D97706","#DC2626","#DB2777","#EA580C"];
const ani = { hidden:{opacity:0,y:14}, show:{opacity:1,y:0,transition:{type:"spring" as const,stiffness:260,damping:22}} };

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs font-bold shadow-xl bg-white border border-slate-200"
      style={{ fontFamily:"'Tajawal', sans-serif" }}>
      <p className="text-slate-500 mb-1">{label}</p>
      {payload.map((p:any,i:number) => (
        <p key={i} style={{ color:p.color||p.fill }}>
          {p.name}: {p.name==="التراكمي٪"?`${(p.value*100).toFixed(1)}٪`:formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

const ABC_CONFIG = {
  A: { title:"فئة A — المولِّدات الرئيسية",  desc:"تولّد ٧٠٪+ من الإيراد — أعلى أولوية",  color:"#2563EB", bg:"#EFF6FF",  border:"#BFDBFE" },
  B: { title:"فئة B — أداء متوسط",             desc:"مساهمة معتدلة — فرصة للتحسين",         color:"#059669", bg:"#ECFDF5",  border:"#A7F3D0" },
  C: { title:"فئة C — إسهام ثانوي",            desc:"حجم منخفض — إعادة تقييم التشكيل",     color:"#94a3b8", bg:"#F8FAFC",  border:"#E2E8F0" },
};

export function BITab({ data }: { data: DashboardData }) {
  const { bi, operational, kpis, meta } = data;
  const crossSellAvailable = meta.crossSellAvailable;

  return (
    <motion.div dir="rtl" initial="hidden" animate="show"
      variants={{ hidden:{}, show:{ transition:{ staggerChildren:0.06 } } }}
      className="space-y-5 pb-10">

      {/* Header */}
      <motion.div variants={ani} className={`${card} p-5 flex items-center gap-4`}>
        <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-5.5 h-5.5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-slate-900 font-black text-base">ذكاء الأعمال — Business Intelligence</h2>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            تحليل باريتو ٨٠/٢٠ + تصنيف ABC للأقسام + شرائح الإيراد + استراتيجية العمولات
          </p>
        </div>
        <div className="hidden md:block mr-auto">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            {bi.pareto.filter(p=>p.isCritical).length} قسم حرج من أصل {bi.pareto.length}
          </span>
        </div>
      </motion.div>

      {/* Pareto Chart */}
      <motion.div variants={ani} className={`${card} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-black text-sm">منحنى باريتو للإيراد ٨٠/٢٠</h3>
              <p className="text-slate-400 text-xs font-medium">الأقسام الملونة بالأزرق تولّد ٨٠٪ من الإيراد</p>
            </div>
          </div>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">قانون باريتو</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={bi.pareto.slice(0,14)} margin={{ top:5, right:12, bottom:24, left:5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="productName" tick={{ fill:"#94a3b8", fontSize:9, fontWeight:700 }}
                axisLine={false} tickLine={false} dy={8}
                tickFormatter={s=>s.length>8?s.slice(0,8)+"…":s} />
              <YAxis yAxisId="l" tickFormatter={v=>`${(v/1000).toFixed(0)}k`}
                tick={{ fill:"#94a3b8", fontSize:9, fontWeight:700 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="r" orientation="left" tickFormatter={v=>`${(v*100).toFixed(0)}٪`}
                tick={{ fill:"#94a3b8", fontSize:9, fontWeight:700 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar yAxisId="l" dataKey="value" radius={[4,4,0,0]} barSize={30} name="الإيراد">
                {bi.pareto.slice(0,14).map((p,i)=>(
                  <Cell key={i} fill={p.isCritical?"#2563EB":"#BFDBFE"} />
                ))}
              </Bar>
              <Line yAxisId="r" type="monotone" dataKey="cumulativeShare"
                stroke="#D97706" strokeWidth={2.5} name="التراكمي٪"
                dot={{ r:3, fill:"#D97706", strokeWidth:0 }} activeDot={{ r:5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ABC + Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ABC */}
        <motion.div variants={ani} className={`${card} p-5`}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
              <Filter className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-black text-sm">تصنيف ABC للأقسام</h3>
              <p className="text-slate-400 text-xs font-medium">تحديد الأولويات الاستراتيجية</p>
            </div>
          </div>
          <div className="space-y-3">
            {(["A","B","C"] as const).map(cat => {
              const cfg = ABC_CONFIG[cat];
              const items = bi.abc.filter(p => p.category === cat);
              return (
                <div key={cat} className="rounded-xl p-4 border" style={{ background:cfg.bg, borderColor:cfg.border }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black" style={{ color:cfg.color }}>{cat}</span>
                      <div>
                        <p className="text-xs font-black text-slate-700">{cfg.title.replace(/^فئة [ABC] — /,"")}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{cfg.desc}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={{ background:cfg.color+"20", color:cfg.color }}>{items.length} قسم</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {items.slice(0,5).map(p => (
                      <span key={p.productName} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/70 text-slate-700 border border-white">
                        {p.productName}
                      </span>
                    ))}
                    {items.length>5 && <span className="text-[11px] text-slate-400 font-bold px-2 py-1">+{items.length-5}</span>}
                    {items.length===0 && <span className="text-[11px] text-slate-400 italic">لا توجد عناصر</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Segments */}
        <motion.div variants={ani} className={`${card} p-5`}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-black text-sm">شرائح الإيراد حسب القناة</h3>
              <p className="text-slate-400 text-xs font-medium">توزيع المبيعات بين قنوات البيع والدفع</p>
            </div>
          </div>
          <div className="space-y-4">
            {bi.customerSegments.map((seg, i) => {
              const color = PALETTE[i % PALETTE.length];
              return (
                <div key={seg.segment}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-slate-700">{seg.segment}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">{formatCurrency(seg.value)}</span>
                      <span className="text-xs font-black" style={{ color }}>{formatPercent(seg.percentage)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} animate={{width:`${seg.percentage*100}%`}}
                      transition={{duration:0.7,delay:i*0.07}} className="h-full rounded-full" style={{background:color}} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Top 10 Grid */}
      <motion.div variants={ani} className={`${card} p-5`}>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-slate-900 font-black text-sm">أفضل ١٠ أقسام بالإيراد الكلي</h3>
            <p className="text-slate-400 text-xs font-medium">ترتيب تنازلي مع الحصة النسبية</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {bi.top10Products.slice(0,10).map((p, idx) => (
            <div key={p.name}
              className={`rounded-xl p-4 border transition-all hover:shadow-md ${idx===0?"border-amber-200 bg-amber-50":"border-slate-200 bg-slate-50 hover:bg-white"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black
                  ${idx===0?"bg-amber-200 text-amber-800":idx===1?"bg-slate-300 text-slate-700":"bg-slate-200 text-slate-500"}`}>
                  {idx+1}
                </span>
                <span className="text-[10px] font-black text-slate-400">{formatPercent(p.share)}</span>
              </div>
              <p className="font-bold text-slate-700 text-xs truncate mb-1">{p.name}</p>
              <p className="font-black text-slate-900 text-sm">{formatCurrency(p.value)}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Commission & Cross-Sell strategy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={ani} className={`${card} p-5`}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-slate-900 font-black text-sm">تحليل عمولات المنصات (تقديري)</h3>
          </div>
          <div className="space-y-4">
            {kpis.commissionBreakdown.map((app) => (
              <div key={app.name} className="flex justify-between items-center p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <p className="font-black text-slate-800 text-sm">{app.name}</p>
                  <p className="text-xs text-slate-500 mt-1">المبيعات: {formatCurrency(app.sales)}</p>
                </div>
                <div className="text-left">
                  <p className="font-black text-amber-600 text-xl">{formatCurrency(app.cost)}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">العمولة ({formatPercent(app.rate)})</p>
                </div>
              </div>
            ))}
            <div className="mt-2 p-4 rounded-xl border-r-4 border-emerald-500 bg-emerald-50">
              <p className="text-sm font-bold text-slate-800">الوفر التقديري من تطبيق أشيائي</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(kpis.ownAppCommissionSaved)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={ani} className={`${card} p-5`}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-slate-900 font-black text-sm">تكوين السلة (Cross-Sell)</h3>
          </div>
          {crossSellAvailable ? (
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm font-bold text-slate-700">الوجبات الأساسية (ملحمة/مشاوي)</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(kpis.coreMealSales)}</p>
                </div>
              </div>
              <div className="flex justify-between items-end pt-2">
                <div>
                  <p className="text-sm font-bold text-slate-700">المنتجات الداعمة (مقبلات/مشروبات)</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(kpis.highMarginSales)}</p>
                </div>
                <div className="text-left">
                  <p className="text-3xl font-black text-blue-600">{formatPercent(kpis.crossSellRatio)}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">معدل البيع المتقاطع</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center h-full flex flex-col justify-center">
              <p className="text-sm font-medium text-slate-500">غير متوفر — يتطلب تصنيف الأقسام بين رئيسي وداعم</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Catering / Adahi */}
      <motion.div variants={ani} className={`${card} p-8`}>
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
            <Boxes className="w-4 h-4 text-violet-600" />
          </div>
          <h3 className="text-slate-900 font-black text-sm">أضاحي / خدمات أخرى</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">إجمالي الإيراد</p>
            <p className="text-3xl font-black text-slate-900">{formatCurrency(kpis.cateringTotal)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">الحصة من الكلي</p>
            <p className="text-3xl font-black text-slate-900">{formatPercent(kpis.cateringShare)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">أيام نشطة</p>
            <p className="text-3xl font-black text-slate-900">{kpis.cateringActiveDays}</p>
          </div>
        </div>
      </motion.div>

      {/* Department × Branch Matrix */}
      <motion.div variants={ani} className={`${card} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-slate-900 font-black text-sm">مصفوفة الأقسام — الجاردنز مقابل خلدا</h3>
          <p className="text-slate-400 text-xs font-medium mt-0.5">مقارنة إيراد كل قسم في الفرعين</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-slate-500 font-black">القسم</th>
                <th className="px-5 py-3 text-blue-700 font-black text-center">الجاردنز</th>
                <th className="px-5 py-3 text-teal-700 font-black text-center">خلدا</th>
                <th className="px-5 py-3 text-slate-800 font-black text-center">الإجمالي</th>
                <th className="px-5 py-3 text-slate-500 font-black text-center">الحصة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {operational.matrix.slice(0,12).map(row => (
                <tr key={row.department} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-bold text-slate-700">{row.department}</td>
                  <td className="px-5 py-3 text-center font-bold text-blue-700">{formatCurrency(row.branchG)}</td>
                  <td className="px-5 py-3 text-center font-bold text-teal-700">{formatCurrency(row.branchK)}</td>
                  <td className="px-5 py-3 text-center font-black text-slate-900">{formatCurrency(row.total)}</td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{width:`${row.percentage*100}%`}} />
                      </div>
                      <span className="text-slate-500 font-black">{formatPercent(row.percentage)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
