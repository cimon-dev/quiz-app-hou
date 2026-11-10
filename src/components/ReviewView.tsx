'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Home, Filter, ChevronUp } from 'lucide-react';
import { QuizQuestion, formatTime } from '@/lib/quiz';

interface ReviewViewProps {
  blockTitle: string;
  score: number;
  totalQuestions: number;
  timeSeconds: number;
  questions: QuizQuestion[];
  userAnswers: Record<number, number>;
  onReplay: () => void;
  onHome: () => void;
}

export default function ReviewView({
  blockTitle,
  score,
  totalQuestions,
  timeSeconds,
  questions,
  userAnswers,
  onReplay,
  onHome
}: ReviewViewProps) {
  const [filter, setFilter] = useState<'all' | 'wrong' | 'correct'>('all');

  const percent = Math.round((score / totalQuestions) * 100);
  const wrongCount = totalQuestions - score;

  const filteredQuestions = questions.map((q, idx) => ({ q, idx })).filter(({ q, idx }) => {
    const userChoice = userAnswers[idx];
    const isCorrect = userChoice === q.answer;
    if (filter === 'wrong') return !isCorrect;
    if (filter === 'correct') return isCorrect;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
      {/* Top summary card */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs text-center">
        <h2 className="text-lg font-bold text-gray-900 mb-3">{blockTitle}</h2>

        <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto mb-5">
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <div className="text-[11px] text-gray-400 mb-0.5">Số câu đúng</div>
            <div className="text-xl font-bold text-emerald-600">
              {score}/{totalQuestions}
            </div>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <div className="text-[11px] text-gray-400 mb-0.5">Chính xác</div>
            <div className="text-xl font-bold text-blue-600">{percent}%</div>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <div className="text-[11px] text-gray-400 mb-0.5">Thời gian</div>
            <div className="text-xl font-bold text-gray-800 font-mono">
              {formatTime(timeSeconds)}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={onReplay}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Làm lại</span>
          </button>
          <button
            onClick={onHome}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-1 text-xs font-semibold text-gray-500">
          <Filter className="w-3.5 h-3.5" />
          <span>Lọc:</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tất cả ({totalQuestions})
          </button>
          <button
            onClick={() => setFilter('wrong')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              filter === 'wrong'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Sai ({wrongCount})
          </button>
          <button
            onClick={() => setFilter('correct')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              filter === 'correct'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Đúng ({score})
          </button>
        </div>
      </div>

      {/* Question list */}
      <div className="space-y-3.5">
        {filteredQuestions.map(({ q, idx }) => {
          const userChoice = userAnswers[idx];
          const hasAnswered = userChoice !== undefined;
          const isCorrect = userChoice === q.answer;

          return (
            <div
              key={q.id + '_' + idx}
              className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-xs ${
                isCorrect ? 'border-gray-200' : 'border-rose-200 bg-rose-50/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-gray-400">Câu {idx + 1}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 font-medium">
                    {q.sectionTitle}
                  </span>
                </div>
                <div>
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Đúng</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      <XCircle className="w-3 h-3" />
                      <span>{hasAnswered ? 'Sai' : 'Chưa làm'}</span>
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 leading-snug">
                {q.question}
              </h3>

              <div className="space-y-1.5 mb-2.5">
                {q.options.map((opt, oIdx) => {
                  const isUserSelection = userChoice === oIdx;
                  const isAnswer = q.answer === oIdx;

                  let optClass = 'border-gray-200 bg-white text-gray-700';
                  let badgeClass = 'bg-gray-100 text-gray-600';
                  let label = null;

                  if (isAnswer) {
                    optClass = 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium';
                    badgeClass = 'bg-emerald-600 text-white';
                    label = (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Đáp án đúng</span>
                      </span>
                    );
                  } else if (isUserSelection && !isCorrect) {
                    optClass = 'border-rose-400 bg-rose-50 text-rose-950 font-medium';
                    badgeClass = 'bg-rose-600 text-white';
                    label = (
                      <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        <span>Bạn đã chọn</span>
                      </span>
                    );
                  }

                  const optLetter = String.fromCharCode(65 + oIdx);

                  return (
                    <div
                      key={oIdx}
                      className={`p-2.5 sm:p-3 rounded-xl border flex items-start justify-between gap-2.5 text-xs sm:text-sm ${optClass}`}
                    >
                      <div className="flex items-start gap-2 flex-1">
                        <span
                          className={`w-5 h-5 rounded-md font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 ${badgeClass}`}
                        >
                          {optLetter}
                        </span>
                        <span className="leading-snug">{opt}</span>
                      </div>
                      {label && <div className="shrink-0">{label}</div>}
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div className="mt-2.5 p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed">
                  <span className="font-bold text-blue-800">💡 Giải thích: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 text-center">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="text-xs text-gray-400 hover:text-gray-700 inline-flex items-center gap-1 py-1 px-2.5 bg-gray-100 rounded-lg"
        >
          <ChevronUp className="w-3 h-3" />
          <span>Lên đầu trang</span>
        </button>
      </div>
    </div>
  );
}
