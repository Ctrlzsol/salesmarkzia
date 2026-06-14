import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { motion } from "motion/react";
import { SaleRecord } from "../types";
import {
  WorkbookPreview, PreviewSheet, ColKey, ColumnMapping, normHeader,
  FIELD_LABELS, FIELD_ORDER, MONTHS_AR, extractRecords,
} from "../lib/parseWorkbook";
import {
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Table2,
  Layers, CalendarDays, Building2, Loader2, ArrowRight, Database, Info, Wand2,
} from "lucide-react";

interface Props {
  preview: WorkbookPreview;
  workbook: XLSX.WorkBook;
  fileName?: string;
  saving?: boolean;
  // Last-confirmed mapping for this client; pre-applied over auto-detection.
  savedMapping?: ColumnMapping | null;
  onConfirm: (records: SaleRecord[], mapping: ColumnMapping) => void;
  onCancel: () => void;
}

// Pre-apply a saved { normalizedHeader: field } mapping over the auto-detected
// columns. A saved assignment is authoritative; where it collides with an
// auto-detected column on the same field, the auto-detected one is cleared so a
// field still maps to at most one column per sheet.
function applySavedMapping(sheets: PreviewSheet[], saved?: ColumnMapping | null): PreviewSheet[] {
  if (!saved || Object.keys(saved).length === 0) return sheets;
  return sheets.map(sheet => {
    let columns = sheet.columns.map(c =>
      normHeader(c.header) in saved ? { ...c, field: saved[normHeader(c.header)] } : c
    );
    const overridden = new Set(
      columns.filter(c => normHeader(c.header) in saved && c.field).map(c => c.field)
    );
    columns = columns.map(c =>
      !(normHeader(c.header) in saved) && c.field && overridden.has(c.field)
        ? { ...c, field: null }
        : c
    );
    return { ...sheet, columns };
  });
}

// Capture the current confirmed mapping (normalized header → field) from the
// included sheets so it can be persisted for the next import.
function buildMapping(sheets: PreviewSheet[]): ColumnMapping {
  const map: ColumnMapping = {};
  for (const sheet of sheets) {
    if (!sheet.included) continue;
    for (const col of sheet.columns) {
      const key = normHeader(col.header);
      if (col.field && key) map[key] = col.field;
    }
  }
  return map;
}

const CONF_STYLE: Record<string, { label: string; cls: string }> = {
  high:   { label: "ثقة عالية",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  medium: { label: "ثقة متوسطة", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  low:    { label: "ثقة منخفضة", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

export function ImportPreview({ preview, workbook, fileName, saving, savedMapping, onConfirm, onCancel }: Props) {
  const hasSavedMapping = !!savedMapping && Object.keys(savedMapping).length > 0;
  const [sheets, setSheets] = useState<PreviewSheet[]>(() =>
    applySavedMapping(
      preview.sheets.map(s => ({ ...s, columns: s.columns.map(c => ({ ...c })) })),
      savedMapping
    )
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    preview.sheets.forEach((s, i) => { init[s.name] = i === 0 || !s.included; });
    return init;
  });

  // Live summary recomputed from the (possibly edited) mapping.
  const result = useMemo(() => extractRecords(workbook, sheets), [workbook, sheets]);

  const toggleInclude = (name: string) =>
    setSheets(prev => prev.map(s => s.name === name ? { ...s, included: !s.included } : s));

  // Assign a field to a column. A field maps to at most ONE column per sheet, so
  // assigning it here clears it from any sibling column that previously held it.
  const setColField = (sheetName: string, colIndex: number, field: ColKey | null) => {
    setSheets(prev => prev.map(s => {
      if (s.name !== sheetName) return s;
      const columns = s.columns.map(c => {
        if (c.index === colIndex) return { ...c, field };
        if (field && c.field === field) return { ...c, field: null };
        return c;
      });
      return { ...s, columns };
    }));
  };

  const includedCount = sheets.filter(s => s.included).length;
  const canConfirm = result.records.length > 0 && !saving;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8 lg:px-8"
      style={{ fontFamily: "'Tajawal', sans-serif" }}>
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">
              <Table2 className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-bold text-blue-700">معاينة وربط الأعمدة قبل الاعتماد</span>
            </div>
            <h1 className="mt-3 text-2xl font-black text-slate-900">مراجعة استيراد البيانات</h1>
            {fileName && <p className="mt-1 text-sm font-bold text-slate-400" dir="ltr">{fileName}</p>}
            {hasSavedMapping && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                <Wand2 className="h-3 w-3" />
                تم تطبيق ربط الأعمدة المحفوظ — يمكنك تعديله
              </span>
            )}
          </div>
          <button onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50">
            <ArrowRight className="h-3.5 w-3.5" />
            رجوع
          </button>
        </div>

        {/* Summary */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard icon={Database}     label="إجمالي السجلات" value={result.records.length.toLocaleString()} color="text-blue-700" />
          <SummaryCard icon={Layers}       label="أوراق مختارة"   value={`${includedCount} / ${sheets.length}`} color="text-violet-700" />
          <SummaryCard icon={CalendarDays} label="الأشهر"         value={result.months.length.toString()} color="text-emerald-700" />
          <SummaryCard icon={Building2}    label="الفروع"          value={result.branches.length.toString()} color="text-amber-700" />
        </div>

        {result.months.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-1.5">
            {result.months.map(m => {
              const [yr, mn] = m.split("-");
              return (
                <span key={m} className="rounded-lg border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                  {MONTHS_AR[parseInt(mn) - 1]} {yr}
                </span>
              );
            })}
          </div>
        )}

        {/* Sheets */}
        <div className="space-y-4">
          {sheets.map(sheet => {
            const isOpen = expanded[sheet.name];
            return (
              <div key={sheet.name}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${sheet.included ? "border-slate-200" : "border-slate-200 opacity-80"}`}>

                {/* Sheet header */}
                <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={sheet.included}
                      onChange={() => toggleInclude(sheet.name)}
                      className="h-4 w-4 cursor-pointer accent-blue-600" />
                  </label>
                  <button onClick={() => setExpanded(p => ({ ...p, [sheet.name]: !p[sheet.name] }))}
                    className="flex min-w-0 flex-1 items-center gap-3 text-right">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <Table2 className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">{sheet.name}</p>
                      <p className="text-xs font-bold text-slate-400">
                        {sheet.rowCount.toLocaleString()} سجل • رأس في صف {sheet.headerRow + 1}
                        {sheet.inferredMonth && ` • ${MONTHS_AR[parseInt(sheet.inferredMonth.split("-")[1]) - 1]} ${sheet.inferredMonth.split("-")[0]}`}
                      </p>
                    </div>
                    {sheet.included
                      ? <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> سيُستورد</span>
                      : <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">مُستبعد</span>}
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </button>
                </div>

                {/* Auto-exclusion reason */}
                {!sheet.included && sheet.reason && (
                  <div className="flex items-start gap-2 bg-slate-50 px-4 py-2.5">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                    <p className="text-xs font-bold text-slate-500">{sheet.reason} — يمكنك تضمينها يدوياً.</p>
                  </div>
                )}

                {/* Warnings */}
                {sheet.included && sheet.warnings.length > 0 && (
                  <div className="space-y-1.5 bg-amber-50/50 px-4 py-2.5">
                    {sheet.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                        <p className="text-xs font-bold text-amber-700">{w}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Column mapping table */}
                {isOpen && (
                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="text-[11px] font-bold text-slate-400">
                          <th className="px-2 py-2">العمود في الملف</th>
                          <th className="px-2 py-2">عيّنة من القيم</th>
                          <th className="px-2 py-2">الحقل المرتبط</th>
                          <th className="px-2 py-2">الثقة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sheet.columns.map(col => (
                          <tr key={col.index} className="border-t border-slate-100">
                            <td className="px-2 py-2 align-top">
                              <p className="font-black text-slate-800">{col.header}</p>
                            </td>
                            <td className="px-2 py-2 align-top">
                              <div className="flex flex-wrap gap-1">
                                {col.samples.length === 0
                                  ? <span className="text-slate-300">—</span>
                                  : col.samples.map((s, i) => (
                                    <span key={i} className="max-w-[120px] truncate rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{s}</span>
                                  ))}
                              </div>
                            </td>
                            <td className="px-2 py-2 align-top">
                              <select
                                value={col.field ?? ""}
                                onChange={e => setColField(sheet.name, col.index, (e.target.value || null) as ColKey | null)}
                                className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold outline-none transition-all
                                  ${col.field ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-400"}`}>
                                <option value="">— تجاهل —</option>
                                {FIELD_ORDER.map(f => (
                                  <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-2 align-top">
                              {col.field
                                ? <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${CONF_STYLE[col.confidence].cls}`}>{CONF_STYLE[col.confidence].label}</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Confirm bar */}
        <div className="sticky bottom-4 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
          <div className="text-sm">
            {result.records.length > 0
              ? <p className="font-bold text-slate-600">سيتم حفظ <span className="font-black text-blue-700">{result.records.length.toLocaleString()}</span> سجل من <span className="font-black text-slate-800">{includedCount}</span> ورقة.</p>
              : <p className="font-bold text-red-600">لا توجد سجلات صالحة للحفظ — راجع ربط الأعمدة.</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onCancel}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50">
              إلغاء
            </button>
            <button onClick={() => onConfirm(result.records, buildMapping(sheets))} disabled={!canConfirm}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:bg-blue-500 disabled:opacity-40">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              اعتماد وحفظ البيانات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-slate-300" />
        <p className="text-[10px] font-bold text-slate-400">{label}</p>
      </div>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </motion.div>
  );
}
