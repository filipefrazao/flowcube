import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorHighlightProps {
  nodeId: string;
  error: string;
  onDebug?: () => void;
}

export function ErrorHighlight({ nodeId, error, onDebug }: ErrorHighlightProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Highlight the error node in the canvas
    const node = document.querySelector(`[data-id="${nodeId}"]`);
    if (node) {
      node.classList.add('error-node');

      // Add pulsing animation
      node.classList.add('animate-pulse-error');

      // Scroll into view
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return () => {
      if (node) {
        node.classList.remove('error-node', 'animate-pulse-error');
      }
    };
  }, [nodeId]);

  if (!visible) return null;

  return (
    <>
      {/* Error badge on node */}
      <div className="absolute -top-2 -right-2 z-50">
        <div className="relative">
          <div className="absolute inset-0 bg-red-500 rounded-full blur-md animate-pulse"></div>
          <div className="relative bg-red-600 rounded-full p-1 border-2 border-red-400">
            <AlertCircle className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Error tooltip */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 min-w-[200px] max-w-[300px]">
        <div className="glass-card p-3 border-red-500/50 bg-red-500/10">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-300 font-medium">Execution Failed</p>
          </div>
          <p className="text-xs text-gray-300 mb-3 line-clamp-3">{error}</p>
          {onDebug && (
            <button
              onClick={onDebug}
              className="w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-all"
            >
              Debug with AI
            </button>
          )}
          <button
            onClick={() => setVisible(false)}
            className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-error {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
        }

        :global(.error-node) {
          border-color: rgb(239 68 68) !important;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.5) !important;
        }

        :global(.animate-pulse-error) {
          animation: pulse-error 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </>
  );
}
