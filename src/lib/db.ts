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

// Dynamic credential resolution for Vercel KV / Upstash Redis with any prefix (KV, STORAGE, etc.)
function getKvCredentials(): { url?: string; token?: string } {
  const directUrl =
    process.env.KV_REST_API_URL ||
    process.env.STORAGE_REST_API_URL ||
    process.env.STORAGE_KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;

  const directToken =
    process.env.KV_REST_API_TOKEN ||
    process.env.STORAGE_REST_API_TOKEN ||
    process.env.STORAGE_KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;

  if (directUrl && directToken) {
    return { url: directUrl, token: directToken };
  }

  for (const [key, val] of Object.entries(process.env)) {
    if (key.endsWith('_REST_API_URL') && val) {
      const prefix = key.replace('_REST_API_URL', '');
      const tokenKey = `${prefix}_REST_API_TOKEN`;
      if (process.env[tokenKey]) {
        return { url: val, token: process.env[tokenKey] };
      }
    }
  }

  return {};
}

async function kvGet<T>(key: string): Promise<T | null> {
  const { url, token } = getKvCredentials();
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/get/${key}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (data.result) {
        return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      }
    }
  } catch (e) {
    console.error('KV get error:', e);
  }
  return null;
}

async function kvSet(key: string, value: any): Promise<void> {
  const { url, token } = getKvCredentials();
  if (!url || !token) return;
  try {
    await fetch(`${url}/set/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(typeof value === 'string' ? value : JSON.stringify(value)),
      cache: 'no-store'
    });
  } catch (e) {
    console.error('KV set error:', e);
  }
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
    const parsed = JSON.parse(raw);
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
  const { url, token } = getKvCredentials();
  if (url && token) {
    const cloudDb = await kvGet<DbData>('quiz_master_db');
    if (cloudDb) return cloudDb;
  }
  return ensureLocalDb();
}

export async function saveDbData(data: DbData): Promise<void> {
  const { url, token } = getKvCredentials();
  if (url && token) {
    await kvSet('quiz_master_db', data);
  }
  saveLocalDb(data);
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
