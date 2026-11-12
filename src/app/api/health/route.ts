import { connection } from 'next/server';
import { getStorageHealth } from '@/lib/db';
import { noCacheJson } from '@/lib/apiResponse';

export async function GET() {
  await connection();
  const health = await getStorageHealth();
  return noCacheJson(health, health.ok ? 200 : 503);
}
