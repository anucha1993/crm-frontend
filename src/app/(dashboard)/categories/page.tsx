"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface Category {
  id: number;
  code: string;
  name: string;
  description: string | null;
  products_count: number;
}

export default function CategoriesPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({ code: "", name: "", description: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    if (!token) return;
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await api.get<{ categories: Category[] }>(`/categories${params}`, token);
      setCategories(data.categories);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreate = () => {
    setEditingCategory(null);
    setForm({ code: "", name: "", description: "" });
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setForm({ code: cat.code, name: cat.name, description: cat.description || "" });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError("");
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, form, token!);
      } else {
        await api.post("/categories", form, token!);
      }
      setShowModal(false);
      fetchCategories();
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

  const handleDelete = async (cat: Category) => {
    if (!confirm(`ต้องการลบหมวดหมู่ "${cat.name}" ?`)) return;
    try {
      await api.delete(`/categories/${cat.id}`, token!);
      fetchCategories();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  return (
    <>
      <Header title="หมวดหมู่" />
      <div className="p-6 space-y-6">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="ค้นหาหมวดหมู่..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-72 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มหมวดหมู่
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-gray-400">ไม่พบหมวดหมู่</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">รหัส</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">ชื่อหมวดหมู่</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">คำอธิบาย</th>
                  <th className="text-center px-6 py-3 font-medium text-gray-500">สินค้า</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-600">{cat.code}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{cat.name}</td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{cat.description || "-"}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        {cat.products_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(cat)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(cat)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
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
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingCategory ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}
            </h3>
            {formError && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{formError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสหมวดหมู่</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                  placeholder="เช่น CAT-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อหมวดหมู่</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                  placeholder="ชื่อหมวดหมู่"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                  rows={3}
                  placeholder="คำอธิบาย (ถ้ามี)"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
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
