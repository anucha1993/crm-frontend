"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import Link from "next/link";

interface DashboardData {
  summary: {
    monthly_orders: number;
    monthly_sales: number;
    monthly_payments: number;
    pending_payments: number;
    total_receivable: number;
    today_deliveries: number;
    new_customers: number;
    total_customers: number;
  };
  sales_trend: { month: string; total: number; count: number }[];
  order_statuses: Record<string, number>;
  payment_methods: { method: string; total: number; count: number }[];
  top_customers: { id: number; name: string; code: string; total_sales: number; order_count: number }[];
  top_products: { product_name: string; total_qty: number; total_amount: number }[];
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "รอดำเนินการ",
  in_progress: "ดำเนินการ",
  completed: "สำเร็จ",
  cancelled: "ยกเลิก",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนเงิน",
  pocket_money: "Pocket Money",
};

export default function DashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.get<DashboardData>("/reports/dashboard", token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const fmt = (v: number) => v.toLocaleString("th-TH", { minimumFractionDigits: 2 });
  const fmtShort = (v: number) => {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
    if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
    return v.toLocaleString("th-TH");
  };

  if (loading) return <><Header title="แดชบอร์ด" /><div className="p-12 text-center text-gray-400">กำลังโหลด...</div></>;
  if (!data) return <><Header title="แดชบอร์ด" /><div className="p-12 text-center text-gray-400">ไม่สามารถโหลดข้อมูลได้</div></>;

  const s = data.summary;
  const maxTrend = Math.max(...data.sales_trend.map(t => Number(t.total)), 1);

  return (
    <>
      <Header title="แดชบอร์ด" />
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">ยอดขายเดือนนี้</p>
                <p className="text-xl font-bold text-gray-800">{fmt(s.monthly_sales)}</p>
                <p className="text-xs text-gray-400 mt-1">{s.monthly_orders} คำสั่งซื้อ</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">ชำระเงินเดือนนี้</p>
                <p className="text-xl font-bold text-green-600">{fmt(s.monthly_payments)}</p>
                <p className="text-xs text-gray-400 mt-1">{s.pending_payments} รอยืนยัน</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">ยอดค้างชำระทั้งหมด</p>
                <p className={`text-xl font-bold ${s.total_receivable > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(s.total_receivable)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">จัดส่งวันนี้</p>
                <p className="text-xl font-bold text-gray-800">{s.today_deliveries} <span className="text-sm font-normal text-gray-400">รายการ</span></p>
                <p className="text-xs text-gray-400 mt-1">ลูกค้าใหม่ {s.new_customers} ราย</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">ยอดขาย 12 เดือน</h3>
            {data.sales_trend.length > 0 ? (
              <div className="flex gap-1 h-48">
                {data.sales_trend.map((t) => {
                  const h = (Number(t.total) / maxTrend) * 100;
                  const monthNum = parseInt(t.month.split("-")[1]);
                  const monthNames = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
                  return (
                    <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-gray-500 shrink-0">{fmtShort(Number(t.total))}</span>
                      <div className="flex-1 w-full flex items-end">
                        <div className="w-full bg-green-500 rounded-t transition-all" style={{ height: `${Math.max(h, 2)}%` }} title={`${t.month}: ${fmt(Number(t.total))} (${t.count} orders)`} />
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{monthNames[monthNum]}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">ยังไม่มีข้อมูล</div>
            )}
          </div>

          {/* Order Status Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">สถานะคำสั่งซื้อ</h3>
            <div className="space-y-3">
              {Object.entries(data.order_statuses).map(([status, count]) => {
                const total = Object.values(data.order_statuses).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{ORDER_STATUS_LABELS[status] || status}</span>
                      <span className="text-gray-800 font-medium">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${ORDER_STATUS_COLORS[status] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Methods */}
            {data.payment_methods.length > 0 && (
              <>
                <h3 className="font-semibold text-gray-800 mt-6 mb-3">ช่องทางชำระเงิน</h3>
                <div className="space-y-2">
                  {data.payment_methods.map((pm) => (
                    <div key={pm.method} className="flex justify-between text-sm">
                      <span className="text-gray-600">{METHOD_LABELS[pm.method] || pm.method}</span>
                      <span className="font-medium text-gray-800">{fmt(Number(pm.total))}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customers */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">ลูกค้ายอดขายสูงสุด</h3>
              <Link href="/reports/sales-by-customer" className="text-xs text-green-600 hover:underline">ดูทั้งหมด</Link>
            </div>
            {data.top_customers.length > 0 ? (
              <div className="space-y-3">
                {data.top_customers.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-300'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.code} / {c.order_count} คำสั่งซื้อ</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{fmt(Number(c.total_sales))}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีข้อมูล</p>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">สินค้ายอดขายสูงสุด</h3>
              <Link href="/reports/sales-by-product" className="text-xs text-green-600 hover:underline">ดูทั้งหมด</Link>
            </div>
            {data.top_products.length > 0 ? (
              <div className="space-y-3">
                {data.top_products.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-300'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.product_name}</p>
                      <p className="text-xs text-gray-400">{Number(p.total_qty).toLocaleString()} ชิ้น</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{fmt(Number(p.total_amount))}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีข้อมูล</p>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/reports/sales-by-seller", label: "ยอดขายตามผู้ขาย", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
            { href: "/reports/inactive-customers", label: "ลูกค้าไม่เคลื่อนไหว", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
            { href: "/reports/ar-aging", label: "ยอดค้างชำระ", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
            { href: "/reports/monthly-sales", label: "ยอดขายรายเดือน", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:bg-green-50/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-green-100 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 text-gray-500 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} /></svg>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-green-700">{link.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
