"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface ProductRow {
  product_id: number;
  product_code: string;
  product_name: string;
  category_name: string | null;
  unit: string;
  total_qty: number;
  total_amount: string;
  order_count: number;
}

export default function SalesByProductPage() {
  const { token } = useAuth();
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"total_amount" | "total_qty" | "order_count">("total_amount");

  const fetchData = () => {
    if (!token) return;
    setLoading(true);
    api.get<{ products: ProductRow[] }>(`/reports/sales-by-product?from=${from}&to=${to}`, token)
      .then((d) => setProducts(d.products))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [token]);

  const fmt = (v: string | number) => Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });

  // Laravel may return numeric columns as strings; coerce to Number before math
  // (otherwise `s + p.total_qty` does string concatenation and prints
  // "03273.003898.001711.00..." instead of a real sum).
  const sorted = [...products].sort((a, b) => Number(b[sortBy]) - Number(a[sortBy]));
  const grandAmount = products.reduce((s, p) => s + Number(p.total_amount), 0);
  const grandQty = products.reduce((s, p) => s + Number(p.total_qty), 0);
  const grandOrders = products.reduce((s, p) => s + Number(p.order_count), 0);

  return (
    <>
      <Header title="ยอดขายตามสินค้า" />
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
              <button onClick={() => setSortBy("total_amount")} className={`px-3 py-1 text-xs rounded-full border ${sortBy === "total_amount" ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 text-gray-500"}`}>ยอดขาย</button>
              <button onClick={() => setSortBy("total_qty")} className={`px-3 py-1 text-xs rounded-full border ${sortBy === "total_qty" ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 text-gray-500"}`}>จำนวน</button>
              <button onClick={() => setSortBy("order_count")} className={`px-3 py-1 text-xs rounded-full border ${sortBy === "order_count" ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 text-gray-500"}`}>ออเดอร์</button>
              <button
                onClick={() => exportToExcel(
                  sorted.map((p, i) => ({ ...p, rank: i + 1, pct: grandAmount > 0 ? ((Number(p.total_amount) / grandAmount) * 100).toFixed(1) + '%' : '0%' })) as unknown as Record<string, unknown>[],
                  [
                    { header: '#', key: 'rank', width: 5 },
                    { header: 'รหัส', key: 'product_code', width: 12 },
                    { header: 'ชื่อสินค้า', key: 'product_name', width: 30 },
                    { header: 'หมวดหมู่', key: 'category_name', width: 15 },
                    { header: 'จำนวน', key: 'total_qty', width: 12 },
                    { header: 'ยอดขาย', key: 'total_amount', width: 18, format: (v) => Number(v) },
                    { header: 'ออเดอร์', key: 'order_count', width: 12 },
                    { header: 'สัดส่วน', key: 'pct', width: 10 },
                  ],
                  `ยอดขายตามสินค้า_${from}_${to}`,
                  'ยอดขายตามสินค้า'
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
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">สินค้าทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-800">{products.length} <span className="text-sm font-normal text-gray-400">รายการ</span></p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">ยอดขายรวม</p>
                <p className="text-2xl font-bold text-green-600">฿{fmt(grandAmount)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">จำนวนขายรวม</p>
                <p className="text-2xl font-bold text-gray-800">{grandQty.toLocaleString("th-TH")}</p>
              </div>
            </div>

            {/* Top 10 chart */}
            {sorted.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 10 สินค้า</h3>
                <div className="space-y-2">
                  {sorted.slice(0, 10).map((p, i) => {
                    const pct = grandAmount > 0 ? (Number(p.total_amount) / grandAmount) * 100 : 0;
                    return (
                      <div key={p.product_id} className="flex items-center gap-3">
                        <span className="text-sm text-gray-400 w-6 text-right">{i + 1}.</span>
                        <span className="text-sm text-gray-700 w-48 truncate" title={p.product_name}>{p.product_name}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-28 text-right">฿{fmt(p.total_amount)}</span>
                        <span className="text-xs text-gray-400 w-16 text-right">{Number(p.total_qty).toLocaleString("th-TH")} {p.unit}</span>
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
                    <th className="text-left px-4 py-3 font-medium text-gray-500">ชื่อสินค้า</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">หมวดหมู่</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">จำนวน</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">ยอดขาย</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">ออเดอร์</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">สัดส่วน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map((p, i) => (
                    <tr key={p.product_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-center text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 text-gray-500">{p.product_code}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{p.product_name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{p.category_name || "-"}</td>
                      <td className="px-4 py-2.5 text-right">{Number(p.total_qty).toLocaleString("th-TH")} {p.unit}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-green-700">฿{fmt(p.total_amount)}</td>
                      <td className="px-4 py-2.5 text-right">{p.order_count}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{grandAmount > 0 ? ((Number(p.total_amount) / grandAmount) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">ไม่พบข้อมูล</td></tr>
                  )}
                </tbody>
                {sorted.length > 0 && (
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td colSpan={4} className="px-4 py-3">รวมทั้งหมด</td>
                      <td className="px-4 py-3 text-right">{grandQty.toLocaleString("th-TH")}</td>
                      <td className="px-4 py-3 text-right text-green-700">฿{fmt(grandAmount)}</td>
                      <td className="px-4 py-3 text-right">{grandOrders}</td>
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
