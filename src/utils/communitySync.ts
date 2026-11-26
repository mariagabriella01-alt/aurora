import type { Prayer, ReasonToLive, SanctuaryData, Vent, VentReply } from '../types';

const CONFIRMED_CACHE_KEY = 'aurora_confirmed_community_v1';

interface ConfirmedCommunityCache {
  vents: Vent[];
  prayers: Prayer[];
  reasons: ReasonToLive[];
}

function emptyCache(): ConfirmedCommunityCache {
  return { vents: [], prayers: [], reasons: [] };
}

export function loadConfirmedCommunityCache(): ConfirmedCommunityCache {
  if (typeof window === 'undefined') return emptyCache();
  try {
    const raw = window.localStorage.getItem(CONFIRMED_CACHE_KEY);
    if (!raw) return emptyCache();
    const parsed = JSON.parse(raw) as Partial<ConfirmedCommunityCache>;
    return {
      vents: Array.isArray(parsed.vents) ? parsed.vents : [],
      prayers: Array.isArray(parsed.prayers) ? parsed.prayers : [],
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
    };
  } catch {
    return emptyCache();
  }
}

function writeConfirmedCommunityCache(cache: ConfirmedCommunityCache): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONFIRMED_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function mergeReplies(existing: VentReply[], incoming: VentReply[]): VentReply[] {
  const map = new Map<string, VentReply>();
  for (const rep of existing) {
    if (rep && typeof rep.id === 'string') {
      map.set(rep.id, rep);
    }
  }
  for (const rep of incoming) {
    if (rep && typeof rep.id === 'string') {
      map.set(rep.id, rep);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return ta - tb;
  });
}

function mergeVentRecord(base: Vent, extra: Vent): Vent {
  return {
    ...extra,
    ...base,
    embraces: Math.max(base.embraces ?? 0, extra.embraces ?? 0),
    replies: mergeReplies(base.replies ?? [], extra.replies ?? []),
  };
}

export function saveConfirmedVent(vent: Vent): void {
  const cache = loadConfirmedCommunityCache();
  const idx = cache.vents.findIndex((v) => v.id === vent.id);
  if (idx >= 0) {
    cache.vents[idx] = mergeVentRecord(vent, cache.vents[idx]);
  } else {
    cache.vents.unshift(vent);
  }
  writeConfirmedCommunityCache(cache);
}

export function saveConfirmedPrayer(prayer: Prayer): void {
  const cache = loadConfirmedCommunityCache();
  const idx = cache.prayers.findIndex((p) => p.id === prayer.id);
  if (idx >= 0) {
    cache.prayers[idx] = {
      ...cache.prayers[idx],
      ...prayer,
      prayingCount: Math.max(cache.prayers[idx].prayingCount ?? 0, prayer.prayingCount ?? 0),
    };
  } else {
    cache.prayers.unshift(prayer);
  }
  writeConfirmedCommunityCache(cache);
}

export function saveConfirmedReason(reason: ReasonToLive): void {
  const cache = loadConfirmedCommunityCache();
  const idx = cache.reasons.findIndex((r) => r.id === reason.id);
  if (idx >= 0) {
    cache.reasons[idx] = {
      ...cache.reasons[idx],
      ...reason,
      savedCount: Math.max(cache.reasons[idx].savedCount ?? 0, reason.savedCount ?? 0),
    };
  } else {
    cache.reasons.unshift(reason);
  }
  writeConfirmedCommunityCache(cache);
}

function sortNewestFirst<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return tb - ta;
  });
}

export function mergeSanctuaryData(
  serverData: SanctuaryData,
  localBackup: ConfirmedCommunityCache,
  currentState: SanctuaryData,
): SanctuaryData {
  const ventMap = new Map<string, Vent>();
  for (const v of serverData.vents ?? []) {
    ventMap.set(v.id, v);
  }
  for (const v of [...(localBackup.vents ?? []), ...(currentState.vents ?? [])]) {
    const existing = ventMap.get(v.id);
    if (existing) {
      ventMap.set(v.id, mergeVentRecord(existing, v));
    } else {
      ventMap.set(v.id, v);
    }
  }

  const prayerMap = new Map<string, Prayer>();
  for (const p of serverData.prayers ?? []) {
    prayerMap.set(p.id, p);
  }
  for (const p of [...(localBackup.prayers ?? []), ...(currentState.prayers ?? [])]) {
    const existing = prayerMap.get(p.id);
    if (existing) {
      prayerMap.set(p.id, {
        ...existing,
        ...p,
        prayingCount: Math.max(existing.prayingCount ?? 0, p.prayingCount ?? 0),
      });
    } else {
      prayerMap.set(p.id, p);
    }
  }

  const reasonMap = new Map<string, ReasonToLive>();
  for (const r of serverData.reasons ?? []) {
    reasonMap.set(r.id, r);
  }
  for (const r of [...(localBackup.reasons ?? []), ...(currentState.reasons ?? [])]) {
    const existing = reasonMap.get(r.id);
    if (existing) {
      reasonMap.set(r.id, {
        ...existing,
        ...r,
        savedCount: Math.max(existing.savedCount ?? 0, r.savedCount ?? 0),
      });
    } else {
      reasonMap.set(r.id, r);
    }
  }

  return {
    vents: sortNewestFirst(Array.from(ventMap.values())),
    prayers: sortNewestFirst(Array.from(prayerMap.values())),
    reasons: sortNewestFirst(Array.from(reasonMap.values())),
  };
}
