"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7000/api";

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
  logo_url?: string;
}

interface QuotationItem {
  id: number;
  description: string;
  thickness: string | null;
  length: string | null;
  quantity: string;
  unit: string;
  unit_price: string;
  amount: string;
  product: { id: number; name: string; code: string; steel_type: string | null; side_steel: string | null; unit?: string | null } | null;
}

interface Quotation {
  id: number;
  quotation_number: string;
  status: string;
  notes: string | null;
  subtotal: string;
  discount_type: string;
  discount_value: string;
  discount_amount: string;
  vat_rate: string;
  vat_amount: string;
  total: string;
  created_at: string;
  customer: {
    id: number;
    name: string;
    code: string;
    tax_id: string | null;
    contact_name: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  shipping_address: {
    label: string | null;
    contact_name: string | null;
    phone: string | null;
    address: string;
  } | null;
  creator: { id: number; name: string } | null;
  items: QuotationItem[];
}

export default function QuotationPrintPage() {
  const params = useParams();
  const quotationId = params?.id as string;
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [company, setCompany] = useState<CompanySettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("crm_token") : null;
    if (!token) { setError("กรุณาเข้าสู่ระบบ"); setLoading(false); return; }

    try {
      const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
      const [qRes, cRes] = await Promise.all([
        fetch(`${API_URL}/quotations/${quotationId}`, { headers }),
        fetch(`${API_URL}/company-settings`, { headers }),
      ]);
      if (!qRes.ok) throw new Error("ไม่สามารถโหลดใบเสนอราคาได้");
      const qData = await qRes.json();
      const cData = await cRes.json();
      setQuotation(qData.quotation);
      setCompany(cData.settings || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  }, [quotationId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (quotation && !loading) {
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
  }, [quotation, loading]);

  const formatCurrency = (v: string | number) =>
    Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "long", year: "numeric" });

  const numberToThaiText = (num: number): string => {
    if (num === 0) return "ศูนย์บาทถ้วน";
    const digits = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

    const convert = (n: number): string => {
      if (n === 0) return "";
      const str = Math.floor(n).toString();
      let result = "";
      const len = str.length;
      for (let i = 0; i < len; i++) {
        const d = parseInt(str[i]);
        const pos = len - i - 1;
        if (d === 0) continue;
        if (pos === 1 && d === 1) { result += "สิบ"; continue; }
        if (pos === 1 && d === 2) { result += "ยี่สิบ"; continue; }
        if (pos === 0 && d === 1 && len > 1) { result += "เอ็ด"; continue; }
        result += digits[d] + positions[pos];
      }
      return result;
    };

    const intPart = Math.floor(num);
    const decPart = Math.round((num - intPart) * 100);

    let text = "";
    if (intPart > 999999) {
      const millions = Math.floor(intPart / 1000000);
      const remainder = intPart % 1000000;
      text = convert(millions) + "ล้าน" + convert(remainder);
    } else {
      text = convert(intPart);
    }

    text += "บาท";
    if (decPart > 0) {
      text += convert(decPart) + "สตางค์";
    } else {
      text += "ถ้วน";
    }
    return text;
  };

  if (loading) return <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>;
  if (error) return <div className="p-12 text-center text-red-500">{error}</div>;
  if (!quotation) return <div className="p-12 text-center text-gray-400">ไม่พบข้อมูล</div>;

  const isVat = Number(quotation.vat_rate) > 0;

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; }
      `}</style>

      {/* Print Button Bar */}
      <div className="no-print fixed top-0 left-0 right-0 bg-white border-b shadow-sm z-50 px-6 py-3 flex items-center justify-between">
        <button onClick={() => window.history.back()} className="text-sm text-gray-600 hover:text-gray-800">
          ← กลับ
        </button>
        <button onClick={() => window.print()} className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
          พิมพ์เอกสาร
        </button>
      </div>

      <div className="max-w-[210mm] mx-auto bg-white print:max-w-none print:mx-0">
        <div className="no-print h-14" />

        <div className="p-8 print:p-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              {company.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logo_url} alt="Logo" className="w-20 h-20 object-contain" />
              )}
              <div>
                <h2 className="text-lg font-bold text-gray-900">{company.name || "บริษัท"}</h2>
                {company.address && <p className="text-xs text-gray-600 mt-0.5 max-w-[300px]">{company.address}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                  {company.phone && <span>โทร: {company.phone}</span>}
                  {company.fax && <span>แฟกซ์: {company.fax}</span>}
                  {company.email && <span>{company.email}</span>}
                </div>
                {company.tax_id && <p className="text-xs text-gray-500 mt-0.5">เลขผู้เสียภาษี: {company.tax_id}</p>}
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-gray-900">
                {"ใบเสนอราคา / Quotation"}
              </h1>
              <p className="text-sm text-gray-600 mt-1">เลขที่: <span className="font-mono font-semibold">{quotation.quotation_number}</span></p>
              <p className="text-sm text-gray-600">วันที่: {formatDate(quotation.created_at)}</p>
            </div>
          </div>

          <div className="border-t-2 border-gray-800 mb-5" />

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 print:bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ลูกค้า</h3>
              <p className="text-sm font-semibold text-gray-800">{quotation.customer?.name || "-"}</p>
              {quotation.customer?.address && <p className="text-xs text-gray-600 mt-1">{quotation.customer.address}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                {quotation.customer?.phone && <span>โทร: {quotation.customer.phone}</span>}
              </div>
              {quotation.customer?.tax_id && <p className="text-xs text-gray-500 mt-0.5">เลขผู้เสียภาษี: {quotation.customer.tax_id}</p>}
            </div>
            {quotation.shipping_address && (
              <div className="bg-gray-50 rounded-lg p-4 print:bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ที่อยู่จัดส่ง</h3>
                {quotation.shipping_address.label && <p className="text-sm font-semibold text-gray-800">{quotation.shipping_address.label}</p>}
                <p className="text-xs text-gray-600 mt-1">{quotation.shipping_address.address}</p>
                {(quotation.shipping_address.contact_name || quotation.shipping_address.phone) && (
                  <p className="text-xs text-gray-500 mt-1">
                    ผู้รับ: {quotation.shipping_address.contact_name || ""} {quotation.shipping_address.phone ? `(${quotation.shipping_address.phone})` : ""}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Items Table */}
          <table className="w-full text-sm border-collapse mb-6">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="py-2 px-3 text-center w-10 font-medium">#</th>
                <th className="py-2 px-3 text-left font-medium">รายการ</th>
                <th className="py-2 px-3 text-right w-20 font-medium">ความหนา</th>
                <th className="py-2 px-3 text-right w-20 font-medium">ความยาว</th>
                <th className="py-2 px-3 text-right w-20 font-medium">จำนวน</th>
                <th className="py-2 px-3 text-center w-16 font-medium">หน่วย</th>
                <th className="py-2 px-3 text-right w-24 font-medium">ราคา/หน่วย</th>
                <th className="py-2 px-3 text-right w-28 font-medium">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item, i) => {
                const rawUnit = (item.unit || "").trim();
                const productUnit = (item.product?.unit || "").trim();
                const isSheet = rawUnit === "แผ่น" || rawUnit === "ตรม." || rawUnit === "ตรม" || productUnit === "แผ่น";
                const displayUnit = isSheet ? "ตรม." : item.unit;
                const displayDescription = isSheet
                  ? item.description
                      .replace(/\/\s*เมตร/g, "/ตรม.")
                      .replace(/\bเมตร\b/g, "ตรม.")
                  : item.description;
                return (
                <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="py-2 px-3 text-center text-gray-500 border-b border-gray-200">{i + 1}</td>
                  <td className="py-2 px-3 border-b border-gray-200">
                    <span className="text-gray-800">{displayDescription}</span>
                  </td>
                  <td className="py-2 px-3 text-right border-b border-gray-200 text-gray-600">
                    {item.thickness ? Number(item.thickness).toFixed(2) : "-"}
                  </td>
                  <td className="py-2 px-3 text-right border-b border-gray-200 text-gray-600">
                    {item.length ? Number(item.length).toFixed(2) : "-"}
                  </td>
                  <td className="py-2 px-3 text-right border-b border-gray-200 text-gray-600">{Number(item.quantity).toLocaleString()}</td>
                  <td className="py-2 px-3 text-center border-b border-gray-200 text-gray-600">{displayUnit}</td>
                  <td className="py-2 px-3 text-right border-b border-gray-200 text-gray-600">
                    {formatCurrency(item.unit_price)}
                    <span className="text-xs text-gray-400 font-normal">/{displayUnit}</span>
                  </td>
                  <td className="py-2 px-3 text-right border-b border-gray-200 font-medium text-gray-800">{formatCurrency(item.amount)}</td>
                </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-80">
              <div className="flex justify-between py-1.5 text-sm text-gray-600">
                <span>ราคารวม</span>
                <span>{formatCurrency(quotation.subtotal)}</span>
              </div>
              {Number(quotation.discount_amount) > 0 && (
                <div className="flex justify-between py-1.5 text-sm text-red-600">
                  <span>ส่วนลด{quotation.discount_type === "percent" ? ` (${Number(quotation.discount_value)}%)` : ""}</span>
                  <span>-{formatCurrency(quotation.discount_amount)}</span>
                </div>
              )}
              {isVat && (
                <div className="flex justify-between py-1.5 text-sm text-gray-600">
                  <span>ภาษีมูลค่าเพิ่ม ({Number(quotation.vat_rate)}%)</span>
                  <span>{formatCurrency(quotation.vat_amount)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 mt-1 border-t-2 border-gray-800 text-base font-bold text-gray-900">
                <span>ยอดรวมสุทธิ</span>
                <span>{formatCurrency(quotation.total)}</span>
              </div>
              <div className="text-right text-xs text-gray-500 mt-1">
                ({numberToThaiText(Number(quotation.total))})
              </div>
              
            </div>
          </div>

          {/* Notes */}
          {quotation.notes && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="text-xs font-semibold text-gray-500 mb-1">หมายเหตุ</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{quotation.notes}</p>
            </div>
          )}

          {/* Bank Info */}
          {(company.bank_name || company.bank_account_number) && (
            <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-xs font-semibold text-gray-500 mb-2">ข้อมูลการชำระเงิน</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {company.bank_name && <div><span className="text-gray-500">ธนาคาร: </span><span className="text-gray-800">{company.bank_name}</span></div>}
                {company.bank_branch && <div><span className="text-gray-500">สาขา: </span><span className="text-gray-800">{company.bank_branch}</span></div>}
                {company.bank_account_name && <div><span className="text-gray-500">ชื่อบัญชี: </span><span className="text-gray-800">{company.bank_account_name}</span></div>}
                {company.bank_account_number && <div><span className="text-gray-500">เลขที่บัญชี: </span><span className="text-gray-800 font-mono">{company.bank_account_number}</span></div>}
              </div>
            </div>
          )}

          {/* Signature Area */}
          <div className="grid grid-cols-2 gap-12 mt-12">
            <div className="text-center">
              <div className="border-b border-gray-400 mb-2 h-16" />
              <p className="text-sm text-gray-600">ผู้เสนอราคา</p>
              {quotation.creator && <p className="text-xs text-gray-400 mt-0.5">{quotation.creator.name}</p>}
              <p className="text-xs text-gray-400">วันที่ {formatDate(quotation.created_at)}</p>
            </div>
            <div className="text-center">
              <div className="border-b border-gray-400 mb-2 h-16" />
              <p className="text-sm text-gray-600">ผู้อนุมัติ</p>
              <p className="text-xs text-gray-400 mt-0.5">วันที่ ____/____/____</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
