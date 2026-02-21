"use client";

import { useState, useMemo } from "react";
import { useExecutionStore, NodeLog } from "@/stores/executionStore";
import { X, Table, Code, FileJson, ArrowRight, ArrowLeft, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataInspectorProps {
  nodeId: string;
  onClose: () => void;
}

type ViewMode = "table" | "json" | "schema";
type DataTab = "input" | "output";

function JSONView({ data }: { data: any }) {
  return (
    <pre className="text-xs font-mono text-text-secondary p-3 overflow-auto max-h-[400px] bg-background rounded-lg border border-border">
      {JSON.stringify(data, null, 2) || "No data"}
    </pre>
  );
}

function TableView({ data }: { data: any }) {
  if (!data || typeof data !== "object") {
    return <p className="text-xs text-text-muted p-3">No data to display</p>;
  }

  const entries = Array.isArray(data) ? data : [data];
  if (entries.length === 0) {
    return <p className="text-xs text-text-muted p-3">Empty result</p>;
  }

  const keys = Array.from(
    new Set(entries.flatMap((item) => (typeof item === "object" && item ? Object.keys(item) : [])))
  );

  if (keys.length === 0) {
    return <JSONView data={data} />;
  }

  return (
    <div className="overflow-auto max-h-[400px]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-surface">
          <tr>
            {keys.map((key) => (
              <th
                key={key}
                className="px-3 py-2 text-left font-semibold text-text-muted border-b border-border"
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((item, i) => (
            <tr key={i} className="hover:bg-surface-hover">
              {keys.map((key) => (
                <td key={key} className="px-3 py-1.5 text-text-secondary border-b border-border/30">
                  {typeof item?.[key] === "object"
                    ? JSON.stringify(item[key])
                    : String(item?.[key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SchemaView({ data }: { data: any }) {
  function getType(val: any): string {
    if (val === null || val === undefined) return "null";
    if (Array.isArray(val)) return `array[${val.length}]`;
    return typeof val;
  }

  function renderSchema(obj: any, depth = 0): JSX.Element[] {
    if (!obj || typeof obj !== "object") {
      return [
        <div key="root" className="px-3 py-1 text-xs text-text-muted">
          {getType(obj)}: {String(obj)}
        </div>,
      ];
    }

    const entries = Object.entries(obj);
    return entries.map(([key, val]) => (
      <div
        key={key}
        className="flex items-center gap-2 px-3 py-1 hover:bg-surface-hover text-xs"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="font-medium text-text-primary">{key}</span>
        <span className="text-text-muted">:</span>
        <span className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-mono",
          getType(val) === "string" ? "bg-green-500/10 text-green-400" :
          getType(val) === "number" ? "bg-blue-500/10 text-blue-400" :
          getType(val) === "boolean" ? "bg-yellow-500/10 text-yellow-400" :
          "bg-gray-500/10 text-gray-400"
        )}>
          {getType(val)}
        </span>
      </div>
    ));
  }

  return (
    <div className="overflow-auto max-h-[400px] py-1">{renderSchema(data)}</div>
  );
}

export function DataInspector({ nodeId, onClose }: DataInspectorProps) {
  const [view, setView] = useState<ViewMode>("table");
  const [tab, setTab] = useState<DataTab>("output");

  const nodeLogs = useExecutionStore((s) =>
    s.nodeLogs.filter((l) => l.node_id === nodeId)
  );
  const lastLog = nodeLogs[nodeLogs.length - 1];

  // In the future, input/output data will come from the execution store
  // For now, we show the log metadata
  const data = useMemo(() => {
    if (!lastLog) return null;
    return {
      node_id: lastLog.node_id,
      node_type: lastLog.node_type,
      status: lastLog.status,
      duration_ms: lastLog.duration_ms,
      error: lastLog.error,
      timestamp: lastLog.timestamp,
    };
  }, [lastLog]);

  return (
    <div className="w-[380px] border-l border-border bg-surface flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileJson className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Data Inspector</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded">
          <X className="w-4 h-4 text-text-muted" />
        </button>
      </div>

      {/* Node info */}
      {lastLog && (
        <div className="px-4 py-2 border-b border-border/50 flex items-center gap-3 text-xs">
          <span className={cn(
            "w-2 h-2 rounded-full",
            lastLog.status === "success" ? "bg-green-500" :
            lastLog.status === "error" ? "bg-red-500" :
            lastLog.status === "running" ? "bg-blue-500 animate-pulse" :
            "bg-gray-500"
          )} />
          <span className="text-text-primary font-medium">{lastLog.node_label || lastLog.node_type}</span>
          {lastLog.duration_ms && (
            <span className="text-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3" /> {lastLog.duration_ms}ms
            </span>
          )}
          {lastLog.error && (
            <span className="text-red-400 flex items-center gap-1 truncate">
              <AlertCircle className="w-3 h-3" /> {lastLog.error}
            </span>
          )}
        </div>
      )}

      {/* Tabs: Input / Output */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab("input")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
            tab === "input"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-text-secondary"
          )}
        >
          <ArrowRight className="w-3 h-3" /> Input
        </button>
        <button
          onClick={() => setTab("output")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
            tab === "output"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-text-secondary"
          )}
        >
          <ArrowLeft className="w-3 h-3" /> Output
        </button>
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 px-4 py-2 border-b border-border/50">
        {([
          { mode: "table" as ViewMode, icon: Table, label: "Table" },
          { mode: "json" as ViewMode, icon: Code, label: "JSON" },
          { mode: "schema" as ViewMode, icon: FileJson, label: "Schema" },
        ]).map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => setView(mode)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors",
              view === mode
                ? "bg-primary/15 text-primary"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
            )}
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!data ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-xs text-text-muted">
              Execute the workflow to see data here.
            </p>
          </div>
        ) : view === "table" ? (
          <TableView data={data} />
        ) : view === "json" ? (
          <JSONView data={data} />
        ) : (
          <SchemaView data={data} />
        )}
      </div>
    </div>
  );
}

export default DataInspector;
