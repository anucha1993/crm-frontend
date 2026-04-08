"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface DeliveryItem {
  id: number;
  order_item_id: number;
  product_id: number | null;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  thickness: string | null;
  length: string | null;
  amount: string;
  weight: string | null;
  product?: { id: number; name: string; code: string; sizes?: { length_unit: string | null }[] } | null;
}

interface DeliveryDetail {
  id: number;
  delivery_number: string;
  order: {
    id: number;
    order_number: string;
    status: string;
    customer: { id: number; name: string; code: string } | null;
    shipping_address: { id: number; label: string | null; contact_name: string | null; phone: string | null; address: string } | null;
  } | null;
  customer: { id: number; name: string; code: string } | null;
  shipping_address: { id: number; label: string | null; contact_name: string | null; phone: string | null; address: string } | null;
  status: string;
  delivery_date: string;
  delivered_at: string | null;
  notes: string | null;
  total_weight: string;
  suggested_vehicle: string | null;
  items: DeliveryItem[];
  creator: { id: number; name: string } | null;
  deliverer: { id: number; name: string } | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "รอจัดส่ง", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  delivering: { label: "กำลังจัดส่ง", color: "bg-blue-50 text-blue-700 border-blue-200" },
  delivered: { label: "จัดส่งแล้ว", color: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600 border-red-200" },
};

function getComputedStatus(delivery: DeliveryDetail): string {
  if (delivery.status === "delivered" || delivery.status === "cancelled") return delivery.status;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(delivery.delivery_date);
  dd.setHours(0, 0, 0, 0);
  return dd <= today ? "delivering" : "pending";
}

export default function DeliveryDetailPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const deliveryId = params?.id as string;

  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDelivery = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ delivery: DeliveryDetail }>(`/deliveries/${deliveryId}`, token);
      setDelivery(data.delivery);
    } catch {
      router.push("/deliveries");
    } finally {
      setLoading(false);
    }
  }, [token, deliveryId, router]);

  useEffect(() => { fetchDelivery(); }, [fetchDelivery]);

  const formatCurrency = (v: string | number) =>
    Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const formatDateShort = (d: string) =>
    new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });

  const handleConfirmDelivery = async () => {
    if (!token || !delivery || !confirm("ต้องการยืนยันจัดส่งใบส่งของนี้?")) return;
    setActionLoading(true);
    try {
      await api.post(`/deliveries/${delivery.id}/confirm`, {}, token);
      fetchDelivery();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!token || !delivery || !confirm("ต้องการยกเลิกใบส่งของนี้?")) return;
    setActionLoading(true);
    try {
      await api.post(`/deliveries/${delivery.id}/cancel`, {}, token);
      fetchDelivery();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintPdf = () => {
    if (!token || !delivery) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7000/api";
    window.open(`${apiUrl}/deliveries/${delivery.id}/pdf?token=${token}`, "_blank");
  };

  if (loading) return <><Header title="ใบส่งสินค้า" /><div className="p-12 text-center text-gray-400">กำลังโหลด...</div></>;
  if (!delivery) return null;

  const computed = getComputedStatus(delivery);
  const st = STATUS_MAP[computed] || STATUS_MAP.pending;
  const addr = delivery.shipping_address || delivery.order?.shipping_address;
  const totalAmount = delivery.items.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <>
      <Header title="ใบส่งสินค้า" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/deliveries")} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-800">{delivery.delivery_number}</h2>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${st.color}`}>{st.label}</span>
              </div>
              {delivery.order && (
                <p className="text-sm text-gray-500 mt-0.5">
                  จากคำสั่งซื้อ{" "}
                  <button onClick={() => window.open(`/orders/${delivery.order!.id}`, '_blank')} className="text-blue-600 hover:underline">
                    {delivery.order.order_number}
                  </button>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrintPdf} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              พิมพ์ใบส่งสินค้า
            </button>
            {delivery.status !== "delivered" && delivery.status !== "cancelled" && (
              <>
                <button onClick={handleConfirmDelivery} disabled={actionLoading} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ยืนยันจัดส่งแล้ว
                </button>
                <button onClick={handleCancel} disabled={actionLoading} className="px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                  ยกเลิก
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & shipping info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">ข้อมูลลูกค้า</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">ชื่อลูกค้า:</span>
                  <p className="font-medium text-gray-800">{delivery.customer?.name || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500">วันจัดส่ง:</span>
                  <p className="font-medium text-gray-800">{formatDateShort(delivery.delivery_date)}</p>
                </div>
                {addr && (
                  <div className="col-span-2">
                    <span className="text-gray-500">ที่อยู่จัดส่ง:</span>
                    <p className="font-medium text-gray-800">{addr.address}</p>
                    {addr.contact_name && (
                      <p className="text-xs text-gray-500">{addr.contact_name} {addr.phone || ""}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Items table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">รายการสินค้า</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8">#</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">รายการ</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500">หนา</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500">ยาว</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500">จำนวน</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500">น้ำหนัก (กก.)</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500">ราคา/หน่วย</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500">รวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {delivery.items.map((item, i) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{item.description}</div>
                          {item.product && <div className="text-xs text-gray-400">{item.product.code}</div>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{item.thickness ? Number(item.thickness).toFixed(2) : "-"}</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {item.length ? (
                            <>{Number(item.length).toFixed(2)} {item.product?.sizes?.[0]?.length_unit || "เมตร"}</>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{Number(item.quantity).toLocaleString()} {item.unit}</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {item.weight && Number(item.weight) > 0 ? Number(item.weight).toLocaleString("th-TH", { maximumFractionDigits: 2 }) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 px-5 py-4">
                <div className="flex flex-col items-end gap-1 text-sm">
                  <div className="flex items-center gap-8">
                    <span className="font-semibold text-gray-800">ยอดรวม:</span>
                    <span className="w-32 text-right font-bold text-lg text-gray-800">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Delivery info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">ข้อมูลการจัดส่ง</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">สถานะ</span><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">วันจัดส่ง</span><span className="text-gray-800">{formatDateShort(delivery.delivery_date)}</span></div>
                {delivery.delivered_at && (
                  <div className="flex justify-between"><span className="text-gray-500">จัดส่งเมื่อ</span><span className="text-gray-800">{formatDate(delivery.delivered_at)}</span></div>
                )}
                {delivery.deliverer && (
                  <div className="flex justify-between"><span className="text-gray-500">จัดส่งโดย</span><span className="text-gray-800">{delivery.deliverer.name}</span></div>
                )}
                <div className="flex justify-between"><span className="text-gray-500">น้ำหนักรวม</span><span className="text-gray-800">{Number(delivery.total_weight) > 0 ? `${Number(delivery.total_weight).toLocaleString("th-TH", { maximumFractionDigits: 2 })} กก.` : "-"}</span></div>
                {delivery.suggested_vehicle && (
                  <div className="flex justify-between"><span className="text-gray-500">รถแนะนำ</span><span className="text-gray-800">{delivery.suggested_vehicle}</span></div>
                )}
              </div>
            </div>

            {/* Order info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">ข้อมูลคำสั่งซื้อ</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">เลขที่</span><span className="text-gray-800">{delivery.order?.order_number || "-"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">สร้างโดย</span><span className="text-gray-800">{delivery.creator?.name || "-"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">วันที่สร้าง</span><span className="text-gray-800">{formatDateShort(delivery.created_at)}</span></div>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">QR Code ใบส่งสินค้า</h3>
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(delivery.delivery_number)}`}
                  alt="QR Code"
                  className="w-36 h-36"
                />
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">สแกนเพื่อยืนยันจัดส่ง</p>
            </div>

            {delivery.notes && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">หมายเหตุ</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{delivery.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
