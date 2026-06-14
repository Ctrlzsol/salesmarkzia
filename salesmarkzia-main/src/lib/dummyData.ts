import { SaleRecord } from "../types";

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const branches = [
  { branch: "G", branchAr: "الجاردنز" },
  { branch: "K", branchAr: "خلدا" },
];

const depts = [
  { dept: "mlh", deptAr: "قسم الملحمة" },
  { dept: "mshw", deptAr: "قسم المشاوي" },
  { dept: "ln", deptAr: "قسم اللاين" },
  { dept: "slh", deptAr: "قسم الصالة" },
  { dept: "swn", deptAr: "قسم الصواني" },
  { dept: "msh", deptAr: "قسم المشروبات" },
  { dept: "mqb", deptAr: "قسم المقبلات" },
  { dept: "frn", deptAr: "قسم الفرن" },
];

const cashiers = [
  { cashier: "haya", cashierAr: "هيا قلاب" },
  { cashier: "rami", cashierAr: "رامي شديد" },
  { cashier: "diaa", cashierAr: "ضياء المريسي" },
  { cashier: "mohd", cashierAr: "محمد الخطيب" },
  { cashier: "hr", cashierAr: "حسين رمضان" },
];

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYS_AR: Record<string, string> = {
  Mon:"الاثنين",Tue:"الثلاثاء",Wed:"الأربعاء",Thu:"الخميس",Fri:"الجمعة",Sat:"السبت",Sun:"الأحد"
};

export function getDummyData(): SaleRecord[] {
  const records: SaleRecord[] = [];

  const months = [
    { year: 2026, month: 2, days: 28 },
    { year: 2026, month: 3, days: 31 },
    { year: 2026, month: 4, days: 30 },
    { year: 2026, month: 5, days: 30 },
  ];

  let id = 1;
  months.forEach(({ year, month, days }) => {
    for (let day = 1; day <= Math.min(days, 10); day++) {
      const date = new Date(year, month, day, 12, 0, 0);
      const dayKey = DAYS[date.getDay()];
      const isFriday = dayKey === "Fri";
      const mult = isFriday ? 1.4 : 1;

      branches.forEach(b => {
        depts.forEach(d => {
          cashiers.slice(0, rnd(2, 3)).forEach(c => {
            const visa = Math.round(rnd(200, 900) * mult);
            const cash = Math.round(rnd(300, 1200) * mult);
            const klik = Math.round(rnd(100, 500) * mult);
            const orders = Math.round(rnd(b.branch === "K" ? 200 : 100, b.branch === "K" ? 800 : 400) * mult);
            const cream = Math.round(rnd(50, 300) * mult);
            const ashyaei = Math.round(rnd(30, 200) * mult);
            const callcenter = Math.round(rnd(0, 150) * mult);
            const other = Math.round(rnd(0, 100) * mult);
            const total = visa + cash + klik + orders + cream + ashyaei + callcenter + other;

            records.push({
              id: `DEMO-${id++}`,
              day: dayKey,
              dayAr: DAYS_AR[dayKey] || dayKey,
              cat: orders > 400 ? "A" : "R",
              catAr: orders > 400 ? "تطبيقات" : "مطعم",
              date: date.toISOString(),
              branch: b.branch,
              branchAr: b.branchAr,
              cashier: c.cashier,
              cashierAr: c.cashierAr,
              dept: d.dept,
              deptAr: d.deptAr,
              visa, cash, klik, orders, cream, ashyaei, callcenter, other, total,
              sheetName: `${month + 1}/${year}`,
            });
          });
        });
      });
    }
  });

  return records;
}
