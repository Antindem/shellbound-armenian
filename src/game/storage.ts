export interface LevelScore {
  score: number;
  maxScore: number;
}

export interface ActiveSave {
  hasActiveSave: boolean;
  currentAct: number;
  currentLevel: number;
  unlockedLevels: string[];
  levelScores: Record<string, LevelScore>;
  avatar: { color: string; hat: string; suit: string; name?: string };
}

export interface CompletedRun {
  timestamp: number;
  totalScore: number;
  glitchesDefeated: number;
}

export interface GameHistory {
  completedRuns: CompletedRun[];
  bestLevelScores: Record<string, number>;
  totalGlitchesDefeated: number;
  totalCommandsRun: number;
}

export interface GameSettings {
  sfxMuted: boolean;
  musicMuted: boolean;
}

export const KEY_ACTIVE_SAVE = "cli_game_active_save";
export const KEY_HISTORY = "cli_game_history";
export const KEY_SETTINGS = "cli_game_settings";

function defaultActiveSave(): ActiveSave {
  return {
    hasActiveSave: false,
    currentAct: 0,
    currentLevel: 0,
    unlockedLevels: ["0-1", "1-1"],
    levelScores: {},
    avatar: {
      color: "cyan",
      hat: "none",
      suit: "cadet",
    },
  };
}

function defaultHistory(): GameHistory {
  return {
    completedRuns: [],
    bestLevelScores: {},
    totalGlitchesDefeated: 0,
    totalCommandsRun: 0,
  };
}

function defaultSettings(): GameSettings {
  return {
    sfxMuted: false,
    musicMuted: false,
  };
}

export function loadActiveSave(): ActiveSave {
  const def = defaultActiveSave();
  try {
    const raw = localStorage.getItem(KEY_ACTIVE_SAVE);
    if (!raw) return def;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return def;
    return {
      hasActiveSave: Boolean(parsed.hasActiveSave),
      currentAct: typeof parsed.currentAct === "number" ? parsed.currentAct : def.currentAct,
      currentLevel: typeof parsed.currentLevel === "number" ? parsed.currentLevel : def.currentLevel,
      unlockedLevels: Array.isArray(parsed.unlockedLevels)
        ? parsed.unlockedLevels.filter((x: unknown): x is string => typeof x === "string")
        : def.unlockedLevels,
      levelScores:
        parsed.levelScores && typeof parsed.levelScores === "object" ? parsed.levelScores : def.levelScores,
      avatar: {
        color: typeof parsed.avatar?.color === "string" ? parsed.avatar.color : def.avatar.color,
        hat: typeof parsed.avatar?.hat === "string" ? parsed.avatar.hat : def.avatar.hat,
        suit: typeof parsed.avatar?.suit === "string" ? parsed.avatar.suit : def.avatar.suit,
        ...(typeof parsed.avatar?.name === "string" ? { name: parsed.avatar.name } : {}),
      },
    };
  } catch {
    return def;
  }
}

export function saveActiveSave(save: ActiveSave): void {
  try {
    localStorage.setItem(KEY_ACTIVE_SAVE, JSON.stringify(save));
  } catch {
    /* ignore storage errors */
  }
}

export function clearActiveSave(): ActiveSave {
  const fresh = defaultActiveSave();
  try {
    localStorage.removeItem(KEY_ACTIVE_SAVE);
  } catch {
    /* ignore */
  }
  return fresh;
}

export function loadHistory(): GameHistory {
  const def = defaultHistory();
  try {
    const raw = localStorage.getItem(KEY_HISTORY);
    if (!raw) return def;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return def;
    return {
      completedRuns: Array.isArray(parsed.completedRuns) ? parsed.completedRuns : def.completedRuns,
      bestLevelScores:
        parsed.bestLevelScores && typeof parsed.bestLevelScores === "object"
          ? parsed.bestLevelScores
          : def.bestLevelScores,
      totalGlitchesDefeated:
        typeof parsed.totalGlitchesDefeated === "number" ? parsed.totalGlitchesDefeated : def.totalGlitchesDefeated,
      totalCommandsRun: typeof parsed.totalCommandsRun === "number" ? parsed.totalCommandsRun : def.totalCommandsRun,
    };
  } catch {
    return def;
  }
}

export function saveHistory(hist: GameHistory): void {
  try {
    localStorage.setItem(KEY_HISTORY, JSON.stringify(hist));
  } catch {
    /* ignore */
  }
}

export function loadSettings(): GameSettings {
  const def = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY_SETTINGS);
    if (!raw) return def;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return def;
    return {
      sfxMuted: Boolean(parsed.sfxMuted),
      musicMuted: Boolean(parsed.musicMuted),
    };
  } catch {
    return def;
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function resetAllStorage(): void {
  try {
    localStorage.removeItem(KEY_ACTIVE_SAVE);
    localStorage.removeItem(KEY_HISTORY);
    localStorage.removeItem("shellbound.v1");
  } catch {
    /* ignore */
  }
}

export function calculateScore(
  minCommands: number,
  commandsUsed: number,
  hintsUsed: number,
  coresLost: number,
): LevelScore {
  const maxScore = Math.max(100, minCommands * 100);
  const extra = Math.max(0, commandsUsed - minCommands);
  const raw = maxScore - extra * 20 - hintsUsed * 100 - coresLost * 150;
  return {
    score: Math.max(100, raw),
    maxScore,
  };
}
