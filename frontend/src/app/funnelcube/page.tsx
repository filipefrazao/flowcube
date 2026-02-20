'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Plus,
  Loader2,
  Globe,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { GradientBlobs } from '@/components/effects';
import { PremiumButton, GlassCard } from '@/components/ui/premium';
import { funnelcubeApi, type FunnelProject } from '@/lib/funnelcubeApi';

export default function FunnelCubePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<FunnelProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const list = await funnelcubeApi.listProjects();
      setProjects(list);
      // Auto-redirect if only one project
      if (list.length === 1) {
        router.push(`/funnelcube/${list[0].id}`);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function createProject() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const project = await funnelcubeApi.createProject({
        name: newName,
        domain: newDomain || undefined,
      });
      router.push(`/funnelcube/${project.id}`);
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          <GradientBlobs />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 z-10"
          >
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="text-text-secondary text-sm">Loading projects...</span>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <GradientBlobs className="opacity-30" />

        {/* Header */}
        <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              FunnelCube Analytics
            </h1>
            <p className="text-sm text-text-muted">Product analytics for your apps</p>
          </motion.div>
          <PremiumButton
            variant="gradient"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            glow
            onClick={() => setShowCreate(true)}
          >
            New Project
          </PremiumButton>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 z-10">
          {/* Create Project Form */}
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <GlassCard hover={false} padding="sm">
                <div className="p-4 space-y-3">
                  <h3 className="text-sm font-medium text-text-primary">Create New Project</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Project name"
                      className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="text"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="Domain (optional, e.g. myapp.com)"
                      className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={createProject}
                      disabled={creating || !newName.trim()}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-text-primary text-sm rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {creating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Create'
                      )}
                    </button>
                    <button
                      onClick={() => setShowCreate(false)}
                      className="px-4 py-2 bg-surface-hover hover:bg-surface-hover text-text-primary text-sm rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Project List */}
          {projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <BarChart3 className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h2 className="text-lg font-medium text-text-primary mb-2">No projects yet</h2>
              <p className="text-text-muted text-sm mb-6">
                Create your first analytics project to start tracking events
              </p>
              <PremiumButton
                variant="gradient"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowCreate(true)}
              >
                Create Project
              </PremiumButton>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project, i) => (
                <ProjectCard key={project.id} project={project} delay={i * 0.05} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ProjectCard({ project, delay }: { project: FunnelProject; delay: number }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(project.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2 }}
      onClick={() => router.push(`/funnelcube/${project.id}`)}
      className="cursor-pointer"
    >
      <GlassCard padding="sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-text-primary" />
            </div>
            <div
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                project.is_active
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-surface-hover/50 text-text-secondary'
              }`}
            >
              {project.is_active ? 'Active' : 'Paused'}
            </div>
          </div>

          <h3 className="text-text-primary font-medium mb-1">{project.name}</h3>

          {project.domain && (
            <div className="flex items-center gap-1.5 text-text-muted text-xs mb-3">
              <Globe className="w-3 h-3" />
              {project.domain}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyId();
              }}
              className="text-text-muted hover:text-text-primary text-xs flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy ID'}
            </button>
            <ArrowRight className="w-4 h-4 text-purple-400" />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
