"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2, AlertCircle, Check } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { billingApi, type Plan, type Subscription, type UsageMetrics } from "@/lib/billingApi";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const plansData = await billingApi.listPlans();
      setPlans(plansData);

      // These may be 404 if user has no subscription.
      try {
        const [subData, usageData] = await Promise.all([
          billingApi.getCurrentSubscription(),
          billingApi.getCurrentUsage(),
        ]);
        setSubscription(subData);
        setUsage(usageData);
      } catch {
        setSubscription(null);
        setUsage(null);
      }
    } catch (e) {
      console.error(e);
      setError("Falha ao carregar faturamento");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Faturamento</h1>
            <p className="text-sm text-text-muted">Planos e assinatura</p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          ) : (
            <>
              <section className="bg-surface border border-border rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h2 className="text-text-primary font-semibold">Assinatura atual</h2>
                </div>

                {subscription ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Info label="Plano" value={subscription.plan?.name || subscription.plan?.tier} />
                    <Info label="Ciclo" value={subscription.billing_cycle} />
                    <Info label="Status" value={subscription.status} />
                    <Info label="Trial" value={subscription.is_trial ? "Sim" : "Nao"} />
                    <Info
                      label="Renovacao (dias)"
                      value={String(subscription.days_until_renewal ?? "-")}
                    />
                    <Info
                      label="Cancelamento"
                      value={subscription.cancel_at_period_end ? "No fim do periodo" : "Ativo"}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">
                    Nenhuma assinatura ativa para este usuario.
                  </p>
                )}

                {usage ? (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h3 className="text-text-secondary font-medium mb-2">Uso (mes atual)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Info label="Workflows" value={String(usage.workflows_count)} />
                      <Info label="Execucoes" value={String(usage.executions_count)} />
                      <Info label="AI requests" value={String(usage.ai_requests_count)} />
                      <Info label="Storage (MB)" value={String(usage.storage_used_mb)} />
                      <Info label="WhatsApp msgs" value={String(usage.whatsapp_messages_sent)} />
                      <Info label="API requests" value={String(usage.api_requests_count)} />
                    </div>
                  </div>
                ) : null}
              </section>

              <section>
                <h2 className="text-text-primary font-semibold mb-3">Planos</h2>
                {plans.length === 0 ? (
                  <p className="text-sm text-text-muted">Nenhum plano ativo cadastrado.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    {plans.map((p) => (
                      <div
                        key={p.id}
                        className={cn(
                          "bg-surface border border-border rounded-lg p-5",
                          p.is_popular && "ring-2 ring-primary/40"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-text-primary font-semibold">{p.name}</h3>
                            <p className="text-sm text-text-muted mt-1">{p.tagline || p.description}</p>
                          </div>
                          {p.is_popular ? (
                            <span className="text-xs font-medium px-2 py-1 rounded border bg-primary/10 text-primary border-primary/20">
                              Popular
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-4">
                          <div className="text-2xl font-semibold text-text-primary">
                            R$ {p.price_monthly}
                            <span className="text-sm text-text-muted font-normal">/mes</span>
                          </div>
                          <div className="text-sm text-text-muted mt-1">
                            R$ {p.price_yearly}/ano
                          </div>
                        </div>

                        {Array.isArray(p.features) && p.features.length ? (
                          <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                            {p.features.slice(0, 6).map((f) => (
                              <li key={f} className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-accent-green mt-0.5" />
                                <span className="line-clamp-2">{f}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-4 text-sm text-text-muted">Sem features listadas.</p>
                        )}

                        <button
                          type="button"
                          disabled
                          className="mt-5 w-full px-4 py-2 bg-surface-hover border border-border rounded-lg text-text-muted cursor-not-allowed"
                          title="Fluxo de assinatura via Stripe nao habilitado no frontend"
                        >
                          Assinar (em breve)
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-text-muted uppercase tracking-wider">{label}</div>
      <div className="text-sm text-text-secondary mt-1">{value}</div>
    </div>
  );
}
