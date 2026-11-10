'use client';

import React, { useState, useEffect } from 'react';
import { History, Clock, ArrowRight, Trash2, X } from 'lucide-react';
import { formatTime } from '@/lib/quiz';

export interface HistoryItem {
  id: string;
  blockId: string;
  blockTitle: string;
  score: number;
  totalQuestions: number;
  timeSeconds: number;
  mode: 'instant' | 'exam';
  date: string;
  questions: any[];
  userAnswers: Record<number, number>;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReview: (item: HistoryItem) => void;
}

export default function HistoryModal({ isOpen, onClose, onSelectReview }: HistoryModalProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem('quiz_history');
      if (raw) {
        setHistory(JSON.parse(raw));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Bạn có muốn xóa toàn bộ lịch sử trên máy này?')) {
      localStorage.removeItem('quiz_history');
      setHistory([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
            <History className="w-4 h-4 text-emerald-600" />
            <span>Lịch sử ôn tập</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {history.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-xs">
              Chưa có bài thi nào trong lịch sử.
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => {
                const percent = Math.round((item.score / item.totalQuestions) * 100);
                const dateStr = new Date(item.date).toLocaleString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectReview(item);
                      onClose();
                    }}
                    className="p-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
                          {item.blockTitle}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-gray-100 text-gray-500 font-medium">
                          {item.mode === 'instant' ? 'Xem ngay' : 'Thi thử'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[11px] text-gray-400">
                        <span>{dateStr}</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(item.timeSeconds)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-600">
                          {item.score}/{item.totalQuestions}
                        </div>
                        <div className="text-[10px] text-gray-400">{percent}%</div>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-gray-400 transition-colors">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Bấm để xem lại bài</span>
            <button
              onClick={handleClearHistory}
              className="text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa lịch sử</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
