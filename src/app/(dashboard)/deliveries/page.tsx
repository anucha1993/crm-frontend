"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Delivery {
  id: number;
  delivery_number: string;
  order: { id: number; order_number: string } | null;
  customer: { id: number; name: string } | null;
  status: string;
  delivery_date: string;
  delivered_at: string | null;
  total_weight: string;
  suggested_vehicle: string | null;
  creator: { id: number; name: string } | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "รอจัดส่ง", color: "bg-yellow-50 text-yellow-700" },
  delivering: { label: "กำลังจัดส่ง", color: "bg-blue-50 text-blue-700" },
  delivered: { label: "จัดส่งแล้ว", color: "bg-green-50 text-green-700" },
  cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600" },
};

function getComputedStatus(delivery: Delivery): string {
  if (delivery.status === "delivered" || delivery.status === "cancelled") return delivery.status;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(delivery.delivery_date);
  dd.setHours(0, 0, 0, 0);
  return dd <= today ? "delivering" : "pending";
}

export default function DeliveriesPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchDeliveries = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      params.set("per_page", "10");
      params.set("page", page.toString());
      const data = await api.get<{ data: Delivery[]; last_page: number; total: number }>(`/deliveries?${params}`, token);
      setDeliveries(data.data);
      setLastPage(data.last_page);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, search, filterStatus, page]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      <Header title="ใบส่งสินค้า" />
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
                placeholder="ค้นหาเลขที่ใบส่งของ / คำสั่งซื้อ / ลูกค้า..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 pr-4 py-2 w-80 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
            onClick={() => window.open("/deliveries/scan", "_blank")}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            สแกน QR ยืนยันจัดส่ง
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
          ) : deliveries.length === 0 ? (
            <div className="p-12 text-center text-gray-400">ไม่พบใบส่งสินค้า</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">เลขที่ใบส่งของ</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">คำสั่งซื้อ</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">ลูกค้า</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">สถานะ</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">วันจัดส่ง</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">น้ำหนัก (กก.)</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">รถแนะนำ</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">วันที่สร้าง</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deliveries.map((d) => {
                    const computed = getComputedStatus(d);
                    const st = STATUS_MAP[computed] || STATUS_MAP.pending;
                    return (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <button onClick={() => window.open(`/deliveries/${d.id}`, '_blank')} className="font-mono text-xs text-green-700 hover:underline">
                            {d.delivery_number}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          {d.order ? (
                            <button onClick={() => window.open(`/orders/${d.order!.id}`, '_blank')} className="font-mono text-xs text-blue-600 hover:underline">
                              {d.order.order_number}
                            </button>
                          ) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-800">{d.customer?.name || "-"}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="px-5 py-4 text-gray-600 text-xs">{formatDate(d.delivery_date)}</td>
                        <td className="px-5 py-4 text-right text-gray-600">
                          {Number(d.total_weight) > 0 ? Number(d.total_weight).toLocaleString("th-TH", { maximumFractionDigits: 2 }) : "-"}
                        </td>
                        <td className="px-5 py-4 text-gray-600 text-xs">{d.suggested_vehicle || "-"}</td>
                        <td className="px-5 py-4 text-gray-500 text-xs">{formatDate(d.created_at)}</td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => window.open(`/deliveries/${d.id}`, '_blank')} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="ดูรายละเอียด">
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
