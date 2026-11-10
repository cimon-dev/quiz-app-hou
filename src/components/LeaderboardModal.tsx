'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Clock, Award, X, RefreshCw } from 'lucide-react';
import { BLOCKS_METADATA, formatTime } from '@/lib/quiz';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBlockId?: string;
  currentUser?: string;
}

export default function LeaderboardModal({
  isOpen,
  onClose,
  initialBlockId = '1',
  currentUser
}: LeaderboardModalProps) {
  const [activeTab, setActiveTab] = useState<'block' | 'attempts'>('block');
  const [selectedBlockId, setSelectedBlockId] = useState<string>(initialBlockId);
  const [blockRanking, setBlockRanking] = useState<any[]>([]);
  const [attemptsRanking, setAttemptsRanking] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialBlockId) setSelectedBlockId(initialBlockId);
      loadData();
    }
  }, [isOpen, selectedBlockId, activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'block') {
        const res = await fetch(`/api/leaderboard?type=block&blockId=${selectedBlockId}`);
        if (res.ok) {
          const data = await res.json();
          setBlockRanking(data.ranking || []);
        }
      } else {
        const res = await fetch(`/api/leaderboard?type=attempts`);
        if (res.ok) {
          const data = await res.json();
          setAttemptsRanking(data.attempts || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Bảng xếp hạng</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-200 px-5 pt-2 bg-white">
          <button
            onClick={() => setActiveTab('block')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'block'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Theo khối</span>
          </button>
          <button
            onClick={() => setActiveTab('attempts')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'attempts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>Số lượt làm bài</span>
          </button>
        </div>

        {/* Subheader / Filter */}
        {activeTab === 'block' && (
          <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-3">
            <select
              value={selectedBlockId}
              onChange={e => setSelectedBlockId(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-gray-800"
            >
              {BLOCKS_METADATA.map(b => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.count} câu)
                </option>
              ))}
            </select>
            <button
              onClick={loadData}
              disabled={isLoading}
              title="Tải lại"
              className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="py-10 text-center text-xs text-gray-400">Đang tải...</div>
          ) : activeTab === 'block' ? (
            blockRanking.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-xs">
                Chưa có kết quả nào.
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-12 text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 pb-1">
                  <span className="col-span-2">Hạng</span>
                  <span className="col-span-5">Tên</span>
                  <span className="col-span-3 text-right">Điểm</span>
                  <span className="col-span-2 text-right">Thời gian</span>
                </div>
                {blockRanking.map((item, idx) => {
                  const isCurrent =
                    currentUser &&
                    item.username.toLowerCase() === currentUser.toLowerCase();

                  return (
                    <div
                      key={item.id || idx}
                      className={`grid grid-cols-12 items-center px-3 py-2.5 rounded-xl text-xs transition-colors ${
                        isCurrent
                          ? 'bg-blue-50 border border-blue-200 text-blue-900 font-medium'
                          : idx === 0
                          ? 'bg-amber-50/60 border border-amber-200 text-amber-900'
                          : idx === 1
                          ? 'bg-slate-50 border border-slate-200 text-slate-800'
                          : idx === 2
                          ? 'bg-orange-50/50 border border-orange-200 text-orange-900'
                          : 'bg-white hover:bg-gray-50 border border-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="col-span-2 flex items-center gap-1 font-bold">
                        {idx === 0 && <span className="text-amber-500">🥇 1</span>}
                        {idx === 1 && <span className="text-slate-400">🥈 2</span>}
                        {idx === 2 && <span className="text-amber-700">🥉 3</span>}
                        {idx > 2 && <span className="text-gray-400">#{idx + 1}</span>}
                      </div>
                      <div className="col-span-5 truncate flex items-center gap-1.5">
                        <span className="font-semibold">{item.username}</span>
                        {isCurrent && (
                          <span className="text-[9px] bg-blue-600 text-white px-1 py-0.2 rounded-full">
                            Bạn
                          </span>
                        )}
                      </div>
                      <div className="col-span-3 text-right font-bold text-emerald-600">
                        {item.score}/{item.totalQuestions}
                      </div>
                      <div className="col-span-2 text-right text-gray-400 font-mono flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 text-gray-300" />
                        <span>{formatTime(item.timeSeconds)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : attemptsRanking.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-xs">
              Chưa có dữ liệu ôn tập nào.
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="grid grid-cols-12 text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 pb-1">
                <span className="col-span-2">Hạng</span>
                <span className="col-span-6">Tên</span>
                <span className="col-span-4 text-right">Lượt ôn</span>
              </div>
              {attemptsRanking.map((item, idx) => {
                const isCurrent =
                  currentUser &&
                  item.username.toLowerCase() === currentUser.toLowerCase();

                return (
                  <div
                    key={item.username}
                    className={`grid grid-cols-12 items-center px-3 py-2.5 rounded-xl text-xs transition-colors ${
                      isCurrent
                        ? 'bg-blue-50 border border-blue-200 text-blue-900 font-medium'
                        : idx === 0
                        ? 'bg-amber-50/60 border border-amber-200 text-amber-900'
                        : idx === 1
                        ? 'bg-slate-50 border border-slate-200 text-slate-800'
                        : idx === 2
                        ? 'bg-orange-50/50 border border-orange-200 text-orange-900'
                        : 'bg-white hover:bg-gray-50 border border-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="col-span-2 flex items-center gap-1 font-bold">
                      {idx === 0 && <span className="text-amber-500">🥇 1</span>}
                      {idx === 1 && <span className="text-slate-400">🥈 2</span>}
                      {idx === 2 && <span className="text-amber-700">🥉 3</span>}
                      {idx > 2 && <span className="text-gray-400">#{idx + 1}</span>}
                    </div>
                    <div className="col-span-6 truncate flex items-center gap-1.5">
                      <span className="font-semibold">{item.username}</span>
                      {isCurrent && (
                        <span className="text-[9px] bg-blue-600 text-white px-1 py-0.2 rounded-full">
                          Bạn
                        </span>
                      )}
                    </div>
                    <div className="col-span-4 text-right">
                      <span className="font-bold text-orange-600">{item.totalAttempts}</span>
                      <span className="text-[11px] text-gray-400 ml-1">lượt</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
