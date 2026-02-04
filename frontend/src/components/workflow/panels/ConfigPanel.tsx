'use client';

import React, { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import {
  X,
  Settings,
  Code,
  Variable,
  Zap,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { BlockType, Block, BLOCK_DEFINITIONS } from '@/types/workflow.types';

interface ConfigPanelProps {
  node: Node;
  onClose: () => void;
  onUpdate: (blockId: string, updates: Partial<Block>) => Promise<void>;
  onDelete?: (blockId: string) => Promise<void>;
}

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'json' | 'variable';
  options?: { value: string; label: string }[];
  placeholder?: string;
  description?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

// Field configurations per block type
const blockFieldConfigs: Record<BlockType, FieldConfig[]> = {
  // Triggers
  webhook: [
    { key: 'url', label: 'Webhook URL', type: 'text', description: 'Auto-generated URL for this webhook' },
    { key: 'method', label: 'HTTP Method', type: 'select', options: [
      { value: 'POST', label: 'POST' },
      { value: 'GET', label: 'GET' },
    ]},
    { key: 'headers', label: 'Expected Headers', type: 'json', placeholder: '{"Authorization": "Bearer ..."}' },
  ],
  whatsapp_trigger: [
    { key: 'phone_number', label: 'Phone Number', type: 'text', placeholder: '+5511999999999' },
    { key: 'keywords', label: 'Trigger Keywords', type: 'textarea', description: 'One keyword per line' },
  ],
  schedule: [
    { key: 'cron', label: 'Cron Expression', type: 'text', placeholder: '0 9 * * *' },
    { key: 'timezone', label: 'Timezone', type: 'select', options: [
      { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
      { value: 'America/New_York', label: 'New York (EST)' },
      { value: 'UTC', label: 'UTC' },
    ]},
  ],
  
  // Inputs
  text_input: [
    { key: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'Enter your message...' },
    { key: 'variable', label: 'Save to Variable', type: 'variable', placeholder: 'user_input' },
    { key: 'placeholder', label: 'Placeholder Text', type: 'text' },
  ],
  email_input: [
    { key: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'Please enter your email...' },
    { key: 'variable', label: 'Save to Variable', type: 'variable', placeholder: 'user_email' },
    { key: 'validation', label: 'Validate Email', type: 'boolean' },
  ],
  phone_input: [
    { key: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'Please enter your phone...' },
    { key: 'variable', label: 'Save to Variable', type: 'variable', placeholder: 'user_phone' },
    { key: 'country_code', label: 'Default Country', type: 'select', options: [
      { value: 'BR', label: 'Brazil (+55)' },
      { value: 'US', label: 'USA (+1)' },
    ]},
  ],
  choice: [
    { key: 'prompt', label: 'Prompt', type: 'textarea' },
    { key: 'options', label: 'Options (JSON array)', type: 'json', placeholder: '["Option 1", "Option 2"]' },
    { key: 'variable', label: 'Save to Variable', type: 'variable' },
    { key: 'multiple', label: 'Allow Multiple', type: 'boolean' },
  ],
  
  // AI
  openai: [
    { key: 'model', label: 'Model', type: 'select', options: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ]},
    { key: 'system_prompt', label: 'System Prompt', type: 'textarea', placeholder: 'You are a helpful assistant...' },
    { key: 'temperature', label: 'Temperature', type: 'number', min: 0, max: 2, step: 0.1 },
    { key: 'max_tokens', label: 'Max Tokens', type: 'number', min: 1, max: 4096 },
    { key: 'output_variable', label: 'Output Variable', type: 'variable', placeholder: 'ai_response' },
  ],
  claude: [
    { key: 'model', label: 'Model', type: 'select', options: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    ]},
    { key: 'system_prompt', label: 'System Prompt', type: 'textarea' },
    { key: 'temperature', label: 'Temperature', type: 'number', min: 0, max: 1, step: 0.1 },
    { key: 'max_tokens', label: 'Max Tokens', type: 'number', min: 1, max: 4096 },
    { key: 'output_variable', label: 'Output Variable', type: 'variable' },
  ],
  deepseek: [
    { key: 'model', label: 'Model', type: 'select', options: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-coder', label: 'DeepSeek Coder' },
    ]},
    { key: 'system_prompt', label: 'System Prompt', type: 'textarea' },
    { key: 'temperature', label: 'Temperature', type: 'number', min: 0, max: 2, step: 0.1 },
    { key: 'max_tokens', label: 'Max Tokens', type: 'number', min: 1, max: 4096 },
    { key: 'output_variable', label: 'Output Variable', type: 'variable' },
  ],
  
  // Logic
  condition: [
    { key: 'variable', label: 'Variable to Check', type: 'variable' },
    { key: 'operator', label: 'Operator', type: 'select', options: [
      { value: 'equals', label: 'Equals (==)' },
      { value: 'not_equals', label: 'Not Equals (!=)' },
      { value: 'contains', label: 'Contains' },
      { value: 'starts_with', label: 'Starts With' },
      { value: 'ends_with', label: 'Ends With' },
      { value: 'greater_than', label: 'Greater Than (>)' },
      { value: 'less_than', label: 'Less Than (<)' },
      { value: 'is_empty', label: 'Is Empty' },
      { value: 'is_not_empty', label: 'Is Not Empty' },
    ]},
    { key: 'value', label: 'Compare Value', type: 'text' },
  ],
  set_variable: [
    { key: 'variable', label: 'Variable Name', type: 'variable', required: true },
    { key: 'value', label: 'Value', type: 'textarea', placeholder: 'Static value or {{other_variable}}' },
    { key: 'expression', label: 'Expression', type: 'text', description: 'e.g. {{price}} * 1.1' },
  ],
  wait: [
    { key: 'duration', label: 'Duration', type: 'number', min: 1 },
    { key: 'unit', label: 'Unit', type: 'select', options: [
      { value: 'seconds', label: 'Seconds' },
      { value: 'minutes', label: 'Minutes' },
      { value: 'hours', label: 'Hours' },
      { value: 'days', label: 'Days' },
    ]},
  ],
  
  // Outputs
  text_response: [
    { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Hello {{user_name}}!' },
    { key: 'typing_delay', label: 'Typing Delay (ms)', type: 'number', min: 0, max: 5000 },
  ],
  image_response: [
    { key: 'image_url', label: 'Image URL', type: 'text', placeholder: 'https://...' },
    { key: 'caption', label: 'Caption', type: 'textarea' },
  ],
  whatsapp_template: [
    { key: 'template_name', label: 'Template Name', type: 'text', required: true },
    { key: 'language', label: 'Language', type: 'select', options: [
      { value: 'pt_BR', label: 'Portuguese (BR)' },
      { value: 'en_US', label: 'English (US)' },
      { value: 'es', label: 'Spanish' },
    ]},
    { key: 'header_params', label: 'Header Parameters', type: 'json' },
    { key: 'body_params', label: 'Body Parameters', type: 'json' },
  ],
};

export function ConfigPanel({ node, onClose, onUpdate, onDelete }: ConfigPanelProps) {
  const blockType = node.data.blockType as BlockType;
  const blockDef = BLOCK_DEFINITIONS.find(b => b.type === blockType);
  const fields = blockFieldConfigs[blockType] || [];
  
  const [name, setName] = useState<string>(String(node.data.label || ''));
  const [content, setContent] = useState<Record<string, any>>(node.data.content || {});
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['general', 'config']));

  useEffect(() => {
    setName(String(node.data.label || ''));
    setContent((node.data.content as Record<string, unknown>) || {});
  }, [node]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleFieldChange = (key: string, value: any) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(node.id, {
        name,
        content,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setName(String(node.data.label || ''));
    setContent((node.data.content as Record<string, unknown>) || {});
  };

  const renderField = (field: FieldConfig) => {
    const value = content[field.key] ?? '';

    switch (field.type) {
      case 'text':
      case 'variable':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 bg-background border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2 bg-background border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.key, parseFloat(e.target.value))}
            min={field.min}
            max={field.max}
            step={field.step}
            className="w-full px-3 py-2 bg-background border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 bg-background border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleFieldChange(field.key, e.target.checked)}
              className="w-4 h-4 rounded border-gray-700 bg-background text-primary focus:ring-primary focus:ring-offset-0"
            />
            <span className="text-sm text-gray-300">Enabled</span>
          </label>
        );

      case 'json':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleFieldChange(field.key, parsed);
              } catch {
                handleFieldChange(field.key, e.target.value);
              }
            }}
            placeholder={field.placeholder}
            rows={4}
            className="w-full px-3 py-2 bg-background border border-gray-700 rounded-lg text-sm text-gray-200 font-mono placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-80 bg-surface border-l border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-gray-200">Configure Block</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* General Section */}
        <div className="border-b border-gray-800">
          <button
            onClick={() => toggleSection('general')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-300">General</span>
            {expandedSections.has('general') ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.has('general') && (
            <div className="px-4 pb-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Block Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Block Type
                </label>
                <div className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-400">
                  {blockDef?.label || blockType}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Configuration Section */}
        <div className="border-b border-gray-800">
          <button
            onClick={() => toggleSection('config')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-300">Configuration</span>
            {expandedSections.has('config') ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.has('config') && (
            <div className="px-4 pb-4 space-y-4">
              {fields.map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {renderField(field)}
                  {field.description && (
                    <p className="mt-1 text-xs text-gray-500">{field.description}</p>
                  )}
                </div>
              ))}

              {fields.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No configuration options for this block type.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Advanced Section */}
        <div className="border-b border-gray-800">
          <button
            onClick={() => toggleSection('advanced')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-300">Advanced</span>
            {expandedSections.has('advanced') ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.has('advanced') && (
            <div className="px-4 pb-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Block ID
                </label>
                <div className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-xs text-gray-500 font-mono">
                  {node.id}
                </div>
              </div>
              
              {onDelete && (
                <button
                  onClick={() => onDelete(node.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Block
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 flex gap-2">
        <button
          onClick={handleReset}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default ConfigPanel;
