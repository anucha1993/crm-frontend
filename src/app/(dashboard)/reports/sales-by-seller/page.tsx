"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

type Rate = number | null;

interface Seller {
  id: number;
  name: string;
  // Quotations
  quote_count: number;
  quote_value: number;
  avg_quote_value: number;
  draft_count: number;
  sent_count: number;
  approved_count: number;
  rejected_count: number;
  cancelled_count: number;
  expired_count: number;
  stale_count: number;
  approved_value: number;
  lost_value: number;
  pipeline_value: number;
  quoted_customers: number;
  avg_revisions: number | null;
  avg_days_to_approve: number | null;
  conversion_rate: Rate;
  win_rate: Rate;
  cancel_rate: Rate;
  reject_rate: Rate;
  expired_rate: Rate;
  stale_rate: Rate;
  value_win_rate: Rate;
  // Orders
  order_count: number;
  total_sales: number;
  avg_per_order: number;
  customer_count: number;
  completed_count: number;
  cancelled_order_count: number;
  cancelled_order_value: number;
  paid_amount: number;
  remaining_amount: number;
  collection_rate: Rate;
  new_customers: number;
}

interface Summary {
  seller_count: number;
  quote_count: number;
  quote_value: number;
  approved_count: number;
  approved_value: number;
  rejected_count: number;
  cancelled_count: number;
  expired_count: number;
  stale_count: number;
  lost_value: number;
  pipeline_value: number;
  conversion_rate: Rate;
  win_rate: Rate;
  cancel_rate: Rate;
  reject_rate: Rate;
  expired_rate: Rate;
  stale_rate: Rate;
  value_win_rate: Rate;
  order_count: number;
  total_sales: number;
  avg_per_order: number;
  paid_amount: number;
  remaining_amount: number;
  collection_rate: Rate;
  cancelled_order_count: number;
  new_customers: number;
  avg_days_to_approve: number | null;
}

interface TrendItem {
  seller_id: number;
  seller_name: string;
  month: string;
  quote_count: number;
  approved_count: number;
  cancelled_count: number;
  order_count: number;
  total: number;
}

type SortKey = keyof Seller;
// "higher" = a bigger value is better; "lower" = a smaller value is better
type Better = "higher" | "lower";

interface Column {
  key: SortKey;
  label: string;
  kind: "int" | "money" | "pct" | "days" | "dec";
  better?: Better;
  title?: string;
}

const QUOTE_COLUMNS: Column[] = [
  { key: "quote_count", label: "ใบเสนอราคา", kind: "int", title: "จำนวนใบเสนอราคาที่เปิดในช่วงเวลา" },
  { key: "approved_count", label: "อนุมัติ", kind: "int" },
  { key: "conversion_rate", label: "% แปลงเป็นออเดอร์", kind: "pct", better: "higher", title: "อนุมัติ ÷ ใบเสนอราคาทั้งหมด" },
  { key: "win_rate", label: "% ชนะ", kind: "pct", better: "higher", title: "อนุมัติ ÷ (อนุมัติ + ปฏิเสธ + ยกเลิก + หมดอายุ)" },
  { key: "value_win_rate", label: "% มูลค่าที่ปิดได้", kind: "pct", better: "higher", title: "มูลค่าอนุมัติ ÷ มูลค่าเสนอทั้งหมด" },
  { key: "stale_count", label: "ค้าง >30 วัน", kind: "int", title: "ร่าง/ส่งแล้ว ยังไม่มีผล เกิน 30 วัน" },
  { key: "stale_rate", label: "% ค้าง", kind: "pct", better: "lower" },
  { key: "expired_count", label: "หมดอายุ", kind: "int", title: "ยังไม่ปิด และเลยวันยืนราคา" },
  { key: "rejected_count", label: "ปฏิเสธ", kind: "int" },
  { key: "cancelled_count", label: "ยกเลิก", kind: "int" },
  { key: "cancel_rate", label: "% ยกเลิก", kind: "pct", better: "lower" },
  { key: "avg_days_to_approve", label: "วันเฉลี่ยถึงอนุมัติ", kind: "days", better: "lower" },
  { key: "avg_revisions", label: "แก้ไขเฉลี่ย", kind: "dec", title: "จำนวนครั้งที่แก้ไขต่อใบเฉลี่ย" },
  { key: "avg_quote_value", label: "มูลค่าเฉลี่ย/ใบ", kind: "money" },
  { key: "pipeline_value", label: "มูลค่ารอปิด", kind: "money", title: "มูลค่าใบที่ยังเปิดอยู่และยังไม่หมดอายุ" },
];

const SALES_COLUMNS: Column[] = [
  { key: "order_count", label: "คำสั่งซื้อ", kind: "int" },
  { key: "total_sales", label: "ยอดขายรวม", kind: "money" },
  { key: "avg_per_order", label: "เฉลี่ย/ออเดอร์", kind: "money" },
  { key: "customer_count", label: "ลูกค้าที่ซื้อ", kind: "int" },
  { key: "new_customers", label: "ลูกค้าใหม่", kind: "int", title: "ลูกค้าที่ผู้ขายลงทะเบียนในช่วงเวลา" },
  { key: "completed_count", label: "ออเดอร์สำเร็จ", kind: "int" },
  { key: "cancelled_order_count", label: "ออเดอร์ยกเลิก", kind: "int" },
  { key: "paid_amount", label: "รับชำระแล้ว", kind: "money" },
  { key: "remaining_amount", label: "ค้างชำระ", kind: "money" },
  { key: "collection_rate", label: "% เก็บเงินได้", kind: "pct", better: "higher", title: "รับชำระแล้ว ÷ ยอดขาย" },
];

// Quotation outcome buckets — disjoint, they add up to quote_count
const STATUS_SEGMENTS = [
  { key: "won", label: "ได้งาน", color: "bg-green-500 text-white" },
  { key: "open", label: "รอผล", color: "bg-sky-200 text-sky-900" },
  { key: "stale", label: "ค้าง/หมดอายุ", color: "bg-amber-300 text-amber-900" },
  { key: "lost", label: "ไม่ได้งาน", color: "bg-gray-400 text-white" },
] as const;

const statusCounts = (s: Seller): Record<(typeof STATUS_SEGMENTS)[number]["key"], number> => ({
  won: s.approved_count,
  open: Math.max(0, s.draft_count + s.sent_count - s.expired_count - s.stale_count),
  stale: s.stale_count + s.expired_count,
  lost: s.rejected_count + s.cancelled_count,
});

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const PRESETS: { label: string; range: () => [Date, Date] }[] = [
  { label: "เดือนนี้", range: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), 1), n]; } },
  { label: "เดือนก่อน", range: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 0)]; } },
  { label: "3 เดือน", range: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth() - 2, 1), n]; } },
  { label: "ปีนี้", range: () => { const n = new Date(); return [new Date(n.getFullYear(), 0, 1), n]; } },
];

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${THAI_MONTHS[m - 1]} ${String(y + 543).slice(-2)}`;
};

const fmtMoney = (v: number) => Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (v: number) => Number(v).toLocaleString("th-TH");
const fmtPct = (v: Rate) => (v === null || v === undefined ? "-" : `${Number(v).toFixed(1)}%`);

const formatCell = (v: unknown, kind: Column["kind"]) => {
  if (v === null || v === undefined) return "-";
  switch (kind) {
    case "money": return fmtMoney(Number(v));
    case "pct": return fmtPct(Number(v));
    case "days": return `${Number(v).toFixed(1)} วัน`;
    case "dec": return Number(v).toFixed(1);
    default: return fmtInt(Number(v));
  }
};

export default function SalesBySellerPage() {
  const { token } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [restricted, setRestricted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return localDate(d); });
  const [to, setTo] = useState(() => localDate(new Date()));
  const [tab, setTab] = useState<"quote" | "sales">("quote");
  const [sortKey, setSortKey] = useState<SortKey>("total_sales");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.get<{ sellers: Seller[]; summary: Summary; trend: TrendItem[]; restricted: boolean }>(
        `/reports/sales-by-seller?from=${from}&to=${to}`, token
      );
      setSellers(data.sellers);
      setSummary(data.summary);
      setTrend(data.trend);
      setRestricted(data.restricted);
    } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [token, from, to]);

  const sorted = useMemo(() => {
    const val = (s: Seller) => {
      const v = s[sortKey];
      return v === null || v === undefined ? -Infinity : typeof v === "string" ? v : Number(v);
    };
    return [...sellers].sort((a, b) => {
      const av = val(a), bv = val(b);
      const cmp = typeof av === "string" || typeof bv === "string"
        ? String(av).localeCompare(String(bv), "th")
        : av - bv;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [sellers, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const selected = sellers.find((s) => s.id === selectedId) ?? null;
  const selectedTrend = trend.filter((t) => t.seller_id === selectedId);
  const maxTrendSales = Math.max(1, ...selectedTrend.map((t) => Number(t.total)));
  const grandSales = summary?.total_sales ?? 0;
  const columns = tab === "quote" ? QUOTE_COLUMNS : SALES_COLUMNS;

  // Compare a seller's rate against the team figure; returns null when not comparable
  const vsTeam = (col: Column, v: unknown): "good" | "bad" | null => {
    if (!col.better || !summary || v === null || v === undefined || sellers.length < 2) return null;
    const team = summary[col.key as keyof Summary];
    if (team === null || team === undefined) return null;
    const diff = Number(v) - Number(team);
    if (Math.abs(diff) < 0.05) return null;
    return (diff > 0) === (col.better === "higher") ? "good" : "bad";
  };

  const handleExport = () => exportToExcel(
    sorted.map((s, i) => ({
      ...s,
      rank: i + 1,
      share: grandSales > 0 ? Number(((Number(s.total_sales) / grandSales) * 100).toFixed(1)) : 0,
    })) as unknown as Record<string, unknown>[],
    [
      { header: "#", key: "rank", width: 5 },
      { header: "ผู้ขาย", key: "name", width: 20 },
      ...[...QUOTE_COLUMNS, ...SALES_COLUMNS].map((c) => ({
        header: c.kind === "pct" ? c.label.replace("% ", "") + " (%)" : c.label,
        key: c.key as string,
        width: c.kind === "money" ? 18 : 14,
        format: (v: unknown) => (v === null || v === undefined ? "" : Number(v)),
      })),
      { header: "มูลค่าเสนอรวม", key: "quote_value", width: 18, format: (v) => Number(v) },
      { header: "มูลค่าอนุมัติ", key: "approved_value", width: 18, format: (v) => Number(v) },
      { header: "ลูกค้าที่เสนอราคา", key: "quoted_customers", width: 14 },
      { header: "สัดส่วนยอดขาย (%)", key: "share", width: 14 },
    ],
    `ประสิทธิภาพผู้ขาย_${from}_${to}`,
    "ประสิทธิภาพผู้ขาย"
  );

  return (
    <>
      <Header title="รายงานประสิทธิภาพผู้ขาย" />
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">จากวันที่</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">ถึงวันที่</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const [f, t] = p.range().map(localDate);
              const active = f === from && t === to;
              return (
                <button
                  key={p.label}
                  onClick={() => { setFrom(f); setTo(t); }}
                  className={`px-3 py-2 text-xs rounded-lg border ${active ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleExport}
            disabled={sellers.length === 0}
            className="ml-auto px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Excel
          </button>
        </div>

        {restricted && (
          <div className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2">
            แสดงเฉพาะข้อมูลของคุณ
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-12">กำลังโหลด...</div>
        ) : sellers.length === 0 || !summary ? (
          <div className="text-center text-gray-400 py-12">ไม่พบข้อมูลในช่วงเวลาที่เลือก</div>
        ) : (
          <>
            {/* KPI tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Kpi label="ใบเสนอราคา" value={fmtInt(summary.quote_count)} sub={`มูลค่า ${fmtMoney(summary.quote_value)}`} />
              <Kpi label="อัตราแปลงเป็นออเดอร์" value={fmtPct(summary.conversion_rate)} sub={`อนุมัติ ${fmtInt(summary.approved_count)} ใบ · มูลค่า ${fmtPct(summary.value_win_rate)}`} />
              <Kpi label="ค้างเกิน 30 วัน" value={fmtInt(summary.stale_count)} sub={`${fmtPct(summary.stale_rate)} · หมดอายุ ${fmtInt(summary.expired_count)} ใบ`} tone={summary.stale_count > 0 ? "warn" : undefined} />
              <Kpi label="ยกเลิก / ปฏิเสธ" value={`${fmtInt(summary.cancelled_count)} / ${fmtInt(summary.rejected_count)}`} sub={`อัตรายกเลิก ${fmtPct(summary.cancel_rate)} · ออเดอร์ยกเลิก ${fmtInt(summary.cancelled_order_count)}`} />
              <Kpi label="ยอดขาย" value={fmtMoney(summary.total_sales)} sub={`${fmtInt(summary.order_count)} ออเดอร์ · เฉลี่ย ${fmtMoney(summary.avg_per_order)}`} />
              <Kpi label="อัตราเก็บเงิน" value={fmtPct(summary.collection_rate)} sub={`ค้างชำระ ${fmtMoney(summary.remaining_amount)}`} />
              <Kpi label="วันเฉลี่ยถึงอนุมัติ" value={summary.avg_days_to_approve === null ? "-" : `${summary.avg_days_to_approve} วัน`} sub="นับจากวันเปิดใบเสนอราคา" />
              <Kpi label="ลูกค้าใหม่" value={fmtInt(summary.new_customers)} sub={`มูลค่ารอปิด ${fmtMoney(summary.pipeline_value)}`} />
            </div>

            {/* Quotation outcome per seller */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="mb-5">
                <h3 className="font-semibold text-gray-800">ใบเสนอราคาของแต่ละคน ได้งานกี่ %</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  เขียวยิ่งยาวยิ่งดี · เหลืองคือใบที่ค้างเกิน 30 วันหรือหมดอายุ ควรติดตาม
                </p>
              </div>
              <div className="space-y-5">
                {sorted.map((s) => {
                  const counts = statusCounts(s);
                  return (
                    <button key={s.id} onClick={() => setSelectedId(s.id === selectedId ? null : s.id)} className="w-full text-left group block">
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className={`font-medium ${s.id === selectedId ? "text-green-700" : "text-gray-800 group-hover:text-gray-900"}`}>{s.name}</span>
                        <span className="text-sm text-gray-500">ทั้งหมด {fmtInt(s.quote_count)} ใบ</span>
                      </div>
                      <div className="flex w-full h-8 gap-0.5 bg-gray-100 rounded-lg overflow-hidden text-xs font-semibold">
                        {s.quote_count > 0 && STATUS_SEGMENTS.map((seg) => {
                          const n = counts[seg.key];
                          if (n <= 0) return null;
                          const p = (n / s.quote_count) * 100;
                          return (
                            <div
                              key={seg.key}
                              className={`${seg.color} h-full flex items-center justify-center overflow-hidden`}
                              style={{ width: `${p}%` }}
                              title={`${seg.label}: ${fmtInt(n)} ใบ (${p.toFixed(1)}%)`}
                            >
                              {p >= 8 && `${Math.round(p)}%`}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-600">
                        {STATUS_SEGMENTS.map((seg) => (
                          <span key={seg.key} className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-sm ${seg.color}`} />
                            {seg.label} <span className="font-semibold text-gray-800">{fmtInt(counts[seg.key])}</span>
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Performance table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
                <div className="flex gap-2">
                  <TabButton active={tab === "quote"} onClick={() => setTab("quote")}>ใบเสนอราคา</TabButton>
                  <TabButton active={tab === "sales"} onClick={() => setTab("sales")}>ยอดขาย & การเก็บเงิน</TabButton>
                </div>
                <p className="text-xs text-gray-400">
                  คลิกหัวคอลัมน์เพื่อเรียง · คลิกชื่อเพื่อดูรายเดือน · <span className="text-green-600">▲</span>/<span className="text-red-600">▼</span> ดีกว่า/แย่กว่าค่าเฉลี่ยทีม
                </p>
              </div>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 border-y border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                      <SortTh label="ผู้ขาย" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} align="left" />
                      {columns.map((c) => (
                        <SortTh key={c.key} label={c.label} title={c.title} active={sortKey === c.key} dir={sortDir} onClick={() => toggleSort(c.key)} />
                      ))}
                      {tab === "sales" && <th className="text-right px-4 py-3 font-medium text-gray-600">สัดส่วน</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map((s, i) => (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
                        className={`cursor-pointer ${s.id === selectedId ? "bg-green-50" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                        {columns.map((c) => {
                          const v = s[c.key];
                          const cmp = vsTeam(c, v);
                          return (
                            <td key={c.key} className={`px-4 py-3 text-right ${c.key === "total_sales" ? "font-semibold text-gray-800" : "text-gray-600"}`}>
                              {formatCell(v, c.kind)}
                              {cmp && <span className={`ml-1 text-xs ${cmp === "good" ? "text-green-600" : "text-red-600"}`}>{cmp === "good" ? "▲" : "▼"}</span>}
                            </td>
                          );
                        })}
                        {tab === "sales" && (
                          <td className="px-4 py-3 text-right text-gray-600">
                            {grandSales > 0 ? ((Number(s.total_sales) / grandSales) * 100).toFixed(1) : 0}%
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr className="font-semibold">
                      <td className="px-4 py-3" colSpan={2}>รวมทีม</td>
                      {columns.map((c) => {
                        const v = summary[c.key as keyof Summary];
                        return <td key={c.key} className="px-4 py-3 text-right">{v === undefined ? "-" : formatCell(v, c.kind)}</td>;
                      })}
                      {tab === "sales" && <td className="px-4 py-3 text-right">100%</td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Seller monthly detail */}
            {selected && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-baseline justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">รายเดือน: {selected.name}</h3>
                  <button onClick={() => setSelectedId(null)} className="text-xs text-gray-400 hover:text-gray-600">ปิด ✕</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-sm">
                  <MiniStat label="มูลค่าเสนอ" value={fmtMoney(selected.quote_value)} />
                  <MiniStat label="มูลค่าอนุมัติ" value={fmtMoney(selected.approved_value)} />
                  <MiniStat label="มูลค่าที่เสีย (ปฏิเสธ/ยกเลิก)" value={fmtMoney(selected.lost_value)} />
                  <MiniStat label="ลูกค้าที่เสนอราคา" value={`${fmtInt(selected.quoted_customers)} ราย`} />
                </div>
                {selectedTrend.length === 0 ? (
                  <div className="text-sm text-gray-400">ไม่มีข้อมูลรายเดือน</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                      <thead className="border-b border-gray-200">
                        <tr className="text-gray-600">
                          <th className="text-left py-2 pr-4 font-medium">เดือน</th>
                          <th className="text-right py-2 px-4 font-medium">ใบเสนอราคา</th>
                          <th className="text-right py-2 px-4 font-medium">อนุมัติ</th>
                          <th className="text-right py-2 px-4 font-medium">% แปลง</th>
                          <th className="text-right py-2 px-4 font-medium">ยกเลิก</th>
                          <th className="text-right py-2 px-4 font-medium">ออเดอร์</th>
                          <th className="text-right py-2 px-4 font-medium">ยอดขาย</th>
                          <th className="py-2 pl-4 w-1/3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedTrend.map((t) => (
                            <tr key={t.month}>
                              <td className="py-2 pr-4 text-gray-700">{monthLabel(t.month)}</td>
                              <td className="py-2 px-4 text-right text-gray-600">{fmtInt(t.quote_count)}</td>
                              <td className="py-2 px-4 text-right text-gray-600">{fmtInt(t.approved_count)}</td>
                              <td className="py-2 px-4 text-right text-gray-600">{t.quote_count > 0 ? fmtPct((t.approved_count / t.quote_count) * 100) : "-"}</td>
                              <td className="py-2 px-4 text-right text-gray-600">{fmtInt(t.cancelled_count)}</td>
                              <td className="py-2 px-4 text-right text-gray-600">{fmtInt(t.order_count)}</td>
                              <td className="py-2 px-4 text-right font-semibold text-gray-800">{fmtMoney(t.total)}</td>
                              <td className="py-2 pl-4">
                                <div className="w-full h-2.5">
                                  <div className="h-2.5 rounded-r bg-green-500" style={{ width: `${(Number(t.total) / maxTrendSales) * 100}%` }} title={fmtMoney(t.total)} />
                                </div>
                              </td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Metric definitions */}
            <details className="bg-white rounded-xl border border-gray-200 p-5 text-sm text-gray-600">
              <summary className="cursor-pointer font-semibold text-gray-800">คำอธิบายตัวชี้วัด</summary>
              <ul className="mt-3 space-y-1.5 list-disc pl-5">
                <li><b>ผู้ขาย</b> คือผู้สร้างใบเสนอราคา ออเดอร์ที่เกิดจากใบเสนอราคาจะนับให้ผู้สร้างใบเสนอราคา (ไม่ใช่ผู้กดอนุมัติ)</li>
                <li>ตัวชี้วัดใบเสนอราคา นับจากใบที่ <b>เปิดในช่วงวันที่ที่เลือก</b> และใช้สถานะปัจจุบันของใบ</li>
                <li>ยอดขาย/การเก็บเงิน นับจากออเดอร์ที่สร้างในช่วงวันที่ (ไม่รวมออเดอร์ที่ยกเลิก)</li>
                <li><b>% แปลงเป็นออเดอร์</b> = อนุมัติ ÷ ใบเสนอราคาทั้งหมด</li>
                <li><b>% ชนะ</b> = อนุมัติ ÷ ใบที่มีผลแล้ว (อนุมัติ + ปฏิเสธ + ยกเลิก + หมดอายุ) — ไม่รวมใบที่ยังรอผล</li>
                <li><b>ค้าง &gt;30 วัน</b> = ใบสถานะร่าง/ส่งแล้ว ที่เปิดมาเกิน 30 วัน และยังไม่หมดอายุ ควรติดตามหรือปิดสถานะ</li>
                <li><b>หมดอายุ</b> = ใบที่ยังไม่ปิดและเลยวันยืนราคาแล้ว</li>
                <li><b>วันเฉลี่ยถึงอนุมัติ</b> = ระยะเวลาจากวันเปิดใบเสนอราคาถึงวันที่อนุมัติ (สร้างออเดอร์)</li>
                <li><b>% เก็บเงินได้</b> = ยอดรับชำระแล้ว ÷ ยอดขายของออเดอร์ในช่วงเวลา</li>
              </ul>
            </details>
          </>
        )}
      </div>
    </>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warn" }) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${tone === "warn" ? "border-amber-200" : "border-gray-200"}`}>
      <div className="text-xs text-gray-500 flex items-center gap-1">
        {tone === "warn" && <span className="text-amber-500" aria-hidden>⚠</span>}
        {label}
      </div>
      <div className="text-xl font-bold text-gray-800 mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold text-gray-800">{value}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-lg border ${active ? "bg-green-50 border-green-200 text-green-700 font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
    >
      {children}
    </button>
  );
}

function SortTh({ label, title, active, dir, onClick, align = "right" }: {
  label: string; title?: string; active: boolean; dir: "asc" | "desc"; onClick: () => void; align?: "left" | "right";
}) {
  return (
    <th
      onClick={onClick}
      title={title}
      className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900 ${align === "left" ? "text-left" : "text-right"} ${active ? "text-green-700" : "text-gray-600"}`}
    >
      {label}{active && <span className="ml-1 text-xs">{dir === "asc" ? "↑" : "↓"}</span>}
      {title && <span className="ml-0.5 text-gray-300">ⓘ</span>}
    </th>
  );
}
