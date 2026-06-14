import React from "react";
import { Layers, Calendar, Trash2, FileText, CheckCircle2, BarChart2, CalendarDays, Clock, ShieldAlert } from "lucide-react";
import { formatCurrency } from "../lib/utils";

interface BatchInfo {
  id: number;
  filename: string | null;
  uploadedAt: string;
  rowCount: number;
  firstDay: string | null;
  lastDay: string | null;
}

interface BatchesTabProps {
  batches: BatchInfo[];
  filterBatch: string;
  setFilterBatch: (v: string) => void;
  isAdmin?: boolean;
  onDeleteBatch?: (id: number) => Promise<void> | void;
}

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function formatBatchPeriod(first: string | null, last: string | null): string {
  if (!first || !last) return "غير محدد";
  const [ay, am] = first.split("-");
  const [by, bm] = last.split("-");
  const a = MONTHS_AR[parseInt(am, 10) - 1] || am;
  const b = MONTHS_AR[parseInt(bm, 10) - 1] || bm;
  if (ay === by && am === bm) return `${a} ${ay}`;
  if (ay === by) return `${a} – ${b} ${ay}`;
  return `${a} ${ay} – ${b} ${by}`;
}

export function BatchesTab({ batches, filterBatch, setFilterBatch, isAdmin = false, onDeleteBatch }: BatchesTabProps) {
  const isAllSelected = !filterBatch;
  const totalRecords = batches.reduce((sum, b) => sum + b.rowCount, 0);

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Overview stats header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 flex-shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400">إجمالي الكشوف المرفوعة</p>
            <p className="text-xl font-black text-slate-800">{batches.length} كشوف</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400">إجمالي السجلات المبيعية</p>
            <p className="text-xl font-black text-slate-800">{totalRecords.toLocaleString()} سجل</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400">التحليل النشط حالياً</p>
            <p className="text-sm font-black text-emerald-700 truncate">
              {isAllSelected ? "جميع الكشوف مدمجة" : `كشف فردي نشط (#${filterBatch})`}
            </p>
          </div>
        </div>
      </div>

      {/* Control Banner */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-blue-900">التحكم في نطاق التحليلات</h3>
          <p className="text-xs text-blue-600 font-bold mt-1">
            يمكنك تصفية التحليلات والرسوم البيانية لعرض كشف محدد فقط، أو دمج كل الكشوف معاً لتحليل شامل.
          </p>
        </div>
        <button
          onClick={() => setFilterBatch("")}
          disabled={isAllSelected}
          className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all
            ${isAllSelected 
              ? "bg-emerald-600 text-white cursor-default" 
              : "bg-blue-600 hover:bg-blue-500 text-white hover:-translate-y-0.5"}`}>
          <BarChart2 className="w-4 h-4" />
          {isAllSelected ? "جميع الكشوف مدمجة ونشطة" : "تحليل جميع الكشوف معاً"}
        </button>
      </div>

      {/* Batches Grid */}
      <div className="space-y-3">
        <h3 className="text-slate-800 font-black text-sm px-1">سجل الملفات والكشوف المرفوعة</h3>
        {batches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm font-bold text-slate-400">
            لا يوجد أي كشوف مرفوعة بعد.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {batches.map(b => {
              const isActive = filterBatch === String(b.id);
              const showAsActive = isActive || isAllSelected;

              return (
                <div
                  key={b.id}
                  className={`group rounded-2xl border bg-white p-5 transition-all duration-300 flex flex-col justify-between gap-4 relative overflow-hidden
                    ${isActive 
                      ? "border-emerald-500 ring-2 ring-emerald-100 shadow-md" 
                      : "border-slate-200 hover:border-slate-350 hover:shadow-md"}`}>
                  
                  {/* Status Indicator Bar */}
                  <div className={`absolute top-0 right-0 left-0 h-1.5 transition-colors
                    ${isActive ? "bg-emerald-500" : (isAllSelected ? "bg-blue-500" : "bg-transparent")}`} />

                  {/* Top: Name & delete */}
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="min-w-0">
                      <p className="text-slate-800 font-black text-sm truncate" title={b.filename || "إدخال يدوي"}>
                        {b.filename || "إدخال يدوي"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1" dir="ltr">
                        Batch ID: #{b.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isActive && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> نشط حالياً
                        </span>
                      )}
                      
                      {isAdmin && onDeleteBatch && (
                        <button
                          type="button"
                          onClick={() => onDeleteBatch(b.id)}
                          title="حذف الكشف"
                          className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Middle details */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3.5 text-xs">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 mb-1">الفترة الزمنية للبيانات</span>
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{formatBatchPeriod(b.firstDay, b.lastDay)}</span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 mb-1">عدد السجلات المستوردة</span>
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{b.rowCount.toLocaleString()} سجل</span>
                      </div>
                    </div>

                    <div className="col-span-2 border-t border-slate-200/60 pt-2.5 mt-1">
                      <span className="block text-[10px] font-bold text-slate-400 mb-1">تاريخ ووقت الرفع</span>
                      <div className="flex items-center gap-1.5 font-bold text-slate-650">
                        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{new Date(b.uploadedAt).toLocaleString("ar-JO", { hour12: true })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Action trigger */}
                  <div className="flex justify-end pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setFilterBatch(isActive ? "" : String(b.id))}
                      className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all
                        ${isActive 
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-750" 
                          : "bg-blue-50 hover:bg-blue-100 text-blue-700"}`}>
                      {isActive ? "إلغاء التصفية الفردية" : "تحليل هذا الكشف فقط دون غيره"}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
