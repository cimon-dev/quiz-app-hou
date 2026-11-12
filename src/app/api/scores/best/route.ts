import { connection } from 'next/server';
import { getUserBestScores } from '@/lib/db';
import { noCacheJson } from '@/lib/apiResponse';

export async function GET(req: Request) {
  await connection();
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (!username) {
    return noCacheJson({ best: {} });
  }

  try {
    const best = await getUserBestScores(username);
    return noCacheJson({ best });
  } catch (err: any) {
    return noCacheJson({ error: err?.message || 'Lỗi tải điểm cao nhất' }, 500);
  }
}
