import { NextResponse, connection } from 'next/server';
import { getUserWrongBank, saveUserWrongUpdates } from '@/lib/db';
import { WrongQuestionEntry } from '@/lib/wrongBank';
import { noCacheJson } from '@/lib/apiResponse';

export async function GET(req: Request) {
  await connection();
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (!username || !username.trim()) {
    return noCacheJson({ error: 'Thiếu tên người dùng' }, 400);
  }

  try {
    const wrongBank = await getUserWrongBank(username);
    return noCacheJson({ wrongBank });
  } catch (err: any) {
    return noCacheJson({ error: err?.message || 'Lỗi tải ngân hàng câu sai' }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, updates } = body as {
      username?: string;
      updates?: WrongQuestionEntry[];
    };

    if (!username || !username.trim() || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const wrongBank = await saveUserWrongUpdates(username, updates);
    return NextResponse.json({ success: true, wrongBank });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

