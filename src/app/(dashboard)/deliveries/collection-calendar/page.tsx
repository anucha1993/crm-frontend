"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface DayAgg {
  delivery_count: number;
  to_collect: number;
  paid: number;
  unpaid: number;
}

interface CalendarData {
  month: string; // YYYY-MM
  days: Record<string, DayAgg>;
}

const DAYS_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export default function CollectionCalendarPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState(new Date());
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  const year = current.getFullYear();
  const month = current.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get<CalendarData>(`/deliveries/calendar?month=${monthStr}`, token);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, monthStr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmt = (v: number) => Number(v).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const days = data?.days ?? {};
  const monthTotals = Object.values(days).reduce(
    (acc, d) => ({
      to_collect: acc.to_collect + d.to_collect,
      paid: acc.paid + d.paid,
      unpaid: acc.unpaid + d.unpaid,
    }),
    { to_collect: 0, paid: 0, unpaid: 0 }
  );

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <>
      <Header title="ปฏิทินตามเก็บเงิน" />
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">‹</button>
          <h3 className="font-semibold text-gray-800 min-w-[160px] text-center">{MONTHS_TH[month]} {year + 543}</h3>
          <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">›</button>
          <button onClick={() => setCurrent(new Date())} className="px-3 py-2 text-sm rounded-lg bg-green-100 text-green-700 hover:bg-green-200">เดือนนี้</button>

          <div className="ml-auto flex gap-4 text-sm">
            <span className="text-gray-500">ต้องเก็บ <b className="text-gray-800">{fmt(monthTotals.to_collect)}</b></span>
            <span className="text-gray-500">ชำระแล้ว <b className="text-green-600">{fmt(monthTotals.paid)}</b></span>
            <span className="text-gray-500">ค้าง <b className="text-red-600">{fmt(monthTotals.unpaid)}</b></span>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS_TH.map((d) => (
              <div key={d} className="px-2 py-3 text-center text-xs font-medium text-gray-500">{d}</div>
            ))}
          </div>
          {loading ? (
            <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((d, i) => {
                if (d === null) return <div key={`e${i}`} className="min-h-[92px] border-b border-r border-gray-50 bg-gray-50/30" />;
                const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const agg = days[key];
                const isToday = key === todayStr;
                return (
                  <button
                    key={key}
                    onClick={() => router.push(`/deliveries/daily?date=${key}`)}
                    className={`min-h-[92px] border-b border-r border-gray-50 p-1.5 text-left align-top hover:bg-green-50/50 transition-colors ${isToday ? "bg-green-50/40" : ""}`}
                  >
                    <div className={`text-xs font-medium mb-1 ${isToday ? "text-green-700" : "text-gray-600"}`}>{d}</div>
                    {agg && (
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-gray-500">{agg.delivery_count} บิล</div>
                        {agg.paid > 0 && <div className="text-[10px] px-1 py-0.5 rounded bg-green-50 text-green-700 truncate">✓ {fmt(agg.paid)}</div>}
                        {agg.unpaid > 0 && <div className="text-[10px] px-1 py-0.5 rounded bg-red-50 text-red-600 truncate">฿ {fmt(agg.unpaid)}</div>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border border-green-200 inline-block" /> ชำระเงินแล้ว</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50 border border-red-200 inline-block" /> ยังไม่ชำระเงิน</span>
          <span>คลิกที่วันเพื่อดูรายละเอียดบิลย่อย</span>
        </div>
      </div>
    </>
  );
}
