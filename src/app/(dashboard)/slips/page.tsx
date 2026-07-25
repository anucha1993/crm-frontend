"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

interface SlipPayment {
  id: number;
  order_id: number | null;
  payment_number: string;
  amount: string;
  status: string;
  order: { id: number; order_number: string } | null;
}

interface Slip {
  id: number;
  slip_ref: string | null;
  slip_image: string | null;
  slip_verified: boolean;
  amount: string;
  used_amount: number;
  remaining_amount: number;
  sender_name: string | null;
  sender_bank: string | null;
  transfer_date: string | null;
  uploader: { id: number; name: string } | null;
  payments?: SlipPayment[];
  created_at: string;
}

interface Paginated {
  data: Slip[];
  last_page: number;
  total: number;
}

export default function SlipGalleryPage() {
  const { token } = useAuth();
  const [slips, setSlips] = useState<Slip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") || "http://localhost:7000";

  const fetchSlips = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (availableOnly) params.set("available_only", "1");
      params.set("per_page", "18");
      params.set("page", String(page));
      const data = await api.get<Paginated>(`/slips?${params}`, token);
      setSlips(data.data);
      setLastPage(data.last_page);
      setTotal(data.total);
    } catch {
      setSlips([]);
    } finally {
      setLoading(false);
    }
  }, [token, search, availableOnly, page]);

  useEffect(() => { fetchSlips(); }, [fetchSlips]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !token) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("slip_image", file);
        await api.upload("/slips", fd, token);
      }
      setPage(1);
      await fetchSlips();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "อัปโหลดสลิปไม่สำเร็จ");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const fmt = (v: number | string) => Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2 });

  return (
    <>
      <Header title="คลังสลิป" />
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="ค้นหา Ref / ผู้โอน / ธนาคาร..."
            className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={availableOnly} onChange={(e) => { setAvailableOnly(e.target.checked); setPage(1); }} className="rounded" />
            เฉพาะที่มียอดคงเหลือ
          </label>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleUpload(e.target.files)} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {uploading ? "กำลังอัปโหลด..." : "+ อัปโหลดสลิปเข้าคลัง"}
          </button>
        </div>

        <p className="text-xs text-gray-400">พบ {total} สลิป — สลิป 1 ใบสามารถแบ่งจ่ายไปได้หลายคำสั่งซื้อ</p>

        {/* Grid */}
        {loading ? (
          <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
        ) : slips.length === 0 ? (
          <div className="p-12 text-center text-gray-400">ยังไม่มีสลิปในคลัง</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {slips.map((slip) => (
              <div key={slip.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
                <div className="flex">
                  {slip.slip_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${apiUrl}/storage/${slip.slip_image}`}
                      alt="slip"
                      onClick={() => setPreview(`${apiUrl}/storage/${slip.slip_image}`)}
                      className="w-24 h-24 object-cover cursor-pointer border-r border-gray-100"
                    />
                  )}
                  <div className="p-3 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-gray-700 truncate">{slip.slip_ref || "ไม่มี Ref"}</span>
                      {slip.slip_verified && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700">ยืนยัน</span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-gray-800 mt-1">{fmt(slip.amount)}</p>
                    <p className="text-xs text-gray-400 truncate">{slip.sender_name || "-"}{slip.sender_bank ? ` · ${slip.sender_bank}` : ""}</p>
                  </div>
                </div>
                <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500">ใช้ไป <b className="text-gray-700">{fmt(slip.used_amount)}</b></span>
                  <span className={slip.remaining_amount > 0.009 ? "text-green-600" : "text-gray-400"}>
                    คงเหลือ <b>{fmt(slip.remaining_amount)}</b>
                  </span>
                </div>
                {slip.payments && slip.payments.filter((p) => p.status !== "rejected").length > 0 && (
                  <div className="px-3 py-2 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 mb-1">แบ่งจ่ายให้คำสั่งซื้อ</p>
                    <div className="flex flex-wrap gap-1">
                      {slip.payments.filter((p) => p.status !== "rejected").map((p) => (
                        p.order ? (
                          <Link key={p.id} href={`/orders/${p.order_id}`} className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100">
                            {p.order.order_number} · {fmt(p.amount)}
                          </Link>
                        ) : null
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40">ก่อนหน้า</button>
            <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {lastPage}</span>
            <button disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40">ถัดไป</button>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="slip preview" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </>
  );
}
