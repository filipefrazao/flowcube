"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Lock, Bell, Save, X } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { GlassCard } from "@/components/ui/premium";
import { GradientBlobs } from "@/components/effects";

export default function ProfilePage() {
  const [user, setUser] = useState({
    username: "admin",
    email: "admin@flowcube.com",
    firstName: "",
    lastName: "",
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [notifications, setNotifications] = useState({
    emailOnFailure: false,
    achievements: true,
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    // TODO: Implementar chamada API
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Effects */}
        <GradientBlobs className="opacity-30" />

        {/* Header */}
        <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-xl font-semibold text-text-primary">Perfil do Usuário</h1>
            <p className="text-sm text-text-muted">Gerencie suas informações pessoais</p>
          </motion.div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 z-10">
          <div className="max-w-4xl mx-auto">
            {/* Success Message */}
            {saved && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Perfil atualizado com sucesso!
              </motion.div>
            )}

            {/* Profile Avatar and Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <GlassCard hover={false} padding="lg">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold">
                    {user.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{user.username}</h2>
                    <p className="text-gray-400">{user.email}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Basic Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-6"
            >
              <GlassCard hover={false} glow="purple" padding="lg">
                <div className="flex items-center gap-2 mb-6">
                  <User className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Informações Básicas</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Nome</label>
                      <input
                        type="text"
                        value={user.firstName}
                        onChange={(e) => setUser({ ...user, firstName: e.target.value })}
                        placeholder="Seu nome"
                        className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Sobrenome</label>
                      <input
                        type="text"
                        value={user.lastName}
                        onChange={(e) => setUser({ ...user, lastName: e.target.value })}
                        placeholder="Seu sobrenome"
                        className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                    <input
                      type="text"
                      value={user.username}
                      disabled
                      className="w-full px-4 py-2 bg-gray-800/30 border border-gray-700/50 rounded-lg text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      onChange={(e) => setUser({ ...user, email: e.target.value })}
                      placeholder="seu@email.com"
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Security */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mb-6"
            >
              <GlassCard hover={false} glow="cyan" padding="lg">
                <div className="flex items-center gap-2 mb-6">
                  <Lock className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-white">Segurança</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Senha Atual</label>
                    <input
                      type="password"
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Nova Senha</label>
                    <input
                      type="password"
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Confirmar Nova Senha</label>
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="mb-6"
            >
              <GlassCard hover={false} glow="green" padding="lg">
                <div className="flex items-center gap-2 mb-6">
                  <Bell className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">Notificações</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                    <div>
                      <p className="font-medium text-white">Email sobre execuções</p>
                      <p className="text-sm text-gray-400">Receba emails quando workflows falharem</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, emailOnFailure: !notifications.emailOnFailure })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notifications.emailOnFailure ? "bg-green-500" : "bg-gray-700"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          notifications.emailOnFailure ? "translate-x-6" : ""
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                    <div>
                      <p className="font-medium text-white">Notificações de achievements</p>
                      <p className="text-sm text-gray-400">Seja notificado ao desbloquear conquistas</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, achievements: !notifications.achievements })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notifications.achievements ? "bg-green-500" : "bg-gray-700"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          notifications.achievements ? "translate-x-6" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="flex justify-end gap-4"
            >
              <button
                className="px-6 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg hover:from-purple-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? "Salvando..." : "Salvar Alterações"}
              </button>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
