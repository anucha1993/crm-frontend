"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface ARItem {
  order_id: number;
  order_number: string;
  customer: { id: number; name: string; code: string } | null;
  creator: { id: number; name: string } | null;
  total: string | number;
  paid: string | number;
  remaining: string | number;
  days: number;
  bucket: string;
  created_at: string;
}

interface BucketInfo {
  label: string;
  count: number;
  total: number;
}

interface ARData {
  buckets: Record<string, BucketInfo>;
  total_receivable: number;
  items: ARItem[];
}

export default function ARAgingPage() {
  const { token } = useAuth();
  const [data, setData] = useState<ARData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedBucket, setExpandedBucket] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    api.get<ARData>("/reports/ar-aging", token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const fmt = (v: string | number) => Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });
  const formatDate = (d: string) => new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });

  const bucketColors = ["bg-green-50 text-green-700 border-green-200", "bg-yellow-50 text-yellow-700 border-yellow-200", "bg-orange-50 text-orange-700 border-orange-200", "bg-red-50 text-red-700 border-red-200"];
  const barColors = ["bg-green-500", "bg-yellow-500", "bg-orange-500", "bg-red-500"];

  if (loading) return <><Header title="ยอดค้างชำระ (AR Aging)" /><div className="p-6 text-center text-gray-400">กำลังโหลด...</div></>;
  if (!data) return <><Header title="ยอดค้างชำระ (AR Aging)" /><div className="p-6 text-center text-gray-400">ไม่สามารถโหลดข้อมูลได้</div></>;

  const bucketKeys = ['0-30', '31-60', '61-90', '90+'];
  const bucketsArray = bucketKeys.map(k => ({ key: k, ...data.buckets[k] }));
  const totalReceivable = data.total_receivable || 1;
  const totalOrders = data.items.length;
  const itemsByBucket = bucketKeys.reduce<Record<string, ARItem[]>>((acc, k) => {
    acc[k] = data.items.filter(item => item.bucket === k);
    return acc;
  }, {});

  return (
    <>
      <Header title="ยอดค้างชำระ (AR Aging)" />
      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">ยอดค้างชำระทั้งหมด</p>
              <p className="text-3xl font-bold text-gray-800">฿{fmt(data.total_receivable)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">จำนวนคำสั่งซื้อ</p>
              <p className="text-3xl font-bold text-gray-800">{totalOrders}</p>
            </div>
            <button
              onClick={() => {
                const allItems = data.items.map((item) => ({
                  order_number: item.order_number,
                  customer_name: item.customer?.name || '-',
                  total: item.total,
                  paid: item.paid,
                  remaining: item.remaining,
                  created_at: item.created_at,
                  days: item.days,
                  bucket_label: data.buckets[item.bucket]?.label || item.bucket,
                }));
                exportToExcel(
                  allItems as unknown as Record<string, unknown>[],
                  [
                    { header: 'เลขที่คำสั่งซื้อ', key: 'order_number', width: 18 },
                    { header: 'ลูกค้า', key: 'customer_name', width: 25 },
                    { header: 'ยอดรวม', key: 'total', width: 15, format: (v) => Number(v) },
                    { header: 'ชำระแล้ว', key: 'paid', width: 15, format: (v) => Number(v) },
                    { header: 'ค้างชำระ', key: 'remaining', width: 15, format: (v) => Number(v) },
                    { header: 'วันที่สร้าง', key: 'created_at', width: 15, format: (v) => new Date(v as string).toLocaleDateString('th-TH') },
                    { header: 'ค้างมาแล้ว (วัน)', key: 'days', width: 15 },
                    { header: 'กลุ่ม', key: 'bucket_label', width: 15 },
                  ],
                  `ยอดค้างชำระ_${new Date().toISOString().slice(0, 10)}`,
                  'AR Aging'
                );
              }}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export Excel
            </button>
          </div>
          {/* Stacked bar */}
          <div className="flex h-6 rounded-full overflow-hidden">
            {bucketsArray.map((b, i) => {
              const pct = (Number(b.total) / totalReceivable) * 100;
              return pct > 0 ? (
                <div key={b.key} className={`${barColors[i]} transition-all`} style={{ width: `${pct}%` }} title={`${b.label}: ฿${fmt(b.total)}`} />
              ) : null;
            })}
          </div>
          <div className="flex gap-4 mt-3">
            {bucketsArray.map((b, i) => (
              <div key={b.key} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2.5 h-2.5 rounded-full ${barColors[i]}`} />
                {b.label}
              </div>
            ))}
          </div>
        </div>

        {/* Buckets */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {bucketsArray.map((b, i) => (
            <button key={b.key} onClick={() => setExpandedBucket(expandedBucket === i ? null : i)} className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${expandedBucket === i ? bucketColors[i] + " ring-2 ring-offset-1" : "bg-white border-gray-200"}`}>
              <p className="text-sm font-medium text-gray-500">{b.label}</p>
              <p className="text-2xl font-bold mt-1">฿{fmt(b.total)}</p>
              <p className="text-xs text-gray-400 mt-1">{b.count} รายการ</p>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${barColors[i]}`} style={{ width: `${(Number(b.total) / totalReceivable) * 100}%` }} />
              </div>
            </button>
          ))}
        </div>

        {/* Detail Table */}
        {expandedBucket !== null && bucketsArray[expandedBucket] && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className={`px-4 py-3 border-b ${bucketColors[expandedBucket]}`}>
              <h3 className="font-semibold">{bucketsArray[expandedBucket].label} — {bucketsArray[expandedBucket].count} รายการ</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">เลขที่</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">ลูกค้า</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">ยอดรวม</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">ชำระแล้ว</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">ค้างชำระ</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">วันที่สร้าง</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500">ค้างมาแล้ว</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itemsByBucket[bucketKeys[expandedBucket]]?.map((item) => (
                    <tr key={item.order_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-green-700 font-medium">{item.order_number}</td>
                      <td className="px-4 py-2.5">{item.customer?.name || '-'}</td>
                      <td className="px-4 py-2.5 text-right">฿{fmt(item.total)}</td>
                      <td className="px-4 py-2.5 text-right text-green-600">฿{fmt(item.paid)}</td>
                      <td className="px-4 py-2.5 text-right text-red-600 font-medium">฿{fmt(item.remaining)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{formatDate(item.created_at)}</td>
                      <td className="px-4 py-2.5 text-right font-medium">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${bucketColors[expandedBucket]}`}>{item.days} วัน</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
