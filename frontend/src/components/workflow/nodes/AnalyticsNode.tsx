/**
 * FlowCube 3.0 - Analytics Node
 *
 * Custom React Flow node with Funnellytics-style metrics display
 * Shows views, conversions, and conversion rate badges
 */
import { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '../../../lib/utils';
import {
  Globe,
  Target,
  Mail,
  ShoppingCart,
  FileText,
  Zap,
  MessageSquare,
  Users,
  MousePointer,
  Download,
  Video,
  Clock,
  GitBranch,
  Tag,
  Webhook,
  Calendar,
  Bot,
  Brain,
  Sparkles
} from 'lucide-react';

// Icon mapping for node types
const nodeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  // Traffic Sources
  google_organic: Globe,
  google_ads: Target,
  facebook_ads: Target,
  instagram_ads: Target,
  direct: Users,
  email_campaign: Mail,
  referral: Users,

  // Pages
  landing_page: FileText,
  sales_page: FileText,
  product_page: ShoppingCart,
  checkout: ShoppingCart,
  thank_you: Sparkles,
  blog_post: FileText,

  // Actions
  button_click: MousePointer,
  form_submit: FileText,
  purchase: ShoppingCart,
  sign_up: Users,
  add_to_cart: ShoppingCart,
  download: Download,
  video_view: Video,
  custom_event: Zap,

  // Tools
  email_sequence: Mail,
  tag_segment: Tag,
  webhook: Webhook,
  decision_tree: GitBranch,
  wait: Clock,
  condition: GitBranch,
  set_variable: Tag,

  // Triggers
  whatsapp_trigger: MessageSquare,
  schedule: Calendar,

  // AI
  openai: Bot,
  claude: Brain,
  deepseek: Brain,

  // Inputs
  text_input: FileText,
  email_input: Mail,
  phone_input: MessageSquare,
  choice: GitBranch,

  // Outputs
  text_response: MessageSquare,
  image_response: FileText,
  whatsapp_template: MessageSquare,
};

// Category colors based on UX research
const categoryColors: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  traffic: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-700',
    iconBg: 'bg-blue-100',
  },
  page: {
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    text: 'text-orange-700',
    iconBg: 'bg-orange-100',
  },
  action: {
    bg: 'bg-green-50',
    border: 'border-green-300',
    text: 'text-green-700',
    iconBg: 'bg-green-100',
  },
  tool: {
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    text: 'text-purple-700',
    iconBg: 'bg-purple-100',
  },
  ai: {
    bg: 'bg-pink-50',
    border: 'border-pink-300',
    text: 'text-pink-700',
    iconBg: 'bg-pink-100',
  },
  trigger: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-700',
    iconBg: 'bg-yellow-100',
  },
};

// Map node type to category
function getCategory(nodeType: string): string {
  if (['google_organic', 'google_ads', 'facebook_ads', 'instagram_ads', 'direct', 'email_campaign', 'referral'].includes(nodeType)) {
    return 'traffic';
  }
  if (['landing_page', 'sales_page', 'product_page', 'checkout', 'thank_you', 'blog_post'].includes(nodeType)) {
    return 'page';
  }
  if (['button_click', 'form_submit', 'purchase', 'sign_up', 'add_to_cart', 'download', 'video_view', 'custom_event'].includes(nodeType)) {
    return 'action';
  }
  if (['email_sequence', 'tag_segment', 'webhook', 'decision_tree', 'wait', 'condition', 'set_variable'].includes(nodeType)) {
    return 'tool';
  }
  if (['openai', 'claude', 'deepseek'].includes(nodeType)) {
    return 'ai';
  }
  if (['whatsapp_trigger', 'schedule'].includes(nodeType)) {
    return 'trigger';
  }
  return 'tool';
}

// Conversion rate color based on performance
function getConversionColor(rate: number): string {
  if (rate >= 20) return 'bg-green-100 text-green-800';
  if (rate >= 10) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

export interface AnalyticsNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  config?: Record<string, unknown>;
  stats?: {
    views: number;
    conversions: number;
    conversionRate: number;
    dropOffRate: number;
    avgTimeMs?: number;
    revenue?: number;
  };
  status?: 'active' | 'paused' | 'error' | 'draft';
}

interface AnalyticsNodeProps {
  id: string;
  data: AnalyticsNodeData;
  selected?: boolean;
}

type OldAnalyticsNodeProps = {
  data: AnalyticsNodeData;
}

const AnalyticsNode = ({ data, selected, id }: AnalyticsNodeProps) => {
  const nodeType = data.type || 'custom_event';
  const category = getCategory(nodeType);
  const colors = categoryColors[category] || categoryColors.tool;
  const Icon = nodeIcons[nodeType] || Zap;

  // Memoize stats display for performance
  const statsDisplay = useMemo(() => {
    if (!data.stats) return null;

    const { views, conversions, conversionRate } = data.stats;
    return {
      views: formatNumber(views),
      conversions: formatNumber(conversions),
      rate: conversionRate.toFixed(1),
      rateColor: getConversionColor(conversionRate),
    };
  }, [data.stats]);

  // Status indicator
  const statusIndicator = useMemo(() => {
    switch (data.status) {
      case 'active':
        return <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />;
      case 'paused':
        return <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white" />;
      case 'error':
        return <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />;
      default:
        return <span className="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white" />;
    }
  }, [data.status]);

  return (
    <div
      className={cn(
        'relative rounded-lg shadow-md transition-all duration-200 min-w-[200px]',
        colors.bg,
        selected ? `ring-2 ring-blue-500 ${colors.border}` : colors.border,
        'border-2 hover:shadow-lg'
      )}
    >
      {/* Status indicator */}
      {statusIndicator}

      {/* Header with icon and label */}
      <div className="flex items-center gap-3 p-3 border-b border-gray-200/50">
        <div className={cn('p-2 rounded-lg', colors.iconBg)}>
          <Icon className={cn('w-5 h-5', colors.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn('font-semibold text-sm truncate', colors.text)}>
            {data.label || 'Untitled Node'}
          </div>
          <div className="text-xs text-gray-500 capitalize">
            {nodeType.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {/* Stats section (Funnellytics-style) */}
      {statsDisplay && (
        <div className="p-3 bg-white/50 space-y-2">
          {/* Views and Conversions */}
          <div className="flex justify-between text-xs">
            <div>
              <span className="text-gray-500">Views:</span>
              <span className="ml-1 font-mono font-medium">{statsDisplay.views}</span>
            </div>
            <div>
              <span className="text-gray-500">Conv:</span>
              <span className="ml-1 font-mono font-medium">{statsDisplay.conversions}</span>
            </div>
          </div>

          {/* Conversion Rate Badge */}
          <div className="flex items-center justify-center">
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-bold font-mono',
                statsDisplay.rateColor
              )}
            >
              {statsDisplay.rate}% conv
            </span>
          </div>

          {/* Revenue if available */}
          {data.stats?.revenue !== undefined && data.stats.revenue > 0 && (
            <div className="text-center text-xs text-gray-600">
              <span className="text-green-600 font-medium">
                ${formatNumber(data.stats.revenue)}
              </span>
              <span className="text-gray-400"> revenue</span>
            </div>
          )}
        </div>
      )}

      {/* No stats placeholder */}
      {!statsDisplay && (
        <div className="p-3 bg-white/50 text-center text-xs text-gray-400">
          No data yet
        </div>
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          'w-3 h-3 rounded-full border-2 border-white',
          colors.border.replace('border-', 'bg-').replace('300', '500')
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          'w-3 h-3 rounded-full border-2 border-white',
          colors.border.replace('border-', 'bg-').replace('300', '500')
        )}
      />
    </div>
  );
};

export default memo(AnalyticsNode);
