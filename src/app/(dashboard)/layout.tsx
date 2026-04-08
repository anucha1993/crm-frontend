'use client';

import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <Sidebar />
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </AuthGuard>
  );
}
