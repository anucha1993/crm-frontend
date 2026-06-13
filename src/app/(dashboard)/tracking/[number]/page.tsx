"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7000/api";

interface TrackingEvent {
  stage: "quotation" | "order" | "payment" | "invoice" | "delivery";
  action: string;
  title: string;
  summary: string | null;
  user: string | null;
  at: string | null;
}

interface DeliveryRef {
  number: string;
  status: string;
  delivery_date: string | null;
  delivered_at: string | null;
}

interface InvoiceRef {
  number: string;
  status: string;
  issue_date: string | null;
  total: string;
}

interface TrackingData {
  document: { number: string; type: string };
  customer_name: string;
  account_type: string | null;
  quotation: {
    number: string;
    status: string;
    revision_number: number;
    total: string;
    valid_until: string | null;
    created_at: string | null;
  } | null;
  order: {
    number: string;
    status: string;
    delivery_status: string;
    total: string;
    paid_amount: string;
    remaining_amount: string;
    created_at: string | null;
  } | null;
  deliveries: DeliveryRef[];
  invoices: InvoiceRef[];
  events: TrackingEvent[];
}

const STAGE_META: Record<TrackingEvent["stage"], { label: string; color: string; dot: string; icon: string }> = {
  quotation: { label: "ใบเสนอราคา", color: "text-purple-700", dot: "bg-purple-500", icon: "📝" },
  order: { label: "คำสั่งซื้อ", color: "text-blue-700", dot: "bg-blue-500", icon: "📦" },
  payment: { label: "การชำระเงิน", color: "text-amber-700", dot: "bg-amber-500", icon: "💳" },
  invoice: { label: "ใบกำกับภาษี", color: "text-teal-700", dot: "bg-teal-500", icon: "🧾" },
  delivery: { label: "การจัดส่ง", color: "text-green-700", dot: "bg-green-500", icon: "🚚" },
};

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "รอดำเนินการ", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  in_progress: { label: "กำลังดำเนินการ", color: "bg-blue-50 text-blue-700 border-blue-200" },
  processing: { label: "กำลังดำเนินการ", color: "bg-blue-50 text-blue-700 border-blue-200" },
  confirmed: { label: "ยืนยันแล้ว", color: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "สำเร็จ", color: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600 border-red-200" },
};

const DELIVERY_STATUS_MAP: Record<string, { label: string; color: string }> = {
  not_delivered: { label: "ยังไม่จัดส่ง", color: "text-gray-500" },
  partially_delivered: { label: "จัดส่งบางส่วน", color: "text-amber-600" },
  fully_delivered: { label: "จัดส่งครบแล้ว", color: "text-green-600" },
  pending: { label: "รอจัดส่ง", color: "text-gray-500" },
  delivering: { label: "กำลังจัดส่ง", color: "text-blue-600" },
  delivered: { label: "จัดส่งแล้ว", color: "text-green-600" },
  cancelled: { label: "ยกเลิก", color: "text-red-600" },
  issued: { label: "ออกแล้ว", color: "text-green-600" },
};

export default function TrackingDetailPage() {
  const params = useParams();
  const number = decodeURIComponent((params?.number as string) || "");
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/tracking/${encodeURIComponent(number)}`);
      if (!res.ok) {
        setError("ไม่พบเอกสารนี้ในระบบ");
        return;
      }
      setData(await res.json());
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [number]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fmt = (v: string | number) => Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" }) : "-";
  const fmtDateTime = (d: string | null) =>
    d
      ? new Date(d).toLocaleString("th-TH", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  if (loading) {
    return (
      <>
        <Header title="ติดตามใบขาย" />
        <div className="p-6 text-center text-gray-400 py-20">กำลังโหลด...</div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Header title="ติดตามใบขาย" />
        <div className="p-6 flex items-center justify-center">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-sm mt-10">
            <div className="text-4xl mb-3">🔍</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">{error || "ไม่พบข้อมูล"}</h2>
            <p className="text-sm text-gray-500 mb-1">รหัสเอกสาร: {number}</p>
            <p className="text-xs text-gray-400 mb-4">กรุณาตรวจสอบรหัสเอกสารอีกครั้ง</p>
            <a href="/tracking" className="inline-block px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              ค้นหาเอกสารอื่น
            </a>
          </div>
        </div>
      </>
    );
  }

  const ost = data.order ? ORDER_STATUS_MAP[data.order.status] || ORDER_STATUS_MAP.pending : null;
  const total = data.order ? Number(data.order.total) : data.quotation ? Number(data.quotation.total) : 0;
  const paid = data.order ? Number(data.order.paid_amount) : 0;
  const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  return (
    <>
      <Header title="ติดตามใบขาย" />
      <div className="p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <a href="/tracking" className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            ค้นหาเอกสารอื่น
          </a>
          <button onClick={fetchData} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            รีเฟรช
          </button>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">ติดตามสถานะเอกสาร</p>
              <h1 className="text-2xl font-bold text-gray-800">{data.document.number}</h1>
              <p className="text-sm text-gray-500 mt-1">ลูกค้า: {data.customer_name}</p>
            </div>
            <div className="flex items-center gap-2">
              {data.account_type && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {data.account_type === "tax" ? "ใบกำกับภาษี" : "บิลเงินสด"}
                </span>
              )}
              {ost && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${ost.color}`}>{ost.label}</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Left column — timeline */}
          <div className="lg:col-span-2 space-y-4">
            {/* Document summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.quotation && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-400 mb-1">📝 ใบเสนอราคา</p>
                  <p className="text-sm font-semibold text-gray-800">{data.quotation.number}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {data.quotation.revision_number > 0 ? `แก้ไขครั้งที่ ${data.quotation.revision_number} · ` : ""}
                    {fmt(data.quotation.total)} บาท
                  </p>
                </div>
              )}
              {data.order && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-400 mb-1">📦 คำสั่งซื้อ</p>
                  <p className="text-sm font-semibold text-gray-800">{data.order.number}</p>
                  <p className="text-xs text-gray-400 mt-0.5">สร้างเมื่อ {fmtDate(data.order.created_at)}</p>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">ไทม์ไลน์การดำเนินการ</h3>
              {data.events.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีประวัติการดำเนินการ</p>
              ) : (
                <ol className="relative border-l border-gray-200 ml-3">
                  {data.events.map((ev, i) => {
                    const meta = STAGE_META[ev.stage] || STAGE_META.order;
                    const isCancel = ev.action.includes("cancel") || ev.action === "rejected";
                    return (
                      <li key={i} className="mb-5 ml-5 last:mb-0">
                        <span
                          className={`absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full ring-4 ring-white ${isCancel ? "bg-red-500" : meta.dot}`}
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${isCancel ? "text-red-600" : "text-gray-800"}`}>
                            {meta.icon} {ev.title}
                          </span>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 ${meta.color}`}>{meta.label}</span>
                        </div>
                        {ev.summary && <p className="text-xs text-gray-500 mt-0.5">{ev.summary}</p>}
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {fmtDateTime(ev.at)}
                          {ev.user ? ` · โดย ${ev.user}` : ""}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>

          {/* Right column — payment + related documents */}
          <div className="space-y-4">
            {/* Payment progress */}
            {data.order && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">การชำระเงิน</h3>
                  <span className={`text-xs font-medium ${DELIVERY_STATUS_MAP[data.order.delivery_status]?.color || "text-gray-500"}`}>
                    🚚 {DELIVERY_STATUS_MAP[data.order.delivery_status]?.label || data.order.delivery_status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">
                    {fmt(data.order.paid_amount)} / {fmt(data.order.total)} บาท
                  </span>
                  <span className={`font-semibold ${percent === 100 ? "text-green-600" : "text-gray-600"}`}>{percent}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${percent === 100 ? "bg-green-500" : percent > 0 ? "bg-blue-500" : "bg-gray-200"}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {Number(data.order.remaining_amount) > 0 && (
                  <p className="text-sm text-red-600 mt-2">คงเหลือ: {fmt(data.order.remaining_amount)} บาท</p>
                )}
              </div>
            )}

            {/* Deliveries */}
            {data.deliveries.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">ใบส่งของ ({data.deliveries.length})</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {data.deliveries.map((d, i) => (
                    <div key={i} className="px-5 py-3 flex justify-between items-center text-sm">
                      <div>
                        <p className="text-gray-800">{d.number}</p>
                        <p className="text-xs text-gray-400">กำหนดส่ง: {fmtDate(d.delivery_date)}</p>
                      </div>
                      <span className={`text-xs font-medium ${DELIVERY_STATUS_MAP[d.status]?.color || "text-gray-500"}`}>
                        {DELIVERY_STATUS_MAP[d.status]?.label || d.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invoices */}
            {data.invoices.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">ใบกำกับภาษี/ใบเสร็จ ({data.invoices.length})</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {data.invoices.map((inv, i) => (
                    <div key={i} className="px-5 py-3 flex justify-between items-center text-sm">
                      <div>
                        <p className="text-gray-800">{inv.number}</p>
                        <p className="text-xs text-gray-400">วันที่ออก: {fmtDate(inv.issue_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-800">{fmt(inv.total)} บาท</p>
                        <p className={`text-xs font-medium ${DELIVERY_STATUS_MAP[inv.status]?.color || "text-gray-500"}`}>
                          {DELIVERY_STATUS_MAP[inv.status]?.label || inv.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center pt-6">เจริญมั่นคอนกรีต · ระบบติดตามเอกสาร</p>
      </div>
    </>
  );
}
