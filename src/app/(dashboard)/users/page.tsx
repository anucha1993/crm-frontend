"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface Role {
  id: number;
  name: string;
  display_name: string;
}

interface UserItem {
  id: number;
  name: string;
  email: string;
  roles: Role[];
  created_at: string;
}

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role_ids: [] as number[] });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const data = await api.get<{ data: UserItem[] }>(`/users${qs}`, token);
      setUsers(data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, search, roleFilter]);

  const fetchRoles = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ roles: Role[] }>("/roles", token);
      setRoles(data.roles);
    } catch {
      // roles may not be accessible for non-admin
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: "", email: "", password: "", role_ids: [] });
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (user: UserItem) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role_ids: user.roles.map((r) => r.id),
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError("");
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role_ids: form.role_ids,
      };
      if (editingUser) {
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editingUser.id}`, payload, token!);
      } else {
        payload.password = form.password;
        await api.post("/users", payload, token!);
      }
      setShowModal(false);
      fetchUsers();
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

  const handleDelete = async (user: UserItem) => {
    if (!confirm(`ต้องการลบผู้ใช้ "${user.name}" ใช่หรือไม่?`)) return;
    try {
      await api.delete(`/users/${user.id}`, token!);
      fetchUsers();
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
    }
  };

  const toggleRole = (roleId: number) => {
    setForm((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter((id) => id !== roleId)
        : [...prev.role_ids, roleId],
    }));
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <>
      <Header title="จัดการผู้ใช้" />
      <div className="p-6 space-y-6">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="ค้นหาผู้ใช้..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            {roles.length > 0 && (
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">ทุกบทบาท</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>{r.display_name}</option>
                ))}
              </select>
            )}
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มผู้ใช้
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">กำลังโหลด...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">ชื่อ</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">อีเมล</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">บทบาท</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">วันที่สร้าง</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-400">ไม่พบข้อมูลผู้ใช้</td></tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-semibold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-800">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600">{user.email}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((r) => (
                              <span key={r.id} className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                                r.name === "admin" ? "bg-red-100 text-red-700" :
                                r.name === "manager" ? "bg-blue-100 text-blue-700" :
                                "bg-green-100 text-green-700"
                              }`}>
                                {r.display_name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString("th-TH")}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEdit(user)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button onClick={() => handleDelete(user)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">{editingUser ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}</h3>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{formError}</div>
              )}
              <div>
                <label className={labelClass}>ชื่อ *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="ชื่อผู้ใช้" />
              </div>
              <div>
                <label className={labelClass}>อีเมล *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="email@example.com" />
              </div>
              <div>
                <label className={labelClass}>{editingUser ? "รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่าน *"}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} placeholder="อย่างน้อย 8 ตัวอักษร" />
              </div>
              {roles.length > 0 && (
                <div>
                  <label className={labelClass}>บทบาท</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {roles.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleRole(r.id)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          form.role_ids.includes(r.id)
                            ? "bg-green-100 border-green-400 text-green-700"
                            : "bg-white border-gray-300 text-gray-600 hover:border-green-300"
                        }`}
                      >
                        {r.display_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
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
