import rawBo1Questions from '@/data/questions.json';
import rawSvQuestions from '@/data/sv_questions.json';
import rawBo2Questions from '@/data/bo2_questions.json';
import { WRONG_REVIEW_LIMIT, WrongBankMap } from './wrongBank';

export type QuestionKind = 'mcq' | 'tf';
export type BlockGroup = 'synthesis' | 'bo1' | 'sv' | 'bo2_mcq' | 'bo2_tf';

export interface Question {
  id: string;
  section: number;
  sectionTitle: string;
  type?: QuestionKind;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface QuizQuestion extends Question {
  originalIndex: number;
  wrongLevel?: number;
}

export interface QuizBlock {
  id: string;
  title: string;
  subtitle: string;
  count: number;
  type: 'section' | 'full' | 'custom' | 'wrong';
  group: BlockGroup;
  questionKind?: QuestionKind | 'mixed';
  sectionNumber?: number;
}

const bo1Questions: Question[] = (rawBo1Questions as Question[]).map(q => ({
  ...q,
  type: 'mcq'
}));
const svQuestions: Question[] = rawSvQuestions as Question[];
const bo2Questions: Question[] = rawBo2Questions as Question[];
const bo2McqQuestions: Question[] = bo2Questions.filter(q => q.type !== 'tf');
const bo2TfQuestions: Question[] = bo2Questions.filter(q => q.type === 'tf');

const ALL_QUESTIONS: Question[] = [...bo1Questions, ...svQuestions, ...bo2Questions];
export const TOTAL_QUESTIONS_COUNT = ALL_QUESTIONS.length;
const QUESTION_BY_ID = new Map<string, Question>(ALL_QUESTIONS.map(q => [q.id, q]));
export const VALID_QUESTION_IDS = new Set<string>(QUESTION_BY_ID.keys());

export const BLOCKS_METADATA: QuizBlock[] = [
  ...Array.from({ length: 15 }, (_, i) => ({
    id: String(i + 1),
    title: `Ôn tập ${i + 1}`,
    subtitle: '12 câu',
    count: 12,
    type: 'section' as const,
    group: 'bo1' as const,
    questionKind: 'mcq' as const,
    sectionNumber: i + 1
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `sv_${i + 1}`,
    title: `Đề cương ${i + 1}`,
    subtitle: '15 câu',
    count: 15,
    type: 'section' as const,
    group: 'sv' as const,
    questionKind: 'mcq' as const,
    sectionNumber: 101 + i
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `bo2_mcq_${i + 1}`,
    title: `Bộ 2 - Đề ${i + 1}`,
    subtitle: '15 câu',
    count: 15,
    type: 'section' as const,
    group: 'bo2_mcq' as const,
    questionKind: 'mcq' as const,
    sectionNumber: 201 + i
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `bo2_tf_${i + 1}`,
    title: `Bộ 2 - Đúng/Sai ${i + 1}`,
    subtitle: '15 câu',
    count: 15,
    type: 'section' as const,
    group: 'bo2_tf' as const,
    questionKind: 'tf' as const,
    sectionNumber: 301 + i
  })),
  {
    id: 'full',
    title: 'Tổng hợp 1',
    subtitle: '180 câu',
    count: 180,
    type: 'full' as const,
    group: 'synthesis' as const,
    questionKind: 'mcq' as const
  },
  {
    id: 'full_2',
    title: 'Tổng hợp 2',
    subtitle: '180 câu',
    count: 180,
    type: 'full' as const,
    group: 'synthesis' as const,
    questionKind: 'mcq' as const
  },
  {
    id: 'full_tf',
    title: 'Tổng hợp Đúng / Sai',
    subtitle: '30 câu',
    count: 30,
    type: 'full' as const,
    group: 'synthesis' as const,
    questionKind: 'tf' as const
  },
  {
    id: 'custom',
    title: 'Tùy chọn số câu',
    subtitle: `1 - ${TOTAL_QUESTIONS_COUNT} câu`,
    count: 30,
    type: 'custom' as const,
    group: 'synthesis' as const,
    questionKind: 'mixed' as const
  },
  {
    id: 'wrong',
    title: 'Ôn tập câu sai',
    subtitle: `Tối đa ${WRONG_REVIEW_LIMIT} câu`,
    count: WRONG_REVIEW_LIMIT,
    type: 'wrong' as const,
    group: 'synthesis' as const,
    questionKind: 'mixed' as const
  }
];

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function prepareQuizQuestion(q: Question, index: number): QuizQuestion {
  // True/False questions must keep ["Đúng", "Sai"] in fixed order.
  if (q.type === 'tf') {
    return {
      ...q,
      type: 'tf',
      originalIndex: index,
      options: [...q.options],
      answer: q.answer
    };
  }

  const originalAnswerText = q.options[q.answer];
  const shuffledOptions = shuffleArray(q.options);
  const newAnswerIndex = shuffledOptions.indexOf(originalAnswerText);

  return {
    ...q,
    type: 'mcq',
    originalIndex: index,
    options: shuffledOptions,
    answer: newAnswerIndex
  };
}

function groupBySection(list: Question[]): Question[][] {
  const bySection = new Map<number, Question[]>();
  for (const q of list) {
    const bucket = bySection.get(q.section) || [];
    bucket.push(q);
    bySection.set(q.section, bucket);
  }
  return Array.from(bySection.values()).map(bucket => shuffleArray(bucket));
}

function pickScatteredFromBuckets(buckets: Question[][], target: number): Question[] {
  if (target <= 0 || buckets.length === 0) return [];

  const queues = shuffleArray(buckets).map(b => [...b]);
  const picked: Question[] = [];

  while (picked.length < target) {
    let progressed = false;
    const roundOrder = shuffleArray(queues);
    for (const queue of roundOrder) {
      if (picked.length >= target) break;
      const item = queue.shift();
      if (item) {
        picked.push(item);
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  return picked;
}

export function getCustomQuestions(targetCount: number): QuizQuestion[] {
  const count = Math.min(Math.max(1, targetCount), TOTAL_QUESTIONS_COUNT);
  const mcqPool = [...bo1Questions, ...svQuestions, ...bo2McqQuestions];

  const rawTfTarget =
    count >= 6
      ? Math.max(2, Math.round((count * bo2TfQuestions.length) / TOTAL_QUESTIONS_COUNT))
      : count >= 2
        ? 1
        : 0;
  const tfTarget = Math.min(bo2TfQuestions.length, Math.max(count - mcqPool.length, rawTfTarget));
  const mcqTarget = count - tfTarget;

  const chosenMcq = pickScatteredFromBuckets(groupBySection(mcqPool), mcqTarget);
  const chosenTf = pickScatteredFromBuckets(groupBySection(bo2TfQuestions), tfTarget);

  const combined = shuffleArray([...chosenMcq, ...chosenTf]);
  return combined.map((q, idx) => prepareQuizQuestion(q, idx));
}

export function getQuestionsForBlock(blockId: string, customCount: number = 30): QuizQuestion[] | null {
  if (blockId === 'full') {
    return shuffleArray(bo1Questions).map((q, idx) => prepareQuizQuestion(q, idx));
  }
  if (blockId === 'full_2') {
    return shuffleArray([...svQuestions, ...bo2McqQuestions]).map((q, idx) =>
      prepareQuizQuestion(q, idx)
    );
  }
  if (blockId === 'full_tf') {
    return shuffleArray(bo2TfQuestions).map((q, idx) => prepareQuizQuestion(q, idx));
  }
  if (blockId === 'custom') {
    return getCustomQuestions(customCount);
  }

  const block = BLOCKS_METADATA.find(b => b.id === blockId && b.type === 'section');
  if (!block || block.sectionNumber === undefined) {
    return null;
  }

  const sectionQuestions = ALL_QUESTIONS.filter(q => q.section === block.sectionNumber);
  return shuffleArray(sectionQuestions).map((q, idx) => prepareQuizQuestion(q, idx));
}

export function getNextBlock(blockId: string): QuizBlock | null {
  const sectionBlocks = BLOCKS_METADATA.filter(b => b.type === 'section');
  const secIdx = sectionBlocks.findIndex(b => b.id === blockId);
  if (secIdx >= 0) {
    return sectionBlocks[secIdx + 1] || null;
  }

  const fullOrder = ['full', 'full_2', 'full_tf'];
  const fullIdx = fullOrder.indexOf(blockId);
  if (fullIdx >= 0 && fullIdx + 1 < fullOrder.length) {
    return BLOCKS_METADATA.find(b => b.id === fullOrder[fullIdx + 1]) || null;
  }

  return null;
}

export function getWrongReviewQuestions(
  bank: WrongBankMap,
  maxCount: number = WRONG_REVIEW_LIMIT
): {
  questions: QuizQuestion[];
  poolMode: 'active' | 'level0' | 'empty';
  totalInPool: number;
} {
  const active: { q: Question; level: number }[] = [];
  const level0: { q: Question; level: number }[] = [];

  for (const entry of Object.values(bank || {})) {
    const q = QUESTION_BY_ID.get(entry.questionId);
    if (!q) continue;
    if (entry.level > 0) {
      active.push({ q, level: entry.level });
    } else if (entry.level === 0) {
      level0.push({ q, level: 0 });
    }
  }

  if (active.length > 0) {
    const byLevel = new Map<number, { q: Question; level: number }[]>();
    for (const item of active) {
      const list = byLevel.get(item.level) || [];
      list.push(item);
      byLevel.set(item.level, list);
    }

    const levelsDesc = Array.from(byLevel.keys()).sort((a, b) => b - a);
    const chosen: { q: Question; level: number }[] = [];

    for (const lvl of levelsDesc) {
      if (chosen.length >= maxCount) break;
      const need = maxCount - chosen.length;
      const bucket = shuffleArray(byLevel.get(lvl)!);
      chosen.push(...bucket.slice(0, need));
    }

    return {
      questions: chosen.map((item, idx) => ({
        ...prepareQuizQuestion(item.q, idx),
        wrongLevel: item.level
      })),
      poolMode: 'active',
      totalInPool: active.length
    };
  }

  if (level0.length > 0) {
    const chosen = shuffleArray(level0).slice(0, maxCount);
    return {
      questions: chosen.map((item, idx) => ({
        ...prepareQuizQuestion(item.q, idx),
        wrongLevel: 0
      })),
      poolMode: 'level0',
      totalInPool: level0.length
    };
  }

  return { questions: [], poolMode: 'empty', totalInPool: 0 };
}

export function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
