import { NextResponse } from 'next/server';
import { saveScore } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, blockId, blockTitle, score, totalQuestions, timeSeconds, mode } = body;

    if (!username || !blockId || score === undefined || !totalQuestions) {
      return NextResponse.json({ error: 'Dữ liệu kết quả không đầy đủ' }, { status: 400 });
    }

    const record = await saveScore({
      username: username.trim(),
      blockId: String(blockId),
      blockTitle: blockTitle || `Khối ${blockId}`,
      score: Number(score),
      totalQuestions: Number(totalQuestions),
      timeSeconds: Number(timeSeconds || 0),
      mode: mode === 'instant' ? 'instant' : 'exam'
    });

    return NextResponse.json({ success: true, record });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
