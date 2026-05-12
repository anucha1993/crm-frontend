"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface PendingRow {
  order_id: number;
  order_number: string;
  customer: { id: number; code: string; name: string; tax_id: string | null; phone: string | null } | null;
  total: number;
  paid_amount: number;
  last_paid_at: string | null;
  invoice_issued: boolean;
  invoice: { id: number; invoice_number: string; issue_date: string } | null;
}

interface Summary {
  total: number;
  issued: number;
  pending: number;
}

export default function PendingInvoicesPage() {
  const { token, accountType } = useAuth();
  const isCash = accountType === 'cash';
  const docLabel = isCash ? 'บิลเงินสด' : 'ใบกำกับภาษี';

  const [rows, setRows] = useState<PendingRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, issued: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [issuedFilter, setIssuedFilter] = useState<"" | "1" | "0">("");
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [issuing, setIssuing] = useState<number | null>(null);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (month) params.set("month", month);
      if (issuedFilter) params.set("issued", issuedFilter);
      const data = await api.get<{ data: PendingRow[]; summary: Summary }>(`/invoices/pending?${params}`, token);
      setRows(data.data);
      setSummary(data.summary);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, search, month, issuedFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("th-TH", { year: "numeric", month: "long" });
      opts.push({ value, label });
    }
    return opts;
  }, []);

  const formatCurrency = (v: number) => v.toLocaleString("th-TH", { minimumFractionDigits: 2 });

  const formatDateTime = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleString("th-TH", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const handleIssue = async (orderId: number) => {
    if (!token) return;
    if (!confirm(`ยืนยันการออก${docLabel}สำหรับคำสั่งซื้อนี้?`)) return;
    setIssuing(orderId);
    setError("");
    try {
      await api.post(`/orders/${orderId}/invoices`, {}, token);
      await fetchData();
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || `ออก${docLabel}ไม่สำเร็จ`);
    } finally {
      setIssuing(null);
    }
  };

  const handlePrint = (invoiceId: number) => {
    if (!token) return;
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/invoices/${invoiceId}/pdf?token=${token}`, '_blank');
  };

  return (
    <>
      <Header title={`รายการรอออก${docLabel}`} />
      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">ทั้งหมด (โอนครบแล้ว)</div>
            <div className="text-2xl font-bold text-gray-800">{summary.total}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">ออก{docLabel}แล้ว</div>
            <div className="text-2xl font-bold text-green-600">{summary.issued}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">ยังไม่ออก</div>
            <div className="text-2xl font-bold text-orange-600">{summary.pending}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="ค้นหาเลขคำสั่งซื้อ / ลูกค้า..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-72 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">ทุกเดือน</option>
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={issuedFilter}
              onChange={(e) => setIssuedFilter(e.target.value as "" | "1" | "0")}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">ทุกสถานะ</option>
              <option value="0">ยังไม่ออก</option>
              <option value="1">ออกแล้ว</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-gray-400">ไม่พบรายการที่ชำระครบ</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">วันที่ชำระครบล่าสุด</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">คำสั่งซื้อ</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">ลูกค้า</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">ยอดรวม</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">สถานะ{docLabel}</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">เลขที่{docLabel}</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r.order_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-gray-700 text-xs">{formatDateTime(r.last_paid_at)}</td>
                      <td className="px-5 py-4">
                        <button onClick={() => window.open(`/orders/${r.order_id}`, '_blank')} className="font-mono text-xs text-green-700 hover:underline">
                          {r.order_number}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-800">{r.customer?.name || "-"}</div>
                        <div className="text-xs text-gray-400">{r.customer?.code}{r.customer?.tax_id ? ` · ${r.customer.tax_id}` : ""}</div>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-gray-800">{formatCurrency(r.total)}</td>
                      <td className="px-5 py-4">
                        {r.invoice_issued ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">ออกแล้ว</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600">ยังไม่ออก</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {r.invoice ? (
                          <div>
                            <div className="font-mono text-xs text-gray-700">{r.invoice.invoice_number}</div>
                            <div className="text-xs text-gray-400">ออกเมื่อ {new Date(r.invoice.issue_date).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" })}</div>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {r.invoice ? (
                          <button onClick={() => handlePrint(r.invoice!.id)} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            พิมพ์ PDF
                          </button>
                        ) : (
                          <button
                            onClick={() => handleIssue(r.order_id)}
                            disabled={issuing === r.order_id}
                            className="px-3 py-1.5 text-xs text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                          >
                            {issuing === r.order_id ? "กำลังออก..." : `ออก${docLabel}`}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
