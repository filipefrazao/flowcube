/**
 * FlowCube - Inline Keyboard Builder
 * Visual builder for Telegram inline keyboards
 */
'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  GripVertical,
  Link as LinkIcon,
  Code,
  MousePointer,
  X,
  ChevronUp,
  ChevronDown,
  Copy,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InlineKeyboardButton, InlineKeyboardMarkup } from '@/types/telegram.types';

interface InlineKeyboardBuilderProps {
  keyboard: InlineKeyboardMarkup | null;
  onUpdate: (keyboard: InlineKeyboardMarkup | null) => void;
  onClose: () => void;
}

type ButtonType = 'callback_data' | 'url' | 'web_app';

interface ButtonConfig {
  text: string;
  type: ButtonType;
  value: string;
}

const BUTTON_TYPES = [
  { value: 'callback_data', label: 'Callback', icon: MousePointer, description: 'Sends data to your bot' },
  { value: 'url', label: 'URL', icon: LinkIcon, description: 'Opens a link' },
  { value: 'web_app', label: 'Web App', icon: Code, description: 'Opens a Mini App' },
] as const;

function parseButtonConfig(button: InlineKeyboardButton): ButtonConfig {
  if (button.url) {
    return { text: button.text, type: 'url', value: button.url };
  }
  if (button.web_app) {
    return { text: button.text, type: 'web_app', value: button.web_app.url };
  }
  return { text: button.text, type: 'callback_data', value: button.callback_data || '' };
}

function buildButton(config: ButtonConfig): InlineKeyboardButton {
  const button: InlineKeyboardButton = { text: config.text };
  switch (config.type) {
    case 'url':
      button.url = config.value;
      break;
    case 'web_app':
      button.web_app = { url: config.value };
      break;
    case 'callback_data':
    default:
      button.callback_data = config.value;
      break;
  }
  return button;
}

export function InlineKeyboardBuilder({ keyboard, onUpdate, onClose }: InlineKeyboardBuilderProps) {
  // Convert keyboard to editable format
  const [rows, setRows] = useState<ButtonConfig[][]>(() => {
    if (!keyboard) return [[{ text: 'Button', type: 'callback_data', value: 'action_1' }]];
    return keyboard.inline_keyboard.map((row) =>
      row.map((button) => parseButtonConfig(button))
    );
  });

  const [editingButton, setEditingButton] = useState<{ row: number; col: number } | null>(null);

  // Add a new row
  const addRow = useCallback(() => {
    setRows([...rows, [{ text: 'Button', type: 'callback_data', value: `action_${Date.now()}` }]]);
  }, [rows]);

  // Remove a row
  const removeRow = useCallback((rowIndex: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== rowIndex));
  }, [rows]);

  // Move row up/down
  const moveRow = useCallback((rowIndex: number, direction: 'up' | 'down') => {
    const newRows = [...rows];
    const targetIndex = direction === 'up' ? rowIndex - 1 : rowIndex + 1;
    if (targetIndex < 0 || targetIndex >= rows.length) return;
    [newRows[rowIndex], newRows[targetIndex]] = [newRows[targetIndex], newRows[rowIndex]];
    setRows(newRows);
  }, [rows]);

  // Add button to row
  const addButton = useCallback((rowIndex: number) => {
    if (rows[rowIndex].length >= 8) return; // Max 8 buttons per row
    const newRows = [...rows];
    newRows[rowIndex] = [...newRows[rowIndex], { text: 'Button', type: 'callback_data', value: `action_${Date.now()}` }];
    setRows(newRows);
  }, [rows]);

  // Remove button from row
  const removeButton = useCallback((rowIndex: number, colIndex: number) => {
    const newRows = [...rows];
    if (newRows[rowIndex].length <= 1) {
      // Remove entire row if last button
      if (rows.length > 1) {
        newRows.splice(rowIndex, 1);
      }
    } else {
      newRows[rowIndex] = newRows[rowIndex].filter((_, i) => i !== colIndex);
    }
    setRows(newRows);
    setEditingButton(null);
  }, [rows]);

  // Update button
  const updateButton = useCallback((rowIndex: number, colIndex: number, updates: Partial<ButtonConfig>) => {
    const newRows = [...rows];
    newRows[rowIndex] = newRows[rowIndex].map((btn, i) =>
      i === colIndex ? { ...btn, ...updates } : btn
    );
    setRows(newRows);
  }, [rows]);

  // Save and close
  const handleSave = useCallback(() => {
    const markup: InlineKeyboardMarkup = {
      inline_keyboard: rows.map((row) => row.map((btn) => buildButton(btn))),
    };
    onUpdate(markup);
    onClose();
  }, [rows, onUpdate, onClose]);

  // Clear all
  const handleClear = useCallback(() => {
    onUpdate(null);
    onClose();
  }, [onUpdate, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Inline Keyboard Builder
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Preview */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Preview
            </label>
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl space-y-2">
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-2">
                  {row.map((btn, colIndex) => (
                    <button
                      key={colIndex}
                      className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors truncate"
                    >
                      {btn.text || 'Button'}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Rows
            </label>

            {rows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                {/* Row header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Row {rowIndex + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveRow(rowIndex, 'up')}
                      disabled={rowIndex === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveRow(rowIndex, 'down')}
                      disabled={rowIndex === rows.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => addButton(rowIndex)}
                      disabled={row.length >= 8}
                      className="p-1 text-blue-500 hover:text-blue-600 disabled:opacity-50"
                      title="Add button"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeRow(rowIndex)}
                      disabled={rows.length <= 1}
                      className="p-1 text-red-500 hover:text-red-600 disabled:opacity-50"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Buttons in row */}
                <div className="space-y-3">
                  {row.map((btn, colIndex) => {
                    const isEditing = editingButton?.row === rowIndex && editingButton?.col === colIndex;
                    const TypeIcon = BUTTON_TYPES.find((t) => t.value === btn.type)?.icon || MousePointer;

                    return (
                      <div
                        key={colIndex}
                        className={cn(
                          'p-3 rounded-lg border transition-colors',
                          isEditing
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-2">
                            {/* Button text */}
                            <input
                              type="text"
                              value={btn.text}
                              onChange={(e) => updateButton(rowIndex, colIndex, { text: e.target.value })}
                              onFocus={() => setEditingButton({ row: rowIndex, col: colIndex })}
                              placeholder="Button text"
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />

                            {/* Button type & value */}
                            <div className="flex gap-2">
                              <select
                                value={btn.type}
                                onChange={(e) => updateButton(rowIndex, colIndex, { type: e.target.value as ButtonType })}
                                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                {BUTTON_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={btn.value}
                                onChange={(e) => updateButton(rowIndex, colIndex, { value: e.target.value })}
                                onFocus={() => setEditingButton({ row: rowIndex, col: colIndex })}
                                placeholder={
                                  btn.type === 'url' ? 'https://example.com' :
                                  btn.type === 'web_app' ? 'https://webapp.example.com' :
                                  'callback_data'
                                }
                                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => removeButton(rowIndex, colIndex)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove button"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Add row button */}
            <button
              onClick={addRow}
              className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </button>
          </div>

          {/* Help text */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
              Button Types
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li><strong>Callback:</strong> Sends data to your workflow when clicked</li>
              <li><strong>URL:</strong> Opens a link in the browser</li>
              <li><strong>Web App:</strong> Opens a Telegram Mini App</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-red-500 hover:text-red-600 text-sm font-medium"
          >
            Clear Keyboard
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Keyboard
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default InlineKeyboardBuilder;
