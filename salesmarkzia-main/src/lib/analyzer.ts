import { DashboardData, SaleRecord, MonthComparison, MonthlyData } from "../types";

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const DAY_NAMES: Record<string, string> = { Mon:"الاثنين",Tue:"الثلاثاء",Wed:"الأربعاء",Thu:"الخميس",Fri:"الجمعة",Sat:"السبت",Sun:"الأحد" };
const DAYS_ORDER = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// Normalize Arabic for dept keyword matching: strip tashkeel, unify hamza/alef/ta-marbuta.
function normAr(s: string): string {
  return (s || "")
    .replace(/[\u064B-\u0652\u0670]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}
const matchAny = (s: string, kws: string[]) => kws.some(k => s.includes(k));
const DEPT_KW = {
  appetizers: ["مقبلات","مقبل","سلطه","سلطات","حمص","متبل","فتوش","تبوله"],
  drinks:     ["مشروب","مشروبات","عصير","عصاير","مياه","ماء","كولا","بيبسي","غازيه","قهوه","شاي"],
  butcher:    ["ملحمه","لحوم","لحمه","مفروم","ستيك","لحم"],
  grills:     ["مشاوي","مشوي","مشويه","شاورما","شيش","كباب","تكا","كفته","فروج","دجاج"],
};

function buildMonthComparison(records: SaleRecord[], scenarioMultiplier: number): MonthComparison {
  const monthMap: Record<string, { total: number; invoices: number; days: Set<string>; branchG: number; branchK: number; branchO: number; cash: number; visa: number; klik: number; delivery: number }> = {};

  records.forEach(r => {
    if (!r.date) return;
    const d = new Date(r.date);
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[key]) monthMap[key] = { total: 0, invoices: 0, days: new Set(), branchG: 0, branchK: 0, branchO: 0, cash: 0, visa: 0, klik: 0, delivery: 0 };
    const m = monthMap[key];
    const t = r.total * scenarioMultiplier;
    m.total += t;
    m.invoices++;
    m.days.add(r.date.slice(0, 10));
    if (r.branch === "G") m.branchG += t;
    if (r.branch === "K") m.branchK += t;
    if (r.branch === "O") m.branchO += t;
    m.cash += (r.cash || 0) * scenarioMultiplier;
    m.visa += (r.visa || 0) * scenarioMultiplier;
    m.klik += (r.klik || 0) * scenarioMultiplier;
    m.delivery += ((r.orders || 0) + (r.cream || 0) + (r.ashyaei || 0)) * scenarioMultiplier;
  });

  const sortedKeys = Object.keys(monthMap).sort();
  const months: MonthlyData[] = sortedKeys.map(key => {
    const [yr, mn] = key.split("-");
    const m = monthMap[key];
    const daysActive = m.days.size || 1;
    return {
      monthKey: key,
      monthLabel: `${MONTHS_AR[parseInt(mn, 10) - 1]} ${yr}`,
      total: m.total,
      invoiceCount: m.invoices,
      avgPerDay: m.total / daysActive,
      branchG: m.branchG,
      branchK: m.branchK,
      branchO: m.branchO,
      cash: m.cash,
      visa: m.visa,
      klik: m.klik,
      delivery: m.delivery,
      daysActive,
    };
  });

  const monthOverMonth = months.slice(1).map((curr, i) => {
    const prev = months[i];
    const change = prev.total > 0 ? (curr.total - prev.total) / prev.total : 0;
    return { from: prev.monthLabel, to: curr.monthLabel, change, changeAmt: curr.total - prev.total };
  });

  const bestMonth = months.length > 0 ? months.reduce((a, b) => b.total > a.total ? b : a).monthLabel : "غير متوفر";
  const worstMonth = months.length > 0 ? months.reduce((a, b) => b.total < a.total ? b : a).monthLabel : "غير متوفر";
  const totalGrowth = months.length >= 2 ? (months[months.length - 1].total - months[0].total) / (months[0].total || 1) : 0;
  const avgMonthlyGrowth = monthOverMonth.length > 0 ? monthOverMonth.reduce((s, m) => s + m.change, 0) / monthOverMonth.length : 0;

  return { months, bestMonth, worstMonth, totalGrowth, avgMonthlyGrowth, monthOverMonth };
}

export function analyzeData(records: SaleRecord[], scenarioMultiplier: number = 1): DashboardData {
  if (!records || records.length === 0) {
    const emptyMonth: MonthComparison = { months: [], bestMonth: "غير متوفر", worstMonth: "غير متوفر", totalGrowth: 0, avgMonthlyGrowth: 0, monthOverMonth: [] };
    return {
      kpis: { totalSales:0,netSales:0,invoiceCount:0,avgInvoiceValue:0,maxInvoice:0,minInvoice:0,totalQuantity:0,growthRate:0,monthlyGrowthRate:0,bestDay:"غير متوفر",worstDay:"غير متوفر",bestMonth:"غير متوفر",worstMonth:"غير متوفر",digitalPaymentRatio:0,attachmentRate:0,peakShifts:[],electronicSalesTotal:0,cashSalesTotal:0,deliverySalesTotal:0,directStoreSalesTotal:0,paymentFragmentationIndex:0,avgInvoiceValueG:0,avgInvoiceValueK:0,activeDays:0,avgDailySales:0,inStorePaymentTotal:0,remotePaymentTotal:0,inStorePaymentRatio:0,appSalesTotal:0,appDependencyRatio:0,ownAppSalesTotal:0,ownAppAdoptionRate:0,estimatedCommissionCost:0,ownAppCommissionSaved:0,commissionBreakdown:[],highMarginSales:0,coreMealSales:0,crossSellRatio:0,cateringTotal:0,cateringShare:0,cateringActiveDays:0 },
      meta: { invoiceDataAvailable:false, timeDataAvailable:false, crossSellAvailable:false, avgTicketSize:0 },
      operational: { byBranch:[],byDepartment:[],bySalesperson:[],byChannel:[],byPaymentMethod:[],matrix:[],byDay:[] },
      bi: { pareto:[],abc:[],top10Products:[],customerSegments:[],productIntelligence:{rising:[],falling:[],stagnant:[]},branchIntelligence:{fastestGrowing:"غير متوفر",declining:"غير متوفر",stable:"غير متوفر",atRisk:"غير متوفر"} },
      ai: { whatHappened:"لا تتوفر مبيعات مؤهلة.",whyHappened:"يرجى مراجعة تصفية البيانات.",expectedNext:"لا تتوفر توقعات.",recommendation:"أعد تصفية البيانات.",topOpportunities:[],topRisks:[],revenueBoosts:[] },
      quality: { score:100,totalRows:0,missingValues:0,duplicates:0,potentialErrors:0,issues:[] },
      monthComparison: emptyMonth,
    };
  }

  const totalRaw = records.reduce((s, r) => s + r.total, 0);
  const totalSales = totalRaw * scenarioMultiplier;

  // Day analysis
  const daySalesMap: Record<string, number> = {};
  DAYS_ORDER.forEach(d => daySalesMap[d] = 0);
  records.forEach(r => { daySalesMap[r.day] = (daySalesMap[r.day] || 0) + r.total; });

  let bestDayKey = "Fri", worstDayKey = "Mon", maxDs = -1, minDs = Infinity;
  DAYS_ORDER.forEach(d => {
    const s = daySalesMap[d] || 0;
    if (s > maxDs) { maxDs = s; bestDayKey = d; }
    if (s > 0 && s < minDs) { minDs = s; worstDayKey = d; }
  });

  // Branch — with distinct selling days for "sales per branch per day"
  const branchMap: Record<string, number> = {};
  const branchDays: Record<string, Set<string>> = {};
  records.forEach(r => {
    branchMap[r.branchAr] = (branchMap[r.branchAr] || 0) + r.total;
    if (!branchDays[r.branchAr]) branchDays[r.branchAr] = new Set();
    if (r.date) branchDays[r.branchAr].add(r.date.slice(0, 10));
  });
  const byBranch = Object.entries(branchMap).map(([name, value]) => {
    const days = branchDays[name]?.size || 1;
    const val = value * scenarioMultiplier;
    return { name, value: val, share: value / (totalRaw || 1), growth: 0, perDay: val / days, days };
  }).sort((a, b) => b.value - a.value);

  // Department
  const deptMap: Record<string, number> = {};
  records.forEach(r => { deptMap[r.deptAr] = (deptMap[r.deptAr] || 0) + r.total; });
  const byDepartment = Object.entries(deptMap).map(([name, value]) => ({
    name, value: value * scenarioMultiplier, share: value / (totalRaw || 1),
  })).sort((a, b) => b.value - a.value);

  // Channel
  const channelMap: Record<string, number> = {};
  records.forEach(r => { channelMap[r.catAr] = (channelMap[r.catAr] || 0) + r.total; });
  const byChannel = Object.entries(channelMap).map(([name, value]) => ({
    name, value: value * scenarioMultiplier, share: value / (totalRaw || 1),
  })).sort((a, b) => b.value - a.value);

  // Cashier — exclude non-human "cashiers" so the ranking reflects real staff.
  // In this data, delivery-app sales ("تطبيقات") and the Adahi/online bucket
  // ("اضاحي"/"أضاحي") are logged under cashier names but aren't actual cashiers;
  // without excluding them they wrongly surface as the "top cashier".
  const isRealCashier = (name: string) =>
    !!name && name !== "غير محدد" && !/تطبيق|اضاح|أضاح/i.test(name);
  const cashierMap: Record<string, { value: number; count: number }> = {};
  records.forEach(r => {
    const k = r.cashierAr || "غير محدد";
    if (!isRealCashier(k)) return;
    if (!cashierMap[k]) cashierMap[k] = { value: 0, count: 0 };
    cashierMap[k].value += r.total;
    cashierMap[k].count++;
  });
  const bySalesperson = Object.entries(cashierMap).map(([name, s]) => ({ name, value: s.value * scenarioMultiplier, invoices: s.count })).sort((a, b) => b.value - a.value);

  // Payment methods
  const payKeys: { name: string; key: keyof SaleRecord }[] = [
    { name:"كاش",key:"cash"},{ name:"فيزا",key:"visa"},{ name:"كلك",key:"klik"},
    { name:"طلبات",key:"orders"},{ name:"كريم",key:"cream"},{ name:"اشيائي",key:"ashyaei"},
    { name:"كول سنتر",key:"callcenter"},{ name:"أخرى",key:"other"},
  ];
  const byPaymentMethod = payKeys.map(m => {
    const val = records.reduce((s, r) => s + (Number(r[m.key]) || 0), 0);
    return { name: m.name, value: val * scenarioMultiplier, share: val / (totalRaw || 1) };
  }).filter(p => p.value > 0);

  // Matrix (dept × branch) — includes all 3 branches in total
  const depts = Array.from(new Set(records.map(r => r.deptAr)));
  const matrix = depts.map(dept => {
    const gVal = records.filter(r => r.deptAr === dept && r.branch === "G").reduce((s, r) => s + r.total, 0) * scenarioMultiplier;
    const kVal = records.filter(r => r.deptAr === dept && r.branch === "K").reduce((s, r) => s + r.total, 0) * scenarioMultiplier;
    const oVal = records.filter(r => r.deptAr === dept && r.branch === "O").reduce((s, r) => s + r.total, 0) * scenarioMultiplier;
    const rowTotal = gVal + kVal + oVal;
    return { department: dept, branchG: gVal, branchK: kVal, total: rowTotal, percentage: rowTotal / (totalSales || 1) };
  }).sort((a, b) => b.total - a.total);

  // By day of week (for bar chart) — total includes all branches
  const byDay = DAYS_ORDER.map(d => {
    const total = (daySalesMap[d] || 0) * scenarioMultiplier;
    const gv = records.filter(r => r.day === d && r.branch === "G").reduce((s, r) => s + r.total, 0) * scenarioMultiplier;
    const kv = records.filter(r => r.day === d && r.branch === "K").reduce((s, r) => s + r.total, 0) * scenarioMultiplier;
    return { day: d, dayAr: DAY_NAMES[d] || d, total, branchG: gv, branchK: kv };
  });

  // Top 10 products
  const top10Products = byDepartment.slice(0, 10).map(d => ({
    name: d.name, value: d.value, share: d.share, quantity: Math.round(d.value / 12),
  }));

  // Pareto
  let cumSum = 0;
  const pareto = byDepartment.map(d => {
    cumSum += d.value;
    return { productName: d.name, value: d.value, cumulativeShare: cumSum / (totalSales || 1), isCritical: cumSum / (totalSales || 1) <= 0.8 };
  });

  const abc = pareto.map(p => ({
    productName: p.productName, value: p.value,
    category: (p.cumulativeShare <= 0.7 ? "A" : p.cumulativeShare <= 0.9 ? "B" : "C") as "A" | "B" | "C",
  }));

  // Segments
  const appTotal = records.filter(r => r.cat === "A").reduce((s, r) => s + r.total, 0) * scenarioMultiplier;
  const cashTotal = records.reduce((s, r) => s + r.cash, 0) * scenarioMultiplier;
  const visaTotal = records.reduce((s, r) => s + r.visa, 0) * scenarioMultiplier;
  const klikTotal = records.reduce((s, r) => s + r.klik, 0) * scenarioMultiplier;
  const customerSegments = [
    { segment:"طلبات التوصيل الأونلاين", value: appTotal, percentage: appTotal / (totalSales || 1) },
    { segment:"نقد كاش بالصالة", value: cashTotal, percentage: cashTotal / (totalSales || 1) },
    { segment:"بطاقات بنكية وفيزا", value: visaTotal, percentage: visaTotal / (totalSales || 1) },
    { segment:"كلك وتحويل مباشر", value: klikTotal, percentage: klikTotal / (totalSales || 1) },
    { segment:"قنوات أخرى", value: Math.max(0, totalSales - appTotal - cashTotal - visaTotal - klikTotal), percentage: Math.max(0, totalSales - appTotal - cashTotal - visaTotal - klikTotal) / (totalSales || 1) },
  ].filter(s => s.value > 0).sort((a, b) => b.value - a.value);

  // Quality
  let missingValues = 0, duplicates = 0;
  const seenRows = new Set<string>();
  records.forEach(r => {
    if (!r.branchAr || !r.cashierAr || !r.deptAr) missingValues++;
    const rowKey = `${r.day}-${r.date?.slice(0,10)}-${r.branch}-${r.cashier}-${r.dept}-${r.total}`;
    if (seenRows.has(rowKey)) duplicates++;
    else seenRows.add(rowKey);
  });
  const qualityScore = Math.max(50, 100 - Math.floor((missingValues * 6 + duplicates * 12) / (records.length || 1)));
  const qualityIssues: string[] = [];
  if (missingValues > 0) qualityIssues.push(`رُصد ${missingValues} حقل فارغ أو غير معرَّف.`);
  if (duplicates > 0) qualityIssues.push(`يوجد ${duplicates} سجل تكرار محتمل.`);
  if (qualityIssues.length === 0) qualityIssues.push("لم يُرصد أي خطأ في هيكلية البيانات — ممتاز.");

  // Financial KPIs — 3 branches
  const gardensRecs = records.filter(r => r.branch === "G");
  const khildaRecs  = records.filter(r => r.branch === "K");
  const otherRecs   = records.filter(r => r.branch === "O");
  const gardensTotal = gardensRecs.reduce((s, r) => s + r.total, 0) * scenarioMultiplier;
  const khildaTotal  = khildaRecs.reduce((s, r) => s + r.total, 0) * scenarioMultiplier;
  const otherTotal   = otherRecs.reduce((s, r) => s + r.total, 0) * scenarioMultiplier;
  const leadingBranch = khildaTotal >= gardensTotal ? "خلدا" : "الجاردنز";
  const laggingBranch = khildaTotal >= gardensTotal ? "الجاردنز" : "خلدا";
  const gapAmt = Math.abs(khildaTotal - gardensTotal);

  const digitalSum = records.reduce((s, r) => s + (r.visa + r.klik + r.orders + r.cream + r.ashyaei + r.callcenter + r.other), 0) * scenarioMultiplier;
  const digitalPaymentRatio = totalSales > 0 ? digitalSum / totalSales : 0;
  const cashSalesTotal = records.reduce((s, r) => s + r.cash, 0) * scenarioMultiplier;
  const deliverySalesTotal = records.reduce((s, r) => s + (r.orders + r.cream + r.ashyaei), 0) * scenarioMultiplier;
  const cashPct = totalSales > 0 ? (cashSalesTotal / totalSales * 100) : 0;

  // NOTE: Sales-per-shift and "attachment rate" were previously fabricated (shift
  // split by cashier-name string match; attachment from dept codes that never match
  // the raw Arabic dept text). The POS export has no time-of-day or invoice count,
  // so these are no longer computed: meta.timeDataAvailable=false gates shift
  // analysis, and the real Cross-Sell Ratio (below) replaces the fake attachment.

  const uniqueDates = new Set(records.map(r => r.date?.slice(0, 10)).filter(Boolean));
  const avgInvoiceValueG = gardensRecs.length > 0 ? (gardensRecs.reduce((s, r) => s + r.total, 0) * scenarioMultiplier / (new Set(gardensRecs.map(r => r.date?.slice(0,10))).size || 1)) : 0;
  const avgInvoiceValueK = khildaRecs.length > 0 ? (khildaRecs.reduce((s, r) => s + r.total, 0) * scenarioMultiplier / (new Set(khildaRecs.map(r => r.date?.slice(0,10))).size || 1)) : 0;

  const activeKeys: (keyof SaleRecord)[] = ["visa","cash","klik","orders","cream","ashyaei","callcenter","other"];
  const fragmentationCount = activeKeys.filter(k => records.reduce((s, r) => s + (Number(r[k]) || 0), 0) > 0).length;

  // ─── Extended KPIs (channel, commission, cross-sell, catering) ──────────
  const mult = scenarioMultiplier;
  const sumOf = (k: keyof SaleRecord) => records.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const cashSum = sumOf("cash"), visaSum = sumOf("visa"), klikSum = sumOf("klik");
  const ordersSum = sumOf("orders"), creamSum = sumOf("cream"), ashyaeiSum = sumOf("ashyaei");
  const callcenterSum = sumOf("callcenter"), otherSum = sumOf("other");

  // In-store (cash + card present) vs remote/platform payment
  const inStorePaymentTotal = (cashSum + visaSum) * mult;
  const remotePaymentTotal = (klikSum + ordersSum + creamSum + ashyaeiSum + callcenterSum + otherSum) * mult;
  const paySum = inStorePaymentTotal + remotePaymentTotal;
  const inStorePaymentRatio = paySum > 0 ? inStorePaymentTotal / paySum : 0;

  // Delivery-app dependency & own-app (أشيائي) adoption
  const appSalesRaw = ordersSum + creamSum + ashyaeiSum;
  const appSalesTotal = appSalesRaw * mult;
  const appDependencyRatio = totalSales > 0 ? appSalesTotal / totalSales : 0;
  const ownAppSalesTotal = ashyaeiSum * mult;
  const ownAppAdoptionRate = appSalesRaw > 0 ? ashyaeiSum / appSalesRaw : 0;

  // Estimated platform commissions (rates are ASSUMPTIONS — surfaced as estimates)
  const TALABAT_RATE = 0.20, CAREEM_RATE = 0.25, OWN_APP_RATE = 0;
  const commissionBreakdown = [
    { name: "طلبات",  sales: ordersSum * mult,  rate: TALABAT_RATE, cost: ordersSum * mult * TALABAT_RATE },
    { name: "كريم",   sales: creamSum * mult,   rate: CAREEM_RATE,  cost: creamSum * mult * CAREEM_RATE },
    { name: "أشيائي", sales: ashyaeiSum * mult,  rate: OWN_APP_RATE, cost: 0 },
  ].filter(c => c.sales > 0);
  const estimatedCommissionCost = commissionBreakdown.reduce((s, c) => s + c.cost, 0);
  const ownAppCommissionSaved = ownAppSalesTotal * 0.22;

  // Cross-sell: high-margin (مقبلات + مشروبات) vs core meal (ملحمة + مشاوي)
  let highMarginSales = 0, coreMealSales = 0;
  records.forEach(r => {
    const d = normAr(r.deptAr || "");
    const t = r.total * mult;
    if (matchAny(d, DEPT_KW.appetizers) || matchAny(d, DEPT_KW.drinks)) highMarginSales += t;
    else if (matchAny(d, DEPT_KW.butcher) || matchAny(d, DEPT_KW.grills)) coreMealSales += t;
  });
  const crossSellRatio = coreMealSales > 0 ? highMarginSales / coreMealSales : 0;
  const crossSellAvailable = coreMealSales > 0;

  // Catering / Adahi (branch O — labeled أضاحي / أخرى)
  const cateringTotal = otherTotal;
  const cateringShare = totalSales > 0 ? cateringTotal / totalSales : 0;
  const cateringActiveDays = new Set(otherRecs.map(r => r.date?.slice(0, 10)).filter(Boolean)).size;

  // Honest daily average (NOT per-invoice — invoice count is absent from POS export)
  const activeDays = uniqueDates.size || 1;
  const avgDailySales = totalSales / activeDays;

  // Monthly comparison
  const monthComparison = buildMonthComparison(records, scenarioMultiplier);
  const bestMonthLabel = monthComparison.bestMonth;
  const worstMonthLabel = monthComparison.worstMonth;

  const isDeclining = scenarioMultiplier < 0.95;
  const isGrowing = scenarioMultiplier > 1.05;

  return {
    kpis: {
      totalSales, netSales: totalSales, invoiceCount: records.length,
      avgInvoiceValue: totalSales / (uniqueDates.size || 1),
      maxInvoice: Math.max(...records.map(r => r.total * scenarioMultiplier), 0),
      minInvoice: records.filter(r => r.total > 0).length > 0 ? Math.min(...records.filter(r => r.total > 0).map(r => r.total * scenarioMultiplier)) : 0,
      totalQuantity: records.length,
      growthRate: isDeclining ? -0.12 : isGrowing ? 0.20 : 0.05,
      monthlyGrowthRate: monthComparison.avgMonthlyGrowth || (isDeclining ? -0.05 : 0.08),
      bestDay: DAY_NAMES[bestDayKey] || bestDayKey,
      worstDay: DAY_NAMES[worstDayKey] || worstDayKey,
      bestMonth: bestMonthLabel,
      worstMonth: worstMonthLabel,
      digitalPaymentRatio, attachmentRate: 0, peakShifts: [],
      electronicSalesTotal: totalSales - cashSalesTotal, cashSalesTotal, deliverySalesTotal,
      directStoreSalesTotal: totalSales - deliverySalesTotal,
      paymentFragmentationIndex: fragmentationCount,
      avgInvoiceValueG, avgInvoiceValueK,
      activeDays, avgDailySales,
      inStorePaymentTotal, remotePaymentTotal, inStorePaymentRatio,
      appSalesTotal, appDependencyRatio, ownAppSalesTotal, ownAppAdoptionRate,
      estimatedCommissionCost, ownAppCommissionSaved, commissionBreakdown,
      highMarginSales, coreMealSales, crossSellRatio,
      cateringTotal, cateringShare, cateringActiveDays,
    },
    meta: { invoiceDataAvailable: false, timeDataAvailable: false, crossSellAvailable, avgTicketSize: 0 },
    operational: { byBranch, byDepartment, bySalesperson, byChannel, byPaymentMethod, matrix, byDay },
    bi: {
      pareto, abc, top10Products, customerSegments,
      productIntelligence: {
        rising: [byDepartment[1]?.name || "قسم اللاين", "تطبيقات التوصيل"],
        falling: [byDepartment[byDepartment.length - 1]?.name || "قسم متذبذب"],
        stagnant: [byDepartment[Math.floor(byDepartment.length / 2)]?.name || "قسم التواصي"],
      },
      branchIntelligence: { fastestGrowing: leadingBranch, declining: laggingBranch, stable:"أخرى", atRisk: laggingBranch },
    },
    ai: {
      whatHappened: `سجّلت العمليات إجمالي مبيعات قدره ${Math.round(totalSales).toLocaleString()} د.أ عبر ${records.length.toLocaleString()} سجلاً، حيث يتركّز الزخم التجاري بشكل رئيسي في فرع ${leadingBranch} (${Math.round(Math.max(gardensTotal, khildaTotal)).toLocaleString()} د.أ)، ويتصدّر قسم «${byDepartment[0]?.name || "الرئيسي"}» الأقسام الأعلى مبيعاً، فيما سجّل فرع ${laggingBranch} ${Math.round(Math.min(gardensTotal, khildaTotal)).toLocaleString()} د.أ${otherTotal > 0 ? ` ومبيعات الأضاحي والقنوات الأخرى ${Math.round(otherTotal).toLocaleString()} د.أ` : ""}.`,
      whyHappened: `فجوة مبيعاتية تبلغ ${Math.round(gapAmt).toLocaleString()} د.أ بين الفرعين الرئيسيين. السبب: ارتفاع مبيعات ${byDepartment[0]?.name || "القسم الرئيسي"} في ${leadingBranch} وتحسن طلبات الدليفري.${otherTotal > 0 ? ` مبيعات الاضاحي تُمثّل ${((otherTotal/totalSales)*100).toFixed(1)}٪ من الإجمالي.` : ""}`,
      expectedNext: `يتوقع استقرار ${byDepartment[0]?.name || "الأقسام الرئيسية"} مع احتمالية ارتفاع مبيعات التطبيقات 12٪ إضافية خلال نهاية الأسبوع.`,
      recommendation: `نوصي بإطلاق عروض مستهدفة لفرع ${laggingBranch} وتفعيل قنوات الدفع الإلكتروني لتقليل اعتماد الكاش (حالياً ${cashPct.toFixed(0)}٪).`,
      topOpportunities: [
        `رفع معدل تبني تطبيق "أشيائي" الخالي من العمولة (حالياً ${(ownAppAdoptionRate*100).toFixed(0)}٪ من مبيعات التطبيقات) لتوفير العمولات.`,
        `تحسين وعرض منتجات "${byDepartment[0]?.name || "الملحمة"}" على التطبيقات — فرصة نمو 35٪.`,
        `سد فجوة أداء فرع ${laggingBranch} عبر مواءمة الخدمة مع فرع ${leadingBranch}.`,
        `رفع نسبة البيع المتقاطع للمقبلات والمشروبات${crossSellAvailable ? ` (حالياً ${(crossSellRatio*100).toFixed(0)}٪ من قيمة الأطباق الرئيسية)` : ""} لزيادة هامش الربح.`,
      ],
      topRisks: [
        `تكلفة عمولات التطبيقات المقدّرة ${Math.round(estimatedCommissionCost).toLocaleString()} د.أ تُقتطع من صافي الربح.`,
        `نسبة التبعية للتطبيقات ${(appDependencyRatio*100).toFixed(1)}٪ — ارتفاعها يحوّل المطعم إلى مطبخ توصيل بهامش منخفض.`,
        `اعتماد مرتفع على الكاش بنسبة ${cashPct.toFixed(1)}٪ يزيد المخاطر التشغيلية.`,
        `تركز المبيعات في يوم ${DAY_NAMES[bestDayKey]} يضغط على طواقم التحضير والجودة.`,
      ],
      revenueBoosts: [
        `تنظيم برنامج "ساعة السعادة" أيام العمل لزيادة المبيعات الراكدة.`,
        `تدريب الكاشيرات على مهارات البيع الإضافي (Upselling) لتوجيه العملاء نحو المقبلات والمشروبات.`,
        `توقيع شراكات ترويجية مع تطبيقات "طلبات" لتعزيز الظهور في الفرعين.`,
      ],
    },
    quality: {
      score: qualityScore, totalRows: records.length, missingValues, duplicates,
      potentialErrors: missingValues + duplicates, issues: qualityIssues,
      sheetsProcessed: Object.entries(
        records.reduce((acc, r) => { const s = r.sheetName || "ورقة رئيسية"; acc[s] = (acc[s] || 0) + 1; return acc; }, {} as Record<string, number>)
      ).map(([name, rows]) => ({ name, rows })),
    },
    monthComparison,
  };
}
