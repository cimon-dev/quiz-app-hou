import { NextResponse } from 'next/server';
import { getSectionQuestions, getAllQuestionsShuffled, getCustomQuestions } from '@/lib/quiz';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const blockId = searchParams.get('blockId') || '1';
  const count = parseInt(searchParams.get('count') || '30', 10);

  let questions = [];

  if (blockId === 'full') {
    questions = getAllQuestionsShuffled();
  } else if (blockId === 'custom') {
    questions = getCustomQuestions(count);
  } else {
    const sectionNum = parseInt(blockId, 10);
    if (isNaN(sectionNum) || sectionNum < 1 || sectionNum > 15) {
      return NextResponse.json({ error: 'Khối ôn tập không hợp lệ' }, { status: 400 });
    }
    questions = getSectionQuestions(sectionNum);
  }

  return NextResponse.json({
    blockId,
    totalQuestions: questions.length,
    questions
  });
}

