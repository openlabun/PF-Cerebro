import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { RobleUserPayload } from '../auth/auth.service';
import type { LiveHeartbeatDto } from './dto/live-heartbeat.dto';

type LiveMode = 'browsing' | 'sudoku' | 'pvp_lobby' | 'pvp' | 'torneo';
type LiveEventType = 'connected' | 'updated' | 'expired';
type LiveSnapshotListener = (snapshot: LiveSnapshot) => void;

interface LiveSessionRecord {
  sessionKey: string;
  sessionId: string;
  userId: string;
  userName: string;
  email: string;
  mode: LiveMode;
  difficulty: string;
  state: string;
  path: string;
  matchId: string;
  tournamentId: string;
  createdAt: string;
  lastSeenAt: string;
  lastChangedAt: string;
}

export interface LiveSessionSnapshot {
  sessionId: string;
  userId: string;
  userName: string;
  email: string;
  mode: LiveMode;
  difficulty: string;
  state: string;
  path: string;
  matchId: string;
  tournamentId: string;
  createdAt: string;
  lastSeenAt: string;
  lastChangedAt: string;
}

export interface LiveRecentEvent {
  id: string;
  type: LiveEventType;
  userId: string;
  userName: string;
  mode: LiveMode;
  difficulty: string;
  state: string;
  path: string;
  occurredAt: string;
  message: string;
}

export interface LiveSnapshot {
  generatedAt: string;
  onlineUsers: number;
  activeSessions: number;
  sessionsByMode: Record<LiveMode, number>;
  usersByMode: Record<LiveMode, number>;
  sessionsByDifficulty: Record<string, number>;
  currentSessions: LiveSessionSnapshot[];
  recentEvents: LiveRecentEvent[];
}

const LIVE_MODES: LiveMode[] = [
  'browsing',
  'sudoku',
  'pvp_lobby',
  'pvp',
  'torneo',
];

@Injectable()
export class LiveService implements OnModuleInit, OnModuleDestroy {
  private readonly sessionTtlMs = Number(process.env.ADMIN_LIVE_TTL_MS || 35_000);
  private readonly cleanupIntervalMs = Number(
    process.env.ADMIN_LIVE_CLEANUP_INTERVAL_MS || 5_000,
  );
  private readonly maxRecentEvents = Number(
    process.env.ADMIN_LIVE_MAX_EVENTS || 25,
  );
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly sessions = new Map<string, LiveSessionRecord>();
  private readonly listeners = new Map<string, LiveSnapshotListener>();
  private readonly recentEvents: LiveRecentEvent[] = [];

  onModuleInit() {
    this.cleanupTimer = setInterval(
      () => this.removeExpiredSessions(),
      this.cleanupIntervalMs,
    );
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  subscribe(listener: LiveSnapshotListener) {
    const listenerId = crypto.randomUUID();
    this.listeners.set(listenerId, listener);

    return () => {
      this.listeners.delete(listenerId);
    };
  }

  getSnapshot(): LiveSnapshot {
    const sessions = Array.from(this.sessions.values())
      .sort(
        (left, right) =>
          Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt),
      )
      .map(({ sessionKey, ...session }) => {
        void sessionKey;
        return session;
      });

    const onlineUsers = new Set<string>();
    const sessionsByMode = this.createModeCounter();
    const usersByModeSets = this.createModeUserSets();
    const sessionsByDifficulty = new Map<string, number>();

    sessions.forEach((session) => {
      onlineUsers.add(session.userId);
      sessionsByMode[session.mode] += 1;
      usersByModeSets[session.mode].add(session.userId);

      if (session.difficulty) {
        const current = sessionsByDifficulty.get(session.difficulty) || 0;
        sessionsByDifficulty.set(session.difficulty, current + 1);
      }
    });

    const usersByMode = LIVE_MODES.reduce<Record<LiveMode, number>>(
      (accumulator, mode) => {
        accumulator[mode] = usersByModeSets[mode].size;
        return accumulator;
      },
      this.createModeCounter(),
    );

    return {
      generatedAt: new Date().toISOString(),
      onlineUsers: onlineUsers.size,
      activeSessions: sessions.length,
      sessionsByMode,
      usersByMode,
      sessionsByDifficulty: this.mapToSortedRecord(sessionsByDifficulty),
      currentSessions: sessions,
      recentEvents: [...this.recentEvents],
    };
  }

  recordHeartbeat(user: RobleUserPayload, heartbeat: LiveHeartbeatDto) {
    const now = new Date().toISOString();
    const sessionId = this.normalizeText(heartbeat.sessionId, 80) || 'default';
    const sessionKey = this.buildSessionKey(user.sub, sessionId);
    const path = this.normalizePath(heartbeat.path);
    const mode = this.normalizeMode(heartbeat.mode, path);
    const difficulty = this.normalizeDifficulty(heartbeat.difficulty);
    const state = this.normalizeState(heartbeat.state, mode);
    const matchId = this.normalizeText(heartbeat.matchId, 80);
    const tournamentId = this.normalizeText(heartbeat.tournamentId, 80);
    const existing = this.sessions.get(sessionKey);

    const nextSession: LiveSessionRecord = {
      sessionKey,
      sessionId,
      userId: user.sub,
      userName: this.normalizeUserName(user),
      email: this.normalizeText(user.email, 120),
      mode,
      difficulty,
      state,
      path,
      matchId,
      tournamentId,
      createdAt: existing?.createdAt || now,
      lastSeenAt: now,
      lastChangedAt: existing?.lastChangedAt || now,
    };

    const significantChange =
      !existing ||
      existing.mode !== nextSession.mode ||
      existing.difficulty !== nextSession.difficulty ||
      existing.state !== nextSession.state ||
      existing.path !== nextSession.path ||
      existing.matchId !== nextSession.matchId ||
      existing.tournamentId !== nextSession.tournamentId;

    if (significantChange) {
      nextSession.lastChangedAt = now;
      this.pushEvent(this.buildEvent(existing ? 'updated' : 'connected', nextSession, existing));
    }

    this.sessions.set(sessionKey, nextSession);
    this.notifyListeners();

    return {
      ok: true,
      receivedAt: now,
      mode: nextSession.mode,
      difficulty: nextSession.difficulty,
      onlineUsers: this.countUniqueUsers(),
      activeSessions: this.sessions.size,
    };
  }

  private notifyListeners() {
    if (!this.listeners.size) return;

    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener, listenerId) => {
      try {
        listener(snapshot);
      } catch {
        this.listeners.delete(listenerId);
      }
    });
  }

  private removeExpiredSessions() {
    if (!this.sessions.size) return;

    const expirationCutoff = Date.now() - this.sessionTtlMs;
    let removedAny = false;

    this.sessions.forEach((session, sessionKey) => {
      if (Date.parse(session.lastSeenAt) >= expirationCutoff) {
        return;
      }

      this.sessions.delete(sessionKey);
      this.pushEvent(this.buildEvent('expired', session));
      removedAny = true;
    });

    if (removedAny) {
      this.notifyListeners();
    }
  }

  private pushEvent(event: LiveRecentEvent) {
    this.recentEvents.unshift(event);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.length = this.maxRecentEvents;
    }
  }

  private buildEvent(
    type: LiveEventType,
    session: LiveSessionRecord,
    previous?: LiveSessionRecord,
  ): LiveRecentEvent {
    return {
      id: crypto.randomUUID(),
      type,
      userId: session.userId,
      userName: session.userName,
      mode: session.mode,
      difficulty: session.difficulty,
      state: session.state,
      path: session.path,
      occurredAt: new Date().toISOString(),
      message: this.buildEventMessage(type, session, previous),
    };
  }

  private buildEventMessage(
    type: LiveEventType,
    session: LiveSessionRecord,
    previous?: LiveSessionRecord,
  ) {
    const modeLabel = this.getModeLabel(session.mode);
    const difficultyCopy = session.difficulty
      ? ` en ${session.difficulty}`
      : '';

    if (type === 'connected') {
      return `${session.userName} entro a ${modeLabel}${difficultyCopy}.`;
    }

    if (type === 'expired') {
      return `${session.userName} dejo de reportar actividad en ${modeLabel}.`;
    }

    if (previous && previous.mode !== session.mode) {
      return `${session.userName} paso a ${modeLabel}${difficultyCopy}.`;
    }

    if (previous && previous.difficulty !== session.difficulty && session.difficulty) {
      return `${session.userName} cambio a ${session.difficulty} en ${modeLabel}.`;
    }

    if (previous && previous.state !== session.state) {
      return `${session.userName} ahora esta ${this.humanizeState(session.state)} en ${modeLabel}.`;
    }

    return `${session.userName} actualizo su actividad en ${modeLabel}.`;
  }

  private normalizeUserName(user: RobleUserPayload) {
    const directName =
      this.normalizeText(user.nombre, 80) || this.normalizeText(user.name, 80);
    if (directName) {
      return directName;
    }

    const emailPrefix = this.normalizeText(user.email, 120).split('@')[0] || '';
    return emailPrefix || 'Jugador';
  }

  private normalizeMode(mode: string | undefined, path: string): LiveMode {
    const normalized = this.normalizeText(mode, 40).toLowerCase();

    if (normalized === 'sudoku' || normalized === 'singleplayer') {
      return 'sudoku';
    }
    if (normalized === 'pvp') {
      return 'pvp';
    }
    if (normalized === 'pvp_lobby' || normalized === 'pvp-waiting') {
      return 'pvp_lobby';
    }
    if (normalized === 'torneo' || normalized === 'torneos') {
      return 'torneo';
    }
    if (normalized === 'browsing' || normalized === 'exploring') {
      return 'browsing';
    }

    return this.inferModeFromPath(path);
  }

  private inferModeFromPath(path: string): LiveMode {
    if (/^\/pvp\/[^/]+/i.test(path)) {
      return 'pvp';
    }
    if (/^\/simulacion(?:\/|$)/i.test(path)) {
      return 'pvp_lobby';
    }
    if (/^\/torneos\/[^/]+\/jugar(?:\/|$)/i.test(path)) {
      return 'torneo';
    }
    if (path === '/' || path === '/sudoku') {
      return 'sudoku';
    }

    return 'browsing';
  }

  private normalizeDifficulty(difficulty: string | undefined) {
    return this.normalizeText(difficulty, 60);
  }

  private normalizeState(state: string | undefined, mode: LiveMode) {
    const normalized = this.normalizeText(state, 40)
      .toLowerCase()
      .replace(/\s+/g, '_');

    if (normalized) {
      return normalized;
    }

    if (mode === 'pvp_lobby') {
      return 'waiting';
    }
    if (mode === 'browsing') {
      return 'exploring';
    }

    return 'playing';
  }

  private normalizePath(path: string | undefined) {
    const normalized = this.normalizeText(path, 180);
    if (!normalized) {
      return '/';
    }

    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }

  private normalizeText(value: string | undefined, maxLength: number) {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim().slice(0, maxLength);
  }

  private createModeCounter(): Record<LiveMode, number> {
    return {
      browsing: 0,
      sudoku: 0,
      pvp_lobby: 0,
      pvp: 0,
      torneo: 0,
    };
  }

  private createModeUserSets(): Record<LiveMode, Set<string>> {
    return {
      browsing: new Set<string>(),
      sudoku: new Set<string>(),
      pvp_lobby: new Set<string>(),
      pvp: new Set<string>(),
      torneo: new Set<string>(),
    };
  }

  private buildSessionKey(userId: string, sessionId: string) {
    return `${this.normalizeText(userId, 80)}::${sessionId}`;
  }

  private getModeLabel(mode: LiveMode) {
    switch (mode) {
      case 'sudoku':
        return 'Sudoku';
      case 'pvp_lobby':
        return 'Sala PvP';
      case 'pvp':
        return 'PvP';
      case 'torneo':
        return 'Torneo';
      default:
        return 'navegacion';
    }
  }

  private humanizeState(state: string) {
    return this.normalizeText(state, 40)
      .replace(/[_-]+/g, ' ')
      .toLowerCase();
  }

  private countUniqueUsers() {
    return new Set(
      Array.from(this.sessions.values()).map((session) => session.userId),
    ).size;
  }

  private mapToSortedRecord(source: Map<string, number>) {
    return Object.fromEntries(
      Array.from(source.entries()).sort(
        ([leftKey, leftValue], [rightKey, rightValue]) =>
          rightValue - leftValue || leftKey.localeCompare(rightKey),
      ),
    );
  }
}
