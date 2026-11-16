// A tiny inode-based virtual filesystem.
// Names live in directories and point at inode numbers, exactly like a real
// Unix filesystem, which is what makes hard links and symlinks behave honestly.

export type NodeType = "file" | "dir" | "link";

export type GlitchType = "single" | "nest" | "boss-1" | "boss-2" | "boss-3" | "boss-4" | "boss-5";

export interface Inode {
  id: number;
  type: NodeType;
  content: string; // files
  entries: Record<string, number>; // dirs: name -> inode id
  target: string; // symlinks: the stored path text
  nlink: number; // how many names point at this inode
  mode: number; // octal permissions e.g. 0o755, 0o644
  owner: string; // e.g. "architect" or "root"
  group: string; // e.g. "architect" or "root"
  glitch?: GlitchType;
}

export interface FS {
  inodes: Record<number, Inode>;
  next: number;
}

export const ROOT = 1;
export const HOME = "/home/architect";

export function createFS(): FS {
  return {
    inodes: {
      [ROOT]: {
        id: ROOT,
        type: "dir",
        content: "",
        entries: {},
        target: "",
        nlink: 1,
        mode: 0o755,
        owner: "architect",
        group: "architect",
      },
    },
    // Start numbering high enough that inode numbers look like real ones.
    next: 40,
  };
}

/* ---------- paths ---------- */

export function normalize(cwd: string, p: string): string {
  const parts = (p.startsWith("/") ? p : cwd + "/" + p).split("/");
  const out: string[] = [];
  for (const s of parts) {
    if (!s || s === ".") continue;
    if (s === "..") out.pop();
    else out.push(s);
  }
  return "/" + out.join("/");
}

export const dirname = (abs: string): string => abs.slice(0, abs.lastIndexOf("/")) || "/";

export const basename = (p: string): string => {
  const t = p.replace(/\/+$/, "");
  return t.slice(t.lastIndexOf("/") + 1);
};

export const tilde = (abs: string): string =>
  abs === HOME ? "~" : abs.startsWith(HOME + "/") ? "~" + abs.slice(HOME.length) : abs;

export interface Found {
  id: number | null;
  /** directory inode that holds (or would hold) the final name */
  parent: number | null;
  name: string;
  /** physical path after following symlinks */
  path: string;
  err?: "ENOENT" | "ENOTDIR" | "ELOOP";
}

/** Walk an absolute path from the root, following symlinks along the way. */
export function lookup(fs: FS, abs: string, follow = true, depth = 0): Found {
  const comps = abs.split("/").filter(Boolean);
  let cur = ROOT;
  let parent = ROOT;
  let name = "";
  let soFar = "";
  for (let i = 0; i < comps.length; i++) {
    const node = fs.inodes[cur];
    const last = i === comps.length - 1;
    if (node.type !== "dir") return { id: null, parent: null, name: comps[i], path: abs, err: "ENOTDIR" };
    const cid = node.entries[comps[i]];
    if (cid === undefined) {
      return last
        ? { id: null, parent: cur, name: comps[i], path: soFar + "/" + comps[i], err: "ENOENT" }
        : { id: null, parent: null, name: comps[i], path: abs, err: "ENOENT" };
    }
    const child = fs.inodes[cid];
    if (child.type === "link" && (!last || follow)) {
      if (depth > 8) return { id: null, parent: null, name: comps[i], path: abs, err: "ELOOP" };
      const t = normalize(soFar || "/", child.target);
      const rest = comps.slice(i + 1).join("/");
      return lookup(fs, rest ? (t === "/" ? "" : t) + "/" + rest : t, follow, depth + 1);
    }
    parent = cur;
    cur = cid;
    name = comps[i];
    soFar += "/" + comps[i];
  }
  return { id: cur, parent, name, path: soFar || "/" };
}

/* ---------- primitives ---------- */

export function alloc(
  fs: FS,
  type: NodeType,
  init: { content?: string; target?: string; mode?: number; owner?: string; group?: string; glitch?: GlitchType } = {},
): Inode {
  const id = fs.next++;
  const defaultMode = type === "dir" ? 0o755 : type === "link" ? 0o777 : 0o644;
  const n: Inode = {
    id,
    type,
    content: init.content ?? "",
    entries: {},
    target: init.target ?? "",
    nlink: 0,
    mode: init.mode ?? defaultMode,
    owner: init.owner ?? "architect",
    group: init.group ?? init.owner ?? "architect",
    ...(init.glitch ? { glitch: init.glitch } : {}),
  };
  fs.inodes[id] = n;
  return n;
}

export function link(fs: FS, dirId: number, name: string, id: number): void {
  fs.inodes[dirId].entries[name] = id;
  fs.inodes[id].nlink++;
}

/** Remove one name. The inode itself is only freed when its last name is gone. */
export function unlink(fs: FS, dirId: number, name: string): void {
  const dir = fs.inodes[dirId];
  const id = dir.entries[name];
  if (id === undefined) return;
  delete dir.entries[name];
  const n = fs.inodes[id];
  n.nlink--;
  if (n.nlink <= 0) {
    if (n.type === "dir") for (const k of Object.keys(n.entries)) unlink(fs, id, k);
    delete fs.inodes[id];
  }
}

export function deepCopy(fs: FS, id: number): number {
  const src = fs.inodes[id];
  const n = alloc(fs, src.type, {
    content: src.content,
    target: src.target,
    mode: src.mode,
    owner: src.owner,
    group: src.group,
    glitch: src.glitch,
  });
  if (src.type === "dir") {
    for (const [k, cid] of Object.entries(src.entries)) link(fs, n.id, k, deepCopy(fs, cid));
  }
  return n.id;
}

/** Is `id` the directory `ancestor` itself or somewhere beneath it? */
export function contains(fs: FS, ancestor: number, id: number): boolean {
  if (ancestor === id) return true;
  const a = fs.inodes[ancestor];
  if (!a || a.type !== "dir") return false;
  return Object.values(a.entries).some((c) => contains(fs, c, id));
}

/* ---------- seeding helpers ---------- */

export function mkdirp(fs: FS, abs: string): number {
  let cur = ROOT;
  for (const c of abs.split("/").filter(Boolean)) {
    const node = fs.inodes[cur];
    let cid = node.entries[c];
    if (cid === undefined) {
      cid = alloc(fs, "dir").id;
      link(fs, cur, c, cid);
    }
    cur = cid;
  }
  return cur;
}

export function writeFile(fs: FS, abs: string, content: string): number {
  const dir = mkdirp(fs, dirname(abs));
  const name = basename(abs);
  const existing = fs.inodes[dir].entries[name];
  if (existing !== undefined) {
    fs.inodes[existing].content = content;
    return existing;
  }
  const n = alloc(fs, "file", { content });
  link(fs, dir, name, n.id);
  return n.id;
}

export function symlink(fs: FS, abs: string, target: string): void {
  const dir = mkdirp(fs, dirname(abs));
  link(fs, dir, basename(abs), alloc(fs, "link", { target }).id);
}

export function chmodAt(fs: FS, abs: string, mode: number): void {
  const f = lookup(fs, abs);
  if (f.id != null) {
    fs.inodes[f.id].mode = mode & 0o777;
  }
}

export function chownAt(fs: FS, abs: string, owner: string, group?: string): void {
  const f = lookup(fs, abs, false);
  if (f.id != null) {
    fs.inodes[f.id].owner = owner;
    fs.inodes[f.id].group = group ?? owner;
  }
}

export function setGlitch(fs: FS, abs: string, glitch: Inode["glitch"]): void {
  const f = lookup(fs, abs, false);
  if (f.id != null) {
    fs.inodes[f.id].glitch = glitch;
  }
}

export function formatMode(n: Inode): string {
  const prefix = n.type === "dir" ? "d" : n.type === "link" ? "l" : "-";
  if (n.type === "link") return "lrwxrwxrwx";
  const m = n.mode ?? (n.type === "dir" ? 0o755 : 0o644);
  const triad = (bits: number) =>
    ((bits & 4) ? "r" : "-") + ((bits & 2) ? "w" : "-") + ((bits & 1) ? "x" : "-");
  return prefix + triad((m >> 6) & 7) + triad((m >> 3) & 7) + triad(m & 7);
}

/* ---------- queries ---------- */

export const toLines = (content: string): string[] =>
  content === "" ? [] : content.replace(/\n$/, "").split("\n");

export const fromLines = (ls: string[]): string => (ls.length ? ls.join("\n") + "\n" : "");

export function typeAt(fs: FS, abs: string, follow = true): NodeType | null {
  const f = lookup(fs, abs, follow);
  return f.id == null ? null : fs.inodes[f.id].type;
}

export function idAt(fs: FS, abs: string, follow = true): number | null {
  return lookup(fs, abs, follow).id;
}

export function read(fs: FS, abs: string): string | null {
  const f = lookup(fs, abs);
  if (f.id == null) return null;
  const n = fs.inodes[f.id];
  return n.type === "file" ? n.content : null;
}

export function names(fs: FS, abs: string): string[] {
  const f = lookup(fs, abs);
  if (f.id == null) return [];
  const n = fs.inodes[f.id];
  return n.type === "dir" ? Object.keys(n.entries).sort() : [];
}

/** Count every name in the tree that matches. */
export function countNames(fs: FS, test: (name: string) => boolean, from = ROOT): number {
  const n = fs.inodes[from];
  if (!n || n.type !== "dir") return 0;
  let total = 0;
  for (const [k, id] of Object.entries(n.entries)) {
    if (test(k)) total++;
    total += countNames(fs, test, id);
  }
  return total;
}

/* ---------- what does this thing look like in the world? ---------- */

export type Kind =
  | "dir"
  | "trapdoor"
  | "portal"
  | "crystal"
  | "key"
  | "sheet"
  | "log"
  | "monster"
  | "bot"
  | "tank"
  | "doc";

export function kindOf(name: string, n: Inode): Kind {
  if (n.type === "link") return "portal";
  if (n.type === "dir") return name.startsWith(".") ? "trapdoor" : "dir";
  const l = name.toLowerCase();
  if (n.glitch || /glitch|virus|worm|malware|boss|fragmenter|eater|loop|phantom|overlord/i.test(l)) {
    return "monster";
  }
  if (/\.bot$|^civ_/.test(l)) return "bot";
  if (/\.tank$/.test(l)) return "tank";
  if (/key/.test(l)) return "key";
  if (/\.(core|dat)$/.test(l) || n.nlink > 1) return "crystal";
  if (/\.(cfg|conf)$/.test(l)) return "sheet";
  if (/\.log$/.test(l)) return "log";
  return "doc";
}
