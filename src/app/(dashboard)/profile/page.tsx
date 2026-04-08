"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

export default function ProfilePage() {
  const { user, token } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name || "", email: user?.email || "" });
  const [passwordForm, setPasswordForm] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileSave = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await api.put("/profile", profileForm, token!);
      setProfileMsg({ type: "success", text: "อัปเดตข้อมูลสำเร็จ" });
    } catch (err) {
      if (err instanceof ApiError) {
        setProfileMsg({ type: "error", text: err.errors ? Object.values(err.errors).flat().join(", ") : err.message });
      } else {
        setProfileMsg({ type: "error", text: "เกิดข้อผิดพลาด" });
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      await api.put("/profile/password", passwordForm, token!);
      setPasswordMsg({ type: "success", text: "เปลี่ยนรหัสผ่านสำเร็จ" });
      setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
    } catch (err) {
      if (err instanceof ApiError) {
        setPasswordMsg({ type: "error", text: err.errors ? Object.values(err.errors).flat().join(", ") : err.message });
      } else {
        setPasswordMsg({ type: "error", text: "เกิดข้อผิดพลาด" });
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm";

  return (
    <>
      <Header title="โปรไฟล์" />
      <div className="p-6 space-y-6 max-w-2xl">
        {/* Profile Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{user?.name}</h3>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <div className="flex gap-1.5 mt-1">
                {user?.roles.map((role) => (
                  <span key={role} className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                    role === "admin" ? "bg-red-100 text-red-700" :
                    role === "manager" ? "bg-blue-100 text-blue-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 border-b pb-2">ข้อมูลส่วนตัว</h4>

          {profileMsg && (
            <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${
              profileMsg.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              {profileMsg.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleProfileSave}
              disabled={savingProfile}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 transition-colors"
            >
              {savingProfile ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 border-b pb-2">เปลี่ยนรหัสผ่าน</h4>

          {passwordMsg && (
            <div className={`px-4 py-2 rounded-lg text-sm mb-4 ${
              passwordMsg.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              {passwordMsg.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านปัจจุบัน</label>
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                className={inputClass}
                placeholder="กรอกรหัสผ่านปัจจุบัน"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่</label>
                <input
                  type="password"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                  className={inputClass}
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  value={passwordForm.password_confirmation}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                  className={inputClass}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handlePasswordChange}
              disabled={savingPassword}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 transition-colors"
            >
              {savingPassword ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
