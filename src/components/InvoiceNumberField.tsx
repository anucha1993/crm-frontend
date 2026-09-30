'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

/**
 * State for the invoice-number field in the "issue invoice" dialog.
 * Call load() when the dialog opens to fetch the number the system would assign.
 * Only users with invoices.edit_number may change it.
 */
export function useNextInvoiceNumber() {
  const { token, hasPermission } = useAuth();
  const canEdit = hasPermission('invoices.edit_number');
  const [suggested, setSuggested] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setSuggested('');
    setValue('');
    setLoading(true);
    try {
      const data = await api.get<{ invoice_number: string }>('/invoices/next-number', token);
      setSuggested(data.invoice_number);
      setValue(data.invoice_number);
    } catch {
      // Preview is informational — the backend still assigns a number on issue.
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Send a number only when it was actually changed, so an untouched preview
  // never collides with a number someone else took in the meantime.
  const payload = (): { invoice_number?: string } => {
    const v = value.trim();
    return canEdit && v && v !== suggested ? { invoice_number: v } : {};
  };

  return { value, setValue, suggested, loading, canEdit, load, payload };
}

export function InvoiceNumberField({ state, label }: { state: ReturnType<typeof useNextInvoiceNumber>; label: string }) {
  const { value, setValue, suggested, loading, canEdit } = state;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่{label}</label>
      <input
        type="text"
        value={loading ? 'กำลังโหลด...' : value}
        readOnly={!canEdit || loading}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        maxLength={50}
        className={`w-full px-3 py-2 rounded-lg border border-gray-300 font-mono text-sm outline-none ${
          canEdit ? 'focus:ring-2 focus:ring-green-500 focus:border-green-500' : 'bg-gray-50 text-gray-500'
        }`}
      />
      <p className="text-xs text-gray-400 mt-1">
        {!canEdit
          ? 'ระบบรันเลขให้อัตโนมัติ (ไม่มีสิทธิ์แก้ไขเลขที่)'
          : suggested && value.trim() !== suggested
            ? `เลขที่ระบบรัน: ${suggested}`
            : 'แก้ไขได้หากต้องการใช้เลขอื่น'}
      </p>
    </div>
  );
}

/** Cancelled invoices have invoice_number = NULL; fall back to the original number for display. */
export function invoiceDisplayNumber(inv: { invoice_number: string | null; cancelled_invoice_number?: string | null }) {
  return inv.invoice_number || inv.cancelled_invoice_number || '-';
}
