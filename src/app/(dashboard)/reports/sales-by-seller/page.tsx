"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface Seller {
  id: number;
  name: string;
  order_count: number;
  total_sales: number;
  avg_per_order: number;
  customer_count: number;
}

interface TrendItem {
  seller_id: number;
  seller_name: string;
  month: string;
  total: number;
}

export default function SalesBySellerPage() {
  const { token } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.get<{ sellers: Seller[]; trend: TrendItem[] }>(
        `/reports/sales-by-seller?from=${from}&to=${to}`, token
      );
      setSellers(data.sellers);
      setTrend(data.trend);
    } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [token, from, to]);

  const fmt = (v: number) => Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });
  const grandTotal = sellers.reduce((s, x) => s + Number(x.total_sales), 0);

  return (
    <>
      <Header title="รายงานยอดขายตามผู้ขาย" />
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
          <div className="text-sm text-gray-500">
            ยอดขายรวม: <span className="font-bold text-gray-800">{fmt(grandTotal)} บาท</span>
          </div>
          <button
            onClick={() => exportToExcel(
              sellers.map((s, i) => ({ ...s, rank: i + 1, pct: grandTotal > 0 ? ((Number(s.total_sales) / grandTotal) * 100).toFixed(1) + '%' : '0%' })),
              [
                { header: '#', key: 'rank', width: 5 },
                { header: 'ผู้ขาย', key: 'name', width: 20 },
                { header: 'จำนวนคำสั่งซื้อ', key: 'order_count', width: 15 },
                { header: 'ยอดขายรวม', key: 'total_sales', width: 18, format: (v) => Number(v) },
                { header: 'เฉลี่ย/ออเดอร์', key: 'avg_per_order', width: 18, format: (v) => Number(v) },
                { header: 'จำนวนลูกค้า', key: 'customer_count', width: 15 },
                { header: 'สัดส่วน', key: 'pct', width: 10 },
              ],
              `ยอดขายตามผู้ขาย_${from}_${to}`,
              'ยอดขายตามผู้ขาย'
            )}
            disabled={sellers.length === 0}
            className="ml-auto px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Excel
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">กำลังโหลด...</div>
        ) : sellers.length === 0 ? (
          <div className="text-center text-gray-400 py-12">ไม่พบข้อมูลในช่วงเวลาที่เลือก</div>
        ) : (
          <>
            {/* Bar chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">เปรียบเทียบยอดขาย</h3>
              <div className="space-y-3">
                {sellers.map((s, i) => {
                  const pct = grandTotal > 0 ? (Number(s.total_sales) / grandTotal) * 100 : 0;
                  const colors = ["bg-green-500", "bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"];
                  return (
                    <div key={s.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{s.name}</span>
                        <span className="text-gray-600">{fmt(Number(s.total_sales))} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div className={`h-3 rounded-full ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">ผู้ขาย</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">คำสั่งซื้อ</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">ยอดขายรวม</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">เฉลี่ย/order</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">ลูกค้า</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">สัดส่วน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sellers.map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{s.order_count}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(Number(s.total_sales))}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(Number(s.avg_per_order))}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{s.customer_count}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{grandTotal > 0 ? ((Number(s.total_sales) / grandTotal) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr className="font-semibold">
                    <td className="px-4 py-3" colSpan={2}>รวม</td>
                    <td className="px-4 py-3 text-right">{sellers.reduce((a, b) => a + b.order_count, 0)}</td>
                    <td className="px-4 py-3 text-right">{fmt(grandTotal)}</td>
                    <td className="px-4 py-3 text-right">{sellers.length > 0 ? fmt(grandTotal / sellers.reduce((a, b) => a + b.order_count, 0) || 0) : '-'}</td>
                    <td className="px-4 py-3 text-right">{new Set(sellers.flatMap(s => [s.customer_count])).size > 0 ? '-' : '-'}</td>
                    <td className="px-4 py-3 text-right">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
