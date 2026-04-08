"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface Slip2GoSettings {
  slip2go_api_url: string;
  slip2go_secret_key: string;
  slip2go_check_duplicate: string;
}

export default function Slip2GoSettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<Slip2GoSettings>({
    slip2go_api_url: "https://connect.slip2go.com",
    slip2go_secret_key: "",
    slip2go_check_duplicate: "true",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<Slip2GoSettings>("/company-settings/slip2go", token);
      setSettings(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setMessage("");
    try {
      await api.put("/company-settings/slip2go", settings, token);
      setMessage("บันทึกสำเร็จ");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!token) return;
    setTesting(true);
    setTestResult(null);
    try {
      const data = await api.post<{ code?: string; message?: string; data?: unknown }>("/company-settings/slip2go/test", {}, token);
      if (data.code === "200000" || data.code === "200200") {
        setTestResult("เชื่อมต่อสำเร็จ");
      } else {
        setTestResult(`รหัส: ${data.code || "N/A"} — ${data.message || "ไม่สามารถเชื่อมต่อได้"}`);
      }
    } catch (err) {
      setTestResult(err instanceof ApiError ? err.message : "ไม่สามารถเชื่อมต่อได้");
    } finally {
      setTesting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  if (loading) return <><Header title="ตั้งค่า Slip2Go" /><div className="p-12 text-center text-gray-400">กำลังโหลด...</div></>;

  return (
    <>
      <Header title="ตั้งค่า Slip2Go" />
      <div className="p-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <p className="text-sm text-gray-500 mb-4">
              เชื่อมต่อกับ Slip2Go API เพื่อตรวจสอบสลิปการโอนเงินอัตโนมัติ
            </p>
          </div>

          <div>
            <label className={labelClass}>API URL</label>
            <input
              type="url"
              value={settings.slip2go_api_url}
              onChange={(e) => setSettings({ ...settings, slip2go_api_url: e.target.value })}
              className={inputClass}
              placeholder="https://connect.slip2go.com"
            />
          </div>

          <div>
            <label className={labelClass}>Secret Key</label>
            <input
              type="password"
              value={settings.slip2go_secret_key}
              onChange={(e) => setSettings({ ...settings, slip2go_secret_key: e.target.value })}
              className={inputClass}
              placeholder="กรอก Secret Key จาก Slip2Go"
            />
          </div>

          <div>
            <label className={labelClass}>ตรวจสอบสลิปซ้ำ</label>
            <select
              value={settings.slip2go_check_duplicate}
              onChange={(e) => setSettings({ ...settings, slip2go_check_duplicate: e.target.value })}
              className={inputClass}
            >
              <option value="true">เปิด (แนะนำ)</option>
              <option value="false">ปิด</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">ป้องกันการใช้สลิปซ้ำ</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button onClick={handleTest} disabled={testing || !settings.slip2go_secret_key} className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
              {testing ? "กำลังทดสอบ..." : "ทดสอบการเชื่อมต่อ"}
            </button>
          </div>

          {message && (
            <div className={`text-sm px-3 py-2 rounded-lg ${message.includes("สำเร็จ") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {message}
            </div>
          )}

          {testResult && (
            <div className={`text-sm px-3 py-2 rounded-lg ${testResult.includes("สำเร็จ") ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
              {testResult}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
