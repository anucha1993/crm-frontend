"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface CompanySettings {
  name?: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
  logo?: string;
  logo_url?: string;
}

export default function SettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<CompanySettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ settings: CompanySettings }>("/company-settings", token);
      setSettings(data.settings || {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true); setMessage(""); setError("");
    try {
      const { logo, logo_url, ...payload } = settings;
      void logo; void logo_url;
      const data = await api.put<{ settings: CompanySettings }>("/company-settings", payload, token);
      setSettings(data.settings);
      setMessage("บันทึกข้อมูลบริษัทสำเร็จ");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    } finally { setSaving(false); }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true); setError("");
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const data = await api.upload<{ logo: string; logo_url: string }>("/company-settings/logo", formData, token);
      setSettings(prev => ({ ...prev, logo: data.logo, logo_url: data.logo_url }));
      setMessage("อัปโหลดโลโก้สำเร็จ");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleDeleteLogo = async () => {
    if (!token || !confirm("ต้องการลบโลโก้?")) return;
    try {
      await api.delete("/company-settings/logo", token);
      setSettings(prev => ({ ...prev, logo: undefined, logo_url: undefined }));
      setMessage("ลบโลโก้สำเร็จ");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const update = (key: keyof CompanySettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <><Header title="ตั้งค่า" /><div className="p-12 text-center text-gray-400">กำลังโหลด...</div></>;

  return (
    <>
      <Header title="ตั้งค่า" />
      <div className="p-6 space-y-6 max-w-4xl">
        {message && <div className="bg-green-50 text-green-700 text-sm px-4 py-2 rounded-lg">{message}</div>}
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}

        {/* Logo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-5">โลโก้บริษัท</h3>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0">
              {settings.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">แนะนำขนาด 300x300px ไฟล์ PNG หรือ JPG ไม่เกิน 2MB</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 transition-colors"
                >
                  {uploading ? "กำลังอัปโหลด..." : settings.logo_url ? "เปลี่ยนโลโก้" : "อัปโหลดโลโก้"}
                </button>
                {settings.logo_url && (
                  <button onClick={handleDeleteLogo} className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">ลบโลโก้</button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-5">ข้อมูลบริษัท</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>ชื่อบริษัท</label>
              <input type="text" value={settings.name || ""} onChange={(e) => update("name", e.target.value)} className={inputClass} placeholder="ชื่อบริษัท / ร้านค้า" />
            </div>
            <div>
              <label className={labelClass}>เลขประจำตัวผู้เสียภาษี</label>
              <input type="text" value={settings.tax_id || ""} onChange={(e) => update("tax_id", e.target.value)} className={inputClass} placeholder="เลขผู้เสียภาษี 13 หลัก" maxLength={20} />
            </div>
            <div>
              <label className={labelClass}>เบอร์โทรศัพท์</label>
              <input type="tel" value={settings.phone || ""} onChange={(e) => update("phone", e.target.value)} className={inputClass} placeholder="0xx-xxx-xxxx" />
            </div>
            <div>
              <label className={labelClass}>แฟกซ์</label>
              <input type="tel" value={settings.fax || ""} onChange={(e) => update("fax", e.target.value)} className={inputClass} placeholder="0xx-xxx-xxxx" />
            </div>
            <div>
              <label className={labelClass}>อีเมล</label>
              <input type="email" value={settings.email || ""} onChange={(e) => update("email", e.target.value)} className={inputClass} placeholder="email@company.com" />
            </div>
            <div>
              <label className={labelClass}>เว็บไซต์</label>
              <input type="url" value={settings.website || ""} onChange={(e) => update("website", e.target.value)} className={inputClass} placeholder="https://..." />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>ที่อยู่</label>
              <textarea value={settings.address || ""} onChange={(e) => update("address", e.target.value)} className={inputClass + " resize-none"} rows={3} placeholder="ที่อยู่บริษัทสำหรับแสดงในเอกสาร" />
            </div>
          </div>
        </div>

        {/* Bank Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-5">ข้อมูลบัญชีธนาคาร</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>ธนาคาร</label>
              <input type="text" value={settings.bank_name || ""} onChange={(e) => update("bank_name", e.target.value)} className={inputClass} placeholder="ชื่อธนาคาร" />
            </div>
            <div>
              <label className={labelClass}>สาขา</label>
              <input type="text" value={settings.bank_branch || ""} onChange={(e) => update("bank_branch", e.target.value)} className={inputClass} placeholder="สาขา" />
            </div>
            <div>
              <label className={labelClass}>ชื่อบัญชี</label>
              <input type="text" value={settings.bank_account_name || ""} onChange={(e) => update("bank_account_name", e.target.value)} className={inputClass} placeholder="ชื่อบัญชี" />
            </div>
            <div>
              <label className={labelClass}>เลขที่บัญชี</label>
              <input type="text" value={settings.bank_account_number || ""} onChange={(e) => update("bank_account_number", e.target.value)} className={inputClass} placeholder="xxx-x-xxxxx-x" />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 font-medium transition-colors">
            {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลบริษัท"}
          </button>
        </div>
      </div>
    </>
  );
}
