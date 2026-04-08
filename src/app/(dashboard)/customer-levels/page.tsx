"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface CustomerLevel {
  id: number;
  name: string;
  color: string;
  inactive_days: number;
  is_active: boolean;
  sort_order: number;
  customers_count: number;
}

const emptyForm = {
  name: "",
  color: "#3B82F6",
  inactive_days: "30",
  is_active: true,
  sort_order: "0",
};

const COLORS = [
  { value: "#EAB308", label: "ทอง" },
  { value: "#F59E0B", label: "ส้ม" },
  { value: "#3B82F6", label: "น้ำเงิน" },
  { value: "#6B7280", label: "เทา" },
  { value: "#10B981", label: "เขียว" },
  { value: "#8B5CF6", label: "ม่วง" },
  { value: "#EF4444", label: "แดง" },
  { value: "#EC4899", label: "ชมพู" },
];

export default function CustomerLevelsPage() {
  const { token } = useAuth();
  const [levels, setLevels] = useState<CustomerLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CustomerLevel | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ customer_levels: CustomerLevel[] }>("/customer-levels", token);
      setLevels(data.customer_levels);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (l: CustomerLevel) => {
    setEditing(l);
    setForm({
      name: l.name,
      color: l.color,
      inactive_days: l.inactive_days.toString(),
      is_active: l.is_active,
      sort_order: l.sort_order?.toString() || "0",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: form.name,
        color: form.color,
        inactive_days: Number(form.inactive_days),
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editing) {
        await api.put(`/customer-levels/${editing.id}`, payload, token!);
      } else {
        await api.post("/customer-levels", payload, token!);
      }
      setShowModal(false);
      fetchData();
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

  const handleDelete = async (l: CustomerLevel) => {
    if (!confirm(`ต้องการลบระดับ "${l.name}" ?`)) return;
    try {
      await api.delete(`/customer-levels/${l.id}`, token!);
      fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const updateForm = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <>
      <Header title="ระดับลูกค้า" />
      <div className="p-6 space-y-6">
        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">การจัดการระดับลูกค้า</p>
            <p className="text-blue-600">กำหนด &quot;จำนวนวันไม่เคลื่อนไหว&quot; เพื่อระบุว่าลูกค้าจะถูกพิจารณาเป็นลูกค้าที่ไม่มีกิจกรรมเมื่อไม่มีการติดต่อตามจำนวนวันที่กำหนด</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มระดับลูกค้า
          </button>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
        ) : levels.length === 0 ? (
          <div className="p-12 text-center text-gray-400">ไม่พบข้อมูลระดับลูกค้า</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {levels.map((l) => (
              <div key={l.id} className={`bg-white rounded-xl border p-5 transition-shadow hover:shadow-md ${l.is_active ? "border-gray-200" : "border-gray-200 opacity-60"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: l.color }}>
                      {l.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{l.name}</h4>
                      <span className={`text-xs ${l.is_active ? "text-green-600" : "text-gray-400"}`}>{l.is_active ? "เปิดใช้" : "ปิด"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-500">วันไม่เคลื่อนไหว</span>
                    <span className="text-sm font-semibold text-gray-800">{l.inactive_days} วัน</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-500">จำนวนลูกค้า</span>
                    <span className="text-sm font-semibold text-gray-800">{l.customers_count}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 pt-3 border-t border-gray-100">
                  <button onClick={() => openEdit(l)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(l)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editing ? "แก้ไขระดับลูกค้า" : "เพิ่มระดับลูกค้า"}
            </h3>
            {formError && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{formError}</div>}

            <div className="space-y-4">
              <div>
                <label className={labelClass}>ชื่อระดับ *</label>
                <input type="text" value={form.name} onChange={(e) => updateForm("name", e.target.value)} className={inputClass} placeholder="เช่น VIP, ทอง, เงิน" />
              </div>
              <div>
                <label className={labelClass}>สี</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => updateForm("color", c.value)}
                      className={`w-8 h-8 rounded-lg transition-all ${form.color === c.value ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-105"}`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>จำนวนวันไม่เคลื่อนไหว *</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={form.inactive_days} onChange={(e) => updateForm("inactive_days", e.target.value)} className={inputClass} placeholder="30" min="0" />
                  <span className="text-sm text-gray-500 whitespace-nowrap">วัน</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">หากลูกค้าไม่มีกิจกรรมเกินจำนวนวันนี้ จะถูกแจ้งเตือนว่าไม่เคลื่อนไหว</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>ลำดับ</label>
                  <input type="number" value={form.sort_order} onChange={(e) => updateForm("sort_order", e.target.value)} className={inputClass} placeholder="0" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => updateForm("is_active", e.target.checked)} className="w-4 h-4 accent-green-600 rounded" />
                    <span className="text-sm text-gray-700">เปิดใช้งาน</span>
                  </label>
                </div>
              </div>
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
