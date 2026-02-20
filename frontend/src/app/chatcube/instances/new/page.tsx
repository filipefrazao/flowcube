"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Smartphone,
  Cloud,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { chatcubeApi } from "@/lib/chatcubeApi";
import type { EngineType, CreateInstanceRequest } from "@/types/chatcube.types";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STEPS = ["Engine", "Configuration", "Review"];

export default function NewInstancePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [engine, setEngine] = useState<EngineType>("baileys");
  const [name, setName] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  function canProceed(): boolean {
    if (currentStep === 0) return true;
    if (currentStep === 1) {
      if (!name.trim()) return false;
      if (engine === "cloud_api") {
        return !!(phoneNumberId.trim() && wabaId.trim() && accessToken.trim());
      }
      return true;
    }
    return true;
  }

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);

    try {
      const payload: CreateInstanceRequest = {
        name: name.trim(),
        engine,
      };

      if (engine === "cloud_api") {
        payload.phone_number_id = phoneNumberId.trim();
        payload.waba_id = wabaId.trim();
        payload.access_token = accessToken.trim();
      }

      const instance = await chatcubeApi.createInstance(payload);
      router.push(`/chatcube/instances/${instance.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create instance");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center px-6 gap-4">
          <Link
            href="/chatcube"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-lg font-semibold text-text-primary">New Instance</h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-8">
              {STEPS.map((step, idx) => (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      idx < currentStep
                        ? "bg-accent-green text-text-primary"
                        : idx === currentStep
                        ? "bg-primary text-gray-900"
                        : "bg-surface border border-border text-text-muted"
                    )}
                  >
                    {idx < currentStep ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      idx === currentStep ? "text-text-primary font-medium" : "text-text-muted"
                    )}
                  >
                    {step}
                  </span>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "w-12 h-px mx-2",
                        idx < currentStep ? "bg-accent-green" : "bg-border"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Step 1: Choose Engine */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-text-primary mb-1">
                  Choose Connection Engine
                </h2>
                <p className="text-text-secondary mb-6">
                  Select how you want to connect to WhatsApp.
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Baileys */}
                  <button
                    onClick={() => setEngine("baileys")}
                    className={cn(
                      "bg-surface border rounded-lg p-6 text-left transition-all",
                      engine === "baileys"
                        ? "border-primary ring-1 ring-primary"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="w-12 h-12 rounded-lg bg-accent-purple/10 flex items-center justify-center mb-4">
                      <Smartphone className="w-6 h-6 text-accent-purple" />
                    </div>
                    <h3 className="font-semibold text-text-primary mb-1">Baileys</h3>
                    <p className="text-sm text-text-secondary mb-3">
                      Free, open-source WhatsApp Web connection. No official API needed.
                    </p>
                    <ul className="space-y-1">
                      <li className="text-xs text-text-muted flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-accent-green" /> Free to use
                      </li>
                      <li className="text-xs text-text-muted flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-accent-green" /> QR Code connection
                      </li>
                      <li className="text-xs text-text-muted flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-accent-green" /> Warm-up system
                      </li>
                    </ul>
                  </button>

                  {/* Cloud API */}
                  <button
                    onClick={() => setEngine("cloud_api")}
                    className={cn(
                      "bg-surface border rounded-lg p-6 text-left transition-all",
                      engine === "cloud_api"
                        ? "border-primary ring-1 ring-primary"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="w-12 h-12 rounded-lg bg-accent-blue/10 flex items-center justify-center mb-4">
                      <Cloud className="w-6 h-6 text-accent-blue" />
                    </div>
                    <h3 className="font-semibold text-text-primary mb-1">Cloud API</h3>
                    <p className="text-sm text-text-secondary mb-3">
                      Official Meta WhatsApp Business API. Requires Meta developer account.
                    </p>
                    <ul className="space-y-1">
                      <li className="text-xs text-text-muted flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-accent-green" /> Official & stable
                      </li>
                      <li className="text-xs text-text-muted flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-accent-green" /> Template messages
                      </li>
                      <li className="text-xs text-text-muted flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-accent-green" /> Higher throughput
                      </li>
                    </ul>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Configuration */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-text-primary mb-1">
                    Instance Configuration
                  </h2>
                  <p className="text-text-secondary">
                    Configure your {engine === "cloud_api" ? "Cloud API" : "Baileys"} instance.
                  </p>
                </div>

                <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
                  {/* Instance Name */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      Instance Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Support WhatsApp, Sales Team"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Cloud API specific fields */}
                  {engine === "cloud_api" && (
                    <>
                      <div className="pt-4 border-t border-border">
                        <h3 className="text-sm font-medium text-text-secondary mb-3">
                          Meta Cloud API Credentials
                        </h3>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1.5">
                          Phone Number ID *
                        </label>
                        <input
                          type="text"
                          value={phoneNumberId}
                          onChange={(e) => setPhoneNumberId(e.target.value)}
                          placeholder="933152683214452"
                          className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1.5">
                          WABA ID *
                        </label>
                        <input
                          type="text"
                          value={wabaId}
                          onChange={(e) => setWabaId(e.target.value)}
                          placeholder="1420212763006169"
                          className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1.5">
                          Access Token *
                        </label>
                        <input
                          type="password"
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          placeholder="EAA..."
                          className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </>
                  )}

                  {engine === "baileys" && (
                    <div className="p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
                      <p className="text-sm text-text-secondary">
                        After creating the instance, you will scan a QR code with your WhatsApp to connect.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-text-primary mb-1">
                    Review & Create
                  </h2>
                  <p className="text-text-secondary">
                    Confirm the details before creating your instance.
                  </p>
                </div>

                <div className="bg-surface border border-border rounded-lg divide-y divide-border">
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-sm text-text-muted">Engine</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      engine === "cloud_api"
                        ? "bg-accent-blue/10 text-accent-blue"
                        : "bg-accent-purple/10 text-accent-purple"
                    )}>
                      {engine === "cloud_api" ? "Cloud API" : "Baileys"}
                    </span>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-sm text-text-muted">Name</span>
                    <span className="text-sm text-text-primary font-medium">{name}</span>
                  </div>
                  {engine === "cloud_api" && (
                    <>
                      <div className="p-4 flex items-center justify-between">
                        <span className="text-sm text-text-muted">Phone Number ID</span>
                        <span className="text-sm text-text-primary font-mono">{phoneNumberId}</span>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <span className="text-sm text-text-muted">WABA ID</span>
                        <span className="text-sm text-text-primary font-mono">{wabaId}</span>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <span className="text-sm text-text-muted">Access Token</span>
                        <span className="text-sm text-text-secondary font-mono">
                          {accessToken.slice(0, 8)}...{accessToken.slice(-4)}
                        </span>
                      </div>
                    </>
                  )}
                  {engine === "baileys" && (
                    <div className="p-4">
                      <p className="text-sm text-text-muted">
                        You will connect via QR Code after creation.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <button
                onClick={currentStep === 0 ? () => router.push("/chatcube") : handleBack}
                className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {currentStep === 0 ? "Cancel" : "Back"}
              </button>

              {currentStep < STEPS.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-text-primary font-medium transition-colors"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={creating || !canProceed()}
                  className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-text-primary font-medium transition-colors"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Create Instance
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
