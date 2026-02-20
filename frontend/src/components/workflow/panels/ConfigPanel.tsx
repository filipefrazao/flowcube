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

interface MetaConnection {
  id: number;
  page_id: string;
  page_name: string;
}

interface MetaForm {
  id: number;
  form_id: string;
  form_name: string;
  distribution_mode: string;
  connection__page_id: string;
  connection__page_name: string;
  leads_count: number;
  linked_workflow_id?: string;
  linked_workflow_name?: string;
}

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
  
  // Facebook Lead Ads (Meta / SocialCube)
  facebook_lead_ads: [
    { key: 'page_id', label: 'Pagina Facebook', type: 'select', options: [], description: 'Pagina conectada via SocialCube Lead Ads' },
    { key: 'form_id', label: 'Formulario Lead Ads', type: 'select', options: [], description: 'Formulario de leads a ser monitorado' },
  ],

  // Dedup
  deduplicate: [
    { key: 'field', label: 'Dedup Field', type: 'select', options: [
      { value: 'phone', label: 'Phone' },
      { value: 'email', label: 'Email' },
      { value: 'leadgen_id', label: 'Leadgen ID' },
    ], description: 'Field to check for duplicates' },
    { key: 'ttl_hours', label: 'TTL (hours)', type: 'number', min: 1, max: 720, description: 'Dedup window in hours (default 24)' },
    { key: 'dedup_service_url', label: 'Dedup Service URL', type: 'text', placeholder: 'https://sc.frzgroup.com.br/dedup' },
  ],

  // Send to SalesCube
  send_to_salescube: [
    { key: 'name_field', label: 'Name Field', type: 'text', placeholder: '{{name}}', description: 'Template for lead name' },
    { key: 'phone_field', label: 'Phone Field', type: 'text', placeholder: '{{phone}}', description: 'Template for lead phone' },
    { key: 'email_field', label: 'Email Field', type: 'text', placeholder: '{{email}}', description: 'Template for lead email' },
    { key: 'channel', label: 'Channel ID', type: 'number', min: 1, description: 'SalesCube channel ID' },
    { key: 'column', label: 'Column ID', type: 'number', min: 1, description: 'SalesCube column/funnel stage ID' },
    { key: 'origin', label: 'Origin ID', type: 'number', min: 1, description: 'SalesCube lead origin ID' },
    { key: 'responsibles', label: 'Responsible IDs', type: 'json', placeholder: '[78, 92, 105]', description: 'Array of consultant user IDs' },
    { key: 'random_distribution', label: 'Random Distribution', type: 'boolean', description: 'Randomly pick one responsible from the list' },
    { key: 'tags', label: 'Tag IDs', type: 'json', placeholder: '[1, 2]', description: 'Tags to apply to the lead' },
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
  const [metaConnections, setMetaConnections] = useState<MetaConnection[]>([]);
  const [metaForms, setMetaForms] = useState<MetaForm[]>([]);

  // Fetch SocialCube Lead Ads connections/forms for facebook_lead_ads trigger
  useEffect(() => {
    const nodeType = node?.data?.type as string;
    if (nodeType !== 'facebook_lead_ads') return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    fetch(`${apiBase}/workflows/meta/connections/`, {
      headers: { Authorization: `Token ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setMetaConnections(data.connections || []);
        setMetaForms(data.forms || []);

        // Populate page_id select options dynamically
        const pageOpts = (data.connections || []).map((c: MetaConnection) => ({
          value: c.page_id,
          label: `${c.page_name} (${c.page_id})`,
        }));
        const formOpts = (data.forms || []).map((f: MetaForm) => ({
          value: f.form_id,
          label: `${f.form_name}${f.linked_workflow_name ? ' [' + f.linked_workflow_name + ']' : ''} (${f.leads_count} leads)`,
        }));

        // Update field configs dynamically
        if (blockFieldConfigs.facebook_lead_ads) {
          blockFieldConfigs.facebook_lead_ads = [
            { key: 'page_id', label: 'Pagina Facebook', type: 'select' as const, options: pageOpts, description: 'Pagina conectada via SocialCube Lead Ads' },
            { key: 'form_id', label: 'Formulario Lead Ads', type: 'select' as const, options: formOpts, description: 'Formulario de leads. Ao publicar, sera vinculado automaticamente.' },
          ];
        }
      })
      .catch(err => console.warn('Failed to fetch meta connections:', err));
  }, [node?.data?.type]);

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
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
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
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
              className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
            />
            <span className="text-sm text-text-primary">Enabled</span>
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
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary font-mono placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-80 bg-surface border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-text-primary">Configure Block</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-surface-hover transition-colors"
        >
          <X className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* General Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection('general')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-hover/50 transition-colors"
          >
            <span className="text-sm font-medium text-text-primary">General</span>
            {expandedSections.has('general') ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>
          
          {expandedSections.has('general') && (
            <div className="px-4 pb-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Block Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Block Type
                </label>
                <div className="px-3 py-2 bg-surface/50 border border-border rounded-lg text-sm text-text-secondary">
                  {blockDef?.label || blockType}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Configuration Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection('config')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-hover/50 transition-colors"
          >
            <span className="text-sm font-medium text-text-primary">Configuration</span>
            {expandedSections.has('config') ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>
          
          {expandedSections.has('config') && (
            <div className="px-4 pb-4 space-y-4">
              {fields.map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {renderField(field)}
                  {field.description && (
                    <p className="mt-1 text-xs text-text-muted">{field.description}</p>
                  )}
                </div>
              ))}

              {fields.length === 0 && (
                <p className="text-sm text-text-muted text-center py-4">
                  No configuration options for this block type.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Advanced Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection('advanced')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-hover/50 transition-colors"
          >
            <span className="text-sm font-medium text-text-primary">Advanced</span>
            {expandedSections.has('advanced') ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>
          
          {expandedSections.has('advanced') && (
            <div className="px-4 pb-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Block ID
                </label>
                <div className="px-3 py-2 bg-surface/50 border border-border rounded-lg text-xs text-text-muted font-mono">
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
      <div className="p-4 border-t border-border flex gap-2">
        <button
          onClick={handleReset}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-surface text-text-primary rounded-lg hover:bg-surface-hover transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-gray-900 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default ConfigPanel;
