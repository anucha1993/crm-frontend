"use client";

import { useState, useEffect, useCallback } from "react";
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
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: "รอจัดส่ง", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", dot: "bg-yellow-400" },
  delivering: { label: "กำลังจัดส่ง", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", dot: "bg-blue-400" },
  delivered: { label: "จัดส่งแล้ว", color: "text-green-700", bg: "bg-green-50 border-green-200", dot: "bg-green-400" },
  cancelled: { label: "ยกเลิก", color: "text-red-600", bg: "bg-red-50 border-red-200", dot: "bg-red-400" },
};

function getComputedStatus(delivery: Delivery): string {
  if (delivery.status === "delivered" || delivery.status === "cancelled") return delivery.status;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(delivery.delivery_date);
  dd.setHours(0, 0, 0, 0);
  return dd <= today ? "delivering" : "pending";
}

const DAYS_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export default function DeliveryCalendarPage() {
  const { token } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchDeliveries = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      const params = new URLSearchParams();
      params.set("per_page", "200");
      params.set("date_from", startDate.toISOString().split("T")[0]);
      params.set("date_to", endDate.toISOString().split("T")[0]);
      const data = await api.get<{ data: Delivery[] }>(`/deliveries?${params}`, token);
      setDeliveries(data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, year, month]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const calendarDays: { day: number; month: "prev" | "current" | "next"; dateStr: string }[] = [];

  // Previous month fill
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const dt = new Date(year, month - 1, d);
    calendarDays.push({ day: d, month: "prev", dateStr: dt.toISOString().split("T")[0] });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    calendarDays.push({ day: d, month: "current", dateStr: dt.toISOString().split("T")[0] });
  }

  // Next month fill
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    const dt = new Date(year, month + 1, d);
    calendarDays.push({ day: d, month: "next", dateStr: dt.toISOString().split("T")[0] });
  }

  // Group deliveries by date
  const deliveriesByDate: Record<string, Delivery[]> = {};
  deliveries.forEach((d) => {
    const date = d.delivery_date.split("T")[0];
    if (!deliveriesByDate[date]) deliveriesByDate[date] = [];
    deliveriesByDate[date].push(d);
  });

  const todayStr = new Date().toISOString().split("T")[0];

  const goMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
    setSelectedDate(null);
  };

  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(todayStr);
  };

  const selectedDeliveries = selectedDate ? (deliveriesByDate[selectedDate] || []) : [];

  // Summary counts
  const statusCounts = { pending: 0, delivering: 0, delivered: 0, cancelled: 0 };
  deliveries.forEach((d) => {
    const s = getComputedStatus(d);
    if (s in statusCounts) statusCounts[s as keyof typeof statusCounts]++;
  });

  return (
    <>
      <Header title="ปฏิทินการจัดส่ง" />
      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(STATUS_MAP).filter(([k]) => k !== "cancelled").map(([key, st]) => (
            <div key={key} className={`rounded-xl border p-4 ${st.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
              </div>
              <p className={`text-2xl font-bold ${st.color}`}>{statusCounts[key as keyof typeof statusCounts]}</p>
            </div>
          ))}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <span className="text-xs font-medium text-gray-600">ทั้งหมด</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{deliveries.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="xl:col-span-3 bg-white rounded-xl border border-gray-200">
            {/* Calendar header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <button onClick={() => goMonth(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-lg font-semibold text-gray-800">
                  {MONTHS_TH[month]} {year + 543}
                </h2>
                <button onClick={() => goMonth(1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              <button onClick={goToday} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                วันนี้
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
            ) : (
              <div className="p-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {DAYS_TH.map((day, i) => (
                    <div key={day} className={`text-center text-xs font-medium py-2 ${i === 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
                  {calendarDays.map((cell, idx) => {
                    const dayDeliveries = deliveriesByDate[cell.dateStr] || [];
                    const isToday = cell.dateStr === todayStr;
                    const isSelected = cell.dateStr === selectedDate;
                    const isSunday = idx % 7 === 0;

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(cell.dateStr === selectedDate ? null : cell.dateStr)}
                        className={`relative min-h-[110px] p-2 text-left transition-colors ${
                          cell.month !== "current" ? "bg-gray-50" : "bg-white"
                        } ${isSelected ? "ring-2 ring-green-500 ring-inset" : "hover:bg-gray-50"}`}
                      >
                        <span className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full font-medium ${
                          isToday ? "bg-green-600 text-white font-bold" :
                          cell.month !== "current" ? "text-gray-300" :
                          isSunday ? "text-red-400" : "text-gray-700"
                        }`}>
                          {cell.day}
                        </span>

                        {dayDeliveries.length > 0 && (
                          <div className="mt-1.5 space-y-1">
                            {dayDeliveries.slice(0, 3).map((d) => {
                              const cs = getComputedStatus(d);
                              const st = STATUS_MAP[cs] || STATUS_MAP.pending;
                              return (
                                <div key={d.id} className={`px-1.5 py-1 rounded text-xs border ${st.bg}`}>
                                  <div className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} />
                                    <span className={`truncate font-medium ${st.color}`}>{d.customer?.name || d.delivery_number}</span>
                                  </div>
                                  {d.suggested_vehicle && (
                                    <div className="flex items-center gap-0.5 mt-0.5 pl-3 text-[11px] text-gray-500">
                                      <span>🚛</span>
                                      <span className="truncate">{d.suggested_vehicle}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {dayDeliveries.length > 3 && (
                              <div className="text-xs text-gray-500 px-1 font-medium">+{dayDeliveries.length - 3} เพิ่มเติม</div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Selected date detail */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 sticky top-6">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800">
                  {selectedDate
                    ? new Date(selectedDate).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                    : "เลือกวันที่เพื่อดูรายละเอียด"}
                </h3>
                {selectedDate && (
                  <p className="text-xs text-gray-400 mt-0.5">{selectedDeliveries.length} ใบส่งสินค้า</p>
                )}
              </div>

              {!selectedDate ? (
                <div className="p-8 text-center">
                  <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-400">คลิกที่วันในปฏิทิน</p>
                </div>
              ) : selectedDeliveries.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">ไม่มีใบส่งสินค้าในวันนี้</div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                  {selectedDeliveries.map((d) => {
                    const cs = getComputedStatus(d);
                    const st = STATUS_MAP[cs] || STATUS_MAP.pending;
                    return (
                      <button
                        key={d.id}
                        onClick={() => window.open(`/deliveries/${d.id}`, '_blank')}
                        className="w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-green-700">{d.delivery_number}</span>
                          <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${st.color} ${st.bg}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 truncate">{d.customer?.name || "-"}</p>
                        {d.suggested_vehicle && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                            </svg>
                            <span className="text-xs font-medium text-blue-600">{d.suggested_vehicle}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          {d.order && <span>{d.order.order_number}</span>}
                          {Number(d.total_weight) > 0 && (
                            <span>{Number(d.total_weight).toLocaleString("th-TH", { maximumFractionDigits: 2 })} กก.</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
