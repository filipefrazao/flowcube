"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { connectAccount } from "@/lib/socialcubeApi";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting account...");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state") || "instagram:0";
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(searchParams.get("error_description") || "Authorization denied");
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code received");
      return;
    }

    connectAccount(code, state)
      .then(() => {
        setStatus("success");
        setMessage("Account connected successfully!");
        setTimeout(() => router.push("/socialcube/accounts"), 2000);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.error || "Failed to connect account");
      });
  }, [searchParams, router]);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-md">
        {status === "loading" && <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />}
        {status === "success" && <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />}
        {status === "error" && <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />}
        <p className="text-lg font-medium text-text-primary">{message}</p>
        {status === "error" && (
          <button onClick={() => router.push("/socialcube/accounts")} className="mt-4 text-blue-400 hover:underline text-sm">
            Back to Accounts
          </button>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
