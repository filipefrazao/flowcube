"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { LayoutDashboard, ArrowRight, Zap, Workflow, BarChart3, Sparkles } from "lucide-react";
import { GlassCard, PremiumButton } from "@/components/ui/premium";
import { GradientBlobs, AuroraBackground } from "@/components/effects";

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    setIsAuthenticated(!!token);
    if (token) {
      router.push("/workflows");
    }
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 border-2 border-purple-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  const features = [
    {
      icon: Workflow,
      title: "Workflow Builder",
      description: "Editor visual de workflows com drag & drop e preview em tempo real",
      color: "text-purple-400",
    },
    {
      icon: Zap,
      title: "IA Integrada",
      description: "Integracoes com OpenAI, Claude e DeepSeek nativas",
      color: "text-cyan-400",
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "Acompanhe conversoes, funil e receita em tempo real",
      color: "text-pink-400",
    },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-gray-950 relative overflow-hidden">
      {/* Background Effects */}
      <AuroraBackground className="opacity-30" />
      <GradientBlobs className="opacity-50" />
      
      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="max-w-4xl w-full z-10 space-y-12">
        {/* Hero Section */}
        <motion.div 
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <motion.div 
            className="flex justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="relative">
              <motion.div 
                className="w-24 h-24 bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/30"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <LayoutDashboard className="w-12 h-12 text-white" />
              </motion.div>
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ rotate: [0, 180, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-6 h-6 text-purple-400" />
              </motion.div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1 
            className="text-6xl md:text-7xl font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              FRZ Platform
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Plataforma unificada de CRM, Workflows, WhatsApp, Analytics e muito mais.
            Automatize vendas, suporte e marketing com inteligencia artificial.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link href="/login">
              <PremiumButton
                variant="gradient"
                size="lg"
                glow
                icon={<ArrowRight className="w-5 h-5" />}
                iconPosition="right"
              >
                Comecar
              </PremiumButton>
            </Link>
            <Link href="/login">
              <PremiumButton
                variant="outline"
                size="lg"
              >
                Ver Demo
              </PremiumButton>
            </Link>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
            >
              <GlassCard className="h-full text-center" padding="lg" glow="purple">
                <div className="flex flex-col items-center gap-4">
                  <div className={`p-4 rounded-2xl bg-gray-800/50 ${feature.color}`}>
                    <feature.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.p 
          className="text-center text-sm text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          FRZ Platform &copy; 2026 FRZ Group. Todos os direitos reservados.
        </motion.p>
      </div>
    </main>
  );
}
