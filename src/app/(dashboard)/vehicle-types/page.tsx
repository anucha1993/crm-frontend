"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface VehicleType {
  id: number;
  code: string;
  name: string;
  min_weight: string;
  max_weight: string;
  weight_unit: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm = {
  code: "",
  name: "",
  min_weight: "",
  max_weight: "",
  weight_unit: "ตัน",
  is_active: true,
  sort_order: "0",
};

export default function VehicleTypesPage() {
  const { token } = useAuth();
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<VehicleType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Weight suggestion
  const [suggestWeight, setSuggestWeight] = useState("");
  const [suggestions, setSuggestions] = useState<VehicleType[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const data = await api.get<{ vehicle_types: VehicleType[] }>(`/vehicle-types?${params}`, token);
      setVehicleTypes(data.vehicle_types);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (v: VehicleType) => {
    setEditing(v);
    setForm({
      code: v.code,
      name: v.name,
      min_weight: v.min_weight,
      max_weight: v.max_weight,
      weight_unit: v.weight_unit || "ตัน",
      is_active: v.is_active,
      sort_order: v.sort_order?.toString() || "0",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        code: form.code,
        name: form.name,
        min_weight: Number(form.min_weight),
        max_weight: Number(form.max_weight),
        weight_unit: form.weight_unit,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editing) {
        await api.put(`/vehicle-types/${editing.id}`, payload, token!);
      } else {
        await api.post("/vehicle-types", payload, token!);
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

  const handleDelete = async (v: VehicleType) => {
    if (!confirm(`ต้องการลบ "${v.name}" ?`)) return;
    try {
      await api.delete(`/vehicle-types/${v.id}`, token!);
      fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const handleSuggest = async () => {
    if (!suggestWeight || !token) return;
    try {
      const data = await api.get<{ suggestions: VehicleType[] }>(
        `/vehicle-types/suggest?weight=${suggestWeight}`,
        token
      );
      setSuggestions(data.suggestions);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
      setShowSuggestions(true);
    }
  };

  const updateForm = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <>
      <Header title="จัดการประเภทรถ" />
      <div className="p-6 space-y-6">
        {/* Weight Suggestion */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            แนะนำรถตามน้ำหนัก
          </h3>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className={labelClass}>น้ำหนักสินค้า (ตัน)</label>
              <input
                type="number"
                step="0.1"
                value={suggestWeight}
                onChange={(e) => { setSuggestWeight(e.target.value); setShowSuggestions(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
                className={inputClass}
                placeholder="เช่น 5.5"
              />
            </div>
            <button
              onClick={handleSuggest}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              ค้นหารถที่เหมาะสม
            </button>
          </div>
          {showSuggestions && (
            <div className="mt-3">
              {suggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <div key={s.id} className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-medium text-green-800">{s.name}</span>
                      <span className="text-xs text-green-600">({Number(s.min_weight)}-{Number(s.max_weight)} {s.weight_unit})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-red-500">ไม่พบประเภทรถที่รองรับน้ำหนัก {suggestWeight} ตัน</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="ค้นหาประเภทรถ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มประเภทรถ
          </button>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
        ) : vehicleTypes.length === 0 ? (
          <div className="p-12 text-center text-gray-400">ไม่พบข้อมูลประเภทรถ</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {vehicleTypes.map((v) => (
              <div
                key={v.id}
                className={`bg-white rounded-xl border p-5 transition-shadow hover:shadow-md ${
                  v.is_active ? "border-gray-200" : "border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 5h4m4-9a9 9 0 11-6 15.9" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{v.name}</h4>
                        <span className="text-xs font-mono text-gray-400">{v.code}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    v.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {v.is_active ? "เปิดใช้" : "ปิด"}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-gray-800">{Number(v.min_weight)}-{Number(v.max_weight)}</span>
                    <span className="text-sm text-gray-500 ml-1">{v.weight_unit}</span>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-1">น้ำหนักบรรทุก</p>
                </div>

                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => openEdit(v)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(v)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
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
              {editing ? "แก้ไขประเภทรถ" : "เพิ่มประเภทรถ"}
            </h3>
            {formError && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{formError}</div>}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>รหัส *</label>
                  <input type="text" value={form.code} onChange={(e) => updateForm("code", e.target.value)} className={inputClass} placeholder="เช่น SIX_WHEEL_LARGE" />
                </div>
                <div>
                  <label className={labelClass}>ชื่อ *</label>
                  <input type="text" value={form.name} onChange={(e) => updateForm("name", e.target.value)} className={inputClass} placeholder="เช่น หกล้อใหญ่" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>น้ำหนักต่ำสุด *</label>
                  <input type="number" step="0.1" value={form.min_weight} onChange={(e) => updateForm("min_weight", e.target.value)} className={inputClass} placeholder="1" />
                </div>
                <div>
                  <label className={labelClass}>น้ำหนักสูงสุด *</label>
                  <input type="number" step="0.1" value={form.max_weight} onChange={(e) => updateForm("max_weight", e.target.value)} className={inputClass} placeholder="5" />
                </div>
                <div>
                  <label className={labelClass}>หน่วย</label>
                  <input type="text" value={form.weight_unit} onChange={(e) => updateForm("weight_unit", e.target.value)} className={inputClass} placeholder="ตัน" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>ลำดับ</label>
                  <input type="number" value={form.sort_order} onChange={(e) => updateForm("sort_order", e.target.value)} className={inputClass} placeholder="0" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => updateForm("is_active", e.target.checked)}
                      className="w-4 h-4 accent-green-600 rounded"
                    />
                    <span className="text-sm text-gray-700">เปิดใช้งาน</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                ยกเลิก
              </button>
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
