export const WRONG_DEFAULT_LEVEL = 2;
export const WRONG_REVIEW_LIMIT = 15;

export interface WrongQuestionEntry {
  questionId: string;
  level: number;
  wrongCount: number;
  updatedAt: number;
}

export type WrongBankMap = Record<string, WrongQuestionEntry>;

export interface WrongBankStats {
  activeCount: number;
  level0Count: number;
  highCount: number;
  level2Count: number;
  level1Count: number;
}

export interface WrongOutcomeResult {
  nextBank: WrongBankMap;
  changedEntry: WrongQuestionEntry | null;
  previousLevel: number | undefined;
}

function getLocalStorageKey(username: string): string {
  return `quiz_wrong_bank_${username.trim().toLowerCase()}`;
}

/**
 * Applies a single answered outcome to the wrong-question bank:
 * - Wrong answer: sets level = 2 if unseen or level 0, otherwise increments level (+1).
 * - Correct answer: if tracked, decrements level (-1) down to minimum 0 (retaining level 0 archive).
 */
export function applyAnswerToWrongBank(
  bank: WrongBankMap,
  questionId: string,
  isCorrect: boolean,
  now: number = Date.now()
): WrongOutcomeResult {
  const prev = bank[questionId];
  const previousLevel = prev?.level;

  if (!isCorrect) {
    const nextLevel = !prev || prev.level <= 0 ? WRONG_DEFAULT_LEVEL : prev.level + 1;
    const entry: WrongQuestionEntry = {
      questionId,
      level: nextLevel,
      wrongCount: (prev?.wrongCount || 0) + 1,
      updatedAt: now
    };
    return {
      nextBank: { ...bank, [questionId]: entry },
      changedEntry: entry,
      previousLevel
    };
  }

  if (!prev) {
    return { nextBank: bank, changedEntry: null, previousLevel: undefined };
  }

  const nextLevel = Math.max(0, prev.level - 1);
  const entry: WrongQuestionEntry = {
    questionId,
    level: nextLevel,
    wrongCount: prev.wrongCount,
    updatedAt: now
  };
  return {
    nextBank: { ...bank, [questionId]: entry },
    changedEntry: entry,
    previousLevel
  };
}

export function mergeWrongBanks(base: WrongBankMap, incoming: WrongBankMap): WrongBankMap {
  const merged: WrongBankMap = { ...base };
  for (const [qId, entry] of Object.entries(incoming || {})) {
    if (!entry || typeof entry.level !== 'number') continue;
    const existing = merged[qId];
    if (!existing || entry.updatedAt > existing.updatedAt) {
      merged[qId] = { ...entry, questionId: qId };
    }
  }
  return merged;
}

export function mergeWrongUpdates(
  base: WrongBankMap,
  updates: WrongQuestionEntry[]
): WrongBankMap {
  if (!updates || updates.length === 0) return base;
  const next: WrongBankMap = { ...base };
  for (const item of updates) {
    if (!item?.questionId || typeof item.level !== 'number') continue;
    const existing = next[item.questionId];
    if (!existing || item.updatedAt >= existing.updatedAt) {
      next[item.questionId] = { ...item };
    }
  }
  return next;
}

export function getWrongBankStats(
  bank: WrongBankMap,
  validIds?: Set<string>
): WrongBankStats {
  let activeCount = 0;
  let level0Count = 0;
  let highCount = 0;
  let level2Count = 0;
  let level1Count = 0;

  for (const entry of Object.values(bank || {})) {
    if (validIds && !validIds.has(entry.questionId)) continue;
    if (entry.level > 0) {
      activeCount++;
      if (entry.level >= 3) highCount++;
      else if (entry.level === 2) level2Count++;
      else if (entry.level === 1) level1Count++;
    } else if (entry.level === 0) {
      level0Count++;
    }
  }

  return { activeCount, level0Count, highCount, level2Count, level1Count };
}

export function loadLocalWrongBank(username: string): WrongBankMap {
  if (typeof window === 'undefined' || !username.trim()) return {};
  try {
    const raw = localStorage.getItem(getLocalStorageKey(username));
    return raw ? (JSON.parse(raw) as WrongBankMap) : {};
  } catch {
    return {};
  }
}

export function saveLocalWrongBank(username: string, bank: WrongBankMap): void {
  if (typeof window === 'undefined' || !username.trim()) return;
  try {
    localStorage.setItem(getLocalStorageKey(username), JSON.stringify(bank));
  } catch (e) {
    console.error(e);
  }
}

export async function fetchAndMergeWrongBank(username: string): Promise<WrongBankMap> {
  const clean = username.trim();
  const local = loadLocalWrongBank(clean);
  if (!clean) return local;

  try {
    const res = await fetch(`/api/wrong-questions?username=${encodeURIComponent(clean)}`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      const serverBank = (data.wrongBank || {}) as WrongBankMap;
      const merged = mergeWrongBanks(local, serverBank);
      saveLocalWrongBank(clean, merged);

      // Push newer local-only entries up to server if needed
      const unsynced = Object.values(local).filter(item => {
        const sItem = serverBank[item.questionId];
        return !sItem || item.updatedAt > sItem.updatedAt;
      });
      if (unsynced.length > 0) {
        syncWrongEntriesToServer(clean, unsynced).catch(() => {});
      }

      return merged;
    }
  } catch (e) {
    console.error(e);
  }
  return local;
}

export async function syncWrongEntriesToServer(
  username: string,
  updates: WrongQuestionEntry[]
): Promise<void> {
  const clean = username.trim();
  if (!clean || updates.length === 0) return;
  try {
    await fetch('/api/wrong-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: clean, updates })
    });
  } catch (e) {
    console.error(e);
  }
}

