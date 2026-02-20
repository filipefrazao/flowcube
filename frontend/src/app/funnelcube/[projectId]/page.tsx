'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Loader2,
  Code2,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { GradientBlobs } from '@/components/effects';
import { funnelcubeApi, type FunnelProject, type FunnelOverview } from '@/lib/funnelcubeApi';
import { TimeWindowPicker } from '@/components/funnelcube/shared/TimeWindowPicker';
import { OverviewMetrics } from '@/components/funnelcube/overview/OverviewMetrics';
import { OverviewChart } from '@/components/funnelcube/overview/OverviewChart';
import { OverviewTopPages } from '@/components/funnelcube/overview/OverviewTopPages';
import { OverviewTopEvents } from '@/components/funnelcube/overview/OverviewTopEvents';
import { OverviewTopSources } from '@/components/funnelcube/overview/OverviewTopSources';
import { OverviewDevices } from '@/components/funnelcube/overview/OverviewDevices';
import { OverviewGeo } from '@/components/funnelcube/overview/OverviewGeo';
import { FunnelChart } from '@/components/funnelcube/funnels/FunnelChart';
import { RetentionTable } from '@/components/funnelcube/retention/RetentionTable';
import { ConversionChart } from '@/components/funnelcube/conversion/ConversionChart';
import { FlowChart } from '@/components/funnelcube/flow/FlowChart';

type TabKey = 'overview' | 'funnel' | 'retention' | 'conversion' | 'flow';

export default function ProjectDashboardPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<FunnelProject | null>(null);
  const [overview, setOverview] = useState<FunnelOverview | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');
  const [showSnippet, setShowSnippet] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId, days]);

  async function loadData() {
    setLoading(true);
    try {
      const [proj, ov] = await Promise.all([
        funnelcubeApi.getProject(projectId),
        funnelcubeApi.getOverview(projectId, days),
      ]);
      setProject(proj);
      setOverview(ov);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const snippet = `<!-- FunnelCube Analytics -->
<script>
  (function(w,d,s){
    w.__fc={q:[]};
    w.FunnelCube={
      init:function(o){w.__fc.q.push(['init',o])},
      track:function(){w.__fc.q.push(['track'].concat([].slice.call(arguments)))},
      identify:function(){w.__fc.q.push(['identify'].concat([].slice.call(arguments)))}
    };
    var e=d.createElement(s);e.async=1;
    e.src='https://platform.frzgroup.com.br/fc.js';
    d.head.appendChild(e);
  })(window,document,'script');

  FunnelCube.init({
    clientId: '${project?.client_id || 'YOUR_CLIENT_ID'}',
    clientSecret: '${project?.client_secret || 'YOUR_CLIENT_SECRET'}',
    apiUrl: 'https://platform.frzgroup.com.br/api/v1/funnelcube'
  });

  // Custom events:
  // FunnelCube.track('signup', { plan: 'pro' });
  // FunnelCube.identify('user123', { email: 'user@email.com' });
</script>`;

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !overview) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          <GradientBlobs />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 z-10"
          >
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="text-text-secondary text-sm">Loading analytics...</span>
          </motion.div>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'funnel', label: 'Funnels' },
    { key: 'retention', label: 'Retention' },
    { key: 'conversion', label: 'Conversion' },
    { key: 'flow', label: 'User Flow' },
  ];

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <GradientBlobs className="opacity-20" />

        {/* Header */}
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm z-10">
          <div className="h-16 flex items-center justify-between px-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                {project?.name || 'Analytics'}
              </h1>
              {project?.domain && (
                <p className="text-sm text-text-muted">{project.domain}</p>
              )}
            </motion.div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSnippet(!showSnippet)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border rounded-lg text-sm text-text-primary transition-colors"
              >
                <Code2 className="w-3.5 h-3.5" />
                Setup
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSnippet ? 'rotate-180' : ''}`} />
              </button>
              <TimeWindowPicker value={days} onChange={setDays} />
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 px-6 pb-0">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                  tab === t.key
                    ? 'text-purple-400 border-purple-400 bg-purple-500/5'
                    : 'text-text-muted border-transparent hover:text-text-primary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        {/* SDK Snippet */}
        {showSnippet && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-border/50 bg-background-secondary/80 backdrop-blur-sm px-6 py-4 z-10"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary font-medium">Tracking Snippet</span>
              <button
                onClick={copySnippet}
                className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs text-text-secondary bg-black/40 rounded-lg p-3 overflow-x-auto font-mono">
              {snippet}
            </pre>
          </motion.div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 z-10 space-y-6">
          {tab === 'overview' && overview && (
            <>
              <OverviewMetrics data={overview} />
              <OverviewChart projectId={projectId} days={days} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <OverviewTopPages projectId={projectId} days={days} />
                <OverviewTopEvents projectId={projectId} days={days} />
                <OverviewTopSources projectId={projectId} days={days} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <OverviewDevices projectId={projectId} days={days} />
                <OverviewGeo projectId={projectId} days={days} />
              </div>
            </>
          )}

          {tab === 'funnel' && (
            <FunnelChart projectId={projectId} />
          )}

          {tab === 'retention' && (
            <RetentionTable projectId={projectId} days={days} />
          )}

          {tab === 'conversion' && (
            <ConversionChart projectId={projectId} days={days} />
          )}

          {tab === 'flow' && (
            <FlowChart projectId={projectId} days={days} />
          )}
        </main>
      </div>
    </div>
  );
}
