"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { authApi } from "@/lib/api";
import { LayoutDashboard, Loader2, AlertCircle, ArrowRight, Sparkles, Lock, User } from "lucide-react";
import { GlassCard, PremiumButton } from "@/components/ui/premium";
import { GradientBlobs, AuroraBackground } from "@/components/effects";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authApi.login({ username: email, password });
      localStorage.setItem("authToken", response.token);
      router.push("/dashboard");
    } catch (err: any) {
      const statusCode = err?.response?.status;
      const data = err?.response?.data;

      if (!err?.response) {
        setError("Erro de rede. Tente novamente.");
      } else if (statusCode === 429 || data?.error_code === "rate_limit_exceeded") {
        const retryAfter = data?.retry_after;
        const retryMsg =
          typeof retryAfter === "number" ? ` Aguarde ${retryAfter}s e tente novamente.` : "";
        setError(data?.detail || `Muitas tentativas de login.${retryMsg}`);
      } else {
        setError(
          data?.non_field_errors?.[0] ||
            data?.detail ||
            "Credenciais invalidas. Tente novamente."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-background relative overflow-hidden">
      {/* Background Effects */}
      <AuroraBackground className="opacity-40" />
      <GradientBlobs className="opacity-60" />
      
      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <GlassCard className="relative overflow-hidden" padding="lg" glow="purple">
          {/* Sparkle effect on card */}
          <div className="absolute top-4 right-4">
            <motion.div
              animate={{ rotate: [0, 180, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-5 h-5 text-purple-400/50" />
            </motion.div>
          </div>

          {/* Logo Section */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <motion.div 
              className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-purple-500/30"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <LayoutDashboard className="w-10 h-10 text-text-primary" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              FRZ Platform
            </h1>
            <p className="mt-2 text-text-secondary">
              Bem-vindo! Faca login para continuar.
            </p>
          </motion.div>

          {/* Error Message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-6"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username/Email Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                Usuario ou Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className={`w-5 h-5 transition-colors ${focused === 'email' ? 'text-purple-400' : 'text-text-muted'}`} />
                </div>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  required
                  className="w-full pl-12 pr-4 py-3 bg-surface/50 border border-border/50 rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                  placeholder="admin"
                />
              </div>
            </motion.div>

            {/* Senha Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className={`w-5 h-5 transition-colors ${focused === 'password' ? 'text-purple-400' : 'text-text-muted'}`} />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setSenha(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  required
                  className="w-full pl-12 pr-4 py-3 bg-surface/50 border border-border/50 rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="pt-2"
            >
              <PremiumButton
                type="submit"
                variant="gradient"
                size="lg"
                loading={loading}
                glow
                icon={<ArrowRight className="w-5 h-5" />}
                iconPosition="right"
                className="w-full"
                disabled={loading || !hydrated}
              >
                {loading ? "Entrando..." : "Entrar na Plataforma"}
              </PremiumButton>
            </motion.div>
          </form>

          {/* Footer */}
          <motion.div 
            className="mt-8 pt-6 border-t border-border/50 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-sm text-text-muted">
              Nao tem uma conta?{" "}
              <span className="text-purple-400 hover:text-purple-300 cursor-pointer transition-colors">
                Contate o administrador
              </span>
            </p>
          </motion.div>
        </GlassCard>

        {/* Brand footer */}
        <motion.p 
          className="text-center text-xs text-text-muted mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          FRZ Platform &copy; 2026 FRZ Group
        </motion.p>
      </motion.div>
    </main>
  );
}
