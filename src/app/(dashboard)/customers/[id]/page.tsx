"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { exportMultiSheetExcel } from "@/lib/export-excel";

type StatusMap = Record<string, { label: string; color: string }>;

interface CustomerLevel { id: number; name: string; color: string; }
interface CustomerInfo {
  id: number;
  code: string;
  name: string;
  type: string;
  tax_id: string | null;
  contact_name: string | null;
  phone: string | null;
  address: string | null;
  level: CustomerLevel | null;
  created_at: string;
  last_activity_at: string | null;
  creator?: { id: number; name: string } | null;
}
interface Quotation { id: number; account_type: string; quotation_number: string; status: string; total: string; created_at: string; }
interface Order { id: number; account_type: string; order_number: string; quotation_id: number | null; status: string; delivery_status: string; total: string; paid_amount: string; remaining_amount: string; created_at: string; }
interface Delivery { id: number; account_type: string; delivery_number: string; order_id: number | null; status: string; delivery_date: string | null; created_at: string; }
interface Invoice { id: number; account_type: string; invoice_number: string; order_id: number | null; status: string; total: string; issue_date: string | null; created_at: string; }
interface Payment { id: number; account_type: string; payment_number: string; order_id: number | null; method: string; status: string; amount: string; created_at: string; }
interface Summary {
  quotation_count: number;
  order_count: number;
  delivery_count: number;
  invoice_count: number;
  payment_count: number;
  total_sales: number;
  total_paid: number;
  total_remaining: number;
}
interface HistoryResponse {
  customer: CustomerInfo;
  summary: Summary;
  quotations: Quotation[];
  orders: Order[];
  deliveries: Delivery[];
  invoices: Invoice[];
  payments: Payment[];
}

const QUOTATION_STATUS: StatusMap = {
  draft: { label: "ร่าง", color: "bg-gray-100 text-gray-600" },
  sent: { label: "ส่งแล้ว", color: "bg-blue-50 text-blue-700" },
  approved: { label: "อนุมัติ", color: "bg-green-50 text-green-700" },
  rejected: { label: "ไม่อนุมัติ", color: "bg-red-50 text-red-600" },
  cancelled: { label: "ยกเลิก", color: "bg-orange-50 text-orange-600" },
};
const ORDER_STATUS: StatusMap = {
  pending: { label: "รอดำเนินการ", color: "bg-gray-100 text-gray-600" },
  confirmed: { label: "ยืนยันแล้ว", color: "bg-blue-50 text-blue-700" },
  processing: { label: "กำลังผลิต", color: "bg-yellow-50 text-yellow-700" },
  completed: { label: "เสร็จสิ้น", color: "bg-green-50 text-green-700" },
  cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600" },
};
const ORDER_DELIVERY_STATUS: StatusMap = {
  not_delivered: { label: "ยังไม่จัดส่ง", color: "bg-gray-100 text-gray-600" },
  partially_delivered: { label: "จัดส่งบางส่วน", color: "bg-yellow-50 text-yellow-700" },
  fully_delivered: { label: "จัดส่งครบ", color: "bg-green-50 text-green-700" },
  cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600" },
};
const DELIVERY_STATUS: StatusMap = {
  pending: { label: "รอจัดส่ง", color: "bg-gray-100 text-gray-600" },
  delivering: { label: "กำลังจัดส่ง", color: "bg-blue-50 text-blue-700" },
  delivered: { label: "จัดส่งแล้ว", color: "bg-green-50 text-green-700" },
  cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600" },
};
const INVOICE_STATUS: StatusMap = {
  issued: { label: "ออกแล้ว", color: "bg-green-50 text-green-700" },
  cancelled: { label: "ยกเลิก", color: "bg-red-50 text-red-600" },
};
const PAYMENT_STATUS: StatusMap = {
  pending: { label: "รอตรวจสอบ", color: "bg-yellow-50 text-yellow-700" },
  approved: { label: "อนุมัติ", color: "bg-green-50 text-green-700" },
  rejected: { label: "ปฏิเสธ", color: "bg-red-50 text-red-600" },
};
const PAYMENT_METHOD: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนเงิน",
  pocket_money: "เงินทอน",
};
const ACCOUNT_LABEL: Record<string, string> = { cash: "เงินสด", tax: "ภาษี" };

const fmt = (v: string | number) =>
  Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : "-";

function Badge({ map, status }: { map: StatusMap; status: string }) {
  const s = map[status] || { label: status, color: "bg-gray-100 text-gray-600" };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
}

function AccountBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${type === "cash" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"}`}>
      {ACCOUNT_LABEL[type] || type}
    </span>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">{title}</h3>
        <span className="text-xs text-gray-400">{count} รายการ</span>
      </div>
      {count === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">ไม่มีข้อมูล</div>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </div>
  );
}

const thClass = "text-left px-4 py-2.5 font-medium text-gray-500 whitespace-nowrap";
const tdClass = "px-4 py-2.5 whitespace-nowrap";

export default function CustomerDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const res = await api.get<HistoryResponse>(`/customers/${id}/history`, token);
      setData(res);
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleExport = () => {
    if (!data) return;
    const acc = (t: string) => ACCOUNT_LABEL[t] || t;
    const s = data.summary;
    exportMultiSheetExcel(
      [
        {
          name: "สรุป",
          data: [
            { label: "รหัสลูกค้า", value: data.customer.code },
            { label: "ชื่อลูกค้า", value: data.customer.name },
            { label: "เลขผู้เสียภาษี", value: data.customer.tax_id || "-" },
            { label: "ผู้ติดต่อ", value: data.customer.contact_name || "-" },
            { label: "เบอร์โทร", value: data.customer.phone || "-" },
            { label: "จำนวนใบเสนอราคา", value: s.quotation_count },
            { label: "จำนวนออเดอร์", value: s.order_count },
            { label: "จำนวนใบส่งของ", value: s.delivery_count },
            { label: "จำนวนใบแจ้งหนี้", value: s.invoice_count },
            { label: "จำนวนการชำระเงิน", value: s.payment_count },
            { label: "ยอดขายรวม", value: s.total_sales },
            { label: "ชำระแล้ว", value: s.total_paid },
            { label: "ค้างชำระ", value: s.total_remaining },
          ],
          columns: [
            { header: "รายการ", key: "label", width: 22 },
            { header: "ค่า", key: "value", width: 32 },
          ],
        },
        {
          name: "ใบเสนอราคา",
          data: data.quotations.map((q) => ({
            quotation_number: q.quotation_number,
            account_label: acc(q.account_type),
            status_label: QUOTATION_STATUS[q.status]?.label || q.status,
            total: Number(q.total),
            date: fmtDate(q.created_at),
          })),
          columns: [
            { header: "เลขที่ใบเสนอราคา", key: "quotation_number", width: 22 },
            { header: "บัญชี", key: "account_label", width: 10 },
            { header: "สถานะ", key: "status_label", width: 12 },
            { header: "ยอดรวม", key: "total", width: 16 },
            { header: "วันที่", key: "date", width: 16 },
          ],
        },
        {
          name: "ออเดอร์",
          data: data.orders.map((o) => ({
            order_number: o.order_number,
            account_label: acc(o.account_type),
            status_label: ORDER_STATUS[o.status]?.label || o.status,
            delivery_label: ORDER_DELIVERY_STATUS[o.delivery_status]?.label || o.delivery_status,
            total: Number(o.total),
            paid: Number(o.paid_amount),
            remaining: Number(o.remaining_amount),
            date: fmtDate(o.created_at),
          })),
          columns: [
            { header: "เลขที่ออเดอร์", key: "order_number", width: 20 },
            { header: "บัญชี", key: "account_label", width: 10 },
            { header: "สถานะ", key: "status_label", width: 12 },
            { header: "การจัดส่ง", key: "delivery_label", width: 14 },
            { header: "ยอดรวม", key: "total", width: 16 },
            { header: "ชำระแล้ว", key: "paid", width: 16 },
            { header: "คงเหลือ", key: "remaining", width: 16 },
            { header: "วันที่", key: "date", width: 16 },
          ],
        },
        {
          name: "ใบส่งของ",
          data: data.deliveries.map((d) => ({
            delivery_number: d.delivery_number,
            account_label: acc(d.account_type),
            status_label: DELIVERY_STATUS[d.status]?.label || d.status,
            delivery_date: fmtDate(d.delivery_date),
            date: fmtDate(d.created_at),
          })),
          columns: [
            { header: "เลขที่ใบส่งของ", key: "delivery_number", width: 24 },
            { header: "บัญชี", key: "account_label", width: 10 },
            { header: "สถานะ", key: "status_label", width: 12 },
            { header: "วันที่จัดส่ง", key: "delivery_date", width: 16 },
            { header: "สร้างเมื่อ", key: "date", width: 16 },
          ],
        },
        {
          name: "ใบแจ้งหนี้",
          data: data.invoices.map((iv) => ({
            invoice_number: iv.invoice_number,
            account_label: acc(iv.account_type),
            status_label: INVOICE_STATUS[iv.status]?.label || iv.status,
            total: Number(iv.total),
            issue_date: fmtDate(iv.issue_date),
          })),
          columns: [
            { header: "เลขที่ใบแจ้งหนี้", key: "invoice_number", width: 22 },
            { header: "บัญชี", key: "account_label", width: 10 },
            { header: "สถานะ", key: "status_label", width: 12 },
            { header: "ยอดรวม", key: "total", width: 16 },
            { header: "วันที่ออก", key: "issue_date", width: 16 },
          ],
        },
        {
          name: "การชำระเงิน",
          data: data.payments.map((p) => ({
            payment_number: p.payment_number,
            account_label: acc(p.account_type),
            method_label: PAYMENT_METHOD[p.method] || p.method,
            status_label: PAYMENT_STATUS[p.status]?.label || p.status,
            amount: Number(p.amount),
            date: fmtDate(p.created_at),
          })),
          columns: [
            { header: "เลขที่การชำระ", key: "payment_number", width: 20 },
            { header: "บัญชี", key: "account_label", width: 10 },
            { header: "วิธี", key: "method_label", width: 12 },
            { header: "สถานะ", key: "status_label", width: 12 },
            { header: "จำนวนเงิน", key: "amount", width: 16 },
            { header: "วันที่", key: "date", width: 16 },
          ],
        },
      ],
      `ประวัติลูกค้า_${data.customer.code}_${data.customer.name}`
    );
  };

  return (
    <>
      <Header title="รายละเอียดลูกค้า" />
      <div className="p-6 space-y-6">
        <button
          onClick={() => router.push("/customers")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          กลับไปรายการลูกค้า
        </button>

        {loading ? (
          <div className="text-center text-gray-400 py-16">กำลังโหลด...</div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>
        ) : !data ? null : (
          <>
            {/* Customer info + export */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-800">{data.customer.name}</h2>
                    {data.customer.level && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: data.customer.level.color + "20", color: data.customer.level.color }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.customer.level.color }} />
                        {data.customer.level.name}
                      </span>
                    )}
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${data.customer.type === "regular" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                      {data.customer.type === "regular" ? "ลูกค้าประจำ" : "ลูกค้าทั่วไป"}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600">
                    <div><span className="text-gray-400">รหัส:</span> <span className="font-mono">{data.customer.code}</span></div>
                    {data.customer.tax_id && <div><span className="text-gray-400">เลขผู้เสียภาษี:</span> {data.customer.tax_id}</div>}
                    {data.customer.contact_name && <div><span className="text-gray-400">ผู้ติดต่อ:</span> {data.customer.contact_name}</div>}
                    {data.customer.phone && <div><span className="text-gray-400">เบอร์โทร:</span> {data.customer.phone}</div>}
                    {data.customer.address && <div className="sm:col-span-2"><span className="text-gray-400">ที่อยู่:</span> {data.customer.address}</div>}
                  </div>
                </div>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  ดาวน์โหลด Excel
                </button>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">ยอดขายรวม</p>
                <p className="text-2xl font-bold text-gray-800">฿{fmt(data.summary.total_sales)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">ชำระแล้ว</p>
                <p className="text-2xl font-bold text-green-600">฿{fmt(data.summary.total_paid)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">ค้างชำระ</p>
                <p className="text-2xl font-bold text-red-600">฿{fmt(data.summary.total_remaining)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">เอกสารทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-800">
                  {data.summary.quotation_count + data.summary.order_count + data.summary.delivery_count + data.summary.invoice_count + data.summary.payment_count}
                  <span className="text-sm font-normal text-gray-400"> ฉบับ</span>
                </p>
              </div>
            </div>

            {/* Quotations */}
            <Section title="ใบเสนอราคา" count={data.summary.quotation_count}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={thClass}>เลขที่</th>
                    <th className={thClass}>บัญชี</th>
                    <th className={thClass}>สถานะ</th>
                    <th className={`${thClass} text-right`}>ยอดรวม</th>
                    <th className={thClass}>วันที่</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                      <td className={`${tdClass} font-medium`}>
                        <Link href={`/quotations/${q.id}`} className="text-green-700 hover:underline">{q.quotation_number}</Link>
                      </td>
                      <td className={tdClass}><AccountBadge type={q.account_type} /></td>
                      <td className={tdClass}><Badge map={QUOTATION_STATUS} status={q.status} /></td>
                      <td className={`${tdClass} text-right text-gray-700`}>฿{fmt(q.total)}</td>
                      <td className={`${tdClass} text-gray-500`}>{fmtDate(q.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            {/* Orders */}
            <Section title="ออเดอร์" count={data.summary.order_count}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={thClass}>เลขที่</th>
                    <th className={thClass}>บัญชี</th>
                    <th className={thClass}>สถานะ</th>
                    <th className={thClass}>การจัดส่ง</th>
                    <th className={`${thClass} text-right`}>ยอดรวม</th>
                    <th className={`${thClass} text-right`}>ชำระแล้ว</th>
                    <th className={`${thClass} text-right`}>คงเหลือ</th>
                    <th className={thClass}>วันที่</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className={`${tdClass} font-medium text-gray-700`}>{o.order_number}</td>
                      <td className={tdClass}><AccountBadge type={o.account_type} /></td>
                      <td className={tdClass}><Badge map={ORDER_STATUS} status={o.status} /></td>
                      <td className={tdClass}><Badge map={ORDER_DELIVERY_STATUS} status={o.delivery_status} /></td>
                      <td className={`${tdClass} text-right text-gray-700`}>฿{fmt(o.total)}</td>
                      <td className={`${tdClass} text-right text-green-600`}>฿{fmt(o.paid_amount)}</td>
                      <td className={`${tdClass} text-right text-red-600`}>฿{fmt(o.remaining_amount)}</td>
                      <td className={`${tdClass} text-gray-500`}>{fmtDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            {/* Deliveries */}
            <Section title="ใบส่งของ" count={data.summary.delivery_count}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={thClass}>เลขที่</th>
                    <th className={thClass}>บัญชี</th>
                    <th className={thClass}>สถานะ</th>
                    <th className={thClass}>วันที่จัดส่ง</th>
                    <th className={thClass}>สร้างเมื่อ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.deliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className={`${tdClass} font-medium text-gray-700`}>{d.delivery_number}</td>
                      <td className={tdClass}><AccountBadge type={d.account_type} /></td>
                      <td className={tdClass}><Badge map={DELIVERY_STATUS} status={d.status} /></td>
                      <td className={`${tdClass} text-gray-500`}>{fmtDate(d.delivery_date)}</td>
                      <td className={`${tdClass} text-gray-500`}>{fmtDate(d.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            {/* Invoices */}
            <Section title="ใบแจ้งหนี้" count={data.summary.invoice_count}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={thClass}>เลขที่</th>
                    <th className={thClass}>บัญชี</th>
                    <th className={thClass}>สถานะ</th>
                    <th className={`${thClass} text-right`}>ยอดรวม</th>
                    <th className={thClass}>วันที่ออก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.invoices.map((iv) => (
                    <tr key={iv.id} className="hover:bg-gray-50 transition-colors">
                      <td className={`${tdClass} font-medium text-gray-700`}>{iv.invoice_number}</td>
                      <td className={tdClass}><AccountBadge type={iv.account_type} /></td>
                      <td className={tdClass}><Badge map={INVOICE_STATUS} status={iv.status} /></td>
                      <td className={`${tdClass} text-right text-gray-700`}>฿{fmt(iv.total)}</td>
                      <td className={`${tdClass} text-gray-500`}>{fmtDate(iv.issue_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            {/* Payments */}
            <Section title="การชำระเงิน" count={data.summary.payment_count}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={thClass}>เลขที่</th>
                    <th className={thClass}>บัญชี</th>
                    <th className={thClass}>วิธี</th>
                    <th className={thClass}>สถานะ</th>
                    <th className={`${thClass} text-right`}>จำนวนเงิน</th>
                    <th className={thClass}>วันที่</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className={`${tdClass} font-medium text-gray-700`}>{p.payment_number}</td>
                      <td className={tdClass}><AccountBadge type={p.account_type} /></td>
                      <td className={`${tdClass} text-gray-600`}>{PAYMENT_METHOD[p.method] || p.method}</td>
                      <td className={tdClass}><Badge map={PAYMENT_STATUS} status={p.status} /></td>
                      <td className={`${tdClass} text-right text-gray-700`}>฿{fmt(p.amount)}</td>
                      <td className={`${tdClass} text-gray-500`}>{fmtDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </>
        )}
      </div>
    </>
  );
}
