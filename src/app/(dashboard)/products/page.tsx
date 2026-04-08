"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface Category {
  id: number;
  code: string;
  name: string;
}

interface ProductSize {
  id?: number;
  length: string | null;
  length_unit: string | null;
  length_unit_custom: string | null;
  thickness: string | null;
  thickness_unit: string | null;
  thickness_unit_custom: string | null;
}

interface Product {
  id: number;
  code: string;
  name: string;
  category_id: number | null;
  category: Category | null;
  unit: string;
  unit_custom: string | null;
  cross_section: string | null;
  length: string | null;
  length_unit: string | null;
  length_unit_custom: string | null;
  thickness: string | null;
  thickness_unit: string | null;
  thickness_unit_custom: string | null;
  steel_type: string | null;
  side_steel: string;
  size_type: string;
  custom_note: string | null;
  weight: string | null;
  selling_price: string | null;
  code_ref: string | null;
  sizes: ProductSize[];
}

interface SizeRow {
  length: string;
  length_unit: string;
  length_unit_custom: string;
  thickness: string;
  thickness_unit: string;
  thickness_unit_custom: string;
}

const UNITS = ["ชิ้น", "แผ่น", "ต้น", "ท่อน", "แท่ง", "ก้อน", "ม้วน", "กำหนดเอง"];
const LENGTH_UNITS = ["เมตร", "เซนติเมตร", "มิลลิเมตร", "นิ้ว", "กำหนดเอง"];
const STEEL_TYPES = ["ลวด 4 เส้น", "ลวด 5 เส้น", "ลวด 6 เส้น", "ลวด 7 เส้น"];
const SIDE_STEEL_OPTIONS = [
  { value: "unspecified", label: "ไม่ระบุ" },
  { value: "hide", label: "HIDE ไม่แสดง" },
  { value: "show", label: "SHOW แสดง" },
];
const SIZE_TYPES = [
  { value: "standard", label: "STANDARD" },
  { value: "custom", label: "CUSTOM" },
];

const emptySizeRow: SizeRow = {
  length: "",
  length_unit: "เมตร",
  length_unit_custom: "",
  thickness: "",
  thickness_unit: "มิลลิเมตร",
  thickness_unit_custom: "",
};

const emptyForm = {
  code: "",
  name: "",
  category_id: "",
  unit: "ชิ้น",
  unit_custom: "",
  cross_section: "",
  steel_type: "",
  side_steel: "unspecified",
  size_type: "standard",
  custom_note: "",
  weight: "",
  selling_price: "",
  code_ref: "",
};

export default function ProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sizes, setSizes] = useState<SizeRow[]>([{ ...emptySizeRow }]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterCategory) params.set("category_id", filterCategory);
      params.set("per_page", "10");
      params.set("page", page.toString());
      const data = await api.get<{ data: Product[]; last_page: number; total: number }>(`/products?${params}`, token);
      setProducts(data.data);
      setLastPage(data.last_page);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, search, filterCategory, page]);

  const fetchCategories = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ categories: Category[] }>("/categories", token);
      setCategories(data.categories);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setSizes([{ ...emptySizeRow }]);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      code: p.code,
      name: p.name,
      category_id: p.category_id?.toString() || "",
      unit: UNITS.includes(p.unit) ? p.unit : "กำหนดเอง",
      unit_custom: UNITS.includes(p.unit) ? "" : p.unit_custom || p.unit,
      cross_section: p.cross_section || "",
      steel_type: p.steel_type || "",
      side_steel: p.side_steel || "unspecified",
      size_type: p.size_type || "standard",
      custom_note: p.custom_note || "",
      weight: p.weight || "",
      selling_price: p.selling_price || "",
      code_ref: p.code_ref || "",
    });
    // Populate sizes from product.sizes; fallback to legacy single length/thickness
    if (p.sizes && p.sizes.length > 0) {
      setSizes(p.sizes.map((s) => ({
        length: s.length || "",
        length_unit: s.length_unit && LENGTH_UNITS.includes(s.length_unit) ? s.length_unit : s.length_unit ? "กำหนดเอง" : "เมตร",
        length_unit_custom: s.length_unit_custom || "",
        thickness: s.thickness || "",
        thickness_unit: s.thickness_unit && LENGTH_UNITS.includes(s.thickness_unit) ? s.thickness_unit : s.thickness_unit ? "กำหนดเอง" : "มิลลิเมตร",
        thickness_unit_custom: s.thickness_unit_custom || "",
      })));
    } else if (p.length || p.thickness) {
      setSizes([{
        length: p.length || "",
        length_unit: p.length_unit && LENGTH_UNITS.includes(p.length_unit) ? p.length_unit : p.length_unit ? "กำหนดเอง" : "เมตร",
        length_unit_custom: p.length_unit_custom || "",
        thickness: p.thickness || "",
        thickness_unit: p.thickness_unit && LENGTH_UNITS.includes(p.thickness_unit) ? p.thickness_unit : p.thickness_unit ? "กำหนดเอง" : "มิลลิเมตร",
        thickness_unit_custom: p.thickness_unit_custom || "",
      }]);
    } else {
      setSizes([{ ...emptySizeRow }]);
    }
    setFormError("");
    setShowModal(true);
  };

  const openCopy = (p: Product) => {
    setEditingProduct(null);
    setForm({
      code: "",
      name: p.name,
      category_id: p.category_id?.toString() || "",
      unit: UNITS.includes(p.unit) ? p.unit : "กำหนดเอง",
      unit_custom: UNITS.includes(p.unit) ? "" : p.unit_custom || p.unit,
      cross_section: p.cross_section || "",
      steel_type: p.steel_type || "",
      side_steel: p.side_steel || "unspecified",
      size_type: p.size_type || "standard",
      custom_note: p.custom_note || "",
      weight: p.weight || "",
      selling_price: p.selling_price || "",
      code_ref: p.code_ref || "",
    });
    if (p.sizes && p.sizes.length > 0) {
      setSizes(p.sizes.map((s) => ({
        length: s.length || "",
        length_unit: s.length_unit && LENGTH_UNITS.includes(s.length_unit) ? s.length_unit : s.length_unit ? "กำหนดเอง" : "เมตร",
        length_unit_custom: s.length_unit_custom || "",
        thickness: s.thickness || "",
        thickness_unit: s.thickness_unit && LENGTH_UNITS.includes(s.thickness_unit) ? s.thickness_unit : s.thickness_unit ? "กำหนดเอง" : "มิลลิเมตร",
        thickness_unit_custom: s.thickness_unit_custom || "",
      })));
    } else if (p.length || p.thickness) {
      setSizes([{
        length: p.length || "",
        length_unit: p.length_unit && LENGTH_UNITS.includes(p.length_unit) ? p.length_unit : p.length_unit ? "กำหนดเอง" : "เมตร",
        length_unit_custom: p.length_unit_custom || "",
        thickness: p.thickness || "",
        thickness_unit: p.thickness_unit && LENGTH_UNITS.includes(p.thickness_unit) ? p.thickness_unit : p.thickness_unit ? "กำหนดเอง" : "มิลลิเมตร",
        thickness_unit_custom: p.thickness_unit_custom || "",
      }]);
    } else {
      setSizes([{ ...emptySizeRow }]);
    }
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError("");
    try {
      const payload: Record<string, unknown> = {
        code: form.code,
        name: form.name,
        category_id: form.category_id || null,
        unit: form.unit === "กำหนดเอง" ? form.unit_custom : form.unit,
        unit_custom: form.unit === "กำหนดเอง" ? form.unit_custom : null,
        cross_section: form.cross_section || null,
        length: null,
        length_unit: null,
        length_unit_custom: null,
        thickness: null,
        thickness_unit: null,
        thickness_unit_custom: null,
        steel_type: form.steel_type || null,
        side_steel: form.side_steel,
        size_type: form.size_type,
        custom_note: form.size_type === "custom" ? form.custom_note : null,
        weight: form.weight || null,
        selling_price: form.selling_price || null,
        code_ref: form.code_ref || null,
        sizes: sizes
          .filter((s) => s.length || s.thickness)
          .map((s) => ({
            length: s.length || null,
            length_unit: s.length_unit === "กำหนดเอง" ? s.length_unit_custom : s.length_unit,
            length_unit_custom: s.length_unit === "กำหนดเอง" ? s.length_unit_custom : null,
            thickness: s.thickness || null,
            thickness_unit: s.thickness_unit === "กำหนดเอง" ? s.thickness_unit_custom : s.thickness_unit,
            thickness_unit_custom: s.thickness_unit === "กำหนดเอง" ? s.thickness_unit_custom : null,
          })),
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload, token!);
      } else {
        await api.post("/products", payload, token!);
      }
      setShowModal(false);
      fetchProducts();
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

  const handleDelete = async (p: Product) => {
    if (!confirm(`ต้องการลบสินค้า "${p.name}" ?`)) return;
    try {
      await api.delete(`/products/${p.id}`, token!);
      fetchProducts();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateSizeRow = (index: number, field: keyof SizeRow, value: string) => {
    setSizes((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addSizeRow = () => {
    setSizes((prev) => [...prev, { ...emptySizeRow }]);
  };

  const removeSizeRow = (index: number) => {
    setSizes((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ ...emptySizeRow }]);
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <>
      <Header title="สินค้า" />
      <div className="p-6 space-y-6">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="ค้นหาสินค้า..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 pr-4 py-2 w-64 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มสินค้า
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-gray-400">ไม่พบสินค้า</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">รหัส</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">รายละเอียดสินค้า</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Code Ref</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">หมวดหมู่</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-500">น้ำหนัก (kg)</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-500">ราคาขาย</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-500">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-600">{p.code}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-800">{p.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
                          {p.cross_section && <div>ขนาดหน้าตัด {p.cross_section}</div>}
                          {p.sizes && p.sizes.length > 0 ? (
                            p.sizes.map((s, si) => (
                              <div key={si}>
                                {s.length ? `ยาว ${Number(s.length)} ${s.length_unit_custom || s.length_unit || ""}` : ""}
                                {s.length && s.thickness ? " " : ""}
                                {s.thickness ? `หนา ${Number(s.thickness)} ${s.thickness_unit_custom || s.thickness_unit || ""}` : ""}
                              </div>
                            ))
                          ) : (
                            (p.length || p.thickness) && (
                              <div>
                                {p.length ? `ยาว ${Number(p.length)} ${p.length_unit_custom || p.length_unit || ""}` : ""}
                                {p.length && p.thickness ? " " : ""}
                                {p.thickness ? `หนา ${Number(p.thickness)} ${p.thickness_unit_custom || p.thickness_unit || ""}` : ""}
                              </div>
                            )
                          )}
                          {(p.steel_type || (p.side_steel && p.side_steel !== "unspecified")) && (
                            <div>
                              {p.steel_type || ""}
                              {p.steel_type && p.side_steel && p.side_steel !== "unspecified" ? " " : ""}
                              {p.side_steel === "hide" ? "เหล็กข้าง ไม่แสดง" : p.side_steel === "show" ? "เหล็กข้าง แสดง" : ""}
                            </div>
                          )}
                          {p.size_type === "custom" && p.custom_note && <div className="text-amber-600">{p.custom_note}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-mono">{p.code_ref || "-"}</td>
                      <td className="px-6 py-4 text-gray-500">{p.category?.name || "-"}</td>
                      <td className="px-6 py-4 text-right text-gray-500">{p.weight ? `${Number(p.weight).toLocaleString()}` : "-"}</td>
                      <td className="px-6 py-4 text-right text-gray-700 font-medium">{p.selling_price ? `฿${Number(p.selling_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openCopy(p)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="คัดลอก">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => handleDelete(p)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">ทั้งหมด {total} รายการ</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ก่อนหน้า
                </button>
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
                      <button
                        key={item}
                        onClick={() => setPage(item)}
                        className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                          page === item ? "bg-green-600 text-white" : "hover:bg-gray-50 border border-gray-200"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  disabled={page === lastPage}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingProduct ? "แก้ไขสินค้า" : "เพิ่มสินค้า"}
            </h3>
            {formError && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{formError}</div>}

            <div className="space-y-6">
              {/* ข้อมูลเบื้องต้น */}
              <div>
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 border-b pb-2">รายละเอียดเบื้องต้น</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>รหัสสินค้า *</label>
                    <input type="text" value={form.code} onChange={(e) => updateForm("code", e.target.value)} className={inputClass} placeholder="เช่น PRD-001" />
                  </div>
                  <div>
                    <label className={labelClass}>ชื่อสินค้า *</label>
                    <input type="text" value={form.name} onChange={(e) => updateForm("name", e.target.value)} className={inputClass} placeholder="ชื่อสินค้า" />
                  </div>
                  <div>
                    <label className={labelClass}>Code Ref</label>
                    <input type="text" value={form.code_ref} onChange={(e) => updateForm("code_ref", e.target.value)} className={inputClass} placeholder="รหัสอ้างอิง" />
                  </div>
                  <div>
                    <label className={labelClass}>หมวดหมู่</label>
                    <select value={form.category_id} onChange={(e) => updateForm("category_id", e.target.value)} className={inputClass}>
                      <option value="">-- เลือกหมวดหมู่ --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>หน่วยนับ *</label>
                    <select value={form.unit} onChange={(e) => updateForm("unit", e.target.value)} className={inputClass}>
                      {UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    {form.unit === "กำหนดเอง" && (
                      <input type="text" value={form.unit_custom} onChange={(e) => updateForm("unit_custom", e.target.value)} className={`${inputClass} mt-2`} placeholder="ระบุหน่วยนับ" />
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>น้ำหนัก (kg)</label>
                    <input type="number" step="0.01" value={form.weight} onChange={(e) => updateForm("weight", e.target.value)} className={inputClass} placeholder="0.00" />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>ราคาขาย (บาท)</label>
                    <input type="number" step="0.01" value={form.selling_price} onChange={(e) => updateForm("selling_price", e.target.value)} className={inputClass} placeholder="0.00" />
                  </div>
                </div>
              </div>

              {/* ขนาด */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">รายละเอียดขนาด</h4>
                  <button type="button" onClick={addSizeRow} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    เพิ่มขนาด
                  </button>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <label className={labelClass}>ขนาดหน้าตัด</label>
                    <input type="text" value={form.cross_section} onChange={(e) => updateForm("cross_section", e.target.value)} className={inputClass} placeholder="เช่น 50x50" />
                  </div>
                  {sizes.map((row, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 px-2 py-1.5 bg-gray-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">ความยาว</label>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              step="0.01"
                              value={row.length}
                              onChange={(e) => updateSizeRow(idx, "length", e.target.value)}
                              className={`${inputClass} flex-1`}
                              placeholder="0.00"
                            />
                            <select
                              value={row.length_unit}
                              onChange={(e) => updateSizeRow(idx, "length_unit", e.target.value)}
                              className="px-2 py-2 rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-green-500 outline-none"
                            >
                              {LENGTH_UNITS.map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </div>
                          {row.length_unit === "กำหนดเอง" && (
                            <input type="text" value={row.length_unit_custom} onChange={(e) => updateSizeRow(idx, "length_unit_custom", e.target.value)} className={`${inputClass} mt-1`} placeholder="ระบุหน่วย" />
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">ความหนา</label>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              step="0.01"
                              value={row.thickness}
                              onChange={(e) => updateSizeRow(idx, "thickness", e.target.value)}
                              className={`${inputClass} flex-1`}
                              placeholder="0.00"
                            />
                            <select
                              value={row.thickness_unit}
                              onChange={(e) => updateSizeRow(idx, "thickness_unit", e.target.value)}
                              className="px-2 py-2 rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-green-500 outline-none"
                            >
                              {LENGTH_UNITS.map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </div>
                          {row.thickness_unit === "กำหนดเอง" && (
                            <input type="text" value={row.thickness_unit_custom} onChange={(e) => updateSizeRow(idx, "thickness_unit_custom", e.target.value)} className={`${inputClass} mt-1`} placeholder="ระบุหน่วย" />
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSizeRow(idx)}
                        className="mt-4 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="ลบแถว"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* เหล็ก */}
              <div>
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 border-b pb-2">ประเภทเหล็ก / ไซส์</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>ประเภทเหล็ก</label>
                    <select value={form.steel_type} onChange={(e) => updateForm("steel_type", e.target.value)} className={inputClass}>
                      <option value="">-- ไม่ระบุ --</option>
                      {STEEL_TYPES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>เหล็กข้าง</label>
                    <select value={form.side_steel} onChange={(e) => updateForm("side_steel", e.target.value)} className={inputClass}>
                      {SIDE_STEEL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>ประเภทไซส์</label>
                    <div className="flex gap-3 mt-1">
                      {SIZE_TYPES.map((s) => (
                        <label key={s.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="size_type"
                            value={s.value}
                            checked={form.size_type === s.value}
                            onChange={(e) => updateForm("size_type", e.target.value)}
                            className="accent-green-600"
                          />
                          <span className="text-sm text-gray-700">{s.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {form.size_type === "custom" && (
                    <div className="col-span-2">
                      <label className={labelClass}>Custom Note</label>
                      <textarea
                        value={form.custom_note}
                        onChange={(e) => updateForm("custom_note", e.target.value)}
                        className={inputClass}
                        rows={3}
                        placeholder="ระบุรายละเอียดไซส์ที่ต้องการ"
                      />
                    </div>
                  )}
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
