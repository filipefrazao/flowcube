import React, { useState } from 'react';
import { Bug, Loader2, CheckCircle, AlertTriangle, Lightbulb, Code } from 'lucide-react';

interface Fix {
  description: string;
  code_changes?: any;
  confidence: 'high' | 'medium' | 'low';
}

interface Analysis {
  root_cause: string;
  fixes: Fix[];
  prevention_tips: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface WorkflowExecution {
  id: string;
  error_message: string;
  failed_node_id?: string;
  status: string;
}

interface AIDebugPanelProps {
  execution: WorkflowExecution;
  workflowId: string;
  onFixApplied?: () => void;
  onClose?: () => void;
}

export function AIDebugPanel({ execution, workflowId, onFixApplied, onClose }: AIDebugPanelProps) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [applyingFix, setApplyingFix] = useState<number | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/ai/debug/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ execution_id: execution.id })
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        console.error('Failed to analyze:', data.error);
      }
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFix = async (fix: Fix, index: number) => {
    if (!fix.code_changes || !execution.failed_node_id) {
      return;
    }

    setApplyingFix(index);
    try {
      const response = await fetch('/api/v1/ai/apply-fix/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          node_id: execution.failed_node_id,
          workflow_id: workflowId,
          fix_config: fix.code_changes
        })
      });

      const data = await response.json();

      if (data.success) {
        onFixApplied?.();
      } else {
        console.error('Failed to apply fix:', data.error);
      }
    } catch (error) {
      console.error('Error applying fix:', error);
    } finally {
      setApplyingFix(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400 border-red-500/30 bg-red-500/10';
      case 'high':
        return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
      case 'medium':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      case 'low':
        return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      default:
        return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-red-500/20 text-red-400 border-red-500/30'
    };

    return colors[confidence as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bug className="w-6 h-6 text-red-400" />
              <h3 className="text-xl font-semibold text-white">AI Debugging Assistant</h3>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Error Summary */}
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <h4 className="text-red-400 font-medium mb-1">Error Message</h4>
                <p className="text-gray-300">{execution.error_message}</p>
                {execution.failed_node_id && (
                  <p className="text-sm text-gray-400 mt-2">
                    Failed at node: <code className="text-red-400">{execution.failed_node_id}</code>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Analyze Button */}
          {!analysis && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Bug className="w-5 h-5" />
                  Analyze Error
                </>
              )}
            </button>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-6">
              {/* Severity Badge */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">Severity:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(analysis.severity)}`}>
                  {analysis.severity.toUpperCase()}
                </span>
              </div>

              {/* Root Cause */}
              <div className="glass-card p-4">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  Root Cause
                </h4>
                <p className="text-gray-300 leading-relaxed">{analysis.root_cause}</p>
              </div>

              {/* Suggested Fixes */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Suggested Fixes
                </h4>
                <div className="space-y-3">
                  {analysis.fixes.map((fix, index) => (
                    <div key={index} className="glass-card p-4 hover:border-purple-500/30 transition-all">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getConfidenceBadge(fix.confidence)}`}>
                              {fix.confidence} confidence
                            </span>
                          </div>
                          <p className="text-gray-300">{fix.description}</p>
                        </div>
                        {fix.code_changes && (
                          <button
                            onClick={() => handleApplyFix(fix, index)}
                            disabled={applyingFix !== null}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                          >
                            {applyingFix === index ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Applying...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Apply Fix
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      {fix.code_changes && (
                        <div className="mt-3 p-3 bg-black/30 rounded border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <Code className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-gray-400">Configuration Changes</span>
                          </div>
                          <pre className="text-xs text-gray-300 overflow-x-auto">
                            {JSON.stringify(fix.code_changes, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Prevention Tips */}
              {analysis.prevention_tips.length > 0 && (
                <div className="glass-card p-4">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    Prevention Tips
                  </h4>
                  <ul className="space-y-2">
                    {analysis.prevention_tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-3 text-gray-300">
                        <span className="text-yellow-400 mt-1">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Re-analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Re-analyzing...
                  </>
                ) : (
                  'Re-analyze'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
