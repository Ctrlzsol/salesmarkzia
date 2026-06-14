import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { SaleRecord } from "../types";
import { X, Loader2, Save, PlusCircle, Trash2, Plus, Check } from "lucide-react";

interface Props {
  clientName: string;
  saving?: boolean;
  onSubmit: (records: SaleRecord[]) => void | Promise<void>;
  onClose: () => void;
}

const BRANCHES: { code: string; ar: string }[] = [
  { code: "G", ar: "الجاردنز" },
  { code: "K", ar: "خلدا" },
  { code: "O", ar: "اضاحي / أخرى" },
];
const CATS: { code: string; ar: string }[] = [
  { code: "R", ar: "صالة - حضوري" },
  { code: "A", ar: "تطبيقات توصيل" },
];
const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_AR: Record<string, string> = {
  Sun: "الأحد", Mon: "الاثنين", Tue: "الثلاثاء", Wed: "الأربعاء", Thu: "الخميس", Fri: "الجمعة", Sat: "السبت",
};

// The eight payment channels (بنود) — mirror of the parser's SaleRecord money
// fields. The client toggles which ones appear as columns in the grid.
const PAYMENTS: { key: string; label: string }[] = [
  { key: "cash", label: "كاش" },
  { key: "visa", label: "فيزا / بطاقة" },
  { key: "klik", label: "كلِك (CliQ)" },
  { key: "orders", label: "طلبات" },
  { key: "cream", label: "كريم" },
  { key: "ashyaei", label: "أشيائي" },
  { key: "callcenter", label: "كول سنتر" },
  { key: "other", label: "أخرى" },
];

interface GridRow {
  id: string;
  date: string;
  branch: string;
  cat: string;
  cashier: string;
  dept: string;
  amounts: Record<string, string>;
}

const num = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : Math.abs(n); };
const rowTotal = (r: GridRow) => PAYMENTS.reduce((s, p) => s + num(r.amounts[p.key] || ""), 0);

let rowCounter = 0;
const blankRow = (seed?: Partial<GridRow>): GridRow => ({
  id: `r${Date.now()}-${rowCounter++}`,
  date: seed?.date || new Date().toISOString().slice(0, 10),
  branch: seed?.branch || "G",
  cat: seed?.cat || "R",
  cashier: "",
  dept: "",
  amounts: {},
});

export function ManualEntry({ clientName, saving, onSubmit, onClose }: Props) {
  // Client chooses which بنود (channels) to use; default to the two most common.
  const [activeChannels, setActiveChannels] = useState<string[]>(["cash", "visa"]);
  const [rows, setRows] = useState<GridRow[]>(() => [blankRow(), blankRow(), blankRow()]);
  const [err, setErr] = useState<string | null>(null);

  const toggleChannel = (key: string) =>
    setActiveChannels(prev =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter(k => k !== key) : prev) : [...prev, key]
    );

  const updateRow = (id: string, patch: Partial<GridRow>) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));

  const updateAmount = (id: string, key: string, value: string) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, amounts: { ...r.amounts, [key]: value } } : r)));

  const addRow = () =>
    setRows(prev => {
      const last = prev[prev.length - 1];
      return [...prev, blankRow(last ? { date: last.date, branch: last.branch, cat: last.cat } : undefined)];
    });

  const removeRow = (id: string) =>
    setRows(prev => (prev.length > 1 ? prev.filter(r => r.id !== id) : prev));

  const orderedChannels = useMemo(
    () => PAYMENTS.filter(p => activeChannels.includes(p.key)),
    [activeChannels]
  );

  const grandTotal = useMemo(() => rows.reduce((s, r) => s + rowTotal(r), 0), [rows]);
  const filledCount = useMemo(() => rows.filter(r => rowTotal(r) > 0).length, [rows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    const usable = rows.filter(r => rowTotal(r) > 0);
    if (usable.length === 0) {
      setErr("أدخل قيمة واحدة على الأقل من البنود في صف واحد على الأقل.");
      return;
    }
    if (usable.some(r => !r.date)) {
      setErr("التاريخ مطلوب في كل صف يحتوي على قيم.");
      return;
    }

    const records: SaleRecord[] = usable.map((r, i) => {
      // Anchor at LOCAL noon so the calendar day never drifts across timezones
      // (the same invariant the Excel parser enforces).
      const [y, m, d] = r.date.split("-").map(Number);
      const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
      const dayKey = DAYS_EN[dt.getDay()];
      const branchAr = BRANCHES.find(b => b.code === r.branch)?.ar ?? r.branch;
      const catAr = CATS.find(c => c.code === r.cat)?.ar ?? "صالة";
      const cashierName = r.cashier.trim() || "عام";
      const deptName = r.dept.trim() || "عام";
      return {
        id: `manual-${Date.now()}-${i}`,
        day: dayKey,
        dayAr: DAY_AR[dayKey] ?? dayKey,
        cat: r.cat, catAr,
        date: dt.toISOString(),
        branch: r.branch, branchAr,
        cashier: cashierName, cashierAr: cashierName,
        dept: deptName, deptAr: deptName,
        visa: num(r.amounts.visa || ""),
        cash: num(r.amounts.cash || ""),
        klik: num(r.amounts.klik || ""),
        orders: num(r.amounts.orders || ""),
        cream: num(r.amounts.cream || ""),
        ashyaei: num(r.amounts.ashyaei || ""),
        callcenter: num(r.amounts.callcenter || ""),
        other: num(r.amounts.other || ""),
        total: rowTotal(r),
        sheetName: "إدخال يدوي",
      };
    });
    await onSubmit(records);
  };

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 outline-none transition-all focus:border-blue-400";

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      style={{ fontFamily: "'Tajawal', sans-serif" }}
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <PlusCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">إدخال يدوي — جدول كشف</h2>
              <p className="text-xs font-bold text-slate-400">{clientName} · كل الصفوف تُحفظ ككشف واحد</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Channel (بنود) toggles */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <p className="mb-2 text-[11px] font-black text-slate-500">اختر البنود التي تريد إدخالها (يمكنك إظهار أو إخفاء أي عمود):</p>
          <div className="flex flex-wrap gap-2">
            {PAYMENTS.map(p => {
              const on = activeChannels.includes(p.key);
              return (
                <button key={p.key} type="button" onClick={() => toggleChannel(p.key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all
                    ${on ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500 hover:border-blue-300"}`}>
                  {on ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto px-5 py-4">
            <table className="w-full border-separate border-spacing-0 text-right">
              <thead>
                <tr className="text-[11px] font-black text-slate-500">
                  <Th className="w-8">#</Th>
                  <Th>التاريخ</Th>
                  <Th>الفرع</Th>
                  <Th>نوع الطلب</Th>
                  <Th>الكاشير</Th>
                  <Th>القسم</Th>
                  {orderedChannels.map(c => <Th key={c.key}>{c.label}</Th>)}
                  <Th>الإجمالي</Th>
                  <Th className="w-10"></Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id} className="group">
                    <Td className="text-center text-[11px] font-black text-slate-400">{idx + 1}</Td>
                    <Td>
                      <input type="date" value={r.date} onChange={e => updateRow(r.id, { date: e.target.value })}
                        className={inputCls} />
                    </Td>
                    <Td>
                      <select value={r.branch} onChange={e => updateRow(r.id, { branch: e.target.value })} className={inputCls}>
                        {BRANCHES.map(b => <option key={b.code} value={b.code}>{b.ar}</option>)}
                      </select>
                    </Td>
                    <Td>
                      <select value={r.cat} onChange={e => updateRow(r.id, { cat: e.target.value })} className={inputCls}>
                        {CATS.map(c => <option key={c.code} value={c.code}>{c.ar}</option>)}
                      </select>
                    </Td>
                    <Td>
                      <input value={r.cashier} onChange={e => updateRow(r.id, { cashier: e.target.value })}
                        placeholder="عام" className={inputCls} />
                    </Td>
                    <Td>
                      <input value={r.dept} onChange={e => updateRow(r.id, { dept: e.target.value })}
                        placeholder="عام" className={inputCls} />
                    </Td>
                    {orderedChannels.map(c => (
                      <Td key={c.key}>
                        <input type="number" inputMode="decimal" min="0" step="0.01"
                          value={r.amounts[c.key] ?? ""} onChange={e => updateAmount(r.id, c.key, e.target.value)}
                          placeholder="0" className={`${inputCls} text-left`} />
                      </Td>
                    ))}
                    <Td className="whitespace-nowrap text-left text-xs font-black text-blue-700">
                      {rowTotal(r).toLocaleString()}
                    </Td>
                    <Td className="text-center">
                      <button type="button" onClick={() => removeRow(r.id)} title="حذف الصف"
                        className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button type="button" onClick={addRow}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-500 transition-all hover:border-blue-400 hover:text-blue-600">
              <Plus className="h-3.5 w-3.5" />
              إضافة صف
            </button>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 p-5">
            {err && <p className="mb-3 text-xs font-bold text-red-600">{err}</p>}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5">
                <span className="text-xs font-bold text-blue-700">إجمالي الكشف ({filledCount} صف):</span>
                <span className="text-lg font-black text-blue-800">{grandTotal.toLocaleString()} د.أ</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={onClose}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50">
                  إلغاء
                </button>
                <button type="submit" disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:bg-blue-500 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  حفظ الكشف
                </button>
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-2 py-2 text-right ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`border-b border-slate-100 px-1.5 py-1.5 align-middle ${className}`}>{children}</td>;
}
