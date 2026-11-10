import { NextResponse } from 'next/server';
import { getLeaderboardByBlock, getAttemptsLeaderboard } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'block';
  const blockId = searchParams.get('blockId') || '1';

  if (type === 'attempts') {
    const attempts = await getAttemptsLeaderboard();
    return NextResponse.json({ attempts });
  }

  const ranking = await getLeaderboardByBlock(blockId);
  return NextResponse.json({ ranking, blockId });
}
