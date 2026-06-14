import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { DashboardData, SaleRecord } from "../types";
import { formatCurrency } from "./utils";

export interface PdfExportContext {
  clientName: string;
  logoUrl: string | null;
  /** Human-readable active filters, e.g. ["الفرع: خلدا", "الشهر: مايو 2026"] */
  activeFilters: string[];
}

const fmt = (n: number) => formatCurrency(n);
const pct = (n: number) => `${(n * 100).toFixed(1)}٪`;

// Escape for both text- and attribute-context: quotes are escaped too so a
// crafted value (e.g. a malicious logoUrl) cannot break out of an attribute.
function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Only allow image URLs the report can safely render; anything else (javascript:,
// blob:, malformed) is dropped so the logo falls back to the initial badge.
function safeImageUrl(url: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  return /^(https?:\/\/|data:image\/)/i.test(trimmed) ? trimmed : "";
}

function kpiCard(label: string, value: string, sub = ""): string {
  return `
    <div style="flex:1;min-width:150px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px;">
      <p style="margin:0;color:#64748b;font-size:12px;font-weight:700;">${esc(label)}</p>
      <p style="margin:6px 0 0;color:#0f172a;font-size:22px;font-weight:900;line-height:1;">${esc(value)}</p>
      ${sub ? `<p style="margin:6px 0 0;color:#94a3b8;font-size:11px;font-weight:700;">${esc(sub)}</p>` : ""}
    </div>`;
}

function barRow(name: string, value: number, max: number, color: string): string {
  const w = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return `
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">
        <span>${esc(name)}</span><span>${esc(fmt(value))}</span>
      </div>
      <div style="background:#eef2f7;border-radius:8px;height:10px;overflow:hidden;">
        <div style="width:${w}%;height:100%;background:${color};border-radius:8px;"></div>
      </div>
    </div>`;
}

function sectionTitle(t: string): string {
  return `<h2 style="margin:26px 0 12px;font-size:16px;font-weight:900;color:#0f172a;border-right:4px solid #2563eb;padding-right:10px;">${esc(t)}</h2>`;
}

function buildReportHtml(data: DashboardData, ctx: PdfExportContext): string {
  const { kpis, operational, monthComparison } = data;
  const today = new Date().toLocaleDateString("en-GB");
  const hasMoM = monthComparison.months.length >= 2;

  const branchMax = Math.max(...operational.byBranch.map(b => b.value), 1);
  const branchBars = operational.byBranch
    .map((b, i) => barRow(b.name, b.value, branchMax, ["#2563eb", "#0891b2", "#7c3aed", "#059669"][i % 4]))
    .join("");

  const deptMax = Math.max(...operational.byDepartment.map(d => d.value), 1);
  const deptBars = operational.byDepartment.slice(0, 8)
    .map(d => barRow(d.name, d.value, deptMax, "#059669"))
    .join("");

  const payRows = operational.byPaymentMethod
    .map(p => `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-weight:700;color:#334155;">${esc(p.name)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-weight:800;color:#0f172a;">${esc(fmt(p.value))}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;color:#64748b;font-weight:700;">${esc(pct(p.share))}</td>
      </tr>`).join("");

  const monthRows = monthComparison.months
    .map(m => `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-weight:700;color:#334155;">${esc(m.monthLabel)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-weight:800;color:#0f172a;">${esc(fmt(m.total))}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;color:#64748b;font-weight:700;">${m.daysActive}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;color:#64748b;font-weight:700;">${esc(fmt(m.avgPerDay))}</td>
      </tr>`).join("");

  const momRows = monthComparison.monthOverMonth
    .map(mom => {
      const up = mom.change >= 0;
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-weight:700;color:#334155;">${esc(mom.from)} ← ${esc(mom.to)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-weight:800;color:${up ? "#059669" : "#dc2626"};">${up ? "+" : ""}${(mom.change * 100).toFixed(1)}٪</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-weight:700;color:${up ? "#059669" : "#dc2626"};">${up ? "+" : ""}${esc(fmt(mom.changeAmt))}</td>
      </tr>`;
    }).join("");

  const filtersBadges = ctx.activeFilters.length
    ? ctx.activeFilters.map(f => `<span style="display:inline-block;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:999px;padding:4px 12px;font-size:11px;font-weight:700;margin-left:6px;">${esc(f)}</span>`).join("")
    : `<span style="display:inline-block;background:#f1f5f9;color:#64748b;border-radius:999px;padding:4px 12px;font-size:11px;font-weight:700;">كل البيانات</span>`;

  const logoUrl = safeImageUrl(ctx.logoUrl);
  const logoBlock = logoUrl
    ? `<img src="${esc(logoUrl)}" crossorigin="anonymous" style="width:56px;height:56px;border-radius:14px;object-fit:cover;background:#fff;" />`
    : `<div style="width:56px;height:56px;border-radius:14px;background:#2563eb;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:24px;">${esc((ctx.clientName || "م").charAt(0))}</div>`;

  return `
  <div style="width:794px;background:#f8fafc;padding:36px;box-sizing:border-box;font-family:'Tajawal',sans-serif;color:#0f172a;direction:rtl;text-align:right;">
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,#1d1e26,#0f1014);border-radius:18px;padding:22px;color:#fff;">
      ${logoBlock}
      <div style="flex:1;">
        <p style="margin:0;font-size:22px;font-weight:900;">${esc(ctx.clientName)}</p>
        <p style="margin:4px 0 0;font-size:12px;font-weight:700;color:#94a3b8;">تقرير تحليل المبيعات — المركزية للتحليل</p>
      </div>
      <div style="text-align:left;">
        <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:700;">تاريخ التصدير</p>
        <p style="margin:2px 0 0;font-size:14px;font-weight:900;">${today}</p>
      </div>
    </div>

    <!-- Filters -->
    <div style="margin-top:14px;">
      <span style="font-size:12px;font-weight:800;color:#475569;margin-left:8px;">نطاق التقرير:</span>
      ${filtersBadges}
    </div>

    ${sectionTitle("أهم المؤشرات")}
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      ${kpiCard("إجمالي الإيرادات", fmt(kpis.totalSales), "مجموع جميع وسائل الدفع")}
      ${kpiCard("عدد السجلات", kpis.invoiceCount.toLocaleString(), `${kpis.activeDays} يوم نشط`)}
      ${kpiCard("متوسط المبيعات اليومية", fmt(kpis.avgDailySales))}
      ${kpiCard("نسبة الدفع الرقمي", pct(kpis.digitalPaymentRatio))}
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px;">
      ${kpiCard("أفضل يوم", kpis.bestDay)}
      ${kpiCard("أفضل شهر", kpis.bestMonth)}
      ${kpiCard("مبيعات التطبيقات", fmt(kpis.appSalesTotal), `اعتماد ${pct(kpis.appDependencyRatio)}`)}
      ${kpiCard("عمولات تقديرية", fmt(kpis.estimatedCommissionCost))}
    </div>

    ${sectionTitle("المبيعات حسب الفرع")}
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">${branchBars}</div>

    ${sectionTitle("أعلى الأقسام")}
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">${deptBars}</div>

    ${sectionTitle("وسائل الدفع")}
    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;font-size:13px;">
      <thead><tr style="background:#f1f5f9;">
        <th style="padding:10px;text-align:right;font-weight:800;color:#475569;">الوسيلة</th>
        <th style="padding:10px;text-align:right;font-weight:800;color:#475569;">القيمة</th>
        <th style="padding:10px;text-align:right;font-weight:800;color:#475569;">الحصة</th>
      </tr></thead>
      <tbody>${payRows}</tbody>
    </table>

    ${sectionTitle("المقارنة الشهرية")}
    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;font-size:13px;">
      <thead><tr style="background:#f1f5f9;">
        <th style="padding:10px;text-align:right;font-weight:800;color:#475569;">الشهر</th>
        <th style="padding:10px;text-align:right;font-weight:800;color:#475569;">الإجمالي</th>
        <th style="padding:10px;text-align:right;font-weight:800;color:#475569;">الأيام</th>
        <th style="padding:10px;text-align:right;font-weight:800;color:#475569;">متوسط اليوم</th>
      </tr></thead>
      <tbody>${monthRows}</tbody>
    </table>
    ${hasMoM ? `
      <h3 style="margin:16px 0 10px;font-size:13px;font-weight:900;color:#334155;">التغير من شهر لآخر</h3>
      <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;font-size:13px;">
        <thead><tr style="background:#f1f5f9;">
          <th style="padding:10px;text-align:right;font-weight:800;color:#475569;">الفترة</th>
          <th style="padding:10px;text-align:right;font-weight:800;color:#475569;">نسبة التغير</th>
          <th style="padding:10px;text-align:right;font-weight:800;color:#475569;">قيمة التغير</th>
        </tr></thead>
        <tbody>${momRows}</tbody>
      </table>` : ""}

    <p style="margin-top:28px;text-align:center;font-size:10px;color:#94a3b8;font-weight:700;">
      تم إنشاء هذا التقرير آلياً بواسطة منصة المركزية للتحليل — ${today}
    </p>
  </div>`;
}

export async function exportToPdf(data: DashboardData, _records: SaleRecord[], ctx: PdfExportContext): Promise<void> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-10000px";
  container.style.zIndex = "-1";
  container.innerHTML = buildReportHtml(data, ctx);
  document.body.appendChild(container);

  try {
    // Give the browser a tick to apply the Tajawal webfont before capture.
    if ((document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }
    await new Promise(r => setTimeout(r, 60));

    const target = container.firstElementChild as HTMLElement;
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#f8fafc",
      logging: false,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let heightLeft = imgH;
    let position = 0;
    const imgData = canvas.toDataURL("image/png");

    pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
    heightLeft -= pageH;

    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;
    }

    const safeName = (ctx.clientName || "تقرير").replace(/[\\/:*?"<>|]/g, "-").trim();
    const dateTag = new Date().toISOString().slice(0, 10);
    pdf.save(`${safeName} - تقرير المبيعات - ${dateTag}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
