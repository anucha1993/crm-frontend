"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import ProductSearchSelect from "@/components/ProductSearchSelect";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface Product {
  id: number;
  code: string;
  name: string;
  selling_price: string;
  unit: string;
  thickness: string | null;
  length: string | null;
  category: { id: number; name: string } | null;
  steel_type: string | null;
  side_steel: string | null;
  sizes?: { id: number; thickness: string | null; length: string | null; length_unit?: string | null }[];
}

interface OrderItem {
  id: number;
  product_id: number | null;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  thickness: string | null;
  length: string | null;
  amount: string;
  product?: { id: number; name: string; code: string; sizes?: { length_unit: string | null }[] } | null;
}

interface Payment {
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
  creator: { id: number; name: string } | null;
  approver: { id: number; name: string } | null;
  approved_at: string | null;
  created_at: string;
}

interface TimelineEntry {
  id: number;
  action: string;
  summary: string;
  user: { id: number; name: string } | null;
  created_at: string;
}

interface Order {
  id: number;
  order_number: string;
  quotation: { id: number; quotation_number: string } | null;
  customer: { id: number; name: string; code: string; pocket_money: string } | null;
  shipping_address: { id: number; label: string | null; contact_name: string | null; phone: string | null; address: string } | null;
  status: string;
  delivery_status: string;
  notes: string | null;
  subtotal: string;
  discount_type: string;
  discount_value: string;
  discount_amount: string;
  vat_rate: string;
  vat_amount: string;
  total: string;
  paid_amount: string;
  remaining_amount: string;
  items: OrderItem[];
  payments: Payment[];
  deliveries: OrderDelivery[];
  invoices: OrderInvoice[];
  creator: { id: number; name: string } | null;
  updater: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
}

interface OrderDelivery {
  id: number;
  delivery_number: string;
  status: string;
  delivery_date: string;
  delivered_at: string | null;
  total_weight: string;
  suggested_vehicle: string | null;
  items: { id: number; order_item_id: number; quantity: string; unit: string; description: string }[];
  creator: { id: number; name: string } | null;
}

interface RemainingItem {
  order_item_id: number;
  description: string;
  quantity: number;
  delivered: number;
  remaining: number;
  unit: string;
  weight_per_unit: number;
}

interface OrderInvoice {
  id: number;
  invoice_number: string;
  status: string;
  issue_date: string;
  total: string;
  cancel_reason: string | null;
  creator: { id: number; name: string } | null;
}

const DELIVERY_STATUS_MAP: Record<string, { label: string; color: string }> = {
  not_delivered: { label: "ยังไม่จัดส่ง", color: "bg-gray-50 text-gray-700 border-gray-200" },
  partially_delivered: { label: "จัดส่งแล้วบางส่วน", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  fully_delivered: { label: "จัดส่งครบแล้ว", color: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "ยกเลิกการจัดส่ง", color: "bg-red-50 text-red-600 border-red-200" },
};

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "รอดำเนินการ", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  in_progress: { label: "อยู่ระหว่างดำเนินการ", color: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "คำสั่งซื้อสำเร็จ", color: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600 border-red-200" },
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "รออนุมัติ", color: "bg-yellow-50 text-yellow-700" },
  approved: { label: "อนุมัติ", color: "bg-green-50 text-green-700" },
  rejected: { label: "ปฏิเสธ", color: "bg-red-50 text-red-600" },
};

const METHOD_MAP: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนเงิน",
  pocket_money: "Pocket Money",
};

export default function OrderDetailPage() {
  const { token, accountType } = useAuth();
  const isCash = accountType === 'cash';
  const invoiceLabel = isCash ? 'บิลเงินสด' : 'ใบกำกับภาษี';
  const invoiceVerb = isCash ? 'ออกบิลเงินสด' : 'ออกใบกำกับภาษี';
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);

  // Payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "pocket_money">("transfer");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentIsDeposit, setPaymentIsDeposit] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [slipFiles, setSlipFiles] = useState<File[]>([]);
  const [paymentSaving, setPaymentSaving] = useState(false);

  // Slip verification (multi)
  const [slipVerifying, setSlipVerifying] = useState<Record<number, boolean>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [slipResults, setSlipResults] = useState<Record<number, { code: string; message?: string; data?: any }>>({});

  // Reject modal
  const [rejectingPayment, setRejectingPayment] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Status change
  const [changingStatus, setChangingStatus] = useState(false);

  // Slip preview
  const [previewSlip, setPreviewSlip] = useState<string | null>(null);

  // Delivery form
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [remainingItems, setRemainingItems] = useState<RemainingItem[]>([]);
  const [deliveryQuantities, setDeliveryQuantities] = useState<Record<number, string>>({});
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [fullyDelivered, setFullyDelivered] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<"detail" | "payments" | "deliveries" | "invoices">("detail");

  // Invoice
  const [invoiceCreating, setInvoiceCreating] = useState(false);
  const [cancellingInvoice, setCancellingInvoice] = useState<OrderInvoice | null>(null);
  const [cancelInvoiceReason, setCancelInvoiceReason] = useState("");

  // Order items editing
  const [editingItems, setEditingItems] = useState(false);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editWarnings, setEditWarnings] = useState<{ type: string; message: string }[]>([]);
  const [editDiscountType, setEditDiscountType] = useState<"percent" | "amount">("amount");
  const [editDiscountValue, setEditDiscountValue] = useState(0);
  const [editIncludeVat, setEditIncludeVat] = useState(false);
  const [editVatRate, setEditVatRate] = useState(7);
  const [products, setProducts] = useState<Product[]>([]);

  const fetchOrder = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ order: Order }>(`/orders/${orderId}`, token);
      setOrder(data.order);
    } catch {
      router.push("/orders");
    } finally {
      setLoading(false);
    }
  }, [token, orderId, router]);

  const fetchTimeline = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ logs: TimelineEntry[] }>(`/orders/${orderId}/timeline`, token);
      setTimeline(data.logs);
    } catch { /* silent */ }
  }, [token, orderId]);

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ data: Product[] }>("/products?per_page=999", token);
      setProducts(data.data);
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => { fetchOrder(); fetchTimeline(); fetchProducts(); }, [fetchOrder, fetchTimeline, fetchProducts]);

  // Calculate item amount based on thickness/length (same logic as quotation)
  const calcItemAmount = (thickness: number | null, length: number | null, quantity: number, unitPrice: number) => {
    if (thickness && thickness > 0) {
      return Math.round(thickness * (length ?? 1) * quantity * unitPrice * 100) / 100;
    }
    if (length && length > 0) {
      return Math.round(length * quantity * unitPrice * 100) / 100;
    }
    return Math.round(quantity * unitPrice * 100) / 100;
  };

  const formatCurrency = (v: string | number) =>
    Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const formatDateShort = (d: string) =>
    new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });

  const getPaymentPercent = () => {
    if (!order) return 0;
    const total = Number(order.total);
    const paid = Number(order.paid_amount);
    if (total <= 0) return 0;
    return Math.min(100, Math.round((paid / total) * 100));
  };

  // Slip verification on file select (multi)
  const handleSlipFilesAdd = async (files: FileList | null) => {
    if (!files || files.length === 0 || !token) return;
    const newFiles = Array.from(files);
    const startIndex = slipFiles.length;
    setSlipFiles((prev) => [...prev, ...newFiles]);

    // Verify each new file
    for (let i = 0; i < newFiles.length; i++) {
      const fileIndex = startIndex + i;
      const file = newFiles[i];
      setSlipVerifying((prev) => ({ ...prev, [fileIndex]: true }));
      try {
        const formData = new FormData();
        formData.append('slip_image', file);
        if (paymentAmount) formData.append('amount', paymentAmount);
        const result = await api.upload<{ code: string; message?: string; data?: Record<string, unknown> }>('/payments/verify-slip', formData, token);
        setSlipResults((prev) => {
          const updated = { ...prev, [fileIndex]: result };
          // Sum all verified slip amounts
          const total = Object.values(updated).reduce((sum, r) => {
            const amt = r?.data?.amount ? Number(r.data.amount) : 0;
            return sum + amt;
          }, 0);
          if (total > 0) setPaymentAmount(String(total));
          return updated;
        });
      } catch {
        setSlipResults((prev) => ({ ...prev, [fileIndex]: { code: 'error', message: 'ตรวจสอบสลิปไม่สำเร็จ' } }));
      } finally {
        setSlipVerifying((prev) => ({ ...prev, [fileIndex]: false }));
      }
    }
  };

  const handleRemoveSlip = (index: number) => {
    setSlipFiles((prev) => prev.filter((_, i) => i !== index));
    // Rebuild results & verifying maps with shifted indices, recalculate total
    setSlipResults((prev) => {
      const next: Record<number, typeof prev[number]> = {};
      Object.keys(prev).forEach((k) => {
        const ki = Number(k);
        if (ki < index) next[ki] = prev[ki];
        else if (ki > index) next[ki - 1] = prev[ki];
      });
      // Recalculate total amount from remaining slips
      const total = Object.values(next).reduce((sum, r) => {
        const amt = r?.data?.amount ? Number(r.data.amount) : 0;
        return sum + amt;
      }, 0);
      setPaymentAmount(total > 0 ? String(total) : '');
      return next;
    });
    setSlipVerifying((prev) => {
      const next: Record<number, boolean> = {};
      Object.keys(prev).forEach((k) => {
        const ki = Number(k);
        if (ki < index) next[ki] = prev[ki];
        else if (ki > index) next[ki - 1] = prev[ki];
      });
      return next;
    });
  };

  const SLIP_CODES: Record<string, { label: string; color: string }> = {
    '200000': { label: 'พบข้อมูลสลิปในระบบธนาคาร', color: 'text-green-700 bg-green-50 border-green-200' },
    '200200': { label: 'สลิปถูกต้อง', color: 'text-green-700 bg-green-50 border-green-200' },
    '200401': { label: 'บัญชีผู้รับไม่ตรง', color: 'text-orange-700 bg-orange-50 border-orange-200' },
    '200402': { label: 'ยอดโอนไม่ตรง', color: 'text-orange-700 bg-orange-50 border-orange-200' },
    '200403': { label: 'วันที่โอนไม่ตรง', color: 'text-orange-700 bg-orange-50 border-orange-200' },
    '200404': { label: 'ไม่พบข้อมูลสลิปในระบบธนาคาร', color: 'text-red-700 bg-red-50 border-red-200' },
    '200500': { label: 'สลิปปลอม', color: 'text-red-700 bg-red-50 border-red-200' },
    '200501': { label: 'สลิปซ้ำ', color: 'text-red-700 bg-red-50 border-red-200' },
    'error': { label: 'ตรวจสอบสลิปไม่สำเร็จ', color: 'text-red-700 bg-red-50 border-red-200' },
  };

  // Payment actions
  const handleCreatePayment = async () => {
    if (!token || !order) return;
    setPaymentSaving(true);
    try {
      const formData = new FormData();
      formData.append("method", paymentMethod);
      formData.append("amount", paymentAmount);
      formData.append("is_deposit", paymentIsDeposit ? "1" : "0");
      if (paymentNotes) formData.append("notes", paymentNotes);
      slipFiles.forEach((file) => formData.append("slip_images[]", file));
      const result = await api.upload<{ payments: Payment[] }>(`/orders/${order.id}/payments`, formData, token);

      // Show slip verification results summary
      const payments = result.payments;
      const transferPayments = payments.filter(p => p.slip_image && p.method === 'transfer');
      if (transferPayments.length > 0) {
        const SLIP_CODES: Record<string, string> = {
          '200000': 'พบข้อมูลสลิปในระบบธนาคาร',
          '200200': 'สลิปถูกต้อง',
          '200401': 'บัญชีผู้รับไม่ตรง',
          '200402': 'ยอดโอนไม่ตรง',
          '200403': 'วันที่โอนไม่ตรง',
          '200404': 'ไม่พบข้อมูลสลิปในระบบธนาคาร',
          '200500': 'สลิปปลอม',
          '200501': 'สลิปซ้ำ',
          'error': 'ตรวจสอบสลิปไม่สำเร็จ',
        };
        const lines = transferPayments.map((p, i) => {
          const code = p.slip_status_code || '';
          const msg = SLIP_CODES[code] || `รหัส: ${code}`;
          const icon = p.slip_verified ? '✅' : '⚠️';
          return `${icon} สลิป ${i + 1}: ${msg}`;
        });
        alert(lines.join('\n'));
      }

      setShowPaymentForm(false);
      setPaymentMethod("transfer");
      setPaymentAmount("");
      setPaymentIsDeposit(false);
      setPaymentNotes("");
      setSlipFiles([]);
      setSlipResults({});
      fetchOrder();
      fetchTimeline();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleApprovePayment = async (payment: Payment) => {
    if (!token || !confirm("ต้องการอนุมัติการชำระเงินนี้?")) return;
    try {
      await api.post(`/payments/${payment.id}/approve`, {}, token);
      fetchOrder();
      fetchTimeline();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const handleRejectPayment = async () => {
    if (!token || !rejectingPayment) return;
    try {
      await api.post(`/payments/${rejectingPayment.id}/reject`, { reason: rejectReason }, token);
      setRejectingPayment(null);
      setRejectReason("");
      fetchOrder();
      fetchTimeline();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const handleResubmitPayment = async (payment: Payment) => {
    if (!token) return;
    try {
      await api.post(`/payments/${payment.id}/resubmit`, {}, token);
      fetchOrder();
      fetchTimeline();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!token || !order) return;
    setChangingStatus(true);
    try {
      await api.put(`/orders/${order.id}`, { status: newStatus }, token);
      fetchOrder();
      fetchTimeline();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setChangingStatus(false);
    }
  };

  const openDeliveryForm = async () => {
    if (!token || !order) return;
    try {
      const data = await api.get<{ items: RemainingItem[]; fully_delivered: boolean }>(`/orders/${order.id}/delivery-remaining`, token);
      if (data.fully_delivered) {
        alert("สินค้าในคำสั่งซื้อนี้ถูกจัดส่งครบหมดแล้ว");
        return;
      }
      setRemainingItems(data.items);
      setFullyDelivered(data.fully_delivered);
      // Pre-fill with all remaining
      const qtys: Record<number, string> = {};
      data.items.forEach((item) => {
        if (item.remaining > 0) qtys[item.order_item_id] = String(item.remaining);
      });
      setDeliveryQuantities(qtys);
      setDeliveryDate(new Date().toISOString().split("T")[0]);
      setDeliveryNotes("");
      setShowDeliveryForm(true);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const handleCreateDelivery = async () => {
    if (!token || !order) return;
    const items = Object.entries(deliveryQuantities)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([orderItemId, qty]) => ({
        order_item_id: Number(orderItemId),
        quantity: Number(qty),
      }));

    if (items.length === 0) {
      alert("กรุณาระบุจำนวนสินค้าที่ต้องการจัดส่ง");
      return;
    }

    if (!deliveryDate) {
      alert("กรุณาระบุวันจัดส่ง");
      return;
    }

    setDeliverySaving(true);
    try {
      await api.post(`/orders/${order.id}/deliveries`, {
        delivery_date: deliveryDate,
        notes: deliveryNotes || undefined,
        items,
      }, token);

      setShowDeliveryForm(false);
      fetchOrder();
      fetchTimeline();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setDeliverySaving(false);
    }
  };

  const getDeliveryComputedStatus = (d: OrderDelivery): string => {
    if (d.status === "delivered" || d.status === "cancelled") return d.status;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dd = new Date(d.delivery_date);
    dd.setHours(0, 0, 0, 0);
    return dd <= today ? "delivering" : "pending";
  };

  const DELIVERY_ITEM_STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending: { label: "รอจัดส่ง", color: "bg-yellow-50 text-yellow-700" },
    delivering: { label: "กำลังจัดส่ง", color: "bg-blue-50 text-blue-700" },
    delivered: { label: "จัดส่งแล้ว", color: "bg-green-50 text-green-700" },
    cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600" },
  };

  const INVOICE_STATUS_MAP: Record<string, { label: string; color: string }> = {
    issued: { label: "ออกแล้ว", color: "bg-green-50 text-green-700" },
    cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600" },
  };

  const handleCreateInvoice = async () => {
    if (!token || !order) return;
    if (!confirm(`ต้องการ${invoiceVerb}สำหรับคำสั่งซื้อนี้?`)) return;
    setInvoiceCreating(true);
    try {
      await api.post(`/orders/${order.id}/invoices`, {}, token);
      fetchOrder();
      fetchTimeline();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setInvoiceCreating(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!token || !cancellingInvoice) return;
    try {
      await api.post(`/invoices/${cancellingInvoice.id}/cancel`, { reason: cancelInvoiceReason }, token);
      setCancellingInvoice(null);
      setCancelInvoiceReason("");
      fetchOrder();
      fetchTimeline();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const handlePrintInvoice = (invoiceId: number) => {
    if (!token) return;
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/invoices/${invoiceId}/pdf?token=${token}`, '_blank');
  };

  const handlePrintDelivery = (deliveryId: number) => {
    if (!token) return;
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/deliveries/${deliveryId}/pdf?token=${token}`, '_blank');
  };

  // Order items editing
  const startEditItems = () => {
    if (!order) return;
    setEditItems(order.items.map(it => {
      const thickness = it.thickness ? Number(it.thickness) : null;
      const length = it.length ? Number(it.length) : null;
      const qty = Number(it.quantity) || 0;
      const price = Number(it.unit_price) || 0;
      return { ...it, amount: String(calcItemAmount(thickness, length, qty, price)) };
    }));
    setEditDiscountType((order.discount_type as "percent" | "amount") || "amount");
    setEditDiscountValue(Number(order.discount_value) || 0);
    setEditVatRate(Number(order.vat_rate) || 7);
    setEditIncludeVat(!isCash && Number(order.vat_rate) > 0);
    setEditingItems(true);
  };

  const cancelEditItems = () => {
    setEditingItems(false);
    setEditItems([]);
  };

  const updateEditItem = (idx: number, field: string, value: string | number | null) => {
    setEditItems(prev => {
      const updated = [...prev];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updated[idx] as any)[field] = value;
      const item = updated[idx];
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      const thickness = item.thickness != null && item.thickness !== "" ? Number(item.thickness) : null;
      const length = item.length != null && item.length !== "" ? Number(item.length) : null;
      updated[idx].amount = String(calcItemAmount(thickness, length, qty, price));
      return updated;
    });
  };

  const selectEditProduct = (idx: number, productId: string) => {
    const product = products.find(p => p.id === Number(productId));
    if (!product) {
      updateEditItem(idx, "product_id", null);
      return;
    }
    setEditItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const price = Number(product.selling_price);
      const firstSize = product.sizes?.[0];
      const thickness = product.thickness ? Number(product.thickness) : firstSize?.thickness ? Number(firstSize.thickness) : null;
      const length = product.length ? Number(product.length) : firstSize?.length ? Number(firstSize.length) : null;
      const qty = Number(it.quantity) || 1;
      const amount = calcItemAmount(thickness, length, qty, price);
      return {
        ...it,
        product_id: product.id,
        unit: product.unit || "ชิ้น",
        unit_price: String(price),
        thickness: thickness != null ? String(thickness) : null,
        length: length != null ? String(length) : null,
        amount: String(amount),
      };
    }));
  };

  const addEditItem = () => {
    setEditItems(prev => [...prev, { id: 0, product_id: null, description: "", quantity: "1", unit: "ชิ้น", unit_price: "0", thickness: null, length: null, amount: "0" }]);
  };

  const removeEditItem = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Edit-mode totals (mirrors quotation page)
  const editSubtotal = editItems.reduce((sum, it) => {
    const thickness = it.thickness != null && it.thickness !== "" ? Number(it.thickness) : null;
    const length = it.length != null && it.length !== "" ? Number(it.length) : null;
    return sum + calcItemAmount(thickness, length, Number(it.quantity) || 0, Number(it.unit_price) || 0);
  }, 0);
  const editDiscountAmount = editDiscountType === "percent" ? Math.round(editSubtotal * editDiscountValue / 100 * 100) / 100 : editDiscountValue;
  const editAfterDiscount = editSubtotal - editDiscountAmount;
  const editEffectiveVatRate = editIncludeVat ? editVatRate : 0;
  const editVatAmount = Math.round(editAfterDiscount * editEffectiveVatRate / 100 * 100) / 100;
  const editTotal = Math.round((editAfterDiscount + editVatAmount) * 100) / 100;

  const saveEditItems = async () => {
    if (!order || !token) return;
    if (editItems.length === 0 || !editItems.some(it => it.product_id || it.description.trim())) {
      alert("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
      return;
    }
    setEditSaving(true);
    try {
      const payload = {
        items: editItems.filter(it => it.product_id || it.description.trim()).map(it => ({
          ...(it.id ? { id: it.id } : {}),
          product_id: it.product_id,
          thickness: it.thickness != null && it.thickness !== "" ? Number(it.thickness) : null,
          length: it.length != null && it.length !== "" ? Number(it.length) : null,
          description: it.description,
          quantity: Number(it.quantity),
          unit: it.unit,
          unit_price: Number(it.unit_price),
        })),
        discount_type: editDiscountType,
        discount_value: editDiscountValue,
        vat_rate: isCash ? 0 : (editIncludeVat ? editVatRate : 0),
      };
      const res = await api.put<{ order: Order; warnings?: { type: string; message: string }[] }>(`/orders/${order.id}`, payload, token);
      setOrder(res.order);
      setEditingItems(false);
      setEditItems([]);
      if (res.warnings && res.warnings.length > 0) {
        setEditWarnings(res.warnings);
      }
    } catch (err) {
      if (err instanceof ApiError) alert(err.errors ? Object.values(err.errors).flat().join("\n") : err.message);
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) return <><Header title="คำสั่งซื้อ" /><div className="p-12 text-center text-gray-400">กำลังโหลด...</div></>;
  if (!order) return null;

  const percent = getPaymentPercent();
  const st = ORDER_STATUS_MAP[order.status] || ORDER_STATUS_MAP.pending;
  const ds = DELIVERY_STATUS_MAP[order.delivery_status] || DELIVERY_STATUS_MAP.not_delivered;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:7000";

  return (
    <>
      <Header title="คำสั่งซื้อ" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/orders")} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-800">{order.order_number}</h2>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${st.color}`}>{st.label}</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${ds.color}`}>{ds.label}</span>
              </div>
              {order.quotation && (
                <p className="text-sm text-gray-500 mt-0.5">
                  จากใบเสนอราคา{" "}
                  <button onClick={() => window.open(`/quotations/${order.quotation!.id}`, '_blank')} className="text-blue-600 hover:underline">
                    {order.quotation.quotation_number}
                  </button>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTimeline(!showTimeline)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ไทม์ไลน์
            </button>
            {order.status !== "cancelled" && order.status !== "completed" && (
              <button onClick={() => { if (confirm("ต้องการยกเลิกคำสั่งซื้อนี้?")) handleStatusChange("cancelled"); }} disabled={changingStatus} className="px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">ยกเลิก</button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">ยอดรวมทั้งสิ้น</p>
            <p className="text-lg font-bold text-gray-800">{formatCurrency(order.total)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">ชำระแล้ว</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-green-600">{formatCurrency(order.paid_amount)}</p>
              <span className="text-xs text-gray-400">({percent}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
              <div className={`h-1.5 rounded-full transition-all ${percent === 100 ? 'bg-green-500' : percent > 0 ? 'bg-blue-500' : 'bg-gray-200'}`} style={{ width: `${percent}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">คงเหลือ</p>
            <p className={`text-lg font-bold ${Number(order.remaining_amount) > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(order.remaining_amount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">ใบส่งสินค้า</p>
            <p className="text-lg font-bold text-gray-800">{order.deliveries?.length || 0} <span className="text-sm font-normal text-gray-400">รายการ</span></p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-0 -mb-px">
            {([
              { key: "detail" as const, label: "รายละเอียด", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
              { key: "payments" as const, label: `การชำระเงิน (${order.payments.length})`, icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
              { key: "deliveries" as const, label: `ใบส่งสินค้า (${order.deliveries?.length || 0})`, icon: "M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" },
              { key: "invoices" as const, label: `${invoiceLabel} (${order.invoices?.length || 0})`, icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-green-600 text-green-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab: Detail */}
            {activeTab === "detail" && (
              <>
                {/* Customer & shipping info */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">ข้อมูลลูกค้า</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">ชื่อลูกค้า:</span>
                      <p className="font-medium text-gray-800">{order.customer?.name || "-"}</p>
                      <p className="text-xs text-gray-400">{order.customer?.code}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Pocket Money:</span>
                      <p className="font-medium text-gray-800">{formatCurrency(order.customer?.pocket_money || 0)} บาท</p>
                    </div>
                    {order.shipping_address && (
                      <div className="col-span-2">
                        <span className="text-gray-500">ที่อยู่จัดส่ง:</span>
                        <p className="font-medium text-gray-800">{order.shipping_address.address}</p>
                        {order.shipping_address.contact_name && (
                          <p className="text-xs text-gray-500">{order.shipping_address.contact_name} {order.shipping_address.phone || ""}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">รายการสินค้า</h3>
                    {!editingItems && order.status !== "cancelled" && (
                      <button onClick={startEditItems} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        แก้ไข
                      </button>
                    )}
                    {editingItems && (
                      <div className="flex items-center gap-2">
                        <button onClick={cancelEditItems} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">ยกเลิก</button>
                        <button onClick={saveEditItems} disabled={editSaving} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                          {editSaving ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                      </div>
                    )}
                  </div>
                  {editingItems ? (
                    <div className="p-5">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left px-2 py-2 font-medium text-gray-500 w-8">#</th>
                            <th className="text-left px-2 py-2 font-medium text-gray-500 w-[200px]">สินค้า</th>
                            <th className="text-right px-2 py-2 font-medium text-gray-500 w-24">ความหนา</th>
                            <th className="text-right px-2 py-2 font-medium text-gray-500 w-24">ความยาว</th>
                            <th className="text-right px-2 py-2 font-medium text-gray-500 w-24">จำนวน</th>
                            <th className="text-left px-2 py-2 font-medium text-gray-500 w-20">หน่วย</th>
                            <th className="text-right px-2 py-2 font-medium text-gray-500 w-28">ราคา/หน่วย</th>
                            <th className="text-right px-2 py-2 font-medium text-gray-500 w-28">จำนวนเงิน</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {editItems.map((item, idx) => {
                            const selectedProduct = products.find(p => p.id === item.product_id);
                            const isFloorSlab = selectedProduct?.category?.name?.startsWith("แผ่นพื้น") || false;
                            const thicknessNum = item.thickness != null && item.thickness !== "" ? Number(item.thickness) : null;
                            const lengthNum = item.length != null && item.length !== "" ? Number(item.length) : null;
                            const computedAmount = calcItemAmount(thicknessNum, lengthNum, Number(item.quantity) || 0, Number(item.unit_price) || 0);
                            return (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="px-2 py-2 text-gray-400 text-xs align-top pt-3">{idx + 1}</td>
                                <td className="px-2 py-2">
                                  <ProductSearchSelect products={products} value={item.product_id} onChange={(val) => selectEditProduct(idx, val)} />
                                  <input type="text" value={item.description} onChange={(e) => updateEditItem(idx, "description", e.target.value)} className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="รายละเอียด *" />
                                </td>
                                <td className="px-1 py-2">
                                  {isFloorSlab ? (
                                    <input type="number" value={item.thickness ?? ""} onChange={(e) => updateEditItem(idx, "thickness", e.target.value || null)} className="w-full px-1.5 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" min="0" step="0.01" placeholder="หนา" />
                                  ) : (
                                    <span className="text-gray-300 text-center block">-</span>
                                  )}
                                </td>
                                <td className="px-1 py-2">
                                  <input type="number" value={item.length ?? ""} onChange={(e) => updateEditItem(idx, "length", e.target.value || null)} className="w-full px-1.5 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" min="0" step="0.01" placeholder="ยาว" />
                                </td>
                                <td className="px-1 py-2">
                                  <input type="number" value={item.quantity} onChange={(e) => updateEditItem(idx, "quantity", e.target.value)} className="w-full px-1.5 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" min="0.01" step="0.01" />
                                </td>
                                <td className="px-1 py-2">
                                  <input type="text" value={item.unit} onChange={(e) => updateEditItem(idx, "unit", e.target.value)} className="w-full px-1.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                                </td>
                                <td className="px-1 py-2">
                                  <input type="number" value={item.unit_price} onChange={(e) => updateEditItem(idx, "unit_price", e.target.value)} className="w-full px-1.5 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" min="0" step="0.01" />
                                </td>
                                <td className="px-2 py-2 text-right font-medium text-gray-700">{formatCurrency(computedAmount)}</td>
                                <td className="px-1 py-2">
                                  {editItems.length > 1 && (
                                    <button onClick={() => removeEditItem(idx)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          <tr>
                            <td colSpan={9} className="px-2 py-2">
                              <button onClick={addEditItem} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                เพิ่มรายการ
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      {/* Totals editor (matches quotation) */}
                      <div className="mt-6 flex justify-end">
                        <div className="w-full max-w-sm space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">ยอดรวม</span>
                            <span className="font-medium">{formatCurrency(editSubtotal)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-gray-500">ส่วนลด</span>
                            <div className="flex items-center gap-1">
                              <select value={editDiscountType} onChange={(e) => setEditDiscountType(e.target.value as "percent" | "amount")} className="px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500">
                                <option value="amount">บาท</option>
                                <option value="percent">%</option>
                              </select>
                              <input type="number" value={editDiscountValue} onChange={(e) => setEditDiscountValue(Number(e.target.value))} className="w-24 px-2 py-1 text-sm text-right border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500" min="0" step="0.01" />
                            </div>
                            <span className="font-medium text-red-500">-{formatCurrency(editDiscountAmount)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={editIncludeVat} onChange={(e) => setEditIncludeVat(e.target.checked)} disabled={isCash} className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 disabled:opacity-50" />
                              <span className="text-gray-500">VAT</span>
                            </label>
                            {isCash ? (
                              <span className="text-gray-400 text-xs">บัญชีบิลเงินสด ไม่คิดภาษี</span>
                            ) : editIncludeVat ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <input type="number" value={editVatRate} onChange={(e) => setEditVatRate(Number(e.target.value))} className="w-16 px-2 py-1 text-sm text-right border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500" min="0" max="100" step="0.01" />
                                  <span className="text-xs text-gray-400">%</span>
                                </div>
                                <span className="font-medium">+{formatCurrency(editVatAmount)}</span>
                              </>
                            ) : (
                              <span className="text-gray-400 text-xs">ไม่รวม VAT</span>
                            )}
                          </div>
                          <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                            <span className="text-gray-700">ยอดสุทธิ</span>
                            <span className="text-green-700">{formatCurrency(editTotal)} บาท</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                              <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8">#</th>
                              <th className="text-left px-4 py-2.5 font-medium text-gray-500">รายการ</th>
                              <th className="text-right px-4 py-2.5 font-medium text-gray-500">หนา</th>
                              <th className="text-right px-4 py-2.5 font-medium text-gray-500">ยาว</th>
                              <th className="text-right px-4 py-2.5 font-medium text-gray-500">จำนวน</th>
                              <th className="text-right px-4 py-2.5 font-medium text-gray-500">ราคา/หน่วย</th>
                              <th className="text-right px-4 py-2.5 font-medium text-gray-500">รวม</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {order.items.map((item, i) => (
                              <tr key={item.id}>
                                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-800">{item.product?.name || item.description || "-"}</div>
                                  {item.product?.code && <div className="text-xs text-gray-400">{item.product.code}{item.description && item.description !== item.product.name ? ` — ${item.description}` : ""}</div>}
                                  {!item.product && item.description && <div className="text-xs text-gray-400">{item.description}</div>}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">{item.thickness ? Number(item.thickness).toFixed(2) : "-"}</td>
                                <td className="px-4 py-3 text-right text-gray-600">
                                  {item.length ? (
                                    <>{Number(item.length).toFixed(2)} {item.product?.sizes?.[0]?.length_unit || "เมตร"}</>
                                  ) : "-"}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">{Number(item.quantity).toLocaleString()} {item.unit}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                                <td className="px-4 py-3 text-right font-medium text-gray-800">{formatCurrency(item.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Totals (read-only) */}
                      <div className="border-t border-gray-200 px-5 py-4">
                        <div className="flex flex-col items-end gap-1 text-sm">
                          <div className="flex items-center gap-8"><span className="text-gray-500">ยอดรวม:</span><span className="w-32 text-right">{formatCurrency(order.subtotal)}</span></div>
                          {Number(order.discount_amount) > 0 && (
                            <div className="flex items-center gap-8"><span className="text-gray-500">ส่วนลด{order.discount_type === "percent" ? ` (${order.discount_value}%)` : ""}:</span><span className="w-32 text-right text-red-500">-{formatCurrency(order.discount_amount)}</span></div>
                          )}
                          {Number(order.vat_amount) > 0 && (
                            <div className="flex items-center gap-8"><span className="text-gray-500">VAT ({order.vat_rate}%):</span><span className="w-32 text-right">{formatCurrency(order.vat_amount)}</span></div>
                          )}
                          <div className="flex items-center gap-8 pt-2 border-t border-gray-200 mt-1"><span className="font-semibold text-gray-800">รวมทั้งสิ้น:</span><span className="w-32 text-right font-bold text-lg text-gray-800">{formatCurrency(order.total)}</span></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Tab: Payments */}
            {activeTab === "payments" && (
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">การชำระเงิน</h3>
                  {order.status !== "cancelled" && order.status !== "completed" && (
                    <button onClick={() => setShowPaymentForm(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      เพิ่มการชำระเงิน
                    </button>
                  )}
                </div>

                {/* Payment summary bar */}
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-6">
                      <span className="text-gray-500">ยอดรวม: <span className="font-medium text-gray-800">{formatCurrency(order.total)}</span></span>
                      <span className="text-gray-500">ชำระแล้ว: <span className="font-medium text-green-600">{formatCurrency(order.paid_amount)}</span></span>
                      <span className="text-gray-500">คงเหลือ: <span className="font-bold text-red-600">{formatCurrency(order.remaining_amount)}</span></span>
                    </div>
                    <span className={`font-semibold ${percent === 100 ? 'text-green-600' : 'text-gray-800'}`}>{percent}%</span>
                  </div>
                </div>

                {order.payments.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">ยังไม่มีรายการชำระเงิน</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {order.payments.map((p) => {
                      const pst = PAYMENT_STATUS_MAP[p.status] || PAYMENT_STATUS_MAP.pending;
                      return (
                        <div key={p.id} className="px-5 py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs text-gray-600">{p.payment_number}</span>
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${pst.color}`}>{pst.label}</span>
                                {p.is_deposit && <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">มัดจำ</span>}
                                {p.slip_verified && <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">✓ Slip ยืนยัน</span>}
                                {p.slip_status_code && !p.slip_verified && p.slip_status_code !== 'error' && (
                                  <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                                    ⚠ Slip: {({'200401':'ผู้รับไม่ตรง','200402':'ยอดไม่ตรง','200404':'ไม่พบสลิป','200500':'สลิปปลอม','200501':'สลิปซ้ำ'} as Record<string,string>)[p.slip_status_code] || p.slip_status_code}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-gray-500">{METHOD_MAP[p.method] || p.method}</span>
                                <span className="font-semibold text-gray-800">{formatCurrency(p.amount)} บาท</span>
                              </div>
                              {p.sender_name && <p className="text-xs text-gray-400 mt-1">ผู้โอน: {p.sender_name} ({p.sender_bank}){p.transfer_amount ? ` — ${formatCurrency(p.transfer_amount)} บาท` : ''}</p>}
                              {p.slip_ref && <p className="text-xs text-gray-400 mt-0.5">Ref: {p.slip_ref}</p>}
                              {p.notes && <p className="text-xs text-gray-400 mt-1">{p.notes}</p>}
                              {p.reject_reason && <p className="text-xs text-red-500 mt-1">เหตุผล: {p.reject_reason}</p>}
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                <span>โดย {p.creator?.name}</span>
                                <span>{formatDate(p.created_at)}</span>
                                {p.approver && <span>อนุมัติโดย {p.approver.name}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {p.slip_image && (
                                <button onClick={() => setPreviewSlip(`${apiUrl}/storage/${p.slip_image}`)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="ดูสลิป">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </button>
                              )}
                              {p.status === "pending" && (
                                <>
                                  <button onClick={() => handleApprovePayment(p)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="อนุมัติ">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  </button>
                                  <button onClick={() => { setRejectingPayment(p); setRejectReason(""); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ปฏิเสธ">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </>
                              )}
                              {p.status === "rejected" && (
                                <button onClick={() => handleResubmitPayment(p)} className="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">ส่งใหม่</button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Deliveries */}
            {activeTab === "deliveries" && (
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">ใบส่งสินค้า</h3>
                  {order.status !== "cancelled" && order.delivery_status !== "fully_delivered" && (
                    <button onClick={openDeliveryForm} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      สร้างใบส่งของ
                    </button>
                  )}
                </div>

                {(!order.deliveries || order.deliveries.length === 0) ? (
                  <div className="p-8 text-center text-gray-400 text-sm">ยังไม่มีใบส่งสินค้า</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {order.deliveries.map((d) => {
                      const dcs = getDeliveryComputedStatus(d);
                      const dst = DELIVERY_ITEM_STATUS_MAP[dcs] || DELIVERY_ITEM_STATUS_MAP.pending;
                      return (
                        <div key={d.id} className="px-5 py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <button onClick={() => window.open(`/deliveries/${d.id}`, '_blank')} className="font-mono text-xs text-green-700 hover:underline">{d.delivery_number}</button>
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${dst.color}`}>{dst.label}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>วันจัดส่ง: {formatDateShort(d.delivery_date)}</span>
                                {d.total_weight && Number(d.total_weight) > 0 && (
                                  <span>น้ำหนัก: {Number(d.total_weight).toLocaleString("th-TH", { maximumFractionDigits: 2 })} กก.</span>
                                )}
                                {d.suggested_vehicle && <span>รถ: {d.suggested_vehicle}</span>}
                              </div>
                              <div className="mt-1 text-xs text-gray-400">
                                {d.items.map((item) => `${item.description} x${Number(item.quantity).toLocaleString()}`).join(", ")}
                              </div>
                              {d.delivered_at && (
                                <p className="text-xs text-green-600 mt-1">จัดส่งเมื่อ: {formatDate(d.delivered_at)}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handlePrintDelivery(d.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="พิมพ์ PDF">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                              </button>
                              <button onClick={() => window.open(`/deliveries/${d.id}`, '_blank')} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="ดูรายละเอียด">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Invoices */}
            {activeTab === "invoices" && (
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">{invoiceLabel}</h3>
                  {order.status !== "cancelled" && Number(order.remaining_amount) === 0 && !order.invoices?.some(inv => inv.status === "issued") && (
                    <button onClick={handleCreateInvoice} disabled={invoiceCreating} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      {invoiceCreating ? "กำลังออก..." : invoiceVerb}
                    </button>
                  )}
                </div>

                {Number(order.remaining_amount) > 0 && (
                  <div className="px-5 py-3 bg-yellow-50 border-b border-yellow-100">
                    <p className="text-sm text-yellow-700">⚠️ ต้องชำระเงินครบก่อนจึงจะ{invoiceVerb}ได้ (คงเหลือ {formatCurrency(order.remaining_amount)} บาท)</p>
                  </div>
                )}

                {(!order.invoices || order.invoices.length === 0) ? (
                  <div className="p-8 text-center text-gray-400 text-sm">ยังไม่มี{invoiceLabel}</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {order.invoices.map((inv) => {
                      const ist = INVOICE_STATUS_MAP[inv.status] || INVOICE_STATUS_MAP.issued;
                      return (
                        <div key={inv.id} className="px-5 py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs text-gray-700">{inv.invoice_number}</span>
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ist.color}`}>{ist.label}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-gray-500">วันที่: {formatDateShort(inv.issue_date)}</span>
                                <span className="font-semibold text-gray-800">{formatCurrency(inv.total)} บาท</span>
                              </div>
                              {inv.cancel_reason && <p className="text-xs text-red-500 mt-1">เหตุผล: {inv.cancel_reason}</p>}
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                <span>โดย {inv.creator?.name}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handlePrintInvoice(inv.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="พิมพ์ PDF">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                              </button>
                              {inv.status === "issued" && (
                                <button onClick={() => { setCancellingInvoice(inv); setCancelInvoiceReason(""); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ยกเลิก">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">ข้อมูลคำสั่งซื้อ</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">สร้างโดย</span><span className="text-gray-800">{order.creator?.name || "-"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">วันที่สร้าง</span><span className="text-gray-800">{formatDateShort(order.created_at)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">แก้ไขล่าสุด</span><span className="text-gray-800">{formatDateShort(order.updated_at)}</span></div>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">QR Code สถานะคำสั่งซื้อ</h3>
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/order-status/${order.order_number}`)}`}
                  alt="QR Code"
                  className="w-36 h-36"
                />
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">สแกนเพื่อดูสถานะคำสั่งซื้อ</p>
            </div>

            {order.notes && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">หมายเหตุ</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline panel */}
        {showTimeline && (
          <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">ไทม์ไลน์</h3>
              <button onClick={() => setShowTimeline(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {timeline.length === 0 ? (
                <p className="text-sm text-gray-400 text-center mt-8">ยังไม่มีรายการ</p>
              ) : (
                <div className="space-y-0">
                  {timeline.map((entry, i) => {
                    const colors: Record<string, string> = {
                      order_created: "bg-green-500",
                      order_status_changed: "bg-blue-500",
                      created: "bg-yellow-500",
                      approved: "bg-green-500",
                      rejected: "bg-red-500",
                      resubmitted: "bg-blue-500",
                    };
                    const dotColor = colors[entry.action] || "bg-gray-400";
                    return (
                      <div key={entry.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${dotColor}`} />
                          {i < timeline.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                        </div>
                        <div className="pb-4 flex-1">
                          <p className="text-sm text-gray-800">{entry.summary}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                            <span>{entry.user?.name || "System"}</span>
                            <span>{formatDate(entry.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment form modal */}
        {showPaymentForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">เพิ่มการชำระเงิน</h3>
                <button onClick={() => setShowPaymentForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ช่องทางชำระเงิน</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["transfer", "cash", "pocket_money"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${paymentMethod === m ? "bg-green-50 border-green-300 text-green-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                      >
                        {METHOD_MAP[m]}
                      </button>
                    ))}
                  </div>
                  {paymentMethod === "pocket_money" && (
                    <p className="text-xs text-gray-400 mt-1">คงเหลือ: {formatCurrency(order.customer?.pocket_money || 0)} บาท</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน (บาท)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={`คงเหลือ ${formatCurrency(order.remaining_amount)}`}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={paymentIsDeposit} onChange={(e) => setPaymentIsDeposit(e.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-gray-700">มัดจำ</span>
                </label>
                {paymentMethod === "transfer" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">แนบสลิป</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      multiple
                      onChange={(e) => handleSlipFilesAdd(e.target.files)}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {slipFiles.length > 0 && (
                      <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                        {slipFiles.map((file, idx) => {
                          const verifying = slipVerifying[idx];
                          const result = slipResults[idx];
                          const code = result?.code || '';
                          const info = SLIP_CODES[code] || null;
                          const isSuccess = code === '200000' || code === '200200';
                          const d = result?.data;
                          return (
                            <div key={idx} className={`rounded-lg border p-3 text-sm ${info ? info.color : 'border-gray-200 bg-gray-50'}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 font-medium text-gray-700 min-w-0">
                                  <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                  <span className="truncate">{file.name}</span>
                                </div>
                                <button onClick={() => handleRemoveSlip(idx)} className="ml-2 p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600 flex-shrink-0" title="ลบสลิป">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                              {verifying && (
                                <div className="mt-2 flex items-center gap-2 text-blue-600">
                                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                  กำลังตรวจสอบ...
                                </div>
                              )}
                              {result && !verifying && info && (
                                <>
                                  <div className="mt-2 flex items-center gap-1.5 font-medium">
                                    {isSuccess ? (
                                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" /></svg>
                                    )}
                                    {info.label}
                                  </div>
                                  {d && (
                                    <div className="mt-1 space-y-0.5 text-xs text-gray-700">
                                      {d.transRef && <div><span className="text-gray-500">Ref:</span> {d.transRef}</div>}
                                      {d.amount && <div><span className="text-gray-500">จำนวนเงิน:</span> {Number(d.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</div>}
                                      {d.sender?.account?.name?.th && <div><span className="text-gray-500">ผู้โอน:</span> {d.sender.account.name.th}</div>}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
                <button onClick={() => setShowPaymentForm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">ยกเลิก</button>
                <button onClick={handleCreatePayment} disabled={paymentSaving || !paymentAmount} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                  {paymentSaving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject modal */}
        {rejectingPayment && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">ปฏิเสธการชำระเงิน</h3>
                <p className="text-sm text-gray-500 mt-1">{rejectingPayment.payment_number}</p>
              </div>
              <div className="p-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">เหตุผล</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
                  placeholder="ระบุเหตุผลในการปฏิเสธ..."
                />
              </div>
              <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
                <button onClick={() => setRejectingPayment(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">ยกเลิก</button>
                <button onClick={handleRejectPayment} disabled={!rejectReason.trim()} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">ปฏิเสธ</button>
              </div>
            </div>
          </div>
        )}

        {/* Slip preview modal */}
        {previewSlip && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreviewSlip(null)}>
            <div className="relative max-w-lg max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setPreviewSlip(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <img src={previewSlip} alt="Slip" className="max-w-full max-h-[80vh] rounded-xl shadow-xl" />
            </div>
          </div>
        )}

        {/* Delivery form modal */}
        {showDeliveryForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">สร้างใบส่งสินค้า</h3>
                <button onClick={() => setShowDeliveryForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันจัดส่ง</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">รายการสินค้า</label>
                  <div className="space-y-3">
                    {remainingItems.filter(item => item.remaining > 0).map((item) => (
                      <div key={item.order_item_id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800">{item.description}</span>
                          <span className="text-xs text-gray-500">
                            คงเหลือ {item.remaining.toLocaleString()} / {item.quantity.toLocaleString()} {item.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={item.remaining}
                            step="1"
                            value={deliveryQuantities[item.order_item_id] || ""}
                            onChange={(e) => setDeliveryQuantities((prev) => ({
                              ...prev,
                              [item.order_item_id]: e.target.value,
                            }))}
                            placeholder="0"
                            className="w-28 px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                          />
                          <span className="text-sm text-gray-500">{item.unit}</span>
                          {item.weight_per_unit > 0 && deliveryQuantities[item.order_item_id] && Number(deliveryQuantities[item.order_item_id]) > 0 && (
                            <span className="text-xs text-gray-400 ml-auto">
                              ~{(Number(deliveryQuantities[item.order_item_id]) * item.weight_per_unit).toLocaleString("th-TH", { maximumFractionDigits: 2 })} กก.
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {remainingItems.filter(item => item.remaining > 0).length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">สินค้าทั้งหมดถูกจัดส่งครบแล้ว</p>
                    )}
                  </div>
                </div>

                {/* Total weight estimate */}
                {(() => {
                  const totalWeight = remainingItems.reduce((sum, item) => {
                    const qty = Number(deliveryQuantities[item.order_item_id] || 0);
                    return sum + qty * item.weight_per_unit;
                  }, 0);
                  if (totalWeight <= 0) return null;
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-700 font-medium">น้ำหนักรวมโดยประมาณ</span>
                        <span className="text-blue-800 font-semibold">{totalWeight.toLocaleString("th-TH", { maximumFractionDigits: 2 })} กก.</span>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                  <textarea
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
                <button onClick={() => setShowDeliveryForm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">ยกเลิก</button>
                <button
                  onClick={handleCreateDelivery}
                  disabled={deliverySaving || !deliveryDate || Object.values(deliveryQuantities).every(q => !q || Number(q) <= 0)}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {deliverySaving ? "กำลังบันทึก..." : "สร้างใบส่งสินค้า"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel invoice modal */}
        {cancellingInvoice && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">ยกเลิกใบกำกับภาษี</h3>
                <p className="text-sm text-gray-500 mt-1">{cancellingInvoice.invoice_number}</p>
              </div>
              <div className="p-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">เหตุผล</label>
                <textarea
                  value={cancelInvoiceReason}
                  onChange={(e) => setCancelInvoiceReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
                  placeholder="ระบุเหตุผลในการยกเลิก..."
                />
              </div>
              <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
                <button onClick={() => setCancellingInvoice(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">ยกเลิก</button>
                <button onClick={handleCancelInvoice} disabled={!cancelInvoiceReason.trim()} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">ยืนยันยกเลิก</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Warnings Modal */}
        {editWarnings.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">บันทึกสำเร็จ — ข้อสังเกตเอกสารที่เกี่ยวข้อง</h3>
                  <p className="text-sm text-gray-500">กรุณาตรวจสอบเอกสารที่เกี่ยวข้องให้สอดคล้อง</p>
                </div>
              </div>
              <div className="space-y-2 mb-6">
                {editWarnings.map((w, i) => (
                  <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${w.type === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'}`}>
                    <span className="mt-0.5">{w.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                    <span>{w.message}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={() => setEditWarnings([])} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  รับทราบ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
