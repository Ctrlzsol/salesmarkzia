import * as XLSX from "xlsx";
import { DashboardData, SaleRecord } from "../types";

export interface ExportContext {
  clientName: string;
  /** Human-readable active filters, e.g. ["الفرع: خلدا", "الشهر: مايو 2026"] */
  activeFilters: string[];
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// Mark a worksheet as right-to-left so Excel/LibreOffice render Arabic correctly.
function makeRTL(ws: XLSX.WorkSheet) {
  (ws as any)["!views"] = [{ RTL: true }];
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map(w => ({ wch: w }));
}

function buildSummarySheet(data: DashboardData, ctx: ExportContext): XLSX.WorkSheet {
  const { kpis, operational, monthComparison, quality } = data;
  const today = new Date().toLocaleDateString("en-GB");
  const filtersLine = ctx.activeFilters.length ? ctx.activeFilters.join("  |  ") : "كل البيانات (بدون تصفية)";

  const rows: (string | number)[][] = [
    ["تقرير تحليل المبيعات", ""],
    ["العميل", ctx.clientName],
    ["تاريخ التصدير", today],
    ["نطاق التقرير", filtersLine],
    ["", ""],
    ["المؤشر", "القيمة"],
    ["إجمالي الإيرادات (د.أ)", round2(kpis.totalSales)],
    ["عدد السجلات المحلَّلة", kpis.invoiceCount],
    ["عدد الأيام النشطة", kpis.activeDays],
    ["متوسط المبيعات اليومية (د.أ)", round2(kpis.avgDailySales)],
    ["أعلى قيمة سجل (د.أ)", round2(kpis.maxInvoice)],
    ["أدنى قيمة سجل (د.أ)", round2(kpis.minInvoice)],
    ["أفضل يوم", kpis.bestDay],
    ["أضعف يوم", kpis.worstDay],
    ["أفضل شهر", kpis.bestMonth],
    ["أضعف شهر", kpis.worstMonth],
    ["مبيعات الكاش (د.أ)", round2(kpis.cashSalesTotal)],
    ["المبيعات الإلكترونية (د.أ)", round2(kpis.electronicSalesTotal)],
    ["نسبة الدفع الرقمي", round2(kpis.digitalPaymentRatio * 100) + "٪"],
    ["مبيعات التطبيقات (د.أ)", round2(kpis.appSalesTotal)],
    ["نسبة الاعتماد على التطبيقات", round2(kpis.appDependencyRatio * 100) + "٪"],
    ["مبيعات تطبيق أشيائي (د.أ)", round2(kpis.ownAppSalesTotal)],
    ["تكلفة العمولات التقديرية (د.أ)", round2(kpis.estimatedCommissionCost)],
    ["مبيعات التوصيل (د.أ)", round2(kpis.deliverySalesTotal)],
    ["جودة البيانات (٪)", quality.score],
    ["", ""],
    ["المبيعات حسب الفرع", "القيمة (د.أ)", "الحصة"],
    ...operational.byBranch.map(b => [b.name, round2(b.value), round2(b.share * 100) + "٪"]),
    ["", ""],
    ["أعلى الأقسام", "القيمة (د.أ)", "الحصة"],
    ...operational.byDepartment.slice(0, 10).map(d => [d.name, round2(d.value), round2(d.share * 100) + "٪"]),
    ["", ""],
    ["وسائل الدفع", "القيمة (د.أ)", "الحصة"],
    ...operational.byPaymentMethod.map(p => [p.name, round2(p.value), round2(p.share * 100) + "٪"]),
  ];

  if (monthComparison.months.length >= 2) {
    rows.push(["", ""]);
    rows.push(["إجمالي النمو خلال الفترة", round2(monthComparison.totalGrowth * 100) + "٪"]);
    rows.push(["متوسط النمو الشهري", round2(monthComparison.avgMonthlyGrowth * 100) + "٪"]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColWidths(ws, [34, 22, 14]);
  makeRTL(ws);
  return ws;
}

function buildRecordsSheet(records: SaleRecord[]): XLSX.WorkSheet {
  const header = [
    "اليوم","التاريخ","الفرع","القسم","الكاشير","التصنيف",
    "فيزا","كاش","كلك","طلبات","كريم","أشيائي","كول سنتر","أخرى","الإجمالي",
  ];
  const rows = records.map(r => [
    r.dayAr || r.day,
    r.date ? r.date.slice(0, 10) : "",
    r.branchAr,
    r.deptAr,
    r.cashierAr,
    r.catAr,
    round2(r.visa), round2(r.cash), round2(r.klik), round2(r.orders),
    round2(r.cream), round2(r.ashyaei), round2(r.callcenter), round2(r.other),
    round2(r.total),
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  setColWidths(ws, [10, 12, 14, 18, 16, 12, 10, 10, 10, 10, 10, 10, 10, 10, 12]);
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: header.length - 1 } }) };
  makeRTL(ws);
  return ws;
}

function buildMonthlySheet(data: DashboardData): XLSX.WorkSheet {
  const { months, monthOverMonth } = data.monthComparison;
  const header = [
    "الشهر","الإجمالي (د.أ)","الأيام النشطة","متوسط اليوم (د.أ)",
    "الجاردنز","خلدا","أخرى","كاش","فيزا","كلك","توصيل",
  ];
  const rows = months.map(m => [
    m.monthLabel,
    round2(m.total),
    m.daysActive,
    round2(m.avgPerDay),
    round2(m.branchG), round2(m.branchK), round2(m.branchO),
    round2(m.cash), round2(m.visa), round2(m.klik), round2(m.delivery),
  ]);

  const aoa: (string | number)[][] = [header, ...rows];
  if (monthOverMonth.length > 0) {
    aoa.push([]);
    aoa.push(["مقارنة شهر بشهر", "", ""]);
    aoa.push(["من", "إلى", "التغير", "قيمة التغير (د.أ)"]);
    monthOverMonth.forEach(mom => {
      aoa.push([mom.from, mom.to, round2(mom.change * 100) + "٪", round2(mom.changeAmt)]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  setColWidths(ws, [16, 14, 12, 14, 12, 12, 12, 12, 12, 12, 12]);
  makeRTL(ws);
  return ws;
}

export function exportToExcel(data: DashboardData, records: SaleRecord[], ctx: ExportContext): void {
  const wb = XLSX.utils.book_new();
  (wb as any).Workbook = { Views: [{ RTL: true }] };

  XLSX.utils.book_append_sheet(wb, buildSummarySheet(data, ctx), "ملخص ومؤشرات");
  XLSX.utils.book_append_sheet(wb, buildRecordsSheet(records), "السجلات");
  XLSX.utils.book_append_sheet(wb, buildMonthlySheet(data), "المقارنة الشهرية");

  const safeName = (ctx.clientName || "تقرير").replace(/[\\/:*?"<>|]/g, "-").trim();
  const dateTag = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${safeName} - تقرير المبيعات - ${dateTag}.xlsx`);
}
