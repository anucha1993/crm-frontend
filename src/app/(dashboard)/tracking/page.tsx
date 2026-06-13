"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

export default function TrackingHomePage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = code.trim();
    if (!v) return;
    router.push(`/tracking/${encodeURIComponent(v)}`);
  };

  return (
    <>
      <Header title="ติดตามใบขาย" />
      <div className="p-6 flex justify-center">
        <div className="w-full max-w-xl mt-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 sm:p-12 text-center">
            <div className="text-6xl mb-5">🔍</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">ติดตามสถานะเอกสาร</h1>
            <p className="text-base text-gray-500 mb-8 max-w-md mx-auto">
              กรอกหรือสแกนรหัสเอกสาร เช่น ใบเสนอราคา (QT-) คำสั่งซื้อ (ORD-) หรือใบส่งของ (DLV-)
            </p>
            <form onSubmit={submit} className="space-y-4">
              <input
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="เช่น DLV-202606-0028"
                className="w-full px-5 py-4 text-lg text-center border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none uppercase tracking-wide"
              />
              <button
                type="submit"
                disabled={!code.trim()}
                className="w-full px-5 py-4 text-lg font-medium bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40"
              >
                ติดตามสถานะ
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
