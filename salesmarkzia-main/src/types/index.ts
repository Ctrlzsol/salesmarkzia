export interface SaleRecord {
  id: string;
  day: string;
  dayAr: string;
  cat: string;
  catAr: string;
  date: string;
  branch: string;
  branchAr: string;
  cashier: string;
  cashierAr: string;
  dept: string;
  deptAr: string;
  visa: number;
  cash: number;
  klik: number;
  orders: number;
  cream: number;
  ashyaei: number;
  callcenter: number;
  other: number;
  total: number;
  sheetName?: string;
  batchId?: number;
}

export interface MonthlyData {
  monthKey: string;
  monthLabel: string;
  total: number;
  invoiceCount: number;
  avgPerDay: number;
  branchG: number;
  branchK: number;
  branchO: number;
  cash: number;
  visa: number;
  klik: number;
  delivery: number;
  daysActive: number;
}

export interface MonthComparison {
  months: MonthlyData[];
  bestMonth: string;
  worstMonth: string;
  totalGrowth: number;
  avgMonthlyGrowth: number;
  monthOverMonth: { from: string; to: string; change: number; changeAmt: number }[];
}

export interface KPIStats {
  totalSales: number;
  netSales: number;
  invoiceCount: number;
  avgInvoiceValue: number;
  maxInvoice: number;
  minInvoice: number;
  totalQuantity: number;
  growthRate: number;
  monthlyGrowthRate: number;
  bestDay: string;
  worstDay: string;
  bestMonth: string;
  worstMonth: string;
  digitalPaymentRatio: number;
  attachmentRate: number;
  peakShifts: { name: string; value: number; share: number; count: number; color: string }[];
  electronicSalesTotal: number;
  cashSalesTotal: number;
  deliverySalesTotal: number;
  directStoreSalesTotal: number;
  paymentFragmentationIndex: number;
  avgInvoiceValueG: number;
  avgInvoiceValueK: number;
  activeDays: number;
  avgDailySales: number;
  inStorePaymentTotal: number;
  remotePaymentTotal: number;
  inStorePaymentRatio: number;
  appSalesTotal: number;
  appDependencyRatio: number;
  ownAppSalesTotal: number;
  ownAppAdoptionRate: number;
  estimatedCommissionCost: number;
  ownAppCommissionSaved: number;
  commissionBreakdown: { name: string; sales: number; rate: number; cost: number }[];
  highMarginSales: number;
  coreMealSales: number;
  crossSellRatio: number;
  cateringTotal: number;
  cateringShare: number;
  cateringActiveDays: number;
}

export interface OperationalStats {
  byBranch: { name: string; value: number; share: number; growth: number; perDay: number; days: number }[];
  byDepartment: { name: string; value: number; share: number }[];
  bySalesperson: { name: string; value: number; invoices: number }[];
  byChannel: { name: string; value: number; share: number }[];
  byPaymentMethod: { name: string; value: number; share: number }[];
  matrix: {
    department: string;
    branchG: number;
    branchK: number;
    total: number;
    percentage: number;
  }[];
  byDay: { day: string; dayAr: string; total: number; branchG: number; branchK: number }[];
}

export interface BIStats {
  pareto: { productName: string; value: number; cumulativeShare: number; isCritical: boolean }[];
  abc: { productName: string; category: "A" | "B" | "C"; value: number }[];
  top10Products: { name: string; value: number; share: number; quantity: number }[];
  customerSegments: { segment: string; value: number; percentage: number }[];
  productIntelligence: {
    rising: string[];
    falling: string[];
    stagnant: string[];
  };
  branchIntelligence: {
    fastestGrowing: string;
    declining: string;
    stable: string;
    atRisk: string;
  };
}

export interface AIInsights {
  whatHappened: string;
  whyHappened: string;
  expectedNext: string;
  recommendation: string;
  topOpportunities: string[];
  topRisks: string[];
  revenueBoosts: string[];
}

export interface DataQualityReport {
  score: number;
  totalRows: number;
  missingValues: number;
  duplicates: number;
  potentialErrors: number;
  issues: string[];
  sheetsProcessed?: { name: string; rows: number }[];
}

export interface DashboardMeta {
  invoiceDataAvailable: boolean;
  timeDataAvailable: boolean;
  crossSellAvailable: boolean;
  avgTicketSize: number;
}

export interface DashboardData {
  kpis: KPIStats;
  meta: DashboardMeta;
  operational: OperationalStats;
  bi: BIStats;
  ai: AIInsights;
  quality: DataQualityReport;
  monthComparison: MonthComparison;
}
