// A small but honest Bash interpreter.
// It understands quoting, globs, pipes, > and >>, $(), $(()), aliases, permissions,
// and reports what it did as a list of visual effects (Fx) plus a pipeline trace.

import {
  FS,
  GlitchType,
  HOME,
  Inode,
  Kind,
  ROOT,
  alloc,
  basename,
   contains,
  deepCopy,
  dirname,
  formatMode,
  fromLines,
  kindOf,
  link,
  lookup,
  normalize,
  toLines,
  unlink,
} from "./vfs";
import { MAN } from "./explain";
import { MAN_PAGES } from "./manPages";

/* ---------- public types ---------- */

export interface Seg {
  t: string;
  c?: "dir" | "link" | "broken" | "ino" | "dim" | "hit";
}

export type ErrCode =
  | "ENOENT"
  | "ENOTDIR"
  | "EISDIR"
  | "EEXIST"
  | "NOPARENT"
  | "REFUSE"
  | "UNSUPPORTED"
  | "ENOTEMPTY"
  | "NOCMD"
  | "USAGE"
  | "BADOPT"
  | "OMITDIR"
  | "SAMEFILE"
  | "SUBDIR"
  | "HARDDIR"
  | "NOTDIRTARGET"
  | "NOINPUT"
  | "SYNTAX"
  | "ELOOP"
  | "EACCES"
  | "EPERM"
  | "DENIED"
  | "SHIELDED"
  | string;

export interface ShErr {
  msg: string;
  code: ErrCode;
  cmd: string;
  arg?: string;
}

export type Fx =
  | { t: "create"; dir: number; name: string; how: "touch" | "mkdir" | "ln" | "lns" | "write" }
  | { t: "remove"; dir: number; name: string; kind: Kind; how: "rm" | "mv"; slot?: number }
  | { t: "clone"; dir: number; name: string; fromDir: number; fromName: string }
  | { t: "rename"; dir: number; name: string; from: string }
  | { t: "arrive"; dir: number; name: string }
  | { t: "scan"; dir: number; xray: boolean }
  | { t: "read"; dir: number; name: string }
  | { t: "write"; dir: number; name: string; op: ">" | ">>" }
  | { t: "error"; kind: "bump" | "leak" | "fizzle" }
  | { t: "walk" };

export interface Ctx {
  fs: FS;
  cwd: string;
  prev: string;
  fx: Fx[];
  xray: number | null;
  aliases?: Record<string, string>;
  umask?: number;
  sudo?: boolean;
  bossShielded?: boolean;
  manCmd?: string;
  pendingBattle?: {
    targetPath: string;
    targetName: string;
    recursive: boolean;
    glitchType: NonNullable<Inode["glitch"]>;
  };
  subEvents?: Ev[];
}

export interface Stage {
  label: string;
  name: string;
  inN: number | null;
  out: string[];
  err: boolean;
}

export interface Sink {
  op: ">" | ">>";
  file: string;
  before: number;
  after: number;
  added: number;
  sludge: boolean;
}

export interface Trace {
  stages: Stage[];
  sink: Sink | null;
}

/** A record of one executed command, used by mission objectives. */
export interface Ev {
  name: string;
  args: string[];
  flags: string;
  ok: boolean;
  code?: string;
  out: string[];
}

export interface OutLine {
  kind: "out" | "err";
  text: string;
  segs?: Seg[];
  err?: ShErr;
}

export interface RunOut {
  out: OutLine[];
  events: Ev[];
  errors: ShErr[];
  trace: Trace | null;
  clear: boolean;
  manCmd?: string;
  pendingBattle?: {
    targetPath: string;
    targetName: string;
    recursive: boolean;
    glitchType: NonNullable<Inode["glitch"]>;
  };
}

/* ---------- permissions & glitch helpers ---------- */

function hasPerm(n: Inode, bit: 4 | 2 | 1, c: Ctx): boolean {
  if (c.sudo) return true;
  if (n.type === "link") return true;
  const owner = n.owner ?? "architect";
  const mode = n.mode ?? (n.type === "dir" ? 0o755 : 0o644);
  const triad = owner === "architect" ? (mode >> 6) & 7 : mode & 7;
  return (triad & bit) !== 0;
}

function detectGlitchInode(fs: FS, name: string, n: Inode, recursive: boolean): GlitchType | null {
  if (n.glitch) return n.glitch;
  const l = name.toLowerCase();
  if (/boss[-_]?1|fragmenter/.test(l)) return "boss-1";
  if (/boss[-_]?2|stream_?eater/.test(l)) return "boss-2";
  if (/boss[-_]?3|infinite_?loop/.test(l)) return "boss-3";
  if (/boss[-_]?4|wildcard_?phantom|boss_real/.test(l)) return "boss-4";
  if (/boss[-_]?5|rootkit/.test(l)) return "boss-5";
  if (/\.glitch$|^glitch_nest$|boss/i.test(name)) {
    return n.type === "dir" ? "nest" : "single";
  }
  if (recursive && n.type === "dir") {
    for (const [childName, cid] of Object.entries(n.entries)) {
      const child = fs.inodes[cid];
      if (!child) continue;
      const g = detectGlitchInode(fs, childName, child, true);
      if (g) return g === "single" ? "nest" : g;
    }
  }
  return null;
}

/** Finish removing a glitch file or directory after the player wins a Glitch Battle. */
export function completeGlitchRemoval(fs: FS, cwd: string, targetPath: string): Fx[] {
  const fx: Fx[] = [];
  const f = lookup(fs, normalize(cwd, targetPath), false);
  if (f.id == null || f.parent == null || f.id === ROOT) return fx;
  const n = fs.inodes[f.id];
  fx.push({ t: "remove", dir: f.parent, name: f.name, kind: kindOf(f.name, n), how: "rm" });
  unlink(fs, f.parent, f.name);
  return fx;
}

/* ---------- command plumbing ---------- */

interface Res {
  out: string[];
  rich?: Seg[][];
  err: ShErr[];
  code: number;
  clear?: boolean;
}

type Cmd = (args: string[], stdin: string[] | null, c: Ctx, tty: boolean) => Res;

const ok = (out: string[] = [], rich?: Seg[][]): Res => ({ out, rich, err: [], code: 0 });
const fail = (cmd: string, msg: string, code: string, arg?: string): Res => ({
  out: [],
  err: [{ msg, code, cmd, arg }],
  code: 1,
});
const done = (out: string[], err: ShErr[], rich?: Seg[][]): Res => ({ out, rich, err, code: err.length ? 1 : 0 });

function opts(cmd: string, args: string[], allowed: string): { f: Set<string>; rest: string[]; bad?: Res } {
  const f = new Set<string>();
  const rest: string[] = [];
  let end = false;
  for (const a of args) {
    if (!end && a === "--") {
      end = true;
      continue;
    }
    if (!end && a.length > 1 && a[0] === "-") {
      for (const ch of a.slice(1)) {
        if (!allowed.includes(ch)) {
          return { f, rest, bad: fail(cmd, `${cmd}: invalid option -- '${ch}'`, "BADOPT", ch) };
        }
        f.add(ch);
      }
    } else rest.push(a);
  }
  return { f, rest };
}

interface InputSet {
  file: string;
  lines: string[];
}

/** Gather the lines a filter should work on: named files, or else stdin. */
function inputs(cmd: string, files: string[], stdin: string[] | null, c: Ctx): { sets: InputSet[]; err: ShErr[] } {
  const sets: InputSet[] = [];
  const err: ShErr[] = [];
  if (!files.length) {
    if (stdin) sets.push({ file: "", lines: stdin });
    else err.push({ cmd, code: "NOINPUT", msg: `${cmd}: no input (give a file name, or pipe data in with |)` });
    return { sets, err };
  }
  for (const p of files) {
    const f = lookup(c.fs, normalize(c.cwd, p));
    if (f.id == null) {
      const nd = f.err === "ENOTDIR";
      err.push({
        cmd,
        code: nd ? "ENOTDIR" : "ENOENT",
        arg: p,
        msg: `${cmd}: ${p}: ${nd ? "Not a directory" : "No such file or directory"}`,
      });
    } else if (c.fs.inodes[f.id].type === "dir") {
      err.push({ cmd, code: "EISDIR", arg: p, msg: `${cmd}: ${p}: Is a directory` });
    } else if (!hasPerm(c.fs.inodes[f.id], 4, c)) {
      err.push({ cmd, code: "EACCES", arg: p, msg: `${cmd}: ${p}: Permission denied` });
    } else {
      sets.push({ file: p, lines: toLines(c.fs.inodes[f.id].content) });
      if (f.parent != null) c.fx.push({ t: "read", dir: f.parent, name: f.name });
    }
  }
  return { sets, err };
}

const stripSlash = (p: string) => p.replace(/\/+$/, "") || "/";

/** Work out where a cp/mv destination really lands. */
function destination(
  c: Ctx,
  dest: string,
  src: string,
  srcName: string,
): { parent: number | null; name: string; shown: string; isDir: boolean } {
  const df = lookup(c.fs, normalize(c.cwd, dest));
  if (df.id != null && c.fs.inodes[df.id].type === "dir") {
    const b = basename(src);
    const name = !b || b === "." || b === ".." ? srcName : b;
    return { parent: df.id, name, shown: (stripSlash(dest) === "/" ? "" : stripSlash(dest)) + "/" + name, isDir: true };
  }
  return { parent: df.parent, name: df.name, shown: dest, isDir: false };
}

/* ---------- symbolic chmod parser ---------- */

function applySymbolicMode(currentMode: number, spec: string): number | null {
  let mode = currentMode & 0o777;
  const clauses = spec.split(",");
  for (const clause of clauses) {
    const m = /^([ugoa]*)([+-=])([rwx]+)$/.exec(clause);
    if (!m) return null;
    const who = m[1] || "a";
    const op = m[2];
    const perms = m[3];
    let bits = 0;
    if (perms.includes("r")) bits |= 4;
    if (perms.includes("w")) bits |= 2;
    if (perms.includes("x")) bits |= 1;

    const applyShift = (shift: number) => {
      if (op === "+") mode |= bits << shift;
      else if (op === "-") mode &= ~(bits << shift);
      else if (op === "=") {
        mode = (mode & ~(7 << shift)) | (bits << shift);
      }
    };

    if (who.includes("u") || who.includes("a")) applyShift(6);
    if (who.includes("g") || who.includes("a")) applyShift(3);
    if (who.includes("o") || who.includes("a")) applyShift(0);
  }
  return mode;
}

/* ---------- the commands ---------- */

const BUILTINS = new Set(["cd", "pwd", "echo", "alias", "umask", "type", "help", "exit", ":"]);
const USR_BINS = new Set(["sort", "uniq", "wc", "head", "tail", "tree", "which", "man", "info", "whatis", "apropos", "sudo"]);

const headTail =
  (cmd: string, tail: boolean): Cmd =>
  (a, stdin, c) => {
    let n = 10;
    const files: string[] = [];
    for (let k = 0; k < a.length; k++) {
      const x = a[k];
      if (x === "-n" && k + 1 < a.length) n = parseInt(a[++k], 10);
      else if (/^-n?\d+$/.test(x)) n = parseInt(x.replace(/^-n?/, ""), 10);
      else if (x.startsWith("-") && x.length > 1) return fail(cmd, `${cmd}: invalid option -- '${x[1]}'`, "BADOPT", x[1]);
      else files.push(x);
    }
    if (Number.isNaN(n)) n = 10;
    const i = inputs(cmd, files, stdin, c);
    const ls = i.sets.flatMap((s) => s.lines);
    return done(tail ? ls.slice(Math.max(0, ls.length - n)) : ls.slice(0, n), i.err);
  };

const C: Record<string, Cmd> = {
  ":": () => ok(),
  pwd: (_a, _s, c) => ok([c.cwd]),
  whoami: (_a, _s, c) => ok([c.sudo ? "root" : "architect"]),
  echo: (a) => ok([(a[0] === "-n" ? a.slice(1) : a).join(" ")]),
  clear: () => ({ ...ok(), clear: true }),
  exit: () => ok(["logout: լավ փորձ էր։ Mainframe-ը դեռ ձեր կարիքն ունի։"]),

  help: () =>
    ok([
      "Այս mainframe-ի commands-ը (մանրամասների համար՝ man <command>)",
      "  կողմնորոշում   pwd  ls  cd  tree",
      "  ստեղծել/ջնջել  touch  mkdir  rm  rmdir",
      "  տեղափոխել      cp  mv  ln  ln -s",
      "  կարդալ/գրել    cat  echo  >  >>",
      "  pipelines      |  grep  sort  uniq  wc  head  tail",
      "  հետազոտում     type  which  man  info  whatis  apropos  alias",
      "  իրավունքներ    chmod  chown  umask  sudo  whoami",
      "  խաղ            hint  reset  clear",
      "Ստեղներ․ Tab-ը լրացնում է անունները, Up/Down-ը կանչում է նախորդ commands-ը։",
    ]),

  type: (a, _s, c) => {
    if (!a.length) return fail("type", "bash: type: usage: type name...", "USAGE");
    const out: string[] = [];
    const err: ShErr[] = [];
    for (const name of a) {
      if (c.aliases && c.aliases[name] !== undefined) {
        out.push(`${name} is aliased to \`${c.aliases[name]}'`);
      } else if (BUILTINS.has(name)) {
        out.push(`${name} is a shell builtin`);
      } else if (C[name] || name === "hint" || name === "reset") {
        const bin = USR_BINS.has(name) ? `/usr/bin/${name}` : `/bin/${name}`;
        out.push(`${name} is ${bin}`);
      } else {
        err.push({ cmd: "type", code: "NOCMD", arg: name, msg: `bash: type: ${name}: not found` });
      }
    }
    return done(out, err);
  },

  which: (a, _s, c) => {
    if (!a.length) return fail("which", "Usage: which COMMAND...", "USAGE");
    const out: string[] = [];
    const err: ShErr[] = [];
    for (const name of a) {
      if (c.aliases && c.aliases[name] !== undefined) {
        out.push(`alias ${name}='${c.aliases[name]}'`);
      } else if (C[name] || BUILTINS.has(name) || name === "hint" || name === "reset") {
        const bin = USR_BINS.has(name) ? `/usr/bin/${name}` : `/bin/${name}`;
        out.push(bin);
      } else {
        err.push({ cmd: "which", code: "NOCMD", arg: name, msg: `which: no ${name} in (/usr/bin:/bin)` });
      }
    }
    return done(out, err);
  },

  man: (a, _s, c) => {
    if (!a.length) return fail("man", "What manual page do you want?", "USAGE");
    const target = a.length > 1 && /^\d+$/.test(a[0]) ? a[1] : a[0];
    const page = MAN_PAGES[target];
    if (page || MAN[target]) {
      c.manCmd = target;
      return ok([MAN[target] ?? `${page.name} — ${page.synopsis}`]);
    }
    return fail("man", `No manual entry for ${target}`, "NOCMD", target);
  },

  info: (a, _s, c) => {
    if (!a.length) return fail("info", "info: missing command name", "USAGE");
    const target = a[0];
    const page = MAN_PAGES[target];
    if (page || MAN[target]) {
      c.manCmd = target;
      if (page) {
        return ok([page.name, `Synopsis: ${page.synopsis}`, page.description]);
      }
      return ok([MAN[target]]);
    }
    return fail("info", `info: No menu item '${target}' in node '(dir)Top'`, "NOCMD", target);
  },

  whatis: (a) => {
    if (!a.length) return fail("whatis", "whatis what?", "USAGE");
    const out: string[] = [];
    const err: ShErr[] = [];
    for (const name of a) {
      const page = MAN_PAGES[name];
      if (page) out.push(page.name);
      else if (MAN[name]) out.push(MAN[name]);
      else err.push({ cmd: "whatis", code: "NOCMD", arg: name, msg: `${name}: nothing appropriate.` });
    }
    return done(out, err);
  },

  apropos: (a) => {
    if (!a.length) return fail("apropos", "apropos what?", "USAGE");
    const kw = a.join(" ").toLowerCase();
    const hits: string[] = [];
    for (const page of Object.values(MAN_PAGES)) {
      const hay = `${page.cmd} ${page.name} ${page.description} ${MAN[page.cmd] ?? ""}`.toLowerCase();
      if (hay.includes(kw)) {
        hits.push(page.name);
      }
    }
    if (!hits.length) {
      return ok([`${a.join(" ")}: nothing appropriate.`]);
    }
    return ok(hits);
  },

  alias: (a, _s, c) => {
    if (!c.aliases) c.aliases = {};
    if (!a.length) {
      const lines = Object.keys(c.aliases)
        .sort()
        .map((k) => `alias ${k}='${c.aliases![k]}'`);
      return ok(lines);
    }
    const out: string[] = [];
    const err: ShErr[] = [];
    // Support both `alias ll='ls -la'` and `alias ll = 'ls -la'`
    for (const arg of a) {
      const eq = arg.indexOf("=");
      if (eq > 0) {
        const name = arg.slice(0, eq).trim();
        const val = arg.slice(eq + 1).replace(/^['"]|['"]$/g, "");
        c.aliases[name] = val;
      } else {
        if (c.aliases[arg] !== undefined) {
          out.push(`alias ${arg}='${c.aliases[arg]}'`);
        } else {
          err.push({ cmd: "alias", code: "NOCMD", arg, msg: `bash: alias: ${arg}: not found` });
        }
      }
    }
    return done(out, err);
  },

  umask: (a, _s, c) => {
    if (!a.length) {
      const m = c.umask ?? 0o022;
      return ok([m.toString(8).padStart(4, "0")]);
    }
    const raw = a[0];
    if (!/^[0-7]{1,4}$/.test(raw)) {
      return fail("umask", `bash: umask: ${raw}: octal number out of range`, "BADOPT", raw);
    }
    c.umask = parseInt(raw, 8) & 0o777;
    return ok();
  },

  chmod: (a, _s, c) => {
    let rec = false;
    const rest: string[] = [];
    for (const arg of a) {
      if (arg === "-R" || arg === "-r") rec = true;
      else rest.push(arg);
    }
    if (rest.length < 2) return fail("chmod", "chmod: missing operand", "USAGE");
    const [modeSpec, ...files] = rest;
    const isOctal = /^[0-7]{3,4}$/.test(modeSpec);
    const octalVal = isOctal ? parseInt(modeSpec, 8) & 0o777 : null;
    if (!isOctal && applySymbolicMode(0o644, modeSpec) === null) {
      return fail("chmod", `chmod: invalid mode: '${modeSpec}'`, "BADOPT", modeSpec);
    }

    const err: ShErr[] = [];
    const applyNode = (n: Inode) => {
      if (octalVal !== null) {
        n.mode = octalVal;
      } else {
        const next = applySymbolicMode(n.mode ?? (n.type === "dir" ? 0o755 : 0o644), modeSpec);
        if (next !== null) n.mode = next;
      }
      if (rec && n.type === "dir") {
        for (const cid of Object.values(n.entries)) {
          if (c.fs.inodes[cid]) applyNode(c.fs.inodes[cid]);
        }
      }
    };

    for (const p of files) {
      const f = lookup(c.fs, normalize(c.cwd, p));
      if (f.id == null) {
        err.push({ cmd: "chmod", code: "ENOENT", arg: p, msg: `chmod: cannot access '${p}': No such file or directory` });
        continue;
      }
      const n = c.fs.inodes[f.id];
      if (!c.sudo && (n.owner ?? "architect") !== "architect") {
        err.push({ cmd: "chmod", code: "EACCES", arg: p, msg: `chmod: changing permissions of '${p}': Operation not permitted` });
        continue;
      }
      applyNode(n);
    }
    return done([], err);
  },

  chown: (a, _s, c) => {
    let rec = false;
    const rest: string[] = [];
    for (const arg of a) {
      if (arg === "-R" || arg === "-r") rec = true;
      else rest.push(arg);
    }
    if (rest.length < 2) return fail("chown", "chown: missing operand", "USAGE");
    const [ownerSpec, ...files] = rest;
    const [newOwner, newGroup] = ownerSpec.split(":");
    if (!newOwner) return fail("chown", `chown: invalid spec: '${ownerSpec}'`, "USAGE");

    const err: ShErr[] = [];
    const applyNode = (n: Inode) => {
      n.owner = newOwner;
      if (newGroup) n.group = newGroup;
      else if (ownerSpec.includes(":")) n.group = newOwner;
      if (rec && n.type === "dir") {
        for (const cid of Object.values(n.entries)) {
          if (c.fs.inodes[cid]) applyNode(c.fs.inodes[cid]);
        }
      }
    };

    for (const p of files) {
      const f = lookup(c.fs, normalize(c.cwd, p), false);
      if (f.id == null) {
        err.push({ cmd: "chown", code: "ENOENT", arg: p, msg: `chown: cannot access '${p}': No such file or directory` });
        continue;
      }
      const n = c.fs.inodes[f.id];
      if (!c.sudo && ((n.owner ?? "architect") !== "architect" || newOwner !== "architect")) {
        err.push({ cmd: "chown", code: "EACCES", arg: p, msg: `chown: changing ownership of '${p}': Operation not permitted` });
        continue;
      }
      applyNode(n);
    }
    return done([], err);
  },

  sudo: (a, stdin, c, tty) => {
    if (!a.length) return fail("sudo", "usage: sudo command [args...]", "USAGE");
    const [subCmd, ...subArgs] = a;
    const prevSudo = c.sudo;
    c.sudo = true;
    try {
      if (!C[subCmd]) {
        return fail("sudo", `sudo: ${subCmd}: command not found`, "NOCMD", subCmd);
      }
      const r = C[subCmd](subArgs, stdin, c, tty);
      if (!c.subEvents) c.subEvents = [];
      c.subEvents.push({
        name: subCmd,
        args: subArgs,
        flags: subArgs
          .filter((x) => x.length > 1 && x[0] === "-")
          .map((x) => x.slice(1))
          .join(""),
        ok: r.err.length === 0,
        code: r.err[0]?.code,
        out: r.out,
      });
      return r;
    } finally {
      c.sudo = prevSudo;
    }
  },

  cd: (a, _s, c) => {
    if (a.length > 1) return fail("cd", "bash: cd: too many arguments", "USAGE");
    const t = a[0] === "-" ? c.prev : (a[0] ?? HOME);
    const abs = normalize(c.cwd, t);
    const f = lookup(c.fs, abs);
    if (f.id == null) {
      const nd = f.err === "ENOTDIR";
      return fail("cd", `bash: cd: ${t}: ${nd ? "Not a directory" : "No such file or directory"}`, nd ? "ENOTDIR" : "ENOENT", t);
    }
    const n = c.fs.inodes[f.id];
    if (n.type !== "dir") return fail("cd", `bash: cd: ${t}: Not a directory`, "ENOTDIR", t);
    if (!hasPerm(n, 1, c)) {
      return fail("cd", `bash: cd: ${t}: Permission denied`, "EACCES", t);
    }
    c.prev = c.cwd;
    c.cwd = abs;
    c.xray = null;
    c.fx.push({ t: "walk" });
    return ok(a[0] === "-" ? [abs] : []);
  },

  ls: (args, _s, c, tty) => {
    const o = opts("ls", args, "alihA1Fd");
    if (o.bad) return o.bad;
    const all = o.f.has("a");
    const almost = o.f.has("A");
    const long = o.f.has("l");
    const ino = o.f.has("i");
    const out: string[] = [];
    const rich: Seg[][] = [];
    const err: ShErr[] = [];
    type Row = { name: string; n: Inode; base: string };
    const fileRows: Row[] = [];
    const dirs: { label: string; id: number; path: string }[] = [];

    for (const t of o.rest.length ? o.rest : ["."]) {
      const abs = normalize(c.cwd, t);
      const nf = lookup(c.fs, abs, false);
      if (nf.id == null) {
        err.push({ cmd: "ls", code: "ENOENT", arg: t, msg: `ls: cannot access '${t}': No such file or directory` });
        continue;
      }
      const f = lookup(c.fs, abs);
      const isLink = c.fs.inodes[nf.id].type === "link";
      const showLink = isLink && (long || f.id == null);
      if (!showLink && f.id != null && c.fs.inodes[f.id].type === "dir" && !o.f.has("d")) {
        dirs.push({ label: t, id: f.id, path: f.path });
      } else {
        fileRows.push({ name: t, n: c.fs.inodes[showLink || f.id == null ? nf.id : f.id], base: dirname(nf.path) });
      }
    }

    const fmt = (r: Row): Seg[] => {
      const n = r.n;
      const segs: Seg[] = [];
      if (ino) segs.push({ t: String(n.id).padStart(3) + " ", c: "ino" });
      if (long) {
        const perms = formatMode(n);
        const owner = n.owner ?? "architect";
        const nl =
          n.type === "dir" ? 2 + Object.values(n.entries).filter((i) => c.fs.inodes[i].type === "dir").length : n.nlink;
        const size = n.type === "dir" ? 4096 : n.type === "link" ? n.target.length : n.content.length;
        segs.push(
          { t: perms + " " },
          { t: String(nl), c: n.type === "file" && n.nlink > 1 ? "ino" : undefined },
          { t: ` ${owner} ${String(size).padStart(5)} ` },
        );
      }
      const broken = n.type === "link" && lookup(c.fs, normalize(r.base, n.target)).id == null;
      segs.push({ t: r.name, c: n.type === "dir" ? "dir" : n.type === "link" ? (broken ? "broken" : "link") : undefined });
      if (long && n.type === "link") segs.push({ t: " -> " }, { t: n.target, c: broken ? "broken" : undefined });
      return segs;
    };

    const emit = (rows: Row[]) => {
      const segRows = rows.map(fmt);
      segRows.forEach((s) => out.push(s.map((x) => x.t).join("")));
      if (long) segRows.forEach((s) => rich.push(s));
      else if (segRows.length) rich.push(segRows.flatMap((s, i) => (i ? [{ t: "   " } as Seg, ...s] : s)));
    };

    const multi = dirs.length + fileRows.length > 1;
    if (fileRows.length) emit(fileRows);
    dirs.forEach((d, idx) => {
      const node = c.fs.inodes[d.id];
      if (!hasPerm(node, 4, c)) {
        err.push({ cmd: "ls", code: "EACCES", arg: d.label, msg: `ls: cannot open directory '${d.label}': Permission denied` });
        return;
      }
      if (multi) {
        if (idx > 0 || fileRows.length) {
          out.push("");
          rich.push([]);
        }
        out.push(d.label + ":");
        rich.push([{ t: d.label + ":", c: "dim" }]);
      }
      const rows: Row[] = Object.keys(node.entries)
        .filter((k) => all || almost || !k.startsWith("."))
        .sort()
        .map((k) => ({ name: k, n: c.fs.inodes[node.entries[k]], base: d.path }));
      if (all) {
        const up = lookup(c.fs, dirname(d.path));
        rows.unshift({ name: ".", n: node, base: d.path }, { name: "..", n: c.fs.inodes[up.id ?? ROOT], base: d.path });
      }
      if (long) {
        out.push(`total ${rows.length}`);
        rich.push([{ t: `total ${rows.length}`, c: "dim" }]);
      }
      emit(rows);
      c.fx.push({ t: "scan", dir: d.id, xray: all || almost });
      if (all || almost) c.xray = d.id;
    });
    return done(out, err, tty ? rich : undefined);
  },

  tree: (args, _s, c) => {
    const o = opts("tree", args, "a");
    if (o.bad) return o.bad;
    const t = o.rest[0] ?? ".";
    const f = lookup(c.fs, normalize(c.cwd, t));
    if (f.id == null || c.fs.inodes[f.id].type !== "dir") {
      return fail("tree", `tree: ${t}: No such file or directory`, "ENOENT", t);
    }
    if (!hasPerm(c.fs.inodes[f.id], 4, c)) {
      return fail("tree", `tree: ${t}: Permission denied`, "EACCES", t);
    }
    const out = [t];
    let nd = 0;
    let nf = 0;
    const walk = (id: number, prefix: string) => {
      const node = c.fs.inodes[id];
      if (!hasPerm(node, 4, c)) return;
      const ks = Object.keys(node.entries)
        .filter((k) => o.f.has("a") || !k.startsWith("."))
        .sort();
      ks.forEach((k, i) => {
        const n = c.fs.inodes[node.entries[k]];
        const last = i === ks.length - 1;
        out.push(prefix + (last ? "└── " : "├── ") + k + (n.type === "link" ? " -> " + n.target : ""));
        if (n.type === "dir") {
          nd++;
          walk(n.id, prefix + (last ? "    " : "│   "));
        } else nf++;
      });
    };
    walk(f.id, "");
    out.push("", `${nd} directories, ${nf} files`);
    return ok(out);
  },

  touch: (a, _s, c) => {
    const o = opts("touch", a, "");
    if (o.bad) return o.bad;
    if (!o.rest.length) return fail("touch", "touch: missing file operand", "USAGE");
    const err: ShErr[] = [];
    const mask = c.umask ?? 0o022;
    for (const p of o.rest) {
      const f = lookup(c.fs, normalize(c.cwd, p));
      if (f.id != null) {
        if (!hasPerm(c.fs.inodes[f.id], 2, c)) {
          err.push({ cmd: "touch", code: "EACCES", arg: p, msg: `touch: cannot touch '${p}': Permission denied` });
        }
        continue;
      }
      if (f.parent == null) {
        err.push({ cmd: "touch", code: "NOPARENT", arg: p, msg: `touch: cannot touch '${p}': No such file or directory` });
        continue;
      }
      if (!hasPerm(c.fs.inodes[f.parent], 2, c)) {
        err.push({ cmd: "touch", code: "EACCES", arg: p, msg: `touch: cannot touch '${p}': Permission denied` });
        continue;
      }
      link(c.fs, f.parent, f.name, alloc(c.fs, "file", { mode: 0o666 & ~mask }).id);
      c.fx.push({ t: "create", dir: f.parent, name: f.name, how: "touch" });
    }
    return done([], err);
  },

  mkdir: (a, _s, c) => {
    const o = opts("mkdir", a, "p");
    if (o.bad) return o.bad;
    if (!o.rest.length) return fail("mkdir", "mkdir: missing operand", "USAGE");
    const err: ShErr[] = [];
    const mask = c.umask ?? 0o022;
    const make = (parent: number, name: string) => {
      link(c.fs, parent, name, alloc(c.fs, "dir", { mode: 0o777 & ~mask }).id);
      c.fx.push({ t: "create", dir: parent, name, how: "mkdir" });
    };
    for (const p of o.rest) {
      const abs = normalize(c.cwd, p);
      const e = (code: string, why: string) =>
        err.push({ cmd: "mkdir", code, arg: p, msg: `mkdir: cannot create directory '${p}': ${why}` });
      if (o.f.has("p")) {
        let cur = "";
        for (const comp of abs.split("/").filter(Boolean)) {
          cur += "/" + comp;
          const f = lookup(c.fs, cur);
          if (f.id != null) {
            if (c.fs.inodes[f.id].type !== "dir") {
              e("EEXIST", "Not a directory");
              break;
            }
            continue;
          }
          if (f.parent == null) {
            e("NOPARENT", "No such file or directory");
            break;
          }
          if (!hasPerm(c.fs.inodes[f.parent], 2, c)) {
            e("EACCES", "Permission denied");
            break;
          }
          make(f.parent, f.name);
        }
        continue;
      }
      const f = lookup(c.fs, abs, false);
      if (f.id != null) e("EEXIST", "File exists");
      else if (f.parent == null) e("NOPARENT", "No such file or directory");
      else if (!hasPerm(c.fs.inodes[f.parent], 2, c)) e("EACCES", "Permission denied");
      else make(f.parent, f.name);
    }
    return done([], err);
  },

  rmdir: (a, _s, c) => {
    const o = opts("rmdir", a, "");
    if (o.bad) return o.bad;
    if (!o.rest.length) return fail("rmdir", "rmdir: missing operand", "USAGE");
    const err: ShErr[] = [];
    for (const p of o.rest) {
      const f = lookup(c.fs, normalize(c.cwd, p), false);
      const e = (code: string, why: string) =>
        err.push({ cmd: "rmdir", code, arg: p, msg: `rmdir: failed to remove '${p}': ${why}` });
      if (f.id == null || f.parent == null) e("ENOENT", "No such file or directory");
      else if (!hasPerm(c.fs.inodes[f.parent], 2, c)) e("EACCES", "Permission denied");
      else if (c.fs.inodes[f.id].type !== "dir") e("ENOTDIR", "Not a directory");
      else if (Object.keys(c.fs.inodes[f.id].entries).length || f.id === ROOT) e("ENOTEMPTY", "Directory not empty");
      else {
        c.fx.push({ t: "remove", dir: f.parent, name: f.name, kind: "dir", how: "rm" });
        unlink(c.fs, f.parent, f.name);
      }
    }
    return done([], err);
  },

  rm: (a, _s, c) => {
    const o = opts("rm", a, "rRf");
    if (o.bad) return o.bad;
    if (!o.rest.length) return o.f.has("f") ? ok() : fail("rm", "rm: missing operand", "USAGE");
    const rec = o.f.has("r") || o.f.has("R");
    const err: ShErr[] = [];
    for (const p of o.rest) {
      const b = basename(p);
      if (b === "." || b === "..") {
        err.push({ cmd: "rm", code: "REFUSE", arg: p, msg: `rm: refusing to remove '.' or '..' directory: skipping '${p}'` });
        continue;
      }
      const f = lookup(c.fs, normalize(c.cwd, p), false);
      if (f.id == null || f.parent == null) {
        if (!o.f.has("f")) {
          err.push({ cmd: "rm", code: "ENOENT", arg: p, msg: `rm: cannot remove '${p}': No such file or directory` });
        }
        continue;
      }
      if (f.id === ROOT) {
        err.push({ cmd: "rm", code: "REFUSE", arg: p, msg: "rm: it is dangerous to operate recursively on '/'" });
        continue;
      }
      const n = c.fs.inodes[f.id];
      if (n.type === "dir" && !rec) {
        err.push({ cmd: "rm", code: "EISDIR", arg: p, msg: `rm: cannot remove '${p}': Is a directory` });
        continue;
      }
      const glitchType = detectGlitchInode(c.fs, f.name, n, rec);
      if ((n.glitch?.startsWith("boss-") || glitchType?.startsWith("boss-")) && c.bossShielded) {
        err.push({
          cmd: "rm",
          code: "SHIELDED",
          arg: p,
          msg: `rm: հնարավոր չէ խոցել '${p}'-ը․ Բոսի պաշտպանիչ վահանն ակտիվ է (նախ կատարեք առաքելության մյուս բոլոր առաջադրանքները)`,
        });
        continue;
      }
      const canTouchTarget = c.sudo || n.type === "link" || (n.mode & 0o200) !== 0;
      if (!hasPerm(c.fs.inodes[f.parent], 2, c) || !canTouchTarget) {
        err.push({ cmd: "rm", code: "EACCES", arg: p, msg: `rm: cannot remove '${p}': Permission denied` });
        continue;
      }
      if (glitchType) {
        c.pendingBattle = {
          targetPath: p,
          targetName: f.name,
          recursive: rec,
          glitchType,
        };
        return done([], err);
      }
      c.fx.push({ t: "remove", dir: f.parent, name: f.name, kind: kindOf(f.name, n), how: "rm" });
      unlink(c.fs, f.parent, f.name);
    }
    return done([], err);
  },

  cp: (a, _s, c) => {
    const o = opts("cp", a, "rRa");
    if (o.bad) return o.bad;
    if (!o.rest.length) return fail("cp", "cp: missing file operand", "USAGE");
    if (o.rest.length === 1) return fail("cp", `cp: missing destination file operand after '${o.rest[0]}'`, "USAGE");
    const rec = o.f.has("r") || o.f.has("R") || o.f.has("a");
    const dest = o.rest[o.rest.length - 1];
    const srcs = o.rest.slice(0, -1);
    if (srcs.length > 1 && !destination(c, dest, "x", "x").isDir) {
      return fail("cp", `cp: target '${dest}' is not a directory`, "NOTDIRTARGET", dest);
    }
    const err: ShErr[] = [];
    const e = (code: string, arg: string, msg: string) => err.push({ cmd: "cp", code, arg, msg });
    for (const s of srcs) {
      const sf = lookup(c.fs, normalize(c.cwd, s));
      if (sf.id == null || sf.parent == null) {
        e("ENOENT", s, `cp: cannot stat '${s}': No such file or directory`);
        continue;
      }
      const sn = c.fs.inodes[sf.id];
      if (sn.type === "dir" && !rec) {
        e("OMITDIR", s, `cp: -r not specified; omitting directory '${s}'`);
        continue;
      }
      if (!hasPerm(sn, 4, c)) {
        e("EACCES", s, `cp: cannot open '${s}' for reading: Permission denied`);
        continue;
      }
      const d = destination(c, dest, s, sf.name);
      if (d.parent == null) {
        e("NOPARENT", dest, `cp: cannot create regular file '${dest}': No such file or directory`);
        continue;
      }
      if (!hasPerm(c.fs.inodes[d.parent], 2, c)) {
        e("EACCES", dest, `cp: cannot create '${d.shown}': Permission denied`);
        continue;
      }
      const existing = c.fs.inodes[d.parent].entries[d.name];
      if (existing !== undefined) {
        const en = c.fs.inodes[existing];
        if (existing === sf.id) {
          e("SAMEFILE", s, `cp: '${s}' and '${d.shown}' are the same file`);
          continue;
        }
        if (en.type === "dir" || sn.type === "dir") {
          e("EEXIST", d.shown, `cp: cannot overwrite '${d.shown}': a different kind of thing already has that name`);
          continue;
        }
        if (en.type === "file") {
          if (!hasPerm(en, 2, c)) {
            e("EACCES", d.shown, `cp: cannot create regular file '${d.shown}': Permission denied`);
            continue;
          }
          en.content = sn.content;
          c.fx.push({ t: "clone", dir: d.parent, name: d.name, fromDir: sf.parent, fromName: sf.name });
          continue;
        }
        unlink(c.fs, d.parent, d.name);
      }
      link(c.fs, d.parent, d.name, deepCopy(c.fs, sf.id));
      c.fx.push({ t: "clone", dir: d.parent, name: d.name, fromDir: sf.parent, fromName: sf.name });
    }
    return done([], err);
  },

  mv: (a, _s, c) => {
    const o = opts("mv", a, "fn");
    if (o.bad) return o.bad;
    if (!o.rest.length) return fail("mv", "mv: missing file operand", "USAGE");
    if (o.rest.length === 1) return fail("mv", `mv: missing destination file operand after '${o.rest[0]}'`, "USAGE");
    const dest = o.rest[o.rest.length - 1];
    const srcs = o.rest.slice(0, -1);
    if (srcs.length > 1 && !destination(c, dest, "x", "x").isDir) {
      return fail("mv", `mv: target '${dest}' is not a directory`, "NOTDIRTARGET", dest);
    }
    const err: ShErr[] = [];
    const e = (code: string, arg: string, msg: string) => err.push({ cmd: "mv", code, arg, msg });
    for (const s of srcs) {
      const sf = lookup(c.fs, normalize(c.cwd, s), false);
      if (sf.id == null || sf.parent == null || sf.id === ROOT) {
        e("ENOENT", s, `mv: cannot stat '${s}': No such file or directory`);
        continue;
      }
      if (!hasPerm(c.fs.inodes[sf.parent], 2, c)) {
        e("EACCES", s, `mv: cannot move '${s}': Permission denied`);
        continue;
      }
      const sn = c.fs.inodes[sf.id];
      const d = destination(c, dest, s, sf.name);
      if (d.parent == null) {
        e("NOPARENT", dest, `mv: cannot move '${s}' to '${dest}': No such file or directory`);
        continue;
      }
      if (!hasPerm(c.fs.inodes[d.parent], 2, c)) {
        e("EACCES", dest, `mv: cannot move '${s}' to '${d.shown}': Permission denied`);
        continue;
      }
      if (sn.type === "dir" && contains(c.fs, sf.id, d.parent)) {
        e("SUBDIR", s, `mv: cannot move '${s}' to a subdirectory of itself, '${d.shown}'`);
        continue;
      }
      const existing = c.fs.inodes[d.parent].entries[d.name];
      if (existing !== undefined) {
        const en = c.fs.inodes[existing];
        if (existing === sf.id && d.parent === sf.parent && d.name === sf.name) {
          e("SAMEFILE", s, `mv: '${s}' and '${d.shown}' are the same file`);
          continue;
        }
        if (en.type === "dir" && sn.type !== "dir") {
          e("EEXIST", d.shown, `mv: cannot overwrite directory '${d.shown}' with non-directory`);
          continue;
        }
        if (en.type !== "dir" && sn.type === "dir") {
          e("EEXIST", d.shown, `mv: cannot overwrite non-directory '${d.shown}' with directory '${s}'`);
          continue;
        }
        if (en.type === "dir" && Object.keys(en.entries).length) {
          e("ENOTEMPTY", d.shown, `mv: cannot move '${s}' to '${d.shown}': Directory not empty`);
          continue;
        }
        unlink(c.fs, d.parent, d.name);
      }
      const kind = kindOf(sf.name, sn);
      delete c.fs.inodes[sf.parent].entries[sf.name];
      c.fs.inodes[d.parent].entries[d.name] = sf.id;
      if (sf.parent === d.parent) c.fx.push({ t: "rename", dir: d.parent, name: d.name, from: sf.name });
      else {
        c.fx.push({ t: "remove", dir: sf.parent, name: sf.name, kind, how: "mv" });
        c.fx.push({ t: "arrive", dir: d.parent, name: d.name });
      }
    }
    return done([], err);
  },

  ln: (a, _s, c) => {
    const o = opts("ln", a, "sf");
    if (o.bad) return o.bad;
    if (!o.rest.length) return fail("ln", "ln: missing file operand", "USAGE");
    const sym = o.f.has("s");
    const what = sym ? "symbolic" : "hard";
    const target = o.rest[0];
    const dest = o.rest[1] ?? basename(target);

    let parent: number | null;
    let name: string;
    let shown = dest;
    const df = lookup(c.fs, normalize(c.cwd, dest));
    if (o.rest.length > 1 && df.id != null && c.fs.inodes[df.id].type === "dir") {
      parent = df.id;
      name = basename(target);
      shown = stripSlash(dest) + "/" + name;
    } else {
      const nf = lookup(c.fs, normalize(c.cwd, dest), false);
      parent = nf.id === ROOT ? null : nf.parent;
      name = nf.name;
    }

    let tid: number | null = null;
    if (!sym) {
      const tf = lookup(c.fs, normalize(c.cwd, target), false);
      if (tf.id == null) return fail("ln", `ln: failed to access '${target}': No such file or directory`, "ENOENT", target);
      if (c.fs.inodes[tf.id].type === "dir") {
        return fail("ln", `ln: ${target}: hard link not allowed for directory`, "HARDDIR", target);
      }
      tid = tf.id;
    }
    if (parent == null) {
      return fail("ln", `ln: failed to create ${what} link '${shown}': No such file or directory`, "NOPARENT", shown);
    }
    if (!hasPerm(c.fs.inodes[parent], 2, c)) {
      return fail("ln", `ln: failed to create ${what} link '${shown}': Permission denied`, "EACCES", shown);
    }
    if (c.fs.inodes[parent].entries[name] !== undefined) {
      if (!o.f.has("f") || c.fs.inodes[c.fs.inodes[parent].entries[name]].type === "dir") {
        return fail("ln", `ln: failed to create ${what} link '${shown}': File exists`, "EEXIST", shown);
      }
      unlink(c.fs, parent, name);
    }
    if (sym) link(c.fs, parent, name, alloc(c.fs, "link", { target }).id);
    else link(c.fs, parent, name, tid as number);
    c.fx.push({ t: "create", dir: parent, name, how: sym ? "lns" : "ln" });
    return ok();
  },

  cat: (a, stdin, c) => {
    const o = opts("cat", a, "n");
    if (o.bad) return o.bad;
    const i = inputs("cat", o.rest, stdin, c);
    return done(
      i.sets.flatMap((s) => s.lines),
      i.err,
    );
  },

  grep: (a, stdin, c, tty) => {
    const o = opts("grep", a, "ivcnE");
    if (o.bad) return o.bad;
    if (!o.rest.length) return fail("grep", "Usage: grep [OPTION]... PATTERN [FILE]...", "USAGE");
    const [pat, ...files] = o.rest;
    const fl = o.f.has("i") ? "i" : "";
    let re: RegExp;
    try {
      re = new RegExp(pat, fl);
    } catch {
      re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), fl);
    }
    const i = inputs("grep", files, stdin, c);
    const inv = o.f.has("v");
    const countOnly = o.f.has("c");
    const out: string[] = [];
    const rich: Seg[][] = [];
    let any = false;
    for (const s of i.sets) {
      const pre = i.sets.length > 1 ? s.file + ":" : "";
      let count = 0;
      s.lines.forEach((ln, idx) => {
        if (re.test(ln) === inv) return;
        count++;
        any = true;
        if (countOnly) return;
        const p = pre + (o.f.has("n") ? idx + 1 + ":" : "");
        out.push(p + ln);
        const segs: Seg[] = p ? [{ t: p, c: "dim" }] : [];
        const m = inv ? null : re.exec(ln);
        if (m && m[0]) {
          segs.push({ t: ln.slice(0, m.index) }, { t: m[0], c: "hit" }, { t: ln.slice(m.index + m[0].length) });
        } else segs.push({ t: ln });
        rich.push(segs);
      });
      if (countOnly) out.push(pre + count);
    }
    return { out, rich: tty && !countOnly ? rich : undefined, err: i.err, code: i.err.length ? 2 : any ? 0 : 1 };
  },

  sort: (a, stdin, c) => {
    const o = opts("sort", a, "rnu");
    if (o.bad) return o.bad;
    const i = inputs("sort", o.rest, stdin, c);
    let ls = i.sets.flatMap((s) => s.lines);
    ls.sort(
      o.f.has("n")
        ? (x, y) => (parseFloat(x) || 0) - (parseFloat(y) || 0)
        : (x, y) => (x < y ? -1 : x > y ? 1 : 0),
    );
    if (o.f.has("r")) ls.reverse();
    if (o.f.has("u")) ls = ls.filter((l, k) => k === 0 || l !== ls[k - 1]);
    return done(ls, i.err);
  },

  uniq: (a, stdin, c) => {
    const o = opts("uniq", a, "c");
    if (o.bad) return o.bad;
    const i = inputs("uniq", o.rest.slice(0, 1), stdin, c);
    const groups: { line: string; n: number }[] = [];
    for (const l of i.sets.flatMap((s) => s.lines)) {
      const last = groups[groups.length - 1];
      if (last && last.line === l) last.n++;
      else groups.push({ line: l, n: 1 });
    }
    return done(
      groups.map((g) => (o.f.has("c") ? `${String(g.n).padStart(7)} ${g.line}` : g.line)),
      i.err,
    );
  },

  wc: (a, stdin, c) => {
    const o = opts("wc", a, "lwcm");
    if (o.bad) return o.bad;
    const i = inputs("wc", o.rest, stdin, c);
    const picked = (["l", "w", "c"] as const).filter((k) => o.f.has(k) || (k === "c" && o.f.has("m")));
    const cols = picked.length ? picked : (["l", "w", "c"] as const);
    const rows = i.sets.map((s) => ({
      file: s.file,
      l: s.lines.length,
      w: s.lines.join(" ").split(/\s+/).filter(Boolean).length,
      c: s.lines.reduce((n, x) => n + x.length + 1, 0),
    }));
    const out = rows.map((r) => cols.map((k) => r[k]).join(" ") + (r.file ? " " + r.file : ""));
    if (rows.length > 1) out.push(cols.map((k) => rows.reduce((n, r) => n + r[k], 0)).join(" ") + " total");
    return done(out, i.err);
  },

  head: headTail("head", false),
  tail: headTail("tail", true),
};

/* ---------- bash integer arithmetic $(( ... )) ---------- */

function evalArith(expr: string): number | null {
  let pos = 0;
  const s = expr.trim();
  const skipWs = () => {
    while (pos < s.length && /\s/.test(s[pos])) pos++;
  };

  const parseExpr = (): number | null => {
    let left = parseTerm();
    if (left === null) return null;
    while (true) {
      skipWs();
      if (pos < s.length && (s[pos] === "+" || s[pos] === "-")) {
        const op = s[pos++];
        const right = parseTerm();
        if (right === null) return null;
        left = op === "+" ? left + right : left - right;
      } else break;
    }
    return left;
  };

  const parseTerm = (): number | null => {
    let left = parseFactor();
    if (left === null) return null;
    while (true) {
      skipWs();
      if (pos < s.length && (s[pos] === "*" || s[pos] === "/" || s[pos] === "%")) {
        const op = s[pos++];
        const right = parseFactor();
        if (right === null) return null;
        if (op === "*") left = left * right;
        else if (op === "/") {
          if (right === 0) return null;
          left = Math.trunc(left / right);
        } else {
          if (right === 0) return null;
          left = left % right;
        }
      } else break;
    }
    return left;
  };

  const parseFactor = (): number | null => {
    skipWs();
    if (pos >= s.length) return null;
    if (s[pos] === "+") {
      pos++;
      return parseFactor();
    }
    if (s[pos] === "-") {
      pos++;
      const v = parseFactor();
      return v === null ? null : -v;
    }
    if (s[pos] === "(") {
      pos++;
      const v = parseExpr();
      skipWs();
      if (v === null || pos >= s.length || s[pos] !== ")") return null;
      pos++;
      return v;
    }
    let numStr = "";
    while (pos < s.length && /\d/.test(s[pos])) {
      numStr += s[pos++];
    }
    if (!numStr) return null;
    return parseInt(numStr, 10);
  };

  const res = parseExpr();
  skipWs();
  if (res === null || pos < s.length) return null;
  return res;
}

/* ---------- tokenizer & substitutions ---------- */

type Tok = { k: "w"; v: string; glob: boolean; quoted: boolean } | { k: "op"; v: string };

function readParenGroup(s: string, startAfterOpen: number, doubleOpen: boolean): { content: string; nextIdx: number } | null {
  let depth = doubleOpen ? 2 : 1;
  let i = startAfterOpen;
  while (i < s.length) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") {
      depth--;
      if (depth === 0) {
        if (doubleOpen && s[i - 1] !== ")") return null;
        const end = doubleOpen ? i - 1 : i;
        return { content: s.slice(startAfterOpen, end), nextIdx: i + 1 };
      }
    }
    i++;
  }
  return null;
}

function tokenize(s: string): Tok[] | string {
  const toks: Tok[] = [];
  let cur = "";
  let has = false;
  let glob = false;
  let quoted = false;
  let i = 0;
  const push = () => {
    if (has) toks.push({ k: "w", v: cur, glob, quoted });
    cur = "";
    has = false;
    glob = false;
    quoted = false;
  };
  while (i < s.length) {
    const ch = s[i];
    if (ch === " " || ch === "\t") {
      push();
      i++;
    } else if (ch === "'" || ch === '"') {
      let j = i + 1;
      let buf = "";
      while (j < s.length && s[j] !== ch) {
        if (ch === '"' && s[j] === "\\" && (s[j + 1] === '"' || s[j + 1] === "\\")) j++;
        buf += s[j++];
      }
      if (j >= s.length) return `bash: unexpected EOF while looking for matching \`${ch}'`;
      // If single-quoted, escape $ so $(...) is not expanded inside single quotes
      if (ch === "'") {
        buf = buf.replace(/\$\(/g, "\u0000(");
      }
      cur += buf;
      has = true;
      quoted = true;
      i = j + 1;
    } else if (ch === "$" && s[i + 1] === "(") {
      const isDouble = s[i + 2] === "(";
      const start = isDouble ? i + 3 : i + 2;
      const grp = readParenGroup(s, start, isDouble);
      if (!grp) return `bash: syntax error: unclosed ${isDouble ? "$((...))" : "$(...)"}`;
      cur += isDouble ? `$((${grp.content}))` : `$(${grp.content})`;
      has = true;
      i = grp.nextIdx;
    } else if (ch === "\\" && i + 1 < s.length) {
      cur += s[i + 1];
      has = true;
      i += 2;
    } else if (ch === "#" && !has) {
      break;
    } else if ("|;<>&".includes(ch)) {
      push();
      const two = s.slice(i, i + 2);
      if (two === ">>" || two === "&&" || two === "||") {
        toks.push({ k: "op", v: two });
        i += 2;
      } else {
        toks.push({ k: "op", v: ch });
        i++;
      }
    } else if (ch === "~" && !has && (i + 1 >= s.length || "/ \t".includes(s[i + 1]))) {
      cur += HOME;
      has = true;
      i++;
    } else {
      if (ch === "*" || ch === "?" || ch === "[") glob = true;
      cur += ch;
      has = true;
      i++;
    }
  }
  push();
  return toks;
}

/** Expand $((...)) and $(...) inside a word token. */
function expandWordSubstitutions(
  word: string,
  quoted: boolean,
  c: Ctx,
  res: RunOut,
): { words: string[]; err?: ShErr } {
  let out = "";
  let i = 0;
  let hadSub = false;
  while (i < word.length) {
    if (word[i] === "$" && word[i + 1] === "(") {
      const isDouble = word[i + 2] === "(";
      const start = isDouble ? i + 3 : i + 2;
      const grp = readParenGroup(word, start, isDouble);
      if (!grp) {
        return { words: [], err: { cmd: "bash", code: "SYNTAX", msg: "bash: syntax error in expansion" } };
      }
      if (isDouble) {
        const val = evalArith(grp.content);
        if (val === null) {
          return {
            words: [],
            err: { cmd: "bash", code: "SYNTAX", arg: grp.content, msg: `bash: ${grp.content}: arithmetic syntax error` },
          };
        }
        out += String(val);
      } else {
        hadSub = true;
        const subCtx: Ctx = {
          fs: c.fs,
          cwd: c.cwd,
          prev: c.prev,
          fx: c.fx,
          xray: c.xray,
          aliases: c.aliases,
          umask: c.umask,
          sudo: c.sudo,
          bossShielded: c.bossShielded,
        };
        const subRes = run(grp.content, subCtx);
        res.events.push(...subRes.events);
        if (subRes.errors.length) {
          return { words: [], err: subRes.errors[0] };
        }
        const subText = subRes.out
          .filter((o) => o.kind === "out")
          .map((o) => o.text)
          .join(" ")
          .trim();
        out += subText;
      }
      i = grp.nextIdx;
    } else {
      out += word[i++];
    }
  }
  out = out.replace(/\u0000\(/g, "$(");
  if (!quoted && hadSub) {
    const split = out.split(/\s+/).filter(Boolean);
    return { words: split.length ? split : [out] };
  }
  return { words: [out] };
}

function globToRegex(pat: string): RegExp {
  let reStr = "^";
  let i = 0;
  while (i < pat.length) {
    const ch = pat[i];
    if (ch === "*") {
      reStr += ".*";
      i++;
    } else if (ch === "?") {
      reStr += ".";
      i++;
    } else if (ch === "[") {
      const close = pat.indexOf("]", i + 1);
      if (close > i + 1) {
        let inner = pat.slice(i + 1, close);
        if (inner.startsWith("!")) inner = "^" + inner.slice(1);
        reStr += "[" + inner + "]";
        i = close + 1;
      } else {
        reStr += "\\[";
        i++;
      }
    } else {
      if (/[.+^${}()|[\]\\]/.test(ch)) reStr += "\\" + ch;
      else reStr += ch;
      i++;
    }
  }
  reStr += "$";
  try {
    return new RegExp(reStr);
  } catch {
    return new RegExp("^" + pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$");
  }
}

/** Expand *, ?, and [...] in the last path component, like the real shell does before a command starts. */
function expandGlob(word: string, c: Ctx): string[] {
  const slash = word.lastIndexOf("/");
  const dirPart = word.slice(0, slash + 1);
  const pat = word.slice(slash + 1);
  if (/[*?[\]]/.test(dirPart)) return [word];
  const f = lookup(c.fs, normalize(c.cwd, dirPart || "."));
  if (f.id == null || c.fs.inodes[f.id].type !== "dir") return [word];
  if (!hasPerm(c.fs.inodes[f.id], 4, c)) return [word];
  const re = globToRegex(pat);
  const hits = Object.keys(c.fs.inodes[f.id].entries)
    .filter((k) => re.test(k) && (pat.startsWith(".") || !k.startsWith(".")))
    .sort();
  return hits.length ? hits.map((h) => dirPart + h) : [word];
}

/* ---------- runner ---------- */

interface Simple {
  name: string;
  args: string[];
  aliasName?: string;
  aliasArgs?: string[];
  redir?: { op: ">" | ">>"; file: string };
}

const quote = (s: string) => (s === "" || /\s/.test(s) ? `"${s}"` : s);

export function run(raw: string, c: Ctx): RunOut {
  const res: RunOut = { out: [], events: [], errors: [], trace: null, clear: false };
  if (!c.aliases) c.aliases = {};
  const report = (e: ShErr) => {
    res.errors.push(e);
    res.out.push({ kind: "err", text: e.msg, err: e });
  };
  const syntax = (msg: string, code = "SYNTAX"): RunOut => {
    report({ msg, code, cmd: "bash" });
    return res;
  };

  const toks = tokenize(raw.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'"));
  if (typeof toks === "string") return syntax(toks);

  // Split on ; and && into separate pipelines.
  const seqs: { toks: Tok[]; and: boolean }[] = [{ toks: [], and: false }];
  for (const t of toks) {
    if (t.k === "op" && (t.v === ";" || t.v === "&&")) {
      if (!seqs[seqs.length - 1].toks.length) return syntax(`bash: syntax error near unexpected token \`${t.v}'`);
      seqs.push({ toks: [], and: t.v === "&&" });
    } else if (t.k === "op" && (t.v === "||" || t.v === "&" || t.v === "<")) {
      return syntax(
        t.v === "<"
          ? "bash: input redirection (<) is not wired up in this mainframe. Pass the file name as an argument instead."
          : `bash: \`${t.v}' is not wired up in this mainframe. Use ; or && to chain commands.`,
        "UNSUPPORTED",
      );
    } else seqs[seqs.length - 1].toks.push(t);
  }

  let code = 0;
  for (const sq of seqs) {
    if (c.pendingBattle) break;
    if (!sq.toks.length) continue;
    if (sq.and && code !== 0) continue;

    // Parse one pipeline into simple commands.
    const cmds: Simple[] = [];
    let words: string[] = [];
    let redir: Simple["redir"];
    const flush = (): boolean => {
      if (!words.length && !redir) return false;
      let aliasName: string | undefined;
      let aliasArgs: string[] | undefined;
      // Alias expansion on the command name
      if (words.length > 0 && c.aliases && c.aliases[words[0]] !== undefined) {
        aliasName = words[0];
        aliasArgs = words.slice(1);
        const aliasVal = c.aliases[words[0]];
        const aliasToks = tokenize(aliasVal);
        if (Array.isArray(aliasToks)) {
          const aliasWords = aliasToks.filter((t): t is Extract<Tok, { k: "w" }> => t.k === "w").map((t) => t.v);
          if (aliasWords.length > 0) {
            words = [...aliasWords, ...words.slice(1)];
          }
        }
      }
      cmds.push({ name: words[0] ?? ":", args: words.slice(1), aliasName, aliasArgs, redir });
      words = [];
      redir = undefined;
      return true;
    };
    for (let i = 0; i < sq.toks.length; i++) {
      const t = sq.toks[i];
      if (t.k === "w") {
        const sub = expandWordSubstitutions(t.v, t.quoted, c, res);
        if (sub.err) {
          report(sub.err);
          return res;
        }
        for (const w of sub.words) {
          const isGlob = !t.quoted && (t.glob || /[*?[\]]/.test(w));
          words.push(...(isGlob ? expandGlob(w, c) : [w]));
        }
      } else if (t.v === "|") {
        if (!flush()) return syntax("bash: syntax error near unexpected token `|'");
      } else {
        const nx = sq.toks[i + 1];
        if (!nx || nx.k !== "w") return syntax("bash: syntax error near unexpected token `newline'");
        const sub = expandWordSubstitutions(nx.v, nx.quoted, c, res);
        if (sub.err) {
          report(sub.err);
          return res;
        }
        redir = { op: t.v as ">" | ">>", file: sub.words[0] ?? nx.v };
        i++;
      }
    }
    if (!flush()) return syntax("bash: syntax error near unexpected token `|'");

    // Execute it.
    const trace: Trace = { stages: [], sink: null };
    let stdin: string[] | null = null;
    cmds.forEach((cmd, idx) => {
      if (c.pendingBattle) return;
      const last = idx === cmds.length - 1;
      const tty = last && !cmd.redir;
      const label = [cmd.name === ":" ? "" : cmd.name, ...cmd.args.map(quote)].join(" ").trim();
      const inN: number | null = stdin ? stdin.length : null;

      // The shell opens (and for > empties) the output file BEFORE the command runs.
      let target: Inode | null = null;
      let before = 0;
      let sludge = false;
      let redirFailed = false;
      if (cmd.redir) {
        const f = lookup(c.fs, normalize(c.cwd, cmd.redir.file));
        if (f.id != null && c.fs.inodes[f.id].type === "dir") {
          report({ cmd: "bash", code: "EISDIR", arg: cmd.redir.file, msg: `bash: ${cmd.redir.file}: Is a directory` });
          redirFailed = true;
        } else if (f.id == null && f.parent == null) {
          report({
            cmd: "bash",
            code: "NOPARENT",
            arg: cmd.redir.file,
            msg: `bash: ${cmd.redir.file}: No such file or directory`,
          });
          redirFailed = true;
        } else if (f.id == null) {
          if (!hasPerm(c.fs.inodes[f.parent as number], 2, c)) {
            report({
              cmd: "bash",
              code: "EACCES",
              arg: cmd.redir.file,
              msg: `bash: ${cmd.redir.file}: Permission denied`,
            });
            redirFailed = true;
          } else {
            const mask = c.umask ?? 0o022;
            target = alloc(c.fs, "file", { mode: 0o666 & ~mask });
            link(c.fs, f.parent as number, f.name, target.id);
            c.fx.push({ t: "create", dir: f.parent as number, name: f.name, how: "write" });
          }
        } else {
          target = c.fs.inodes[f.id];
          if (!hasPerm(target, 2, c)) {
            report({
              cmd: "bash",
              code: "EACCES",
              arg: cmd.redir.file,
              msg: `bash: ${cmd.redir.file}: Permission denied`,
            });
            redirFailed = true;
            target = null;
          } else {
            before = toLines(target.content).length;
            sludge = /MALWARE|CORRUPT/.test(target.content);
            if (cmd.redir.op === ">") target.content = "";
            if (f.parent != null) c.fx.push({ t: "write", dir: f.parent, name: f.name, op: cmd.redir.op });
          }
        }
      }

      c.subEvents = [];
      let r: Res;
      if (redirFailed) r = { out: [], err: [], code: 1 };
      else if (!C[cmd.name]) {
        r = fail("bash", `bash: ${cmd.name}: command not found`, "NOCMD", cmd.name);
        r.code = 127;
      } else r = C[cmd.name](cmd.args, stdin, c, tty);

      r.err.forEach(report);
      if (r.clear) res.clear = true;
      if (c.manCmd) res.manCmd = c.manCmd;
      if (c.pendingBattle) res.pendingBattle = c.pendingBattle;

      if (target && cmd.redir) {
        const kept = cmd.redir.op === ">>" ? toLines(target.content) : [];
        target.content = fromLines([...kept, ...r.out]);
        trace.sink = {
          op: cmd.redir.op,
          file: cmd.redir.file,
          before,
          after: kept.length + r.out.length,
          added: r.out.length,
          sludge,
        };
      } else if (last && !redirFailed) {
        // On a terminal, commands like ls and grep print a coloured layout; in a pipe they emit plain lines.
        if (r.rich) r.rich.forEach((segs) => res.out.push({ kind: "out", text: segs.map((x) => x.t).join(""), segs }));
        else r.out.forEach((text) => res.out.push({ kind: "out", text }));
      }

      trace.stages.push({ label, name: cmd.name, inN, out: r.out, err: r.err.length > 0 || redirFailed });
      res.events.push({
        name: cmd.name,
        args: cmd.args,
        flags: cmd.args
          .filter((x) => x.length > 1 && x[0] === "-")
          .map((x) => x.slice(1))
          .join(""),
        ok: r.err.length === 0 && !redirFailed,
        code: r.err[0]?.code,
        out: r.out,
      });
      if (cmd.aliasName) {
        res.events.push({
          name: cmd.aliasName,
          args: cmd.aliasArgs ?? [],
          flags: (cmd.aliasArgs ?? [])
            .filter((x) => x.length > 1 && x[0] === "-")
            .map((x) => x.slice(1))
            .join(""),
          ok: r.err.length === 0 && !redirFailed,
          code: r.err[0]?.code,
          out: r.out,
        });
      }
      if (c.subEvents && c.subEvents.length) {
        res.events.push(...c.subEvents);
      }
      stdin = cmd.redir ? [] : r.out;
      code = redirFailed ? 1 : r.code;
    });

    const interesting = trace.stages.length > 1 || trace.sink != null;
    if (interesting || !res.trace || !(res.trace.stages.length > 1 || res.trace.sink)) res.trace = trace;
  }
  return res;
}

/* ---------- Tab completion ---------- */

export function completions(input: string, fs: FS, cwd: string): { value: string; options: string[] } {
  const m = /[^\s|;>&]*$/.exec(input);
  const word = m ? m[0] : "";
  const head = input.slice(0, input.length - word.length);
  const isCmd = head.trim() === "" || /[|;&]\s*$/.test(head);

  let cands: string[];
  let labels: string[];
  if (isCmd) {
    labels = Object.keys(MAN).filter((k) => k.startsWith(word));
    cands = labels.map((k) => k + " ");
  } else {
    const slash = word.lastIndexOf("/");
    const dirPart = word.slice(0, slash + 1);
    const partial = word.slice(slash + 1);
    const realDir = dirPart.startsWith("~") ? HOME + dirPart.slice(1) : dirPart;
    const f = lookup(fs, normalize(cwd, realDir || "."));
    if (f.id == null || fs.inodes[f.id].type !== "dir") return { value: input, options: [] };
    labels = Object.keys(fs.inodes[f.id].entries)
      .filter((k) => k.startsWith(partial) && (partial.startsWith(".") || !k.startsWith(".")))
      .sort();
    cands = labels.map((k) => {
      const t = lookup(fs, normalize(f.path, k));
      const isDir = t.id != null && fs.inodes[t.id].type === "dir";
      return dirPart + k + (isDir ? "/" : " ");
    });
  }
  if (!cands.length) return { value: input, options: [] };
  if (cands.length === 1) return { value: head + cands[0], options: [] };
  let lcp = cands[0].trimEnd();
  for (const cd of cands) {
    while (!cd.startsWith(lcp)) lcp = lcp.slice(0, -1);
  }
  return { value: head + (lcp.length > word.length ? lcp : word), options: labels };
}
