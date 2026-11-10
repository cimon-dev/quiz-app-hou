import { NextResponse } from 'next/server';
import { getAllUsers, addUser } from '@/lib/db';

export async function GET() {
  const users = await getAllUsers();
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username } = body;
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Tên người dùng không hợp lệ' }, { status: 400 });
    }
    const users = await addUser(username);
    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
