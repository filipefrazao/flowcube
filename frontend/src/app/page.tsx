"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    setIsAuthenticated(!!token);
    if (token) {
      router.push("/workflows");
    }
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          FlowCube 2.0
        </h1>
        <p className="text-text-secondary text-lg max-w-md">
          Build powerful conversational workflows with an intuitive visual editor
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 bg-surface hover:bg-surface-hover border border-border rounded-lg font-medium transition-colors"
          >
            Criar Conta
          </Link>
        </div>
      </div>
    </main>
  );
}
