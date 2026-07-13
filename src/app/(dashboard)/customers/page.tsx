"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface CustomerLevel {
  id: number;
  name: string;
  color: string;
  inactive_days: number;
}

interface User {
  id: number;
  name: string;
}

interface Customer {
  id: number;
  code: string;
  type: "regular" | "general";
  customer_level_id: number | null;
  level: CustomerLevel | null;
  name: string;
  tax_id: string | null;
  contact_name: string | null;
  phone: string | null;
  address: string | null;
  last_activity_at: string | null;
  created_by: number | null;
  updated_by: number | null;
  creator: User | null;
  updater: User | null;
  addresses: ShippingAddress[];
  created_at: string;
}

interface ShippingAddress {
  id?: number;
  label: string;
  contact_name: string;
  phone: string;
  address: string;
  is_default: boolean;
}

const CUSTOMER_TYPES = [
  { value: "regular", label: "ลูกค้าประจำ" },
  { value: "general", label: "ลูกค้าทั่วไป" },
];

const emptyForm = {
  name: "",
  type: "general",
  customer_level_id: "",
  tax_id: "",
  contact_name: "",
  phone: "",
  address: "",
};

const emptyShippingAddress: ShippingAddress = {
  label: "",
  contact_name: "",
  phone: "",
  address: "",
  is_default: false,
};

export default function CustomersPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [levels, setLevels] = useState<CustomerLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterType) params.set("type", filterType);
      if (filterLevel) params.set("customer_level_id", filterLevel);
      params.set("per_page", "10");
      params.set("page", page.toString());
      const data = await api.get<{ data: Customer[]; last_page: number; total: number }>(`/customers?${params}`, token);
      setCustomers(data.data);
      setLastPage(data.last_page);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, search, filterType, filterLevel, page]);

  const fetchLevels = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ customer_levels: CustomerLevel[] }>("/customer-levels?active_only=1", token);
      setLevels(data.customer_levels);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => { fetchLevels(); }, [fetchLevels]);
  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShippingAddresses([]);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name,
      type: c.type,
      customer_level_id: c.customer_level_id?.toString() || "",
      tax_id: c.tax_id || "",
      contact_name: c.contact_name || "",
      phone: c.phone || "",
      address: c.address || "",
    });
    setShippingAddresses(c.addresses?.map(a => ({ ...a })) || []);
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: form.name,
        type: form.type,
        customer_level_id: form.customer_level_id || null,
        tax_id: form.tax_id || null,
        contact_name: form.contact_name || null,
        phone: form.phone || null,
        address: form.address || null,
        shipping_addresses: shippingAddresses.filter(a => a.address.trim()),
      };
      if (editing) {
        await api.put(`/customers/${editing.id}`, payload, token!);
      } else {
        await api.post("/customers", payload, token!);
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.errors ? Object.values(err.errors).flat().join(", ") : err.message);
      } else {
        setFormError("เกิดข้อผิดพลาด");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`ต้องการลบลูกค้า "${c.name}" ?`)) return;
    try {
      await api.delete(`/customers/${c.id}`, token!);
      fetchCustomers();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addShippingAddress = () => {
    setShippingAddresses((prev) => [...prev, { ...emptyShippingAddress }]);
  };

  const removeShippingAddress = (index: number) => {
    setShippingAddresses((prev) => prev.filter((_, i) => i !== index));
  };

  const updateShippingAddress = (index: number, field: keyof ShippingAddress, value: string | boolean) => {
    setShippingAddresses((prev) => prev.map((a, i) => {
      if (i !== index) return a;
      if (field === "is_default" && value === true) {
        return { ...a, is_default: true };
      }
      return { ...a, [field]: value };
    }).map((a, i) => {
      if (field === "is_default" && value === true && i !== index) {
        return { ...a, is_default: false };
      }
      return a;
    }));
  };

  const isInactive = (c: Customer) => {
    if (!c.last_activity_at || !c.level) return false;
    const lastActivity = new Date(c.last_activity_at);
    const daysSince = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > c.level.inactive_days;
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <>
      <Header title="ลูกค้า" />
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="ค้นหาลูกค้า..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 pr-4 py-2 w-64 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">ทุกประเภท</option>
              {CUSTOMER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={filterLevel}
              onChange={(e) => { setFilterLevel(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">ทุกระดับ</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มลูกค้า
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-gray-400">ไม่พบลูกค้า</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">รหัส</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">ชื่อลูกค้า</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">ประเภท</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">ระดับ</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">ผู้ติดต่อ</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">เบอร์โทร</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">สถานะ</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((c) => {
                    const inactive = isInactive(c);
                    return (
                      <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                        <td className="px-5 py-4 font-mono text-gray-500 text-xs">{c.code}</td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-800">{c.name}</div>
                          {c.tax_id && <div className="text-xs text-gray-400 mt-0.5">เลขผู้เสียภาษี: {c.tax_id}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.type === "regular" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                            {c.type === "regular" ? "ลูกค้าประจำ" : "ลูกค้าทั่วไป"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {c.level ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: c.level.color + "20", color: c.level.color }}>
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.level.color }} />
                              {c.level.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {c.contact_name || "-"}
                        </td>
                        <td className="px-5 py-4 text-gray-600">{c.phone || "-"}</td>
                        <td className="px-5 py-4">
                          {inactive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                              ไม่เคลื่อนไหว
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                              ปกติ
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(c); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">ทั้งหมด {total} รายการ</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">ก่อนหน้า</button>
                {Array.from({ length: lastPage }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === lastPage || Math.abs(p - page) <= 1)
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    typeof item === "string" ? (
                      <span key={`dot-${idx}`} className="px-2 text-sm text-gray-400">...</span>
                    ) : (
                      <button key={item} onClick={() => setPage(item)} className={`w-8 h-8 text-sm rounded-lg transition-colors ${page === item ? "bg-green-600 text-white" : "hover:bg-gray-50 border border-gray-200"}`}>{item}</button>
                    )
                  )}
                <button onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={page === lastPage} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">ถัดไป</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editing ? "แก้ไขลูกค้า" : "เพิ่มลูกค้า"}
            </h3>
            {editing && (
              <div className="text-sm text-gray-400 mb-4 -mt-2">รหัส: {editing.code}</div>
            )}
            {formError && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{formError}</div>}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>ชื่อลูกค้า *</label>
                  <input type="text" value={form.name} onChange={(e) => updateForm("name", e.target.value)} className={inputClass} placeholder="ชื่อบริษัท / ร้านค้า / ลูกค้า" />
                </div>
                <div>
                  <label className={labelClass}>ประเภทลูกค้า</label>
                  <select value={form.type} onChange={(e) => updateForm("type", e.target.value)} className={inputClass}>
                    {CUSTOMER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>ระดับลูกค้า</label>
                  <select value={form.customer_level_id} onChange={(e) => updateForm("customer_level_id", e.target.value)} className={inputClass}>
                    <option value="">-- เลือกระดับ --</option>
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>เลขประจำตัวผู้เสียภาษี</label>
                  <input type="text" value={form.tax_id} onChange={(e) => updateForm("tax_id", e.target.value)} className={inputClass} placeholder="เลข 13 หลัก" maxLength={20} />
                </div>
                <div>
                  <label className={labelClass}>ชื่อผู้ติดต่อ</label>
                  <input type="text" value={form.contact_name} onChange={(e) => updateForm("contact_name", e.target.value)} className={inputClass} placeholder="ชื่อผู้ติดต่อหลัก" />
                </div>
                <div>
                  <label className={labelClass}>เบอร์โทร</label>
                  <input type="tel" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} className={inputClass} placeholder="0XX-XXX-XXXX" />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>ที่อยู่ลูกค้า</label>
                  <textarea value={form.address} onChange={(e) => updateForm("address", e.target.value)} className={inputClass} rows={3} placeholder="ที่อยู่สำหรับจัดส่ง / ออกใบเสร็จ" />
                </div>
              </div>
            </div>

            {/* Shipping Addresses */}
            <div className="mt-5 pt-5 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">ที่อยู่จัดส่ง ({shippingAddresses.length})</label>
                <button type="button" onClick={addShippingAddress} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  เพิ่มที่อยู่จัดส่ง
                </button>
              </div>
              {shippingAddresses.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีที่อยู่จัดส่ง</p>
              ) : (
                <div className="space-y-3">
                  {shippingAddresses.map((addr, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">ที่อยู่จัดส่ง #{idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={addr.is_default} onChange={(e) => updateShippingAddress(idx, "is_default", e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                            <span className="text-xs text-gray-500">ค่าเริ่มต้น</span>
                          </label>
                          <button type="button" onClick={() => removeShippingAddress(idx)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input type="text" value={addr.label || ""} onChange={(e) => updateShippingAddress(idx, "label", e.target.value)} className={inputClass} placeholder="ชื่อที่อยู่ (เช่น สำนักงานใหญ่)" />
                        <input type="text" value={addr.contact_name || ""} onChange={(e) => updateShippingAddress(idx, "contact_name", e.target.value)} className={inputClass} placeholder="ชื่อผู้รับ" />
                        <input type="tel" value={addr.phone || ""} onChange={(e) => updateShippingAddress(idx, "phone", e.target.value)} className={inputClass} placeholder="เบอร์โทรผู้รับ" />
                      </div>
                      <textarea value={addr.address} onChange={(e) => updateShippingAddress(idx, "address", e.target.value)} className={inputClass} rows={2} placeholder="ที่อยู่จัดส่ง" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 transition-colors">
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
