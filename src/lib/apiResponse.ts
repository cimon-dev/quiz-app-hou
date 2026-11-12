import { NextResponse } from 'next/server';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
};

/**
 * Returns a JSON response with strict no-store headers so neither Next.js nor CDNs cache user state.
 */
export function noCacheJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: NO_CACHE_HEADERS
  });
}
