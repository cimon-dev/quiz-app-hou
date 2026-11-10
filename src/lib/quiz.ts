import rawQuestions from '@/data/questions.json';

export interface Question {
  id: string;
  section: number;
  sectionTitle: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface QuizQuestion extends Question {
  originalIndex: number;
}

export interface QuizBlock {
  id: string;
  title: string;
  subtitle: string;
  count: number;
  type: 'section' | 'full' | 'custom';
  sectionNumber?: number;
}

export const BLOCKS_METADATA: QuizBlock[] = [
  ...Array.from({ length: 15 }, (_, i) => ({
    id: String(i + 1),
    title: `Ôn tập ${i + 1}`,
    subtitle: '12 câu',
    count: 12,
    type: 'section' as const,
    sectionNumber: i + 1
  })),
  {
    id: 'full',
    title: 'Toàn bộ câu hỏi',
    subtitle: '180 câu',
    count: 180,
    type: 'full' as const
  },
  {
    id: 'custom',
    title: 'Tùy chọn số câu',
    subtitle: 'Tự chọn số lượng',
    count: 30,
    type: 'custom' as const
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

export function shuffleQuestionOptions(q: Question, index: number): QuizQuestion {
  const originalAnswerText = q.options[q.answer];
  const shuffledOptions = shuffleArray(q.options);
  const newAnswerIndex = shuffledOptions.indexOf(originalAnswerText);

  return {
    ...q,
    originalIndex: index,
    options: shuffledOptions,
    answer: newAnswerIndex
  };
}

export function getSectionQuestions(sectionNum: number): QuizQuestion[] {
  const sectionQuestions = (rawQuestions as Question[]).filter(q => q.section === sectionNum);
  const shuffledQuestions = shuffleArray(sectionQuestions);
  return shuffledQuestions.map((q, idx) => shuffleQuestionOptions(q, idx));
}

export function getAllQuestionsShuffled(): QuizQuestion[] {
  const all = [...(rawQuestions as Question[])];
  const shuffled = shuffleArray(all);
  return shuffled.map((q, idx) => shuffleQuestionOptions(q, idx));
}

export function getCustomQuestions(targetCount: number): QuizQuestion[] {
  const count = Math.min(Math.max(1, targetCount), 180);
  const allBySection: Record<number, Question[]> = {};

  for (let s = 1; s <= 15; s++) {
    allBySection[s] = shuffleArray(
      (rawQuestions as Question[]).filter(q => q.section === s)
    );
  }

  const basePerSection = Math.floor(count / 15);
  const remainder = count % 15;

  const sectionIds = shuffleArray(Array.from({ length: 15 }, (_, i) => i + 1));
  const chosenQuestions: Question[] = [];

  for (let i = 0; i < 15; i++) {
    const sId = sectionIds[i];
    const take = basePerSection + (i < remainder ? 1 : 0);
    const available = allBySection[sId];
    chosenQuestions.push(...available.slice(0, take));
  }

  const finalShuffled = shuffleArray(chosenQuestions);
  return finalShuffled.map((q, idx) => shuffleQuestionOptions(q, idx));
}

export function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
