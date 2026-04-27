"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface InvoiceItem {
  id: number;
  invoice_number: string;
  order_id: number;
  customer_id: number;
  order: { id: number; order_number: string; customer: { id: number; name: string; code: string } | null } | null;
  creator: { id: number; name: string } | null;
  total: string;
  status: string;
  issue_date: string;
  created_at: string;
}

interface InvoiceSummary {
  total_issued: number;
  total_amount: number;
  total_cancelled: number;
  cancelled_amount: number;
}

interface InvoiceData {
  invoices: InvoiceItem[];
  summary: InvoiceSummary;
  by_month: Record<string, { count: number; total: number }>;
}

export default function InvoiceReportPage() {
  const { token } = useAuth();
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchData = () => {
    if (!token) return;
    setLoading(true);
    api.get<InvoiceData>(`/reports/invoices?from=${from}&to=${to}`, token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [token]);

  const fmt = (v: string | number) => Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });
  const formatDate = (d: string) => new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });

  const filteredInvoices = data?.invoices.filter((inv) => statusFilter === "all" || inv.status === statusFilter) || [];

  return (
    <>
      <Header title="รายงานใบกำกับภาษี" />
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
            <button
              onClick={() => {
                if (!data) return;
                const exportData = filteredInvoices.map((inv) => ({
                  invoice_number: inv.invoice_number,
                  order_number: inv.order?.order_number || '-',
                  customer_name: inv.order?.customer?.name || '-',
                  total: inv.total,
                  status: inv.status,
                  issue_date: inv.issue_date,
                }));
                exportToExcel(
                  exportData as unknown as Record<string, unknown>[],
                  [
                    { header: 'เลขที่ใบกำกับ', key: 'invoice_number', width: 18 },
                    { header: 'เลขที่คำสั่งซื้อ', key: 'order_number', width: 18 },
                    { header: 'ลูกค้า', key: 'customer_name', width: 25 },
                    { header: 'มูลค่า', key: 'total', width: 15, format: (v) => Number(v) },
                    { header: 'สถานะ', key: 'status', width: 12, format: (v) => v === 'cancelled' ? 'ยกเลิก' : 'ออกแล้ว' },
                    { header: 'วันที่ออก', key: 'issue_date', width: 15, format: (v) => v ? new Date(v as string).toLocaleDateString('th-TH') : '' },
                  ],
                  `ใบกำกับภาษี_${from}_${to}`,
                  'ใบกำกับภาษี'
                );
              }}
              disabled={!data || filteredInvoices.length === 0}
              className="ml-auto px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">กำลังโหลด...</div>
        ) : data ? (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">ออกใบกำกับภาษี</p>
                <p className="text-2xl font-bold text-gray-800">{data.summary.total_issued} <span className="text-sm font-normal text-gray-400">ใบ</span></p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">มูลค่ารวม</p>
                <p className="text-2xl font-bold text-green-600">฿{fmt(data.summary.total_amount)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">ยกเลิก</p>
                <p className="text-2xl font-bold text-red-600">{data.summary.total_cancelled} <span className="text-sm font-normal text-gray-400">ใบ</span></p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">มูลค่ายกเลิก</p>
                <p className="text-2xl font-bold text-red-400">฿{fmt(data.summary.cancelled_amount)}</p>
              </div>
            </div>

            {/* By month chart */}
            {Object.keys(data.by_month).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">ใบกำกับภาษีรายเดือน</h3>
                <div className="space-y-2">
                  {Object.entries(data.by_month).map(([month, m]) => {
                    const maxAmt = Math.max(...Object.values(data.by_month).map((x) => Number(x.total)), 1);
                    const pct = (Number(m.total) / maxAmt) * 100;
                    return (
                      <div key={month} className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 w-20">{month}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-28 text-right">฿{fmt(m.total)}</span>
                        <span className="text-xs text-gray-400 w-12 text-right">{m.count} ใบ</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status filter + Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                <h3 className="font-semibold text-gray-800">รายการใบกำกับภาษี</h3>
                <div className="ml-auto flex gap-2">
                  {["all", "issued", "cancelled"].map((s) => (
                    <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 text-xs rounded-full border transition-colors ${statusFilter === s ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                      {s === "all" ? "ทั้งหมด" : s === "issued" ? "ออกแล้ว" : "ยกเลิก"}
                    </button>
                  ))}
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">เลขที่ใบกำกับ</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">เลขที่คำสั่งซื้อ</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">ลูกค้า</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">มูลค่า</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-500">สถานะ</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">วันที่ออก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-green-700">{inv.invoice_number}</td>
                      <td className="px-4 py-2.5 text-gray-600">{inv.order?.order_number || '-'}</td>
                      <td className="px-4 py-2.5">{inv.order?.customer?.name || '-'}</td>
                      <td className="px-4 py-2.5 text-right font-medium">฿{fmt(inv.total)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inv.status === "cancelled" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                          {inv.status === "cancelled" ? "ยกเลิก" : "ออกแล้ว"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{formatDate(inv.issue_date || inv.created_at)}</td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">ไม่พบรายการ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-400 py-12">ไม่สามารถโหลดข้อมูลได้</div>
        )}
      </div>
    </>
  );
}
