import { NextResponse } from 'next/server';
import { getUserBestScores } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ best: {} });
  }

  const best = await getUserBestScores(username);
  return NextResponse.json({ best });
}
