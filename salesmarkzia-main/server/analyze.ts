import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
} else {
  console.warn("GEMINI_API_KEY is not defined. AI queries will fall back to local rules.");
}

// Local Arabic fallback engine. Honest about growth: only states a monthly
// growth figure when ≥2 months are actually present; otherwise explicitly says
// the window is too short rather than fabricating a percentage.
function getLocalAnalysis(data: any) {
  const { topBranches = [], topProducts = [], monthlyGrowth = null, activeDays = 0, totalSales = 0, invoiceCount = 0 } = data || {};
  const leadBranch = topBranches[0]?.name || "الفرع الرئيسي";
  const lagBranch = topBranches[1]?.name || "الفرع الثاني";
  const topProduct = topProducts[0]?.name || "القسم الرئيسي";
  const expectedNext =
    monthlyGrowth != null
      ? `بناءً على نمو شهري قدره ${(monthlyGrowth * 100).toFixed(1)}% يتوقع استمرار الاتجاه الحالي مع متابعة أداء ${topProduct}.`
      : `الفترة المتاحة قصيرة (${activeDays} يوم من شهر واحد) ولا تكفي لتوقع اتجاه موثوق — يلزم جمع بيانات أشهر إضافية.`;
  return {
    whatHappened: `سجّلت العمليات إجمالي مبيعات قدره ${Math.round(totalSales).toLocaleString()} د.أ عبر ${Number(invoiceCount).toLocaleString()} سجلاً، حيث يتركّز الزخم التجاري بشكل رئيسي في فرع ${leadBranch} (${Math.round(topBranches[0]?.value || 0).toLocaleString()} د.أ)، ويتصدّر «${topProduct}» قائمة الأقسام الأعلى مبيعاً.`,
    whyHappened: `يعود السبب لارتفاع مبيعات ${topProducts[0]?.name || "القسم الرئيسي"} وتحسن أداء قنوات الدليفري.`,
    expectedNext,
    recommendation: `نوصي بتطوير أداء فرع ${lagBranch} وتفعيل العروض الترويجية المستهدفة.`,
    topOpportunities: [
      `تعزيز ظهور ${topProducts[0]?.name || "المنتجات الرئيسية"} على تطبيقات التوصيل.`,
      `تحسين تجربة الخدمة في فرع ${lagBranch} لتضييق الفجوة مع ${leadBranch}.`,
      `تفعيل برامج ولاء العملاء لزيادة معدل التكرار.`,
    ],
    topRisks: [
      `اعتماد مفرط على الكاش يرفع المخاطر التشغيلية.`,
      `تركز المبيعات في أيام معينة يضغط على كفاءة الفريق.`,
      `ضعف بعض الأقسام في أحد الفرعين يؤثر على التوازن.`,
    ],
    revenueBoosts: [
      `برنامج "ساعة السعادة" لأيام العمل الهادئة.`,
      `تفعيل البيع الإضافي (Upselling) للمقبلات والمشروبات.`,
      `شراكات ترويجية مع تطبيقات التوصيل الرائدة.`,
    ],
  };
}

async function generateWithRetry(config: any, retries = 3, delayMs = 1200): Promise<any> {
  if (!aiClient) throw new Error("AI client is not initialized");
  try {
    return await aiClient.models.generateContent(config);
  } catch (error: any) {
    const errorMsg = String(error?.message || error || "");
    const isTransient =
      error?.status === 503 ||
      error?.code === 503 ||
      error?.status === 429 ||
      error?.code === 429 ||
      errorMsg.includes("503") ||
      errorMsg.includes("429") ||
      errorMsg.includes("UNAVAILABLE") ||
      errorMsg.includes("RESOURCE_EXHAUSTED") ||
      errorMsg.includes("high demand");
    if (retries > 0 && isTransient) {
      await new Promise((r) => setTimeout(r, delayMs));
      return generateWithRetry(config, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

export async function handleAnalyze(req: Request, res: Response): Promise<void> {
  const { summaryData } = req.body || {};
  if (!summaryData) {
    res.status(400).json({ error: "Missing summaryData" });
    return;
  }

  const prompt = `أنت محلل مالي خبير لمطاعم المركزية في الأردن. بناءً على بيانات المبيعات التالية قدم تحليلاً عميقاً باللغة العربية:

إجمالي المبيعات: ${summaryData.totalSales?.toLocaleString?.() ?? summaryData.totalSales} د.أ
${
  summaryData.monthlyGrowth != null
    ? `النمو الشهري الفعلي: ${(summaryData.monthlyGrowth * 100).toFixed(1)}% (محسوب من ${summaryData.monthsAnalyzed} أشهر)`
    : `الفترة المتاحة: ${summaryData.activeDays} يوم من شهر واحد فقط — لا تتوفر مقارنة نمو شهرية، لا تذكر أي نسبة نمو ولا تختلق أرقاماً.`
}
أفضل الفروع: ${JSON.stringify(summaryData.topBranches)}
أفضل المنتجات/الأقسام: ${JSON.stringify(summaryData.topProducts)}

أجب بـ JSON فقط بهذا الهيكل:
{
  "whatHappened": "جملة واحدة تصف ما حدث",
  "whyHappened": "جملة واحدة تشرح السبب",
  "expectedNext": "جملة واحدة للتوقعات",
  "recommendation": "جملة واحدة للتوصية الرئيسية",
  "topOpportunities": ["فرصة 1","فرصة 2","فرصة 3"],
  "topRisks": ["خطر 1","خطر 2","خطر 3"],
  "revenueBoosts": ["فكرة 1","فكرة 2","فكرة 3"]
}`;

  try {
    if (aiClient) {
      const response = await generateWithRetry({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      const text = response.text || "{}";
      res.json(JSON.parse(text));
      return;
    }
    res.json(getLocalAnalysis(summaryData));
  } catch (error: any) {
    console.warn(
      "Gemini API unavailable (transient/rate-limit). Falling back to local analytical engine:",
      error?.message || error
    );
    res.json(getLocalAnalysis(summaryData));
  }
}
