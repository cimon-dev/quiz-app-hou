import { NextResponse } from 'next/server';
import { getQuestionsForBlock, getWrongReviewQuestions } from '@/lib/quiz';
import { getUserWrongBank } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const blockId = searchParams.get('blockId') || '1';
  const parsedCount = parseInt(searchParams.get('count') || '30', 10);
  const count = isNaN(parsedCount) ? 30 : parsedCount;

  if (blockId === 'wrong') {
    const username = searchParams.get('username') || '';
    const bank = username ? await getUserWrongBank(username) : {};
    const result = getWrongReviewQuestions(bank);
    return NextResponse.json({
      blockId,
      totalQuestions: result.questions.length,
      poolMode: result.poolMode,
      totalInPool: result.totalInPool,
      questions: result.questions
    });
  }

  const questions = getQuestionsForBlock(blockId, count);

  if (!questions) {
    return NextResponse.json({ error: 'Khối ôn tập không hợp lệ' }, { status: 400 });
  }

  return NextResponse.json({
    blockId,
    totalQuestions: questions.length,
    questions
  });
}
