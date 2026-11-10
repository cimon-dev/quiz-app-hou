'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  LayoutGrid,
  X
} from 'lucide-react';
import { QuizQuestion, formatTime } from '@/lib/quiz';
import ReviewView from './ReviewView';

interface QuizPlayProps {
  blockId: string;
  blockTitle: string;
  mode: 'instant' | 'exam';
  username: string;
  count?: number;
  onExit: () => void;
  onScoreSaved: () => void;
}

export default function QuizPlay({
  blockId,
  blockTitle,
  mode,
  username,
  count,
  onExit,
  onScoreSaved
}: QuizPlayProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showNavGrid, setShowNavGrid] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadQuestions();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [blockId, count]);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const url = `/api/questions?blockId=${blockId}&count=${count || 30}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
        setCurrentIndex(0);
        setUserAnswers({});
        setTimeSeconds(0);
        setIsFinished(false);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setTimeSeconds(prev => prev + 1);
        }, 1000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (isFinished) return;

    if (mode === 'instant' && userAnswers[currentIndex] !== undefined) {
      return;
    }

    setUserAnswers(prev => ({
      ...prev,
      [currentIndex]: optionIndex
    }));
  };

  const handleSubmit = async (force: boolean = false) => {
    if (!force) {
      const answeredCount = Object.keys(userAnswers).length;
      const unanswered = questions.length - answeredCount;
      if (unanswered > 0) {
        const ok = confirm(`Bạn còn ${unanswered} câu chưa trả lời. Bạn có muốn nộp bài?`);
        if (!ok) return;
      }
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    let score = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.answer) {
        score++;
      }
    });

    setFinalScore(score);
    setIsFinished(true);

    try {
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          blockId,
          blockTitle,
          score,
          totalQuestions: questions.length,
          timeSeconds,
          mode
        })
      });
      onScoreSaved();
    } catch (e) {
      console.error(e);
    }

    try {
      const historyItem = {
        id: `h_${Date.now()}`,
        blockId,
        blockTitle,
        score,
        totalQuestions: questions.length,
        timeSeconds,
        mode,
        date: new Date().toISOString(),
        questions,
        userAnswers
      };

      const existingRaw = localStorage.getItem('quiz_history');
      const historyList = existingRaw ? JSON.parse(existingRaw) : [];
      historyList.unshift(historyItem);
      localStorage.setItem('quiz_history', JSON.stringify(historyList.slice(0, 50)));
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-gray-500">Đang tải câu hỏi...</p>
      </div>
    );
  }

  if (isFinished) {
    return (
      <ReviewView
        blockTitle={blockTitle}
        score={finalScore}
        totalQuestions={questions.length}
        timeSeconds={timeSeconds}
        questions={questions}
        userAnswers={userAnswers}
        onReplay={loadQuestions}
        onHome={onExit}
      />
    );
  }

  const currentQ = questions[currentIndex];
  const userChoice = userAnswers[currentIndex];
  const hasAnsweredCurrent = userChoice !== undefined;
  const isLastQuestion = currentIndex === questions.length - 1;
  const answeredTotal = Object.keys(userAnswers).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-3 space-y-3.5">
      {/* Top sticky header */}
      <div className="sticky top-2 z-30 bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-gray-200 shadow-xs flex items-center justify-between gap-3">
        <button
          onClick={() => {
            if (confirm('Bạn có chắc muốn thoát?')) {
              onExit();
            }
          }}
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Thoát</span>
        </button>

        <div className="flex-1 text-center min-w-0">
          <div className="text-xs font-bold text-gray-800 truncate">{blockTitle}</div>
          <div className="text-[11px] text-gray-400">
            <span>{answeredTotal}/{questions.length} câu</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{formatTime(timeSeconds)}</span>
          </div>

          <button
            onClick={() => setShowNavGrid(true)}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
            title="Danh sách câu"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
        <div
          className="bg-blue-600 h-1 rounded-full transition-all duration-200"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400 border-b border-gray-100 pb-2.5">
            <span className="font-bold text-blue-600 text-sm">
              Câu {currentIndex + 1} / {questions.length}
            </span>
            <span className="font-medium text-gray-500">
              {currentQ.sectionTitle}
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
            {currentQ.question}
          </h2>

          <div className="space-y-2">
            {currentQ.options.map((opt, oIdx) => {
              const optLetter = String.fromCharCode(65 + oIdx);
              const isSelected = userChoice === oIdx;

              let btnStyle = 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/20 text-gray-800';
              let badgeStyle = 'bg-gray-100 text-gray-600';

              if (mode === 'instant') {
                if (hasAnsweredCurrent) {
                  if (oIdx === currentQ.answer) {
                    btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-medium ring-1 ring-emerald-500';
                    badgeStyle = 'bg-emerald-600 text-white';
                  } else if (isSelected) {
                    btnStyle = 'border-rose-400 bg-rose-50 text-rose-950 font-medium ring-1 ring-rose-400';
                    badgeStyle = 'bg-rose-600 text-white';
                  } else {
                    btnStyle = 'border-gray-200 bg-gray-50/50 text-gray-400 opacity-60';
                  }
                }
              } else {
                if (isSelected) {
                  btnStyle = 'border-blue-600 bg-blue-50 text-blue-900 font-semibold ring-1 ring-blue-600';
                  badgeStyle = 'bg-blue-600 text-white';
                }
              }

              return (
                <button
                  key={oIdx}
                  onClick={() => handleSelectOption(oIdx)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${btnStyle}`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${badgeStyle}`}
                  >
                    {optLetter}
                  </span>
                  <span className="text-sm sm:text-base leading-snug flex-1">
                    {opt}
                  </span>

                  {mode === 'instant' && hasAnsweredCurrent && (
                    <span className="shrink-0">
                      {oIdx === currentQ.answer ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : isSelected ? (
                        <XCircle className="w-5 h-5 text-rose-600" />
                      ) : null}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation in instant mode */}
          {mode === 'instant' && hasAnsweredCurrent && (
            <div
              className={`p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed animate-in fade-in duration-150 ${
                userChoice === currentQ.answer
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-1">
                {userChoice === currentQ.answer ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Đúng</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>
                      Sai. Đáp án: {String.fromCharCode(65 + currentQ.answer)}
                    </span>
                  </>
                )}
              </div>
              {currentQ.explanation && (
                <p className="text-gray-700 mt-1">{currentQ.explanation}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none text-gray-700 text-xs font-semibold flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Câu trước</span>
        </button>

        <div className="flex items-center gap-2">
          {mode === 'exam' && (
            <button
              onClick={() => handleSubmit(false)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nộp bài</span>
            </button>
          )}

          {isLastQuestion ? (
            mode === 'instant' ? (
              <button
                onClick={() => handleSubmit(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1 shadow-xs"
              >
                <span>Xem kết quả</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : null
          ) : (
            <button
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1 shadow-xs"
            >
              <span>Tiếp theo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Question Nav Drawer */}
      {showNavGrid && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-5 border border-gray-200 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Danh sách câu hỏi</h3>
                <p className="text-xs text-gray-400">
                  {answeredTotal}/{questions.length} câu đã trả lời
                </p>
              </div>
              <button
                onClick={() => setShowNavGrid(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = userAnswers[idx] !== undefined;
                  let bg = 'border-gray-200 bg-white text-gray-700';

                  if (mode === 'instant') {
                    if (isAnswered) {
                      if (userAnswers[idx] === q.answer) {
                        bg = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold';
                      } else {
                        bg = 'border-rose-400 bg-rose-50 text-rose-800 font-bold';
                      }
                    }
                  } else {
                    if (isAnswered) {
                      bg = 'border-blue-600 bg-blue-50 text-blue-800 font-bold';
                    }
                  }

                  if (isCurrent) {
                    bg += ' ring-2 ring-gray-900';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setShowNavGrid(false);
                      }}
                      className={`h-10 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all ${bg}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => handleSubmit(false)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Nộp bài</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
