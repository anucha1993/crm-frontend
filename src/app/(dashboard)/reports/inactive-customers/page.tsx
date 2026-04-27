"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { exportMultiSheetExcel } from "@/lib/export-excel";
import Link from "next/link";

interface CustomerItem {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  last_activity_at: string | null;
  inactive_days: number | null;
  remaining_days?: number;
  last_order?: { order_number: string; total: string; created_at: string } | null;
}

interface LevelGroup {
  level: { id: number; name: string; color: string; inactive_days: number };
  threshold_days: number;
  inactive_count: number;
  customers: CustomerItem[];
}

interface AtRiskGroup {
  level: { id: number; name: string; color: string; inactive_days: number };
  customers: CustomerItem[];
}

export default function InactiveCustomersPage() {
  const { token } = useAuth();
  const [inactive, setInactive] = useState<LevelGroup[]>([]);
  const [atRisk, setAtRisk] = useState<AtRiskGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"inactive" | "at_risk">("inactive");

  useEffect(() => {
    if (!token) return;
    api.get<{ inactive: LevelGroup[]; at_risk: AtRiskGroup[] }>("/reports/inactive-customers", token)
      .then((data) => { setInactive(data.inactive); setAtRisk(data.at_risk); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const fmt = (v: string | number) => Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });
  const formatDate = (d: string) => new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });

  const totalInactive = inactive.reduce((s, g) => s + g.inactive_count, 0);
  const totalAtRisk = atRisk.reduce((s, g) => s + g.customers.length, 0);

  return (
    <>
      <Header title="ลูกค้าไม่เคลื่อนไหว" />
      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {inactive.map((g) => (
            <div key={g.level.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: g.level.color }} />
                <span className="text-sm font-medium text-gray-700">{g.level.name}</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{g.inactive_count} <span className="text-sm font-normal text-gray-400">ราย</span></p>
              <p className="text-xs text-gray-400 mt-1">เกิน {g.threshold_days} วัน</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setTab("inactive")} className={`px-4 py-2 text-sm rounded-lg border transition-colors ${tab === "inactive" ? "bg-red-50 border-red-200 text-red-700 font-medium" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            ไม่เคลื่อนไหว ({totalInactive})
          </button>
          <button onClick={() => setTab("at_risk")} className={`px-4 py-2 text-sm rounded-lg border transition-colors ${tab === "at_risk" ? "bg-yellow-50 border-yellow-200 text-yellow-700 font-medium" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            ใกล้ไม่เคลื่อนไหว ({totalAtRisk})
          </button>
          <button
            onClick={() => {
              const cols = [
                { header: 'ระดับ', key: 'level_name', width: 12 },
                { header: 'รหัส', key: 'code', width: 12 },
                { header: 'ชื่อลูกค้า', key: 'name', width: 25 },
                { header: 'โทรศัพท์', key: 'phone', width: 15 },
                { header: 'เคลื่อนไหวล่าสุด', key: 'last_activity_at', width: 18, format: (v: unknown) => v ? new Date(v as string).toLocaleDateString('th-TH') : 'ไม่เคยซื้อ' },
                { header: 'ไม่เคลื่อนไหว (วัน)', key: 'inactive_days', width: 18 },
              ];
              const inactiveData = inactive.flatMap((g) => g.customers.map((c) => ({ ...c, level_name: g.level.name })));
              const atRiskData = atRisk.flatMap((g) => g.customers.map((c) => ({ ...c, level_name: g.level.name })));
              exportMultiSheetExcel([
                { name: 'ไม่เคลื่อนไหว', data: inactiveData as unknown as Record<string, unknown>[], columns: cols },
                { name: 'ใกล้ไม่เคลื่อนไหว', data: atRiskData as unknown as Record<string, unknown>[], columns: [...cols, { header: 'เหลืออีก (วัน)', key: 'remaining_days', width: 15 }] },
              ], `ลูกค้าไม่เคลื่อนไหว_${new Date().toISOString().slice(0, 10)}`);
            }}
            disabled={totalInactive === 0 && totalAtRisk === 0}
            className="ml-auto px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Excel
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">กำลังโหลด...</div>
        ) : tab === "inactive" ? (
          <div className="space-y-6">
            {inactive.map((g) => (
              g.customers.length > 0 && (
                <div key={g.level.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: g.level.color }} />
                    <h3 className="font-semibold text-gray-800">{g.level.name}</h3>
                    <span className="text-xs text-gray-400">(เกณฑ์: {g.threshold_days} วัน)</span>
                    <span className="ml-auto text-sm font-medium text-red-600">{g.inactive_count} ราย</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">รหัส</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">ชื่อลูกค้า</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">โทรศัพท์</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">เคลื่อนไหวล่าสุด</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500">ไม่เคลื่อนไหว</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">คำสั่งซื้อล่าสุด</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {g.customers.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-500">{c.code}</td>
                          <td className="px-4 py-2.5">
                            <Link href={`/customers/${c.id}`} className="font-medium text-green-700 hover:underline">{c.name}</Link>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500">{c.phone || "-"}</td>
                          <td className="px-4 py-2.5 text-gray-500">{c.last_activity_at ? formatDate(c.last_activity_at) : "ไม่เคยซื้อ"}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-red-600">{c.inactive_days ?? "-"} วัน</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">
                            {c.last_order ? (
                              <span>{c.last_order.order_number} ({fmt(c.last_order.total)})</span>
                            ) : "-"}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">เกินกำหนด</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ))}
            {totalInactive === 0 && <div className="text-center text-gray-400 py-12">ไม่มีลูกค้าไม่เคลื่อนไหว</div>}
          </div>
        ) : (
          <div className="space-y-6">
            {atRisk.map((g) => (
              <div key={g.level.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: g.level.color }} />
                  <h3 className="font-semibold text-gray-800">{g.level.name}</h3>
                  <span className="text-xs text-gray-400">(เกณฑ์: {g.level.inactive_days} วัน)</span>
                  <span className="ml-auto text-sm font-medium text-yellow-600">{g.customers.length} ราย</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">รหัส</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">ชื่อลูกค้า</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">เคลื่อนไหวล่าสุด</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-500">ไม่เคลื่อนไหว</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-500">เหลืออีก</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-500">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {g.customers.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-500">{c.code}</td>
                        <td className="px-4 py-2.5">
                          <Link href={`/customers/${c.id}`} className="font-medium text-green-700 hover:underline">{c.name}</Link>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{c.last_activity_at ? formatDate(c.last_activity_at) : "-"}</td>
                        <td className="px-4 py-2.5 text-right text-yellow-600 font-medium">{c.inactive_days ?? "-"} วัน</td>
                        <td className="px-4 py-2.5 text-right text-orange-600 font-medium">{c.remaining_days ?? "-"} วัน</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-600">ใกล้ครบ</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {totalAtRisk === 0 && <div className="text-center text-gray-400 py-12">ไม่มีลูกค้าใกล้ไม่เคลื่อนไหว</div>}
          </div>
        )}
      </div>
    </>
  );
}
