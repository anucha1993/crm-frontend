"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Invoice {
  id: number;
  invoice_number: string;
  status: string;
  issue_date: string;
  total: string;
  cancel_reason: string | null;
  order: { id: number; order_number: string } | null;
  customer: { id: number; name: string; code: string } | null;
  creator: { id: number; name: string } | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  issued: { label: "ออกแล้ว", color: "bg-green-50 text-green-700" },
  cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600" },
};

export default function InvoicesPage() {
  const { token, accountType } = useAuth();
  const isCash = accountType === 'cash';
  const docLabel = isCash ? 'บิลเงินสด' : 'ใบกำกับภาษี';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchInvoices = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      params.set("per_page", "10");
      params.set("page", page.toString());
      const data = await api.get<{ data: Invoice[]; last_page: number; total: number }>(`/invoices?${params}`, token);
      setInvoices(data.data);
      setLastPage(data.last_page);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, search, filterStatus, page]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const formatCurrency = (v: string | number) =>
    Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });

  const handlePrint = (invoiceId: number) => {
    if (!token) return;
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/invoices/${invoiceId}/pdf?token=${token}`, '_blank');
  };

  return (
    <>
      <Header title={docLabel} />
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="ค้นหาเลขที่ / คำสั่งซื้อ / ลูกค้า..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 pr-4 py-2 w-72 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">ทุกสถานะ</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center text-gray-400">ไม่พบ{docLabel}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">เลขที่{docLabel}</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">คำสั่งซื้อ</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">ลูกค้า</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">สถานะ</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">วันที่ออก</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">ยอดรวม</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">ผู้ออก</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv) => {
                    const st = STATUS_MAP[inv.status] || STATUS_MAP.issued;
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs text-gray-700">{inv.invoice_number}</span>
                        </td>
                        <td className="px-5 py-4">
                          {inv.order ? (
                            <button onClick={() => window.open(`/orders/${inv.order!.id}`, '_blank')} className="font-mono text-xs text-green-700 hover:underline">
                              {inv.order.order_number}
                            </button>
                          ) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-800">{inv.customer?.name || "-"}</div>
                          <div className="text-xs text-gray-400">{inv.customer?.code}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                          {inv.cancel_reason && (
                            <p className="text-xs text-red-400 mt-0.5 truncate max-w-[150px]" title={inv.cancel_reason}>{inv.cancel_reason}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-gray-500 text-xs">{formatDate(inv.issue_date)}</td>
                        <td className="px-5 py-4 text-right font-medium text-gray-800">{formatCurrency(inv.total)}</td>
                        <td className="px-5 py-4 text-gray-500 text-xs">{inv.creator?.name || "-"}</td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => handlePrint(inv.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="พิมพ์ PDF">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {lastPage > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">ทั้งหมด {total} รายการ</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">ก่อนหน้า</button>
                {Array.from({ length: lastPage }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === lastPage || Math.abs(p - page) <= 1)
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    typeof item === "string" ? (
                      <span key={`dot-${idx}`} className="px-2 text-sm text-gray-400">...</span>
                    ) : (
                      <button key={item} onClick={() => setPage(item)} className={`w-8 h-8 text-sm rounded-lg transition-colors ${page === item ? "bg-green-600 text-white" : "hover:bg-gray-50 border border-gray-200"}`}>{item}</button>
                    )
                  )}
                <button onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={page === lastPage} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">ถัดไป</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
