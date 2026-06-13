"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Order {
  id: number;
  order_number: string;
  quotation: { id: number; quotation_number: string } | null;
  customer: { id: number; name: string; code: string } | null;
  status: string;
  delivery_status: string;
  total: string;
  paid_amount: string;
  remaining_amount: string;
  creator: { id: number; name: string } | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "รอดำเนินการ", color: "bg-yellow-50 text-yellow-700" },
  in_progress: { label: "อยู่ระหว่างดำเนินการ", color: "bg-blue-50 text-blue-700" },
  completed: { label: "คำสั่งซื้อสำเร็จ", color: "bg-green-50 text-green-700" },
  cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600" },
};

const DELIVERY_STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  not_delivered: { label: "ยังไม่จัดส่ง", color: "bg-gray-50 text-gray-600", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4" },
  partially_delivered: { label: "จัดส่งบางส่วน", color: "bg-yellow-50 text-yellow-700", icon: "M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" },
  fully_delivered: { label: "จัดส่งครบแล้ว", color: "bg-green-50 text-green-700", icon: "M5 13l4 4L19 7" },
  cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600", icon: "M6 18L18 6M6 6l12 12" },
};

export default function OrdersPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      params.set("per_page", "10");
      params.set("page", page.toString());
      const data = await api.get<{ data: Order[]; last_page: number; total: number }>(`/orders?${params}`, token);
      setOrders(data.data);
      setLastPage(data.last_page);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, search, filterStatus, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Sync status filter with URL query (sidebar menu navigation)
  useEffect(() => {
    const urlStatus = searchParams.get("status") || "";
    setFilterStatus((prev) => (prev !== urlStatus ? urlStatus : prev));
    setPage(1);
  }, [searchParams]);

  const formatCurrency = (v: string | number) =>
    Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });

  const getPaymentPercent = (order: Order) => {
    const total = Number(order.total);
    const paid = Number(order.paid_amount);
    if (total <= 0) return 0;
    return Math.min(100, Math.round((paid / total) * 100));
  };

  return (
    <>
      <Header title="คำสั่งซื้อ" />
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
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-gray-400">ไม่พบคำสั่งซื้อ</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">เลขที่คำสั่งซื้อ</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">ใบเสนอราคา</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">ลูกค้า</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">สถานะ</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">การจัดส่ง</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">ยอดรวม</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">การชำระเงิน</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">วันที่สร้าง</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((o) => {
                    const st = STATUS_MAP[o.status] || STATUS_MAP.pending;
                    const percent = getPaymentPercent(o);
                    return (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <button onClick={() => window.open(`/orders/${o.id}`, '_blank')} className="font-mono text-xs text-green-700 hover:underline">
                            {o.order_number}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          {o.quotation ? (
                            <button onClick={() => window.open(`/quotations/${o.quotation!.id}`, '_blank')} className="font-mono text-xs text-blue-600 hover:underline">
                              {o.quotation.quotation_number}
                            </button>
                          ) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-800">{o.customer?.name || "-"}</div>
                          <div className="text-xs text-gray-400">{o.customer?.code}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="px-5 py-4">
                          {(() => {
                            const ds = DELIVERY_STATUS_MAP[o.delivery_status] || DELIVERY_STATUS_MAP.not_delivered;
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ds.color}`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ds.icon} /></svg>
                                {ds.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-gray-800">{formatCurrency(o.total)}</td>
                        <td className="px-5 py-4">
                          <div className="w-32">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-500">{formatCurrency(o.paid_amount)}</span>
                              <span className={`font-medium ${percent === 100 ? 'text-green-600' : 'text-gray-500'}`}>{percent}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${percent === 100 ? 'bg-green-500' : percent > 0 ? 'bg-blue-500' : 'bg-gray-200'}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-500 text-xs">{formatDate(o.created_at)}</td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => window.open(`/orders/${o.id}`, '_blank')} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="ดูรายละเอียด">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
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
