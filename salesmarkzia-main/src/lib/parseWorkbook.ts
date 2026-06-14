import * as XLSX from "xlsx";
import { SaleRecord } from "../types";

// ─── Arabic digit normalizer ──────────────────────────────────────────
const ARABIC_DIGITS: Record<string, string> = {
  "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9",
  "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9",
};
const normalizeAr = (s: string) =>
  s.replace(/[٠-٩۰-۹]/g, c => ARABIC_DIGITS[c] || c);

// Normalize an Arabic header for fuzzy keyword matching: drop tashkeel, unify
// hamza/alef/ya/ta-marbuta, collapse whitespace and lowercase. This lets header
// variants ("الكاشير", "كاشير ", "كاشيير") all match the same synonym list.
export function normHeader(s: string): string {
  return normalizeAr(s || "")
    .replace(/[\u064B-\u0652\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[\s_\-.]+/g, " ")
    .trim()
    .toLowerCase();
}

// ─── XLSX cell accessors ──────────────────────────────────────────────
function cellAt(ws: XLSX.WorkSheet, r: number, c: number): XLSX.CellObject | null {
  const addr = XLSX.utils.encode_cell({ r, c });
  return ws[addr] ?? null;
}

function cellText(ws: XLSX.WorkSheet, r: number, c: number): string {
  const cell = cellAt(ws, r, c);
  if (!cell) return "";
  return normalizeAr(String(cell.w ?? cell.v ?? "").trim());
}

function cellNum(ws: XLSX.WorkSheet, r: number, c: number): number {
  const cell = cellAt(ws, r, c);
  if (!cell) return 0;
  if (cell.t === "n") return isNaN(cell.v as number) ? 0 : Math.abs(cell.v as number);
  // Strip everything except digits / dot / minus. This safely turns placeholder
  // markers like "*", "-", "—", "N/A" or "٠" into 0 so they never break a SUM
  // (a literal "*" would otherwise be treated as text and corrupt totals).
  const s = normalizeAr(String(cell.w ?? cell.v ?? "")).replace(/[,،\s]/g, "").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.abs(n);
}

// ─── Date parser ─────────────────────────────────────────────────────
// All parsed dates are anchored at LOCAL noon for their calendar day. Noon gives
// a ±12h cushion so later local getters (getDate/getMonth) never roll into an
// adjacent day regardless of the runtime timezone. This is the core defence
// against the SheetJS `cellDates` bug where June 1 was produced as
// 2026-05-31T20:59:16Z and read as May 31 in Jordan (UTC+3) — splitting one
// month into a phantom May + June.
function ymdNoon(y: number, m0: number, d: number): Date {
  return new Date(y, m0, d, 12, 0, 0, 0);
}

function instantToNoon(d: Date): Date {
  const u = new Date(Math.round(d.getTime() / 86400000) * 86400000);
  return ymdNoon(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
}

function localDateToNoon(v: Date): Date {
  const localMid = new Date(v.getFullYear(), v.getMonth(), v.getDate()).getTime();
  const addDay = (v.getTime() - localMid) >= 86400000 / 2 ? 1 : 0;
  return ymdNoon(v.getFullYear(), v.getMonth(), v.getDate() + addDay);
}

// Tight modern Excel serial window used for DATE detection only.
// 44000 ≈ 2020-06-19, 46600 ≈ 2027-08-21. This deliberately EXCLUDES payment
// totals like 40,966 (≈ 2012) so a cash-total column is never mistaken for a
// date column. (Never coerce arbitrary numbers into serial dates — see
// .agents/memory/excel-parser.md.)
const SERIAL_MIN = 44000;
const SERIAL_MAX = 46600;

function parseDate(ws: XLSX.WorkSheet, r: number, c: number): Date | null {
  const cell = cellAt(ws, r, c);
  if (!cell) return null;

  // Numeric serial — the workbook is read WITHOUT cellDates precisely so dates
  // arrive as raw serials we convert with exact integer math, instead of
  // trusting SheetJS's timezone-corrupted Date objects. Math.floor() takes the
  // integer day part so an embedded time-of-day can never bump the calendar day.
  if (cell.t === "n" && typeof cell.v === "number") {
    const serial = cell.v;
    if (serial > 40000 && serial < 55000) {
      const d = new Date(Math.round((Math.floor(serial) - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime()) && d.getUTCFullYear() >= 2010 && d.getUTCFullYear() <= 2040) {
        return ymdNoon(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      }
    }
  }

  // Excel Date object — only if cellDates is ever re-enabled.
  if (cell.t === "d" && cell.v instanceof Date && !isNaN(cell.v.getTime())) {
    return localDateToNoon(cell.v);
  }

  // String date parsing
  const raw = normalizeAr(String(cell.w ?? cell.v ?? "").trim());
  if (!raw) return null;

  // ISO: YYYY-MM-DD
  const iso = /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/.exec(raw);
  if (iso) {
    const d = ymdNoon(+iso[1], +iso[2] - 1, +iso[3]);
    if (!isNaN(d.getTime())) return d;
  }

  // DD/MM/YYYY (most common in Jordan/Arab region)
  const dmy = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(raw);
  if (dmy) {
    let y = +dmy[3]; if (y < 100) y += 2000;
    const day = +dmy[1], mon = +dmy[2];
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      const d = ymdNoon(y, mon - 1, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Native Date.parse fallback (date-only ISO strings parse as UTC midnight).
  const np = Date.parse(raw);
  if (!isNaN(np)) {
    const d = instantToNoon(new Date(np));
    if (d.getFullYear() >= 2010 && d.getFullYear() <= 2040) return d;
  }

  return null;
}

// Whether a single cell is unambiguously a date (used for date-column density
// detection). Numeric cells qualify ONLY inside the tight modern serial window
// so a payment total never inflates a column's "date density".
function isExplicitDate(cell: XLSX.CellObject | null): boolean {
  if (!cell) return false;
  if (cell.t === "d" && cell.v instanceof Date && !isNaN(cell.v.getTime())) return true;
  if (cell.t === "n" && typeof cell.v === "number") {
    return cell.v >= SERIAL_MIN && cell.v <= SERIAL_MAX;
  }
  const raw = normalizeAr(String(cell.w ?? cell.v ?? "").trim());
  if (!raw) return false;
  return /^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/.test(raw)
    || /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(raw);
}

// ─── Column keyword map ───────────────────────────────────────────────
export type ColKey = "date"|"day"|"branch"|"cat"|"cashier"|"dept"|"visa"|"cash"|"klik"|"orders"|"cream"|"ashyaei"|"callcenter"|"other"|"total";
// Persisted per-client import mapping: normalized column header → field key.
export type ColumnMapping = Record<string, ColKey>;

// NOTE: declaration ORDER is the matching priority. Keys whose token is a
// substring of a longer field name MUST come later — e.g. `cashier` before
// `cash`, because "كاش" ⊂ "الكاشير". Each column claims only the FIRST matching
// field, so order prevents the cash/cashier substring collision that silently
// zeroed cash revenue. (.agents/memory/excel-parser.md)
const KW: Record<ColKey, string[]> = {
  date:       ["تاريخ","التاريخ","date","تاريخ البيع","تاريخ الفاتورة","اليوم والتاريخ"],
  day:        ["يوم الاسبوع","يوم الأسبوع","اليوم","يوم","day","weekday"],
  branch:     ["فرع","الفرع","الشعبة","branch","مكان","موقع","المحل","المطعم"],
  cat:        ["نوع الطلب","نوع البيع","تصنيف","الفئة","نوع","cat","type","قناة","القناة"],
  cashier:    ["كاشير","الكاشير","اسم الموظف","اسم الكاشير","موظف","الموظف","cashier","بائع","البائع","امين الصندوق"],
  dept:       ["قسم","القسم","خط","الخط","عنصر","العنصر","صنف","الصنف","منتج","المنتج","dept","department","line","item","category","كاتيغوري","المجموعة","مجموعة"],
  visa:       ["فيزا","visa","بطاقة","بطاقات","مدى","شبكة","سداد","ائتمان","debit","credit","card","ماستر","mastercard"],
  cash:       ["كاش","نقد","نقدي","cash","نقدا","نقداً"],
  klik:       ["كلك","كليك","cliq","clk","كلك بنك","clic"],
  orders:     ["طلبات","talabat","تطبيق طلبات","app طلبات"],
  cream:      ["كريم","careem","كريم delivery","carem"],
  ashyaei:    ["اشيائي","اشياؤي","اشيأي","ashyaei","ashyai","تطبيقنا","تطبيق المطعم"],
  callcenter: ["كول سنتر","كولسنتر","call center","callcenter","مركز اتصال","تلفون","هاتف","phone"],
  other:      ["اخرى","other","متنوع","اخر","باقي","اضافي","misc"],
  total:      ["اجمالي","الاجمالي","مجموع","المجموع","total","sales","صافي","المبلغ","الايراد","الايرادات","grand"],
};

type ColMap = Record<ColKey, number>;
const emptyMap = (): ColMap =>
  Object.fromEntries(Object.keys(KW).map(k => [k, -1])) as ColMap;

// Fuzzy header match: normalize both sides, then check normalized-substring in
// either direction so "فيزا/شبكة" matches "شبكة" and "الكاشير" matches "كاشير".
function matchCol(text: string, key: ColKey): boolean {
  const h = normHeader(text);
  if (!h) return false;
  return KW[key].some(k => {
    const nk = normHeader(k);
    return nk.length > 0 && (h.includes(nk) || nk.includes(h));
  });
}

// ─── Branch helpers ───────────────────────────────────────────────────
const BRANCH_MAP: [RegExp, string][] = [
  [/جارد|garden|الجارد/i,              "G"],
  [/خلد|khild|khald/i,                 "K"],
  [/أخرى|اخرى|آخرى|other|اضاحي|أضاحي|online|أونلاين|ادضاحي/i, "O"],
];
function detectBranch(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  for (const [re, code] of BRANCH_MAP) {
    if (re.test(t)) return code;
  }
  return null;
}

const DAYS_EN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_AR: Record<string, string> = {
  Sun:"الأحد",Mon:"الاثنين",Tue:"الثلاثاء",Wed:"الأربعاء",Thu:"الخميس",Fri:"الجمعة",Sat:"السبت",
};
const DAY_DETECT: [RegExp, string][] = [
  [/أحد|احد|sun/i,"Sun"],[/اثنين|mon/i,"Mon"],[/ثلاثاء|tue/i,"Tue"],
  [/أربعاء|اربعاء|wed/i,"Wed"],[/خميس|thu/i,"Thu"],
  [/جمعة|fri/i,"Fri"],[/سبت|sat/i,"Sat"],
];

const BRANCH_AR: Record<string,string> = { G:"الجاردنز", K:"خلدا", O:"اضاحي / أخرى" };
const CAT_AR: Record<string,string>    = { R:"صالة - حضوري", A:"تطبيقات توصيل" };
export const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

// Friendly Arabic labels for each mappable field — used by the preview UI.
export const FIELD_LABELS: Record<ColKey, string> = {
  date:"التاريخ", day:"اليوم", branch:"الفرع", cat:"نوع الطلب",
  cashier:"الكاشير", dept:"القسم",
  visa:"فيزا", cash:"كاش", klik:"كلك", orders:"طلبات", cream:"كريم",
  ashyaei:"أشيائي", callcenter:"كول سنتر", other:"أخرى", total:"الإجمالي",
};
export const FIELD_ORDER: ColKey[] = [
  "date","day","branch","cat","cashier","dept",
  "cash","visa","klik","orders","cream","ashyaei","callcenter","other","total",
];
const PAYMENT_FIELDS: ColKey[] = ["visa","cash","klik","orders","cream","ashyaei","callcenter","other"];

// ─── Month inference from sheet name / workbook metadata ───────────────
const MONTH_NAME_RE: [RegExp, number][] = [
  [/يناير|كانون الثاني|jan/i, 0],
  [/فبراير|شباط|feb/i, 1],
  [/مارس|اذار|آذار|mar/i, 2],
  [/ابريل|أبريل|نيسان|apr/i, 3],
  [/مايو|أيار|ايار|may/i, 4],
  [/يونيو|حزيران|jun/i, 5],
  [/يوليو|تموز|jul/i, 6],
  [/اغسطس|أغسطس|aug/i, 7],
  [/سبتمبر|أيلول|ايلول|sep/i, 8],
  [/اكتوبر|أكتوبر|oct/i, 9],
  [/نوفمبر|تشرين الثاني|nov/i, 10],
  [/ديسمبر|كانون الاول|dec/i, 11],
];

function inferMonthFromName(name: string, wb?: XLSX.WorkBook): { y: number; m0: number } | null {
  const n = normalizeAr(name || "");
  let m0: number | null = null;
  for (const [re, m] of MONTH_NAME_RE) { if (re.test(n)) { m0 = m; break; } }

  // Numeric month/year patterns: 2025-06, 06/2025, 6-2025
  let y: number | null = null;
  if (m0 === null) {
    const a = /(20\d{2})[\/\-.\s_](\d{1,2})\b/.exec(n);
    const b = /\b(\d{1,2})[\/\-.\s_](20\d{2})/.exec(n);
    if (a && +a[2] >= 1 && +a[2] <= 12) { y = +a[1]; m0 = +a[2] - 1; }
    else if (b && +b[1] >= 1 && +b[1] <= 12) { y = +b[2]; m0 = +b[1] - 1; }
  }
  if (m0 === null) return null;

  if (y === null) {
    const ym = /\b(20\d{2})\b/.exec(n);
    if (ym) y = +ym[1];
  }
  if (y === null) {
    const created = (wb?.Props as any)?.CreatedDate;
    if (created instanceof Date && !isNaN(created.getTime())) y = created.getFullYear();
  }
  if (y === null) return null;
  if (y < 2010 || y > 2040) return null;
  return { y, m0 };
}

const monthKeyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// ─── Preview / analysis types ─────────────────────────────────────────
export type Confidence = "high" | "medium" | "low";

export interface PreviewColumn {
  index: number;
  header: string;
  field: ColKey | null;
  confidence: Confidence;
  samples: string[];
  numericDensity: number;
  dateDensity: number;
  textDensity: number;
  cardinality: number;
}

export interface PreviewSheet {
  name: string;
  included: boolean;
  reason?: string;            // why auto-excluded (still toggleable by the user)
  headerRow: number;
  dataStart: number;
  dataEnd: number;
  columns: PreviewColumn[];
  rowCount: number;
  months: string[];
  warnings: string[];
  inferredMonth?: string;     // YYYY-MM when no date column was found
  sheetBranch?: string;       // branch detected from the sheet name
}

export interface WorkbookPreview {
  sheets: PreviewSheet[];
}

// Backward-compatible report (records + flat summary)
export interface ParseReport {
  records: SaleRecord[];
  sheets: { name: string; rows: number; headerRow: number; colMap: Partial<Record<ColKey,string>> }[];
  months: string[];
  branches: string[];
  rawHeaders: string[][];
  totalRows: number;
}

// ─── Sheet extraction (shared by analyze + extract) ───────────────────
interface SheetExtractConfig {
  name: string;
  headerRow: number;
  dataStart: number;
  dataEnd: number;
  colMap: ColMap;
  sheetBranch: string | null;
  inferredMonth: { y: number; m0: number } | null;
}

function extractSheet(ws: XLSX.WorkSheet, cfg: SheetExtractConfig): SaleRecord[] {
  if (!ws || !ws["!ref"]) return [];
  const range = XLSX.utils.decode_range(ws["!ref"]!);
  const C0 = range.s.c, C1 = range.e.c;
  const { colMap } = cfg;
  const out: SaleRecord[] = [];
  let carryDate: Date | null = null;

  for (let ri = cfg.dataStart; ri <= cfg.dataEnd; ri++) {
    // Skip blank rows (check first 5 cells)
    const nonEmpty = [C0, C0+1, C0+2, C0+3, C0+4]
      .filter(ci => ci <= C1)
      .some(ci => { const cell = cellAt(ws, ri, ci); return cell && cell.v !== null && cell.v !== ""; });
    if (!nonEmpty) continue;

    // Skip summary / grand-total rows
    const rowStr = [];
    for (let ci = C0; ci <= Math.min(C1, C0 + 25); ci++) rowStr.push(cellText(ws, ri, ci));
    const joined = rowStr.join(" ").toLowerCase();
    if (/اجمالي الكل|grand total|اجمالي كلي|مجموع الكل|إجمالي كلي/.test(joined)) continue;

    // Date — from the mapped date column, else a genuine Date-typed cell scan,
    // else carry-down, else the sheet's inferred month (anchored mid-month).
    let rowDate: Date | null = null;
    if (colMap.date >= 0) rowDate = parseDate(ws, ri, colMap.date);
    if (!rowDate) {
      // Scan first 8 cells for a genuine Date-typed cell ONLY. Never coerce an
      // arbitrary number into a serial date here — a 40,966 cash total would be
      // fabricated into a bogus month.
      for (let ci = C0; ci <= Math.min(C0 + 7, C1); ci++) {
        const cell = cellAt(ws, ri, ci);
        if (cell && cell.t === "d" && cell.v instanceof Date && !isNaN((cell.v as Date).getTime())) {
          rowDate = localDateToNoon(cell.v as Date); break;
        }
      }
    }
    if (!rowDate && carryDate) rowDate = carryDate;
    if (!rowDate && cfg.inferredMonth) {
      rowDate = ymdNoon(cfg.inferredMonth.y, cfg.inferredMonth.m0, 15);
    }
    if (rowDate) carryDate = rowDate;
    if (!rowDate) continue;

    // Branch
    let branch = cfg.sheetBranch || "G";
    if (colMap.branch >= 0) {
      const bt = cellText(ws, ri, colMap.branch);
      const detected = detectBranch(bt);
      if (detected) branch = detected;
      else if (bt) branch = cfg.sheetBranch || "G";
    } else {
      for (let ci = C0; ci <= Math.min(C0 + 5, C1); ci++) {
        const d = detectBranch(cellText(ws, ri, ci));
        if (d) { branch = d; break; }
      }
    }

    // Day of week
    let dayKey = DAYS_EN[rowDate.getDay()];
    if (colMap.day >= 0) {
      const dt = cellText(ws, ri, colMap.day);
      for (const [re, key] of DAY_DETECT) { if (re.test(dt)) { dayKey = key; break; } }
    }

    // Category
    let cat = "R";
    if (colMap.cat >= 0) {
      const ct = cellText(ws, ri, colMap.cat).toLowerCase();
      if (/تطبيق|app|delivery|توصيل|online|كريم|طلبات|اشيائي/.test(ct)) cat = "A";
    }

    // Cashier
    let cashier = "عام";
    if (colMap.cashier >= 0) {
      const cr = cellText(ws, ri, colMap.cashier);
      if (cr.length > 1) cashier = cr;
    }

    // Department
    let dept = "عام";
    if (colMap.dept >= 0) {
      const dr = cellText(ws, ri, colMap.dept);
      if (dr.length > 0) dept = dr;
    }

    // Payment fields
    const visa       = colMap.visa       >= 0 ? cellNum(ws, ri, colMap.visa)       : 0;
    const cash       = colMap.cash       >= 0 ? cellNum(ws, ri, colMap.cash)       : 0;
    const klik       = colMap.klik       >= 0 ? cellNum(ws, ri, colMap.klik)       : 0;
    const orders     = colMap.orders     >= 0 ? cellNum(ws, ri, colMap.orders)     : 0;
    const cream      = colMap.cream      >= 0 ? cellNum(ws, ri, colMap.cream)      : 0;
    const ashyaei    = colMap.ashyaei    >= 0 ? cellNum(ws, ri, colMap.ashyaei)    : 0;
    const callcenter = colMap.callcenter >= 0 ? cellNum(ws, ri, colMap.callcenter) : 0;
    const other      = colMap.other      >= 0 ? cellNum(ws, ri, colMap.other)      : 0;

    let total = visa + cash + klik + orders + cream + ashyaei + callcenter + other;

    // Fallback: use declared total column if the payment breakdown summed to 0.
    if (total === 0 && colMap.total >= 0) {
      const declared = cellNum(ws, ri, colMap.total);
      if (declared > 0) total = declared;
    }

    if (total <= 0) continue;

    out.push({
      id: `${cfg.name}-${ri}`,
      day: dayKey,
      dayAr: DAY_AR[dayKey] ?? dayKey,
      cat, catAr: CAT_AR[cat] ?? "صالة",
      date: ymdNoon(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate()).toISOString(),
      branch, branchAr: BRANCH_AR[branch] ?? branch,
      cashier, cashierAr: cashier,
      dept, deptAr: dept,
      visa, cash, klik, orders, cream, ashyaei, callcenter, other, total,
      sheetName: cfg.name,
    });
  }

  return out;
}

// ─── Header-row detection (combined score) ────────────────────────────
// A header row scores high when it has many keyword/text labels AND is followed
// by data-dense (numeric/date) rows. This finds the header even when its labels
// don't keyword-match, so we no longer drop sheets with unusual column names.
function scoreHeaderRow(ws: XLSX.WorkSheet, ri: number, C0: number, C1: number, R1: number) {
  const maxC = Math.min(C0 + 25, C1);
  let kw = 0, nonEmpty = 0;
  for (let ci = C0; ci <= maxC; ci++) {
    const t = cellText(ws, ri, ci);
    if (!t) continue;
    nonEmpty++;
    for (const key of Object.keys(KW) as ColKey[]) { if (matchCol(t, key)) { kw++; break; } }
  }
  // following-row numeric/date density (next up to 5 rows)
  let dataCells = 0, dataTotal = 0;
  for (let rr = ri + 1; rr <= Math.min(ri + 5, R1); rr++) {
    for (let ci = C0; ci <= maxC; ci++) {
      const cell = cellAt(ws, rr, ci);
      if (!cell || cell.v === "" || cell.v == null) continue;
      dataTotal++;
      if (cell.t === "n" || cell.t === "d") { dataCells++; continue; }
      const s = normalizeAr(String(cell.w ?? cell.v ?? ""));
      if (/^\d/.test(s) || /\d{1,2}[\/\-.]\d/.test(s)) dataCells++;
    }
  }
  const followDensity = dataTotal > 0 ? dataCells / dataTotal : 0;
  return { score: kw * 3 + nonEmpty * 0.5 + followDensity * 6, kw, nonEmpty };
}

// ─── Per-column statistics over a sample of data rows ─────────────────
function columnStats(ws: XLSX.WorkSheet, ci: number, sampleRows: number[]) {
  let total = 0, numeric = 0, dates = 0, text = 0;
  const seen = new Set<string>();
  const samples: string[] = [];
  for (const rr of sampleRows) {
    const cell = cellAt(ws, rr, ci);
    if (!cell || cell.v === "" || cell.v == null) continue;
    total++;
    const txt = normalizeAr(String(cell.w ?? cell.v ?? "").trim());
    if (txt && samples.length < 3) samples.push(txt);
    seen.add(txt);
    if (isExplicitDate(cell)) dates++;
    if (cell.t === "n") numeric++;
    else if (!/^[\d.,\s-]+$/.test(txt)) text++;
  }
  return {
    total,
    numericDensity: total ? numeric / total : 0,
    dateDensity: total ? dates / total : 0,
    textDensity: total ? text / total : 0,
    cardinality: seen.size,
    samples,
  };
}

// ─── Analyze a single worksheet → PreviewSheet ────────────────────────
function analyzeSheet(ws: XLSX.WorkSheet, sheetName: string, wb: XLSX.WorkBook): PreviewSheet | null {
  if (!ws || !ws["!ref"]) return null;
  const range = XLSX.utils.decode_range(ws["!ref"]!);
  const R0 = range.s.r, R1 = range.e.r, C0 = range.s.c, C1 = range.e.c;
  if (R1 - R0 < 1) return null;

  const sheetBranch = detectBranch(sheetName);

  // Power Query table definition (if any) pins the header + data range.
  let tableStart = -1, tableEnd = -1, tableColStart = C0, tableColEnd = C1;
  const tables = (ws as any)["!tables"];
  if (Array.isArray(tables) && tables.length > 0) {
    for (const tbl of tables) {
      const ref = tbl.ref ?? tbl["!ref"];
      if (!ref) continue;
      const tr = XLSX.utils.decode_range(ref);
      if (tr.e.r - tr.s.r >= 1) {
        tableStart = tr.s.r; tableEnd = tr.e.r;
        tableColStart = tr.s.c; tableColEnd = tr.e.c;
        break;
      }
    }
  }

  // Header row
  let headerRow = tableStart;
  if (headerRow < 0) {
    let best = 0;
    for (let ri = R0; ri <= Math.min(R0 + 50, R1); ri++) {
      const { score, kw, nonEmpty } = scoreHeaderRow(ws, ri, C0, C1, R1);
      if (nonEmpty >= 2 && score > best) { best = score; headerRow = ri; }
      if (kw >= 4) { headerRow = ri; break; }
    }
  }
  if (headerRow < 0) return null;

  const colStart = tableColStart ?? C0;
  const colEnd = Math.min(C1, tableColEnd ?? C1);
  const dataStart = headerRow + 1;
  const dataEnd = tableEnd >= 0 ? tableEnd : R1;

  // Sample rows for column statistics
  const sampleRows: number[] = [];
  for (let rr = dataStart; rr <= Math.min(dataStart + 40, dataEnd) && sampleRows.length < 30; rr++) {
    const has = [C0, C0+1, C0+2].some(ci => { const c = cellAt(ws, rr, ci); return c && c.v !== "" && c.v != null; });
    if (has) sampleRows.push(rr);
  }

  // ── Auto-map columns ───────────────────────────────────────────────
  // 1) Keyword/fuzzy header match (high confidence), one field per column with
  //    the cash/cashier break safeguard preserved by KW priority order.
  const colMap = emptyMap();
  const confByField: Partial<Record<ColKey, Confidence>> = {};
  for (let ci = colStart; ci <= colEnd; ci++) {
    const t = cellText(ws, headerRow, ci);
    if (!t) continue;
    for (const key of Object.keys(KW) as ColKey[]) {
      if (colMap[key] === -1 && matchCol(t, key)) {
        colMap[key] = ci;
        confByField[key] = "high";
        break;
      }
    }
  }

  // Per-column stats
  const statsByCol: Record<number, ReturnType<typeof columnStats>> = {};
  for (let ci = colStart; ci <= colEnd; ci++) statsByCol[ci] = columnStats(ws, ci, sampleRows);

  // 2) Date column by parseable-date density (medium confidence) when no
  //    keyword date column was found.
  if (colMap.date < 0) {
    let bestCi = -1, bestD = 0;
    for (let ci = colStart; ci <= colEnd; ci++) {
      const claimed = (Object.values(colMap) as number[]).includes(ci);
      if (claimed) continue;
      const d = statsByCol[ci].dateDensity;
      if (d > bestD) { bestD = d; bestCi = ci; }
    }
    if (bestCi >= 0 && bestD >= 0.6) { colMap.date = bestCi; confByField.date = "medium"; }
  }

  // 3) Dimension columns by text density / cardinality when not header-matched.
  //    Conservative: only fill from clearly-textual, multi-value columns. The
  //    preview UI lets the user correct anything.
  const textCols = [];
  for (let ci = colStart; ci <= colEnd; ci++) {
    const claimed = (Object.values(colMap) as number[]).includes(ci);
    if (claimed) continue;
    const s = statsByCol[ci];
    if (s.total >= 2 && s.textDensity >= 0.5 && s.cardinality >= 1) textCols.push({ ci, card: s.cardinality });
  }
  if (colMap.dept < 0 && textCols.length) {
    // Department: the most varied text column.
    const pick = textCols.slice().sort((a, b) => b.card - a.card)[0];
    colMap.dept = pick.ci; confByField.dept = "low";
  }
  if (colMap.cashier < 0) {
    const pick = textCols.filter(t => t.ci !== colMap.dept).sort((a, b) => b.card - a.card)[0];
    if (pick) { colMap.cashier = pick.ci; confByField.cashier = "low"; }
  }

  // Inferred month (only relevant when there is no usable date column)
  const inferred = colMap.date < 0 ? inferMonthFromName(sheetName, wb) : null;

  // Build PreviewColumn list (one entry per column in range)
  const fieldByCol: Record<number, ColKey> = {};
  for (const [k, v] of Object.entries(colMap)) if (v >= 0) fieldByCol[v] = k as ColKey;
  const columns: PreviewColumn[] = [];
  for (let ci = colStart; ci <= colEnd; ci++) {
    const header = cellText(ws, headerRow, ci) || `عمود ${XLSX.utils.encode_col(ci)}`;
    const st = statsByCol[ci];
    const field = fieldByCol[ci] ?? null;
    columns.push({
      index: ci,
      header,
      field,
      confidence: field ? (confByField[field] ?? "low") : "low",
      samples: st.samples,
      numericDensity: st.numericDensity,
      dateDensity: st.dateDensity,
      textDensity: st.textDensity,
      cardinality: st.cardinality,
    });
  }

  // Extract with the auto-mapping to get the true row count + months.
  const records = extractSheet(ws, {
    name: sheetName, headerRow, dataStart, dataEnd, colMap,
    sheetBranch, inferredMonth: inferred,
  });
  const months = Array.from(new Set(records.map(r => monthKeyOf(new Date(r.date))))).sort();

  // ── Decide inclusion + warnings ────────────────────────────────────
  const warnings: string[] = [];
  let included = true;
  let reason: string | undefined;

  const hasPayment = PAYMENT_FIELDS.some(f => colMap[f] >= 0) || colMap.total >= 0;
  const hasDate = colMap.date >= 0 || !!inferred;

  if (records.length === 0) {
    included = false;
    reason = "لم يُعثر على صفوف بيانات صالحة — قد تكون ورقة ملخّص أو Pivot.";
  } else if (!hasDate) {
    included = false;
    reason = "لا يوجد عمود تاريخ ولا يمكن استنتاج الشهر من اسم الورقة.";
  } else if (!hasPayment) {
    included = false;
    reason = "لم يُكتشف أي عمود مبالغ (كاش/فيزا/كلك...).";
  }

  if (included) {
    if (inferred) warnings.push(`لا يوجد عمود تاريخ — تم استنتاج الشهر «${MONTHS_AR[inferred.m0]} ${inferred.y}» من اسم الورقة.`);
    if (confByField.date === "medium") warnings.push("تم اكتشاف عمود التاريخ تلقائياً حسب نمط البيانات — يُنصح بالمراجعة.");
    if (colMap.cashier < 0) warnings.push("لم يُكتشف عمود الكاشير.");
    if (colMap.dept < 0) warnings.push("لم يُكتشف عمود القسم.");
    if (!PAYMENT_FIELDS.some(f => colMap[f] >= 0) && colMap.total >= 0) {
      warnings.push("لا يوجد تفصيل لطرق الدفع — سيُستخدم عمود الإجمالي.");
    }
    if (months.length > 1) warnings.push(`تحتوي الورقة على ${months.length} أشهر.`);
  }

  return {
    name: sheetName,
    included,
    reason,
    headerRow,
    dataStart,
    dataEnd,
    columns,
    rowCount: records.length,
    months,
    warnings,
    inferredMonth: inferred ? `${inferred.y}-${String(inferred.m0 + 1).padStart(2, "0")}` : undefined,
    sheetBranch: sheetBranch ?? undefined,
  };
}

// ─── Public: analyze a workbook (every sheet) ─────────────────────────
export function analyzeWorkbook(wb: XLSX.WorkBook): WorkbookPreview {
  const sheets: PreviewSheet[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const analysis = analyzeSheet(ws, sheetName, wb);
    if (analysis) sheets.push(analysis);
  }
  return { sheets };
}

function buildColMapFromColumns(columns: PreviewColumn[]): ColMap {
  const cm = emptyMap();
  for (const col of columns) {
    if (col.field && cm[col.field] === -1) cm[col.field] = col.index;
  }
  return cm;
}

function parseMonthKey(key?: string): { y: number; m0: number } | null {
  if (!key) return null;
  const m = /^(\d{4})-(\d{1,2})$/.exec(key);
  if (!m) return null;
  return { y: +m[1], m0: +m[2] - 1 };
}

// ─── Public: extract records from (possibly user-corrected) preview ───
export function extractRecords(wb: XLSX.WorkBook, sheets: PreviewSheet[]): ParseReport {
  const allRecords: SaleRecord[] = [];
  const sheetReports: ParseReport["sheets"] = [];
  const rawHeaders: string[][] = [];

  for (const sheet of sheets) {
    if (!sheet.included) continue;
    const ws = wb.Sheets[sheet.name];
    if (!ws) continue;

    const colMap = buildColMapFromColumns(sheet.columns);
    const recs = extractSheet(ws, {
      name: sheet.name,
      headerRow: sheet.headerRow,
      dataStart: sheet.dataStart,
      dataEnd: sheet.dataEnd,
      colMap,
      sheetBranch: sheet.sheetBranch ?? null,
      inferredMonth: parseMonthKey(sheet.inferredMonth),
    });

    allRecords.push(...recs);
    if (recs.length > 0) {
      const friendly: Partial<Record<ColKey, string>> = {};
      for (const [k, v] of Object.entries(colMap)) {
        if (v >= 0) friendly[k as ColKey] = sheet.columns.find(c => c.index === v)?.header || String(v);
      }
      sheetReports.push({ name: sheet.name, rows: recs.length, headerRow: sheet.headerRow, colMap: friendly });
    }
    rawHeaders.push(sheet.columns.map(c => c.header));
  }

  const months = Array.from(new Set(allRecords.map(r => monthKeyOf(new Date(r.date))))).sort();
  const branches = Array.from(new Set(allRecords.map(r => r.branchAr)));
  return { records: allRecords, sheets: sheetReports, months, branches, rawHeaders, totalRows: allRecords.length };
}

// ─── Backward-compatible one-shot parse (analyze → extract all) ───────
export function parseWorkbook(wb: XLSX.WorkBook): ParseReport {
  const preview = analyzeWorkbook(wb);
  return extractRecords(wb, preview.sheets);
}
