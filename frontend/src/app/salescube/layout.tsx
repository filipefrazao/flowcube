"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";

export default function SalesCubeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden overflow-auto">
        {children}
      </div>
    </div>
  );
}
