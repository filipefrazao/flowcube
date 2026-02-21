"use client";

import { cn } from "@/lib/utils";

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-surface-hover", className)} />
  );
}

export function ConversationListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-border/30">
          <SkeletonPulse className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <SkeletonPulse className="h-3.5 w-28" />
              <SkeletonPulse className="h-2.5 w-10" />
            </div>
            <SkeletonPulse className="h-2.5 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3 px-4 py-4 max-w-3xl mx-auto">
      {Array.from({ length: count }).map((_, i) => {
        const isOutbound = i % 3 === 0;
        return (
          <div key={i} className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
            <div className={cn("space-y-1.5", isOutbound ? "items-end" : "items-start")}>
              <SkeletonPulse
                className={cn(
                  "rounded-2xl",
                  isOutbound ? "h-10 w-48" : "h-14 w-56"
                )}
              />
              <SkeletonPulse className="h-2 w-12" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChatHeaderSkeleton() {
  return (
    <div className="h-14 flex items-center gap-3 px-4 border-b border-border">
      <SkeletonPulse className="w-9 h-9 rounded-full" />
      <div className="space-y-1.5">
        <SkeletonPulse className="h-3.5 w-32" />
        <SkeletonPulse className="h-2.5 w-24" />
      </div>
    </div>
  );
}

export default { ConversationListSkeleton, MessageListSkeleton, ChatHeaderSkeleton };
