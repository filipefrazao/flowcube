'use client';

import { useEffect, useState } from 'react';
import { Monitor, Loader2 } from 'lucide-react';
import { funnelcubeApi, type TopItem } from '@/lib/funnelcubeApi';

interface Props {
  projectId: string;
  days: number;
}

interface DevicesData {
  browsers: TopItem[];
  os: TopItem[];
  devices: TopItem[];
}

const SECTION_COLORS: Record<string, { from: string; to: string }> = {
  browsers: { from: 'from-blue-500', to: 'to-sky-400' },
  os: { from: 'from-violet-500', to: 'to-purple-400' },
  devices: { from: 'from-teal-500', to: 'to-emerald-400' },
};

const SECTION_LABELS: Record<string, string> = {
  browsers: 'Browsers',
  os: 'Operating Systems',
  devices: 'Devices',
};

function getItemName(item: TopItem, section: string): string {
  if (section === 'browsers') return item.browser || item.name || 'Unknown';
  if (section === 'os') return item.os || item.name || 'Unknown';
  if (section === 'devices') return item.device || item.name || 'Unknown';
  return item.name || 'Unknown';
}

function DeviceSection({
  title,
  items,
  section,
}: {
  title: string;
  items: TopItem[];
  section: string;
}) {
  const maxCount = items.length > 0 ? items[0].count : 1;
  const colors = SECTION_COLORS[section];

  return (
    <div>
      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-gray-600">No data</p>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 6).map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm text-gray-300 truncate">
                    {getItemName(item, section)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2 shrink-0">
                    {item.count}
                  </span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${colors.from} ${colors.to} rounded-full transition-all`}
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OverviewDevices({ projectId, days }: Props) {
  const [data, setData] = useState<DevicesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    funnelcubeApi
      .getDevices(projectId, days)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [projectId, days]);

  return (
    <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Monitor className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-medium text-white">Devices</h3>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
        </div>
      ) : !data ? (
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
          No device data yet
        </div>
      ) : (
        <div className="space-y-5">
          {(['browsers', 'os', 'devices'] as const).map((section) => (
            <DeviceSection
              key={section}
              title={SECTION_LABELS[section]}
              items={data[section] || []}
              section={section}
            />
          ))}
        </div>
      )}
    </div>
  );
}
