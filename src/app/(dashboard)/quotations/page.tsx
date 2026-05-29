"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface Quotation {
  id: number;
  quotation_number: string;
  customer: { id: number; name: string; code: string } | null;
  shipping_address: { id: number; label: string | null; contact_name: string | null; phone: string | null; address: string } | null;
  status: string;
  subtotal: string;
  discount_amount: string;
  vat_rate: string;
  vat_amount: string;
  total: string;
  account_type?: 'cash' | 'tax' | null;
  valid_until?: string | null;
  creator: { id: number; name: string } | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "ร่าง", color: "bg-gray-100 text-gray-600" },
  sent: { label: "ส่งแล้ว", color: "bg-blue-50 text-blue-700" },
  approved: { label: "อนุมัติ", color: "bg-green-50 text-green-700" },
  rejected: { label: "ไม่อนุมัติ", color: "bg-red-50 text-red-600" },
  cancelled: { label: "ยกเลิก", color: "bg-orange-50 text-orange-600" },
};

export default function QuotationsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchQuotations = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      params.set("per_page", "10");
      params.set("page", page.toString());
      const data = await api.get<{ data: Quotation[]; last_page: number; total: number }>(`/quotations?${params}`, token);
      setQuotations(data.data);
      setLastPage(data.last_page);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, search, filterStatus, page]);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  const handleDelete = async (q: Quotation) => {
    if (!confirm(`ต้องการลบใบเสนอราคา "${q.quotation_number}" ?`)) return;
    try {
      await api.delete(`/quotations/${q.id}`, token!);
      fetchQuotations();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const handleDuplicate = async (q: Quotation) => {
    try {
      const data = await api.post<{ quotation: { id: number } }>(`/quotations/${q.id}/duplicate`, {}, token!);
      router.push(`/quotations/${data.quotation.id}`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const formatCurrency = (v: string | number) => {
    return Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <>
      <Header title="ใบเสนอราคา" />
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
                placeholder="ค้นหาเลขที่ / ลูกค้า..."
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
          <button
            onClick={() => router.push("/quotations/create")}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            สร้างใบเสนอราคา
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
          ) : quotations.length === 0 ? (
            <div className="p-12 text-center text-gray-400">ไม่พบใบเสนอราคา</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">เลขที่</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">ลูกค้า</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">ที่อยู่จัดส่ง</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">ประเภท</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">สถานะ</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">ยอดรวม</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">วันที่สร้าง</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {quotations.map((q) => {
                    const st = STATUS_MAP[q.status] || STATUS_MAP.draft;
                    return (
                      <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <button onClick={() => window.open(`/quotations/${q.id}`, '_blank')} className="font-mono text-xs text-green-700 hover:underline">
                            {q.quotation_number}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-800">{q.customer?.name || "-"}</div>
                          <div className="text-xs text-gray-400">{q.customer?.code}</div>
                        </td>
                        <td className="px-5 py-4 max-w-[260px]">
                          {q.shipping_address ? (
                            <div className="space-y-0.5">
                              {q.shipping_address.label && (
                                <div className="text-xs font-medium text-gray-700">{q.shipping_address.label}</div>
                              )}
                              <div className="text-xs text-gray-500 line-clamp-2" title={q.shipping_address.address}>
                                {q.shipping_address.address}
                              </div>
                              {(q.shipping_address.contact_name || q.shipping_address.phone) && (
                                <div className="text-xs text-gray-400">
                                  {q.shipping_address.contact_name}
                                  {q.shipping_address.contact_name && q.shipping_address.phone && " · "}
                                  {q.shipping_address.phone}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">ตามที่อยู่ลูกค้า</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {q.account_type === 'tax' ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">ออกใบกำกับ</span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">บิลเงินสด</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {(() => {
                            const expired = q.valid_until && new Date(q.valid_until) < new Date(new Date().toDateString()) && q.status !== 'cancelled' && q.status !== 'rejected';
                            return (
                              <div className="flex items-center gap-1">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                                {expired && <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">เลยกำหนดยืนราคา</span>}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-gray-800">{formatCurrency(q.total)}</td>
                        <td className="px-5 py-4 text-gray-500 text-xs">{formatDate(q.created_at)}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => window.open(`/quotations/${q.id}`, '_blank')} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => handleDuplicate(q)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="คัดลอก">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button onClick={() => handleDelete(q)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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
