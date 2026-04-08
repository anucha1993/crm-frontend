"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

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
  }[];
  creator: { id: number; name: string } | null;
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

export default function DeliveryScanPage() {
  const { token } = useAuth();
  const [delivery, setDelivery] = useState<DeliveryLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

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

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      <Header title="สแกน QR ยืนยันจัดส่ง" />
      <div className="p-6 max-w-2xl mx-auto space-y-6">
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-3 py-2 font-medium text-gray-500 w-8">#</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">รายการ</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500">จำนวน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {delivery.items.map((item, i) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 text-gray-800">{item.description}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{Number(item.quantity).toLocaleString()} {item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
      </div>
    </>
  );
}
