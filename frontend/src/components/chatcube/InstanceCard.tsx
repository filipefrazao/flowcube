"use client";

import Link from "next/link";
import { Smartphone, ArrowUpRight } from "lucide-react";
import type { WhatsAppInstance } from "@/types/chatcube.types";
import { InstanceStatusBadge } from "./InstanceStatusBadge";
import { cn } from "@/lib/utils";

interface InstanceCardProps {
  instance: WhatsAppInstance;
}

export function InstanceCard({ instance }: InstanceCardProps) {
  return (
    <Link href={`/chatcube/instances/${instance.id}`}>
      <div className="bg-surface border border-border rounded-lg p-4 hover:border-primary/30 transition-colors group cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center">
              {instance.profile_picture ? (
                <img
                  src={instance.profile_picture}
                  alt={instance.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <Smartphone className="w-5 h-5 text-accent-green" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-text-primary truncate">{instance.name}</h3>
              <p className="text-xs text-text-muted truncate">
                {instance.phone_number || "No phone connected"}
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Badges Row */}
        <div className="flex items-center gap-2 mb-3">
          <InstanceStatusBadge status={instance.status} />
          <span
            className={cn(
              "px-2 py-0.5 rounded text-xs font-medium",
              instance.engine === "cloud_api"
                ? "bg-accent-blue/10 text-accent-blue"
                : "bg-accent-purple/10 text-accent-purple"
            )}
          >
            {instance.engine === "cloud_api" ? "Cloud API" : "Baileys"}
          </span>
        </div>

        {/* Footer */}
        {instance.last_connected_at && (
          <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
            <span className="text-xs text-text-muted">
              Última conexão: {formatRelativeTime(instance.last_connected_at)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default InstanceCard;
