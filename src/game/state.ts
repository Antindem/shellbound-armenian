import { playSfx, startBgm, stopBgm, syncAudioSettings } from "./audio";
import { explain } from "./explain";
import { Avatar, CheckCtx, MISSIONS, ACTS } from "./missions";
import { BattleQuestion, BOSSES, getQuestionsForBattle } from "./questions";
import { completeGlitchRemoval, Ctx, Fx, Seg, Trace, run } from "./shell";
import {
  ActiveSave,
  calculateScore,
  clearActiveSave,
  GameHistory,
  GameSettings,
  loadActiveSave,
  loadHistory,
  loadSettings,
  resetAllStorage,
  saveActiveSave,
  saveHistory,
  saveSettings,
} from "./storage";
import { FS, HOME, createFS, dirname, mkdirp, read, tilde, typeAt } from "./vfs";

export type Phase = "briefing" | "active" | "complete";
export type Screen = "menu" | "levelSelect" | "game";
export type GlitchKind = "single" | "nest" | "boss-1" | "boss-2" | "boss-3" | "boss-4" | "boss-5";

export interface TermLine {
  id: number;
  kind: "in" | "out" | "err" | "explain" | "sys" | "ok" | "hint";
  text: string;
  segs?: Seg[];
  cwd?: string;
}

/** dir inode id -> entry name -> floor slot. Keeps objects from jumping around. */
export type Layout = Record<number, Record<string, number>>;

export interface BattleState {
  targetPath: string;
  targetName: string;
  glitchType: GlitchKind;
  hp: number;
  maxHp: number;
  questions: BattleQuestion[];
  qIdx: number;
  lastResult?: "hit" | "hurt" | null;
}

export interface Game {
  screen: Screen;
  mi: number;
  phase: Phase;
  fs: FS;
  cwd: string;
  prev: string;
  lines: TermLine[];
  nid: number;
  done: boolean[];
  guards: boolean[];
  hinted: boolean[];
  fx: Fx[];
  seq: number;
  layout: Layout;
  xray: number | null;
  trace: Trace | null;
  manCmd: string | null;
  aliases: Record<string, string>;
  umask: number;
  avatar: Avatar;
  seedAvatar: Avatar;
  completed: string[];
  cores: number;
  coresLost: number;
  commandsUsed: number;
  hintsUsed: number;
  revealedDirs: Record<number, "ls" | "lsa">;
  playerFiles: Record<string, boolean>;
  battle: BattleState | null;
  activeSave: ActiveSave;
  history: GameHistory;
  settings: GameSettings;
}

export type Action =
  | { type: "run"; raw: string }
  | { type: "unlock" }
  | { type: "goto"; mi: number }
  | { type: "next" }
  | { type: "hint" }
  | { type: "closeTrace" }
  | { type: "closeMan" }
  | { type: "note"; text: string }
  | { type: "answerBattle"; idx: number }
  | { type: "startNewGame"; customAvatar?: { color: string; hat: string; suit: string; name?: string } }
  | { type: "openLevelSelect" }
  | { type: "openMenu" }
  | { type: "hardReset" }
  | { type: "retryLevel" }
  | { type: "toggleSfx" }
  | { type: "toggleMusic" };

/* ---------- helpers ---------- */

export function parseAvatar(fs: FS, fallback?: Avatar): Avatar {
  const txt = read(fs, HOME + "/avatar.cfg");
  if (txt == null) return { exists: false };
  const get = (k: string) => {
    const re = new RegExp(`^\\s*${k}\\s*=\\s*(.+?)\\s*$`, "gim");
    let last: string | undefined;
    let m: RegExpExecArray | null;
    while ((m = re.exec(txt)) !== null) {
      last = m[1].trim();
    }
    return last;
  };
  const rawSuit = get("Suit") ?? get("Class") ?? fallback?.suit ?? fallback?.cls;
  const rawHat = get("Hat") ?? fallback?.hat;
  const rawColor = (get("Color") ?? fallback?.color)?.toLowerCase();
  const rawName = get("Name") ?? fallback?.name;
  return {
    exists: true,
    name: rawName,
    cls: rawSuit,
    suit: rawSuit?.toLowerCase(),
    hat: rawHat?.toLowerCase(),
    color: rawColor,
  };
}

/** Floor slot k -> tile (i, j). Fills outward from the back corner so existing objects never move. */
export function slotTile(k: number): [number, number] {
  const s = Math.floor(Math.sqrt(k));
  const r = k - s * s;
  if (r === 2 * s) return [s, s];
  const m = Math.floor(r / 2);
  return r % 2 === 0 ? [s, m] : [m, s];
}

export function syncLayout(fs: FS, prev: Layout, fx: Fx[]): Layout {
  const next: Layout = {};
  for (const node of Object.values(fs.inodes)) {
    if (node.type !== "dir") continue;
    const old = { ...(prev[node.id] ?? {}) };
    for (const f of fx) {
      if (f.t === "rename" && f.dir === node.id && old[f.from] !== undefined) {
        old[f.name] = old[f.from];
        delete old[f.from];
      }
    }
    const map: Record<string, number> = {};
    const used = new Set<number>();
    const ks = Object.keys(node.entries).sort();
    for (const k of ks) {
      if (old[k] !== undefined && !used.has(old[k])) {
        map[k] = old[k];
        used.add(old[k]);
      }
    }
    let free = 0;
    for (const k of ks) {
      if (map[k] !== undefined) continue;
      while (used.has(free)) free++;
      map[k] = free;
      used.add(free);
    }
    next[node.id] = map;
  }
  return next;
}

function world(mi: number, seedAvatar: Avatar) {
  const m = MISSIONS[mi] ?? MISSIONS[0];
  const fs = createFS();
  mkdirp(fs, HOME);
  m.seed(fs, seedAvatar);
  const useFallback = m.act > 0 ? seedAvatar : undefined;
  return {
    fs,
    cwd: m.start ?? HOME,
    prev: HOME,
    layout: syncLayout(fs, {}, []),
    avatar: parseAvatar(fs, useFallback),
  };
}

export function start(
  mi: number,
  seedAvatar: Avatar,
  completed: string[],
  extra?: {
    screen?: Screen;
    activeSave?: ActiveSave;
    history?: GameHistory;
    settings?: GameSettings;
    phase?: Phase;
  },
): Game {
  const safeMi = Math.min(Math.max(0, mi), MISSIONS.length - 1);
  const m = MISSIONS[safeMi];
  const actTag = ACTS[m.act]?.tag ?? `Արար ${m.act}`;
  const activeSave = extra?.activeSave ?? loadActiveSave();
  const history = extra?.history ?? loadHistory();
  const settings = extra?.settings ?? loadSettings();
  const phase = extra?.phase ?? "briefing";
  return {
    ...world(safeMi, seedAvatar),
    screen: extra?.screen ?? "game",
    mi: safeMi,
    phase,
    lines: [
      { id: 0, kind: "sys", text: `${actTag.toUpperCase()} // ${m.title}` },
      {
        id: 1,
        kind: "sys",
        text:
          phase === "briefing"
            ? "Terminal-ը կողպված է։ Կարդացեք հրահանգավորումը Codex-ում, ապա ապակողպեք։"
            : "Առաքելությունը վերագործարկված է։ Ձեր 3 CPU միջուկները վերականգնված են։",
      },
    ],
    nid: 2,
    done: m.objectives.map(() => false),
    guards: (m.guards ?? []).map(() => true),
    hinted: m.objectives.map(() => false),
    fx: [],
    seq: 0,
    xray: null,
    trace: null,
    manCmd: null,
    aliases: {},
    umask: 0o022,
    seedAvatar,
    completed,
    cores: 3,
    coresLost: 0,
    commandsUsed: 0,
    hintsUsed: 0,
    revealedDirs: {},
    playerFiles: {},
    battle: null,
    activeSave,
    history,
    settings,
  };
}

export function init(): Game {
  const activeSave = loadActiveSave();
  const history = loadHistory();
  const settings = loadSettings();
  syncAudioSettings(settings.sfxMuted, settings.musicMuted);

  const mi =
    Number.isInteger(activeSave.currentLevel) &&
    activeSave.currentLevel >= 0 &&
    activeSave.currentLevel < MISSIONS.length
      ? activeSave.currentLevel
      : 0;

  const seedAvatar: Avatar = activeSave.hasActiveSave
    ? {
        exists: true,
        color: activeSave.avatar?.color ?? "cyan",
        hat: activeSave.avatar?.hat ?? "none",
        suit: activeSave.avatar?.suit ?? "cadet",
        cls: activeSave.avatar?.suit ?? "cadet",
        name: activeSave.avatar?.name,
      }
    : { exists: false };

  const completed = Object.keys(activeSave.levelScores ?? {});

  return start(mi, seedAvatar, completed, {
    screen: "menu",
    activeSave,
    history,
    settings,
  });
}

export function persist(g: Game): void {
  try {
    saveActiveSave(g.activeSave);
    saveHistory(g.history);
    saveSettings(g.settings);
  } catch {
    /* ignore */
  }
}

const safe = (f: () => boolean): boolean => {
  try {
    return f();
  } catch {
    return false;
  }
};

function updateTrackingFromFx(
  fx: Fx[],
  xray: number | null,
  prevRevealed: Record<number, "ls" | "lsa">,
  prevPlayerFiles: Record<string, boolean>,
) {
  const revealedDirs = { ...prevRevealed };
  const playerFiles = { ...prevPlayerFiles };
  if (xray != null) {
    revealedDirs[xray] = "lsa";
  }
  for (const f of fx) {
    if (f.t === "scan") {
      if (f.xray) {
        revealedDirs[f.dir] = "lsa";
      } else if (revealedDirs[f.dir] !== "lsa") {
        revealedDirs[f.dir] = "ls";
      }
    } else if (
      f.t === "create" ||
      f.t === "clone" ||
      f.t === "rename" ||
      f.t === "arrive" ||
      f.t === "write"
    ) {
      playerFiles[`${f.dir}:${f.name}`] = true;
    }
  }
  return { revealedDirs, playerFiles };
}

function finalizeMissionCompletion(
  s: Game,
  mi: number,
  avatar: Avatar,
  commandsUsed: number,
  hintsUsed: number,
  coresLost: number,
  activeSave: ActiveSave,
  history: GameHistory,
  addLine: (kind: TermLine["kind"], text: string) => void,
) {
  const m = MISSIONS[mi];
  const minCmds = m.minCommands ?? Math.max(1, m.objectives.length);
  const levelScore = calculateScore(minCmds, commandsUsed, hintsUsed, coresLost);

  addLine("ok", "ԱՌԱՔԵԼՈՒԹՅՈՒՆՆ ԱՎԱՐՏՎԱԾ Է։ Սեկտորը վերականգնված է։ Ձեր ամփոփումը սպասում է Codex-ում։");
  addLine("ok", `★ Միավորներ՝ ${levelScore.score} / ${levelScore.maxScore}`);

  const completed = s.completed.includes(m.id) ? s.completed : [...s.completed, m.id];
  const nextMi = Math.min(mi + 1, MISSIONS.length - 1);
  const nextMission = MISSIONS[nextMi];

  const unlockedSet = new Set(activeSave.unlockedLevels);
  unlockedSet.add(m.id);
  if (nextMission) unlockedSet.add(nextMission.id);

  const newLevelScores = {
    ...activeSave.levelScores,
    [m.id]: levelScore,
  };

  const nextActiveSave: ActiveSave = {
    ...activeSave,
    hasActiveSave: true,
    currentAct: nextMission ? nextMission.act : m.act,
    currentLevel: nextMi,
    unlockedLevels: Array.from(unlockedSet),
    levelScores: newLevelScores,
    avatar: {
      color: avatar.color ?? activeSave.avatar.color ?? "cyan",
      hat: avatar.hat ?? activeSave.avatar.hat ?? "none",
      suit: avatar.suit ?? avatar.cls ?? activeSave.avatar.suit ?? "cadet",
      name: avatar.name ?? activeSave.avatar.name,
    },
  };

  const prevBest = history.bestLevelScores[m.id] ?? 0;
  const nextBestScores = {
    ...history.bestLevelScores,
    [m.id]: Math.max(prevBest, levelScore.score),
  };

  let nextRuns = history.completedRuns;
  // Record a completed campaign run when finishing Boss 5 (or the last non-free campaign mission)
  const isFinalCampaignMission =
    m.boss === "boss-5" || (mi === MISSIONS.length - 2 && MISSIONS[MISSIONS.length - 1].objectives.length === 0);
  if (isFinalCampaignMission && !s.completed.includes(m.id)) {
    const totalScore = Object.values(newLevelScores).reduce((acc, sc) => acc + sc.score, 0);
    nextRuns = [
      ...history.completedRuns,
      {
        timestamp: Date.now(),
        totalScore,
        glitchesDefeated: history.totalGlitchesDefeated,
      },
    ];
  }

  const nextHistory: GameHistory = {
    ...history,
    bestLevelScores: nextBestScores,
    completedRuns: nextRuns,
  };

  return { completed, nextActiveSave, nextHistory };
}

/* ---------- reducer ---------- */

export function reducer(s: Game, a: Action): Game {
  const m = MISSIONS[s.mi];
  switch (a.type) {
    case "startNewGame": {
      playSfx("click");
      startBgm();
      const freshSave = clearActiveSave();
      const custom = a.customAvatar ?? { color: "cyan", hat: "none", suit: "cadet" };
      const nextSave: ActiveSave = {
        ...freshSave,
        hasActiveSave: true,
        currentAct: MISSIONS[0].act,
        currentLevel: 0,
        unlockedLevels: [MISSIONS[0].id],
        levelScores: {},
        avatar: custom,
      };
      saveActiveSave(nextSave);
      const seedAv: Avatar = { exists: false };
      return start(0, seedAv, [], {
        screen: "game",
        activeSave: nextSave,
        history: s.history,
        settings: s.settings,
      });
    }

    case "openLevelSelect": {
      playSfx("click");
      startBgm();
      return { ...s, screen: "levelSelect", battle: null };
    }

    case "openMenu": {
      playSfx("click");
      return { ...s, screen: "menu", battle: null };
    }

    case "hardReset": {
      playSfx("burnout");
      resetAllStorage();
      const freshSave = loadActiveSave();
      const freshHistory = loadHistory();
      return start(0, { exists: false }, [], {
        screen: "menu",
        activeSave: freshSave,
        history: freshHistory,
        settings: s.settings,
      });
    }

    case "retryLevel": {
      playSfx("click");
      const currentAvatar = s.avatar.exists ? s.avatar : s.seedAvatar;
      return start(s.mi, currentAvatar, s.completed, {
        screen: "game",
        activeSave: s.activeSave,
        history: s.history,
        settings: s.settings,
        phase: "active",
      });
    }

    case "toggleSfx": {
      const nextSettings: GameSettings = { ...s.settings, sfxMuted: !s.settings.sfxMuted };
      syncAudioSettings(nextSettings.sfxMuted, nextSettings.musicMuted);
      saveSettings(nextSettings);
      if (!nextSettings.sfxMuted) playSfx("click");
      return { ...s, settings: nextSettings };
    }

    case "toggleMusic": {
      const nextSettings: GameSettings = { ...s.settings, musicMuted: !s.settings.musicMuted };
      syncAudioSettings(nextSettings.sfxMuted, nextSettings.musicMuted);
      saveSettings(nextSettings);
      if (!nextSettings.musicMuted) startBgm();
      else stopBgm();
      playSfx("click");
      return { ...s, settings: nextSettings };
    }

    case "unlock":
      if (s.phase !== "briefing") return s;
      playSfx("click");
      startBgm();
      return {
        ...s,
        phase: "active",
        lines: [
          ...s.lines,
          { id: s.nid, kind: "sys", text: "Terminal-ն ապակողպված է։ Մուտքագրեք help՝ commands-ի ցանկի համար, կամ hint, եթե դժվարանում եք։" },
        ],
        nid: s.nid + 1,
      };

    case "goto": {
      if (a.mi < 0 || a.mi >= MISSIONS.length) return s;
      playSfx("click");
      startBgm();
      const nextAvatar = s.avatar.exists ? s.avatar : s.seedAvatar;
      const targetMission = MISSIONS[a.mi];
      const unlocked = s.activeSave.unlockedLevels.includes(targetMission.id)
        ? s.activeSave.unlockedLevels
        : [...s.activeSave.unlockedLevels, targetMission.id];
      const nextSave: ActiveSave = {
        ...s.activeSave,
        hasActiveSave: true,
        currentAct: targetMission.act,
        currentLevel: a.mi,
        unlockedLevels: unlocked,
      };
      return start(a.mi, nextAvatar, s.completed, {
        screen: "game",
        activeSave: nextSave,
        history: s.history,
        settings: s.settings,
      });
    }

    case "next":
      return reducer(s, { type: "goto", mi: Math.min(s.mi + 1, MISSIONS.length - 1) });

    case "closeTrace":
      playSfx("click");
      return { ...s, trace: null };

    case "closeMan":
      playSfx("click");
      return { ...s, manCmd: null };

    case "note":
      return { ...s, lines: [...s.lines, { id: s.nid, kind: "sys", text: a.text }], nid: s.nid + 1 };

    case "hint": {
      const i = s.done.findIndex((d) => !d);
      if (i < 0 || s.phase === "briefing") return s;
      playSfx("click");
      const alreadyHinted = s.hinted[i];
      const hinted = [...s.hinted];
      hinted[i] = true;
      return {
        ...s,
        hinted,
        hintsUsed: alreadyHinted ? s.hintsUsed : s.hintsUsed + 1,
        lines: [...s.lines, { id: s.nid, kind: "hint", text: `Նպատակ ${i + 1}․ փորձեք  ${m.objectives[i].hint}` }],
        nid: s.nid + 1,
      };
    }

    case "answerBattle": {
      if (!s.battle || s.cores <= 0) return s;
      const b = s.battle;
      const q = b.questions[b.qIdx % b.questions.length];
      let nid = s.nid;
      const lines = [...s.lines];
      const add = (kind: TermLine["kind"], text: string) => lines.push({ id: nid++, kind, text });

      if (a.idx === q.correctIndex) {
        playSfx("laser");
        const newHp = b.hp - 1;
        if (newHp > 0) {
          return {
            ...s,
            battle: {
              ...b,
              hp: newHp,
              qIdx: b.qIdx + 1,
              lastResult: "hit",
            },
          };
        }

        // Glitch defeated! Complete removal in VFS
        const fs: FS = structuredClone(s.fs);
        const rmFx = completeGlitchRemoval(fs, s.cwd, b.targetPath);
        const fx: Fx[] = rmFx.map((f) => (f.t === "remove" ? { ...f, slot: s.layout[f.dir]?.[f.name] } : f));
        const layout = syncLayout(fs, s.layout, fx);

        let cwd = s.cwd;
        while (cwd !== "/" && typeAt(fs, cwd) !== "dir") cwd = dirname(cwd);

        add("ok", `⚡ Խափանումը ոչնչացված է՝ ${b.targetName}`);
        if (b.glitchType.startsWith("boss-")) {
          const bossMeta = BOSSES[b.glitchType as keyof typeof BOSSES];
          if (bossMeta?.defeatLine) {
            add("sys", `${bossMeta.name}․ «${bossMeta.defeatLine}»`);
          }
        }

        const synthEvents = [{ name: "rm", args: [b.targetPath, b.targetName], flags: "", out: [], ok: true }];
        const cc: CheckCtx = { fs, cwd, now: synthEvents, trace: null, xray: s.xray };
        const wasBossShielded = Boolean(m.boss) && m.objectives.length > 1 && s.done.slice(0, -1).some((d) => !d);
        const done = [...s.done];
        m.objectives.forEach((o, i) => {
          if (done[i] || !(o.needs ?? []).every((n) => done[n])) return;
          if (safe(() => o.check(cc))) {
            done[i] = true;
            add("ok", `✓ Նպատակ ${i + 1}-ը ${m.objectives.length}-ից ավարտված է`);
          }
        });
        const nowBossShielded = Boolean(m.boss) && m.objectives.length > 1 && done.slice(0, -1).some((d) => !d);
        if (wasBossShielded && !nowBossShielded && !done[done.length - 1]) {
          add("ok", "🛡⚡ ԲՈՍԻ ՊԱՇՏՊԱՆԻՉ ՎԱՀԱՆՆ ԱՆՋԱՏՎԱԾ Է․ նախնական առաջադրանքները կատարված են, այժմ կարող եք գրոհել Բոսին rm-ով։");
        }
        const guards = (m.guards ?? []).map((g) => safe(() => g.check(cc)));

        let history: GameHistory = {
          ...s.history,
          totalGlitchesDefeated: s.history.totalGlitchesDefeated + 1,
        };
        let activeSave = s.activeSave;
        let phase: Phase = s.phase;
        let completed = s.completed;
        const avatar = parseAvatar(fs, m.act > 0 ? s.seedAvatar : undefined);

        if (phase === "active" && done.length > 0 && done.every(Boolean) && guards.every(Boolean)) {
          phase = "complete";
          const res = finalizeMissionCompletion(
            s,
            s.mi,
            avatar.exists ? avatar : s.seedAvatar,
            s.commandsUsed,
            s.hintsUsed,
            s.coresLost,
            activeSave,
            history,
            add,
          );
          completed = res.completed;
          activeSave = res.nextActiveSave;
          history = res.nextHistory;
        }

        return {
          ...s,
          fs,
          cwd,
          lines,
          nid,
          done,
          guards,
          fx,
          seq: s.seq + 1,
          layout,
          avatar,
          phase,
          completed,
          battle: null,
          activeSave,
          history,
        };
      } else {
        // Wrong answer or timeout in battle -> Glitch attacks player, lose 1 CPU Core
        playSfx("glitchHit");
        playSfx("burnout");
        const cores = Math.max(0, s.cores - 1);
        const coresLost = s.coresLost + 1;
        if (a.idx < 0) {
          add("err", `✗ Ժամանակը սպառվեց մարտում (30 վրկ)․ կորցրեցիք 1 CPU միջուկ (${cores}/3 մնաց)։`);
        } else {
          add("err", `✗ Սխալ պատասխան մարտում․ կորցրեցիք 1 CPU միջուկ (${cores}/3 մնաց)։`);
        }

        if (cores <= 0) {
          add("err", "ՀԱՄԱԿԱՐԳԻ ԽԱՓԱՆՈՒՄ․ բոլոր CPU միջուկները այրվեցին։");
          return {
            ...s,
            cores: 0,
            coresLost,
            lines,
            nid,
            battle: null,
          };
        }

        const isBoss = b.glitchType.startsWith("boss-");
        const nextIdx = b.qIdx + 1;
        const questions =
          nextIdx >= b.questions.length
            ? [
                ...b.questions,
                ...getQuestionsForBattle(
                  m.act || 1,
                  3,
                  isBoss ? (b.glitchType as "boss-1" | "boss-2" | "boss-3" | "boss-4" | "boss-5") : undefined,
                ),
              ]
            : b.questions;

        return {
          ...s,
          cores,
          coresLost,
          lines,
          nid,
          battle: {
            ...b,
            questions,
            qIdx: nextIdx,
            lastResult: "hurt",
          },
        };
      }
    }

    case "run": {
      if (s.phase === "briefing" || s.cores <= 0 || s.battle != null) return s;
      const raw = a.raw.trim();
      let nid = s.nid;
      let lines: TermLine[] = [...s.lines, { id: nid++, kind: "in", text: a.raw, cwd: s.cwd }];
      const add = (kind: TermLine["kind"], text: string, segs?: Seg[]) => lines.push({ id: nid++, kind, text, segs });
      if (!raw) return { ...s, lines, nid };

      if (raw === "hint") {
        const h = reducer({ ...s, lines, nid }, { type: "hint" });
        if (h.nid !== nid) return h;
        add("sys", "Բաց նպատակներ չկան։ Հուշելու ոչինչ չկա։");
        return { ...s, lines, nid };
      }

      if (raw === "reset") {
        playSfx("click");
        add("sys", "Աշխարհը վերականգնված է։ Յուրաքանչյուր սենյակ վերադարձել է այս առաքելության սկզբնական վիճակին։");
        return {
          ...s,
          ...world(s.mi, s.seedAvatar),
          phase: "active",
          lines,
          nid,
          done: m.objectives.map(() => false),
          guards: (m.guards ?? []).map(() => true),
          fx: [{ t: "walk" }],
          seq: s.seq + 1,
          xray: null,
          trace: null,
          manCmd: null,
          aliases: {},
          umask: 0o022,
          cores: 3,
          coresLost: 0,
          commandsUsed: 0,
          hintsUsed: 0,
          revealedDirs: {},
          playerFiles: {},
          battle: null,
        };
      }

      const fs: FS = structuredClone(s.fs);
      const aliases = { ...s.aliases };
      const bossShielded = m.objectives.length > 1 && s.done.slice(0, -1).some((d) => !d);
      const ctx: Ctx = { fs, cwd: s.cwd, prev: s.prev, fx: [], xray: s.xray, aliases, umask: s.umask, bossShielded };
      const r = run(raw, ctx);
      if (r.clear) lines = [];
      for (const o of r.out) {
        add(o.kind, o.text, o.segs);
        if (o.err) {
          if (o.err.code === "SHIELDED") {
            add("explain", "🛡 ՊԱՇՏՊԱՆԻՉ ՎԱՀԱՆ․ նախ ավարտեք առաքելության նախնական առաջադրանքները՝ Բոսի վահանն անջատելու համար։");
          } else {
            add("explain", explain(o.err, fs, ctx.cwd));
          }
        }
      }

      // `sort f > f` and friends: the classic self-inflicted wound.
      const sink = r.trace?.sink;
      if (sink && sink.op === ">" && sink.before > 0 && r.events.some((e) => e.args.includes(sink.file))) {
        add("sys", `Զգույշ․ >-ը դատարկեց ${sink.file}-ը նախքան command-ը կկարողանար կարդալ այն։ Shell-ն առաջինը բացում է ելքային file-ը։`);
      }

      // If the room under your feet was deleted or moved, fall back to the nearest surviving parent.
      let cwd = ctx.cwd;
      while (cwd !== "/" && typeAt(fs, cwd) !== "dir") cwd = dirname(cwd);
      if (cwd !== ctx.cwd) add("sys", `Սենյակը, որտեղ կանգնած էիք, անհետացել է։ Դուք հայտնվում եք ${tilde(cwd)}-ում։`);

      const piped = !!r.trace && (r.trace.stages.length > 1 || r.trace.sink != null);
      let fx: Fx[] = ctx.fx.map((f) => (f.t === "remove" ? { ...f, slot: s.layout[f.dir]?.[f.name] } : f));
      if (r.errors.length) {
        fx = [...fx, { t: "error", kind: r.errors[0].cmd === "cd" ? "bump" : piped ? "leak" : "fizzle" }];
      }
      const layout = syncLayout(fs, s.layout, fx);

      const { revealedDirs, playerFiles } = updateTrackingFromFx(
        ctx.fx,
        ctx.xray,
        s.revealedDirs,
        s.playerFiles,
      );

      // Objectives latch once met; guards are checked live.
      const cc: CheckCtx = { fs, cwd, now: r.events, trace: r.trace, xray: ctx.xray };
      const done = [...s.done];
      let newlyCompletedObj = false;
      m.objectives.forEach((o, i) => {
        if (done[i] || !(o.needs ?? []).every((n) => done[n])) return;
        if (safe(() => o.check(cc))) {
          done[i] = true;
          newlyCompletedObj = true;
          add("ok", `✓ Նպատակ ${i + 1}-ը ${m.objectives.length}-ից ավարտված է`);
        }
      });

      const nowBossShielded = m.objectives.length > 1 && done.slice(0, -1).some((d) => !d);
      if (Boolean(m.boss) && bossShielded && !nowBossShielded && !done[done.length - 1]) {
        add("ok", "🛡⚡ ԲՈՍԻ ՊԱՇՏՊԱՆԻՉ ՎԱՀԱՆՆ ԱՆՋԱՏՎԱԾ Է․ նախնական առաջադրանքները կատարված են, այժմ կարող եք գրոհել Բոսին rm-ով։");
      }

      const guards = (m.guards ?? []).map((g) => safe(() => g.check(cc)));
      const guardFailed = guards.some((g) => !g);

      let cores = s.cores;
      let coresLost = s.coresLost;
      const onlyShieldedError = r.errors.length > 0 && r.errors.every((e) => e.code === "SHIELDED");
      // Do not penalize the forced first `ls` (or first `ls -a`) in a directory unless `ls` itself completed a mission objective
      const isFreeDirectoryScan =
        r.errors.length === 0 &&
        !newlyCompletedObj &&
        r.events.length > 0 &&
        r.events.every((e) => e.name === "ls") &&
        ctx.fx.some(
          (f) =>
            f.t === "scan" &&
            (s.revealedDirs[f.dir] === undefined || (f.xray && s.revealedDirs[f.dir] !== "lsa")),
        );
      const commandsUsed = isFreeDirectoryScan || onlyShieldedError ? s.commandsUsed : s.commandsUsed + 1;
      let history: GameHistory = {
        ...s.history,
        totalCommandsRun: s.history.totalCommandsRun + 1,
      };

      if (guardFailed) {
        coresLost += s.cores;
        cores = 0;
        playSfx("burnout");
        add("err", "ՀԱՄԱԿԱՐԳԻ ԽԱՓԱՆՈՒՄ․ այն, ինչ պետք է պաշտպանեիք, ոչնչացվել է։ Բոլոր CPU միջուկները այրվեցին։");
      } else if (onlyShieldedError) {
        playSfx("error");
      } else if (r.errors.length > 0 && !newlyCompletedObj) {
        cores = Math.max(0, s.cores - 1);
        coresLost = s.coresLost + 1;
        playSfx("error");
        playSfx("burnout");
      } else {
        playSfx("exec");
      }

      // Check if a Glitch Battle was triggered by `rm`
      let battle: BattleState | null = s.battle;
      if (r.pendingBattle && cores > 0) {
        const gt = r.pendingBattle.glitchType;
        const isBoss = gt.startsWith("boss-");
        const maxHp =
          gt === "single"
            ? 1
            : gt === "nest"
              ? 3
              : (BOSSES[gt as keyof typeof BOSSES]?.maxHp ?? 4);
        const questions = getQuestionsForBattle(
          m.act || 1,
          maxHp,
          isBoss ? (gt as "boss-1" | "boss-2" | "boss-3" | "boss-4" | "boss-5") : undefined,
        );
        battle = {
          targetPath: r.pendingBattle.targetPath,
          targetName: r.pendingBattle.targetName,
          glitchType: gt,
          hp: maxHp,
          maxHp,
          questions,
          qIdx: 0,
          lastResult: null,
        };
        add("sys", `⚔ ՎԻՐՈՒՍԱՅԻՆ ԽԱՓԱՆՈՒՄ ՀԱՅՏՆԱԲԵՐՎԵՑ․ պատրաստվեք մարտի՝ ${r.pendingBattle.targetName}`);
      }

      const avatar = parseAvatar(fs, m.act > 0 ? s.seedAvatar : undefined);
      let activeSave = s.activeSave;
      if (avatar.exists) {
        activeSave = {
          ...activeSave,
          avatar: {
            color: avatar.color ?? activeSave.avatar.color ?? "cyan",
            hat: avatar.hat ?? activeSave.avatar.hat ?? "none",
            suit: avatar.suit ?? avatar.cls ?? activeSave.avatar.suit ?? "cadet",
            name: avatar.name ?? activeSave.avatar.name,
          },
        };
      }

      let phase: Phase = s.phase;
      let completed = s.completed;
      if (
        phase === "active" &&
        !battle &&
        cores > 0 &&
        done.length > 0 &&
        done.every(Boolean) &&
        guards.every(Boolean)
      ) {
        phase = "complete";
        const res = finalizeMissionCompletion(
          s,
          s.mi,
          avatar.exists ? avatar : s.seedAvatar,
          commandsUsed,
          s.hintsUsed,
          coresLost,
          activeSave,
          history,
          add,
        );
        completed = res.completed;
        activeSave = res.nextActiveSave;
        history = res.nextHistory;
      }

      return {
        ...s,
        fs,
        cwd,
        prev: ctx.prev,
        lines,
        nid,
        done,
        guards,
        fx,
        seq: s.seq + 1,
        layout,
        xray: ctx.xray,
        trace: piped ? r.trace : null,
        manCmd: r.manCmd ?? s.manCmd,
        aliases: ctx.aliases ?? aliases,
        umask: ctx.umask ?? s.umask,
        avatar,
        seedAvatar: avatar.exists ? avatar : s.seedAvatar,
        phase,
        completed,
        cores,
        coresLost,
        commandsUsed,
        revealedDirs,
        playerFiles,
        battle,
        activeSave,
        history,
      };
    }
  }
}
