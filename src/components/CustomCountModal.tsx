'use client';

import React, { useState } from 'react';
import { Shuffle, X, ArrowRight } from 'lucide-react';

interface CustomCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (count: number) => void;
}

const PRESETS = [10, 20, 30, 40, 50, 60];

export default function CustomCountModal({ isOpen, onClose, onStart }: CustomCountModalProps) {
  const [selectedCount, setSelectedCount] = useState<number>(30);
  const [customInput, setCustomInput] = useState<string>('30');

  if (!isOpen) return null;

  const handleSelectPreset = (val: number) => {
    setSelectedCount(val);
    setCustomInput(String(val));
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setSelectedCount(Math.min(180, Math.max(1, num)));
    }
  };

  const handleSubmit = () => {
    const finalVal = Math.min(180, Math.max(1, selectedCount || 30));
    onStart(finalVal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
            <Shuffle className="w-4 h-4 text-indigo-600" />
            <span>Tùy chọn số lượng câu</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map(preset => (
              <button
                key={preset}
                onClick={() => handleSelectPreset(preset)}
                className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                  selectedCount === preset
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {preset} câu
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Hoặc nhập số câu (1 - 180):
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={customInput}
              onChange={handleCustomChange}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 font-semibold text-base"
              placeholder="1 - 180"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleSubmit}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Bắt đầu ({selectedCount} câu)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
