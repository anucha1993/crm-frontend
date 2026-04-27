"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface MonthData {
  month: number;
  month_name?: string;
  order_count: number;
  total_sales: string;
  total_paid: string;
  total_remaining: string;
  customer_count: number;
}

interface SalesData {
  year: number;
  monthly: MonthData[];
  prev_year: Record<string, string>;
  year_total: number;
}

const thaiMonthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

export default function MonthlySalesPage() {
  const { token } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.get<SalesData>(`/reports/monthly-sales?year=${year}`, token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, year]);

  const fmt = (v: string | number) => Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });
  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

  // Build full 12-month array from sparse backend data
  const months: MonthData[] = Array.from({ length: 12 }, (_, i) => {
    const found = data?.monthly.find((m) => m.month === i + 1);
    return found ?? { month: i + 1, order_count: 0, total_sales: "0", total_paid: "0", total_remaining: "0", customer_count: 0 };
  });

  const prevYear = data?.prev_year ?? {};
  const hasPrevYear = Object.keys(prevYear).length > 0;

  const totalSales = months.reduce((s, m) => s + Number(m.total_sales), 0);
  const totalPaid = months.reduce((s, m) => s + Number(m.total_paid), 0);
  const totalRemaining = months.reduce((s, m) => s + Number(m.total_remaining), 0);
  const totalOrders = months.reduce((s, m) => s + m.order_count, 0);
  const totalCustomers = months.reduce((s, m) => s + m.customer_count, 0);
  const prevYearTotal = Object.values(prevYear).reduce((s, v) => s + Number(v), 0);

  const maxSales = Math.max(...months.map((m) => Number(m.total_sales)), 1);

  return (
    <>
      <Header title="ยอดขายรายเดือน" />
      <div className="p-6 space-y-6">
        {/* Year selector */}
        <div className="flex items-center gap-3">
          <button onClick={() => setYear(year - 1)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">← {year - 1}</button>
          <span className="text-lg font-bold text-gray-800">{year + 543}</span>
          <button onClick={() => setYear(year + 1)} disabled={year >= currentYear} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">{year + 1} →</button>
          {data && (
            <button
              onClick={() => exportToExcel(
                months.map((m, i) => ({
                  month_name: thaiMonthNames[i],
                  order_count: m.order_count,
                  total_sales: m.total_sales,
                  total_paid: m.total_paid,
                  total_remaining: m.total_remaining,
                  customer_count: m.customer_count,
                  prev_sales: prevYear[String(m.month)] ?? 0,
                })) as unknown as Record<string, unknown>[],
                [
                  { header: 'เดือน', key: 'month_name', width: 12 },
                  { header: 'จำนวนออเดอร์', key: 'order_count', width: 15 },
                  { header: 'ยอดขาย', key: 'total_sales', width: 18, format: (v) => Number(v) },
                  { header: 'ชำระแล้ว', key: 'total_paid', width: 18, format: (v) => Number(v) },
                  { header: 'ค้างชำระ', key: 'total_remaining', width: 18, format: (v) => Number(v) },
                  { header: 'จำนวนลูกค้า', key: 'customer_count', width: 15 },
                  { header: 'ยอดขายปีก่อน', key: 'prev_sales', width: 18, format: (v) => Number(v) },
                ],
                `ยอดขายรายเดือน_${year + 543}`,
                `ปี ${year + 543}`
              )}
              className="ml-auto px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export Excel
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">กำลังโหลด...</div>
        ) : data ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">ยอดขายรวม</p>
                <p className="text-2xl font-bold text-gray-800">฿{fmt(totalSales)}</p>
                {hasPrevYear && (
                  <p className="text-xs mt-1 text-gray-400">ปีก่อน: ฿{fmt(prevYearTotal)}</p>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">ชำระแล้ว</p>
                <p className="text-2xl font-bold text-green-600">฿{fmt(totalPaid)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">ค้างชำระ</p>
                <p className="text-2xl font-bold text-red-600">฿{fmt(totalRemaining)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">จำนวนออเดอร์</p>
                <p className="text-2xl font-bold text-gray-800">{totalOrders}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">ยอดขายรายเดือน {year + 543}</h3>
              <div className="flex items-end gap-2 h-48">
                {months.map((m, i) => {
                  const h = (Number(m.total_sales) / maxSales) * 100;
                  const prevSalesVal = Number(prevYear[String(m.month)] ?? 0);
                  const prevH = hasPrevYear ? (prevSalesVal / maxSales) * 100 : 0;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-400 mb-1">฿{Number(m.total_sales) > 1000 ? Math.round(Number(m.total_sales) / 1000) + "k" : fmt(m.total_sales)}</span>
                      <div className="w-full flex items-end gap-0.5 justify-center" style={{ height: "140px" }}>
                        {hasPrevYear && (
                          <div className="w-3 bg-gray-200 rounded-t transition-all" style={{ height: `${prevH}%`, minHeight: prevH > 0 ? "4px" : "0" }} title={`ปีก่อน: ฿${fmt(prevSalesVal)}`} />
                        )}
                        <div className="w-3 bg-green-500 rounded-t transition-all" style={{ height: `${h}%`, minHeight: h > 0 ? "4px" : "0" }} title={`฿${fmt(m.total_sales)}`} />
                      </div>
                      <span className="text-xs text-gray-500">{thaiMonths[i]}</span>
                    </div>
                  );
                })}
              </div>
              {hasPrevYear && (
                <div className="flex gap-4 mt-3 justify-center">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />ปี {year + 543}</div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-gray-200" />ปี {year + 542}</div>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">เดือน</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">จำนวนออเดอร์</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">ยอดขาย</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">ชำระแล้ว</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">ค้างชำระ</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">ลูกค้า</th>
                    {hasPrevYear && <th className="text-right px-4 py-3 font-medium text-gray-500">เทียบปีก่อน</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {months.map((m, i) => {
                    const prevSalesVal = Number(prevYear[String(m.month)] ?? 0);
                    const growth = prevSalesVal > 0 ? ((Number(m.total_sales) - prevSalesVal) / prevSalesVal) * 100 : 0;
                    return (
                      <tr key={m.month} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{thaiMonthNames[i]}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{m.order_count}</td>
                        <td className="px-4 py-2.5 text-right font-medium">฿{fmt(m.total_sales)}</td>
                        <td className="px-4 py-2.5 text-right text-green-600">฿{fmt(m.total_paid)}</td>
                        <td className="px-4 py-2.5 text-right text-red-600">฿{fmt(m.total_remaining)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{m.customer_count}</td>
                        {hasPrevYear && (
                          <td className="px-4 py-2.5 text-right">
                            {prevSalesVal > 0 ? (
                              <span className={`text-xs font-medium ${growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {growth >= 0 ? "+" : ""}{growth.toFixed(1)}%
                              </span>
                            ) : <span className="text-gray-300">-</span>}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td className="px-4 py-3">รวมทั้งปี</td>
                    <td className="px-4 py-3 text-right">{totalOrders}</td>
                    <td className="px-4 py-3 text-right">฿{fmt(totalSales)}</td>
                    <td className="px-4 py-3 text-right text-green-600">฿{fmt(totalPaid)}</td>
                    <td className="px-4 py-3 text-right text-red-600">฿{fmt(totalRemaining)}</td>
                    <td className="px-4 py-3 text-right">{totalCustomers}</td>
                    {hasPrevYear && <td />}
                  </tr>
                </tfoot>
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
