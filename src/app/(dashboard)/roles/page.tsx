"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface Permission {
  id: number;
  name: string;
  display_name: string;
  group: string;
}

interface RoleItem {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  permissions: Permission[];
}

const groupLabels: Record<string, string> = {
  customers: "ลูกค้า",
  deals: "ดีล",
  tasks: "งาน",
  products: "สินค้า",
  categories: "หมวดหมู่",
  reports: "รายงาน",
  settings: "ตั้งค่า",
  users: "ผู้ใช้",
};

export default function RolesPage() {
  const { token } = useAuth();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [form, setForm] = useState({ name: "", display_name: "", description: "", permission_ids: [] as number[] });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedRole, setExpandedRole] = useState<number | null>(null);

  const fetchRoles = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ roles: RoleItem[] }>("/roles", token);
      setRoles(data.roles);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchPermissions = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ permissions: Record<string, Permission[]> }>("/permissions", token);
      setAllPermissions(data.permissions);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  const openCreate = () => {
    setEditingRole(null);
    setForm({ name: "", display_name: "", description: "", permission_ids: [] });
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (role: RoleItem) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      display_name: role.display_name,
      description: role.description || "",
      permission_ids: role.permissions.map((p) => p.id),
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
        display_name: form.display_name,
        description: form.description || null,
        permissions: form.permission_ids,
      };
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, payload, token!);
      } else {
        await api.post("/roles", payload, token!);
      }
      setShowModal(false);
      fetchRoles();
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

  const handleDelete = async (role: RoleItem) => {
    if (!confirm(`ต้องการลบบทบาท "${role.display_name}" ใช่หรือไม่?`)) return;
    try {
      await api.delete(`/roles/${role.id}`, token!);
      fetchRoles();
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
    }
  };

  const togglePermission = (permId: number) => {
    setForm((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permId)
        ? prev.permission_ids.filter((id) => id !== permId)
        : [...prev.permission_ids, permId],
    }));
  };

  const toggleGroup = (perms: Permission[]) => {
    const allSelected = perms.every((p) => form.permission_ids.includes(p.id));
    if (allSelected) {
      setForm((prev) => ({
        ...prev,
        permission_ids: prev.permission_ids.filter((id) => !perms.find((p) => p.id === id)),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        permission_ids: [...new Set([...prev.permission_ids, ...perms.map((p) => p.id)])],
      }));
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <>
      <Header title="จัดการบทบาท" />
      <div className="p-6 space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">จัดการบทบาทและสิทธิ์การเข้าถึงของผู้ใช้ในระบบ</p>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มบทบาท
          </button>
        </div>

        {/* Roles Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">กำลังโหลด...</div>
        ) : roles.length === 0 ? (
          <div className="text-center py-20 text-gray-400">ไม่พบบทบาท</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {roles.map((role) => (
              <div key={role.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm ${
                      role.name === "admin" ? "bg-red-500" : role.name === "manager" ? "bg-blue-500" : "bg-green-500"
                    }`}>
                      {role.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{role.display_name}</h3>
                      <p className="text-xs text-gray-500">{role.name} • {role.permissions.length} สิทธิ์</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="ดูสิทธิ์"
                    >
                      <svg className={`w-4 h-4 transition-transform ${expandedRole === role.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {role.name !== "admin" && (
                      <>
                        <button onClick={() => openEdit(role)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(role)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {role.description && (
                  <div className="px-6 pb-3">
                    <p className="text-sm text-gray-500">{role.description}</p>
                  </div>
                )}
                {expandedRole === role.id && (
                  <div className="px-6 pb-4 border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(
                        role.permissions.reduce((acc, perm) => {
                          if (!acc[perm.group]) acc[perm.group] = [];
                          acc[perm.group].push(perm);
                          return acc;
                        }, {} as Record<string, Permission[]>)
                      ).map(([group, perms]) => (
                        <div key={group} className="bg-gray-50 rounded-lg p-3">
                          <h5 className="text-xs font-semibold text-gray-600 uppercase mb-2">{groupLabels[group] || group}</h5>
                          <div className="space-y-1">
                            {perms.map((p) => (
                              <div key={p.id} className="flex items-center gap-1.5">
                                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs text-gray-600">{p.display_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">{editingRole ? "แก้ไขบทบาท" : "เพิ่มบทบาทใหม่"}</h3>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>ชื่อ (อังกฤษ) *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass}
                    placeholder="เช่น editor"
                    disabled={!!editingRole}
                  />
                </div>
                <div>
                  <label className={labelClass}>ชื่อที่แสดง *</label>
                  <input type="text" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className={inputClass} placeholder="เช่น ผู้แก้ไข" />
                </div>
              </div>
              <div>
                <label className={labelClass}>คำอธิบาย</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} placeholder="คำอธิบายบทบาท (ถ้ามี)" />
              </div>

              {/* Permissions Grid */}
              <div>
                <label className={labelClass}>สิทธิ์การเข้าถึง</label>
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                  {Object.entries(allPermissions).map(([group, perms]) => (
                    <div key={group} className="border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={perms.every((p) => form.permission_ids.includes(p.id))}
                            onChange={() => toggleGroup(perms)}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-sm font-medium text-gray-700">{groupLabels[group] || group}</span>
                        </label>
                        <span className="text-xs text-gray-400">{perms.filter((p) => form.permission_ids.includes(p.id)).length}/{perms.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 py-2">
                        {perms.map((p) => (
                          <label key={p.id} className="flex items-center gap-2 cursor-pointer py-1">
                            <input
                              type="checkbox"
                              checked={form.permission_ids.includes(p.id)}
                              onChange={() => togglePermission(p.id)}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-600">{p.display_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
