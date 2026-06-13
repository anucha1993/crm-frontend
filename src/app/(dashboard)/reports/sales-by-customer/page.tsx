"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";
import Link from "next/link";

interface CustomerRow {
  id: number;
  code: string;
  name: string;
  level_name: string;
  level_color: string;
  order_count: number;
  delivery_count: number;
  total_sales: string;
  total_paid: string;
  total_remaining: string;
}

export default function SalesByCustomerPage() {
  const { token } = useAuth();
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"total_sales" | "order_count">("total_sales");

  const fetchData = () => {
    if (!token) return;
    setLoading(true);
    api.get<{ customers: CustomerRow[] }>(`/reports/sales-by-customer?from=${from}&to=${to}`, token)
      .then((d) => setCustomers(d.customers))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [token]);

  const fmt = (v: string | number) => Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });

  const sorted = [...customers].sort((a, b) => Number(b[sortBy]) - Number(a[sortBy]));
  const grandTotal = customers.reduce((s, c) => s + Number(c.total_sales), 0);
  const grandPaid = customers.reduce((s, c) => s + Number(c.total_paid), 0);
  const grandRemaining = customers.reduce((s, c) => s + Number(c.total_remaining), 0);
  const grandOrders = customers.reduce((s, c) => s + c.order_count, 0);
  const grandDeliveries = customers.reduce((s, c) => s + Number(c.delivery_count || 0), 0);

  return (
    <>
      <Header title="ยอดขายตามลูกค้า" />
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">จากวันที่</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">ถึงวันที่</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg" />
            </div>
            <button onClick={fetchData} className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">ค้นหา</button>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setSortBy("total_sales")} className={`px-3 py-1 text-xs rounded-full border ${sortBy === "total_sales" ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 text-gray-500"}`}>เรียงตามยอดขาย</button>
              <button onClick={() => setSortBy("order_count")} className={`px-3 py-1 text-xs rounded-full border ${sortBy === "order_count" ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 text-gray-500"}`}>เรียงตามจำนวน</button>
              <button
                onClick={() => exportToExcel(
                  sorted.map((c, i) => ({ ...c, rank: i + 1, pct: grandTotal > 0 ? ((Number(c.total_sales) / grandTotal) * 100).toFixed(1) + '%' : '0%' })) as unknown as Record<string, unknown>[],
                  [
                    { header: '#', key: 'rank', width: 5 },
                    { header: 'รหัส', key: 'code', width: 12 },
                    { header: 'ชื่อลูกค้า', key: 'name', width: 25 },
                    { header: 'ระดับ', key: 'level_name', width: 12 },
                    { header: 'จำนวนออเดอร์', key: 'order_count', width: 15 },
                    { header: 'จำนวนใบส่งของ', key: 'delivery_count', width: 15 },
                    { header: 'ยอดขาย', key: 'total_sales', width: 18, format: (v) => Number(v) },
                    { header: 'ชำระแล้ว', key: 'total_paid', width: 18, format: (v) => Number(v) },
                    { header: 'ค้างชำระ', key: 'total_remaining', width: 18, format: (v) => Number(v) },
                    { header: 'สัดส่วน', key: 'pct', width: 10 },
                  ],
                  `ยอดขายตามลูกค้า_${from}_${to}`,
                  'ยอดขายตามลูกค้า'
                )}
                disabled={sorted.length === 0}
                className="px-4 py-1 text-xs bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Excel
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">กำลังโหลด...</div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">ลูกค้าทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-800">{customers.length} <span className="text-sm font-normal text-gray-400">ราย</span></p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">ยอดขายรวม</p>
                <p className="text-2xl font-bold text-gray-800">฿{fmt(grandTotal)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">ชำระแล้ว</p>
                <p className="text-2xl font-bold text-green-600">฿{fmt(grandPaid)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">ค้างชำระ</p>
                <p className="text-2xl font-bold text-red-600">฿{fmt(grandRemaining)}</p>
              </div>
            </div>

            {/* Top 5 chart */}
            {sorted.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 10 ลูกค้า</h3>
                <div className="space-y-2">
                  {sorted.slice(0, 10).map((c, i) => {
                    const pct = grandTotal > 0 ? (Number(c.total_sales) / grandTotal) * 100 : 0;
                    return (
                      <div key={c.id} className="flex items-center gap-3">
                        <span className="text-sm text-gray-400 w-6 text-right">{i + 1}.</span>
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.level_color }} />
                        <span className="text-sm text-gray-700 w-40 truncate">{c.name}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-28 text-right">฿{fmt(c.total_sales)}</span>
                        <span className="text-xs text-gray-400 w-12 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-center px-4 py-3 font-medium text-gray-500 w-12">#</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">รหัส</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">ชื่อลูกค้า</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">ระดับ</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">จำนวนออเดอร์</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">จำนวนใบส่งของ</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">ยอดขาย</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">ชำระแล้ว</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">ค้างชำระ</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">สัดส่วน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map((c, i) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-center text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 text-gray-500">{c.code}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/customers/${c.id}`} className="font-medium text-green-700 hover:underline">{c.name}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: c.level_color + "20", color: c.level_color }}>{c.level_name}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">{c.order_count}</td>
                      <td className="px-4 py-2.5 text-right">{c.delivery_count ?? 0}</td>
                      <td className="px-4 py-2.5 text-right font-medium">฿{fmt(c.total_sales)}</td>
                      <td className="px-4 py-2.5 text-right text-green-600">฿{fmt(c.total_paid)}</td>
                      <td className="px-4 py-2.5 text-right text-red-600">฿{fmt(c.total_remaining)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{grandTotal > 0 ? ((Number(c.total_sales) / grandTotal) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">ไม่พบข้อมูล</td></tr>
                  )}
                </tbody>
                {sorted.length > 0 && (
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td colSpan={4} className="px-4 py-3">รวมทั้งหมด</td>
                      <td className="px-4 py-3 text-right">{grandOrders}</td>
                      <td className="px-4 py-3 text-right">{grandDeliveries}</td>
                      <td className="px-4 py-3 text-right">฿{fmt(grandTotal)}</td>
                      <td className="px-4 py-3 text-right text-green-600">฿{fmt(grandPaid)}</td>
                      <td className="px-4 py-3 text-right text-red-600">฿{fmt(grandRemaining)}</td>
                      <td className="px-4 py-3 text-right">100%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
