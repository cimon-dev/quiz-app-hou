import { connection } from 'next/server';
import { getLeaderboardByBlock, getAttemptsLeaderboard } from '@/lib/db';
import { noCacheJson } from '@/lib/apiResponse';

export async function GET(req: Request) {
  await connection();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'block';
  const blockId = searchParams.get('blockId') || '1';

  try {
    if (type === 'attempts') {
      const attempts = await getAttemptsLeaderboard();
      return noCacheJson({ attempts });
    }

    const ranking = await getLeaderboardByBlock(blockId);
    return noCacheJson({ ranking, blockId });
  } catch (err: any) {
    return noCacheJson({ error: err?.message || 'Lỗi tải bảng xếp hạng' }, 500);
  }
}
