import React from "react";
import { DashboardData } from "../types";
import {
  Sparkles, ClipboardList, HelpCircle, TrendingUp, Target,
  Rocket, AlertTriangle, Lightbulb,
} from "lucide-react";

export function AITab({ data }: { data: DashboardData }) {
  const { ai } = data;

  return (
    <div dir="rtl" className="space-y-5 max-w-5xl mx-auto pb-10">

      {/* ═══ Header ═══ */}
      <section className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-l from-violet-600 to-indigo-600 p-6 text-white shadow-sm">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black leading-tight">مركز التوصيات الذكية</h2>
            <p className="text-sm font-bold text-violet-100 mt-1">
              تحليل استراتيجي مُولّد من بيانات المركزية لدعم اتخاذ القرار
            </p>
          </div>
        </div>
        <Sparkles className="pointer-events-none absolute -left-4 -bottom-6 h-32 w-32 text-white/10" />
      </section>

      {/* ═══ 1 & 2 — What happened / Why ═══ */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <NarrativeCard
          icon={ClipboardList}
          title="ماذا حدث في هذه الفترة؟"
          accent="blue"
          text={ai.whatHappened}
        />
        <NarrativeCard
          icon={HelpCircle}
          title="لماذا تحقق هذا الأداء؟"
          accent="indigo"
          text={ai.whyHappened}
        />
      </section>

      {/* ═══ 3 — Strategic recommendation (hero) ═══ */}
      <section className="rounded-2xl border-r-4 border-violet-600 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
            <Target className="h-4.5 w-4.5 text-violet-600" />
          </div>
          <h3 className="text-sm font-black text-violet-700">التوصية الاستراتيجية الرئيسية</h3>
        </div>
        <p className="text-xl font-black leading-snug text-slate-900">{ai.recommendation}</p>
      </section>

      {/* ═══ 4 — Expected next ═══ */}
      <section className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100">
            <TrendingUp className="h-4.5 w-4.5 text-cyan-700" />
          </div>
          <h3 className="text-sm font-black text-cyan-800">ما المتوقع خلال الفترة القادمة؟</h3>
        </div>
        <p className="text-base font-bold leading-relaxed text-slate-700">{ai.expectedNext}</p>
      </section>

      {/* ═══ 5, 6, 7 — Boosts / Opportunities / Risks ═══ */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ListCard
          icon={Rocket}
          title="أفكار لتعزيز المبيعات"
          accent="emerald"
          items={ai.revenueBoosts}
          empty="لا توجد أفكار مقترحة حالياً."
        />
        <ListCard
          icon={Lightbulb}
          title="الفرص المتاحة"
          accent="amber"
          items={ai.topOpportunities}
          empty="لا توجد فرص مرصودة حالياً."
        />
        <ListCard
          icon={AlertTriangle}
          title="المخاطر والتحديات"
          accent="rose"
          items={ai.topRisks}
          empty="لا توجد مخاطر مرصودة حالياً."
        />
      </section>
    </div>
  );
}

const ACCENTS = {
  blue:    { chip: "bg-blue-100 text-blue-600",       title: "text-blue-700" },
  indigo:  { chip: "bg-indigo-100 text-indigo-600",   title: "text-indigo-700" },
  emerald: { chip: "bg-emerald-100 text-emerald-600", title: "text-emerald-700", bullet: "text-emerald-500" },
  amber:   { chip: "bg-amber-100 text-amber-600",     title: "text-amber-700",   bullet: "text-amber-500" },
  rose:    { chip: "bg-rose-100 text-rose-600",       title: "text-rose-700",    bullet: "text-rose-500" },
} as const;

function NarrativeCard({
  icon: Icon, title, text, accent,
}: { icon: any; title: string; text: string; accent: keyof typeof ACCENTS }) {
  const a = ACCENTS[accent];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.chip}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h3 className={`text-sm font-black ${a.title}`}>{title}</h3>
      </div>
      <p className="text-base font-bold leading-relaxed text-slate-700">{text}</p>
    </div>
  );
}

function ListCard({
  icon: Icon, title, items, accent, empty,
}: { icon: any; title: string; items: string[]; accent: keyof typeof ACCENTS; empty: string }) {
  const a = ACCENTS[accent];
  const bullet = (a as any).bullet || a.title;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.chip}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h3 className={`text-sm font-black ${a.title}`}>{title}</h3>
      </div>
      {items && items.length > 0 ? (
        <ul className="space-y-3.5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm font-medium leading-relaxed text-slate-700">
              <span className={`shrink-0 font-black ${bullet}`}>◆</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm font-bold text-slate-400">{empty}</p>
      )}
    </div>
  );
}
