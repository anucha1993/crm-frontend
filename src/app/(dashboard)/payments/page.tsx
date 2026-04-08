"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface Payment {
  id: number;
  payment_number: string;
  method: string;
  amount: string;
  is_deposit: boolean;
  status: string;
  notes: string | null;
  reject_reason: string | null;
  slip_image: string | null;
  slip_verified: boolean;
  slip_status_code: string | null;
  slip_ref: string | null;
  sender_name: string | null;
  sender_bank: string | null;
  transfer_amount: string | null;
  transfer_date: string | null;
  order: { id: number; order_number: string } | null;
  customer: { id: number; name: string; code: string } | null;
  creator: { id: number; name: string } | null;
  approver: { id: number; name: string } | null;
  approved_at: string | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "รอยืนยัน", color: "bg-yellow-50 text-yellow-700" },
  approved: { label: "อนุมัติแล้ว", color: "bg-green-50 text-green-700" },
  rejected: { label: "ปฏิเสธ", color: "bg-red-50 text-red-600" },
};

const METHOD_MAP: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนเงิน",
  pocket_money: "Pocket Money",
};

export default function PaymentsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Slip preview
  const [previewSlip, setPreviewSlip] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:7000";

  const fetchPayments = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      params.set("per_page", "10");
      params.set("page", page.toString());
      const data = await api.get<{ data: Payment[]; last_page: number; total: number }>(`/payments?${params}`, token);
      setPayments(data.data);
      setLastPage(data.last_page);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, search, filterStatus, page]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const formatCurrency = (v: string | number) =>
    Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const handleApprove = async (payment: Payment) => {
    if (!token || !confirm("ต้องการอนุมัติการชำระเงินนี้?")) return;
    try {
      await api.post(`/payments/${payment.id}/approve`, {}, token);
      fetchPayments();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const handleReject = async (payment: Payment) => {
    const reason = prompt("ระบุเหตุผลในการปฏิเสธ:");
    if (!reason || !token) return;
    try {
      await api.post(`/payments/${payment.id}/reject`, { reason }, token);
      fetchPayments();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const handleResubmit = async (payment: Payment) => {
    if (!token) return;
    try {
      await api.post(`/payments/${payment.id}/resubmit`, {}, token);
      fetchPayments();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  return (
    <>
      <Header title="การชำระเงิน" />
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="ค้นหาเลขที่ชำระ, คำสั่งซื้อ, ลูกค้า..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
          <button
            onClick={() => router.push("/payments/scan")}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            สแกน QR ตรวจสอบ
          </button>
        </div>

        {/* Summary */}
        <div className="text-sm text-gray-500">ทั้งหมด {total} รายการ</div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center text-gray-400">ไม่พบรายการชำระเงิน</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">เลขที่</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">คำสั่งซื้อ</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">ลูกค้า</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">ช่องทาง</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">จำนวนเงิน</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">สลิป</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">สถานะ</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">วันที่</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => {
                    const st = STATUS_MAP[p.status] || STATUS_MAP.pending;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-700">{p.payment_number}</span>
                          {p.is_deposit && <span className="ml-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">มัดจำ</span>}
                        </td>
                        <td className="px-4 py-3">
                          {p.order ? (
                            <button
                              onClick={() => window.open(`/orders/${p.order!.id}`, '_blank')}
                              className="text-blue-600 hover:underline font-mono text-xs"
                            >
                              {p.order.order_number}
                            </button>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-800">{p.customer?.name || "-"}</div>
                          <div className="text-xs text-gray-400">{p.customer?.code}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{METHOD_MAP[p.method] || p.method}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          {p.slip_image ? (
                            <button
                              onClick={() => setPreviewSlip(`${apiUrl}/storage/${p.slip_image}`)}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              ดูสลิป
                            </button>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                          {p.slip_verified && <div className="text-[10px] text-green-600 mt-0.5">✓ ยืนยันแล้ว</div>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          <div>{formatDate(p.created_at)}</div>
                          <div className="text-gray-400">โดย {p.creator?.name}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {p.status === "pending" && (
                              <>
                                <button onClick={() => handleApprove(p)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="อนุมัติ">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </button>
                                <button onClick={() => handleReject(p)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ปฏิเสธ">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </>
                            )}
                            {p.status === "rejected" && (
                              <button onClick={() => handleResubmit(p)} className="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">ส่งใหม่</button>
                            )}
                            <button
                              onClick={() => window.open(`/orders/${p.order?.id}`, '_blank')}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="ดูคำสั่งซื้อ"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              ก่อนหน้า
            </button>
            <span className="px-3 py-2 text-sm text-gray-600">
              หน้า {page} / {lastPage}
            </span>
            <button
              onClick={() => setPage(Math.min(lastPage, page + 1))}
              disabled={page === lastPage}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        )}

        {/* Slip preview modal */}
        {previewSlip && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreviewSlip(null)}>
            <div className="relative max-w-lg max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setPreviewSlip(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSlip} alt="Slip" className="max-w-full max-h-[80vh] rounded-xl shadow-xl" />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
