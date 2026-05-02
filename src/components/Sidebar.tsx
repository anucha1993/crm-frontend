"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type NavChild = { href: string; label: string; permission?: string };

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  permission?: string;
  children?: NavChild[];
};

const navItems: NavItem[] = [
  {
    href: "/",
    label: "แดชบอร์ด",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
      </svg>
    ),
  },
  {
    href: "/customers",
    label: "จัดการลูกค้า",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    children: [
      { href: "/customers", label: "ลูกค้า", permission: "customers.view" },
      { href: "/customer-levels", label: "ระดับลูกค้า", permission: "customer-levels.view" },
    ],
  },
  {
    href: "/quotations",
    label: "ใบเสนอราคา",
    permission: "quotations.view",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    children: [
      { href: "/quotations", label: "ทั้งหมด" },
      { href: "/quotations?status=draft", label: "ร่าง" },
      { href: "/quotations?status=sent", label: "ส่งแล้ว" },
      { href: "/quotations?status=approved", label: "อนุมัติ" },
      { href: "/quotations?status=rejected", label: "ไม่อนุมัติ" },
    ],
  },
  {
    href: "/orders",
    label: "คำสั่งซื้อ",
    permission: "orders.view",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    children: [
      { href: "/orders", label: "ทั้งหมด" },
      { href: "/orders?status=pending", label: "รอดำเนินการ" },
      { href: "/orders?status=in_progress", label: "อยู่ระหว่างดำเนินการ" },
      { href: "/orders?status=completed", label: "คำสั่งซื้อสำเร็จ" },
    ],
  },
  {
    href: "/payments",
    label: "การชำระเงิน",
    permission: "payments.view",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    children: [
      { href: "/payments", label: "ทั้งหมด" },
      { href: "/payments?status=pending", label: "รอยืนยัน" },
      { href: "/payments?status=approved", label: "อนุมัติแล้ว" },
      { href: "/payments?status=rejected", label: "ปฏิเสธ" },
      { href: "/payments/scan", label: "สแกน QR ตรวจสอบ" },
    ],
  },
  {
    href: "/deliveries",
    label: "ใบส่งสินค้า",
    permission: "deliveries.view",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
    children: [
      { href: "/deliveries/calendar", label: "ปฏิทินการจัดส่ง" },
      { href: "/deliveries", label: "ทั้งหมด" },
      { href: "/deliveries?status=pending", label: "รอจัดส่ง" },
      { href: "/deliveries?status=delivering", label: "กำลังจัดส่ง" },
      { href: "/deliveries?status=delivered", label: "จัดส่งแล้ว" },
      { href: "/deliveries/scan", label: "สแกน QR ยืนยันจัดส่ง" },
    ],
  },
  {
    href: "/invoices",
    label: "ใบกำกับภาษี",
    permission: "invoices.view",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
    children: [
      { href: "/invoices", label: "ทั้งหมด" },
      { href: "/invoices?status=issued", label: "ออกแล้ว" },
      { href: "/invoices?status=cancelled", label: "ยกเลิก" },
    ],
  },
  {
    href: "/products",
    label: "จัดการสินค้า",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    children: [
      { href: "/products", label: "สินค้า", permission: "products.view" },
      { href: "/categories", label: "หมวดหมู่", permission: "categories.view" },
    ],
  },
  {
    href: "/users",
    label: "จัดการสมาชิก",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    children: [
      { href: "/users", label: "ผู้ใช้งาน", permission: "users.view" },
      { href: "/roles", label: "บทบาท / สิทธิ์", permission: "roles.view" },
    ],
  },
  {
    href: "/vehicle-types",
    label: "จัดการรถขนส่ง",
    permission: "vehicle-types.view",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 5h4m-4 4h8M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    href: "/reports",
    label: "รายงาน",
    permission: "reports.view",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    children: [
      { href: "/reports/sales-by-seller", label: "ยอดขายตามผู้ขาย" },
      { href: "/reports/sales-by-customer", label: "ยอดขายตามลูกค้า" },
      { href: "/reports/sales-by-product", label: "ยอดขายตามสินค้า" },
      { href: "/reports/monthly-sales", label: "ยอดขายรายเดือน" },
      { href: "/reports/ar-aging", label: "ยอดค้างชำระ" },
      { href: "/reports/invoices", label: "ใบกำกับภาษี" },
      { href: "/reports/inactive-customers", label: "ลูกค้าไม่เคลื่อนไหว" },
    ],
  },
  {
    href: "/settings",
    label: "ตั้งค่า",
    permission: "settings.view",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    children: [
      { href: "/settings", label: "ข้อมูลบริษัท" },
      { href: "/settings/slip2go", label: "Slip2Go" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, hasPermission, accountType, availableAccounts, clearAccountType } = useAuth();
  const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

  const isCash = accountType === 'cash';
  const remapLabel = (href: string, label: string): string => {
    if (!isCash) return label;
    if (href === '/invoices' || href === '/reports/invoices') return 'บิลเงินสด';
    return label;
  };

  // Filter nav items by permission
  const visibleNavItems = navItems
    .map((item) => {
      if (item.children) {
        const visibleChildren = item.children
          .filter((child) => !child.permission || hasPermission(child.permission))
          .map((child) => ({ ...child, label: remapLabel(child.href, child.label) }));
        if (visibleChildren.length === 0) return null;
        // If parent has permission, also enforce it
        if (item.permission && !hasPermission(item.permission)) return null;
        return { ...item, label: remapLabel(item.href, item.label), children: visibleChildren };
      }
      if (item.permission && !hasPermission(item.permission)) return null;
      return { ...item, label: remapLabel(item.href, item.label) };
    })
    .filter((i): i is NavItem => i !== null);

  // Determine which menus should be open based on current path
  const getInitialOpenMenus = () => {
    const open: Record<string, boolean> = {};
    visibleNavItems.forEach((item) => {
      if (item.children) {
        const isInSection = item.children.some((child) => pathname.startsWith(child.href.split('?')[0]));
        if (isInSection) open[item.href] = true;
      }
    });
    return open;
  };

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(getInitialOpenMenus);

  const toggleMenu = (href: string) => {
    setOpenMenus((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
        <div className="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center font-bold text-lg">
          C
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight text-gray-800">CRM CMC</h1>
          <p className="text-xs text-gray-400">ระบบจัดการลูกค้า</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          if (item.children) {
            const isInSection = item.children.some((child) => pathname.startsWith(child.href));
            const isOpen = openMenus[item.href] ?? false;
            return (
              <div key={item.href}>
                <button
                  onClick={() => toggleMenu(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isInSection
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="ml-5 mt-1 space-y-1 border-l-2 border-gray-200 pl-4">
                    {item.children.map((child) => {
                      const childPath = child.href.split('?')[0];
                      const childQuery = child.href.includes('?') ? child.href.split('?')[1] : '';
                      let isChildActive: boolean;
                      if (childQuery) {
                        isChildActive = currentUrl === child.href;
                      } else if (child.href === item.children![0].href) {
                        isChildActive = pathname === childPath || pathname.startsWith(childPath + '/');
                      } else {
                        isChildActive = pathname.startsWith(childPath);
                      }
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isChildActive
                              ? "text-green-700 font-medium bg-green-50"
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Account switcher */}
      {accountType && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1.5">บัญชีปัจจุบัน</p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg">{accountType === 'cash' ? '💵' : '🧾'}</span>
              <span className={`text-sm font-semibold truncate ${accountType === 'cash' ? 'text-emerald-700' : 'text-blue-700'}`}>
                {accountType === 'cash' ? 'บิลเงินสด' : 'ใบกำกับภาษี'}
              </span>
            </div>
            {availableAccounts.length > 1 && (
              <button
                onClick={() => {
                  clearAccountType();
                  router.push('/select-account');
                }}
                className="text-xs px-2 py-1 rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors flex-shrink-0"
                title="เปลี่ยนบัญชี"
              >
                เปลี่ยน
              </button>
            )}
          </div>
        </div>
      )}

      {/* User section */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-semibold hover:ring-2 hover:ring-green-300 transition-all">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Link>
          <Link href="/profile" className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <p className="text-sm font-medium text-gray-800 truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
          </Link>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="ออกจากระบบ"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
