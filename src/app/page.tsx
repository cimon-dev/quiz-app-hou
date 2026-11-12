'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  Trophy,
  History,
  User,
  Zap,
  BookOpen,
  Shuffle,
  Clock,
  Layers,
  ChevronRight,
  FileText,
  CheckSquare,
  RotateCcw
} from 'lucide-react';
import {
  BLOCKS_METADATA,
  BlockGroup,
  QuizBlock,
  TOTAL_QUESTIONS_COUNT,
  VALID_QUESTION_IDS,
  getNextBlock,
  formatTime
} from '@/lib/quiz';
import {
  WRONG_REVIEW_LIMIT,
  WrongBankMap,
  fetchAndMergeWrongBank,
  getWrongBankStats,
  loadLocalWrongBank
} from '@/lib/wrongBank';
import UserModal from '@/components/UserModal';
import LeaderboardModal from '@/components/LeaderboardModal';
import HistoryModal, { HistoryItem } from '@/components/HistoryModal';
import CustomCountModal from '@/components/CustomCountModal';
import QuizPlay from '@/components/QuizPlay';
import ReviewView from '@/components/ReviewView';

export default function Home() {
  const [username, setUsername] = useState<string>('');
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [quizMode, setQuizMode] = useState<'instant' | 'exam'>('instant');

  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [selectedLeaderboardBlock, setSelectedLeaderboardBlock] = useState<string>('1');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

  const [activeBlock, setActiveBlock] = useState<QuizBlock | null>(null);
  const [customQuestionCount, setCustomQuestionCount] = useState<number>(30);
  const [reviewItem, setReviewItem] = useState<HistoryItem | null>(null);
  const [wrongBank, setWrongBank] = useState<WrongBankMap>({});

  const [bestScores, setBestScores] = useState<
    Record<string, { bestScore: number; totalQuestions: number; bestTimeSeconds: number }>
  >({});

  const homeScrollYRef = useRef<number>(0);
  const wasViewingSubPageRef = useRef<boolean>(false);

  const isViewingSubPage = Boolean(activeBlock || reviewItem);

  useLayoutEffect(() => {
    if (isViewingSubPage && !wasViewingSubPageRef.current) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    } else if (!isViewingSubPage && wasViewingSubPageRef.current) {
      window.scrollTo({ top: homeScrollYRef.current, behavior: 'instant' as ScrollBehavior });
    }
    wasViewingSubPageRef.current = isViewingSubPage;
  }, [isViewingSubPage]);

  useEffect(() => {
    const savedUser = localStorage.getItem('quiz_username');
    if (savedUser) {
      setUsername(savedUser);
      loadBestScores(savedUser);
      loadWrongBankState(savedUser);
    } else {
      setShowUserModal(true);
    }

    const savedMode = localStorage.getItem('quiz_mode');
    if (savedMode === 'exam' || savedMode === 'instant') {
      setQuizMode(savedMode);
    }
  }, []);

  const loadWrongBankState = async (user: string) => {
    if (!user) return;
    setWrongBank(loadLocalWrongBank(user));
    const merged = await fetchAndMergeWrongBank(user);
    setWrongBank(merged);
  };

  const loadBestScores = async (user: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/scores/best?username=${encodeURIComponent(user)}`);
      let serverBest: Record<string, any> = {};
      if (res.ok) {
        const data = await res.json();
        serverBest = data.best || {};
      }

      const localRaw = localStorage.getItem('quiz_history');
      if (localRaw) {
        try {
          const localList: HistoryItem[] = JSON.parse(localRaw);
          for (const item of localList) {
            const curr = serverBest[item.blockId];
            if (!curr) {
              serverBest[item.blockId] = {
                bestScore: item.score,
                totalQuestions: item.totalQuestions,
                bestTimeSeconds: item.timeSeconds
              };
            } else {
              if (
                item.score > curr.bestScore ||
                (item.score === curr.bestScore && item.timeSeconds < curr.bestTimeSeconds)
              ) {
                serverBest[item.blockId] = {
                  bestScore: item.score,
                  totalQuestions: item.totalQuestions,
                  bestTimeSeconds: item.timeSeconds
                };
              }
            }
          }
        } catch (e) {}
      }

      setBestScores(serverBest);
    } catch (e) {
      console.error(e);
    }
  };

  const enterSubView = (fn: () => void) => {
    if (!activeBlock && !reviewItem) {
      homeScrollYRef.current = window.scrollY;
    }
    fn();
  };

  const handleUserSelected = (name: string) => {
    setUsername(name);
    localStorage.setItem('quiz_username', name);
    loadBestScores(name);
    loadWrongBankState(name);
  };

  const handleModeChange = (mode: 'instant' | 'exam') => {
    setQuizMode(mode);
    localStorage.setItem('quiz_mode', mode);
  };

  const handleBlockClick = (block: QuizBlock) => {
    if (!username) {
      setShowUserModal(true);
      return;
    }

    if (block.id === 'custom') {
      setShowCustomModal(true);
      return;
    }

    if (block.id === 'wrong') {
      const latestStats = getWrongBankStats(loadLocalWrongBank(username), VALID_QUESTION_IDS);
      if (latestStats.activeCount === 0 && latestStats.level0Count === 0) {
        alert('Bạn chưa có câu sai nào để ôn tập.');
        return;
      }
      if (latestStats.activeCount === 0 && latestStats.level0Count > 0) {
        const ok = confirm(
          `Bạn đã ôn hết các câu sai!\nHiện có ${latestStats.level0Count} câu từng sai ở mức độ 0. Bạn có muốn ôn lại tối đa ${WRONG_REVIEW_LIMIT} câu mức độ 0 không?`
        );
        if (!ok) return;
      }
    }

    enterSubView(() => setActiveBlock(block));
  };

  const handleStartCustom = (count: number) => {
    setCustomQuestionCount(count);
    const customBlock = BLOCKS_METADATA.find(b => b.id === 'custom')!;
    enterSubView(() =>
      setActiveBlock({
        ...customBlock,
        count
      })
    );
  };

  const wrongStats = getWrongBankStats(wrongBank, VALID_QUESTION_IDS);
  const wrongLevelSummary = [
    wrongStats.highCount > 0 ? `Mức ≥3: ${wrongStats.highCount}` : null,
    wrongStats.level2Count > 0 ? `Mức 2: ${wrongStats.level2Count}` : null,
    wrongStats.level1Count > 0 ? `Mức 1: ${wrongStats.level1Count}` : null
  ]
    .filter(Boolean)
    .join(' • ');

  const synthesisConfig: Record<
    string,
    {
      border: string;
      hoverText: string;
      badge: string;
      actionText: string;
      actionLabel: string;
      badgeText: string;
      spanClass?: string;
      showShuffleIcon?: boolean;
      showWrongIcon?: boolean;
    }
  > = {
    full: {
      border: 'border-indigo-200 hover:border-indigo-500',
      hoverText: 'group-hover:text-indigo-600',
      badge: 'text-indigo-700 bg-indigo-50',
      actionText: 'text-indigo-600',
      actionLabel: 'Vào ôn',
      badgeText: '180 câu'
    },
    full_2: {
      border: 'border-blue-200 hover:border-blue-500',
      hoverText: 'group-hover:text-blue-600',
      badge: 'text-blue-700 bg-blue-50',
      actionText: 'text-blue-600',
      actionLabel: 'Vào ôn',
      badgeText: '180 câu'
    },
    full_tf: {
      border: 'border-teal-200 hover:border-teal-500',
      hoverText: 'group-hover:text-teal-600',
      badge: 'text-teal-700 bg-teal-50',
      actionText: 'text-teal-600',
      actionLabel: 'Vào ôn',
      badgeText: '30 câu'
    },
    custom: {
      border: 'border-amber-200 hover:border-amber-500',
      hoverText: 'group-hover:text-amber-600',
      badge: 'text-amber-700 bg-amber-50',
      actionText: 'text-amber-600',
      actionLabel: 'Chọn số câu',
      badgeText: `1 - ${TOTAL_QUESTIONS_COUNT} câu`,
      showShuffleIcon: true
    },
    wrong: {
      border: 'border-rose-200 hover:border-rose-500',
      hoverText: 'group-hover:text-rose-600',
      badge:
        wrongStats.activeCount > 0
          ? 'text-rose-700 bg-rose-50'
          : wrongStats.level0Count > 0
            ? 'text-emerald-700 bg-emerald-50'
            : 'text-gray-500 bg-gray-100',
      actionText: 'text-rose-600',
      actionLabel:
        wrongStats.activeCount > 0
          ? `Ôn ${Math.min(WRONG_REVIEW_LIMIT, wrongStats.activeCount)} câu`
          : wrongStats.level0Count > 0
            ? 'Ôn mức 0'
            : 'Chưa có',
      badgeText:
        wrongStats.activeCount > 0
          ? `${wrongStats.activeCount} câu sai`
          : wrongStats.level0Count > 0
            ? `${wrongStats.level0Count} mức 0`
            : '0 câu sai',
      spanClass: 'sm:col-span-2',
      showWrongIcon: true
    }
  };

  const synthesisBlocks = BLOCKS_METADATA.filter(b => b.group === 'synthesis');

  const sectionGroups: {
    group: BlockGroup;
    title: string;
    hoverBorder: string;
    hoverTitle: string;
    hoverArrow: string;
    icon: React.ReactNode;
  }[] = [
    {
      group: 'bo1',
      title: 'Ôn tập theo phần',
      hoverBorder: 'hover:border-blue-500',
      hoverTitle: 'group-hover:text-blue-600',
      hoverArrow: 'group-hover:text-blue-600',
      icon: <BookOpen className="w-4 h-4 text-blue-600" />
    },
    {
      group: 'sv',
      title: 'Đề cương Phần A',
      hoverBorder: 'hover:border-indigo-500',
      hoverTitle: 'group-hover:text-indigo-600',
      hoverArrow: 'group-hover:text-indigo-600',
      icon: <FileText className="w-4 h-4 text-indigo-600" />
    },
    {
      group: 'bo2_mcq',
      title: 'Bộ 2 - Trắc nghiệm',
      hoverBorder: 'hover:border-violet-500',
      hoverTitle: 'group-hover:text-violet-600',
      hoverArrow: 'group-hover:text-violet-600',
      icon: <BookOpen className="w-4 h-4 text-violet-600" />
    },
    {
      group: 'bo2_tf',
      title: 'Bộ 2 - Đúng / Sai',
      hoverBorder: 'hover:border-teal-500',
      hoverTitle: 'group-hover:text-teal-600',
      hoverArrow: 'group-hover:text-teal-600',
      icon: <CheckSquare className="w-4 h-4 text-teal-600" />
    }
  ];

  const reviewNextBlock =
    reviewItem && reviewItem.blockId !== 'custom' && reviewItem.blockId !== 'wrong'
      ? getNextBlock(reviewItem.blockId)
      : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {activeBlock && (
        <div className="pb-12">
          <QuizPlay
            blockId={activeBlock.id}
            blockTitle={
              activeBlock.id === 'custom'
                ? `Tùy chọn (${customQuestionCount} câu)`
                : activeBlock.title
            }
            mode={quizMode}
            username={username}
            count={activeBlock.id === 'custom' ? customQuestionCount : activeBlock.count}
            onNextBlock={nextBlk => setActiveBlock(nextBlk)}
            onWrongBankUpdated={updated => setWrongBank(updated)}
            onExit={() => {
              setActiveBlock(null);
              setWrongBank(loadLocalWrongBank(username));
              loadBestScores(username);
            }}
            onScoreSaved={() => {
              loadBestScores(username);
            }}
          />
        </div>
      )}

      {!activeBlock && reviewItem && (
        <div className="pb-12">
          <ReviewView
            blockTitle={reviewItem.blockTitle}
            score={reviewItem.score}
            totalQuestions={reviewItem.totalQuestions}
            timeSeconds={reviewItem.timeSeconds}
            questions={reviewItem.questions}
            userAnswers={reviewItem.userAnswers}
            nextBlock={reviewNextBlock}
            onNextBlock={
              reviewNextBlock
                ? () => {
                    setReviewItem(null);
                    setActiveBlock(reviewNextBlock);
                  }
                : undefined
            }
            replayLabel={reviewItem.blockId === 'wrong' ? 'Ôn tiếp câu sai' : 'Làm lại'}
            onReplay={() => {
              const block = BLOCKS_METADATA.find(b => b.id === reviewItem.blockId) || {
                id: reviewItem.blockId,
                title: reviewItem.blockTitle,
                subtitle: '',
                count: reviewItem.totalQuestions,
                type: 'section' as const,
                group: 'bo1' as const
              };
              if (block.id === 'custom') {
                setCustomQuestionCount(reviewItem.totalQuestions);
              }
              setReviewItem(null);
              setActiveBlock(block);
            }}
            onHome={() => setReviewItem(null)}
          />
        </div>
      )}

      <div className={isViewingSubPage ? 'hidden' : 'block'}>
        {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              TN
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-none">
                Ôn Tập Trắc Nghiệm
              </h1>
              <p className="text-[11px] text-gray-500 mt-0.5">Fintech</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                setSelectedLeaderboardBlock('1');
                setShowLeaderboard(true);
              }}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">Xếp Hạng</span>
            </button>

            <button
              onClick={() => setShowHistory(true)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <History className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Lịch Sử</span>
            </button>

            <button
              onClick={() => setShowUserModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center gap-1.5 transition-colors max-w-[130px] sm:max-w-[180px] truncate"
            >
              <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">{username || 'Nhập tên'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 pt-5 space-y-6">
        {/* Mode Selector */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-gray-700 block mb-1">
              Chế độ xem đáp án:
            </span>
            <p className="text-xs text-gray-500">
              {quizMode === 'instant'
                ? 'Hiển thị kết quả ngay sau khi chọn đáp án.'
                : 'Làm xong toàn bộ và nộp bài để xem điểm.'}
            </p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl shrink-0 self-start sm:self-center">
            <button
              onClick={() => handleModeChange('instant')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                quizMode === 'instant'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Xem trực tiếp</span>
            </button>
            <button
              onClick={() => handleModeChange('exam')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                quizMode === 'exam'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Làm xong mới xem</span>
            </button>
          </div>
        </div>

        {/* Synthesis Blocks */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-gray-800">
              Tổng hợp
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {synthesisBlocks.map(block => {
              const cfg = synthesisConfig[block.id] || synthesisConfig.full;
              const best = bestScores[block.id];
              const isWrongBlock = block.id === 'wrong';

              return (
                <div
                  key={block.id}
                  onClick={() => handleBlockClick(block)}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between group active:scale-[0.99] ${cfg.border} ${cfg.spanClass || ''}`}
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className={`font-bold text-gray-900 text-base sm:text-lg transition-colors ${cfg.hoverText}`}>
                        {block.title}
                      </h3>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${cfg.badge}`}>
                        {cfg.showShuffleIcon && <Shuffle className="w-3 h-3" />}
                        {cfg.showWrongIcon && <RotateCcw className="w-3 h-3" />}
                        <span>{cfg.badgeText}</span>
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    {isWrongBlock ? (
                      wrongStats.activeCount > 0 ? (
                        <span className="font-medium text-gray-600">{wrongLevelSummary}</span>
                      ) : wrongStats.level0Count > 0 ? (
                        <span className="font-medium text-emerald-700">
                          Đã ôn hết • {wrongStats.level0Count} câu mức 0
                        </span>
                      ) : (
                        <span className="text-gray-400">Các câu làm sai sẽ tự lưu tại đây</span>
                      )
                    ) : best ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-600">
                          Tốt nhất: {best.bestScore}/{best.totalQuestions}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-500 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{formatTime(best.bestTimeSeconds)}</span>
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Chưa làm</span>
                    )}

                    <span className={`font-semibold group-hover:translate-x-0.5 transition-transform flex items-center ${cfg.actionText}`}>
                      {cfg.actionLabel} <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grouped Section Blocks */}
        {sectionGroups.map(groupCfg => {
          const blocks = BLOCKS_METADATA.filter(b => b.group === groupCfg.group);

          return (
            <div key={groupCfg.group}>
              <div className="flex items-center gap-2 mb-3">
                {groupCfg.icon}
                <h2 className="text-sm font-bold text-gray-800">
                  {groupCfg.title}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {blocks.map(block => {
                  const best = bestScores[block.id];

                  return (
                    <div
                      key={block.id}
                      onClick={() => handleBlockClick(block)}
                      className={`bg-white rounded-2xl p-4 border border-gray-200 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between group active:scale-[0.99] ${groupCfg.hoverBorder}`}
                    >
                      <div className="mb-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className={`font-bold text-gray-900 text-base transition-colors ${groupCfg.hoverTitle}`}>
                            {block.title}
                          </h3>
                          <span className="text-xs text-gray-400 font-medium shrink-0">
                            {block.count} câu
                          </span>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                        {best ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-emerald-600">
                              {best.bestScore}/{best.totalQuestions}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500 font-mono flex items-center gap-0.5 text-[11px]">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span>{formatTime(best.bestTimeSeconds)}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Chưa làm</span>
                        )}

                        <span className={`text-gray-400 group-hover:translate-x-0.5 transition-all ${groupCfg.hoverArrow}`}>
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      </div>

      <UserModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        currentUser={username}
        onUserSelected={handleUserSelected}
      />

      <CustomCountModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onStart={handleStartCustom}
      />

      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        initialBlockId={selectedLeaderboardBlock}
        currentUser={username}
      />

      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectReview={item => enterSubView(() => setReviewItem(item))}
      />
    </main>
  );
}
