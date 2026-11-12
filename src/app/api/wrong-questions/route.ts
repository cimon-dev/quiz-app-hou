import { NextResponse } from 'next/server';
import { getUserWrongBank, saveUserWrongUpdates } from '@/lib/db';
import { WrongQuestionEntry } from '@/lib/wrongBank';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (!username || !username.trim()) {
    return NextResponse.json({ error: 'Thiếu tên người dùng' }, { status: 400 });
  }

  const wrongBank = await getUserWrongBank(username);
  return NextResponse.json({ wrongBank });
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

