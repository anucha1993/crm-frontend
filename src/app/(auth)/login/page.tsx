'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testUsers = [
    { email: 'admin@crm.com', role: 'Admin', name: 'Admin' },
    { email: 'manager@crm.com', role: 'Manager', name: 'สมชาย ผู้จัดการ' },
    { email: 'sales@crm.com', role: 'Sales', name: 'สมหญิง ฝ่ายขาย' },
    { email: 'sales2@crm.com', role: 'Sales', name: 'วิชัย ฝ่ายขาย' },
  ];

  const fillTestUser = (testEmail: string) => {
    setEmail(testEmail);
    setPassword('password');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CRM CMC</h1>
          <p className="text-gray-500 mt-1">เข้าสู่ระบบเพื่อจัดการลูกค้า</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              อีเมล
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-gray-900"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              รหัสผ่าน
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-gray-900"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-medium py-3 rounded-lg transition"
          >
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>

      {/* Dev Test Users */}
      <div className="mt-6 text-sm text-gray-500">
        <p className="font-semibold mb-2">Dev — ทดลองเข้าสู่ระบบ</p>
        <ul className="list-disc list-inside space-y-1">
          {testUsers.map((u) => (
            <li key={u.email}>
              <button type="button" onClick={() => fillTestUser(u.email)} className="text-emerald-600 hover:underline">
                {u.email}
              </button>
              <span className="text-gray-400"> — {u.name} ({u.role})</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-400 mt-2">รหัสผ่าน: password</p>
      </div>
    </div>
  );
}
