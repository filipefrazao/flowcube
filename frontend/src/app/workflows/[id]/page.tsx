"use client";

import { useParams } from "next/navigation";
import WorkflowEditor from "@/components/workflow/WorkflowEditor";

export default function WorkflowEditorPage() {
  const params = useParams();
  const workflowId = params.id as string;

  return (
    <div className="h-screen w-screen">
      <WorkflowEditor workflowId={workflowId} />
    </div>
  );
}
