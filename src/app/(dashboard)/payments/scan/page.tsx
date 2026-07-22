"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface PaymentDetail {
  id: number;
  payment_number: string;
  method: string;
  amount: string;
  is_deposit: boolean;
  status: string;
  notes: string | null;
  reject_reason: string | null;
  slip_image: string | null;
  slip_verified: boolean;
  slip_status_code: string | null;
  slip_ref: string | null;
  sender_name: string | null;
  sender_bank: string | null;
  transfer_amount: string | null;
  transfer_date: string | null;
  order: {
    id: number;
    order_number: string;
    status: string;
    total: string;
    paid_amount: string;
    remaining_amount: string;
    customer: { id: number; name: string; code: string } | null;
    items: { id: number; description: string; quantity: string; unit: string; amount: string }[];
  } | null;
  customer: { id: number; name: string; code: string } | null;
  creator: { id: number; name: string } | null;
  approver: { id: number; name: string } | null;
  approved_at: string | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "รอยืนยัน", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  approved: { label: "อนุมัติแล้ว", color: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "ปฏิเสธ", color: "bg-red-50 text-red-600 border-red-200" },
};

const ORDER_STATUS_MAP: Record<string, string> = {
  pending: "รอดำเนินการ",
  in_progress: "อยู่ระหว่างดำเนินการ",
  completed: "คำสั่งซื้อสำเร็จ",
  cancelled: "ยกเลิก",
};

const METHOD_MAP: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนเงิน",
  pocket_money: "Pocket Money",
};

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
  notes: string | null;
  creator: { id: number; name: string } | null;
  created_at: string;
}

interface PendingByOrder {
  order: {
    id: number;
    order_number: string;
    status: string;
    total: number;
    paid_amount: number;
    remaining_amount: number;
    customer: { id: number; name: string; code: string } | null;
  };
  pending_payments: PendingPayment[];
  pending_total: number;
}

export default function PaymentScanPage() {
  const { token } = useAuth();
  const [manualInput, setManualInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [orderPending, setOrderPending] = useState<PendingByOrder | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScannedRef = useRef<string>("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") || "http://localhost:7000";

  const formatCurrency = (v: string | number) =>
    Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const lookupPayment = useCallback(async (query: string) => {
    if (!token || !query.trim()) return;
    setManualInput("");
    setLoading(true);
    setError("");
    setPayment(null);
    setOrderPending(null);
    try {
      // Try searching by payment number
      const data = await api.get<{ data: PaymentDetail[] }>(`/payments?search=${encodeURIComponent(query.trim())}&per_page=1`, token);
      if (data.data.length === 0) {
        setError("ไม่พบรายการชำระเงินที่ตรงกับ: " + query.trim());
        return;
      }
      // Load full details
      const detail = await api.get<{ payment: PaymentDetail }>(`/payments/${data.data[0].id}`, token);
      setPayment(detail.payment);
      // Feature #3: load ALL pending slips for this order (approval at order-issuing step)
      if (detail.payment.order?.id) {
        try {
          const pend = await api.get<PendingByOrder>(`/orders/${detail.payment.order.id}/pending-payments`, token);
          setOrderPending(pend);
        } catch { /* ignore */ }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาดในการค้นหา");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const refreshOrderPending = useCallback(async () => {
    if (!token || !payment?.order?.id) return;
    try {
      const pend = await api.get<PendingByOrder>(`/orders/${payment.order.id}/pending-payments`, token);
      setOrderPending(pend);
    } catch { /* ignore */ }
  }, [token, payment]);

  const handleApproveAll = async () => {
    if (!token || !orderPending || orderPending.pending_payments.length === 0) return;
    if (!confirm(`ต้องการอนุมัติสลิปทั้งหมด ${orderPending.pending_payments.length} รายการ?`)) return;
    setApprovingAll(true);
    try {
      await api.post(`/orders/${orderPending.order.id}/approve-payments`, {}, token);
      await refreshOrderPending();
      if (payment) {
        const detail = await api.get<{ payment: PaymentDetail }>(`/payments/${payment.id}`, token);
        setPayment(detail.payment);
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setApprovingAll(false);
    }
  };

  const handleRejectPending = async (paymentId: number) => {
    const reason = prompt("ระบุเหตุผลในการปฏิเสธ:");
    if (!reason || !token) return;
    try {
      await api.post(`/payments/${paymentId}/reject`, { reason }, token);
      await refreshOrderPending();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const handleApprove = async () => {
    if (!token || !payment || !confirm("ต้องการอนุมัติการชำระเงินนี้?")) return;
    try {
      await api.post(`/payments/${payment.id}/approve`, {}, token);
      // Reload
      const detail = await api.get<{ payment: PaymentDetail }>(`/payments/${payment.id}`, token);
      setPayment(detail.payment);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const handleReject = async () => {
    const reason = prompt("ระบุเหตุผลในการปฏิเสธ:");
    if (!reason || !token || !payment) return;
    try {
      await api.post(`/payments/${payment.id}/reject`, { reason }, token);
      const detail = await api.get<{ payment: PaymentDetail }>(`/payments/${payment.id}`, token);
      setPayment(detail.payment);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  // QR Scanner using BarcodeDetector API
  const startScanning = async () => {
    setScanning(true);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Use BarcodeDetector if available, otherwise decode manually
      if ("BarcodeDetector" in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState !== 4) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const value = barcodes[0].rawValue;
              if (value === lastScannedRef.current) return;
              lastScannedRef.current = value;
              setManualInput("");
              lookupPayment(value);
              // Reset after 3s to allow re-scanning same code
              setTimeout(() => { lastScannedRef.current = ""; }, 3000);
            }
          } catch {
            // retry
          }
        }, 500);
      } else {
        // Fallback: capture frames to canvas for manual processing
        setError("เบราว์เซอร์ไม่รองรับ BarcodeDetector — กรุณาพิมพ์เลขที่ชำระเงินด้านล่าง");
        stopScanning();
      }
    } catch {
      setError("ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้กล้อง");
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => { stopScanning(); };
  }, []);

  return (
    <>
      <Header title="การชำระเงิน" />
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {/* Scanner section */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">สแกน QR Code ตรวจสอบการชำระเงิน</h3>

          {/* Camera preview */}
          {scanning && (
            <div className="relative mb-4 rounded-lg overflow-hidden bg-black">
              <video ref={videoRef} className="w-full max-h-64 object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/60 rounded-lg" />
              </div>
              <button
                onClick={stopScanning}
                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          <div className="flex gap-2">
            {!scanning && (
              <button
                onClick={startScanning}
                className="flex items-center gap-2 px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                เปิดกล้องสแกน
              </button>
            )}
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") lookupPayment(manualInput); }}
                placeholder="พิมพ์เลขที่ชำระเงิน หรือ เลขที่คำสั่งซื้อ..."
                className="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
              <button
                onClick={() => lookupPayment(manualInput)}
                disabled={loading || !manualInput.trim()}
                className="px-4 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? "กำลังค้นหา..." : "ค้นหา"}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">{error}</div>
          )}
        </div>

        {/* Payment result */}
        {payment && (
          <div className="space-y-4">
            {/* Payment info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{payment.payment_number}</h3>
                  <p className="text-sm text-gray-500">{METHOD_MAP[payment.method] || payment.method}{payment.is_deposit ? " (มัดจำ)" : ""}</p>
                </div>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${(STATUS_MAP[payment.status] || STATUS_MAP.pending).color}`}>
                  {(STATUS_MAP[payment.status] || STATUS_MAP.pending).label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">จำนวนเงิน</span>
                  <p className="text-2xl font-bold text-gray-800">{formatCurrency(payment.amount)} <span className="text-sm font-normal">บาท</span></p>
                </div>
                <div>
                  <span className="text-gray-500">วันที่ชำระ</span>
                  <p className="font-medium text-gray-800">{formatDate(payment.created_at)}</p>
                </div>
                {payment.sender_name && (
                  <div>
                    <span className="text-gray-500">ผู้โอน</span>
                    <p className="font-medium text-gray-800">{payment.sender_name}</p>
                    {payment.sender_bank && <p className="text-xs text-gray-400">{payment.sender_bank}</p>}
                  </div>
                )}
                {payment.slip_ref && (
                  <div>
                    <span className="text-gray-500">Ref</span>
                    <p className="font-mono text-sm text-gray-800">{payment.slip_ref}</p>
                  </div>
                )}
                {payment.transfer_amount && (
                  <div>
                    <span className="text-gray-500">ยอดโอนจริง</span>
                    <p className="font-medium text-gray-800">{formatCurrency(payment.transfer_amount)} บาท</p>
                  </div>
                )}
                {payment.transfer_date && (
                  <div>
                    <span className="text-gray-500">วันที่โอน</span>
                    <p className="font-medium text-gray-800">{formatDate(payment.transfer_date)}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">สร้างโดย</span>
                  <p className="font-medium text-gray-800">{payment.creator?.name || "-"}</p>
                </div>
                {payment.approver && (
                  <div>
                    <span className="text-gray-500">อนุมัติโดย</span>
                    <p className="font-medium text-gray-800">{payment.approver.name}</p>
                    {payment.approved_at && <p className="text-xs text-gray-400">{formatDate(payment.approved_at)}</p>}
                  </div>
                )}
                {payment.notes && (
                  <div className="col-span-2">
                    <span className="text-gray-500">หมายเหตุ</span>
                    <p className="text-gray-800">{payment.notes}</p>
                  </div>
                )}
                {payment.reject_reason && (
                  <div className="col-span-2">
                    <span className="text-red-500">เหตุผลที่ปฏิเสธ</span>
                    <p className="text-red-700 font-medium">{payment.reject_reason}</p>
                  </div>
                )}
              </div>

              {/* Slip badges */}
              {payment.slip_verified && (
                <div className="mt-3 flex items-center gap-1 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  สลิปยืนยันถูกต้อง
                </div>
              )}
              {payment.slip_status_code && !payment.slip_verified && payment.slip_status_code !== "error" && (
                <div className="mt-3 text-sm text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200">
                  ⚠ สลิป: {({"200401":"ผู้รับไม่ตรง","200402":"ยอดไม่ตรง","200404":"ไม่พบสลิป","200500":"สลิปปลอม","200501":"สลิปซ้ำ"} as Record<string,string>)[payment.slip_status_code] || payment.slip_status_code}
                </div>
              )}

              {/* Action buttons */}
              {payment.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <button onClick={handleApprove} className="flex-1 px-4 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                    อนุมัติการชำระเงิน
                  </button>
                  <button onClick={handleReject} className="flex-1 px-4 py-2.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium">
                    ปฏิเสธ
                  </button>
                </div>
              )}
            </div>

            {/* Slip image */}
            {payment.slip_image && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">สลิปการโอนเงิน</h4>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${apiUrl}/storage/${payment.slip_image}`}
                  alt="Slip"
                  className="max-w-full max-h-96 rounded-lg border border-gray-200 mx-auto"
                />
              </div>
            )}

            {/* Order info */}
            {payment.order && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-800">ข้อมูลคำสั่งซื้อ</h4>
                  <span className="text-xs text-gray-500">{ORDER_STATUS_MAP[payment.order.status] || payment.order.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <span className="text-gray-500">เลขที่คำสั่งซื้อ</span>
                    <p className="font-mono font-medium text-gray-800">{payment.order.order_number}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">ลูกค้า</span>
                    <p className="font-medium text-gray-800">{payment.order.customer?.name || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">ยอดรวม</span>
                    <p className="font-medium text-gray-800">{formatCurrency(payment.order.total)} บาท</p>
                  </div>
                  <div>
                    <span className="text-gray-500">ชำระแล้ว</span>
                    <p className="font-medium text-green-600">{formatCurrency(payment.order.paid_amount)} บาท</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">คงเหลือ</span>
                    <p className="font-bold text-lg text-red-600">{formatCurrency(payment.order.remaining_amount)} บาท</p>
                  </div>
                </div>

                {/* Order items */}
                {payment.order.items.length > 0 && (
                  <>
                    <h5 className="text-xs font-medium text-gray-500 mb-2 mt-3">รายการสินค้า</h5>
                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left px-3 py-2 font-medium text-gray-500">รายการ</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-500">จำนวน</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-500">รวม</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {payment.order.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-2 text-gray-800">{item.description}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{Number(item.quantity).toLocaleString()} {item.unit}</td>
                              <td className="px-3 py-2 text-right font-medium text-gray-800">{formatCurrency(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Feature #3: all pending slips awaiting approval for this order */}
            {orderPending && orderPending.pending_payments.length > 0 && (
              <div className="bg-white rounded-xl border border-orange-200 p-5">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-gray-800">สลิปที่รอการอนุมัติ ({orderPending.pending_payments.length} รายการ)</h4>
                  <span className="text-xs text-orange-600 font-medium">รวม {formatCurrency(orderPending.pending_total)} บาท</span>
                </div>
                <p className="text-xs text-gray-400 mb-4">คำสั่งซื้อ {orderPending.order.order_number} · คงเหลือ {formatCurrency(orderPending.order.remaining_amount)} บาท</p>

                <div className="space-y-3">
                  {orderPending.pending_payments.map((pp) => (
                    <div key={pp.id} className="flex gap-3 border border-gray-100 rounded-lg p-3">
                      {pp.slip_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${apiUrl}/storage/${pp.slip_image}`}
                          alt="slip"
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-xs text-gray-300 flex-shrink-0">ไม่มีสลิป</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800 text-sm">{pp.payment_number}</span>
                          {pp.is_deposit && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">มัดจำ</span>}
                          {pp.slip_verified && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700">ยืนยันแล้ว</span>}
                        </div>
                        <p className="text-lg font-bold text-gray-800">{formatCurrency(pp.amount)} บาท</p>
                        <p className="text-xs text-gray-400 truncate">
                          {METHOD_MAP[pp.method] || pp.method}
                          {pp.sender_name ? ` · ${pp.sender_name}` : ""}
                          {pp.slip_ref ? ` · ${pp.slip_ref}` : ""}
                        </p>
                        {pp.creator && <p className="text-[11px] text-gray-400">โดย {pp.creator.name}</p>}
                      </div>
                      <button
                        onClick={() => handleRejectPending(pp.id)}
                        className="self-start text-xs px-2.5 py-1 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                      >
                        ปฏิเสธ
                      </button>
                    </div>
                  ))}
                </div>

                {/* Single approve button at the BOTTOM of the slip list */}
                <button
                  onClick={handleApproveAll}
                  disabled={approvingAll}
                  className="w-full mt-4 px-4 py-3 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                >
                  {approvingAll ? "กำลังอนุมัติ..." : `อนุมัติทั้งหมด (${orderPending.pending_payments.length} รายการ)`}
                </button>
              </div>
            )}

            {/* Quick action: search another */}
            <div className="text-center">
              <button
                onClick={() => { setPayment(null); setOrderPending(null); setManualInput(""); setError(""); }}
                className="text-sm text-blue-600 hover:underline"
              >
                ค้นหารายการอื่น
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
