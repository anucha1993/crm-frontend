"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import ProductSearchSelect from "@/components/ProductSearchSelect";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface CustomerLevel { id: number; name: string; color: string; }
interface ShippingAddress { id?: number; label: string | null; contact_name: string | null; phone: string | null; address: string; is_default: boolean; }
interface Customer { id: number; code: string; name: string; type: string; tax_id: string | null; contact_name: string | null; phone: string | null; email: string | null; line_id: string | null; address: string | null; customer_level_id: number | null; level: CustomerLevel | null; addresses: ShippingAddress[]; }
interface Product { id: number; code: string; name: string; selling_price: string; unit: string; thickness: string | null; length: string | null; category: { id: number; name: string } | null; steel_type: string | null; side_steel: string | null; sizes?: { id: number; thickness: string | null; length: string | null }[]; }
interface QuotationItem { id?: number; product_id: number | null; description: string; thickness: number | null; length: number | null; quantity: number; unit: string; unit_price: number; amount: number; }
interface Revision { id: number; revision_number: number; action: string; summary: string; changes: Record<string, { from: string; to: string }> | null; user: { id: number; name: string } | null; created_at: string; }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "ร่าง", color: "bg-gray-100 text-gray-600" },
  sent: { label: "ส่งแล้ว", color: "bg-blue-50 text-blue-700" },
  approved: { label: "อนุมัติ", color: "bg-green-50 text-green-700" },
  rejected: { label: "ไม่อนุมัติ", color: "bg-red-50 text-red-600" },
  cancelled: { label: "ยกเลิก", color: "bg-orange-50 text-orange-600" },
};

const emptyItem: QuotationItem = { product_id: null, description: "", thickness: null, length: null, quantity: 1, unit: "ชิ้น", unit_price: 0, amount: 0 };

export default function QuotationFormPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quotationId = params?.id as string | undefined;
  const isEdit = quotationId && quotationId !== "create";

  // Quotation state
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerAddressId, setCustomerAddressId] = useState<number | null>(null);
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("amount");
  const [discountValue, setDiscountValue] = useState(0);
  const [vatRate, setVatRate] = useState(7);
  const [includeVat, setIncludeVat] = useState(false);
  const [items, setItems] = useState<QuotationItem[]>([{ ...emptyItem }]);
  const [quotationNumber, setQuotationNumber] = useState("");
  const [createdByName, setCreatedByName] = useState("");
  const [revisionNumber, setRevisionNumber] = useState(0);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);

  // Customer state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [levels, setLevels] = useState<CustomerLevel[]>([]);
  const [customerForm, setCustomerForm] = useState({ name: "", type: "general", customer_level_id: "", tax_id: "", contact_name: "", phone: "", email: "", line_id: "", address: "" });
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);

  // Product state
  const [products, setProducts] = useState<Product[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!isEdit);

  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  // Fetch data
  const fetchProducts = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ data: Product[] }>("/products?per_page=999", token);
      setProducts(data.data);
    } catch { /* silent */ }
  }, [token]);

  const fetchCustomers = useCallback(async (search = "") => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("per_page", "20");
      const data = await api.get<{ data: Customer[] }>(`/customers?${params}`, token);
      setCustomers(data.data);
    } catch { /* silent */ }
  }, [token]);

  const fetchLevels = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ customer_levels: CustomerLevel[] }>("/customer-levels?active_only=1", token);
      setLevels(data.customer_levels);
    } catch { /* silent */ }
  }, [token]);

  const fetchQuotation = useCallback(async () => {
    if (!token || !isEdit) return;
    try {
      const data = await api.get<{ quotation: { id: number; quotation_number: string; customer_id: number; customer_address_id: number | null; status: string; notes: string | null; discount_type: string; discount_value: string; vat_rate: string; customer: Customer; creator?: { id: number; name: string } | null; items: { id: number; product_id: number | null; thickness: string | null; length: string | null; description: string; quantity: string; unit: string; unit_price: string; amount: string }[] } }>(`/quotations/${quotationId}`, token);
      const q = data.quotation;
      setQuotationNumber(q.quotation_number);
      setRevisionNumber((q as unknown as { revision_number: number }).revision_number || 0);
      if (q.creator?.name) setCreatedByName(q.creator.name);
      setCustomerId(q.customer_id);
      setSelectedCustomer(q.customer);
      setCustomerAddressId(q.customer_address_id);
      setStatus(q.status);
      setNotes(q.notes || "");
      setDiscountType(q.discount_type as "percent" | "amount");
      setDiscountValue(Number(q.discount_value));
      setVatRate(Number(q.vat_rate));
      setIncludeVat(Number(q.vat_rate) > 0);
      setItems(q.items.map(it => ({ id: it.id, product_id: it.product_id, thickness: it.thickness ? Number(it.thickness) : null, length: it.length ? Number(it.length) : null, description: it.description, quantity: Number(it.quantity), unit: it.unit, unit_price: Number(it.unit_price), amount: Number(it.amount) })));
    } catch { /* silent */ } finally { setLoading(false); }
  }, [token, isEdit, quotationId]);

  const fetchNextNumber = useCallback(async () => {
    if (!token || isEdit) return;
    try {
      const data = await api.get<{ number: string }>("/quotations/next-number", token);
      setQuotationNumber(data.number);
    } catch { /* silent */ }
  }, [token, isEdit]);

  useEffect(() => { fetchProducts(); fetchLevels(); fetchCustomers(); fetchNextNumber(); }, [fetchProducts, fetchLevels, fetchCustomers, fetchNextNumber]);
  useEffect(() => { fetchQuotation(); }, [fetchQuotation]);

  const fetchRevisions = useCallback(async () => {
    if (!token || !isEdit) return;
    try {
      const data = await api.get<{ revisions: Revision[] }>(`/quotations/${quotationId}/revisions`, token);
      setRevisions(data.revisions);
    } catch { /* silent */ }
  }, [token, isEdit, quotationId]);

  useEffect(() => { if (showTimeline) fetchRevisions(); }, [showTimeline, fetchRevisions]);

  // Calculate item amount based on thickness/length
  const calcItemAmount = (thickness: number | null, length: number | null, quantity: number, unitPrice: number) => {
    if (thickness && thickness > 0) {
      return Math.round(thickness * (length ?? 1) * quantity * unitPrice * 100) / 100;
    }
    if (length && length > 0) {
      return Math.round(length * quantity * unitPrice * 100) / 100;
    }
    return Math.round(quantity * unitPrice * 100) / 100;
  };

  // Calculations
  const subtotal = items.reduce((sum, it) => sum + calcItemAmount(it.thickness, it.length, it.quantity, it.unit_price), 0);
  const discountAmount = discountType === "percent" ? Math.round(subtotal * discountValue / 100 * 100) / 100 : discountValue;
  const afterDiscount = subtotal - discountAmount;
  const effectiveVatRate = includeVat ? vatRate : 0;
  const vatAmount = Math.round(afterDiscount * effectiveVatRate / 100 * 100) / 100;
  const total = Math.round((afterDiscount + vatAmount) * 100) / 100;

  // Item handlers
  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof QuotationItem, value: string | number | null) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: value };
      if (field === "thickness" || field === "length" || field === "quantity" || field === "unit_price") {
        updated.amount = calcItemAmount(updated.thickness, updated.length, updated.quantity, updated.unit_price);
      }
      return updated;
    }));
  };

  const selectProduct = (idx: number, productId: string) => {
    const product = products.find(p => p.id === Number(productId));
    if (!product) {
      updateItem(idx, "product_id", null);
      return;
    }
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const price = Number(product.selling_price);
      const firstSize = product.sizes?.[0];
      const thickness = product.thickness ? Number(product.thickness) : firstSize?.thickness ? Number(firstSize.thickness) : null;
      const length = product.length ? Number(product.length) : firstSize?.length ? Number(firstSize.length) : null;
      const amount = calcItemAmount(thickness, length, it.quantity, price);
      return { ...it, product_id: product.id, description: "", unit: product.unit || "ชิ้น", unit_price: price, thickness, length, amount };
    }));
  };

  // Customer select
  const handleSelectCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setSelectedCustomer(c);
    setCustomerSearch("");
    setShowCustomerDropdown(false);
    const defaultAddr = c.addresses?.find(a => a.is_default);
    setCustomerAddressId(defaultAddr?.id || null);
  };

  // Customer modal
  const openCreateCustomer = () => {
    setEditingCustomer(false);
    setCustomerForm({ name: "", type: "general", customer_level_id: "", tax_id: "", contact_name: "", phone: "", email: "", line_id: "", address: "" });
    setShippingAddresses([]);
    setShowCustomerModal(true);
  };

  const openEditCustomer = () => {
    if (!selectedCustomer) return;
    setEditingCustomer(true);
    setCustomerForm({
      name: selectedCustomer.name, type: selectedCustomer.type, customer_level_id: selectedCustomer.customer_level_id?.toString() || "",
      tax_id: selectedCustomer.tax_id || "", contact_name: selectedCustomer.contact_name || "", phone: selectedCustomer.phone || "",
      email: selectedCustomer.email || "", line_id: selectedCustomer.line_id || "", address: selectedCustomer.address || "",
    });
    setShippingAddresses(selectedCustomer.addresses?.map(a => ({ ...a })) || []);
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async () => {
    try {
      const payload = {
        name: customerForm.name, type: customerForm.type,
        customer_level_id: customerForm.customer_level_id || null,
        tax_id: customerForm.tax_id || null, contact_name: customerForm.contact_name || null,
        phone: customerForm.phone || null, email: customerForm.email || null,
        line_id: customerForm.line_id || null, address: customerForm.address || null,
        shipping_addresses: shippingAddresses.filter(a => a.address?.trim()),
      };
      let data: { customer: Customer };
      if (editingCustomer && selectedCustomer) {
        data = await api.put<{ customer: Customer }>(`/customers/${selectedCustomer.id}`, payload, token!);
      } else {
        data = await api.post<{ customer: Customer }>("/customers", payload, token!);
      }
      setSelectedCustomer(data.customer);
      setCustomerId(data.customer.id);
      const defaultAddr = data.customer.addresses?.find(a => a.is_default);
      setCustomerAddressId(defaultAddr?.id || customerAddressId);
      setShowCustomerModal(false);
      fetchCustomers();
    } catch (err) {
      alert(err instanceof ApiError ? (err.errors ? Object.values(err.errors).flat().join(", ") : err.message) : "เกิดข้อผิดพลาด");
    }
  };

  const addShipping = () => setShippingAddresses(prev => [...prev, { label: "", contact_name: "", phone: "", address: "", is_default: false }]);
  const removeShipping = (idx: number) => setShippingAddresses(prev => prev.filter((_, i) => i !== idx));
  const updateShipping = (idx: number, field: keyof ShippingAddress, value: string | boolean) => {
    setShippingAddresses(prev => prev.map((a, i) => {
      if (i !== idx) return field === "is_default" && value === true ? { ...a, is_default: false } : a;
      return { ...a, [field]: value };
    }));
  };

  // Save quotation
  const handleSave = async () => {
    if (!customerId) { setError("กรุณาเลือกลูกค้า"); return; }
    if (items.length === 0 || !items.some(it => it.description.trim())) { setError("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        customer_id: customerId,
        customer_address_id: customerAddressId,
        status,
        notes: notes || null,
        discount_type: discountType,
        discount_value: discountValue,
        vat_rate: includeVat ? vatRate : 0,
        items: items.filter(it => it.description.trim()).map(it => ({
          ...(it.id ? { id: it.id } : {}),
          product_id: it.product_id,
          thickness: it.thickness,
          length: it.length,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unit_price,
        })),
      };
      if (isEdit) {
        await api.put(`/quotations/${quotationId}`, payload, token!);
      } else {
        await api.post("/quotations", payload, token!);
      }
      router.push("/quotations");
    } catch (err) {
      if (err instanceof ApiError) setError(err.errors ? Object.values(err.errors).flat().join(", ") : err.message);
      else setError("เกิดข้อผิดพลาด");
    } finally { setSaving(false); }
  };

  const formatCurrency = (v: number) => v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return <><Header title="ใบเสนอราคา" /><div className="p-12 text-center text-gray-400">กำลังโหลด...</div></>;

  return (
    <>
      <Header title={isEdit ? `แก้ไขใบเสนอราคา ${quotationNumber}${revisionNumber > 0 ? ` (Rev.${String(revisionNumber).padStart(2, '0')})` : ''}` : "สร้างใบเสนอราคา"} />
      <div className="p-6 space-y-6">
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}

        {/* 2-column layout: Left = Items, Right = Customer */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
          {/* Left: Items */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">รายการสินค้า / บริการ</h3>
              </div>

              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-3 py-2 font-medium text-gray-500 w-10">#</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 min-w-[200px]">สินค้า</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500 w-24">ความหนา</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500 w-24">ความยาว</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500 w-24">จำนวน</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 w-20">หน่วย</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500 w-28">ราคา/หน่วย</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500 w-28">จำนวนเงิน</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const selectedProduct = products.find(p => p.id === item.product_id);
                      const isFloorSlab = selectedProduct?.category?.name?.startsWith("แผ่นพื้น") || false;
                      return (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="px-3 py-2 text-gray-400 text-xs align-top pt-3">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <ProductSearchSelect products={products} value={item.product_id} onChange={(val) => selectProduct(idx, val)} />
                          <input type="text" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="รายละเอียด *" />
                        </td>
                        <td className="px-3 py-2">
                          {isFloorSlab ? (
                            <input type="number" value={item.thickness ?? ""} onChange={(e) => updateItem(idx, "thickness", e.target.value ? Number(e.target.value) : null)} className="w-full px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" min="0" step="0.01" placeholder="หนา" />
                          ) : (
                            <span className="text-gray-300 text-center block">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" value={item.length ?? ""} onChange={(e) => updateItem(idx, "length", e.target.value ? Number(e.target.value) : null)} className="w-full px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" min="0" step="0.01" placeholder="ยาว" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="w-full px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" min="0.01" step="0.01" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="text" value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} className="w-full px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" min="0" step="0.01" />
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-700">{formatCurrency(calcItemAmount(item.thickness, item.length, item.quantity, item.unit_price))}</td>
                        <td className="px-3 py-2">
                          {items.length > 1 && (
                            <button onClick={() => removeItem(idx)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    );})}
                    <tr>
                      <td colSpan={9} className="px-3 py-2">
                        <button onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          เพิ่มรายการ
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-sm space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">ยอดรวม</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-500">ส่วนลด</span>
                    <div className="flex items-center gap-1">
                      <select value={discountType} onChange={(e) => setDiscountType(e.target.value as "percent" | "amount")} className="px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500">
                        <option value="amount">บาท</option>
                        <option value="percent">%</option>
                      </select>
                      <input type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} className="w-24 px-2 py-1 text-sm text-right border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500" min="0" step="0.01" />
                    </div>
                    <span className="font-medium text-red-500">-{formatCurrency(discountAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={includeVat} onChange={(e) => setIncludeVat(e.target.checked)} className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500" />
                      <span className="text-gray-500">VAT</span>
                    </label>
                    {includeVat ? (
                      <>
                        <div className="flex items-center gap-1">
                          <input type="number" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} className="w-16 px-2 py-1 text-sm text-right border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500" min="0" max="100" step="0.01" />
                          <span className="text-xs text-gray-400">%</span>
                        </div>
                        <span className="font-medium">+{formatCurrency(vatAmount)}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">ไม่รวม VAT</span>
                    )}
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                    <span className="text-gray-700">ยอดสุทธิ</span>
                    <span className="text-green-700">{formatCurrency(total)} บาท</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <label className={labelClass}>หมายเหตุ</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} rows={3} placeholder="หมายเหตุเพิ่มเติม..." />
            </div>
          </div>

          {/* Right: Meta + Customer */}
          <div className="space-y-6">
            {/* Status & subject */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>เลขที่ใบเสนอราคา</label>
                  <input type="text" value={quotationNumber} readOnly className={`${inputClass} bg-gray-50`} />
                </div>
                <div>
                  <label className={labelClass}>สถานะ</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                {(createdByName || user?.name) && (
                  <div>
                    <label className={labelClass}>ผู้สร้าง</label>
                    <p className="text-sm text-gray-600">{createdByName || user?.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">ข้อมูลลูกค้า</h3>
                <div className="flex gap-2">
                  {selectedCustomer && (
                    <button onClick={openEditCustomer} className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      แก้ไข
                    </button>
                  )}
                  <button onClick={openCreateCustomer} className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    เพิ่มใหม่
                  </button>
                </div>
              </div>

              {/* Customer search */}
              <div className="relative mb-4">
                <label className={labelClass}>เลือกลูกค้า *</label>
                <input
                  type="text"
                  value={selectedCustomer ? `${selectedCustomer.code} - ${selectedCustomer.name}` : customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setCustomerId(null); setShowCustomerDropdown(true); fetchCustomers(e.target.value); }}
                  onFocus={() => { if (!selectedCustomer) setShowCustomerDropdown(true); }}
                  className={inputClass}
                  placeholder="ค้นหาชื่อลูกค้า / รหัส..."
                />
                {selectedCustomer && (
                  <button onClick={() => { setSelectedCustomer(null); setCustomerId(null); setCustomerAddressId(null); setCustomerSearch(""); }} className="absolute right-2 top-8 p-1 text-gray-400 hover:text-red-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
                {showCustomerDropdown && !selectedCustomer && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {customers.length === 0 ? (
                      <div className="p-3 text-sm text-gray-400 text-center">ไม่พบลูกค้า</div>
                    ) : customers.map(c => (
                      <button key={c.id} onClick={() => handleSelectCustomer(c)} className="w-full text-left px-4 py-2.5 hover:bg-green-50 text-sm transition-colors border-b border-gray-50 last:border-0">
                        <div className="font-medium text-gray-800">{c.name}</div>
                        <div className="text-xs text-gray-400">{c.code} {c.phone ? `• ${c.phone}` : ""}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer info display */}
              {selectedCustomer && (
                <div className="p-3 bg-gray-50 rounded-lg mb-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-xs text-gray-400">ชื่อลูกค้า</span><p className="text-sm font-medium">{selectedCustomer.name}</p></div>
                    <div><span className="text-xs text-gray-400">เบอร์โทร</span><p className="text-sm">{selectedCustomer.phone || "-"}</p></div>
                    <div><span className="text-xs text-gray-400">เลขผู้เสียภาษี</span><p className="text-sm">{selectedCustomer.tax_id || "-"}</p></div>
                    <div><span className="text-xs text-gray-400">ผู้ติดต่อ</span><p className="text-sm">{selectedCustomer.contact_name || "-"}</p></div>
                    <div><span className="text-xs text-gray-400">Email</span><p className="text-sm">{selectedCustomer.email || "-"}</p></div>
                    <div><span className="text-xs text-gray-400">Line ID</span><p className="text-sm">{selectedCustomer.line_id || "-"}</p></div>
                  </div>
                  {selectedCustomer.address && (
                    <div><span className="text-xs text-gray-400">ที่อยู่</span><p className="text-sm">{selectedCustomer.address}</p></div>
                  )}
                </div>
              )}

              {/* Shipping address select */}
              {selectedCustomer && selectedCustomer.addresses?.length > 0 && (
                <div>
                  <label className={labelClass}>ที่อยู่จัดส่ง</label>
                  <select value={customerAddressId || ""} onChange={(e) => setCustomerAddressId(e.target.value ? Number(e.target.value) : null)} className={inputClass}>
                    <option value="">-- ไม่ระบุ --</option>
                    {selectedCustomer.addresses.map(a => (
                      <option key={a.id} value={a.id}>{a.label || "ที่อยู่จัดส่ง"} — {a.address?.substring(0, 40)}{(a.address?.length || 0) > 40 ? "..." : ""} {a.is_default ? "(ค่าเริ่มต้น)" : ""}</option>
                    ))}
                  </select>
                  {customerAddressId && (() => {
                    const addr = selectedCustomer.addresses.find(a => a.id === customerAddressId);
                    if (!addr) return null;
                    return (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                        <div className="font-medium text-blue-800">{addr.label || "ที่อยู่จัดส่ง"}</div>
                        <div className="text-blue-700 mt-1">{addr.address}</div>
                        {(addr.contact_name || addr.phone) && (
                          <div className="text-blue-600 text-xs mt-1">ผู้รับ: {addr.contact_name || ""} {addr.phone ? `(${addr.phone})` : ""}</div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Revision Timeline */}
        {isEdit && (
          <div className="bg-white rounded-xl border border-gray-200">
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ประวัติการแก้ไข (Timeline)
                {revisionNumber > 0 && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Rev.{String(revisionNumber).padStart(2, '0')}</span>}
              </span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${showTimeline ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showTimeline && (
              <div className="px-5 pb-5">
                {revisions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีประวัติการแก้ไข</p>
                ) : (
                  <div className="relative border-l-2 border-gray-200 ml-3 mt-2 space-y-0">
                    {revisions.map((rev, idx) => (
                      <div key={rev.id} className="relative pl-6 pb-5 last:pb-0">
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                          rev.action === 'created' ? 'bg-green-500' :
                          rev.action === 'duplicated' ? 'bg-purple-500' :
                          rev.action === 'status_changed' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`} />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              {rev.revision_number > 0 && (
                                <span className="text-xs font-bold text-blue-600">Rev.{String(rev.revision_number).padStart(2, '0')}</span>
                              )}
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                rev.action === 'created' ? 'bg-green-50 text-green-700' :
                                rev.action === 'duplicated' ? 'bg-purple-50 text-purple-700' :
                                rev.action === 'status_changed' ? 'bg-yellow-50 text-yellow-700' :
                                'bg-blue-50 text-blue-700'
                              }`}>
                                {rev.action === 'created' ? 'สร้างใหม่' :
                                 rev.action === 'duplicated' ? 'คัดลอก' :
                                 rev.action === 'status_changed' ? 'เปลี่ยนสถานะ' : 'แก้ไข'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{rev.summary}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {rev.user?.name || 'ระบบ'} · {new Date(rev.created_at).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/quotations")} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">← กลับ</button>
          <div className="flex items-center gap-3">
            {isEdit && (
              <button onClick={() => {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7000/api';
                const pdfUrl = `${apiUrl}/quotations/${quotationId}/pdf?token=${encodeURIComponent(token || '')}`;
                window.open(pdfUrl, '_blank');
              }} className="px-5 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                PDF
              </button>
            )}
            <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 font-medium transition-colors">
              {saving ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "สร้างใบเสนอราคา"}
            </button>
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editingCustomer ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>ชื่อลูกค้า *</label>
                  <input type="text" value={customerForm.name} onChange={(e) => setCustomerForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="ชื่อบริษัท / ร้านค้า / ลูกค้า" />
                </div>
                <div>
                  <label className={labelClass}>ประเภท</label>
                  <select value={customerForm.type} onChange={(e) => setCustomerForm(f => ({ ...f, type: e.target.value }))} className={inputClass}>
                    <option value="general">ลูกค้าทั่วไป</option>
                    <option value="regular">ลูกค้าประจำ</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>ระดับลูกค้า</label>
                  <select value={customerForm.customer_level_id} onChange={(e) => setCustomerForm(f => ({ ...f, customer_level_id: e.target.value }))} className={inputClass}>
                    <option value="">-- เลือก --</option>
                    {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>เลขผู้เสียภาษี</label><input type="text" value={customerForm.tax_id} onChange={(e) => setCustomerForm(f => ({ ...f, tax_id: e.target.value }))} className={inputClass} maxLength={20} /></div>
                <div><label className={labelClass}>ชื่อผู้ติดต่อ</label><input type="text" value={customerForm.contact_name} onChange={(e) => setCustomerForm(f => ({ ...f, contact_name: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>เบอร์โทร</label><input type="tel" value={customerForm.phone} onChange={(e) => setCustomerForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>Email</label><input type="email" value={customerForm.email} onChange={(e) => setCustomerForm(f => ({ ...f, email: e.target.value }))} className={inputClass} /></div>
                <div className="col-span-2"><label className={labelClass}>Line ID</label><input type="text" value={customerForm.line_id} onChange={(e) => setCustomerForm(f => ({ ...f, line_id: e.target.value }))} className={inputClass} /></div>
                <div className="col-span-2"><label className={labelClass}>ที่อยู่</label><textarea value={customerForm.address} onChange={(e) => setCustomerForm(f => ({ ...f, address: e.target.value }))} className={inputClass} rows={2} /></div>
              </div>
            </div>

            {/* Shipping addresses in modal */}
            <div className="mt-5 pt-5 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">ที่อยู่จัดส่ง ({shippingAddresses.length})</label>
                <button type="button" onClick={addShipping} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  เพิ่มที่อยู่จัดส่ง
                </button>
              </div>
              {shippingAddresses.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">ยังไม่มีที่อยู่จัดส่ง</p>
              ) : (
                <div className="space-y-3">
                  {shippingAddresses.map((addr, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">ที่อยู่จัดส่ง #{idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={addr.is_default} onChange={(e) => updateShipping(idx, "is_default", e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500" /><span className="text-xs text-gray-500">ค่าเริ่มต้น</span></label>
                          <button type="button" onClick={() => removeShipping(idx)} className="p-1 text-gray-400 hover:text-red-500 rounded"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input type="text" value={addr.label || ""} onChange={(e) => updateShipping(idx, "label", e.target.value)} className={inputClass} placeholder="ชื่อที่อยู่" />
                        <input type="text" value={addr.contact_name || ""} onChange={(e) => updateShipping(idx, "contact_name", e.target.value)} className={inputClass} placeholder="ชื่อผู้รับ" />
                        <input type="tel" value={addr.phone || ""} onChange={(e) => updateShipping(idx, "phone", e.target.value)} className={inputClass} placeholder="เบอร์ผู้รับ" />
                      </div>
                      <textarea value={addr.address || ""} onChange={(e) => updateShipping(idx, "address", e.target.value)} className={inputClass} rows={2} placeholder="ที่อยู่จัดส่ง *" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => setShowCustomerModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">ยกเลิก</button>
              <button onClick={handleSaveCustomer} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">บันทึกลูกค้า</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
