import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SaleRecord } from "../types";
import { X, Loader2, Save, Plus, Trash2, CheckCircle2, AlertTriangle, Table2, Info } from "lucide-react";
import * as XLSX from "xlsx";
import { analyzeWorkbook, type WorkbookPreview } from "../lib/parseWorkbook";
import { ImportPreview } from "./ImportPreview";

interface Props {
  clientName: string;
  saving?: boolean;
  onSubmit: (records: SaleRecord[]) => void | Promise<void>;
  onClose: () => void;
}

const DEFAULT_HEADERS = ["التاريخ", "الفرع", "كاش", "فيزا", "القسم"];

export function ManualEntry({ clientName, saving, onSubmit, onClose }: Props) {
  const [headers, setHeaders] = useState<string[]>(DEFAULT_HEADERS);
  const [rows, setRows] = useState<string[][]>(() => [
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
  ]);
  const [err, setErr] = useState<string | null>(null);

  // In-memory workbook states for the ImportPreview component
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);

  // Add Column
  const addColumn = () => {
    setHeaders(prev => [...prev, `عمود جديد ${prev.length + 1}`]);
    setRows(prev => prev.map(r => [...r, ""]));
    setErr(null);
  };

  // Remove Column
  const removeColumn = (colIdx: number) => {
    if (headers.length <= 1) {
      setErr("يجب أن يحتوي الجدول على عمود واحد على الأقل.");
      return;
    }
    setHeaders(prev => prev.filter((_, idx) => idx !== colIdx));
    setRows(prev => prev.map(r => r.filter((_, idx) => idx !== colIdx)));
    setErr(null);
  };

  // Update Header Name
  const updateHeader = (colIdx: number, val: string) => {
    setHeaders(prev => prev.map((h, idx) => (idx === colIdx ? val : h)));
    setErr(null);
  };

  // Add Row
  const addRow = () => {
    setRows(prev => [...prev, Array(headers.length).fill("")]);
    setErr(null);
  };

  // Remove Row
  const removeRow = (rowIdx: number) => {
    if (rows.length <= 1) {
      setErr("يجب أن يحتوي الجدول على صف واحد على الأقل.");
      return;
    }
    setRows(prev => prev.filter((_, idx) => idx !== rowIdx));
    setErr(null);
  };

  // Update Cell Value
  const updateCell = (rowIdx: number, colIdx: number, val: string) => {
    setRows(prev =>
      prev.map((r, rIdx) =>
        rIdx === rowIdx ? r.map((c, cIdx) => (cIdx === colIdx ? val : c)) : r
      )
    );
    setErr(null);
  };

  // Clear Grid
  const clearGrid = () => {
    if (window.confirm("هل أنت متأكد من تفريغ كافة البيانات؟")) {
      setHeaders(DEFAULT_HEADERS);
      setRows([
        ["", "", "", "", ""],
        ["", "", "", "", ""],
        ["", "", "", "", ""],
      ]);
      setErr(null);
    }
  };

  // Proceed to Preview
  const handleProceedToPreview = () => {
    setErr(null);

    // Clean headers and detect duplicates
    const cleanHeaders = headers.map(h => h.trim());
    if (cleanHeaders.some(h => !h)) {
      setErr("لا يمكن ترك اسم العمود فارغاً.");
      return;
    }
    const uniques = new Set(cleanHeaders);
    if (uniques.size !== cleanHeaders.length) {
      setErr("يوجد أسماء أعمدة مكررة، يرجى كتابة اسم فريد لكل عمود.");
      return;
    }

    // Check if there is any data
    const hasData = rows.some(r => r.some(c => c.trim() !== ""));
    if (!hasData) {
      setErr("الرجاء إدخال بيانات في صف واحد على الأقل قبل المتابعة.");
      return;
    }

    // Filter out completely empty rows
    const filledRows = rows.filter(r => r.some(c => c.trim() !== ""));

    try {
      // Create SheetJS Worksheet
      const dataAOA = [cleanHeaders, ...filledRows];
      const worksheet = XLSX.utils.aoa_to_sheet(dataAOA);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, worksheet, "إدخال يدوي");

      // Analyze the in-memory workbook
      const analysis = analyzeWorkbook(wb);

      if (analysis.sheets.length === 0 || analysis.sheets[0].rowCount === 0) {
        setErr("فشل في تحليل البيانات المدخلة. تأكد من صحة القيم.");
        return;
      }

      setWorkbook(wb);
      setPreview(analysis);
    } catch (e: any) {
      console.error(e);
      setErr("حدث خطأ أثناء معالجة الجدول: " + (e?.message || e));
    }
  };

  const cancelPreview = () => {
    setPreview(null);
    setWorkbook(null);
  };

  // Render ImportPreview overlay if workbook is analyzed
  if (preview && workbook) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50">
        <ImportPreview
          preview={preview}
          workbook={workbook}
          fileName="إدخال يدوي"
          saving={saving}
          savedMapping={null}
          onConfirm={(records) => {
            onSubmit(records);
          }}
          onCancel={cancelPreview}
        />
      </div>
    );
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      style={{ fontFamily: "'Tajawal', sans-serif" }}
      onClick={onClose}>
      
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.96 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        onClick={e => e.stopPropagation()}
        className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-150 px-6 py-5 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-inner">
              <Table2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">إدخال البيانات يدوياً (Excel Grid)</h2>
              <p className="text-xs font-bold text-slate-400">عميل: {clientName} • يمكنك تفصيل الأعمدة والصفوف وربطها بالمعاينة</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info Tip banner */}
        <div className="flex items-start gap-2.5 bg-blue-50/50 border-b border-blue-100 px-6 py-3">
          <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-blue-700 leading-relaxed">
            اكتب العناوين التي تريدها للأعمدة (مثال: التاريخ، كاش، فيزا، الفرع، القسم) واملأ السجلات. بعد ذلك، انقر على "معاينة واعتماد البيانات" لتحديد كيفية ربط كل عمود بالحقول البرمجية (مثل طرق الدفع أو الفروع).
          </p>
        </div>

        {/* Grid body */}
        <div className="flex-1 overflow-auto bg-slate-50/50 px-6 py-5">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-sm">
              <table className="min-w-full border-collapse text-right">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="w-12 border-l border-slate-200 px-3 py-3 text-center text-xs font-black text-slate-400">#</th>
                    {headers.map((h, colIdx) => (
                      <th key={colIdx} className="border-l border-slate-200 p-2 min-w-[140px] relative group">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={h}
                            onChange={e => updateHeader(colIdx, e.target.value)}
                            placeholder={`عمود ${colIdx + 1}`}
                            className="w-full bg-transparent font-black text-slate-800 text-xs outline-none border-b border-transparent focus:border-blue-500 pb-0.5 text-right font-sans"
                          />
                          <button
                            type="button"
                            onClick={() => removeColumn(colIdx)}
                            title="حذف العمود"
                            className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="w-16 p-2 text-center">
                      <button
                        type="button"
                        onClick={addColumn}
                        title="إضافة عمود جديد"
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-600 transition-colors hover:bg-blue-100">
                        <Plus className="h-3.5 w-3.5" />
                        عمود
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="border-l border-slate-200 px-3 py-2 text-center text-[11px] font-black text-slate-400 bg-slate-50/30">
                        {rowIdx + 1}
                      </td>
                      {row.map((cell, colIdx) => (
                        <td key={colIdx} className="border-l border-slate-200 p-1">
                          <input
                            type="text"
                            value={cell}
                            onChange={e => updateCell(rowIdx, colIdx, e.target.value)}
                            placeholder="—"
                            className="w-full rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none hover:bg-slate-100/50 focus:border-blue-300 focus:bg-blue-50/50 focus:text-slate-900 transition-all"
                          />
                        </td>
                      ))}
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(rowIdx)}
                          title="حذف الصف"
                          className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Row actions */}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow hover:bg-slate-800 transition-all">
                <Plus className="h-4 w-4" />
                إضافة صف جديد
              </button>
              <button
                type="button"
                onClick={clearGrid}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all">
                مسح الجدول
              </button>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="border-t border-slate-150 px-6 py-5 bg-gradient-to-r from-white to-slate-50">
          {err && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-xs font-bold">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
              <span>{err}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              حجم الجدول الحالي: {headers.length} أعمدة • {rows.length} صفوف
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition-all hover:bg-slate-100">
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleProceedToPreview}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-black text-white shadow-lg transition-all hover:bg-blue-500">
                <Save className="h-4 w-4" />
                معاينة واعتماد البيانات
              </button>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
