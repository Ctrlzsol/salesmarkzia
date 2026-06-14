import React from "react";
import { DashboardData } from "../types";
import { formatCurrency, formatPercent } from "../lib/utils";
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip, BarChart, Cell
} from "recharts";
import {
  Smartphone, CreditCard, UtensilsCrossed, Users, Activity, MapPin, Clock
} from "lucide-react";
import { motion } from "motion/react";

const card = "bg-white rounded-2xl border border-slate-200 shadow-sm";
const PALETTE = ["#2563EB","#0891B2","#7C3AED","#059669","#D97706","#DC2626","#DB2777","#EA580C"];

const ani = {
  hidden: { opacity:0, y:14 },
  show:   { opacity:1, y:0, transition:{ type:"spring" as const, stiffness:260, damping:22 } },
};

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs font-bold shadow-xl bg-white border border-slate-200"
      style={{ fontFamily:"'Tajawal', sans-serif" }}>
      <p className="text-slate-500 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name ?? "المبيعات"}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

export function OperationsTab({ data }: { data: DashboardData }) {
  const { operational } = data;

  const charts = [
    { title:"حصص الفروع",              icon:MapPin,          color:"#2563EB", data:operational.byBranch },
    { title:"قنوات البيع (صالة/توصيل)", icon:Smartphone,     color:"#0891B2", data:operational.byChannel },
    { title:"وسائل الدفع المستخدمة",   icon:CreditCard,     color:"#7C3AED", data:operational.byPaymentMethod },
    { title:"أداء الأقسام (أعلى ٨)",   icon:UtensilsCrossed,color:"#D97706", data:operational.byDepartment.slice(0,8) },
  ];

  const dayData = operational.byDay.map(d => ({
    name: d.dayAr.replace(/^ال/, ""), full: d.dayAr,
    "الجاردنز": d.branchG, "خلدا": d.branchK, total: d.total,
  }));

  return (
    <motion.div dir="rtl" initial="hidden" animate="show"
      variants={{ hidden:{}, show:{ transition:{ staggerChildren:0.06 } } }}
      className="space-y-5 pb-10">

      {/* Header */}
      <motion.div variants={ani} className={`${card} p-5 flex items-center gap-4`}>
        <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Activity className="w-5.5 h-5.5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-slate-900 font-black text-base">التحليل التشغيلي التفصيلي</h2>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            توزيع المبيعات حسب الفرع، قناة البيع، وسيلة الدفع، والقسم
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          {[
            { label:"عدد الفروع",  val: operational.byBranch.length.toString(),     color:"text-blue-700",  bg:"bg-blue-50"  },
            { label:"قنوات البيع", val: operational.byChannel.length.toString(),    color:"text-teal-700",  bg:"bg-teal-50"  },
            { label:"الأقسام",     val: operational.byDepartment.length.toString(), color:"text-violet-700",bg:"bg-violet-50"},
          ].map(({ label, val, color, bg }) => (
            <div key={label} className={`text-center rounded-xl px-3 py-2 ${bg}`}>
              <p className={`font-black text-base ${color}`}>{val}</p>
              <p className="text-slate-500 text-[9px] font-bold mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Branch performance cards (daily averages) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {operational.byBranch.map(b => (
          <motion.div key={b.name} variants={ani} className={`${card} p-6`}>
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-2xl font-black text-slate-900">{b.name}</h4>
              <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">{formatPercent(b.share)} حصة</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">إجمالي المبيعات</p>
                <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(b.value)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">المتوسط اليومي</p>
                <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(b.perDay)}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">خلال {b.days} أيام نشطة</p>
          </motion.div>
        ))}
      </div>

      {/* 4 Horizontal Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {charts.map(({ title, icon: Icon, color, data }) => {
          const sorted = [...data].sort((a,b) => b.value - a.value);
          return (
            <motion.div key={title} variants={ani} className={`${card} p-5`}>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background:`${color}15` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <h3 className="text-slate-900 font-black text-sm">{title}</h3>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart layout="vertical" data={sorted} margin={{ top:0, right:10, bottom:0, left:10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" tick={{ fill:"#94a3b8", fontSize:9, fontWeight:700 }}
                      tickFormatter={v=>`${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <YAxis orientation="right" type="category" dataKey="name"
                      tick={{ fill:"#475569", fontSize:10, fontWeight:700 }}
                      axisLine={false} tickLine={false} width={88} dx={4} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="value" radius={[0,5,5,0]} barSize={13}>
                      {sorted.map((_,i) => <Cell key={i} fill={PALETTE[i%PALETTE.length]} fillOpacity={0.8} />)}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Day of Week */}
      {dayData.some(d=>d.total>0) && (
        <motion.div variants={ani} className={`${card} p-5`}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-black text-sm">إيرادات الفروع حسب يوم الأسبوع</h3>
              <p className="text-slate-400 text-xs font-medium">مقارنة أداء الفرعين في كل يوم</p>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayData} margin={{ top:5, right:5, bottom:5, left:-8 }} barSize={14} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" interval={0} tick={{ fill:"#94a3b8", fontSize:9, fontWeight:700 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}k`} tick={{ fill:"#94a3b8", fontSize:9, fontWeight:700 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="الجاردنز" fill="#2563EB" radius={[4,4,0,0]} fillOpacity={0.85} />
                <Bar dataKey="خلدا"     fill="#0891B2" radius={[4,4,0,0]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-5 mt-2">
            {[{l:"الجاردنز",c:"#2563EB"},{l:"خلدا",c:"#0891B2"}].map(x=>(
              <div key={x.l} className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <div className="w-3 h-2 rounded-sm" style={{background:x.c}} />
                {x.l}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Cashier Performance */}
      <motion.div variants={ani} className={`${card} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
            <Users className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h3 className="text-slate-900 font-black text-sm">أداء الكاشيرات — نقاط البيع</h3>
            <p className="text-slate-400 text-xs font-medium">الإيراد الإجمالي لكل موظف</p>
          </div>
        </div>
        <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
          {operational.bySalesperson.slice(0, 12).map((c, idx) => (
            <div key={c.name} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black"
                  style={{ background: idx===0?"#EDE9FE":"#F8FAFC", color: idx===0?"#7C3AED":"#94a3b8" }}>
                  {idx+1}
                </span>
                <div>
                  <p className="text-slate-800 font-bold text-sm">{c.name}</p>
                  <p className="text-slate-400 text-[10px] font-bold">{c.invoices} سجل</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500"
                    style={{ width:`${(c.value/(operational.bySalesperson[0]?.value||1))*100}%` }} />
                </div>
                <p className="font-black text-slate-900 text-sm w-24 text-left">{formatCurrency(c.value)}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Shift analysis notice */}
      <motion.div variants={ani} className={`${card} p-5`}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <h3 className="text-slate-900 font-black text-sm">تحليل الورديات (Shifts)</h3>
        </div>
        {!data.meta.timeDataAvailable ? (
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <p className="text-sm font-medium text-slate-500">
              غير متوفر — يتطلب توقيت العمليات من نظام نقاط البيع لتبويب الورديات
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">بيانات الورديات متوفرة (يتم عرضها هنا)</p>
        )}
      </motion.div>

      {/* Matrix Table */}
      {operational.matrix.length > 0 && (
        <motion.div variants={ani} className={`${card} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-slate-900 font-black text-sm">مصفوفة الإيرادات — الأقسام × الفروع</h3>
            <p className="text-slate-400 text-xs font-medium mt-0.5">مقارنة مبيعات كل قسم في الجاردنز وخلدا</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-slate-500 font-black">القسم</th>
                  <th className="px-5 py-3 text-blue-700 font-black text-center">الجاردنز</th>
                  <th className="px-5 py-3 text-teal-700 font-black text-center">خلدا</th>
                  <th className="px-5 py-3 text-slate-800 font-black text-center">الإجمالي</th>
                  <th className="px-5 py-3 text-slate-500 font-black text-center">الحصة ٪</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {operational.matrix.slice(0, 12).map(row => (
                  <tr key={row.department} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-700">{row.department}</td>
                    <td className="px-5 py-3 text-center font-bold text-blue-700">{formatCurrency(row.branchG)}</td>
                    <td className="px-5 py-3 text-center font-bold text-teal-700">{formatCurrency(row.branchK)}</td>
                    <td className="px-5 py-3 text-center font-black text-slate-900">{formatCurrency(row.total)}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500"
                            style={{ width:`${row.percentage*100}%` }} />
                        </div>
                        <span className="text-slate-500 font-black w-9">{formatPercent(row.percentage)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
