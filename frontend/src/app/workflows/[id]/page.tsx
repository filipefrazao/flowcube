"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import WorkflowEditor to avoid SSR issues
const WorkflowEditor = dynamic(
  () => import("@/components/workflow/WorkflowEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    ),
  }
);

export default function WorkflowEditorPage() {
  const params = useParams();
  const workflowId = params.id as string;

  return (
    <div className="h-screen w-screen">
      <WorkflowEditor workflowId={workflowId} />
    </div>
  );
}
