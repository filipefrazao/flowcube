"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Check, X } from 'lucide-react';
import { useAIStream } from '@/hooks/useAIStream';

interface AINodeBuilderProps {
  onNodeGenerated?: (node: any) => void;
  workflowContext?: any[];
}

export function AINodeBuilder({ onNodeGenerated, workflowContext }: AINodeBuilderProps) {
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const { stream, isStreaming, error } = useAIStream();

  const handleGenerate = async () => {
    const result = await stream('/api/v1/ai/generate-node-stream/', {
      description,
      context: workflowContext
    });
    
    if (result) {
      try {
        const node = JSON.parse(result);
        setPreview(node);
      } catch (e) {
        console.error('Failed to parse AI response:', e);
      }
    }
  };

  const handleAccept = () => {
    if (preview) {
      onNodeGenerated?.(preview);
      setPreview(null);
      setDescription('');
    }
  };

  return (
    <div className="glass-card p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-4">
        <Brain className="w-6 h-6 text-purple-400" />
        <h3 className="text-xl font-semibold text-white">AI Node Builder</h3>
      </div>

      {/* Input */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">
          Describe the node you want to create:
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="E.g., Send a WhatsApp message when a form is submitted..."
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-purple-500 outline-none"
          rows={3}
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!description || isStreaming}
        className="button-premium w-full mb-4 flex items-center justify-center gap-2"
      >
        {isStreaming ? (
          <>
            <Sparkles className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Node
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-white/5 border border-purple-500/30 rounded-lg"
        >
          <h4 className="text-sm font-semibold text-purple-400 mb-2">Preview:</h4>
          <div className="mb-3">
            <p className="text-white font-medium">{preview.label}</p>
            <p className="text-sm text-gray-400">{preview.description}</p>
            <p className="text-xs text-gray-500 mt-1">Type: {preview.type}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              Add to Workflow
            </button>
            <button
              onClick={() => setPreview(null)}
              className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <X className="w-4 h-4" />
              Discard
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
