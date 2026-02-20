/**
 * FlowCube - Token Usage Display Component
 * Displays token usage statistics for AI agent conversations
 */
"use client";

import { motion } from "framer-motion";
import { Zap, ArrowDown, ArrowUp, Activity, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TokenUsageBreakdown } from "@/types/aiAgents.types";

interface TokenUsageDisplayProps {
  usage: TokenUsageBreakdown | null;
  className?: string;
  compact?: boolean;
  showCost?: boolean;
  costPerInputToken?: number;
  costPerOutputToken?: number;
}

export default function TokenUsageDisplay({
  usage,
  className,
  compact = false,
  showCost = false,
  costPerInputToken = 0.00001,
  costPerOutputToken = 0.00003,
}: TokenUsageDisplayProps) {
  if (!usage) return null;

  const cost = showCost
    ? (usage.input_tokens * costPerInputToken) +
      (usage.output_tokens * costPerOutputToken)
    : 0;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-text-muted", className)}>
        <Zap className="h-3 w-3" />
        <span>{usage.total_tokens.toLocaleString()} tokens</span>
        {showCost && cost > 0 && (
          <span className="text-green-600">${cost.toFixed(4)}</span>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border border-border bg-background-secondary/50 p-3",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium text-text-secondary">Token Usage</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Input Tokens */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-100">
            <ArrowDown className="h-3 w-3 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Input</p>
            <p className="text-sm font-semibold text-text-primary">
              {usage.input_tokens.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Output Tokens */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-green-100">
            <ArrowUp className="h-3 w-3 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Output</p>
            <p className="text-sm font-semibold text-text-primary">
              {usage.output_tokens.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Total Tokens */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-purple-100">
            <Zap className="h-3 w-3 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Total</p>
            <p className="text-sm font-semibold text-text-primary">
              {usage.total_tokens.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Thinking Tokens (if available) */}
      {usage.thinking_tokens && usage.thinking_tokens > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="text-purple-500">🧠</span>
            <span>Thinking: {usage.thinking_tokens.toLocaleString()} tokens</span>
          </div>
        </div>
      )}

      {/* Cost Display */}
      {showCost && cost > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <DollarSign className="h-3 w-3 text-green-600" />
            <span className="text-xs text-text-muted">
              Estimated cost: <span className="font-semibold text-green-600">${cost.toFixed(4)}</span>
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
