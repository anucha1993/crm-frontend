"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface DailyDelivery {
  id: number;
  delivery_number: string;
  status: string;
  delivery_date: string | null;
  order_id: number | null;
  order_number: string | null;
  customer_name: string | null;
  delivery_total: number;
  order_total: number;
  order_paid: number;
  order_remaining: number;
  payment_status: "paid" | "unpaid";
  creator: { id: number; name: string } | null;
}

interface DailySummary {
  date: string;
  deliveries: DailyDelivery[];
  summary: {
    delivery_count: number;
    total_to_collect: number;
    total_paid: number;
    total_unpaid: number;
  };
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "รอจัดส่ง", color: "bg-yellow-50 text-yellow-700" },
  delivering: { label: "กำลังจัดส่ง", color: "bg-blue-50 text-blue-700" },
  delivered: { label: "จัดส่งแล้ว", color: "bg-green-50 text-green-700" },
  cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600" },
};

export default function DeliveryDailySummaryPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [date, setDate] = useState(() => searchParams.get("date") || new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get<DailySummary>(`/deliveries/daily-summary?date=${date}`, token);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, date]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const fmt = (v: number | string) =>
    Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });

  const shiftDay = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split("T")[0]);
  };

  return (
    <>
      <Header title="สรุปยอดชำระจริงรายวัน" />
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Date picker */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-2">
          <button onClick={() => shiftDay(-1)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">‹ ก่อนหน้า</button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
          <button onClick={() => shiftDay(1)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">ถัดไป ›</button>
          <button onClick={() => setDate(new Date().toISOString().split("T")[0])} className="ml-auto px-3 py-2 text-sm rounded-lg bg-green-100 text-green-700 hover:bg-green-200">วันนี้</button>
        </div>

        {/* Summary cards */}
        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-1">จำนวนบิลจัดส่ง</p>
              <p className="text-2xl font-bold text-gray-800">{data.summary.delivery_count}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-1">ยอดที่ต้องเรียกเก็บ</p>
              <p className="text-2xl font-bold text-gray-800">{fmt(data.summary.total_to_collect)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-1">ชำระแล้ว</p>
              <p className="text-2xl font-bold text-green-600">{fmt(data.summary.total_paid)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-1">ค้างชำระ</p>
              <p className="text-2xl font-bold text-red-600">{fmt(data.summary.total_unpaid)}</p>
            </div>
          </div>
        )}

        {/* Bills table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">รายละเอียดบิลย่อยที่จัดส่งวันนี้</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">กำลังโหลด...</div>
          ) : !data || data.deliveries.length === 0 ? (
            <div className="p-8 text-center text-gray-400">ไม่มีการจัดส่งในวันที่เลือก</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="text-left px-4 py-3 font-medium">เลขที่บิลย่อย</th>
                    <th className="text-left px-4 py-3 font-medium">คำสั่งซื้อ / ลูกค้า</th>
                    <th className="text-right px-4 py-3 font-medium">ยอดต้องเก็บ (บิลนี้)</th>
                    <th className="text-right px-4 py-3 font-medium">ชำระแล้ว (ทั้งคำสั่งซื้อ)</th>
                    <th className="text-right px-4 py-3 font-medium">คงเหลือ</th>
                    <th className="text-center px-4 py-3 font-medium">สถานะชำระ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.deliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/deliveries/${d.id}`} className="font-mono font-medium text-blue-600 hover:underline">{d.delivery_number}</Link>
                        <div className="mt-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${(STATUS_MAP[d.status] || STATUS_MAP.pending).color}`}>{(STATUS_MAP[d.status] || STATUS_MAP.pending).label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {d.order_id ? (
                          <Link href={`/orders/${d.order_id}`} className="font-mono text-blue-600 hover:underline">{d.order_number}</Link>
                        ) : <span className="text-gray-400">-</span>}
                        <p className="text-gray-600">{d.customer_name || "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(d.delivery_total)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{fmt(d.order_paid)}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">{fmt(d.order_remaining)}</td>
                      <td className="px-4 py-3 text-center">
                        {d.payment_status === "paid" ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">ชำระเงินแล้ว</span>
                        ) : (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">ยังไม่ชำระเงิน</span>
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
