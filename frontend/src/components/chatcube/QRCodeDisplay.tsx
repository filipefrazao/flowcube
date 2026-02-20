"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { QrCode, RefreshCw, Loader2, Smartphone, Copy, CheckCircle } from "lucide-react";
import { chatcubeApi } from "@/lib/chatcubeApi";
import { cn } from "@/lib/utils";

interface QRCodeDisplayProps {
  instanceId: string;
  onConnected?: () => void;
}

/**
 * Extract the QR code string from engine response data.
 * Engine returns nested format: {success, data: {qrCode}} which Django proxies through.
 */
function extractQR(data: Record<string, any>): string | null {
  // Direct field
  if (data.qr_code) return data.qr_code;
  if (data.qrCode) return data.qrCode;
  if (data.qr) return data.qr;
  // Nested in data
  const nested = data.data;
  if (nested && typeof nested === "object") {
    if (nested.qrCode) return nested.qrCode;
    if (nested.qr_code) return nested.qr_code;
    if (nested.qr) return nested.qr;
  }
  return null;
}

/**
 * Extract status from engine response.
 */
function extractStatus(data: Record<string, any>): string | null {
  if (data.status) return data.status;
  const nested = data.data;
  if (nested && typeof nested === "object") {
    return nested.status || null;
  }
  return null;
}

export function QRCodeDisplay({ instanceId, onConnected }: QRCodeDisplayProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [showPairing, setShowPairing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const retryRef = useRef(0);

  const fetchQRCode = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await chatcubeApi.getQRCode(instanceId);
      const qr = extractQR(data);
      if (qr) {
        setQrCode(qr);
        setCountdown(30);
        retryRef.current = 0;
      } else {
        // QR not ready yet (Baileys still initializing)
        retryRef.current += 1;
        if (retryRef.current <= 10) {
          // Will retry via the polling effect below
          setQrCode(null);
        } else {
          setError("QR code not available. The engine may still be starting.");
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load QR Code");
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  // On mount: trigger reconnect to wake up the Baileys socket, then start polling
  useEffect(() => {
    chatcubeApi.reconnect(instanceId).catch(() => {
      // Ignore reconnect errors — instance may already be connecting
    });
    fetchQRCode();
  }, [instanceId, fetchQRCode]);

  // Poll for QR when it's not yet available (retry every 3s)
  useEffect(() => {
    if (qrCode || loading || showPairing) return;

    const pollTimer = setInterval(() => {
      fetchQRCode();
    }, 3000);

    return () => clearInterval(pollTimer);
  }, [qrCode, loading, showPairing, fetchQRCode]);

  // Auto-refresh countdown when QR is displayed
  useEffect(() => {
    if (!qrCode || loading) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchQRCode();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [qrCode, loading, fetchQRCode]);

  // Poll for connection status
  useEffect(() => {
    const statusInterval = setInterval(async () => {
      try {
        const data = await chatcubeApi.getStatus(instanceId);
        const status = extractStatus(data);
        if (status === "connected" || status === "open") {
          onConnected?.();
        }
      } catch {
        // Ignore polling errors
      }
    }, 5000);

    return () => clearInterval(statusInterval);
  }, [instanceId, onConnected]);

  async function handleGetPairingCode() {
    if (!phoneNumber.trim()) return;

    setPairingLoading(true);
    try {
      const data = await chatcubeApi.getPairingCode(instanceId, phoneNumber);
      const code = data.pairing_code || data.pairingCode || (data.data && (data.data.pairingCode || data.data.pairing_code));
      setPairingCode(code || null);
      if (!code) setError("No pairing code returned. Try again.");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to get pairing code");
    } finally {
      setPairingLoading(false);
    }
  }

  async function handleCopyCode() {
    if (!pairingCode) return;
    await navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-accent-green/10 flex items-center justify-center">
          <QrCode className="w-5 h-5 text-accent-green" />
        </div>
        <div>
          <h3 className="font-medium text-text-primary">Connect WhatsApp</h3>
          <p className="text-sm text-text-muted">Scan the QR code with your phone</p>
        </div>
      </div>

      {!showPairing ? (
        <>
          {/* QR Code Display */}
          <div className="flex flex-col items-center">
            <div className="w-64 h-64 bg-surface rounded-lg flex items-center justify-center mb-4 overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-text-secondary animate-spin" />
                  <span className="text-xs text-text-secondary">Loading QR...</span>
                </div>
              ) : error ? (
                <div className="text-center p-4">
                  <p className="text-red-500 text-sm mb-2">{error}</p>
                  <button
                    onClick={() => { retryRef.current = 0; fetchQRCode(); }}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : qrCode ? (
                <img
                  src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="WhatsApp QR Code"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-text-secondary animate-spin" />
                  <span className="text-xs text-text-secondary">Generating QR code...</span>
                </div>
              )}
            </div>

            {/* Countdown & Refresh */}
            {qrCode && !loading && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-text-muted">
                  Refreshes in {countdown}s
                </span>
                <button
                  onClick={fetchQRCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-surface-hover rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh QR
                </button>
              </div>
            )}
          </div>

          {/* Pairing Code Link */}
          <div className="text-center border-t border-border pt-4">
            <button
              onClick={() => setShowPairing(true)}
              className="text-sm text-primary hover:text-primary-hover transition-colors"
            >
              Or use pairing code instead
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Pairing Code Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Phone Number (with country code)
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+5591912345678"
                  className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleGetPairingCode}
                  disabled={pairingLoading || !phoneNumber.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-text-primary font-medium transition-colors"
                >
                  {pairingLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Smartphone className="w-4 h-4" />
                  )}
                  Get Code
                </button>
              </div>
            </div>

            {pairingCode && (
              <div className="bg-background border border-border rounded-lg p-4">
                <p className="text-sm text-text-muted mb-2">Enter this code on your phone:</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-mono font-bold text-text-primary tracking-widest">
                    {pairingCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary bg-surface-hover rounded-lg transition-colors"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-accent-green" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-error">{error}</p>
            )}

            {/* Back to QR */}
            <div className="text-center border-t border-border pt-4">
              <button
                onClick={() => {
                  setShowPairing(false);
                  setPairingCode(null);
                  setError(null);
                }}
                className="text-sm text-primary hover:text-primary-hover transition-colors"
              >
                Back to QR Code
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default QRCodeDisplay;
