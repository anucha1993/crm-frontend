'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AccountType } from '@/lib/types';

export default function SelectAccountPage() {
  const { user, isLoading, availableAccounts, accountType, setAccountType } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (accountType) {
      router.replace('/');
    }
  }, [user, isLoading, accountType, router]);

  const choose = (type: AccountType) => {
    setAccountType(type);
    router.replace('/');
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (availableAccounts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">ไม่มีสิทธิ์เข้าถึงบัญชีใดๆ</h1>
          <p className="text-gray-600 mb-4">
            กรุณาติดต่อผู้ดูแลระบบเพื่อกำหนดสิทธิ์การเข้าถึงบัญชี (บิลเงินสด / ใบกำกับภาษี)
          </p>
          <button
            onClick={() => router.replace('/login')}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
          >
            กลับหน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    );
  }

  const canCash = availableAccounts.includes('cash');
  const canTax = availableAccounts.includes('tax');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800">เลือกบัญชีที่ต้องการเข้าใช้งาน</h1>
          <p className="text-gray-600 mt-2">สวัสดี {user.name} — กรุณาเลือกบัญชีที่ต้องการ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => canCash && choose('cash')}
            disabled={!canCash}
            className={
              'group rounded-2xl p-8 shadow-lg transition-all text-left ' +
              (canCash
                ? 'bg-white hover:shadow-2xl hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-emerald-500'
                : 'bg-gray-100 opacity-60 cursor-not-allowed')
            }
          >
            <div className="text-5xl mb-4">💵</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">บิลเงินสด</h2>
            <p className="text-gray-600 text-sm">
              สำหรับลูกค้าที่ชำระเงินสด ออกเอกสารแบบไม่มีใบกำกับภาษี
            </p>
            {!canCash && (
              <p className="text-red-500 text-xs mt-3">คุณไม่มีสิทธิ์เข้าถึงบัญชีนี้</p>
            )}
          </button>

          <button
            onClick={() => canTax && choose('tax')}
            disabled={!canTax}
            className={
              'group rounded-2xl p-8 shadow-lg transition-all text-left ' +
              (canTax
                ? 'bg-white hover:shadow-2xl hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-blue-500'
                : 'bg-gray-100 opacity-60 cursor-not-allowed')
            }
          >
            <div className="text-5xl mb-4">🧾</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">ใบกำกับภาษี</h2>
            <p className="text-gray-600 text-sm">
              สำหรับลูกค้านิติบุคคล/ต้องออกใบกำกับภาษี
            </p>
            {!canTax && (
              <p className="text-red-500 text-xs mt-3">คุณไม่มีสิทธิ์เข้าถึงบัญชีนี้</p>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
