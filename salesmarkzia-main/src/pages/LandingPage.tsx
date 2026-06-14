import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  BarChart3, ShieldCheck, ArrowLeft, Sparkles, Building2, Loader2, Settings, TrendingUp,
} from "lucide-react";

interface ClientCard {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt?: string;
}

const CARD_ACCENTS = [
  { ring: "ring-blue-100",    bg: "bg-blue-50",    text: "text-blue-700",    dot: "#2563EB" },
  { ring: "ring-emerald-100", bg: "bg-emerald-50", text: "text-emerald-700", dot: "#059669" },
  { ring: "ring-amber-100",   bg: "bg-amber-50",   text: "text-amber-700",   dot: "#D97706" },
  { ring: "ring-violet-100",  bg: "bg-violet-50",  text: "text-violet-700",  dot: "#7C3AED" },
  { ring: "ring-cyan-100",    bg: "bg-cyan-50",    text: "text-cyan-700",    dot: "#0891B2" },
];

export function LandingPage() {
  const [clients, setClients] = useState<ClientCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients")
      .then(r => r.json())
      .then(d => setClients(Array.isArray(d) ? d : []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden bg-slate-50"
      style={{ fontFamily: "'Tajawal', sans-serif" }}>

      {/* Backdrop blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-emerald-200/25 blur-3xl"
          animate={{ x: [0, -24, 0], y: [0, 28, 0] }} transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }} />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-5 py-10 lg:py-14">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 shadow-lg">
              <span className="text-lg font-black text-white">م</span>
            </div>
            <div className="leading-tight">
              <p className="text-base font-black text-slate-900">نظام كانفاس الذكي</p>
              <p className="text-[10px] font-bold text-slate-400">لدعم قرار المبيعات</p>
            </div>
          </div>
          <Link to="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-blue-300 hover:text-blue-700">
            <Settings className="h-3.5 w-3.5" />
            لوحة الإدارة
          </Link>
        </div>

        {/* Hero */}
        <div className="mt-12 max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-bold text-blue-700">منصة دعم القرار للمبيعات</span>
          </div>
          <h1 className="text-3xl font-black leading-[1.15] text-slate-900 sm:text-[2.7rem]">
            اختر العميل لعرض{" "}
            <span className="bg-gradient-to-l from-blue-600 to-emerald-500 bg-clip-text text-transparent">لوحة التحليل</span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-500">
            بيانات محفوظة ومتراكمة لكل عميل — تحليل دقيق للمبيعات والفروع والأقسام مع توصيات ذكية. اختر عميلاً من القائمة أدناه.
          </p>
        </div>

        {/* Clients grid */}
        <div className="mt-10">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : clients.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Building2 className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-lg font-black text-slate-800">لا يوجد عملاء بعد</p>
              <p className="mt-1.5 text-sm text-slate-500">ابدأ بإضافة عميل جديد من لوحة الإدارة.</p>
              <Link to="/admin"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-500">
                <Settings className="h-4 w-4" />
                الذهاب للوحة الإدارة
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clients.map((c, i) => {
                const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}>
                    <Link to={`/${encodeURIComponent(c.slug)}`}
                      className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-transparent transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-blue-100">
                      <div className="flex items-center gap-3.5">
                        {c.logoUrl ? (
                          <img src={c.logoUrl} alt={c.name}
                            className="h-14 w-14 flex-shrink-0 rounded-2xl object-cover ring-1 ring-slate-100" />
                        ) : (
                          <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${accent.bg} ring-1 ${accent.ring}`}>
                            <span className={`text-2xl font-black ${accent.text}`}>{c.name.trim().charAt(0) || "؟"}</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-black text-slate-900">{c.name}</p>
                          <p className="truncate text-xs font-bold text-slate-400" dir="ltr">/{c.slug}</p>
                        </div>
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                          <TrendingUp className="h-3.5 w-3.5" style={{ color: accent.dot }} />
                          عرض اللوحة
                        </div>
                        <ArrowLeft className="h-4 w-4 text-slate-300 transition-all group-hover:-translate-x-1 group-hover:text-blue-600" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer trust row */}
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-400">
          {[
            { icon: BarChart3, text: "تحليل متعدد الأشهر" },
            { icon: ShieldCheck, text: "بيانات محفوظة بأمان" },
            { icon: Building2, text: "تعدد العملاء والفروع" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-bold">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
