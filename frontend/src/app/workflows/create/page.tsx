"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  GitBranch,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { workflowApi } from "@/lib/api";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { GlassCard, PremiumButton } from "@/components/ui/premium";
import { GradientBlobs } from "@/components/effects";

// ============================================================================
// Validation Schema
// ============================================================================

const workflowSchema = z.object({
  name: z
    .string()
    .min(3, "Workflow name must be at least 3 characters")
    .max(100, "Workflow name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  tags: z.string().optional(),
});

type WorkflowFormData = z.infer<typeof workflowSchema>;

// ============================================================================
// Component
// ============================================================================

export default function NewWorkflowPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowSchema),
  });

  const onSubmit = async (data: WorkflowFormData) => {
    setError(null);
    setLoading(true);

    try {
      // Parse tags from comma-separated string to array
      const tags = data.tags
        ? data.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
        : [];

      const payload = {
        name: data.name,
        description: data.description || "",
        tags,
      };

      const workflow = await workflowApi.createWorkflow(payload);

      // Redirect to workflow editor
      router.push(`/workflows/${workflow.id}`);
    } catch (err: any) {
      console.error("Failed to create workflow:", err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.name?.[0] ||
          "Failed to create workflow. Please try again."
      );
    } finally {
      setLoading(false);
    }
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
            className="flex items-center gap-4"
          >
            <button
              onClick={() => router.push("/workflows")}
              className="p-2 hover:bg-surface rounded-lg transition-colors text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">
                Create New Workflow
              </h1>
              <p className="text-sm text-text-muted">
                Build your automation workflow
              </p>
            </div>
          </motion.div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 z-10 flex items-start justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-2xl mt-8"
          >
            <GlassCard glow="purple" padding="lg">
              {/* Card Header */}
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border/50">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <GitBranch className="w-6 h-6 text-text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    Workflow Details
                  </h2>
                  <p className="text-sm text-text-muted">
                    Name your workflow and add a description
                  </p>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Workflow Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-text-secondary mb-2"
                  >
                    Workflow Name <span className="text-error">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    {...register("name")}
                    placeholder="e.g., Lead Qualification Flow"
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  {errors.name && (
                    <p className="mt-1.5 text-sm text-error flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-text-secondary mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    {...register("description")}
                    rows={4}
                    placeholder="Describe what this workflow does..."
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                  {errors.description && (
                    <p className="mt-1.5 text-sm text-error flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.description.message}
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label
                    htmlFor="tags"
                    className="block text-sm font-medium text-text-secondary mb-2"
                  >
                    Tags
                  </label>
                  <input
                    id="tags"
                    type="text"
                    {...register("tags")}
                    placeholder="lead, qualification, whatsapp (comma-separated)"
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <p className="mt-1.5 text-xs text-text-muted">
                    Separate tags with commas
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => router.push("/workflows")}
                    disabled={loading}
                    className="px-6 py-2.5 bg-surface hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-text-secondary font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <PremiumButton
                    type="submit"
                    variant="gradient"
                    size="md"
                    icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    disabled={loading || !hydrated}
                    glow
                  >
                    {loading ? "Creating..." : "Create Workflow"}
                  </PremiumButton>
                </div>
              </form>
            </GlassCard>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-6 p-4 bg-surface/50 border border-border/50 rounded-lg"
            >
              <h3 className="text-sm font-medium text-text-primary mb-2">
                What happens next?
              </h3>
              <ul className="space-y-2 text-sm text-text-muted">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>
                    Your workflow will be created as a <strong>draft</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>
                    You'll be redirected to the <strong>visual editor</strong> to build your flow
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>
                    Add blocks, connect them, and <strong>publish</strong> when ready
                  </span>
                </li>
              </ul>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
