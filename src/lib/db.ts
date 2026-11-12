import fs from 'fs';
import path from 'path';
import { WrongBankMap, WrongQuestionEntry, mergeWrongUpdates } from './wrongBank';

export interface ScoreRecord {
  id: string;
  username: string;
  blockId: string;
  blockTitle: string;
  score: number;
  totalQuestions: number;
  timeSeconds: number;
  mode: 'instant' | 'exam';
  createdAt: string;
}

export interface UserStats {
  username: string;
  totalAttempts: number;
  totalCorrect: number;
  totalQuestions: number;
  lastActive: string;
}

export interface DbData {
  users: string[];
  scores: ScoreRecord[];
  wrongQuestions?: Record<string, WrongBankMap>;
}

let memoryDb: DbData = {
  users: [],
  scores: [],
  wrongQuestions: {}
};

export function normalizeDbData(raw: unknown): DbData {
  let parsed = raw;
  while (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      break;
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { users: [], scores: [], wrongQuestions: {} };
  }
  const obj = parsed as Record<string, unknown>;
  return {
    users: Array.isArray(obj.users)
      ? obj.users.filter((u): u is string => typeof u === 'string')
      : [],
    scores: Array.isArray(obj.scores) ? (obj.scores as ScoreRecord[]) : [],
    wrongQuestions:
      obj.wrongQuestions && typeof obj.wrongQuestions === 'object' && !Array.isArray(obj.wrongQuestions)
        ? (obj.wrongQuestions as Record<string, WrongBankMap>)
        : {}
  };
}

interface StorageConfig {
  restUrl?: string;
  restToken?: string;
  redisUrl?: string;
}

// Dynamic credential resolution for Vercel KV / Upstash Redis with any prefix (KV, STORAGE, etc.)
export function getStorageConfig(): StorageConfig {
  const restPairs: Array<[string | undefined, string | undefined]> = [
    [process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN],
    [process.env.STORAGE_KV_REST_API_URL, process.env.STORAGE_KV_REST_API_TOKEN],
    [process.env.STORAGE_REST_API_URL, process.env.STORAGE_REST_API_TOKEN],
    [process.env.STORAGE_KV_REST_URL, process.env.STORAGE_KV_REST_TOKEN],
    [process.env.STORAGE_REST_URL, process.env.STORAGE_REST_TOKEN],
    [process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN],
    [process.env.STORAGE_REDIS_REST_URL, process.env.STORAGE_REDIS_REST_TOKEN]
  ];

  let restUrl: string | undefined;
  let restToken: string | undefined;

  for (const [u, t] of restPairs) {
    if (u && t) {
      restUrl = u.replace(/\/+$/, '');
      restToken = t;
      break;
    }
  }

  if (!restUrl || !restToken) {
    for (const [key, val] of Object.entries(process.env)) {
      if (!val) continue;
      for (const suffix of ['_REST_API_URL', '_REST_URL']) {
        if (key.endsWith(suffix)) {
          const prefix = key.slice(0, -suffix.length);
          const tokenKey =
            suffix === '_REST_API_URL' ? `${prefix}_REST_API_TOKEN` : `${prefix}_REST_TOKEN`;
          const tok = process.env[tokenKey];
          if (tok) {
            restUrl = val.replace(/\/+$/, '');
            restToken = tok;
            break;
          }
        }
      }
      if (restUrl && restToken) break;
    }
  }

  const directRedisUrls = [
    process.env.STORAGE_URL,
    process.env.STORAGE_REDIS_URL,
    process.env.KV_URL,
    process.env.REDIS_URL,
    process.env.UPSTASH_REDIS_URL,
    process.env.STORAGE_KV_URL
  ];

  let redisUrl: string | undefined = directRedisUrls.find(
    (v) => typeof v === 'string' && (v.startsWith('redis://') || v.startsWith('rediss://'))
  );

  if (!redisUrl) {
    for (const [key, val] of Object.entries(process.env)) {
      if (
        val &&
        (val.startsWith('redis://') || val.startsWith('rediss://')) &&
        (key.endsWith('_URL') || key.endsWith('_REDIS_URL'))
      ) {
        redisUrl = val;
        break;
      }
    }
  }

  return { restUrl, restToken, redisUrl };
}

async function kvGet(key: string, url: string, token: string): Promise<DbData | null> {
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`KV get failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  if (data?.error) {
    throw new Error(`KV get error: ${data.error}`);
  }
  if (data?.result === null || data?.result === undefined) {
    return null;
  }
  return normalizeDbData(data.result);
}

async function kvSet(key: string, value: DbData, url: string, token: string): Promise<void> {
  // Send Upstash command tuple so the JSON string is stored once (never double-encoded)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(['SET', key, JSON.stringify(value)]),
    cache: 'no-store'
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`KV set failed (${res.status}): ${errText}`);
  }
  const data = await res.json().catch(() => null);
  if (data?.error) {
    throw new Error(`KV set error: ${data.error}`);
  }
}

let cachedRedisClient: { url: string; client: any } | null = null;

async function getRedisClient(redisUrl: string) {
  if (cachedRedisClient && cachedRedisClient.url === redisUrl) {
    const status = cachedRedisClient.client.status;
    if (status !== 'end' && status !== 'close') {
      return cachedRedisClient.client;
    }
  }
  const { default: Redis } = await import('ioredis');
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: false,
    connectTimeout: 5000
  });
  client.on('error', (err: Error) => {
    console.error('Redis client error:', err.message);
  });
  cachedRedisClient = { url: redisUrl, client };
  return client;
}

async function redisGet(key: string, redisUrl: string): Promise<DbData | null> {
  const client = await getRedisClient(redisUrl);
  const raw = await client.get(key);
  if (raw === null || raw === undefined) return null;
  return normalizeDbData(raw);
}

async function redisSet(key: string, value: DbData, redisUrl: string): Promise<void> {
  const client = await getRedisClient(redisUrl);
  await client.set(key, JSON.stringify(value));
}

// Local filesystem paths
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_DIR = isServerless ? '/tmp' : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'quiz_db.json');

function ensureLocalDb(): DbData {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial: DbData = { users: [], scores: [] };
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
      } catch (w) {}
      return memoryDb;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = normalizeDbData(JSON.parse(raw));
    memoryDb = parsed;
    return parsed;
  } catch (err) {
    return memoryDb;
  }
}

function saveLocalDb(data: DbData) {
  memoryDb = data;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    // Read-only filesystem fallback
  }
}

export async function getDbData(): Promise<DbData> {
  const { restUrl, restToken, redisUrl } = getStorageConfig();
  if (restUrl && restToken) {
    const cloudDb = await kvGet('quiz_master_db', restUrl, restToken);
    return cloudDb ?? { users: [], scores: [], wrongQuestions: {} };
  }
  if (redisUrl) {
    const tcpDb = await redisGet('quiz_master_db', redisUrl);
    return tcpDb ?? { users: [], scores: [], wrongQuestions: {} };
  }
  return ensureLocalDb();
}

export async function saveDbData(data: DbData): Promise<void> {
  const normalized = normalizeDbData(data);
  const { restUrl, restToken, redisUrl } = getStorageConfig();
  if (restUrl && restToken) {
    await kvSet('quiz_master_db', normalized, restUrl, restToken);
    saveLocalDb(normalized);
    return;
  }
  if (redisUrl) {
    await redisSet('quiz_master_db', normalized, redisUrl);
    saveLocalDb(normalized);
    return;
  }
  saveLocalDb(normalized);
}

export async function getStorageHealth() {
  const { restUrl, restToken, redisUrl } = getStorageConfig();
  const detectedEnvKeys = Object.keys(process.env)
    .filter((k) => /^(KV|STORAGE|REDIS|UPSTASH)_/i.test(k))
    .sort();

  const backend: 'upstash-rest' | 'redis-tcp' | 'local-file' =
    restUrl && restToken ? 'upstash-rest' : redisUrl ? 'redis-tcp' : 'local-file';

  let connected = backend === 'local-file';
  let error: string | undefined;
  let db: DbData = { users: [], scores: [], wrongQuestions: {} };

  try {
    db = await getDbData();
    if (backend !== 'local-file') {
      connected = true;
    }
  } catch (e: any) {
    error = e?.message || 'Storage connection error';
    connected = false;
  }

  return {
    ok: connected,
    backend,
    hasRestConfig: Boolean(restUrl && restToken),
    hasRedisUrl: Boolean(redisUrl),
    isVercel: Boolean(process.env.VERCEL),
    detectedEnvKeys,
    usersCount: db.users.length,
    scoresCount: db.scores.length,
    wrongUsersCount: Object.keys(db.wrongQuestions || {}).length,
    ...(error ? { error } : {})
  };
}

export async function getAllUsers(): Promise<string[]> {
  const db = await getDbData();
  return db.users || [];
}

export async function addUser(username: string): Promise<string[]> {
  const clean = username.trim();
  const db = await getDbData();
  if (!clean) return db.users || [];
  if (!db.users.includes(clean)) {
    db.users.unshift(clean);
    await saveDbData(db);
  }
  return db.users;
}

export async function saveScore(record: Omit<ScoreRecord, 'id' | 'createdAt'>): Promise<ScoreRecord> {
  const db = await getDbData();
  const newRecord: ScoreRecord = {
    ...record,
    id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString()
  };

  if (!db.users.includes(newRecord.username)) {
    db.users.unshift(newRecord.username);
  }

  db.scores.push(newRecord);
  await saveDbData(db);
  return newRecord;
}

export async function getUserBestScores(username: string): Promise<Record<string, { bestScore: number; totalQuestions: number; bestTimeSeconds: number }>> {
  const db = await getDbData();
  const clean = username.trim();
  const userScores = db.scores.filter(s => s.username.toLowerCase() === clean.toLowerCase());

  const bestMap: Record<string, { bestScore: number; totalQuestions: number; bestTimeSeconds: number }> = {};

  for (const s of userScores) {
    const curr = bestMap[s.blockId];
    if (!curr) {
      bestMap[s.blockId] = {
        bestScore: s.score,
        totalQuestions: s.totalQuestions,
        bestTimeSeconds: s.timeSeconds
      };
    } else {
      if (s.score > curr.bestScore || (s.score === curr.bestScore && s.timeSeconds < curr.bestTimeSeconds)) {
        bestMap[s.blockId] = {
          bestScore: s.score,
          totalQuestions: s.totalQuestions,
          bestTimeSeconds: s.timeSeconds
        };
      }
    }
  }

  return bestMap;
}

export async function getLeaderboardByBlock(blockId: string): Promise<ScoreRecord[]> {
  const db = await getDbData();
  const blockScores = db.scores.filter(s => s.blockId === blockId);

  const userBest = new Map<string, ScoreRecord>();
  for (const s of blockScores) {
    const prev = userBest.get(s.username);
    if (!prev) {
      userBest.set(s.username, s);
    } else {
      if (s.score > prev.score || (s.score === prev.score && s.timeSeconds < prev.timeSeconds)) {
        userBest.set(s.username, s);
      }
    }
  }

  const list = Array.from(userBest.values());
  list.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.timeSeconds - b.timeSeconds;
  });

  return list.slice(0, 50);
}

export async function getAttemptsLeaderboard(): Promise<UserStats[]> {
  const db = await getDbData();
  const statsMap = new Map<string, UserStats>();

  for (const u of db.users) {
    statsMap.set(u, {
      username: u,
      totalAttempts: 0,
      totalCorrect: 0,
      totalQuestions: 0,
      lastActive: ''
    });
  }

  for (const s of db.scores) {
    let stat = statsMap.get(s.username);
    if (!stat) {
      stat = {
        username: s.username,
        totalAttempts: 0,
        totalCorrect: 0,
        totalQuestions: 0,
        lastActive: s.createdAt
      };
      statsMap.set(s.username, stat);
    }
    stat.totalAttempts += 1;
    stat.totalCorrect += s.score;
    stat.totalQuestions += s.totalQuestions;
    if (!stat.lastActive || new Date(s.createdAt) > new Date(stat.lastActive)) {
      stat.lastActive = s.createdAt;
    }
  }

  const list = Array.from(statsMap.values()).filter(s => s.totalAttempts > 0);
  list.sort((a, b) => {
    if (b.totalAttempts !== a.totalAttempts) {
      return b.totalAttempts - a.totalAttempts;
    }
    return b.totalCorrect - a.totalCorrect;
  });

  return list.slice(0, 50);
}

function getNormalizedWrongKey(username: string): string {
  return username.trim().toLowerCase();
}

export async function getUserWrongBank(username: string): Promise<WrongBankMap> {
  const key = getNormalizedWrongKey(username);
  if (!key) return {};
  const db = await getDbData();
  const map = db.wrongQuestions || {};
  if (map[key]) return map[key];
  // Backwards check in case non-lowercased key existed
  const matchedKey = Object.keys(map).find(k => k.toLowerCase() === key);
  return matchedKey ? map[matchedKey] : {};
}

export async function saveUserWrongUpdates(
  username: string,
  updates: WrongQuestionEntry[]
): Promise<WrongBankMap> {
  const clean = username.trim();
  const key = getNormalizedWrongKey(clean);
  if (!key) return {};

  const db = await getDbData();
  if (!db.wrongQuestions) db.wrongQuestions = {};

  const current = db.wrongQuestions[key] || {};
  const next = mergeWrongUpdates(current, updates);
  db.wrongQuestions[key] = next;

  if (!db.users.includes(clean)) {
    db.users.unshift(clean);
  }

  await saveDbData(db);
  return next;
}
