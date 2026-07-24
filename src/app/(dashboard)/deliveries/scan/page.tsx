"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface PendingPayment {
  id: number;
  payment_number: string;
  method: string;
  amount: string;
  is_deposit: boolean;
  status: string;
  slip_image: string | null;
  slip_verified: boolean;
  slip_status_code: string | null;
  slip_ref: string | null;
  sender_name: string | null;
  sender_bank: string | null;
  transfer_amount: string | null;
  transfer_date: string | null;
  notes: string | null;
  created_at: string;
}

interface DeliveryLookup {
  id: number;
  delivery_number: string;
  order: { id: number; order_number: string; status: string } | null;
  customer: { id: number; name: string } | null;
  status: string;
  delivery_date: string;
  delivered_at: string | null;
  total_weight: string;
  suggested_vehicle: string | null;
  items: {
    id: number;
    description: string;
    quantity: string;
    unit: string;
    weight: string | null;
    thickness: string | null;
    length: string | null;
    product?: { id: number; name: string; code: string; sizes?: { length_unit: string | null }[] } | null;
  }[];
  creator: { id: number; name: string } | null;
  pending_payments?: PendingPayment[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "รอจัดส่ง", color: "bg-yellow-50 text-yellow-700" },
  delivering: { label: "กำลังจัดส่ง", color: "bg-blue-50 text-blue-700" },
  delivered: { label: "จัดส่งแล้ว", color: "bg-green-50 text-green-700" },
  cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600" },
};

function getComputedStatus(d: DeliveryLookup): string {
  if (d.status === "delivered" || d.status === "cancelled") return d.status;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(d.delivery_date);
  dd.setHours(0, 0, 0, 0);
  return dd <= today ? "delivering" : "pending";
}

// Daily-summary types (formerly at /deliveries/daily)
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

export default function DeliveryScanPage() {
  const { token, hasRole } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tabs: default to "scan"; switch to "daily" when ?view=daily or ?date=... is present.
  const initialView: "scan" | "daily" =
    searchParams.get("view") === "daily" || searchParams.get("date") ? "daily" : "scan";
  const [view, setView] = useState<"scan" | "daily">(initialView);

  const [delivery, setDelivery] = useState<DeliveryLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [previewSlip, setPreviewSlip] = useState<string | null>(null);
  const [slipActionLoading, setSlipActionLoading] = useState<number | null>(null);

  // Daily-summary state
  const [dailyDate, setDailyDate] = useState<string>(
    searchParams.get("date") || new Date().toISOString().split("T")[0]
  );
  const [dailyData, setDailyData] = useState<DailySummary | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Sales-only users must NOT see grand totals / cumulative order amounts.
  const isSalesOnly = hasRole("sales") && !hasRole("admin") && !hasRole("manager");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") || "http://localhost:7000";

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScannedRef = useRef<string>("");

  const lookupDelivery = useCallback(async (deliveryNumber: string) => {
    if (!deliveryNumber.trim()) return;
    setManualInput("");
    setLoading(true);
    setError("");
    setDelivery(null);
    setConfirmed(false);
    try {
      const data = await api.get<{ delivery: DeliveryLookup }>(`/deliveries/lookup/${encodeURIComponent(deliveryNumber.trim())}`, token || "");
      setDelivery(data.delivery);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ไม่พบใบส่งของ");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
    } catch {
      setError("ไม่สามารถเปิดกล้องได้");
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    if (!scanning || !videoRef.current) return;

    const checkBarcodeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;
    if (!checkBarcodeDetector) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
    let animFrame: number;

    const detectLoop = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animFrame = requestAnimationFrame(detectLoop);
        return;
      }
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const value = barcodes[0].rawValue;
          if (value && value !== lastScannedRef.current) {
            lastScannedRef.current = value;
            setTimeout(() => { lastScannedRef.current = ""; }, 3000);
            lookupDelivery(value);
          }
        }
      } catch { /* silent */ }
      animFrame = requestAnimationFrame(detectLoop);
    };

    animFrame = requestAnimationFrame(detectLoop);
    return () => cancelAnimationFrame(animFrame);
  }, [scanning, lookupDelivery]);

  useEffect(() => {
    return () => stopScanning();
  }, []);

  // Daily summary fetch
  const fetchDaily = useCallback(async () => {
    if (!token) return;
    setDailyLoading(true);
    try {
      const res = await api.get<DailySummary>(`/deliveries/daily-summary?date=${dailyDate}`, token);
      setDailyData(res);
    } catch {
      setDailyData(null);
    } finally {
      setDailyLoading(false);
    }
  }, [token, dailyDate]);

  useEffect(() => {
    if (view === "daily") fetchDaily();
  }, [view, fetchDaily]);

  const shiftDay = (delta: number) => {
    const d = new Date(dailyDate);
    d.setDate(d.getDate() + delta);
    setDailyDate(d.toISOString().split("T")[0]);
  };

  const fmt = (v: number | string) =>
    Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });

  const handleConfirm = async () => {
    if (!token || !delivery) return;
    setConfirmLoading(true);
    try {
      await api.post(`/deliveries/${delivery.id}/confirm`, {}, token);
      setConfirmed(true);
      // Refresh data
      const data = await api.get<{ delivery: DeliveryLookup }>(`/deliveries/lookup/${encodeURIComponent(delivery.delivery_number)}`, token);
      setDelivery(data.delivery);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setConfirmLoading(false);
    }
  };

  const refreshDelivery = async () => {
    if (!token || !delivery) return;
    try {
      const data = await api.get<{ delivery: DeliveryLookup }>(`/deliveries/lookup/${encodeURIComponent(delivery.delivery_number)}`, token);
      setDelivery(data.delivery);
    } catch { /* noop */ }
  };

  const handleApproveSlip = async (paymentId: number) => {
    if (!token || !confirm("ต้องการอนุมัติสลิปนี้?")) return;
    setSlipActionLoading(paymentId);
    try {
      await api.post(`/payments/${paymentId}/approve`, {}, token);
      await refreshDelivery();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSlipActionLoading(null);
    }
  };

  const handleRejectSlip = async (paymentId: number) => {
    const reason = prompt("ระบุเหตุผลในการปฏิเสธ:");
    if (!reason || !token) return;
    setSlipActionLoading(paymentId);
    try {
      await api.post(`/payments/${paymentId}/reject`, { reason }, token);
      await refreshDelivery();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSlipActionLoading(null);
    }
  };

  const formatCurrency = (v: string | number) =>
    Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      <Header title="สแกน QR / สรุปยอดชำระรายวัน" />
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          <button
            onClick={() => { setView("scan"); router.replace("/deliveries/scan"); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              view === "scan" ? "border-green-500 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            สแกน QR ยืนยันจัดส่ง
          </button>
          <button
            onClick={() => { setView("daily"); router.replace(`/deliveries/scan?view=daily&date=${dailyDate}`); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              view === "daily" ? "border-green-500 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            สรุปยอดชำระรายวัน
          </button>
        </div>

        {view === "scan" && (<>
        {/* Scanner */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">สแกน QR Code</h3>
            <button
              onClick={scanning ? stopScanning : startScanning}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${scanning ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
            >
              {scanning ? "ปิดกล้อง" : "เปิดกล้อง"}
            </button>
          </div>
          <div className="p-5">
            {scanning && (
              <div className="relative rounded-lg overflow-hidden mb-4 bg-black">
                <video ref={videoRef} className="w-full" playsInline muted />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-green-400 rounded-xl opacity-50" />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="พิมพ์เลขที่ใบส่งของ..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") lookupDelivery(manualInput); }}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
              <button
                onClick={() => lookupDelivery(manualInput)}
                disabled={loading || !manualInput.trim()}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                ค้นหา
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <svg className="animate-spin w-8 h-8 text-green-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-500">กำลังค้นหา...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Confirmed banner */}
        {confirmed && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <svg className="w-12 h-12 text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-700 font-semibold text-lg">ยืนยันจัดส่งเรียบร้อย!</p>
          </div>
        )}

        {/* Delivery details */}
        {delivery && !loading && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{delivery.delivery_number}</h3>
                  {delivery.order && (
                    <p className="text-xs text-gray-500 mt-0.5">คำสั่งซื้อ: {delivery.order.order_number}</p>
                  )}
                </div>
                {(() => {
                  const cs = getComputedStatus(delivery);
                  const s = STATUS_MAP[cs] || STATUS_MAP.pending;
                  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
                })()}
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">ลูกค้า:</span>
                  <p className="font-medium text-gray-800">{delivery.customer?.name || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500">วันจัดส่ง:</span>
                  <p className="font-medium text-gray-800">{formatDate(delivery.delivery_date)}</p>
                </div>
                {delivery.total_weight && Number(delivery.total_weight) > 0 && (
                  <div>
                    <span className="text-gray-500">น้ำหนักรวม:</span>
                    <p className="font-medium text-gray-800">{Number(delivery.total_weight).toLocaleString("th-TH", { maximumFractionDigits: 2 })} กก.</p>
                  </div>
                )}
                {delivery.suggested_vehicle && (
                  <div>
                    <span className="text-gray-500">รถแนะนำ:</span>
                    <p className="font-medium text-gray-800">{delivery.suggested_vehicle}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">รายการสินค้า</h4>
                <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-3 py-2 font-medium text-gray-500 w-8">#</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">รายการ</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500 whitespace-nowrap">หนา</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500 whitespace-nowrap">ยาว</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500 whitespace-nowrap">จำนวน</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500 whitespace-nowrap">น้ำหนัก (กก.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {delivery.items.map((item, i) => {
                      const label = item.product?.name || item.description || "-";
                      const sub = item.product?.code && item.description && item.description !== item.product.name
                        ? `${item.product.code} — ${item.description}`
                        : item.product?.code || "";
                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-gray-400 align-top">{i + 1}</td>
                          <td className="px-3 py-2 text-gray-800">
                            <div className="font-medium">{label}</div>
                            {sub && <div className="text-xs text-gray-400">{sub}</div>}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600 align-top whitespace-nowrap">
                            {item.thickness && Number(item.thickness) > 0 ? Number(item.thickness).toFixed(2) : "-"}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600 align-top whitespace-nowrap">
                            {item.length && Number(item.length) > 0 ? (
                              <>{Number(item.length).toFixed(2)} {item.product?.sizes?.[0]?.length_unit || "เมตร"}</>
                            ) : "-"}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600 align-top whitespace-nowrap">{Number(item.quantity).toLocaleString()} {item.unit}</td>
                          <td className="px-3 py-2 text-right text-gray-600 align-top whitespace-nowrap">
                            {item.weight && Number(item.weight) > 0 ? Number(item.weight).toLocaleString("th-TH", { maximumFractionDigits: 2 }) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>

              {/* Pending slip approvals */}
              {delivery.pending_payments && delivery.pending_payments.length > 0 && (
                <div className="border border-orange-200 bg-orange-50 rounded-lg p-3 space-y-3">
                  <h4 className="text-sm font-semibold text-orange-800 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14M12 3a9 9 0 100 18 9 9 0 000-18z" />
                    </svg>
                    สลิป/การชำระเงินรอตรวจสอบ ({delivery.pending_payments.length})
                  </h4>
                  {delivery.pending_payments.map((p) => (
                    <div key={p.id} className="bg-white rounded-lg border border-orange-100 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-mono text-xs text-gray-500">{p.payment_number}</div>
                          <div className="text-lg font-bold text-gray-800">
                            {formatCurrency(p.amount)} <span className="text-xs font-normal text-gray-500">บาท</span>
                            {p.is_deposit && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">มัดจำ</span>}
                          </div>
                          <div className="text-xs text-gray-500">
                            {p.method === "cash" ? "เงินสด" : p.method === "pocket_money" ? "Pocket Money" : "โอนเงิน"}
                            {p.sender_name && ` · ${p.sender_name}`}
                            {p.sender_bank && ` (${p.sender_bank})`}
                          </div>
                          {p.slip_ref && <div className="text-xs text-gray-400 font-mono">Ref: {p.slip_ref}</div>}
                        </div>
                        {p.slip_image && (
                          <button
                            onClick={() => setPreviewSlip(`${apiUrl}/storage/${p.slip_image}`)}
                            className="shrink-0"
                            title="ดูสลิป"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`${apiUrl}/storage/${p.slip_image}`}
                              alt="slip"
                              className="w-16 h-16 object-cover rounded border border-gray-200 hover:border-orange-400"
                            />
                          </button>
                        )}
                      </div>

                      {p.slip_verified && (
                        <div className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200 inline-flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          สลิปยืนยันถูกต้อง
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        {p.slip_image && (
                          <button
                            onClick={() => setPreviewSlip(`${apiUrl}/storage/${p.slip_image}`)}
                            className="flex-1 px-3 py-2 text-xs bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                          >
                            ดูสลิป
                          </button>
                        )}
                        <button
                          onClick={() => handleApproveSlip(p.id)}
                          disabled={slipActionLoading === p.id}
                          className="flex-1 px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                        >
                          {slipActionLoading === p.id ? "กำลังบันทึก..." : "อนุมัติสลิป"}
                        </button>
                        <button
                          onClick={() => handleRejectSlip(p.id)}
                          disabled={slipActionLoading === p.id}
                          className="px-3 py-2 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium"
                        >
                          ปฏิเสธ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirm button */}
              {delivery.status !== "delivered" && delivery.status !== "cancelled" && (
                <button
                  onClick={handleConfirm}
                  disabled={confirmLoading}
                  className="w-full py-3 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {confirmLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      กำลังยืนยัน...
                    </span>
                  ) : "✓ ยืนยันจัดส่งแล้ว"}
                </button>
              )}

              {delivery.status === "delivered" && (
                <div className="text-center py-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-medium">✓ จัดส่งแล้ว</p>
                  {delivery.delivered_at && (
                    <p className="text-xs text-green-600 mt-1">{new Date(delivery.delivered_at).toLocaleString("th-TH")}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        </>)}

        {view === "daily" && (
          <>
            {/* Date picker */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-2">
              <button onClick={() => shiftDay(-1)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">‹ ก่อนหน้า</button>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
              <button onClick={() => shiftDay(1)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">ถัดไป ›</button>
              <button onClick={() => setDailyDate(new Date().toISOString().split("T")[0])} className="ml-auto px-3 py-2 text-sm rounded-lg bg-green-100 text-green-700 hover:bg-green-200">วันนี้</button>
            </div>

            {/* Summary cards — grand totals hidden for sales-only role */}
            {dailyData && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs text-gray-500 mb-1">จำนวนบิลจัดส่ง</p>
                  <p className="text-2xl font-bold text-gray-800">{dailyData.summary.delivery_count}</p>
                </div>
                {!isSalesOnly && (
                  <>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <p className="text-xs text-gray-500 mb-1">ยอดที่ต้องเรียกเก็บ</p>
                      <p className="text-2xl font-bold text-gray-800">{fmt(dailyData.summary.total_to_collect)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <p className="text-xs text-gray-500 mb-1">ชำระแล้ว</p>
                      <p className="text-2xl font-bold text-green-600">{fmt(dailyData.summary.total_paid)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <p className="text-xs text-gray-500 mb-1">ค้างชำระ</p>
                      <p className="text-2xl font-bold text-red-600">{fmt(dailyData.summary.total_unpaid)}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Bills table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">รายละเอียดบิลย่อยที่จัดส่งวันนี้</h3>
              </div>
              {dailyLoading ? (
                <div className="p-8 text-center text-gray-400">กำลังโหลด...</div>
              ) : !dailyData || dailyData.deliveries.length === 0 ? (
                <div className="p-8 text-center text-gray-400">ไม่มีการจัดส่งในวันที่เลือก</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                        <th className="text-left px-4 py-3 font-medium">เลขที่บิลย่อย</th>
                        <th className="text-left px-4 py-3 font-medium">คำสั่งซื้อ / ลูกค้า</th>
                        <th className="text-right px-4 py-3 font-medium">ยอดต้องเก็บ (บิลนี้)</th>
                        {!isSalesOnly && (
                          <>
                            <th className="text-right px-4 py-3 font-medium">ชำระแล้ว (ทั้งคำสั่งซื้อ)</th>
                            <th className="text-right px-4 py-3 font-medium">คงเหลือ</th>
                          </>
                        )}
                        <th className="text-center px-4 py-3 font-medium">สถานะชำระ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dailyData.deliveries.map((d) => (
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
                          {!isSalesOnly && (
                            <>
                              <td className="px-4 py-3 text-right text-green-600">{fmt(d.order_paid)}</td>
                              <td className="px-4 py-3 text-right font-medium text-red-600">{fmt(d.order_remaining)}</td>
                            </>
                          )}
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
          </>
        )}
      </div>

      {/* Slip preview modal */}
      {previewSlip && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewSlip(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewSlip(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
              aria-label="ปิด"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <a href={previewSlip} target="_blank" rel="noopener noreferrer" title="เปิดภาพขนาดเต็ม">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSlip} alt="Slip" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl mx-auto cursor-zoom-in" />
            </a>
          </div>
        </div>
      )}
    </>
  );
}
