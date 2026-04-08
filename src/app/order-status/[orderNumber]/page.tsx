"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7000/api";

interface OrderStatus {
  order_number: string;
  status: string;
  customer_name: string;
  total: string;
  paid_amount: string;
  remaining_amount: string;
  created_at: string;
  items: { description: string; quantity: string; unit: string; amount: string }[];
  payments: { payment_number: string; method: string; amount: string; status: string; created_at: string }[];
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "รอดำเนินการ", color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: "🕒" },
  in_progress: { label: "อยู่ระหว่างดำเนินการ", color: "bg-blue-50 text-blue-700 border-blue-200", icon: "💳" },
  completed: { label: "คำสั่งซื้อสำเร็จ", color: "bg-green-50 text-green-700 border-green-200", icon: "🎉" },
  cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600 border-red-200", icon: "❌" },
};

const METHOD_MAP: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนเงิน",
  pocket_money: "Pocket Money",
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "รออนุมัติ", color: "text-yellow-600" },
  approved: { label: "อนุมัติ", color: "text-green-600" },
  rejected: { label: "ปฏิเสธ", color: "text-red-600" },
};

export default function PublicOrderStatusPage() {
  const params = useParams();
  const orderNumber = params?.orderNumber as string;
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/orders/status/${encodeURIComponent(orderNumber)}`);
      if (!res.ok) {
        setError("ไม่พบคำสั่งซื้อนี้");
        return;
      }
      const data = await res.json();
      setOrder(data.order);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const formatCurrency = (v: string | number) =>
    Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">กำลังโหลด...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-sm">
          <div className="text-4xl mb-3">😔</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">{error || "ไม่พบข้อมูล"}</h2>
          <p className="text-sm text-gray-500">กรุณาตรวจสอบเลขที่คำสั่งซื้ออีกครั้ง</p>
        </div>
      </div>
    );
  }

  const st = STATUS_MAP[order.status] || STATUS_MAP.pending;
  const total = Number(order.total);
  const paid = Number(order.paid_amount);
  const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-sm text-gray-500 mb-1">คำสั่งซื้อ</p>
          <h1 className="text-xl font-bold text-gray-800">{order.order_number}</h1>
          <p className="text-sm text-gray-500 mt-1">{order.customer_name}</p>
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${st.color}`}>
              <span>{st.icon}</span> {st.label}
            </span>
          </div>
        </div>

        {/* Payment progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">การชำระเงิน</h3>
          <div className="mb-2">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-500">ชำระแล้ว {formatCurrency(order.paid_amount)} / {formatCurrency(order.total)} บาท</span>
              <span className={`font-semibold ${percent === 100 ? 'text-green-600' : 'text-gray-600'}`}>{percent}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${percent === 100 ? 'bg-green-500' : percent > 0 ? 'bg-blue-500' : 'bg-gray-200'}`} style={{ width: `${percent}%` }} />
            </div>
          </div>
          {Number(order.remaining_amount) > 0 && (
            <p className="text-sm text-red-600">คงเหลือ: {formatCurrency(order.remaining_amount)} บาท</p>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">รายการสินค้า</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {order.items.map((item, i) => (
              <div key={i} className="px-5 py-3 flex justify-between text-sm">
                <div>
                  <p className="text-gray-800">{item.description}</p>
                  <p className="text-xs text-gray-400">{Number(item.quantity).toLocaleString()} {item.unit}</p>
                </div>
                <div className="text-right font-medium text-gray-800">{formatCurrency(item.amount)}</div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-200 flex justify-between text-sm font-semibold">
            <span>รวมทั้งสิ้น</span>
            <span>{formatCurrency(order.total)} บาท</span>
          </div>
        </div>

        {/* Payment history */}
        {order.payments.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">ประวัติการชำระเงิน</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {order.payments.map((p, i) => {
                const pst = PAYMENT_STATUS_MAP[p.status] || PAYMENT_STATUS_MAP.pending;
                return (
                  <div key={i} className="px-5 py-3 flex justify-between items-center text-sm">
                    <div>
                      <p className="text-gray-800">{METHOD_MAP[p.method] || p.method}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-800">{formatCurrency(p.amount)} บาท</p>
                      <p className={`text-xs font-medium ${pst.color}`}>{pst.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center pt-2">วันที่สั่งซื้อ: {formatDate(order.created_at)}</p>
      </div>
    </div>
  );
}
