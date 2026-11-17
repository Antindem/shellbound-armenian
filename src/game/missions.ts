import {
  FS,
  HOME,
  chmodAt,
  chownAt,
  countNames,
  idAt,
  link,
  mkdirp,
  names,
  read,
  setGlitch,
  symlink,
  typeAt,
  writeFile,
} from "./vfs";
import type { Ev, Trace } from "./shell";

/* ---------- types ---------- */

export interface Avatar {
  exists: boolean;
  name?: string;
  cls?: string;
  suit?: string;
  hat?: string;
  color?: string;
}

export interface CheckCtx {
  fs: FS;
  cwd: string;
  /** commands executed by the line the player just entered */
  now: Ev[];
  trace: Trace | null;
  xray: number | null;
}

export interface Objective {
  text: string;
  hint: string;
  check: (c: CheckCtx) => boolean;
  /** indexes of objectives that must already be complete */
  needs?: number[];
}

export interface Guard {
  text: string;
  check: (c: CheckCtx) => boolean;
}

export type Role = "cmd" | "flag" | "arg" | "op";
export interface Token {
  t: string;
  role: Role;
  note: string;
}
export interface Variant {
  tokens: Token[];
  effect: string;
  out?: string[];
}
export type Diagram =
  | { kind: "anatomy"; variants: Variant[] }
  | { kind: "inode" }
  | { kind: "tank" };

export type InteractiveLabConfig =
  | { kind: "treenav" }
  | { kind: "inode" }
  | { kind: "tank" }
  | { kind: "headtail" }
  | { kind: "wildcard" }
  | { kind: "pipeline"; stages?: ("grep" | "grepv" | "sort" | "uniqc" | "wc" | "stderr")[] }
  | { kind: "permissions"; showUmask?: boolean; showChown?: boolean; showSudo?: boolean }
  | { kind: "inspector" };

export interface Mission {
  id: string;
  act: number;
  title: string;
  commands: string[];
  minCommands: number;
  boss?: "boss-1" | "boss-2" | "boss-3" | "boss-4" | "boss-5";
  story: string[];
  concepts: { term: string; text: string }[];
  diagram: Diagram;
  labs?: InteractiveLabConfig[];
  hideAnatomy?: boolean;
  seed: (fs: FS, av: Avatar) => void;
  start?: string;
  objectives: Objective[];
  guards?: Guard[];
  recap: string[];
}

export const ACTS = [
  { tag: "Նախաբան", title: "Զարթոնք" },
  { tag: "Արար I", title: "Փոփոխվող լաբիրինթոսը" },
  { tag: "Արար II", title: "Կամուրջներ և Հոսքեր" },
  { tag: "Արար III", title: "Տվյալների զտարանը" },
  { tag: "Արար IV", title: "Ուայլդքարդների ուրվականը" },
  { tag: "Արար V", title: "Արմատական տիրույթ (Root)" },
  { tag: "Վերջաբան", title: "Ազատ ռեժիմ" },
];

/* ---------- helpers ---------- */

const h = (p: string) => HOME + "/" + p;
const C = (t: string, note: string): Token => ({ t, role: "cmd", note });
const F = (t: string, note: string): Token => ({ t, role: "flag", note });
const A = (t: string, note: string): Token => ({ t, role: "arg", note });
const O = (t: string, note: string): Token => ({ t, role: "op", note });

const ran = (c: CheckCtx, name: string, pred: (e: Ev) => boolean = () => true) =>
  c.now.some((e) => e.name === name && e.ok && pred(e));
const stage = (c: CheckCtx, name: string) => c.trace?.stages.find((s) => s.name === name);
const same = (a: string[] | undefined, b: string[]) => !!a && a.length === b.length && a.every((x, i) => x === b[i]);

function sheet(fs: FS, av: Avatar, full = true) {
  const suitVal = av.suit ?? av.cls ?? "cadet";
  const lines = [`Suit=${suitVal}`, `Class=${av.cls ?? suitVal}`];
  if (full) {
    lines.push(`Color=${av.color ?? "cyan"}`);
    lines.push(`Hat=${av.hat ?? "none"}`);
    if (av.name) lines.push(`Name=${av.name}`);
  }
  writeFile(fs, h("avatar.cfg"), lines.join("\n") + "\n");
}

const KEY = "KEY-7F3A-ROOT\nopens: fortress gate\n";
const CORE = "REACTOR CORE\noutput: 9000 TW\nstatus: stable\n";

const LOG_LINES = [
  "ENERGY pulse 440 stable",
  "MALWARE worm.exe injected",
  "ENERGY pulse 512 stable",
  "NOISE static burst",
  "MALWARE trojan.sh detected",
  "ENERGY pulse 440 stable",
  "WARNING coolant low",
  "MALWARE worm.exe injected",
  "ENERGY pulse 618 stable",
  "NOISE static burst",
  "ENERGY pulse 512 stable",
  "MALWARE keylogger.bin active",
];
const LOG = LOG_LINES.join("\n") + "\n";
const ENERGY_SORTED = LOG_LINES.filter((l) => l.startsWith("ENERGY")).sort();
const ENERGY_UNIQ = ENERGY_SORTED.filter((l, i) => i === 0 || l !== ENERGY_SORTED[i - 1]);

const STREAM_A = [
  "ENERGY cell A1 charged",
  "MALWARE worm.exe injected",
  "ENERGY cell A2 charged",
  "NOISE static burst",
  "ENERGY cell A3 charged",
  "MALWARE trojan.sh detected",
];
const STREAM_B = [
  "NOISE static burst",
  "ENERGY cell B1 charged",
  "ENERGY cell B2 charged",
  "MALWARE keylogger.bin active",
  "ENERGY cell B3 charged",
  "WARNING coolant low",
  "ENERGY cell B4 charged",
];
const CLEAN_ALL = [...STREAM_A, ...STREAM_B].filter((l) => l.startsWith("ENERGY")).sort();
const tankLines = (c: CheckCtx) => (read(c.fs, h("refinery/engine.tank")) ?? "").split("\n").filter(Boolean);

/* ---------- the campaign ---------- */

export const MISSIONS: Mission[] = [
  /* ===== PROLOGUE (ACT 0) ===== */
  {
    id: "0-1",
    act: 0,
    title: "Արթնացի՛ր, Ճարտարապետ",
    commands: ["touch", "echo", ">", "cat"],
    minCommands: 3,
    labs: [],
    story: [
      "Ճարտարապե՛տ… լսո՞ւմ ես ինձ։ Ես INIT-ն եմ՝ process համար 1-ը։ Ես առաջին ծրագիրն եմ, որն արթնանում է, երբ համակարգը միանում է (boot)։",
      "Mainframe-ը վնասված է, և այս պահին դու ընդամենը կարկաս ես։ Այս աշխարհում ամեն ինչ file է։ Նույնիսկ դու։ Այնպես որ արի գրենք քեզ ու կյանքի կոչենք։",
    ],
    concepts: [
      { term: "touch NAME", text: "Ստեղծում է դատարկ file (օրինակ՝ `touch hero.cfg`)։ Եթե file-ն արդեն գոյություն ունի, դրա ներսում ոչինչ չի փոխվում։" },
      { term: "echo TEXT", text: "Կրկնում է այն, ինչ տալիս եք նրան։ Առանձին օգտագործելիս տեքստը պարզապես հայտնվում է էկրանին։" },
      { term: ">", text: "Redirect․ որսում է command-ի output-ը և էկրանի փոխարեն լցնում այն file-ի մեջ։" },
      { term: "cat FILE", text: "Տպում է այն, ինչ կա file-ի ներսում (օրինակ՝ `cat hero.cfg`)։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("touch", "Գործարկվող ծրագիրը։ Միշտ առաջին բառն է։"),
            A("hero.cfg", "Argument՝ ստեղծվող file-ի անունը։"),
          ],
          effect: "Kernel-ը պահեստավորում է նոր inode (համարակալված պահեստային բջիջ) և գրում hero.cfg անունն այս directory-ում։ File-ի չափը 0 բայթ է։",
          out: ["(ելք չկա․ shell-ում լռությունը նշանակում է հաջողություն)"],
        },
        {
          tokens: [
            C("echo", "Ծրագիրը․ այն տպում է իր arguments-ը։"),
            A('"Role=Pilot"', "Չակերտները պահում են տեքստը միասին որպես ՄԵԿ argument՝ բացատներով հանդերձ։"),
          ],
          effect: "echo-ն ուղարկում է տեքստը standard output (stdout)։ Ոչինչ չի որսում stdout-ը, ուստի այն հայտնվում է ձեր terminal-ում։",
          out: ["Role=Pilot"],
        },
        {
          tokens: [
            C("echo", "Ծրագիրը․ այն տպում է իր arguments-ը։"),
            A('"Role=Pilot"', "Տպվող տեքստը։"),
            O(">", "Redirect․ shell-ը դատարկում է file-ը, ապա միացնում stdout-ը դրան։"),
            A("hero.cfg", "Որտեղ է գնում output-ը։ Ստեղծվում է, եթե գոյություն չունի։"),
          ],
          effect: "Shell-ը (ոչ թե echo-ն) բացում է hero.cfg-ն և միացնում echo-ի stdout-ը դրան։ echo-ն գաղափար անգամ չունի, որ իր բառերը հայտնվում են file-ի մեջ։",
          out: ["(էկրանին ոչինչ չկա․ տեքստը գնաց file-ի մեջ)"],
        },
        {
          tokens: [C("cat", "Ծրագիրը․ այն կարդում է files։"), A("hero.cfg", "Կարդացվող file-ը։")],
          effect: "cat-ը բացում է file-ը, պատճենում յուրաքանչյուր բայթ stdout-ի մեջ և ավարտում աշխատանքը։",
          out: ["Role=Pilot"],
        },
      ],
    },
    seed: () => {},
    objectives: [
      {
        text: "Նյութականացրեք ձեր կերպարի թերթիկը՝ ստեղծեք դատարկ file `avatar.cfg` անունով։",
        hint: "touch avatar.cfg",
        check: (c) => typeAt(c.fs, h("avatar.cfg")) === "file",
      },
      {
        text: "Ընտրեք հանդերձանք (suit)։ Օգտագործեք `echo` և `>`՝ թերթիկի մեջ `Suit=cadet` գրելու համար (`spacesuit`, `hoodie`, `armor`, ինչպես նաև `Class=Netrunner`, `Guardian`, `Tinkerer` նույնպես կաշխատեն)։",
        hint: 'echo "Suit=cadet" > avatar.cfg',
        check: (c) => /^(Suit|Class)=\s*(cadet|spacesuit|hoodie|armor|netrunner|guardian|tinkerer|\S+)/im.test(read(c.fs, h("avatar.cfg")) ?? ""),
      },
      {
        text: "Ստուգեք ձեր թերթիկը `cat`-ի միջոցով։",
        hint: "cat avatar.cfg",
        needs: [1],
        check: (c) => ran(c, "cat", (e) => e.args.some((x) => x.endsWith("avatar.cfg"))),
      },
    ],
    recap: [
      "`touch`-ը ստեղծում է դատարկ files։",
      "`echo`-ն տպում է տեքստ, իսկ `>`-ը redirect է անում այդ տեքստը file-ի մեջ։",
      "`cat`-ը ցույց է տալիս, թե ինչ կա file-ի ներսում։",
    ],
  },
  {
    id: "0-2",
    act: 0,
    title: "Հանդերձանքի ստուգում",
    commands: [">", ">>", "cat"],
    minCommands: 4,
    labs: [{ kind: "tank" }],
    story: [
      "Դու գոյություն ունես։ Բայց մեկ տողից բաղկացած ինքնությունը մի փոքր քիչ է։",
      "Զգուշացում նախքան ավելացնելը․ `>`-ը գրելուց առաջ միշտ դատարկում է file-ը։ Տող ավելացնելու և արդեն եղածը պահպանելու համար օգտագործեք կրկնակի սլաքը՝ `>>`։ Ընտրեք ձեր գույնը, գլխարկը և անունը՝ նայելով Codex-ի հանդերձանքի քարտին։",
    ],
    concepts: [
      { term: "> file", text: "Վերագրանցել (overwrite)․ ամբողջությամբ դատարկել ռեզերվուարը, ապա լցնել նոր output-ը (օրինակ՝ `echo \"A\" > tank.txt`)։" },
      { term: ">> file", text: "Ավելացնել վերջից (append)․ պահպանել ամեն ինչ և նոր output-ը լցնել վրայից (օրինակ՝ `echo \"B\" >> tank.txt`)։" },
    ],
    diagram: { kind: "tank" },
    seed: (fs, av) => sheet(fs, av, false),
    objectives: [
      {
        text: "`>>`-ի միջոցով ավելացրեք գույն `avatar.cfg`-ում, օրինակ՝ `Color=cyan` (փորձեք cyan, teal, gold, magenta, pink, lime, green, violet, orange, red, blue կամ white)։ Ձեր Suit/Class տողը պետք է պահպանվի։",
        hint: 'echo "Color=cyan" >> avatar.cfg',
        check: (c) => {
          const t = read(c.fs, h("avatar.cfg")) ?? "";
          return /^(Suit|Class)=\S+/im.test(t) && /^Color=\S+/im.test(t);
        },
      },
      {
        text: "`>>`-ի միջոցով ավելացրեք գլխարկ (`Hat=`)՝ ընտրելով `none`, `astro`, `wizard`, `visor`, `catears` կամ `captain` տարբերակներից։",
        hint: 'echo "Hat=visor" >> avatar.cfg',
        check: (c) => {
          const t = read(c.fs, h("avatar.cfg")) ?? "";
          return /^(Suit|Class)=\S+/im.test(t) && /^Color=\S+/im.test(t) && /^Hat=\S+/im.test(t);
        },
      },
      {
        text: "Նույն կերպ ավելացրեք ձեր անունը՝ `Name=` և դրան հաջորդող անունը։",
        hint: 'echo "Name=Ada" >> avatar.cfg',
        check: (c) => {
          const t = read(c.fs, h("avatar.cfg")) ?? "";
          return /^(Suit|Class)=\S+/im.test(t) && /^Color=\S+/im.test(t) && /^Hat=\S+/im.test(t) && /^Name=\S+/im.test(t);
        },
      },
      {
        text: "Կարդացեք պատրաստի թերթիկը `cat`-ով։",
        hint: "cat avatar.cfg",
        needs: [0, 1, 2],
        check: (c) => ran(c, "cat", (e) => e.args.some((x) => x.endsWith("avatar.cfg"))),
      },
    ],
    recap: [
      "`>`-ը վերագրանցում է․ հին պարունակությունն անհետանում է։",
      "`>>`-ն ավելացնում է վերջից․ հին պարունակությունը մնում է։",
      "Ձեր ընտրած `Suit`, `Hat` և `Color` կարգավորումներն այժմ արտացոլվում են քարտեզի և մարտական արենայի վրա։",
    ],
  },

  /* ===== ACT I: ՓՈՓՈԽՎՈՂ ԼԱԲԻՐԻՆԹՈՍԸ ===== */
  {
    id: "1-1",
    act: 1,
    title: "Լապտեր լաբիրինթոսում",
    commands: ["pwd", "ls", "cd", "ls -la", "cat"],
    minCommands: 6,
    labs: [{ kind: "treenav" }],
    story: [
      "Mainframe-ի սեկտորները փլուզվում են իրենք իրենց մեջ։ Նախքան դրանց վերջնական փլուզումը մեզ պետք է գլխավոր բանալին, որը թաքցված է լաբիրինթոսի ինչ-որ տեղում։",
      "Յուրաքանչյուր directory մի սենյակ է։ Սենյակների ներսում գտնվող files-ը քողարկված են, մինչև չգործարկեք `ls` սկաները։ Իսկ կետով (`.`) սկսվող գաղտնի անունները տեսնելու համար պետք է միացնել `ls -a` կամ `ls -la` ռենտգենը։",
    ],
    concepts: [
      { term: "pwd", text: "Print working directory․ այն սենյակի ամբողջական հասցեն, որտեղ գտնվում եք։" },
      { term: "ls", text: "Սկանավորել և ցուցադրել սենյակի պարունակությունը։ Ավելացրեք `-l`՝ մանրամասների, `-a`՝ թաքնված անունները բացահայտելու համար։" },
      { term: "cd DIR", text: "Change directory․ մտնել սենյակ (օրինակ՝ `cd west_wing`)։ `cd ..`-ը բարձրացնում է վերև՝ ծնող directory։" },
      { term: ".hidden", text: "Կետով սկսվող ցանկացած անուն (օրինակ՝ `.secret`) քողարկված է սովորական `ls`-ից։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [C("ls", "Ցուցադրել directory-ի պարունակությունը։ Առանց argument-ի սկանավորում է ընթացիկ սենյակը։")],
          effect: "Kernel-ը կարդում է directory-ի անունների աղյուսակը, և ls-ը տպում է դրանք՝ բաց թողնելով կետով սկսվողները։",
          out: ["readme.txt"],
        },
        {
          tokens: [C("ls", "Ցուցադրել directory-ի պարունակությունը։"), F("-a", "all․ բաց չթողնել կետով սկսվող անունները։")],
          effect: "Նույն աղյուսակը՝ առանց ֆիլտրի։ Դուք տեսնում եք նաև . (այս սենյակը) և .. (ծնող սենյակը), որոնք գոյություն ունեն յուրաքանչյուր directory-ում։",
          out: [".   ..   .cache   .secret   readme.txt"],
        },
        {
          tokens: [
            C("ls", "Ցուցադրել directory-ի պարունակությունը։"),
            F("-la", "Երկու միացված flag՝ -l (մանրամասն տվյալներ) և -a (բոլորը)։ Նույնն է, ինչ -l -a գրելը։"),
          ],
          effect: "Յուրաքանչյուր անվան համար ls-ը kernel-ից հարցնում է inode-ի մանրամասները՝ տեսակը և թույլտվությունները (permissions), link-երի քանակը, տիրոջը, չափը։",
          out: ["drwxr-xr-x 2 architect  4096 .cache", "-rw-r--r-- 1 architect    20 .secret", "-rw-r--r-- 1 architect    31 readme.txt"],
        },
        {
          tokens: [C("cd", "Փոխել shell-ի ընթացիկ directory-ն։"), A("west_wing", "Հարաբերական (relative) path․ փնտրվում է սկսած այն սենյակից, որտեղ գտնվում եք։")],
          effect: "Shell-ը ստուգում է, որ west_wing-ն այստեղ գոյություն ունի և directory է, ապա դարձնում է այն ձեր նոր working directory-ն։",
          out: ["(ելք չկա․ փոխարենը փոխվում է ձեր prompt-ը)"],
        },
        {
          tokens: [C("cd", "Փոխել shell-ի ընթացիկ directory-ն։"), A("..", "Հատուկ անուն յուրաքանչյուր directory-ում, որը ցույց է տալիս դրա ծնողի վրա։")],
          effect: "Դուք ծառով մեկ մակարդակ վերև եք բարձրանում։ /home/architect/corridor-ից հասնում եք /home/architect։",
          out: ["(ելք չկա)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(
        fs,
        h("labyrinth/map.txt"),
        "LABYRINTH MAP (damaged)\nnorth_hall : collapsed\neast_hall  : something is cloaked here\nNames that start with a dot are invisible to a plain ls.\n",
      );
      writeFile(fs, h("labyrinth/north_hall/rubble.txt"), "Nothing but broken sectors.\n");
      mkdirp(fs, h("labyrinth/north_hall/dead_end"));
      writeFile(fs, h("labyrinth/east_hall/notice.txt"), "Authorized scanners only: ls -a\n");
      writeFile(fs, h("labyrinth/east_hall/.whisper"), "psst. you found me.\n");
      writeFile(fs, h("labyrinth/east_hall/.vault/master.key"), KEY);
    },
    objectives: [
      { text: "`pwd`-ի միջոցով հարցրեք համակարգին, թե որտեղ եք գտնվում։", hint: "pwd", check: (c) => ran(c, "pwd") },
      { text: "`ls`-ի միջոցով սկանավորեք և ցուցադրեք այս սենյակի պարունակությունը։", hint: "ls", check: (c) => ran(c, "ls") },
      {
        text: "Մտեք `labyrinth`, ապա շարունակեք դեպի `east_hall`։",
        hint: "cd labyrinth/east_hall",
        check: (c) => c.cwd === h("labyrinth/east_hall"),
      },
      {
        text: "Սովորական `ls`-ն այստեղ թաքնված դռները ցույց չի տալիս։ Միացրեք ռենտգենյան սկանավորումը՝ `ls -la`։",
        hint: "ls -la",
        check: (c) =>
          (c.xray != null && c.xray === idAt(c.fs, h("labyrinth/east_hall"))) ||
          (c.cwd === h("labyrinth/east_hall") && ran(c, "ls", (e) => e.flags.includes("a") || e.flags.includes("A"))),
      },
      {
        text: "Թաքնված դռնակով իջեք `.vault`։",
        hint: "cd .vault",
        check: (c) => c.cwd === h("labyrinth/east_hall/.vault"),
      },
      {
        text: "Կարդացեք `master.key`-ը։",
        hint: "cat master.key",
        check: (c) => ran(c, "cat", (e) => e.args.some((x) => x.endsWith("master.key"))),
      },
    ],
    recap: [
      "`pwd`-ն ասում է, թե որտեղ եք, `ls`-ը սկանավորում է սենյակը, `cd`-ն տեղափոխում է ձեզ։",
      "`-l` և `-a` նման flags-ը փոխում են command-ի վարքագիծը և կարող են համակցվել՝ `-la`։",
      "Կետով սկսվող անունները թաքնված են, քանի դեռ չեք պահանջել ցուցադրել բոլորը (`ls -a`)։",
    ],
  },
  {
    id: "1-2",
    act: 1,
    title: "Բարձրացնել ամրոցը",
    commands: ["mkdir", "mkdir -p", "cp"],
    minCommands: 4,
    labs: [],
    story: [
      "Դուք ունեք գլխավոր բանալին։ Հիմա մեզ պետք է ապահով տեղ այն պահելու համար, և պահեստային պատճեն, քանի որ փլուզվող լաբիրինթոսում մեկ բանալի ունենալը վատ պլան է։",
      "Մուտքագրեք բառը, և պատերը կբարձրանան։ Արձակեք կլոնավորման ճառագայթը, և մեկ բանալին կդառնա երկու։",
    ],
    concepts: [
      { term: "mkdir DIR", text: "Make directory․ կառուցում է նոր, դատարկ սենյակ (օրինակ՝ `mkdir citadel`)։" },
      { term: "mkdir -p a/b/c", text: "Միանգամից կառուցում է սենյակների ամբողջ շղթան՝ սկսած ծնողներից։" },
      { term: "cp SRC DEST", text: "Copy․ ստեղծում է բոլորովին նոր file՝ նույն պարունակությամբ։ Այդ պահից սկսած բնօրինակն ու պատճենը միմյանցից անկախ են։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [C("mkdir", "Ստեղծել directory։"), A("citadel", "Նոր սենյակի անունը։")],
          effect: "Ստեղծվում է նոր directory inode, և citadel անունն ավելացվում է այն սենյակում, որտեղ կանգնած եք։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("mkdir", "Ստեղծել directory։"),
            F("-p", "parents․ ստեղծել path-ի երկայնքով բացակայող ցանկացած սենյակ և չբողոքել, եթե դրանք արդեն գոյություն ունեն։"),
            A("citadel/tower/top", "Թեք գծերով path․ յուրաքանչյուր մաս սենյակ է նախորդի ներսում։"),
          ],
          effect: "Առանց -p-ի սա կձախողվի, եթե citadel/tower-ը բացակայում է։ -p-ով mkdir-ը կառուցում է citadel-ը, ապա tower-ը, ապա top-ը։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("cp", "Պատճենել files։"),
            A("crystal.dat", "ԱՂԲՅՈՒՐ (SOURCE)․ file-ը, որից պետք է կարդալ։ Միշտ գրվում է առաջինը։"),
            A("clone.dat", "ՆՊԱՏԱԿԱԿԵՏ (DESTINATION)․ նոր անունը, որի մեջ պետք է գրել։"),
          ],
          effect: "cp-ն կարդում է crystal.dat-ի յուրաքանչյուր բայթ և գրում այն clone.dat անունով ՆՈՐ inode-ի մեջ։ Երկու files, երկու inodes, կրկնակի հիշողություն։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("cp", "Պատճենել files։"),
            A("crystal.dat", "ԱՂԲՅՈՒՐ (SOURCE)։"),
            A("citadel/", "Եթե նպատակակետը գոյություն ունեցող directory է, պատճենը հայտնվում է դրա ներսում և պահպանում իր անունը։"),
          ],
          effect: "Պատճենը ստեղծվում է որպես citadel/crystal.dat։",
          out: ["(ելք չկա)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("master.key"), KEY);
      writeFile(fs, h("blueprint.txt"), "FORTRESS PLAN\n1. raise the walls\n2. keep a backup of every key\n3. lock one copy in a vault\n");
    },
    objectives: [
      {
        text: "Բարձրացրեք պատերը․ ստեղծեք `fortress` անունով directory։",
        hint: "mkdir fortress",
        check: (c) => typeAt(c.fs, h("fortress")) === "dir",
      },
      {
        text: "Արձակեք կլոնավորման ճառագայթը․ պատճենեք `master.key`-ը `backup.key` անունով նոր file-ի մեջ։",
        hint: "cp master.key backup.key",
        check: (c) => read(c.fs, h("master.key")) === KEY && read(c.fs, h("backup.key")) === KEY,
      },
      {
        text: "Ամրոցի ներսում կառուցեք `vault` անունով սենյակ։",
        hint: "mkdir fortress/vault",
        check: (c) => typeAt(c.fs, h("fortress/vault")) === "dir",
      },
      {
        text: "Կլոնավորեք բանալին պահոցի (`fortress/vault/`) մեջ, որպեսզի պատճենը պահպանվի նույնիսկ եթե այս սենյակը փլուզվի։",
        hint: "cp master.key fortress/vault/",
        check: (c) => names(c.fs, h("fortress/vault")).some((n) => read(c.fs, h("fortress/vault/" + n)) === KEY),
      },
    ],
    recap: [
      "`mkdir`-ը կառուցում է directories, իսկ `-p`-ն՝ դրանց ամբողջ path-ը։",
      "`cp SOURCE DEST`-ը ստեղծում է անկախ պատճեն։ Սկզբում աղբյուրը, վերջում՝ նպատակակետը։",
    ],
  },
  {
    id: "1-3",
    act: 1,
    title: "Հրամանների դետեկտիվ",
    commands: ["type", "which"],
    minCommands: 3,
    labs: [],
    story: [
      "Ճարտարապե՛տ, երբևէ մտածե՞լ ես, թե որտեղից են գալիս քո մուտքագրած commands-ը։ Որոշ հրամաններ ներկառուցված են հենց shell-ի մեջ (builtins), իսկ մյուսներն առանձին ծրագրեր են՝ պահված `/bin` պահոցում։",
      "Երբ համակարգում խափանումներ են սկսվում, իսկական դետեկտիվը ստուգում է գործիքների ծագումը `type` և `which` սկաներներով։",
    ],
    concepts: [
      { term: "type CMD", text: "Բացահայտում է հրամանի տեսակը․ արդյոք այն shell builtin է, alias, թե արտաքին ծրագիր (օրինակ՝ `type pwd`)։" },
      { term: "which CMD", text: "Գտնում է գործարկվող ծրագրի ճշգրիտ հասցեն համակարգում (օրինակ՝ `which sort` -> `/bin/sort`)։" },
      { term: "shell builtin", text: "Հրաման, որն ապրում է հենց bash-ի ներսում (ինչպես `pwd`-ն կամ `echo`-ն) և առանձին file չունի։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [C("type", "Ստուգել հրամանի տեսակը։"), A("pwd", "Ստուգվող հրամանի անունը։")],
          effect: "Shell-ը ստուգում է իր ներքին աղյուսակը և հայտնում, որ pwd-ն ներկառուցված (builtin) հրաման է։",
          out: ["pwd is a shell builtin"],
        },
        {
          tokens: [C("type", "Ստուգել հրամանի տեսակը։"), A("cat", "Արտաքին ծրագրի անունը։")],
          effect: "Քանի որ cat-ը builtin չէ, shell-ը գտնում է դրա տեղը /bin-ում։",
          out: ["cat is /bin/cat"],
        },
        {
          tokens: [C("which", "Գտնել ծրագրի executable file-ը։"), A("sort", "Փնտրվող ծրագիրը։")],
          effect: "which-ը փնտրում է համակարգային PATH-ում և վերադարձնում ծրագրի ամբողջական հասցեն։",
          out: ["/bin/sort"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("detective.txt"), "TOOL AUDIT\n1. Check if cd is a builtin\n2. Check what ls is\n3. Locate grep with which\n");
    },
    objectives: [
      {
        text: "Օգտագործեք `type` հրամանը՝ պարզելու համար `cd`-ի տեսակը (տեսեք, թե ինչու է այն shell builtin)։",
        hint: "type cd",
        check: (c) => ran(c, "type", (e) => e.args.includes("cd")),
      },
      {
        text: "Ստուգեք `ls` հրամանի տեսակը `type ls`-ի միջոցով։",
        hint: "type ls",
        check: (c) => ran(c, "type", (e) => e.args.includes("ls")),
      },
      {
        text: "`which`-ի միջոցով գտեք `grep` ծրագրի ճշգրիտ հասցեն համակարգում։",
        hint: "which grep",
        check: (c) => ran(c, "which", (e) => e.args.includes("grep")),
      },
    ],
    recap: [
      "`type`-ը ցույց է տալիս՝ արդյոք հրամանը shell builtin է, alias, թե արտաքին ծրագիր։",
      "`which`-ը ցույց է տալիս գործարկվող ծրագրի path-ը (`/bin/...`)։",
    ],
  },
  {
    id: "1-4",
    act: 1,
    title: "Հանրագիտարան և Կարճատումներ",
    commands: ["whatis", "apropos", "man", "info", "alias"],
    minCommands: 4,
    labs: [],
    story: [
      "Ոչ մի Ճարտարապետ անգիր չգիտի բոլոր flags-ը։ Mainframe-ի ներսում ներկառուցված է անգլերեն ուղեցույցների հսկայական գրադարան՝ `man`, `info`, `whatis` և `apropos`։",
      "Իսկ երբ որևէ երկար հրաման չափազանց հաճախ ես օգտագործում, կարող ես ստեղծել քո սեփական կարճատումը՝ `alias`։",
    ],
    concepts: [
      { term: "whatis CMD", text: "Տպում է հրամանի մեկտողանի համառոտ նկարագրությունը (օրինակ՝ `whatis pwd`)։" },
      { term: "apropos WORD", text: "Փնտրում է բոլոր հրամանների նկարագրություններում ըստ բանալի բառի (օրինակ՝ `apropos directory`)։" },
      { term: "man / info CMD", text: "Բացում է հրամանի ամբողջական անգլերեն տեղեկատուն կողային վահանակում (օրինակ՝ `man touch`)։" },
      { term: "alias NAME='CMD'", text: "Ստեղծում է նոր կարճ հրաման (օրինակ՝ `alias ll='ls -l'`)։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [C("whatis", "Համառոտ տեղեկանք։"), A("pwd", "Հրամանի անունը։")],
          effect: "whatis-ը կարդում է ուղեցույցի վերնագիրը և տպում մեկ տողով ամփոփում։",
          out: ["pwd (1) - print name of current/working directory"],
        },
        {
          tokens: [C("apropos", "Որոնել ուղեցույցներում։"), A("directory", "Բանալի բառը։")],
          effect: "apropos-ը գտնում է բոլոր այն հրամանները, որոնց նկարագրության մեջ կա directory բառը։",
          out: ["cd (1) - change the working directory", "mkdir (1) - make directories", "pwd (1) - print name of current/working directory"],
        },
        {
          tokens: [C("man", "Բացել manual page-ը։"), A("touch", "Ուսումնասիրվող հրամանը։")],
          effect: "Բացում է touch հրամանի ամբողջական անգլերեն ուղեցույցը (NAME, SYNOPSIS, DESCRIPTION, EXAMPLES)։",
          out: ["Opening manual page for touch..."],
        },
        {
          tokens: [C("alias", "Սահմանել կարճատում։"), A("ll='ls -l'", "Նոր անունը և նրան վերագրվող հրամանը չակերտների մեջ։")],
          effect: "Այսուհետ ll մուտքագրելիս shell-ը ավտոմատ կփոխարինի այն ls -l հրամանով։",
          out: ["(ելք չկա)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("library_guide.txt"), "MANUAL SYSTEM\nUse whatis, apropos, man, info, and alias to master the shell.\n");
    },
    objectives: [
      {
        text: "`whatis`-ի միջոցով ստացեք `ls` հրամանի մեկտողանի նկարագրությունը։",
        hint: "whatis ls",
        check: (c) => ran(c, "whatis", (e) => e.args.includes("ls")),
      },
      {
        text: "`apropos`-ի միջոցով փնտրեք `copy` բառին առնչվող հրամանները։",
        hint: "apropos copy",
        check: (c) => ran(c, "apropos", (e) => e.args.some((x) => x.toLowerCase().includes("copy"))),
      },
      {
        text: "Բացեք `mkdir` հրամանի ուղեցույցի կողային վահանակը `man mkdir` (կամ `info mkdir`) հրամանով։",
        hint: "man mkdir",
        check: (c) => ran(c, "man", (e) => e.args.includes("mkdir")) || ran(c, "info", (e) => e.args.includes("mkdir")),
      },
      {
        text: "Ստեղծեք `scan` անունով alias, որը կգործարկի `ls -la` հրամանը։",
        hint: "alias scan='ls -la'",
        check: (c) => ran(c, "alias", (e) => e.args.some((x) => x.startsWith("scan="))),
      },
    ],
    recap: [
      "`whatis`-ը տալիս է կարճ նկարագրություն, իսկ `apropos`-ը փնտրում է հրամաններ ըստ բանալի բառի։",
      "`man` և `info` հրամանները բացում են ամբողջական անգլերեն ուղեցույցը։",
      "`alias`-ը թույլ է տալիս երկար հրամաններին տալ կարճ անուններ։",
    ],
  },
  {
    id: "1-5",
    act: 1,
    title: "Տարհանում",
    commands: ["mv", "*"],
    minCommands: 3,
    labs: [],
    story: [
      "Սեկտոր 9-ը քանդվում է, իսկ երեք թվային քաղաքացիներ դեռ դրա ներսում են։",
      "Տելեպորտի հարթակը ձերն է։ Ի տարբերություն կլոնավորման ճառագայթի՝ այն ոչինչ չի կրկնօրինակում․ օբյեկտը հեռանում է մի տեղից և հայտնվում մեկ այլ տեղում։",
    ],
    concepts: [
      { term: "mv SRC DEST", text: "Move (տեղափոխել)․ եթե DEST-ը directory է, տարրը տելեպորտ է արվում դրա ներս (օրինակ՝ `mv zone_4/drone_1.unit bunker/`)։" },
      { term: "mv OLD NEW", text: "Եթե DEST-ը նոր անուն է, տարրը մնում է իր տեղում և վերանվանվում է (օրինակ՝ `mv signal.old signal.new`)։" },
      { term: "*", text: "Wildcard․ shell-ն այն փոխարինում է համապատասխանող բոլոր անուններով, այնպես որ `*.unit` նշանակում է .unit-ով ավարտվող բոլոր անունները։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("mv", "Տեղափոխել (կամ վերանվանել) files և directories։"),
            A("zone_4/drone_1.unit", "ԱՂԲՅՈՒՐ․ տեղափոխվող օբյեկտի path-ը։"),
            A("bunker/", "ՆՊԱՏԱԿԱԿԵՏ․ գոյություն ունեցող directory, ուստի օբյեկտը գնում է դրա ներս։"),
          ],
          effect: "Ոչ մի տվյալ չի պատճենվում։ Kernel-ը հեռացնում է անունը zone_4-ի աղյուսակից և ավելացնում bunker-ի աղյուսակում։ Inode-ը երբեք տեղից չի շարժվում։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("mv", "Տեղափոխել (կամ վերանվանել)։"),
            A("signal.old", "Ընթացիկ անունը։"),
            A("signal.new", "Անուն, որը դեռ գոյություն չունի, ուստի սա վերանվանում է։"),
          ],
          effect: "Directory-ի գրառումը վերագրանցվում է տեղում։ Նույն inode-ը, նույն պարունակությունը, նոր պիտակ։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("mv", "Տեղափոխել (կամ վերանվանել)։"),
            A("zone_4/*.unit", "SHELL-ը բացում է սա համընկնող բոլոր անուններով՝ նախքան mv-ի գործարկվելը։"),
            A("bunker/", "Մի քանի աղբյուրի դեպքում վերջին argument-ը պետք է լինի directory։"),
          ],
          effect: "mv-ն իրականում ստանում է բոլոր համընկնող .unit ֆայլերը և տեղափոխում դրանք bunker/։",
          out: ["(ելք չկա)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("fortress/vault/master.key"), KEY);
      writeFile(fs, h("sector_9/civ_ada.bot"), "Ada: keeps the clocks in sync\n");
      writeFile(fs, h("sector_9/civ_linus.bot"), "Linus: guards the kernel gate\n");
      writeFile(fs, h("sector_9/civ_grace.bot"), "Grace: hunts bugs for a living\n");
      writeFile(fs, h("sector_9/beacon.tmp"), "SOS sector 9 collapsing\n");
    },
    objectives: [
      {
        text: "Տելեպորտ արեք `civ_ada.bot`-ին `sector_9`-ից դեպի `fortress`։",
        hint: "mv sector_9/civ_ada.bot fortress/",
        check: (c) => typeAt(c.fs, h("fortress/civ_ada.bot")) === "file" && typeAt(c.fs, h("sector_9/civ_ada.bot")) == null,
      },
      {
        text: "Տարհանեք մյուս երկու քաղաքացիներին։ `*.bot` wildcard-ը միանգամից ընտրում է բոլոր bot-երին։",
        hint: "mv sector_9/*.bot fortress/",
        check: (c) =>
          ["civ_ada.bot", "civ_linus.bot", "civ_grace.bot"].every((n) => typeAt(c.fs, h("fortress/" + n)) === "file") &&
          !names(c.fs, h("sector_9")).some((n) => n.endsWith(".bot")),
      },
      {
        text: "`mv`-ն նաև վերանվանում է։ Փրկարար նավերը կարդում են միայն `.sig` files, այնպես որ `sector_9/beacon.tmp`-ը դարձրեք `sector_9/beacon.sig`։",
        hint: "mv sector_9/beacon.tmp sector_9/beacon.sig",
        check: (c) => countNames(c.fs, (n) => n === "beacon.tmp") === 0 && countNames(c.fs, (n) => n === "beacon.sig") > 0,
      },
    ],
    recap: [
      "`mv`-ն տեղափոխում է օբյեկտները directories-ի միջև և վերանվանում դրանք։ Այն երբեք չի կրկնօրինակում։",
      "`*`-ը shell-ի կողմից բացվում է համընկնող բոլոր անուններով՝ նախքան command-ի գործարկումը։",
    ],
  },
  {
    id: "1-6",
    act: 1,
    title: "Ամրոցի մատակարարումը · Գործնական սինթեզ I",
    commands: ["ls -la", "mkdir -p", "cp", "mv", "echo >>", "cat"],
    minCommands: 6,
    labs: [],
    story: [
      "Նախքան սեկտոր 7-ի գլխավոր որջը մտնելը, մենք պետք է ամրացնենք մեր մատակարարման գիծը։ Այստեղ անհրաժեշտ է համադրել Նախաբանի և Արար I-ի բոլոր հմտությունները։",
      "Սկանավորեք թաքնված պահեստը (`ls -la`), կառուցեք խորը պահոց (`mkdir -p`), պատճենեք գաղտնի կոդը (`cp`), տեղափոխեք բոլոր `.cell` մարտկոցները wildcard-ով (`mv`), գրանցեք կարգավիճակը (`echo >>`) և ստուգեք կոդը `cat`-ով։",
    ],
    concepts: [
      { term: "Հրամանների համադրում", text: "Իրական առաջադրանքներում `ls -la`, `mkdir -p`, `cp`, `mv` և `>>` գործիքներն աշխատում են որպես մեկ միասնական շղթա։" },
      { term: "cp .hidden DEST/", text: "Կետով սկսվող թաքնված file-ը կարելի է պատճենել պահոց՝ նշելով դրա ճշգրիտ անունը (օրինակ՝ `cp .token depot/safe/`)։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("mkdir", "Կառուցել directory-ների շղթա։"),
            F("-p", "parents․ միանգամից ստեղծել ծնող և զավակ սենյակները։"),
            A("depot/safe", "Կառուցվող խորը path-ը։"),
          ],
          effect: "Մեկ հրամանով ստեղծում է depot սենյակը և դրա ներսում՝ safe ենթասենյակը։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("cp", "Պատճենել file-ը։"),
            A(".token", "Թաքնված աղբյուր file-ը։"),
            A("depot/safe/", "Նպատակակետ սենյակը։"),
          ],
          effect: "Պատճենում է թաքնված .token file-ը depot/safe/ պահոցի մեջ։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("mv", "Տեղափոխել խմբով։"),
            A("*.pack", "Wildcard՝ ընտրում է .pack-ով ավարտվող բոլոր ֆայլերը։"),
            A("depot/safe/", "Նպատակակետ սենյակը։"),
          ],
          effect: "Բոլոր համընկնող .pack ֆայլերը միանգամից տեղափոխվում են պահոց։",
          out: ["(ելք չկա)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h(".cipher.key"), "CIPHER-OMEGA-900\n");
      writeFile(fs, h("energy_1.cell"), "CELL 1: 100%\n");
      writeFile(fs, h("energy_2.cell"), "CELL 2: 100%\n");
      writeFile(fs, h("status.log"), "SUPPLY LOG INITIALIZED\n");
    },
    objectives: [
      {
        text: "Սկանավորեք սենյակը `ls -la`-ով՝ բացահայտելու թաքնված `.cipher.key` ֆայլը։",
        hint: "ls -la",
        check: (c) => ran(c, "ls", (e) => e.flags.includes("a") || e.flags.includes("A")),
      },
      {
        text: "Մեկ հրամանով կառուցեք `supply/armory` խորը պահոցը։",
        hint: "mkdir -p supply/armory",
        check: (c) => typeAt(c.fs, h("supply/armory")) === "dir",
      },
      {
        text: "Պատճենեք թաքնված `.cipher.key` ֆայլը `supply/armory/` պահոցի մեջ։",
        hint: "cp .cipher.key supply/armory/",
        needs: [1],
        check: (c) => read(c.fs, h("supply/armory/.cipher.key")) === "CIPHER-OMEGA-900\n",
      },
      {
        text: "Տեղափոխեք բոլոր `.cell` մարտկոցները `supply/armory/`՝ օգտագործելով `*` wildcard-ը։",
        hint: "mv *.cell supply/armory/",
        needs: [1],
        check: (c) =>
          typeAt(c.fs, h("supply/armory/energy_1.cell")) === "file" &&
          typeAt(c.fs, h("supply/armory/energy_2.cell")) === "file" &&
          countNames(c.fs, (n) => n.endsWith(".cell")) === 2 &&
          !names(c.fs, HOME).some((n) => n.endsWith(".cell")),
      },
      {
        text: "Ավելացրեք (`>>`) `READY=1` տողը `status.log` ֆայլի վերջից՝ պահպանելով սկզբնական տողը։",
        hint: 'echo "READY=1" >> status.log',
        check: (c) => {
          const t = read(c.fs, h("status.log")) ?? "";
          return t.includes("SUPPLY LOG INITIALIZED") && /^READY=1$/m.test(t.trim());
        },
      },
      {
        text: "Կարդացեք տեղափոխված `supply/armory/.cipher.key` բանալին։",
        hint: "cat supply/armory/.cipher.key",
        needs: [2],
        check: (c) => ran(c, "cat", (e) => e.out.some((l) => l.includes("CIPHER-OMEGA-900"))),
      },
    ],
    guards: [
      {
        text: "Պահպանեք `status.log`-ի սկզբնական պարունակությունը։",
        check: (c) => (read(c.fs, h("status.log")) ?? "").includes("SUPPLY LOG INITIALIZED"),
      },
    ],
    recap: [
      "Դուք համադրեցիք `ls -la`, `mkdir -p`, `cp`, `mv *`, `echo >>` և `cat` հրամանները մեկ գործնական առաքելության մեջ։",
    ],
  },
  {
    id: "1-7",
    act: 1,
    title: "Հետախուզության Կայան · Գործնական սինթեզ II",
    commands: ["which", "alias", "mkdir -p", "cp", "mv", "*", "echo >>"],
    minCommands: 7,
    labs: [],
    story: [
      "Սեկտոր 7-ից առաջ INIT-ը հայտնաբերել է երկու լքված դիտակետ (`outpost_alpha` և `outpost_beta`), որտեղ մնացել են կարևոր տվյալներ և մատակարարման փաթեթներ։",
      "Ստուգեք `mv` գործիքի տեղը (`which`), ստեղծեք կարճատում (`alias`), կառուցեք `fortress/comms` հանգույցը, պատճենեք տելեմետրիան (`cp`), տարհանեք բոլոր `.pack` փաթեթները wildcard-ով (`mv`), վերանվանեք `.tmp` փարոսը `.sig`-ի և թարմացրեք զեկույցը (`echo >>`)։",
    ],
    concepts: [
      { term: "Գործիքների ստուգում + Կարճատում", text: "`which`-ը ցույց է տալիս ծրագրի ուղին, իսկ `alias`-ը ստեղծում է արագ հրամաններ հետախուզության համար։" },
      { term: "cp vs mv վերանվանում", text: "`cp`-ն թողնում է բնօրինակն իր տեղում, մինչդեռ `mv src dest`-ը կարող է միաժամանակ տեղափոխել և վերանվանել։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("which", "Ստուգել ծրագրի ճանապարհը։"),
            A("cp", "Որոնվող գործիքի անունը։"),
          ],
          effect: "Վերադարձնում է /bin/cp կամ /usr/bin/... ուղին։",
          out: ["/bin/cp"],
        },
        {
          tokens: [
            C("alias", "Ստեղծել կարճատում։"),
            A("check='ls -la'", "Անունը և նրան համապատասխանող հրամանը։"),
          ],
          effect: "check հավաքելիս shell-ն այն փոխարինում է ls -la-ով։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("mv", "Տեղափոխել և վերանվանել։"),
            A("post/old.tmp", "Աղբյուր ֆայլի path-ը։"),
            A("base/new.sig", "Նպատակակետ path-ն ու նոր անունը։"),
          ],
          effect: "old.tmp-ն տեղափոխվում է base և միանգամից ստանում new.sig անունը։",
          out: ["(ելք չկա)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("outpost_alpha/telemetry.dat"), "TELEMETRY-SECTOR-7: CLEAR\n");
      writeFile(fs, h("outpost_alpha/beacon.tmp"), "BEACON-ALPHA-PING\n");
      writeFile(fs, h("outpost_beta/supply_1.pack"), "SUPPLY PACK 1\n");
      writeFile(fs, h("outpost_beta/supply_2.pack"), "SUPPLY PACK 2\n");
      writeFile(fs, h("fortress/dispatch.log"), "DISPATCH HEADER\n");
    },
    objectives: [
      {
        text: "Պարզեք `mv` գործիքի ճշգրիտ տեղը համակարգում (`which`)։",
        hint: "which mv",
        check: (c) => ran(c, "which", (e) => e.args.includes("mv")),
      },
      {
        text: "Ստեղծեք `scan` անունով alias՝ `ls -la` հրամանը արագ կանչելու համար։",
        hint: "alias scan='ls -la'",
        check: (c) => ran(c, "alias", (e) => e.args.some((x) => x.startsWith("scan="))),
      },
      {
        text: "Կառուցեք `fortress/comms` կապի հանգույցը (մեկ հրամանով)։",
        hint: "mkdir -p fortress/comms",
        check: (c) => typeAt(c.fs, h("fortress/comms")) === "dir",
      },
      {
        text: "Պատճենեք `outpost_alpha/telemetry.dat`-ը `fortress/comms/`՝ պահպանելով բնօրինակը `outpost_alpha`-ում։",
        hint: "cp outpost_alpha/telemetry.dat fortress/comms/",
        needs: [2],
        check: (c) =>
          read(c.fs, h("fortress/comms/telemetry.dat")) === "TELEMETRY-SECTOR-7: CLEAR\n" &&
          typeAt(c.fs, h("outpost_alpha/telemetry.dat")) === "file",
      },
      {
        text: "Տեղափոխեք `outpost_beta`-ի բոլոր `.pack` փաթեթները `fortress/comms/`՝ wildcard-ով։",
        hint: "mv outpost_beta/*.pack fortress/comms/",
        needs: [2],
        check: (c) =>
          typeAt(c.fs, h("fortress/comms/supply_1.pack")) === "file" &&
          typeAt(c.fs, h("fortress/comms/supply_2.pack")) === "file" &&
          !names(c.fs, h("outpost_beta")).some((n) => n.endsWith(".pack")),
      },
      {
        text: "Տեղափոխեք և վերանվանեք `outpost_alpha/beacon.tmp`-ը որպես `fortress/comms/beacon.sig`։",
        hint: "mv outpost_alpha/beacon.tmp fortress/comms/beacon.sig",
        needs: [2],
        check: (c) =>
          typeAt(c.fs, h("outpost_alpha/beacon.tmp")) == null &&
          read(c.fs, h("fortress/comms/beacon.sig")) === "BEACON-ALPHA-PING\n",
      },
      {
        text: "Ավելացրեք (`>>`) `COMMS_READY=1` տողը `fortress/dispatch.log`-ի վերջից։",
        hint: 'echo "COMMS_READY=1" >> fortress/dispatch.log',
        check: (c) => read(c.fs, h("fortress/dispatch.log")) === "DISPATCH HEADER\nCOMMS_READY=1\n",
      },
    ],
    guards: [
      {
        text: "Պահպանեք `outpost_alpha/telemetry.dat`-ը և `fortress/dispatch.log`-ի սկզբնական տողը։",
        check: (c) =>
          typeAt(c.fs, h("outpost_alpha/telemetry.dat")) === "file" &&
          (read(c.fs, h("fortress/dispatch.log")) ?? "").includes("DISPATCH HEADER"),
      },
    ],
    recap: [
      "Դուք համադրեցիք `which`, `alias`, `mkdir -p`, `cp`, `mv *`, վերանվանումը և `echo >>`-ը՝ պատրաստելով ամրոցի կապի հանգույցը։",
    ],
  },
  {
    id: "1-8",
    act: 1,
    title: "Արխիվի Վերակառուցում · Գործնական սինթեզ III",
    commands: ["whatis", "ls -la", "rmdir", "mkdir -p", "cp", "mv", "echo >", "echo >>"],
    minCommands: 7,
    labs: [],
    story: [
      "Մինչ Ֆրագմենտատորի որջ ներխուժելը, INIT-ը գտել է հին արխիվի ավերակները (`ruins`)․ այնտեղ թաքնված են քարտեզներ, գաղտնի բանալի և մի դատարկ հին սենյակ՝ `ruins/obsolete`։",
      "Ստուգեք `rmdir` հրամանի նկարագրությունը (`whatis`), ուսումնասիրեք `ruins`-ի թաքնված ֆայլերը (`ls -la`), հեռացրեք դատարկ `ruins/obsolete`-ը (`rmdir`), կառուցեք `fortress/archive/keys` պահոցը, փրկեք բանալին ու քարտեզները և կազմեք մանիֆեստ (`>` և `>>`)։",
    ],
    concepts: [
      { term: "rmdir DIR", text: "Ջնջում է միայն ԴԱՏԱՐԿ directory-ն՝ պաշտպանելով չնախատեսված տվյալների կորստից։" },
      { term: "whatis + ls -la", text: "Ստուգեք գործիքի նկարագրությունը, ապա ռենտգենով բացահայտեք կետով սկսվող թաքնված ֆայլերը։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("whatis", "Համառոտ նկարագրություն։"),
            A("rmdir", "Ուսումնասիրվող հրամանը։"),
          ],
          effect: "Ցույց է տալիս rmdir հրամանի մեկտողանի նշանակությունը։",
          out: ["rmdir - remove empty directories"],
        },
        {
          tokens: [
            C("rmdir", "Հեռացնել դատարկ սենյակ։"),
            A("old_zone/empty", "Հեռացվող դատարկ directory-ի path-ը։"),
          ],
          effect: "Ջնջում է միայն դատարկ directory-ն․ եթե ներսում ֆայլ կա, հրաժարվում է։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("echo", "Տպել տեքստ։"),
            A('"STATUS=OK"', "Մանիֆեստի առաջին տողը։"),
            O(">", "Ստեղծել կամ վերագրանցել ֆայլը։"),
            A("base/manifest.txt", "Մանիֆեստի ֆայլը։"),
          ],
          effect: "Ստեղծում է manifest.txt-ն՝ գրելով առաջին տողը։",
          out: ["(գրվեց base/manifest.txt-ում)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      mkdirp(fs, h("ruins/obsolete"));
      writeFile(fs, h("ruins/.vault_key"), "VAULT-KEY-ARC-1\n");
      writeFile(fs, h("ruins/sector_1.map"), "MAP SECTOR 1: OK\n");
      writeFile(fs, h("ruins/sector_2.map"), "MAP SECTOR 2: OK\n");
      writeFile(fs, h("ruins/notes.txt"), "Empty room obsolete/ can be removed safely.\n");
    },
    objectives: [
      {
        text: "`whatis`-ի միջոցով կարդացեք `rmdir` հրամանի համառոտ նկարագրությունը։",
        hint: "whatis rmdir",
        check: (c) => ran(c, "whatis", (e) => e.args.includes("rmdir")),
      },
      {
        text: "Ռենտգենով (`ls -la`) սկանավորեք `ruins` սենյակը՝ տեսնելու թաքնված `.vault_key`-ը և `obsolete`-ը։",
        hint: "ls -la ruins",
        check: (c) =>
          (c.xray != null && c.xray === idAt(c.fs, h("ruins"))) ||
          ran(c, "ls", (e) => (e.flags.includes("a") || e.flags.includes("A")) && (e.args.some((x) => x.includes("ruins")) || c.cwd === h("ruins"))),
      },
      {
        text: "Հեռացրեք դատարկ `ruins/obsolete` սենյակը (`rmdir`)։",
        hint: "rmdir ruins/obsolete",
        check: (c) => typeAt(c.fs, h("ruins/obsolete")) == null,
      },
      {
        text: "Կառուցեք `fortress/archive/keys` խորը պահոցը։",
        hint: "mkdir -p fortress/archive/keys",
        check: (c) => typeAt(c.fs, h("fortress/archive/keys")) === "dir",
      },
      {
        text: "Պատճենեք `ruins/.vault_key`-ը `fortress/archive/keys/` և տեղափոխեք բոլոր `ruins/*.map` քարտեզները նույն պահոց։",
        hint: "cp ruins/.vault_key fortress/archive/keys/ && mv ruins/*.map fortress/archive/keys/",
        needs: [3],
        check: (c) =>
          read(c.fs, h("fortress/archive/keys/.vault_key")) === "VAULT-KEY-ARC-1\n" &&
          typeAt(c.fs, h("fortress/archive/keys/sector_1.map")) === "file" &&
          typeAt(c.fs, h("fortress/archive/keys/sector_2.map")) === "file" &&
          !names(c.fs, h("ruins")).some((n) => n.endsWith(".map")),
      },
      {
        text: "Ստեղծեք `fortress/archive/manifest.txt` մանիֆեստը՝ գրելով `ARCHIVE=ONLINE` (`>`), ապա ավելացնելով `KEYS=SECURED` (`>>`)։",
        hint: 'echo "ARCHIVE=ONLINE" > fortress/archive/manifest.txt && echo "KEYS=SECURED" >> fortress/archive/manifest.txt',
        needs: [3],
        check: (c) => read(c.fs, h("fortress/archive/manifest.txt")) === "ARCHIVE=ONLINE\nKEYS=SECURED\n",
      },
    ],
    recap: [
      "Դուք մաքրեցիք ավելորդ դատարկ սենյակը `rmdir`-ով, փրկեցիք թաքնված բանալին ու քարտեզները և կազմեցիք արխիվի մանիֆեստը՝ պատրաստ լինելով Բոս 1-ին։",
    ],
  },
  {
    id: "1-9",
    act: 1,
    title: "Մաքրել խափանումը · Բոս 1՝ Ֆրագմենտատոր",
    commands: ["cd", "ls -la", "mkdir -p", "cp", "cat", "rm", "rm -r"],
    minCommands: 7,
    boss: "boss-1",
    labs: [],
    story: [
      "Սեկտոր 7-ը վխտում է վիրուսային խափանումներով (Glitches), իսկ թաքնված `.chamber` սենյակում դարանակալել է Արար I-ի Բոսը՝ Ֆրագմենտատորը (The Fragmenter)։",
      "Ֆրագմենտատորը պաշտպանված է հզոր Էներգետիկ Վահանով (`պաշտպանիչ վահան`), որն անխոցելի է դարձնում նրան, քանի դեռ չեք կատարել բոլոր նախնական առաջադրանքները․ պահուստավորեք `core.dat`-ը, կարդացեք գաղտնի `.passkey`-ը և ոչնչացրեք նրա սպասավոր խափանումները (`worm.glitch` և `glitch_nest`)։ Միայն վահանի անջատումից հետո գրոհեք `fragmenter.boss`-ին։",
    ],
    concepts: [
      { term: "Պաշտպանիչ վահան", text: "Բոսի վահանն ակտիվ է, քանի դեռ առաքելության նախնական առաջադրանքները չեն ավարտվել։ Նախ մաքրեք սեկտորը և ապահովագրեք միջուկը։" },
      { term: "rm FILE", text: "Remove (հեռացնել)․ ջնջում է file-ը (օրինակ՝ `rm bug.err`)։ Խափանումների դեպքում սկսում է 1 հարցանոց մարտ։" },
      { term: "rm -r DIR", text: "Recursive․ ջնջում է directory-ն ԵՎ դրա ներսում եղած ամեն ինչ (օրինակ՝ `rm -r hive_dir`)։ Բների դեպքում սկսում է 3 հարցանոց մարտ։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [C("rm", "Հեռացնել files։"), A("bug.err", "Ջնջվող file-ը։")],
          effect: "Անունը ջնջվում է directory-ից, և inode-ի link-երի քանակը դառնում է 0, ուստի kernel-ն ազատում է տվյալները։",
          out: ["(ելք չկա, և երկրորդ հնարավորություն էլ չկա)"],
        },
        {
          tokens: [
            C("rm", "Հեռացնել files։"),
            F("-r", "recursive․ մտնել directory, ջնջել դրա մեջ եղած ամեն ինչ, ապա ջնջել հենց directory-ն։"),
            A("hive_dir", "Ոչնչացվող directory-ն։"),
          ],
          effect: "rm -r-ը մտնում է յուրաքանչյուր ենթասենյակ և ջնջում ամբողջ բույնը։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [C("rm", "Հեռացնել files։"), A(".secret_room/overlord.err", "Թաքնված սենյակում գտնվող թիրախի path-ը։")],
          effect: "Երբ բոլոր նախնական պայմանները կատարված են, վահանն անջատվում է, և մարտը Բոսի դեմ սկսվում է։",
          out: ["(մարտը սկսվում է)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      ["civ_ada.bot", "civ_linus.bot", "civ_grace.bot"].forEach((n) => writeFile(fs, h("fortress/" + n), n + "\n"));
      writeFile(fs, h("sector_7/worm.glitch"), "x#!%01 01 01\n");
      setGlitch(fs, h("sector_7/worm.glitch"), "single");
      writeFile(fs, h("sector_7/glitch_nest/spawn_1.glitch"), "01\n");
      writeFile(fs, h("sector_7/glitch_nest/spawn_2.glitch"), "10\n");
      setGlitch(fs, h("sector_7/glitch_nest"), "nest");
      writeFile(fs, h("sector_7/.chamber/.passkey"), "PASSKEY: FRAG-77-UNLOCK\nBoss target: .chamber/fragmenter.boss\n");
      writeFile(fs, h("sector_7/.chamber/fragmenter.boss"), "BOSS_1::THE_FRAGMENTER\n");
      setGlitch(fs, h("sector_7/.chamber/fragmenter.boss"), "boss-1");
      writeFile(fs, h("sector_7/civ_ken.bot"), "Ken: wrote the first shell\n");
      writeFile(fs, h("sector_7/core.dat"), "SECTOR 7 CORE\nintegrity: 41%\n");
    },
    objectives: [
      {
        text: "Մտեք `sector_7` և միացրեք ռենտգենյան սկանավորումը (`ls -la`)՝ բացահայտելու թաքնված `.chamber` սենյակը։",
        hint: "cd sector_7 && ls -la",
        check: (c) =>
          c.cwd === h("sector_7") &&
          ((c.xray != null && c.xray === idAt(c.fs, h("sector_7"))) ||
            ran(c, "ls", (e) => e.flags.includes("a") || e.flags.includes("A"))),
      },
      {
        text: "Ապահովագրեք սեկտորի միջուկը․ ստեղծեք `safe` պահոց և պատճենեք `core.dat`-ը դրա ներս։",
        hint: "mkdir -p safe && cp core.dat safe/",
        check: (c) => read(c.fs, h("sector_7/safe/core.dat")) === "SECTOR 7 CORE\nintegrity: 41%\n",
      },
      {
        text: "Կարդացեք `.chamber/.passkey` վահանի ապակոդավորման բանալին։",
        hint: "cat .chamber/.passkey",
        check: (c) => ran(c, "cat", (e) => e.args.some((x) => x.endsWith(".passkey"))),
      },
      {
        text: "Ոչնչացրեք պահակային `worm.glitch`-ը։",
        hint: "rm worm.glitch",
        check: (c) => countNames(c.fs, (n) => n === "worm.glitch") === 0,
      },
      {
        text: "Ոչնչացրեք վահանը սնուցող `glitch_nest` բույնը։",
        hint: "rm -r glitch_nest",
        check: (c) => countNames(c.fs, (n) => n === "glitch_nest") === 0,
      },
      {
        text: "Պաշտպանիչ վահանն անջատված է․ մարտի բռնվեք և ոչնչացրեք Արար I-ի Բոսին՝ `.chamber/fragmenter.boss`-ին։",
        hint: "rm .chamber/fragmenter.boss",
        needs: [0, 1, 2, 3, 4],
        check: (c) => countNames(c.fs, (n) => n === "fragmenter.boss") === 0,
      },
    ],
    guards: [
      {
        text: "Պահպանեք `civ_ken.bot`-ը և `core.dat`-ը անվնաս։",
        check: (c) => countNames(c.fs, (n) => n === "civ_ken.bot") > 0 && countNames(c.fs, (n) => n === "core.dat") > 0,
      },
    ],
    recap: [
      "`rm`-ը ջնջում է files, իսկ `rm -r`-ը՝ directories և դրանց ամբողջ պարունակությունը։",
      "Դուք անջատեցիք Ֆրագմենտատորի պաշտպանիչ վահանը, հաղթեցիք նրան և ազատագրեցիք Արար I-ի սեկտորները։",
    ],
  },

  /* ===== ACT II: ԿԱՄՈՒՐՋՆԵՐ ԵՎ ՀՈՍՔԵՐ ===== */
  {
    id: "2-1",
    act: 2,
    title: "Բյուրեղյա խարիսխներ",
    commands: ["ln", "ls -li", "rm", "cat"],
    minCommands: 5,
    labs: [{ kind: "inode" }],
    story: [
      "Անդունդի մյուս կողմում գտնվող ուղեկալը (outpost) հոսանք չունի, իսկ էներգետիկ գծին կպել է մակաբույծ խափանում (`leech.glitch`)։ Ռեակտորի միջուկը պարունակում է 9000 տերավատ, և այն `cp`-ով պատճենելու համար կպահանջվի ևս 9000։ Մենք այդքան հիշողություն չունենք։",
      "Ահա այն գաղտնիքը, որը պահում էր filesystem-ը․ file-ի անունը և file-ի տվյալները երկու տարբեր բաներ են։ Մաքրեք խափանումը, կապեք միջուկը hard link-ով և ստուգեք inode-ները։",
    ],
    concepts: [
      { term: "inode", text: "Յուրաքանչյուր file-ի տվյալները գտնվում են համարակալված բջջում, որը կոչվում է inode։ File-ի անունն ընդամենը պիտակ է, որը ցույց է տալիս այդ համարի վրա։" },
      { term: "ln TARGET NAME", text: "Hard link․ ավելացնում է երկրորդ պիտակ նույն inode-ին (օրինակ՝ `ln crystal.dat link.dat`)։ Ոչինչ չի պատճենվում։" },
      { term: "link count", text: "Inode-ը հաշվում է իր պիտակները։ Տվյալները ջնջվում են միայն այն ժամանակ, երբ քանակը հասնում է զրոյի։" },
      { term: "ls -li", text: "-i flag-ը ցույց է տալիս յուրաքանչյուր inode-ի համարը։ Նույն համարը նշանակում է նույն տվյալները։" },
    ],
    diagram: { kind: "inode" },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("power/reactor.core"), CORE);
      writeFile(fs, h("outpost/relay.txt"), "Relay offline: no power.\n");
      writeFile(fs, h("leech.glitch"), "PARASITE::POWER_LEECH\n");
      setGlitch(fs, h("leech.glitch"), "single");
    },
    objectives: [
      {
        text: "Ոչնչացրեք էներգիան կլանող `leech.glitch` խափանումը։",
        hint: "rm leech.glitch",
        check: (c) => countNames(c.fs, (n) => n === "leech.glitch") === 0,
      },
      {
        text: "Ստեղծեք hard link․ ռեակտորի տվյալներին տվեք երկրորդ անուն՝ `outpost/anchor.core`։",
        hint: "ln power/reactor.core outpost/anchor.core",
        check: (c) => {
          const id = idAt(c.fs, h("power/reactor.core"), false);
          return id != null && names(c.fs, h("outpost")).some((n) => idAt(c.fs, h("outpost/" + n), false) === id);
        },
      },
      {
        text: "Համեմատեք inode-ի համարները երկու սենյակներում։ Նույն համարը՝ նույն բյուրեղյա միջուկը։",
        hint: "ls -li power outpost",
        check: (c) => ran(c, "ls", (e) => e.flags.includes("i")),
      },
      {
        text: "Փշրեք սկզբնական բյուրեղը․ հեռացրեք `power/reactor.core`-ը։",
        hint: "rm power/reactor.core",
        needs: [1],
        check: (c) => typeAt(c.fs, h("power/reactor.core"), false) == null,
      },
      {
        text: "Կարդացեք `outpost/anchor.core`-ը։ Արդյո՞ք էներգիան պահպանվեց։",
        hint: "cat outpost/anchor.core",
        needs: [3],
        check: (c) => ran(c, "cat") && names(c.fs, h("outpost")).some((n) => read(c.fs, h("outpost/" + n)) === CORE),
      },
    ],
    recap: [
      "Hard link-ը նույն inode-ի երկրորդ անունն է։ Չկա բնօրինակ և պատճեն․ երկու անուններն էլ հավասարազոր են։",
      "Մեկ անունը ջնջելը տվյալները թողնում է անձեռնմխելի, քանի դեռ չի հեռացվել վերջին անունը։",
    ],
  },
  {
    id: "2-2",
    act: 2,
    title: "Հոլոգրաֆիկ պորտալներ",
    commands: ["ln -s", "cd", "ls -l", "mv", "rm"],
    minCommands: 7,
    labs: [{ kind: "inode" }],
    story: [
      "Արխիվի պահոցը թաղված է երեք սենյակ խորության վրա, և դուք հաճախ պետք է հասնեք դրան։ Hard links-ը չեն կարող ցույց տալ directories-ի վրա։ Պորտալները կարող են։",
      "Symbolic link-ը չի պարունակում տվյալներ կամ inode-ի համար։ Այն պարունակում է path՝ գրառված երկտողի պես։ Դա այն դարձնում է ճկուն, բայց նաև փխրուն, եթե թիրախը տեղափոխվի։",
    ],
    concepts: [
      { term: "ln -s TARGET NAME", text: "Symbolic link․ փոքրիկ file, որն ասում է՝ «գնա այս path-ով» (օրինակ՝ `ln -s storage/far/room portal`)։" },
      { term: "Աշխատում է սենյակների վրա", text: "Ի տարբերություն hard links-ի՝ symlinks-ը կարող են ցույց տալ directories-ի վրա։" },
      { term: "Broken link", text: "Եթե թիրախը վերանվանվի կամ ջնջվի, պորտալը դեռ ցույց կտա հին path-ի վրա․ ստուգեք այն `ls -l`-ով և փոխարինեք նորով։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("ln", "Ստեղծել links files-ի միջև։"),
            F("-s", "symbolic․ պահել path՝ inode-ը կիսելու փոխարեն։"),
            A("storage/far/room", "ԹԻՐԱԽ (TARGET)․ այն path-ը, որի վրա ցույց կտա պորտալը։ Պահվում է որպես սովորական տեքստ։"),
            A("portal", "ԱՆՈՒՆ (NAME)․ թե ինչպես է կոչվում հենց պորտալը։"),
          ],
          effect: "Ստեղծվում է 'link' տեսակի նոր, փոքրիկ inode։ Դրա ամբողջ պարունակությունը storage/far/room տեքստն է։ Kernel-ը հետևում է դրան ամեն անգամ, երբ օգտագործում եք այդ անունը։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [C("ls", "Ցուցադրել directory-ի պարունակությունը։"), F("-l", "մանրամասն ձևաչափ․ բացահայտում է, թե ուր են ցույց տալիս links-ը։")],
          effect: "Սկզբի l տառը նշում է symbolic link-ը, իսկ սլաքը ցույց է տալիս պահված path-ը։",
          out: ["lrwxrwxrwx 1 architect    16 portal -> storage/far/room"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("archive/deep/vault/treasure.dat"), "ARCHIVE SEED\nrestores: act III reactor\n");
      writeFile(fs, h("archive/deep/vault/blueprint.txt"), "Refinery blueprint, page 1 of 1\n");
      writeFile(fs, h("archive/index.txt"), "deep/ : long-term storage\n");
    },
    objectives: [
      {
        text: "Բացեք պորտալ․ ստեղծեք `shortcut` անունով symbolic link, որը ցույց է տալիս `archive/deep/vault`-ի վրա։",
        hint: "ln -s archive/deep/vault shortcut",
        check: (c) => typeAt(c.fs, h("shortcut"), false) === "link" && typeAt(c.fs, h("shortcut")) === "dir",
      },
      { text: "Անցեք պորտալի միջով։", hint: "cd shortcut", check: (c) => c.cwd === h("shortcut") },
      { text: "Վերադարձեք home։", hint: "cd ~", needs: [1], check: (c) => c.cwd === HOME },
      {
        text: "Հիմա վերանվանեք թիրախային սենյակը `vault`-ից `bunker`՝ պորտալը կոտրելու համար։",
        hint: "mv archive/deep/vault archive/deep/bunker",
        needs: [0],
        check: (c) => typeAt(c.fs, h("shortcut"), false) === "link" && typeAt(c.fs, h("shortcut")) == null,
      },
      {
        text: "Ստուգեք կոտրված պորտալը `ls -l`-ով (տեսեք կարմիր սլաքը՝ առանց սխալ առաջացնող cd-ի)։",
        hint: "ls -l",
        needs: [3],
        check: (c) => ran(c, "ls", (e) => e.flags.includes("l")),
      },
      {
        text: "Հեռացրեք մեռած պորտալը (`rm`-ը symlink-ի վրա ջնջում է միայն պորտալը, երբեք՝ դրա թիրախը)։",
        hint: "rm shortcut",
        needs: [3],
        check: (c) => typeAt(c.fs, h("shortcut"), false) == null || typeAt(c.fs, h("shortcut")) === "dir",
      },
      {
        text: "Կառուցեք նոր `shortcut` պորտալ, որը ցույց է տալիս `archive/deep/bunker`-ի վրա։",
        hint: "ln -s archive/deep/bunker shortcut",
        needs: [5],
        check: (c) => typeAt(c.fs, h("shortcut"), false) === "link" && names(c.fs, h("shortcut")).includes("treasure.dat"),
      },
    ],
    recap: [
      "Symbolic link-ը պահում է path։ Այն կարող է ցույց տալ directories-ի վրա և կարող է կոտրվել։",
      "Hard link-ը կիսում է inode-ը։ Այն չի կարող կոտրվել, բայց աշխատում է միայն files-ի համար։",
    ],
  },
  {
    id: "2-3",
    act: 2,
    title: "Հոսքերի որսորդը",
    commands: ["cd", "ls -la", "cat", "grep", ">", ">>", "rm"],
    minCommands: 5,
    labs: [{ kind: "pipeline", stages: ["grep", "grepv", "stderr"] }],
    story: [
      "Կապի կայանը (`relays`) ստանում է ազդանշաններ երկու ալեհավաքներից՝ `alpha.log` և `beta.log`, բայց սենյակում հայտնվել է խանգարող խափանում (`static.glitch`), իսկ ռեզերվուարը լի է աղմուկով։",
      "Մտեք `relays`, ոչնչացրեք խափանումը `rm`-ով, ապա մաքրեք `combined.log` ռեզերվուարը և հավաքեք միայն `SIGNAL` տողերը երկու ալեհավաքներից՝ ճիշտ օգտագործելով `>` և `>>` օպերատորները։",
    ],
    concepts: [
      { term: "grep PATTERN FILE", text: "Գտնում և տպում է միայն այն տողերը, որոնք պարունակում են PATTERN բառը (օրինակ՝ `grep OK node1.txt`)։" },
      { term: "grep ... > file", text: "Ֆիլտրված տողերով վերագրանցում է file-ը՝ մաքրելով հին պարունակությունը։" },
      { term: "grep ... >> file", text: "Ֆիլտրված տողերն ավելացնում է file-ի վերջից՝ պահպանելով նախորդ տողերը։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("grep", "Ֆիլտրել տողերը։"),
            A("OK", "Փնտրվող բառը։"),
            A("node1.txt", "Աղբյուր file-ը։"),
            O(">", "Վերագրանցել նպատակակետը։"),
            A("out.txt", "Մաքուր ռեզերվուարը։"),
          ],
          effect: "grep-ը ընտրում է միայն OK պարունակող տողերը node1.txt-ից, իսկ >-ը դատարկում է out.txt-ն և լցնում դրանք ներս։",
          out: ["(ելքը գրվեց out.txt-ում)"],
        },
        {
          tokens: [
            C("grep", "Ֆիլտրել տողերը։"),
            A("OK", "Փնտրվող բառը։"),
            A("node2.txt", "Երկրորդ աղբյուր file-ը։"),
            O(">>", "Ավելացնել վերջից։"),
            A("out.txt", "Նույն ռեզերվուարը։"),
          ],
          effect: "node2.txt-ի OK տողերն ավելացվում են out.txt-ի վերջից՝ առանց ջնջելու node1.txt-ի տողերը։",
          out: ["(ելքը ավելացվեց out.txt-ում)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(
        fs,
        h("relays/alpha.log"),
        "SIGNAL alpha-101 online\nNOISE static burst\nSIGNAL alpha-204 online\nCORRUPT packet dropped\n",
      );
      writeFile(
        fs,
        h("relays/beta.log"),
        "NOISE hum\nSIGNAL beta-309 online\nCORRUPT header\nSIGNAL beta-412 online\n",
      );
      writeFile(fs, h("relays/combined.log"), "CORRUPTED old cache\n");
      writeFile(fs, h("relays/static.glitch"), "STATIC_JAMMER::0101\n");
      setGlitch(fs, h("relays/static.glitch"), "single");
    },
    objectives: [
      {
        text: "Մտեք `relays` սենյակ։",
        hint: "cd relays",
        check: (c) => c.cwd === h("relays"),
      },
      {
        text: "Ոչնչացրեք կապը խլացնող `static.glitch` խափանումը։",
        hint: "rm static.glitch",
        check: (c) => countNames(c.fs, (n) => n === "static.glitch") === 0,
      },
      {
        text: "Կարդացեք `alpha.log`-ը `cat`-ի միջոցով։",
        hint: "cat alpha.log",
        check: (c) => ran(c, "cat", (e) => e.args.some((x) => x.endsWith("alpha.log"))),
      },
      {
        text: "Ֆիլտրեք `SIGNAL` տողերը `alpha.log`-ից և `>`-ով գրեք `combined.log`-ի մեջ (մաքրելով հին աղբը)։",
        hint: "grep SIGNAL alpha.log > combined.log",
        check: (c) => {
          const t = read(c.fs, h("relays/combined.log")) ?? "";
          return t.includes("SIGNAL alpha-101 online") && !t.includes("CORRUPTED");
        },
      },
      {
        text: "Ավելացրեք (`>>`) `beta.log`-ի `SIGNAL` տողերը `combined.log`-ի վերջից։",
        hint: "grep SIGNAL beta.log >> combined.log",
        needs: [3],
        check: (c) =>
          read(c.fs, h("relays/combined.log")) ===
          "SIGNAL alpha-101 online\nSIGNAL alpha-204 online\nSIGNAL beta-309 online\nSIGNAL beta-412 online\n",
      },
    ],
    recap: [
      "`grep`-ը կարելի է ուղղակիորեն համակցել `>` և `>>` օպերատորների հետ՝ մաքուր տվյալներ հավաքելու համար։",
    ],
  },
  {
    id: "2-4",
    act: 2,
    title: "Առաջին Pipeline-ը",
    commands: ["cat", "grep", "|", "wc -l", "grep -v", "rm -r"],
    minCommands: 5,
    labs: [{ kind: "pipeline", stages: ["grep", "grepv", "wc", "stderr"] }],
    start: h("refinery"),
    story: [
      "Բարի գալուստ զտարան (refinery)։ Հիմնական ռեակտորը հեղեղված է․ մաքուր էներգիան, խշշոցն ու վնասաբեր ծրագրերի (malware) սիգնատուրաները լցվում են մեկ log-ի մեջ, իսկ անկյունում բույն է դրել `malware_nest` խափանումը։",
      "Մաքրեք բույնը `rm -r`-ով, ապա փոքր commands-ը միացրեք իրար pipe (`|`) խողովակով, որպեսզի յուրաքանչյուրի output-ը հոսի դեպի հաջորդը։",
    ],
    concepts: [
      { term: "grep PATTERN FILE", text: "Ֆիլտր․ թույլ է տալիս անցնել միայն այն տողերին, որոնք պարունակում են նշված նմուշը (օրինակ՝ `grep ERROR sensor.log`)։" },
      { term: "grep -v", text: "Շրջում է ֆիլտրը․ թույլ է տալիս անցնել միայն այն տողերին, որոնք ՉԵՆ համընկնում։" },
      { term: "A | B", text: "Pipe․ A-ի output-ն ուղիղ միացնում է B-ի input-ին։ Արանքում ոչինչ չի տպվում էկրանին։" },
      { term: "wc -l", text: "Word count՝ -l-ով տողերի համար․ հաշվում է, թե քանի տող է հոսում դրա մեջ։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("grep", "Փնտրել նմուշին համընկնող տողեր։"),
            A("ERROR", "PATTERN․ փնտրվող տեքստը։ Մեծատառ-փոքրատառը նշանակություն ունի։"),
            A("sensor.log", "FILE․ որտեղից կարդալ տողերը։"),
          ],
          effect: "grep-ը կարդում է log-ը տող առ տող։ ERROR պարունակող տողերը գնում են stdout, մնացած ամեն ինչ դեն է նետվում։",
          out: ["ERROR valve 1 stuck", "ERROR pressure high", "ERROR sensor timeout"],
        },
        {
          tokens: [
            C("grep", "Փնտրել նմուշին համընկնող տողեր։"),
            F("-v", "invert․ պահել այն տողերը, որոնք ՉԵՆ համընկնում։"),
            A("ERROR", "PATTERN։"),
            A("sensor.log", "FILE։"),
          ],
          effect: "Նույն մեքենան՝ հակառակ փականով․ պահում է միայն անսխալ տողերը։",
          out: ["STATUS normal", "TEMP 320K", "…"],
        },
        {
          tokens: [
            C("grep", "Առաջին մեքենան՝ ֆիլտրը։"),
            A("ERROR", "PATTERN։"),
            A("sensor.log", "FILE։"),
            O("|", "Pipe․ shell-ը միացնում է grep-ի stdout-ը wc-ի stdin-ին։"),
            C("wc", "Երկրորդ մեքենան՝ հաշվիչը։ Առանց file-ի անվան այն կարդում է pipe-ից։"),
            F("-l", "lines․ տպել միայն տողերի քանակը։"),
          ],
          effect: "Երկու ծրագրերն էլ աշխատում են միաժամանակ։ grep-ի տողերը երբեք չեն հասնում էկրանին․ դրանք pipe-ով հոսում են դեպի wc, որը տպում է մեկ թիվ։",
          out: ["3"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("refinery/reactor.log"), LOG);
      writeFile(fs, h("refinery/malware_nest/trojan_1.glitch"), "MAL_1\n");
      writeFile(fs, h("refinery/malware_nest/trojan_2.glitch"), "MAL_2\n");
      setGlitch(fs, h("refinery/malware_nest"), "nest");
    },
    objectives: [
      {
        text: "Ոչնչացրեք վարակի աղբյուր `malware_nest` բույնը։",
        hint: "rm -r malware_nest",
        check: (c) => countNames(c.fs, (n) => n === "malware_nest") === 0,
      },
      { text: "Դուրս բերեք հեղեղված `reactor.log`-ը ձեր էկրանին։", hint: "cat reactor.log", check: (c) => ran(c, "cat") },
      {
        text: "Ֆիլտրեք այն․ ցույց տվեք միայն `MALWARE` պարունակող տողերը։",
        hint: "grep MALWARE reactor.log",
        check: (c) => {
          const s = stage(c, "grep");
          return !!s && s.out.length === 4 && s.out.every((l) => l.includes("MALWARE"));
        },
      },
      {
        text: "Միացրեք խողովակ․ pipe արեք այդ արդյունքը `wc -l`-ի մեջ՝ սիգնատուրաները հաշվելու համար։",
        hint: "grep MALWARE reactor.log | wc -l",
        check: (c) => (c.trace?.stages.length ?? 0) > 1 && stage(c, "wc")?.out[0]?.trim() === "4",
      },
      {
        text: "Շրջեք ֆիլտրը `-v`-ով և հաշվեք այն տողերը, որոնք malware ՉԵՆ։",
        hint: "grep -v MALWARE reactor.log | wc -l",
        check: (c) =>
          (c.trace?.stages.length ?? 0) > 1 &&
          c.now.some((e) => e.name === "grep" && e.flags.includes("v")) &&
          stage(c, "wc")?.out[0]?.trim() === "8",
      },
    ],
    recap: [
      "`grep`-ը ֆիլտրում է տողերը, `-v`-ն շրջում է ֆիլտրը։",
      "`|` pipe-ը մեկ command-ի output-ը փոխանցում է հաջորդ command-ի input-ին։",
      "`wc -l`-ը հաշվում է տողերը։",
    ],
  },
  {
    id: "2-5",
    act: 2,
    title: "Էներգետիկ Կամուրջ · Գործնական սինթեզ I",
    commands: ["mkdir -p", "ln", "ln -s", "ls -li", "grep", "|", "wc -l", ">", ">>"],
    minCommands: 6,
    labs: [],
    story: [
      "Նախքան զտարանի սիրտ ներխուժելը, Արար I-ի կառուցողական գործիքները և Արար II-ի հղումներն ու խողովակաշարերը պետք է միավորվեն մեկ էներգետիկ կամրջում։",
      "Կառուցեք կառավարման կենտրոնը (`mkdir -p`), կապեք ռեակտորի միջուկը hard link-ով (`ln`), ստուգեք inode-ները (`ls -li`), բացեք սիմվոլիկ պորտալ դեպի կապի կայան (`ln -s`) և կառուցեք հաշվետվության pipeline (`grep ... | wc -l >> ...`)։",
    ],
    concepts: [
      { term: "Կառուցվածք + Հղումներ", text: "Նախ ստեղծեք նպատակակետ սենյակը `mkdir -p`-ով, ապա դրա ներսում տեղադրեք hard (`ln`) կամ symbolic (`ln -s`) հղումներ։" },
      { term: "Pipeline + Append", text: "`grep PASS data.log | wc -l >> summary.log` հրամանը հաշվում է համընկնող տողերը և թիվն ավելացնում հաշվետվության վերջից։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("ln", "Ստեղծել hard link։"),
            A("core/main.cell", "Աղբյուր ֆայլը։"),
            A("nexus/hub/main.cell", "Նոր պիտակը նոր կառուցված սենյակում։"),
          ],
          effect: "Երկու անուններն էլ կիսում են նույն inode-ը՝ առանց հիշողություն ծախսելու։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("grep", "Ֆիլտրել տողերը։"),
            A("PASS", "Փնտրվող նմուշը։"),
            A("comms/net.log", "Աղբյուր ֆայլը։"),
            O("|", "Pipe դեպի wc։"),
            C("wc", "Հաշվիչ։"),
            F("-l", "Հաշվել տողերը։"),
            O(">>", "Ավելացնել ֆայլի վերջից։"),
            A("nexus/hub/active.log", "Հաշվետվության ֆայլը։"),
          ],
          effect: "Հաշվում է PASS տողերի քանակը և արդյունքն ավելացնում active.log-ի վերջում։",
          out: ["(թիվը ավելացվեց active.log-ում)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("power/reactor.core"), CORE);
      writeFile(
        fs,
        h("relays/grid.log"),
        "NODE-1 ONLINE\nNODE-2 OFFLINE\nNODE-3 ONLINE\nNODE-4 CORRUPT\nNODE-5 ONLINE\n",
      );
    },
    objectives: [
      {
        text: "Կառուցեք `bridge/control` կառավարման սենյակը։",
        hint: "mkdir -p bridge/control",
        check: (c) => typeAt(c.fs, h("bridge/control")) === "dir",
      },
      {
        text: "Ստեղծեք hard link `power/reactor.core`-ի համար `bridge/control/reactor.core` անունով և ստուգեք inode-ները `ls -li`-ով։",
        hint: "ln power/reactor.core bridge/control/reactor.core && ls -li power bridge/control",
        needs: [0],
        check: (c) => {
          const a = idAt(c.fs, h("power/reactor.core"), false);
          const b = idAt(c.fs, h("bridge/control/reactor.core"), false);
          return a != null && a === b;
        },
      },
      {
        text: "Ստեղծեք `logs_portal` անունով symbolic link home-ում, որը ցույց է տալիս `relays` սենյակի վրա։",
        hint: "ln -s relays logs_portal",
        check: (c) => typeAt(c.fs, h("logs_portal"), false) === "link" && typeAt(c.fs, h("logs_portal")) === "dir",
      },
      {
        text: "Ֆիլտրեք `ONLINE` տողերը `logs_portal/grid.log`-ից (կամ `relays/grid.log`-ից) և `>`-ով գրեք `bridge/control/status.log`-ի մեջ։",
        hint: "grep ONLINE logs_portal/grid.log > bridge/control/status.log",
        needs: [0],
        check: (c) =>
          (read(c.fs, h("bridge/control/status.log")) ?? "").startsWith("NODE-1 ONLINE\nNODE-3 ONLINE\nNODE-5 ONLINE"),
      },
      {
        text: "Հաշվեք `ONLINE` տողերի քանակը (`grep` և `wc -l` pipeline-ով) և `>>`-ով ավելացրեք `bridge/control/status.log`-ի վերջից։",
        hint: "grep ONLINE relays/grid.log | wc -l >> bridge/control/status.log",
        needs: [3],
        check: (c) =>
          read(c.fs, h("bridge/control/status.log")) === "NODE-1 ONLINE\nNODE-3 ONLINE\nNODE-5 ONLINE\n3\n",
      },
    ],
    recap: [
      "Դուք միավորեցիք `mkdir -p`, `ln`, `ln -s`, `grep`, `|`, `wc -l`, `>` և `>>` հրամանները մեկ ամբողջական համակարգում։",
    ],
  },
  {
    id: "2-6",
    act: 2,
    title: "Պահեստային Խողովակաշար · Գործնական սինթեզ II",
    commands: ["ln -s", "mkdir -p", "cp", "*", "ln", "grep", "grep -v", "|", ">", ">>", "wc -l"],
    minCommands: 6,
    labs: [],
    start: h("refinery"),
    story: [
      "Զտարանի հեռավոր սենսորային տվյալները թաղված են խորը պահոցում (`deep_storage/telemetry/raw`), իսկ հոսքերը խառնված են կեղծ `ERR` ազդանշաններով։",
      "Բացեք սիմվոլիկ պորտալ (`ln -s`) դեպի հում տվյալները, կառուցեք `dispatch/archive` հանգույցը, պատճենեք `.cfg` ֆայլերը պորտալի միջով, ստեղծեք hard link միջուկի վրա, ապա կրկնակի `grep` pipeline-ով մաքրեք երկու հոսքերը և հաշվեք արդյունքը։",
    ],
    concepts: [
      { term: "Symlink + Wildcard", text: "Սիմվոլիկ պորտալի միջով կարելի է կիրառել wildcard պատճենում, օրինակ՝ `cp portal/*.cfg dest/`։" },
      { term: "grep A file | grep -v B", text: "Ընտրում է A տողերը, ապա հեռացնում է B պարունակող խոտանները՝ նախքան ֆայլում գրելը։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("cp", "Պատճենել պորտալի միջով։"),
            A("portal/*.cfg", "Symlink-ի ներսում գտնվող բոլոր .cfg ֆայլերը։"),
            A("vault/cfg/", "Նպատակակետ սենյակը։"),
          ],
          effect: "Shell-ը բացում է պորտալի միջով երևացող .cfg ֆայլերը և պատճենում դրանք vault/cfg/։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("grep", "Առաջին ֆիլտր։"),
            A("FLOW", "Պահել FLOW տողերը։"),
            A("portal/in.log", "Ֆայլը պորտալի ներսում։"),
            O("|", "Pipe։"),
            C("grep", "Երկրորդ ֆիլտր։"),
            F("-v", "Բացառել ERR։"),
            A("ERR", "Հեռացվող բառը։"),
            O(">", "Գրել ֆայլում։"),
            A("clean.log", "Մաքուր հոսքը։"),
          ],
          effect: "Մաքուր FLOW տողերը (առանց ERR-ի) գրվում են clean.log-ում։",
          out: ["(գրվեց clean.log-ում)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("refinery/deep_storage/core.dat"), "REFINERY-CORE-SEED-02\n");
      writeFile(fs, h("refinery/deep_storage/telemetry/raw/bus_a.cfg"), "BUS_A=ENABLED\n");
      writeFile(fs, h("refinery/deep_storage/telemetry/raw/bus_b.cfg"), "BUS_B=ENABLED\n");
      writeFile(
        fs,
        h("refinery/deep_storage/telemetry/raw/feed_1.log"),
        "ENERGY_OK cell-1 400W\nNOISE static\nENERGY_ERR cell-2 overload\nENERGY_OK cell-3 420W\n",
      );
      writeFile(
        fs,
        h("refinery/deep_storage/telemetry/raw/feed_2.log"),
        "ENERGY_ERR cell-4 short\nENERGY_OK cell-5 410W\nNOISE drift\nENERGY_OK cell-6 430W\n",
      );
    },
    objectives: [
      {
        text: "Բացեք `raw_portal` անունով symlink դեպի `deep_storage/telemetry/raw`։",
        hint: "ln -s deep_storage/telemetry/raw raw_portal",
        check: (c) => typeAt(c.fs, h("refinery/raw_portal"), false) === "link" && typeAt(c.fs, h("refinery/raw_portal")) === "dir",
      },
      {
        text: "Կառուցեք `dispatch/archive` սենյակների շղթան և պատճենեք բոլոր `.cfg` ֆայլերը `raw_portal` պորտալից դրա ներս։",
        hint: "mkdir -p dispatch/archive && cp raw_portal/*.cfg dispatch/archive/",
        needs: [0],
        check: (c) =>
          typeAt(c.fs, h("refinery/dispatch/archive/bus_a.cfg")) === "file" &&
          typeAt(c.fs, h("refinery/dispatch/archive/bus_b.cfg")) === "file",
      },
      {
        text: "Ստեղծեք hard link `deep_storage/core.dat`-ի համար `dispatch/archive/core_link.dat` անունով։",
        hint: "ln deep_storage/core.dat dispatch/archive/core_link.dat",
        needs: [1],
        check: (c) => {
          const a = idAt(c.fs, h("refinery/deep_storage/core.dat"), false);
          const b = idAt(c.fs, h("refinery/dispatch/archive/core_link.dat"), false);
          return a != null && a === b;
        },
      },
      {
        text: "Ֆիլտրեք `ENERGY` տողերը `raw_portal/feed_1.log`-ից, բացառեք `ERR` պարունակող տողերը (`grep -v`) և արդյունքը `>`-ով գրեք `dispatch/clean_feed.log`-ում։",
        hint: "grep ENERGY raw_portal/feed_1.log | grep -v ERR > dispatch/clean_feed.log",
        needs: [0, 1],
        check: (c) =>
          read(c.fs, h("refinery/dispatch/clean_feed.log")) === "ENERGY_OK cell-1 400W\nENERGY_OK cell-3 420W\n",
      },
      {
        text: "Ավելացրեք (`>>`) `raw_portal/feed_2.log`-ի մաքուր `ENERGY` տողերը (առանց `ERR`-ի) `dispatch/clean_feed.log`-ի վերջից։",
        hint: "grep ENERGY raw_portal/feed_2.log | grep -v ERR >> dispatch/clean_feed.log",
        needs: [3],
        check: (c) =>
          read(c.fs, h("refinery/dispatch/clean_feed.log")) ===
          "ENERGY_OK cell-1 400W\nENERGY_OK cell-3 420W\nENERGY_OK cell-5 410W\nENERGY_OK cell-6 430W\n",
      },
      {
        text: "Հաշվեք `dispatch/clean_feed.log`-ի տողերի քանակը (`wc -l`) և արդյունքը պահեք `dispatch/count.txt` ֆայլում։",
        hint: "cat dispatch/clean_feed.log | wc -l > dispatch/count.txt",
        needs: [4],
        check: (c) => (read(c.fs, h("refinery/dispatch/count.txt")) ?? "").trim() === "4",
      },
    ],
    recap: [
      "Դուք համակցեցիք սիմվոլիկ պորտալները, wildcard պատճենումը, hard link-ը, երկաստիճան `grep` pipeline-ը և `>` / `>>` ուղղորդումները։",
    ],
  },
  {
    id: "2-7",
    act: 2,
    title: "Կոտրված Հղումների Վերականգնում · Գործնական սինթեզ III",
    commands: ["ls -la", "rm", "ln -s", "ln", "ls -li", "grep -v", "|", "wc -l", ">"],
    minCommands: 6,
    labs: [],
    start: h("refinery"),
    story: [
      "Երկրաշարժից հետո զտարանում մնացել է կոտրված պորտալ (`old_gate`), իսկ գործող մուտքը թաքնված է `.active_gate/conduit` սենյակում։ Հոսքակերից առաջ մենք պետք է վերականգնենք կապը և մաքրենք հոսքը։",
      "Սկանավորեք սենյակը `ls -la`-ով՝ տեսնելու կոտրված հղումը և թաքնված դուռը, հեռացրեք կոտրված `old_gate`-ը (`rm`), բացեք նոր `gate_link` պորտալ, ստեղծեք hard link բանալու վրա և `grep -v` pipeline-ով զտեք աղմուկն ու malware-ը։",
    ],
    concepts: [
      { term: "Կոտրված symlink-ի մաքրում", text: "`ls -la`-ն ցույց է տալիս ինչպես թաքնված սենյակները, այնպես էլ կոտրված պորտալները, որոնք կարելի է ջնջել `rm`-ով։" },
      { term: "Կրկնակի grep -v", text: "`grep -v NOISE file | grep -v MALWARE > clean.log` հեռացնում է երկու տեսակի անցանկալի տողերն էլ։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("ln", "Ստեղծել symlink։"),
            F("-s", "symbolic։"),
            A(".vault/room", "Թաքնված թիրախ directory-ն։"),
            A("gate_link", "Նոր պորտալի անունը։"),
          ],
          effect: "Ստեղծում է ուղիղ անցում դեպի թաքնված .vault/room սենյակը։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("grep", "Զտել աղմուկը։"),
            F("-v", "invert։"),
            A("NOISE", "Բացառել NOISE։"),
            A("gate_link/stream.log", "Ֆայլը պորտալի միջով։"),
            O("|", "Pipe։"),
            C("grep", "Զտել malware-ը։"),
            F("-v", "invert։"),
            A("MALWARE", "Բացառել MALWARE։"),
            O(">", "Պահել մաքուր ֆայլում։"),
            A("clean_stream.log", "Նպատակակետ ֆայլը։"),
          ],
          effect: "Երկու հաջորդական grep -v զտիչները թողնում են միայն մաքուր տվյալները։",
          out: ["(մաքուր տողերը գրվեցին clean_stream.log-ում)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      symlink(fs, h("refinery/old_gate"), "missing_sector/gate");
      writeFile(fs, h("refinery/.active_gate/conduit/primary.key"), "CONDUIT-KEY-882\n");
      writeFile(
        fs,
        h("refinery/.active_gate/conduit/stream.log"),
        "SIGNAL sync-01 stable\nNOISE static\nMALWARE spy.bin\nSIGNAL sync-02 stable\nNOISE hum\nSIGNAL sync-03 stable\n",
      );
    },
    objectives: [
      {
        text: "Սկանավորեք զտարանը `ls -la`-ով՝ տեսնելու կոտրված `old_gate` հղումը և թաքնված `.active_gate` սենյակը։",
        hint: "ls -la",
        check: (c) => ran(c, "ls", (e) => e.flags.includes("a") || e.flags.includes("A")),
      },
      {
        text: "Հեռացրեք կոտրված `old_gate` պորտալը։",
        hint: "rm old_gate",
        check: (c) => typeAt(c.fs, h("refinery/old_gate"), false) == null,
      },
      {
        text: "Կառուցեք նոր `gate_link` պորտալ (symlink) դեպի `.active_gate/conduit`։",
        hint: "ln -s .active_gate/conduit gate_link",
        check: (c) => typeAt(c.fs, h("refinery/gate_link"), false) === "link" && typeAt(c.fs, h("refinery/gate_link")) === "dir",
      },
      {
        text: "Ստեղծեք hard link `gate_link/primary.key`-ի համար `backup_primary.key` անունով և ստուգեք inode-ները `ls -li`-ով։",
        hint: "ln gate_link/primary.key backup_primary.key && ls -li backup_primary.key .active_gate/conduit/primary.key",
        needs: [2],
        check: (c) => {
          const a = idAt(c.fs, h("refinery/.active_gate/conduit/primary.key"), false);
          const b = idAt(c.fs, h("refinery/backup_primary.key"), false);
          return a != null && a === b && ran(c, "ls", (e) => e.flags.includes("i"));
        },
      },
      {
        text: "Զտեք `NOISE` և `MALWARE` տողերը `gate_link/stream.log`-ից (`grep -v`) և մաքուր արդյունքը պահեք `clean_stream.log`-ում։",
        hint: "grep -v NOISE gate_link/stream.log | grep -v MALWARE > clean_stream.log",
        needs: [2],
        check: (c) =>
          read(c.fs, h("refinery/clean_stream.log")) ===
          "SIGNAL sync-01 stable\nSIGNAL sync-02 stable\nSIGNAL sync-03 stable\n",
      },
      {
        text: "Հաշվեք `clean_stream.log`-ի մաքուր տողերի քանակը (`wc -l` pipeline-ով)։",
        hint: "cat clean_stream.log | wc -l",
        needs: [4],
        check: (c) => (c.trace?.stages.length ?? 0) > 1 && stage(c, "wc")?.out[0]?.trim() === "3",
      },
    ],
    recap: [
      "Դուք վերականգնեցիք կոտրված պորտալը, ստեղծեցիք hard link, ստուգեցիք inode-ները և մաքրեցիք հոսքը կրկնակի `grep -v` pipeline-ով՝ պատրաստ լինելով Հոսքակերի դեմ մարտին։",
    ],
  },
  {
    id: "2-8",
    act: 2,
    title: "Բոս 2՝ Հոսքակեր",
    commands: ["ls -la", "ln -s", "grep", "|", ">", "rm", "rm -r"],
    minCommands: 5,
    boss: "boss-2",
    labs: [],
    start: h("refinery"),
    story: [
      "Զտարանի գլխավոր խողովակաշարը գրավել է Արար II-ի Բոսը՝ Հոսքակերը (The Stream Eater)։ Նա շրջապատված է հզոր Էներգետիկ Վահանով (`պաշտպանիչ վահան`), որը սնվում է `sludge_nest` բնից և կեղծ հոսքերից։",
      "Հոսքակերի պաշտպանիչ վահանն անջատելու համար նախ սկանավորեք սենյակը (`ls -la`), ոչնչացրեք `sludge_nest` բույնը (`rm -r`), միացրեք պահեստային փականի symlink-ը (`ln -s`) և կրկնակի `grep` pipeline-ով ուղարկեք մաքուր բանալին `shield.off` ֆայլի մեջ։ Ապա ոչնչացրեք `stream_eater.boss`-ին։",
    ],
    concepts: [
      { term: "Բոսի պաշտպանիչ վահան", text: "Հոսքակերը պաշտպանված է վահանով․ նախ կատարեք բոլոր նախնական առաջադրանքները (`rm -r`, `ln -s`, `grep | grep -v >`), որպեսզի վահանն անջատվի։" },
      { term: "grep A file | grep -v B", text: "Կրկնակի ֆիլտր․ նախ ընտրում է A պարունակող տողերը, ապա դրանցից հեռացնում B պարունակողները։" },
      { term: "... > file", text: "Pipeline-ի վերջում դրված `>`-ը պահում է վերջին հրամանի մաքուր արդյունքը ֆայլի մեջ։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("grep", "Առաջին ֆիլտր։"),
            A("TOKEN", "Պահել TOKEN տողերը։"),
            A("stream.txt", "Աղբյուր file-ը։"),
            O("|", "Pipe դեպի երկրորդ ֆիլտր։"),
            C("grep", "Երկրորդ ֆիլտր։"),
            F("-v", "Բացառել սխալ տողերը։"),
            A("BAD", " Հեռացվող բառը։"),
            O(">", "Պահպանել արդյունքը։"),
            A("gate.open", "Նպատակակետ file-ը։"),
          ],
          effect: "Առաջին grep-ը գտնում է TOKEN տողերը, երկրորդը մաքրում է BAD տողերը, և միակ մաքուր տողը գրվում է gate.open-ում։",
          out: ["(մաքուր բանալին գրվեց gate.open-ում)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(
        fs,
        h("refinery/flood.log"),
        "FLOOD_NOISE 00110011\nKEY_FRAGMENT=SHIELD-DOWN-42-ERR\nCORRUPT_WAVE ~~~\nKEY_FRAGMENT=SHIELD-DOWN-88-OK\nFLOOD_NOISE 11001100\n",
      );
      writeFile(fs, h("refinery/.backup_valve/drain.cfg"), "VALVE_STATE=OPEN\nPRESSURE=NOMINAL\n");
      writeFile(fs, h("refinery/sludge_nest/drop_1.glitch"), "SLUDGE 1\n");
      writeFile(fs, h("refinery/sludge_nest/drop_2.glitch"), "SLUDGE 2\n");
      setGlitch(fs, h("refinery/sludge_nest"), "nest");
      writeFile(fs, h("refinery/stream_eater.boss"), "BOSS_2::THE_STREAM_EATER\n");
      setGlitch(fs, h("refinery/stream_eater.boss"), "boss-2");
    },
    objectives: [
      {
        text: "Սկանավորեք զտարանը `ls -la`-ով՝ տեսնելու թաքնված `.backup_valve` սենյակը և խափանումները։",
        hint: "ls -la",
        check: (c) => ran(c, "ls", (e) => e.flags.includes("a") || e.flags.includes("A")),
      },
      {
        text: "Ոչնչացրեք տիղմի `sludge_nest` բույնը։",
        hint: "rm -r sludge_nest",
        check: (c) => countNames(c.fs, (n) => n === "sludge_nest") === 0,
      },
      {
        text: "Միացրեք դրենաժային փականը․ ստեղծեք `valve.link` անունով symlink դեպի `.backup_valve/drain.cfg`։",
        hint: "ln -s .backup_valve/drain.cfg valve.link",
        check: (c) =>
          typeAt(c.fs, h("refinery/valve.link"), false) === "link" &&
          (read(c.fs, h("refinery/valve.link")) ?? "").includes("VALVE_STATE=OPEN"),
      },
      {
        text: "Անջատեք Հոսքակերի պաշտպանիչ վահանը․ ֆիլտրեք `KEY_FRAGMENT` տողերը `flood.log`-ից, բացառեք `ERR` պարունակող տողերը (`grep -v`) և մաքուր արդյունքը `>`-ով պահեք `shield.off` ֆայլում։",
        hint: "grep KEY_FRAGMENT flood.log | grep -v ERR > shield.off",
        check: (c) => (read(c.fs, h("refinery/shield.off")) ?? "").trim() === "KEY_FRAGMENT=SHIELD-DOWN-88-OK",
      },
      {
        text: "Պաշտպանիչ վահանն անջատված է․ ոչնչացրեք Արար II-ի Բոսին՝ `stream_eater.boss`-ին։",
        hint: "rm stream_eater.boss",
        needs: [0, 1, 2, 3],
        check: (c) => countNames(c.fs, (n) => n === "stream_eater.boss") === 0,
      },
    ],
    recap: [
      "Դուք համակցեցիք `ls -la`, `rm -r`, `ln -s`, `grep`, `grep -v`, `|` և `>` գործիքները, անջատեցիք վահանը և հաղթեցիք Հոսքակերին։",
    ],
  },

  /* ===== ACT III: ՏՎՅԱԼՆԵՐԻ ԶՏԱՐԱՆԸ ===== */
  {
    id: "3-1",
    act: 3,
    title: "Ֆիլտրող մեքենաներ",
    commands: ["grep", "sort", "uniq", ">", "wc -l", "rm"],
    minCommands: 5,
    labs: [{ kind: "pipeline", stages: ["grep", "grepv", "sort", "uniqc", "wc", "stderr"] }],
    start: h("refinery"),
    story: [
      "Այժմ դուք կարող եք առանձնացնել էներգիայի իմպուլսները, բայց դրանք գալիս են խառնաշփոթ վիճակում և լի են կրկնություններով, որոնք ստեղծում է `dup.glitch` խափանումը։ Շարժիչին յուրաքանչյուր իմպուլս պետք է ուղիղ մեկ անգամ։",
      "Ոչնչացրեք `dup.glitch`-ը, ապա միացրեք ևս երկու մեքենա․ `sort`-ը դասավորում է տողերն ըստ հերթականության, իսկ `uniq`-ը սեղմում է կրկնությունները։ Մի նրբություն․ uniq-ը նկատում է միայն իրար անմիջապես կողքի գտնվող կրկնությունները։ Այնպես որ նախ sort արեք։",
    ],
    concepts: [
      { term: "sort", text: "Կարդում է ամբողջ input-ը, ապա դուրս է բերում տողերն այբբենական կարգով։" },
      { term: "uniq", text: "Միավորում է հարևան նույնական տողերը։ Այդ պատճառով այն սովորաբար հաջորդում է sort-ին։" },
      { term: "A | B | C > file", text: "Շղթայեք այնքան մեքենա, որքան ցանկանում եք, ապա վերջնական output-ը լցրեք ռեզերվուարի մեջ (օրինակ՝ `> pure.log`)։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("grep", "Մեքենա 1․ պահել SIGNAL տողերը։"),
            A("SIGNAL", "PATTERN։"),
            A("antenna.log", "FILE։"),
            O("|", "Pipe դեպի հաջորդ մեքենան։"),
            C("sort", "Մեքենա 2․ դասավորել տողերն ըստ հերթականության։"),
          ],
          effect: "Տողերը դասավորվում են այբբենական կարգով, և այժմ կրկնօրինակները կողք կողքի են։",
          out: ["SIGNAL ch-1", "SIGNAL ch-1", "SIGNAL ch-2", "SIGNAL ch-2", "SIGNAL ch-3"],
        },
        {
          tokens: [
            C("grep", "Մեքենա 1։"),
            A("SIGNAL", "PATTERN։"),
            A("antenna.log", "FILE։"),
            O("|", "Pipe։"),
            C("sort", "Մեքենա 2։"),
            O("|", "Pipe։"),
            C("uniq", "Մեքենա 3․ միավորել հարևան կրկնօրինակները։"),
          ],
          effect: "Մուտքում՝ 5 տող, ելքում՝ 3 տող։ Առանց առջևում sort-ի, uniq-ը բաց կթողներ կրկնությունները, քանի որ դրանք հարևան չէին։",
          out: ["SIGNAL ch-1", "SIGNAL ch-2", "SIGNAL ch-3"],
        },
        {
          tokens: [
            C("grep", "Մեքենա 1։"),
            A("SIGNAL", "PATTERN։"),
            A("antenna.log", "FILE։"),
            O("|", "Pipe։"),
            C("sort", "Մեքենա 2։"),
            O("|", "Pipe։"),
            C("uniq", "Մեքենա 3։"),
            O(">", "ՎԵՐՋԻՆ մեքենայի output-ը redirect անել file-ի մեջ։"),
            A("pure.log", "Լցվող ռեզերվուարը։"),
          ],
          effect: "Redirect-ը պատկանում է միայն վերջնական command-ին։ Մինչ այդ եղած ամեն ինչ դեռ հոսում է pipes-ի միջով։",
          out: ["(էկրանին ոչինչ չկա․ 3 տողերն այժմ pure.log-ում են)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("refinery/reactor.log"), LOG);
      writeFile(fs, h("refinery/dup.glitch"), "DUPLICATOR_GLITCH::ECHO\n");
      setGlitch(fs, h("refinery/dup.glitch"), "single");
    },
    objectives: [
      {
        text: "Ոչնչացրեք կրկնօրինակումներ առաջացնող `dup.glitch` խափանումը։",
        hint: "rm dup.glitch",
        check: (c) => countNames(c.fs, (n) => n === "dup.glitch") === 0,
      },
      {
        text: "Առանձնացրեք `ENERGY` տողերը `reactor.log`-ից և pipe արեք դրանք `sort`-ի միջով։",
        hint: "grep ENERGY reactor.log | sort",
        check: (c) => same(stage(c, "sort")?.out, ENERGY_SORTED),
      },
      {
        text: "sort-ից հետո ավելացրեք `uniq` մեքենան՝ կրկնությունները սեղմելու համար։",
        hint: "grep ENERGY reactor.log | sort | uniq",
        check: (c) => same(stage(c, "uniq")?.out, ENERGY_UNIQ),
      },
      {
        text: "Գործարկեք նույն pipeline-ը, բայց արդյունքը լցրեք `clean.log` անունով ռեզերվուարի մեջ։",
        hint: "grep ENERGY reactor.log | sort | uniq > clean.log",
        check: (c) => read(c.fs, h("refinery/clean.log")) === ENERGY_UNIQ.join("\n") + "\n",
      },
      {
        text: "Ստուգեք ռեզերվուարը․ հաշվեք տողերը `clean.log`-ում։",
        hint: "wc -l clean.log",
        needs: [3],
        check: (c) => ran(c, "wc", (e) => (e.out[0] ?? "").trim().startsWith("3")),
      },
    ],
    recap: [
      "`sort`-ը դասավորում է տողերը, `uniq`-ը միավորում է հարևան կրկնօրինակները, ուստի sort-ը գրվում է առաջինը։",
      "Pipeline-ը կարող է ավարտվել `>`-ով՝ իր վերջնական output-ը file-ում պահելու համար։",
    ],
  },
  {
    id: "3-2",
    act: 3,
    title: "Վերականգնել միջուկը",
    commands: ["cat", "grep", ">", ">>", "wc -l", "mkdir -p", "cp", "rm -r"],
    minCommands: 6,
    labs: [],
    start: h("refinery"),
    story: [
      "Երկու էներգետիկ հոսքեր սնուցում են գլխավոր շարժիչը, և երկուսն էլ վարակված են malware-ով, որը տարածվում է `corrupt_nest` բնից։ Շարժիչի ռեզերվուարը (`engine.tank`) լի է վնասված տիղմով։",
      "Ոչնչացրեք բույնը `rm -r`-ով, լվացեք ռեզերվուարը և լցրեք այն A հոսքից (`>`), ապա լրացրեք B հոսքից (`>>`) և պահուստավորեք մաքուր ռեզերվուարը `backup/` սենյակում։",
    ],
    concepts: [
      { term: "cmd > reserve.dat", text: "Դատարկում է ռեզերվուարը, ապա լցնում այն։ Օգտագործեք առաջին լցման համար։" },
      { term: "cmd >> reserve.dat", text: "Լցնում է ընթացիկ մակարդակի վրայից։ Օգտագործեք հաջորդ բոլոր լցումների համար։" },
      { term: "Իրադարձությունների կարգը", text: "`>`-ի դեպքում shell-ը դատարկում է file-ը նախքան command-ի գործարկվելը։" },
    ],
    diagram: { kind: "tank" },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("refinery/stream_a.log"), STREAM_A.join("\n") + "\n");
      writeFile(fs, h("refinery/stream_b.log"), STREAM_B.join("\n") + "\n");
      writeFile(fs, h("refinery/engine.tank"), "CORRUPTED sludge\nCORRUPTED sludge\nMALWARE residue\n");
      writeFile(fs, h("refinery/corrupt_nest/slime_1.glitch"), "SLIME 1\n");
      writeFile(fs, h("refinery/corrupt_nest/slime_2.glitch"), "SLIME 2\n");
      setGlitch(fs, h("refinery/corrupt_nest"), "nest");
    },
    objectives: [
      {
        text: "Ոչնչացրեք ռեզերվուարը թունավորող `corrupt_nest` բույնը։",
        hint: "rm -r corrupt_nest",
        check: (c) => countNames(c.fs, (n) => n === "corrupt_nest") === 0,
      },
      { text: "Նայեք `engine.tank`-ի ներսը `cat`-ով։", hint: "cat engine.tank", check: (c) => ran(c, "cat") },
      {
        text: "Մաքրեք տիղմը և լցրեք ռեզերվուարը միայն `stream_a.log`-ի `ENERGY` տողերով։",
        hint: "grep ENERGY stream_a.log > engine.tank",
        check: (c) => {
          const t = tankLines(c);
          return t.length > 0 && t.every((l) => l.startsWith("ENERGY"));
        },
      },
      {
        text: "Լրացրեք այն `stream_b.log`-ի `ENERGY` տողերով՝ առանց դատարկելու այն, ինչ արդեն կար այնտեղ։",
        hint: "grep ENERGY stream_b.log >> engine.tank",
        needs: [2],
        check: (c) => c.trace?.sink?.op === ">>" && same(tankLines(c).sort(), CLEAN_ALL),
      },
      {
        text: "Վերջնական ստուգում․ շարժիչին անհրաժեշտ է ուղիղ 7 մաքուր տող։ Հաշվեք դրանք `wc -l`-ով։",
        hint: "wc -l engine.tank",
        needs: [3],
        check: (c) => ran(c, "wc", (e) => (e.out[0] ?? "").trim().startsWith("7")) && same(tankLines(c).sort(), CLEAN_ALL),
      },
      {
        text: "Ստեղծեք `backup` սենյակը և պատճենեք մաքուր `engine.tank`-ը դրա ներս։",
        hint: "mkdir -p backup && cp engine.tank backup/",
        needs: [3],
        check: (c) =>
          same(
            (read(c.fs, h("refinery/backup/engine.tank")) ?? "").split("\n").filter(Boolean).sort(),
            CLEAN_ALL,
          ),
      },
    ],
    recap: [
      "`>`-ը փոխարինում է file-ի պարունակությունը, `>>`-ն ավելացնում է դրան։",
      "Pipes-ը, redirects-ը և պահուստավորման հրամանները (`mkdir -p`, `cp`) համակցվում են մաքուր տվյալները պաշտպանելու համար։",
    ],
  },
  {
    id: "3-3",
    act: 3,
    title: "Գլուխն ու Պոչը",
    commands: ["head -n", "tail -n", "|", ">", "rm"],
    minCommands: 5,
    labs: [{ kind: "headtail" }],
    start: h("refinery"),
    story: [
      "Երբեմն log ֆայլերը հազարավոր տողեր ունեն, իսկ մեզ պետք է միայն ամենասկիզբը, ամենավերջը կամ կոնկրետ մեկ տող մեջտեղից։ Բայց ժամանակաչափի կողքին հայտնվել է `chrono.glitch` խափանումը։",
      "Ոչնչացրեք `chrono.glitch`-ը, ապա օգտագործեք `head -n` (հոսքի գլխամասը) և `tail -n` (պոչամասը)։ Միացրեք դրանք pipe-ով, և կկարողանաք վիրաբուժական ճշգրտությամբ հանել ցանկացած տող։",
    ],
    concepts: [
      { term: "head -n N FILE", text: "Տպում է file-ի միայն առաջին N տողերը (օրինակ՝ `head -n 3 flight.log`)։" },
      { term: "tail -n N FILE", text: "Տպում է file-ի միայն վերջին N տողերը (օրինակ՝ `tail -n 2 flight.log`)։" },
      { term: "head -n K | tail -n 1", text: "Վերցնում է առաջին K տողերը, ապա դրանցից պահում վերջինը՝ այսինքն ուղիղ K-րդ տողը։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("head", "Վերցնել սկզբի տողերը։"),
            F("-n", "Քանակի flag-ը։"),
            A("3", "Առաջին 3 տողերը։"),
            A("flight.log", "Կարդացվող file-ը։"),
          ],
          effect: "head-ը կարդում է առաջին 3 տողերը և անմիջապես կանգ առնում։",
          out: ["LINE 1: ignition", "LINE 2: liftoff", "LINE 3: orbit reached"],
        },
        {
          tokens: [
            C("head", "Վերցնել առաջին 5 տողերը։"),
            F("-n", "Քանակը։"),
            A("5", "5 տող։"),
            A("flight.log", "File-ը։"),
            O("|", "Pipe դեպի tail։"),
            C("tail", "Վերցնել վերջին տողը։"),
            F("-n", "Քանակը։"),
            A("1", "Միայն 1 տող։"),
          ],
          effect: "Առաջին 5 տողերից tail -n 1-ը պահում է միայն ամենավերջինը՝ ուղիղ 5-րդ տողը։",
          out: ["LINE 5: docking complete"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(
        fs,
        h("refinery/chrono.log"),
        "CYCLE 01: warmup 10%\nCYCLE 02: warmup 40%\nCYCLE 03: SECRET_SYNC=774\nCYCLE 04: plasma stable\nCYCLE 05: output nominal\nCYCLE 06: FINAL_LOCK=991\n",
      );
      writeFile(fs, h("refinery/chrono.glitch"), "GLITCH::TIME_DRIFT\n");
      setGlitch(fs, h("refinery/chrono.glitch"), "single");
    },
    objectives: [
      {
        text: "Ոչնչացրեք ժամանակաչափը խախտող `chrono.glitch` խափանումը։",
        hint: "rm chrono.glitch",
        check: (c) => countNames(c.fs, (n) => n === "chrono.glitch") === 0,
      },
      {
        text: "Կարդացեք `chrono.log`-ի միայն առաջին 2 տողերը `head -n 2`-ի միջոցով։",
        hint: "head -n 2 chrono.log",
        check: (c) => ran(c, "head", (e) => e.out.length === 2 && e.out[0].startsWith("CYCLE 01")),
      },
      {
        text: "Կարդացեք `chrono.log`-ի միայն ամենավերջին տողը `tail -n 1`-ի միջոցով։",
        hint: "tail -n 1 chrono.log",
        check: (c) => ran(c, "tail", (e) => e.out.length === 1 && e.out[0].includes("FINAL_LOCK=991")),
      },
      {
        text: "Քաղեք ուղիղ 3-րդ տողը (`SECRET_SYNC=774`)՝ համադրելով `head` և `tail` հրամանները pipe-ով։",
        hint: "head -n 3 chrono.log | tail -n 1",
        check: (c) => (c.trace?.stages.length ?? 0) > 1 && !!stage(c, "tail")?.out[0]?.includes("SECRET_SYNC=774"),
      },
      {
        text: "Պահպանեք այդ 3-րդ տողը `sync.key` file-ի մեջ։",
        hint: "head -n 3 chrono.log | tail -n 1 > sync.key",
        check: (c) => (read(c.fs, h("refinery/sync.key")) ?? "").trim() === "CYCLE 03: SECRET_SYNC=774",
      },
    ],
    recap: [
      "`head -n N`-ը վերցնում է առաջին N տողերը, իսկ `tail -n N`-ը՝ վերջին N տողերը։",
      "`head -n K file | tail -n 1` կառուցվածքը հանում է ուղիղ K-րդ տողը։",
    ],
  },
  {
    id: "3-4",
    act: 3,
    title: "Միջուկային Մաթեմատիկա",
    commands: ["echo $((...))", "+", "-", "*", "/", "%"],
    minCommands: 4,
    labs: [],
    start: h("refinery"),
    story: [
      "Ռեակտորի կալիբրացման մատրիցան պահանջում է ճշգրիտ թվաբանական հաշվարկներ։ Մտքում հաշվելու փոխարեն կարող եք ստիպել shell-ին հաշվել ձեր փոխարեն՝ օգտագործելով `$(( ... ))` կառուցվածքը։",
      "Այն հասկանում է գումարում (`+`), հանում (`-`), բազմապատկում (`*`), բաժանում (`/`) և բաժանման մնացորդ (`%`)։",
    ],
    concepts: [
      { term: "$(( a + b ))", text: "Bash arithmetic․ հաշվում է փակագծերի ներսում եղած արտահայտությունը և տեղադրում պատասխանը (օրինակ՝ `echo $((10 + 5))`)։" },
      { term: "* և /", text: "Բազմապատկում և ամբողջ թվերով բաժանում (օրինակ՝ `echo $((8 * 4)) > power.txt`)։" },
      { term: "% (մնացորդ)", text: "Modulo․ վերադարձնում է բաժանման մնացորդը (օրինակ՝ `$((23 % 4))`-ը հավասար է `3`-ի)։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("echo", "Տպել արդյունքը։"),
            A("$((10 + 5))", "Shell-ը նախ հաշվում է 10 + 5 = 15, ապա փոխանցում 15-ը echo-ին։"),
          ],
          effect: "echo-ն նույնիսկ չի տեսնում բանաձևը․ նա ստանում է արդեն հաշվարկված 15 թիվը։",
          out: ["15"],
        },
        {
          tokens: [
            C("echo", "Տպել արդյունքը։"),
            A("$((8 * 4))", "Բազմապատկում՝ 32։"),
            O(">", "Redirect դեպի file։"),
            A("power.txt", "Պահպանման file-ը։"),
          ],
          effect: "Հաշվարկված 32 թիվը գրվում է power.txt-ի մեջ։",
          out: ["(32-ը գրվեց power.txt-ում)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(
        fs,
        h("refinery/matrix.txt"),
        "REACTOR CALIBRATION FORMULA\n1. Voltage = 120 + 80\n2. Frequency = 15 * 6\n3. Remainder = 47 % 5\n4. Total = (200 + 90) / 10\n",
      );
    },
    objectives: [
      {
        text: "Ստուգեք գումարումը․ shell-ի թվաբանությամբ (`$((...))`) հաշվեք և տպեք `120 + 80` լարումը էկրանին։",
        hint: "echo $((120 + 80))",
        check: (c) => ran(c, "echo", (e) => e.out[0]?.trim() === "200"),
      },
      {
        text: "Հաշվեք հաճախականությունը (`15 * 6`) և `>`-ով գրեք արդյունքը `freq.cal` file-ի մեջ։",
        hint: "echo $((15 * 6)) > freq.cal",
        check: (c) => (read(c.fs, h("refinery/freq.cal")) ?? "").trim() === "90",
      },
      {
        text: "Հաշվեք բաժանման մնացորդը (`47 % 5`) և `>`-ով գրեք `mod.cal` file-ի մեջ։",
        hint: "echo $((47 % 5)) > mod.cal",
        check: (c) => (read(c.fs, h("refinery/mod.cal")) ?? "").trim() === "2",
      },
      {
        text: "Հաշվեք ընդհանուր գործակիցը՝ `(200 + 90) / 10`, և պահեք արդյունքը `total.cal` file-ի մեջ։",
        hint: "echo $(((200 + 90) / 10)) > total.cal",
        check: (c) => (read(c.fs, h("refinery/total.cal")) ?? "").trim() === "29",
      },
    ],
    recap: [
      "`$(( ... ))`-ը կատարում է ամբողջ թվերով մաթեմատիկական հաշվարկներ (`+`, `-`, `*`, `/`, `%`)։",
    ],
  },
  {
    id: "3-5",
    act: 3,
    title: "Լոգերի Անալիտիկ Կենտրոն · Գործնական սինթեզ I",
    commands: ["mkdir -p", "ln -s", "grep", "sort", "uniq", "head -n", "tail -n", "echo $((...))", ">", ">>"],
    minCommands: 6,
    labs: [],
    start: h("refinery"),
    story: [
      "Զտարանի անալիտիկ կենտրոնը պահանջում է Արար I, II և III-ի գործիքների համատեղ կիրառում՝ նախքան Անվերջ Ցիկլի արգելագոտին մտնելը։",
      "Կառուցեք `analytics/reports` սենյակը (`mkdir -p`), բացեք `latest_reports` symlink-ը (`ln -s`), բազմաստիճան pipeline-ով (`grep | sort | uniq | head -n 3 >`) առանձնացրեք առաջին 3 եզակի տագնապները, ապա `head`/`tail`-ով գտեք 4-րդ տողի բանաձևը և `$((...))`-ով ավելացրեք (`>>`) հաշվարկը զեկույցի վերջում։",
    ],
    concepts: [
      { term: "Բազմաստիճան Pipeline", text: "`grep ALERT sys.log | sort | uniq | head -n 3 > out.log` շղթան ֆիլտրում, դասավորում, մաքրում է կրկնությունները և պահում միայն առաջին 3 տողերը։" },
      { term: "Հատում + Մաթեմատիկա", text: "Օգտագործեք `head -n K file | tail -n 1`՝ K-րդ տողի բանաձևը կարդալու համար, ապա հաշվեք այն `echo $((...)) >> out.log`-ով։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("grep", "Ֆիլտրել ALERT տողերը։"),
            A("ALERT", "Նմուշը։"),
            A("sys.log", "Լոգի ֆայլը։"),
            O("|", "Pipe։"),
            C("sort", "Դասավորել։"),
            O("|", "Pipe։"),
            C("uniq", "Հեռացնել կրկնությունները։"),
            O("|", "Pipe։"),
            C("head", "Վերցնել առաջին տողերը։"),
            F("-n", "Քանակը։"),
            A("3", "3 տող։"),
            O(">", "Պահել ֆայլում։"),
            A("stats/top.log", "Նպատակակետ ֆայլը։"),
          ],
          effect: "Չորս գործիքից բաղկացած խողովակաշարը մշակում է հում լոգը և պահում 3 մաքուր տող։",
          out: ["(3 տող գրվեց stats/top.log-ում)"],
        },
        {
          tokens: [
            C("head", "Առաջին K տողերը։"),
            F("-n", "Քանակը։"),
            A("4", "4-րդ տողը հանելու համար։"),
            A("calc.dat", "Բանաձևերի ֆայլը։"),
            O("|", "Pipe։"),
            C("tail", "Պոչամասը։"),
            F("-n", "Քանակը։"),
            A("1", "Միայն 4-րդ տողը։"),
          ],
          effect: "Ցույց է տալիս ֆայլի ուղիղ 4-րդ տողում գրված հաշվարկային բանաձևը։",
          out: ["STEP 4: FORMULA = 12 * 3"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(
        fs,
        h("refinery/cluster.log"),
        "WARN sector-C overheat\nINFO normal\nWARN sector-A voltage drop\nWARN sector-C overheat\nWARN sector-B coolant leak\nWARN sector-D fan stall\nWARN sector-A voltage drop\n",
      );
      writeFile(
        fs,
        h("refinery/calibration.dat"),
        "STEP 1: 10 + 10\nSTEP 2: 20 + 5\nSTEP 3: 50 - 12\nSTEP 4: FORMULA = 14 * 5\nSTEP 5: 100 / 2\n",
      );
    },
    objectives: [
      {
        text: "Կառուցեք `analytics/reports` սենյակների շղթան։",
        hint: "mkdir -p analytics/reports",
        check: (c) => typeAt(c.fs, h("refinery/analytics/reports")) === "dir",
      },
      {
        text: "Ստեղծեք `latest_reports` symlink պորտալը դեպի `analytics/reports`։",
        hint: "ln -s analytics/reports latest_reports",
        needs: [0],
        check: (c) => typeAt(c.fs, h("refinery/latest_reports"), false) === "link" && typeAt(c.fs, h("refinery/latest_reports")) === "dir",
      },
      {
        text: "Ֆիլտրեք `WARN` տողերը `cluster.log`-ից, դասավորեք, հեռացրեք կրկնվող տողերը (`sort` և `uniq`), վերցրեք միայն առաջին 3 տողերը (`head`) և արդյունքը `>`-ով պահեք `latest_reports/top_warn.log`-ում։",
        hint: "grep WARN cluster.log | sort | uniq | head -n 3 > latest_reports/top_warn.log",
        needs: [1],
        check: (c) =>
          (read(c.fs, h("refinery/analytics/reports/top_warn.log")) ?? "").startsWith(
            "WARN sector-A voltage drop\nWARN sector-B coolant leak\nWARN sector-C overheat",
          ),
      },
      {
        text: "Գտեք և տպեք `calibration.dat`-ի ուղիղ 4-րդ տողը (`head` և `tail` pipeline-ով)՝ բանաձևը տեսնելու համար։",
        hint: "head -n 4 calibration.dat | tail -n 1",
        check: (c) => (c.trace?.stages.length ?? 0) > 1 && !!stage(c, "tail")?.out[0]?.includes("14 * 5"),
      },
      {
        text: "Հաշվեք 4-րդ տողում գտնված բանաձևի արժեքը (`$((...))`) և `>>`-ով ավելացրեք `latest_reports/top_warn.log`-ի վերջից։",
        hint: "echo $((14 * 5)) >> latest_reports/top_warn.log",
        needs: [2],
        check: (c) =>
          read(c.fs, h("refinery/analytics/reports/top_warn.log")) ===
          "WARN sector-A voltage drop\nWARN sector-B coolant leak\nWARN sector-C overheat\n70\n",
      },
    ],
    recap: [
      "Դուք միավորեցիք 4-աստիճան pipeline-ը (`grep | sort | uniq | head -n`), սիմվոլիկ պորտալը (`ln -s`), տողերի հատումը (`head | tail`) և `$((...))` մաթեմատիկան։",
    ],
  },
  {
    id: "3-6",
    act: 3,
    title: "Հաճախականության Աուդիտ · Գործնական սինթեզ II",
    commands: ["mkdir -p", "ln", "grep", ">", ">>", "sort", "uniq -c", "sort -rn", "head -n", "tail -n", "echo $((...))"],
    minCommands: 6,
    labs: [],
    start: h("refinery"),
    story: [
      "Երկու սենսորային հոսքեր (`streams/east.log` և `streams/west.log`) ուղարկում են կրկնվող ազդանշաններ։ Նախքան Անվերջ Ցիկլին դեմ առ դեմ դուրս գալը, պետք է պարզել ամենահաճախ կրկնվող խնդիրը և հաշվել կայունացման գործակիցը։",
      "Կառուցեք `audit/results` պահոցը, ստեղծեք hard link (`ln`), միավորեք երկու հոսքերի `EVENT` տողերը (`>` և `>>`), հաշվեք հաճախականությունը `sort | uniq -c | sort -rn` խողովակաշարով, առանձնացրեք ամենահաճախ տողը և ավելացրեք `$((...))` հաշվարկը։",
    ],
    concepts: [
      { term: "sort | uniq -c | sort -rn", text: "Դասական վերլուծական շղթա․ խմբավորում է կրկնությունները, հաշվում քանակը (`-c`) և դասավորում նվազման կարգով (`-rn`)։" },
      { term: "> և >> Միավորում", text: "Երկու տարբեր ֆայլերից զտված տողերը համադրվում են մեկ ֆայլում՝ սկզբում `>`, ապա `>>`։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("sort", "Դասավորել կողք կողքի։"),
            A("events.log", "Միավորված լոգը։"),
            O("|", "Pipe։"),
            C("uniq", "Հաշվել կրկնությունները։"),
            F("-c", "count․ ավելացնել հաճախականությունը։"),
            O("|", "Pipe։"),
            C("sort", "Դասավորել ըստ թվի։"),
            F("-rn", "reverse + numeric․ ամենամեծը վերևում։"),
          ],
          effect: "Ամենահաճախ հանդիպող իրադարձությունը բարձրանում է ամենաառաջին տող։",
          out: ["      3 EVENT valve jam", "      2 EVENT link drop"],
        },
        {
          tokens: [
            C("echo", "Տպել արժեքը։"),
            A("$((18 * 6 + 12))", "Արտահայտության հաշվարկ։"),
            O(">>", "Ավելացնել վերջից։"),
            A("audit/top.txt", "Արդյունքների ֆայլը։"),
          ],
          effect: "Հաշվարկված 120 թիվն ավելացվում է audit/top.txt-ի վերջում։",
          out: ["(120-ը ավելացվեց audit/top.txt-ում)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(
        fs,
        h("refinery/streams/east.log"),
        "EVENT valve jam\nINFO ok\nEVENT link drop\nEVENT valve jam\n",
      );
      writeFile(
        fs,
        h("refinery/streams/west.log"),
        "EVENT valve jam\nEVENT temp high\nNOISE hum\nEVENT link drop\n",
      );
      writeFile(
        fs,
        h("refinery/streams/params.dat"),
        "BASE_OFFSET=12\nFORMULA: 18 * 6 + 12\nLIMIT=500\n",
      );
    },
    objectives: [
      {
        text: "Կառուցեք `audit/results` պահոցը և ստեղծեք hard link `streams/east.log`-ի համար `audit/east.hard` անունով։",
        hint: "mkdir -p audit/results && ln streams/east.log audit/east.hard",
        check: (c) => {
          const a = idAt(c.fs, h("refinery/streams/east.log"), false);
          const b = idAt(c.fs, h("refinery/audit/east.hard"), false);
          return typeAt(c.fs, h("refinery/audit/results")) === "dir" && a != null && a === b;
        },
      },
      {
        text: "Միավորեք `EVENT` տողերը `audit/east.hard`-ից (`>`) և `streams/west.log`-ից (`>>`) դեպի `audit/merged.log`։",
        hint: "grep EVENT audit/east.hard > audit/merged.log && grep EVENT streams/west.log >> audit/merged.log",
        needs: [0],
        check: (c) =>
          read(c.fs, h("refinery/audit/merged.log")) ===
          "EVENT valve jam\nEVENT link drop\nEVENT valve jam\nEVENT valve jam\nEVENT temp high\nEVENT link drop\n",
      },
      {
        text: "Դասավորեք `audit/merged.log`-ի տողերը, հաշվեք յուրաքանչյուրի հաճախականությունը (`uniq -c`), դասավորեք նվազման թվային կարգով (`sort -rn`) և արդյունքը պահեք `audit/results/freq.txt`-ում։",
        hint: "sort audit/merged.log | uniq -c | sort -rn > audit/results/freq.txt",
        needs: [1],
        check: (c) => {
          const lines = (read(c.fs, h("refinery/audit/results/freq.txt")) ?? "").trim().split("\n");
          return lines.length === 3 && lines[0].trim() === "3 EVENT valve jam";
        },
      },
      {
        text: "Պահեք `audit/results/freq.txt`-ի ամենաառաջին տողը `audit/results/top.txt` ֆայլում և կարդացեք `streams/params.dat`-ի ուղիղ 2-րդ տողի բանաձևը (`head` և `tail` pipeline-ով)։",
        hint: "head -n 1 audit/results/freq.txt > audit/results/top.txt && head -n 2 streams/params.dat | tail -n 1",
        needs: [2],
        check: (c) =>
          (read(c.fs, h("refinery/audit/results/top.txt")) ?? "").trim() === "3 EVENT valve jam" &&
          ran(c, "tail", (e) => e.out.some((l) => l.includes("18 * 6 + 12"))),
      },
      {
        text: "Հաշվեք 2-րդ տողի բանաձևը (`$((...))`) և արդյունքը `>>`-ով ավելացրեք `audit/results/top.txt`-ի վերջից։",
        hint: "echo $((18 * 6 + 12)) >> audit/results/top.txt",
        needs: [3],
        check: (c) => {
          const t = read(c.fs, h("refinery/audit/results/top.txt")) ?? "";
          return t.includes("3 EVENT valve jam") && t.trim().endsWith("\n120");
        },
      },
    ],
    recap: [
      "Դուք համադրեցիք `ln`, `>`/`>>` միավորումը, `sort | uniq -c | sort -rn` հաճախականության վերլուծությունը, `head`/`tail` հատումը և `$((...))` մաթեմատիկան։",
    ],
  },
  {
    id: "3-7",
    act: 3,
    title: "Շարժիչի Հավասարակշռում · Գործնական սինթեզ III",
    commands: ["mkdir -p", "mv", "*", "ln -s", "grep -v", "sort", "uniq", "tail -n", "wc -l", "echo $((...))"],
    minCommands: 6,
    labs: [],
    start: h("refinery"),
    story: [
      "Անվերջ Ցիկլի արտաքին պահոցից առաջ հավաքվել են չմշակված `.raw` ֆայլեր։ Մենք պետք է կազմակերպենք դրանք, բացենք արագ պորտալ, մաքրենք աղմուկը, ընտրենք վերջին 2 կայուն իմպուլսները և հավասարակշռենք շարժիչը։",
      "Տեղափոխեք բոլոր `*.raw` ֆայլերը `staging/logs/` (`mkdir -p` և `mv`), ստեղծեք `latest_log` symlink, մաքրեք `NOISE` ու `DROP` տողերը, դասավորեք (`sort | uniq`), պահեք վերջին 2 տողերը (`tail`) և ավելացրեք թվաբանական հաշվարկը (`$((...))`)։",
    ],
    concepts: [
      { term: "Կազմակերպում + Զտում", text: "Նախ տեղափոխեք հում ֆայլերը կառուցված սենյակ, ապա symlink-ի միջոցով մշակեք դրանք pipeline-ով։" },
      { term: "Բարդ արտահայտություն $((...))", text: "Կլոր փակագծերով կարելի է կառավարել գործողությունների հերթականությունը, օրինակ՝ `$(((240 - 45) / 5))`։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("grep", "Հեռացնել աղմուկը։"),
            F("-v", "invert։"),
            A("NOISE", "Բացառվող բառը։"),
            A("latest_log", "Symlink-ը դեպի լոգ։"),
            O("|", "Pipe։"),
            C("sort", "Դասավորել։"),
            O("|", "Pipe։"),
            C("uniq", "Հեռացնել կրկնությունները։"),
            O(">", "Պահել մաքուր ֆայլում։"),
            A("staging/clean.txt", "Մաքուր արդյունքը։"),
          ],
          effect: "Մաքրում է աղմուկն ու կրկնությունները՝ պատրաստելով ֆայլը վերջնական հատման համար։",
          out: ["(գրվեց staging/clean.txt-ում)"],
        },
        {
          tokens: [
            C("tail", "Վերցնել վերջին տողերը։"),
            F("-n", "Քանակը։"),
            A("2", "Վերջին 2 տողերը։"),
            A("staging/clean.txt", "Մաքուր ֆայլը։"),
            O(">", "Պահել ֆայլում։"),
            A("staging/final.txt", "Վերջնական զույգը։"),
          ],
          effect: "Ընտրում է դասավորված ցուցակի վերջին 2 տողերը։",
          out: ["(2 տող գրվեց staging/final.txt-ում)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(
        fs,
        h("refinery/turbine.raw"),
        "PULSE-120 OK\nNOISE static\nPULSE-340 OK\nDROP frame\nPULSE-210 OK\nPULSE-120 OK\nPULSE-450 OK\n",
      );
      writeFile(fs, h("refinery/aux.raw"), "AUXILIARY BACKUP LOG\n");
    },
    objectives: [
      {
        text: "Կառուցեք `staging/logs` սենյակը և տեղափոխեք բոլոր `.raw` ֆայլերը դրա ներս (wildcard-ով)։",
        hint: "mkdir -p staging/logs && mv *.raw staging/logs/",
        check: (c) =>
          typeAt(c.fs, h("refinery/staging/logs/turbine.raw")) === "file" &&
          typeAt(c.fs, h("refinery/staging/logs/aux.raw")) === "file" &&
          !names(c.fs, h("refinery")).some((n) => n.endsWith(".raw")),
      },
      {
        text: "Ստեղծեք `latest_log` անունով symlink, որը ցույց է տալիս `staging/logs/turbine.raw`-ի վրա։",
        hint: "ln -s staging/logs/turbine.raw latest_log",
        needs: [0],
        check: (c) => typeAt(c.fs, h("refinery/latest_log"), false) === "link" && typeAt(c.fs, h("refinery/latest_log")) === "file",
      },
      {
        text: "Հեռացրեք `NOISE` և `DROP` տողերը `latest_log`-ից (`grep -v`), դասավորեք, մաքրեք կրկնվող տողերը (`sort` և `uniq`) և պահեք `staging/clean_pulses.txt`-ում։",
        hint: "grep -v NOISE latest_log | grep -v DROP | sort | uniq > staging/clean_pulses.txt",
        needs: [1],
        check: (c) =>
          read(c.fs, h("refinery/staging/clean_pulses.txt")) ===
          "PULSE-120 OK\nPULSE-210 OK\nPULSE-340 OK\nPULSE-450 OK\n",
      },
      {
        text: "Հաշվեք `staging/clean_pulses.txt`-ի տողերը (`wc -l`) և դրա վերջին 2 տողերը (`tail`) պահեք `staging/final_pair.txt`-ում։",
        hint: "cat staging/clean_pulses.txt | wc -l && tail -n 2 staging/clean_pulses.txt > staging/final_pair.txt",
        needs: [2],
        check: (c) =>
          read(c.fs, h("refinery/staging/final_pair.txt")) === "PULSE-340 OK\nPULSE-450 OK\n" &&
          ran(c, "wc"),
      },
      {
        text: "Հաշվեք `(240 - 45) / 5` արտահայտությունը (`$((...))`) և արդյունքը `>>`-ով ավելացրեք `staging/final_pair.txt`-ի վերջից։",
        hint: "echo $(((240 - 45) / 5)) >> staging/final_pair.txt",
        needs: [3],
        check: (c) =>
          read(c.fs, h("refinery/staging/final_pair.txt")) === "PULSE-340 OK\nPULSE-450 OK\n39\n",
      },
    ],
    recap: [
      "Դուք համադրեցիք Արար I-ի (`mkdir -p`, `mv *`), II-ի (`ln -s`, `grep -v`, `wc -l`) և III-ի (`sort | uniq`, `tail -n`, `$((...))`) գործիքները՝ պատրաստ լինելով Անվերջ Ցիկլի դեմ մարտին։",
    ],
  },
  {
    id: "3-8",
    act: 3,
    title: "Բոս 3՝ Անվերջ Ցիկլ",
    commands: ["rm -r", "grep", "sort", "uniq", "head -n", "tail -n", "echo $((...))", ">", "rm"],
    minCommands: 6,
    boss: "boss-3",
    labs: [],
    start: h("refinery"),
    story: [
      "Զտարանի ժամանակային միջուկը գերեվարել է Արար III-ի Բոսը՝ Անվերջ Ցիկլը (The Infinite Loop)։ Նրան շրջապատում է ժամանակային Էներգետիկ Վահանը (`պաշտպանիչ վահան`), որը սնվում է `loop_nest` բնից և կրկնվող ցիկլերից։",
      "Անվերջ Ցիկլի պաշտպանիչ վահանն անջատելու համար նախ ոչնչացրեք `loop_nest` բույնը (`rm -r`), մաքրեք `ITER_OK` տողերը `loop.log`-ից դեպի `stable.log` (`grep`, `sort`, `uniq`), ապա հանեք առաջին և վերջին տողերի թվերը (`head`, `tail`), բազմապատկեք դրանք `$((...))`-ով `halt.key`-ի մեջ և ոչնչացրեք `infinite_loop.boss`-ին։",
    ],
    concepts: [
      { term: "Բոսի պաշտպանիչ վահան", text: "Անվերջ Ցիկլի վահանն անջատվում է միայն բոլոր նախնական առաջադրանքները (բույնի մաքրում, լոգի զտում և արգելակման բանալու հաշվարկ) կատարելուց հետո։" },
      { term: "head -n 1 / tail -n 1", text: "Արագ ստուգում են ֆայլի առաջին և վերջին տողերը (օրինակ՝ `head -n 1 ring.log`)։" },
      { term: "echo $((A * B)) > file", text: "Հաշվում է արտադրյալը և անմիջապես գրում բանալու ֆայլի մեջ (օրինակ՝ `echo $((20 * 4)) > stop.code`)։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("head", "Կարդալ առաջին տողը։"),
            F("-n", "Քանակը։"),
            A("1", "1 տող։"),
            A("ring.log", "Լոգի ֆայլը։"),
          ],
          effect: "Բացահայտում է ցիկլի մեկնարկային թիվը։",
          out: ["START_VAL=20"],
        },
        {
          tokens: [
            C("echo", "Տպել հաշվարկը։"),
            A("$((20 * 4))", "Բազմապատկել երկու թվերը։"),
            O(">", "Պահել բանալին։"),
            A("stop.code", "Արգելակման ֆայլը։"),
          ],
          effect: "Գրում է 80 թիվը stop.code ֆայլում՝ անջատելով ցիկլի պաշտպանությունը։",
          out: ["(80-ը գրվեց stop.code-ում)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(
        fs,
        h("refinery/loop.log"),
        "ALPHA_SEED=35\nITER_OK cycle-2 stabilized\nLOOP_ERR 001 repeating\nITER_OK cycle-1 stabilized\nITER_OK cycle-2 stabilized\nOMEGA_MULT=8\n",
      );
      writeFile(fs, h("refinery/loop_nest/tick_1.glitch"), "TICK 1\n");
      writeFile(fs, h("refinery/loop_nest/tick_2.glitch"), "TICK 2\n");
      setGlitch(fs, h("refinery/loop_nest"), "nest");
      writeFile(fs, h("refinery/infinite_loop.boss"), "BOSS_3::THE_INFINITE_LOOP\n");
      setGlitch(fs, h("refinery/infinite_loop.boss"), "boss-3");
    },
    objectives: [
      {
        text: "Ոչնչացրեք ցիկլը սնուցող `loop_nest` բույնը։",
        hint: "rm -r loop_nest",
        check: (c) => countNames(c.fs, (n) => n === "loop_nest") === 0,
      },
      {
        text: "Զտեք միայն `ITER_OK` տողերը `loop.log`-ից, դասավորեք, հեռացրեք կրկնվող տողերը (`sort` և `uniq`) և արդյունքը պահեք `stable.log` ֆայլում։",
        hint: "grep ITER_OK loop.log | sort | uniq > stable.log",
        check: (c) =>
          read(c.fs, h("refinery/stable.log")) === "ITER_OK cycle-1 stabilized\nITER_OK cycle-2 stabilized\n",
      },
      {
        text: "Կարդացեք `loop.log`-ի առաջին տողը (`head`) և վերջին տողը (`tail`)՝ երկու թվերը պարզելու համար։",
        hint: "head -n 1 loop.log && tail -n 1 loop.log",
        check: (c) =>
          ran(c, "head", (e) => e.out.some((l) => l.includes("ALPHA_SEED=35"))) ||
          ran(c, "tail", (e) => e.out.some((l) => l.includes("OMEGA_MULT=8"))),
      },
      {
        text: "Անջատեք Անվերջ Ցիկլի պաշտպանիչ վահանը․ բազմապատկեք առաջին և վերջին տողերի թվերը (`$((...))`) և արդյունքը `>`-ով պահեք `halt.key` ֆայլում։",
        hint: "echo $((35 * 8)) > halt.key",
        check: (c) => (read(c.fs, h("refinery/halt.key")) ?? "").trim() === "280",
      },
      {
        text: "Պաշտպանիչ վահանն անջատված է․ ոչնչացրեք Արար III-ի Բոսին՝ `infinite_loop.boss`-ին։",
        hint: "rm infinite_loop.boss",
        needs: [0, 1, 2, 3],
        check: (c) => countNames(c.fs, (n) => n === "infinite_loop.boss") === 0,
      },
    ],
    recap: [
      "Դուք կոտրեցիք Անվերջ Ցիկլի պաշտպանիչ վահանը՝ համադրելով `rm -r`, `grep | sort | uniq`, `head`, `tail` և `$((...))` մաթեմատիկան։",
    ],
  },

  /* ===== ACT IV: ՈՒԱՅԼԴՔԱՐԴՆԵՐԻ ՈՒՐՎԱԿԱՆԸ ===== */
  {
    id: "4-1",
    act: 4,
    title: "Դիմակների վարպետը",
    commands: ["*", "?", "[abc]", "[0-9]", "rm"],
    minCommands: 5,
    labs: [{ kind: "wildcard" }],
    start: h("grid"),
    story: [
      "Բարի գալուստ Ուրվականների Ցանց (`grid`)։ Այստեղ հարյուրավոր ֆայլեր ունեն գրեթե նույնական անուններ, իսկ դրանց մեջ թաքնվել է `phantom_1.glitch` խափանումը։ Սովորական `*` աստղանիշը չափազանց կոպիտ է՝ այն կընտրի ամեն ինչ։",
      "Ճշգրիտ նշան բռնելու համար օգտագործեք `?` (ուղիղ մեկ նիշ) և `[...]` (նիշերի միջակայք կամ ցանկ) դիմակները, ապա մաքրեք խափանումը։",
    ],
    concepts: [
      { term: "?", text: "Համընկնում է ուղիղ ՄԵԿ ցանկացած նիշի (օրինակ՝ `unit_?.bin`-ը կընտրի `unit_1.bin`-ը, բայց ոչ `unit_12.bin`-ը)։" },
      { term: "[abc]", text: "Համընկնում է փակագծերի մեջ նշված նիշերից որևէ մեկին (օրինակ՝ `sec_[abc].log`)։" },
      { term: "[0-9]", text: "Համընկնում է 0-ից 9 ցանկացած մեկ թվանշանի (օրինակ՝ `chip_[0-9].rom`)։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("cp", "Պատճենել files։"),
            A("unit_?.bin", "?-ը պահանջում է ուղիղ մեկ նիշ _-ից հետո։"),
            A("vault/", "Նպատակակետ directory-ն։"),
          ],
          effect: "Shell-ը ընտրում է unit_1.bin և unit_2.bin ֆայլերը, բայց բաց է թողնում unit_99.bin-ը (որն ունի երկու նիշ)։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("mv", "Տեղափոխել files։"),
            A("sec_[abc].log", "Ընտրել միայն a, b կամ c տառով տարբերակները։"),
            A("archive/", "Նպատակակետ directory-ն։"),
          ],
          effect: "Տեղափոխում է sec_a.log, sec_b.log և sec_c.log ֆայլերը՝ չդիպչելով sec_x.log-ին։",
          out: ["(ելք չկա)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("grid/key_1.sig"), "SIG 1\n");
      writeFile(fs, h("grid/key_2.sig"), "SIG 2\n");
      writeFile(fs, h("grid/key_ab.sig"), "DECOY TWO CHARS\n");
      writeFile(fs, h("grid/node_a.dat"), "NODE A\n");
      writeFile(fs, h("grid/node_b.dat"), "NODE B\n");
      writeFile(fs, h("grid/node_c.dat"), "NODE C\n");
      writeFile(fs, h("grid/node_x.dat"), "QUARANTINE NODE X\n");
      writeFile(fs, h("grid/phantom_1.glitch"), "GLITCH::PHANTOM_SCOUT\n");
      setGlitch(fs, h("grid/phantom_1.glitch"), "single");
      mkdirp(fs, h("grid/safe"));
      mkdirp(fs, h("grid/quarantine"));
    },
    objectives: [
      {
        text: "Սկանավորեք `grid` սենյակը `ls`-ով։",
        hint: "ls",
        check: (c) => ran(c, "ls"),
      },
      {
        text: "Ոչնչացրեք `phantom_1.glitch` խափանումը։",
        hint: "rm phantom_?.glitch",
        check: (c) => countNames(c.fs, (n) => n === "phantom_1.glitch") === 0,
      },
      {
        text: "Օգտագործեք `?` wildcard-ը՝ պատճենելու (`cp`) միայն մեկ նիշ ունեցող `key_?.sig` ֆայլերը դեպի `safe/` (առանց `key_ab.sig`-ի)։",
        hint: "cp key_?.sig safe/",
        check: (c) =>
          typeAt(c.fs, h("grid/safe/key_1.sig")) === "file" &&
          typeAt(c.fs, h("grid/safe/key_2.sig")) === "file" &&
          typeAt(c.fs, h("grid/safe/key_ab.sig")) == null,
      },
      {
        text: "Օգտագործեք `[abc]` դիմակը՝ տեղափոխելու (`mv`) միայն `node_a.dat`, `node_b.dat`, `node_c.dat` ֆայլերը դեպի `safe/`։",
        hint: "mv node_[abc].dat safe/",
        check: (c) =>
          ["node_a.dat", "node_b.dat", "node_c.dat"].every((n) => typeAt(c.fs, h("grid/safe/" + n)) === "file") &&
          typeAt(c.fs, h("grid/node_x.dat")) === "file",
      },
      {
        text: "Տեղափոխեք մնացած `node_x.dat`-ը դեպի `quarantine/`։",
        hint: "mv node_x.dat quarantine/",
        check: (c) => typeAt(c.fs, h("grid/quarantine/node_x.dat")) === "file",
      },
    ],
    recap: [
      "`?`-ը փոխարինում է ուղիղ մեկ նիշի, իսկ `[abc]` և `[0-9]` դիմակները՝ կոնկրետ նիշերի խմբի։",
    ],
  },
  {
    id: "4-2",
    act: 4,
    title: "Հրաման հրամանի ներսում",
    commands: ["$(...)", "cat", "cp", "echo", "wc -l", "rm -r"],
    minCommands: 5,
    labs: [],
    start: h("grid"),
    story: [
      "Ի՞նչ անել, երբ ֆայլի անունը կամ թիվը պահված է մեկ այլ ֆայլի ներսում։ Դուք կարող եք մեկ հրաման դնել մյուսի ներսում՝ օգտագործելով `$(...)` (Command Substitution)։",
      "Նախ մաքրեք `shadow_nest` խափանումների բույնը `rm -r`-ով, ապա օգտագործեք `$(...)`՝ ցուցիչ ֆայլի միջոցով գաղտնի տվյալները կարդալու, պատճենելու և հաշվելու համար։",
    ],
    concepts: [
      { term: "$(command)", text: "Command substitution․ գործարկում է ներքին հրամանը և արդյունքը դարձնում արտաքին հրամանի argument (օրինակ՝ `cat $(cat map_ref.txt)`)։" },
      { term: '"Text $(cmd)"', text: "Կարելի է տեղադրել նաև կրկնակի չակերտների ներսում (օրինակ՝ `echo \"Total: $(wc -l sensor.txt)\" > summary.txt`)։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("cat", "Արտաքին հրամանը։"),
            A("$(cat map_ref.txt)", "Ներքին հրամանը վերադարձնում է hidden_room.dat անունը։"),
          ],
          effect: "Shell-ը նախ կատարում է cat map_ref.txt -> ստանում hidden_room.dat -> ապա կատարում cat hidden_room.dat։",
          out: ["SECRET COORDINATES: 99-ALPHA"],
        },
        {
          tokens: [
            C("echo", "Տպել տեքստ։"),
            A('"Total: $(wc -l sensor.txt)"', "Ներսի wc -l-ը հաշվում է տողերը և տեղադրում թիվը տեքստի մեջ։"),
            O(">", "Redirect։"),
            A("summary.txt", "Հաշվետվության file-ը։"),
          ],
          effect: "summary.txt-ի մեջ գրվում է պատրաստի նախադասությունը՝ հաշվարկված թվով։",
          out: ["(գրվեց summary.txt-ում)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("grid/pointer.txt"), "secret_cell.dat\n");
      writeFile(fs, h("grid/secret_cell.dat"), "CELL-CORE-ONLINE-550\n");
      writeFile(fs, h("grid/target.log"), "pulse 1\npulse 2\npulse 3\npulse 4\npulse 5\n");
      writeFile(fs, h("grid/shadow_nest/shade_1.glitch"), "SHADE 1\n");
      writeFile(fs, h("grid/shadow_nest/shade_2.glitch"), "SHADE 2\n");
      setGlitch(fs, h("grid/shadow_nest"), "nest");
    },
    objectives: [
      {
        text: "Ոչնչացրեք `shadow_nest` խափանումների բույնը։",
        hint: "rm -r shadow_nest",
        check: (c) => countNames(c.fs, (n) => n === "shadow_nest") === 0,
      },
      {
        text: "Կարդացեք `pointer.txt`-ը `cat`-ով՝ տեսնելու, թե որ file-ի վրա է այն ցույց տալիս։",
        hint: "cat pointer.txt",
        check: (c) => ran(c, "cat", (e) => e.args.some((x) => x.endsWith("pointer.txt"))),
      },
      {
        text: "Օգտագործեք `$(...)`՝ մեկ հրամանով կարդալու այն file-ը, որի անունը գրված է `pointer.txt`-ի ներսում։",
        hint: "cat $(cat pointer.txt)",
        check: (c) => ran(c, "cat", (e) => e.out.some((l) => l.includes("CELL-CORE-ONLINE-550"))),
      },
      {
        text: "Պատճենեք այդ գաղտնի file-ը `active.dat`-ի մեջ՝ օգտագործելով command substitution (`$(...)`) `pointer.txt`-ի միջոցով։",
        hint: "cp $(cat pointer.txt) active.dat",
        check: (c) => read(c.fs, h("grid/active.dat")) === "CELL-CORE-ONLINE-550\n",
      },
      {
        text: "Գրեք `target.log`-ի տողերի քանակը `report.txt`-ում՝ `Count: <թիվ>` ձևաչափով (օգտագործելով `$(...)` և `wc -l`)։",
        hint: 'echo "Count: $(wc -l target.log)" > report.txt',
        check: (c) => /^Count:\s*5\b/.test((read(c.fs, h("grid/report.txt")) ?? "").trim()),
      },
    ],
    recap: [
      "`$(...)`-ը թույլ է տալիս մեկ հրամանի ելքը դարձնել մյուս հրամանի argument։",
    ],
  },
  {
    id: "4-3",
    act: 4,
    title: "Ուրվականների Հետքով · Գործնական սինթեզ I",
    commands: ["mkdir -p", "mv", "[123]", "grep", "sort", "uniq", "tail -n", "$(...)", "cp", "ln -s"],
    minCommands: 6,
    labs: [],
    start: h("grid"),
    story: [
      "Ցանցի այս հատվածում Ուրվականը խառնել է բեկորները և թողել է բազմակի գրանցումներով քարտեզ (`grid_map.log`)։ Նախքան ավելի խորը մտնելը պետք է հավաքել ճշգրիտ բեկորները։",
      "Կիրառեք նախորդ Արարների և Արար IV-ի գործիքները․ կառուցեք `vault/clean` պահոցը (`mkdir -p`), տեղափոխեք միայն 1–3 համարների բեկորները (`mv` և `[123]` դիմակ), pipeline-ով գտեք թաքնված ֆայլի անունը, `$(...)` միջոցով պատճենեք այն պահոց և բացեք `clean_portal` symlink-ը։",
    ],
    concepts: [
      { term: "Glob + Move", text: "`mv item_[123].dat dir/` հրամանը տեղափոխում է միայն 1, 2, 3 համարներով ֆայլերը՝ թողնելով `item_9.dat`-ը։" },
      { term: "Pipeline -> $(...)", text: "Նախ pipeline-ով (`grep | sort | uniq | tail -n 1 > ref.txt`) գտեք ֆայլի անունը, ապա օգտագործեք `cp $(cat ref.txt) dest`։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("grep", "Ֆիլտրել տողերը։"),
            A("READY", "Նմուշը։"),
            A("index.log", "Լոգի ֆայլը։"),
            O("|", "Pipe։"),
            C("sort", "Դասավորել։"),
            O("|", "Pipe։"),
            C("uniq", "Մաքրել կրկնությունները։"),
            O("|", "Pipe։"),
            C("tail", "Վերցնել վերջին տողը։"),
            F("-n", "Քանակը։"),
            A("1", "1 տող։"),
            O(">", "Պահել ֆայլում։"),
            A("ref.txt", "Ցուցիչ ֆայլը։"),
          ],
          effect: "Գտնում է վերջին եզակի տողը և պահում ref.txt-ում։",
          out: ["(գրվեց ref.txt-ում)"],
        },
        {
          tokens: [
            C("cp", "Պատճենել։"),
            A("$(cat ref.txt)", "Կարդալ աղբյուրի անունը ref.txt-ից։"),
            A("safe/core.bak", "Նպատակակետ ֆայլը։"),
          ],
          effect: "Պատճենում է ref.txt-ում նշված ֆայլը դեպի safe/core.bak։",
          out: ["(ելք չկա)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("grid/shard_1.dat"), "SHARD 1 OK\n");
      writeFile(fs, h("grid/shard_2.dat"), "SHARD 2 OK\n");
      writeFile(fs, h("grid/shard_3.dat"), "SHARD 3 OK\n");
      writeFile(fs, h("grid/shard_9.dat"), "CORRUPTED SHARD 9\n");
      writeFile(
        fs,
        h("grid/grid_map.log"),
        "NOISE static\nalpha_node.cfg\nomega_core.cfg\nalpha_node.cfg\n",
      );
      writeFile(fs, h("grid/omega_core.cfg"), "OMEGA-CORE-VERIFIED-777\n");
    },
    objectives: [
      {
        text: "Կառուցեք `vault/clean` պահոցը։",
        hint: "mkdir -p vault/clean",
        check: (c) => typeAt(c.fs, h("grid/vault/clean")) === "dir",
      },
      {
        text: "Տեղափոխեք (`mv`) միայն `shard_1.dat`, `shard_2.dat`, `shard_3.dat` ֆայլերը դեպի `vault/clean/`՝ օգտագործելով `[...]` դիմակ (առանց `shard_9.dat`-ի)։",
        hint: "mv shard_[123].dat vault/clean/",
        needs: [0],
        check: (c) =>
          ["shard_1.dat", "shard_2.dat", "shard_3.dat"].every((n) => typeAt(c.fs, h("grid/vault/clean/" + n)) === "file") &&
          typeAt(c.fs, h("grid/shard_9.dat")) === "file",
      },
      {
        text: "Ֆիլտրեք `.cfg` տողերը `grid_map.log`-ից, դասավորեք, հեռացրեք կրկնությունները (`sort` և `uniq`), վերցրեք վերջին տողը (`tail`) և `>`-ով պահեք `target_name.txt`-ում։",
        hint: "grep .cfg grid_map.log | sort | uniq | tail -n 1 > target_name.txt",
        check: (c) => (read(c.fs, h("grid/target_name.txt")) ?? "").trim() === "omega_core.cfg",
      },
      {
        text: "Օգտագործեք command substitution (`$(...)`)՝ `target_name.txt`-ում գրված ֆայլը պատճենելու համար `vault/clean/core.bak` անունով։",
        hint: "cp $(cat target_name.txt) vault/clean/core.bak",
        needs: [0, 2],
        check: (c) => read(c.fs, h("grid/vault/clean/core.bak")) === "OMEGA-CORE-VERIFIED-777\n",
      },
      {
        text: "Բացեք `clean_portal` անունով symlink դեպի `vault/clean`։",
        hint: "ln -s vault/clean clean_portal",
        needs: [0],
        check: (c) => typeAt(c.fs, h("grid/clean_portal"), false) === "link" && typeAt(c.fs, h("grid/clean_portal")) === "dir",
      },
    ],
    recap: [
      "Դուք համադրեցիք glob դիմակները (`[123]`), բազմաստիճան pipeline-ը (`grep | sort | uniq | tail -n 1`), `$(...)` տեղադրումը և սիմվոլիկ պորտալը։",
    ],
  },
  {
    id: "4-4",
    act: 4,
    title: "Խաչաձև Հոսքեր և Դիմակներ · Գործնական սինթեզ II",
    commands: ["ln -s", "?", "[0-9]", "cp", "grep -v", "wc -l", "echo $((...))", ">", ">>"],
    minCommands: 5,
    labs: [],
    start: h("grid"),
    story: [
      "Ցանցի խորքում սենսորների տվյալները բաժանված են մասերի, և պետք է միավորել միայն վավեր թվային ռելեների հոսքերը՝ չդիպչելով կեղծ `relay_ab.log`-ին։",
      "Ստեղծեք symlink պորտալ դեպի հեռավոր սենսորները (`ln -s`), պատճենեք միայն թվային սենսորները `[0-9]` դիմակով, ֆիլտրեք աղմուկը `grep -v`-ով (`>` և `>>`) և ավելացրեք հաշվարկված կոդը զեկույցի մեջ։",
    ],
    concepts: [
      { term: "ln -s + Glob", text: "Symbolic link-ով կարճացրեք երկար path-ը և կիրառեք `[0-9]` դիմակը հենց պորտալի միջով։" },
      { term: "grep -v + $((...))", text: "Մաքրեք աղմուկը `>`-ով և `>>`-ով, ապա վերջում ավելացրեք ստուգիչ թվաբանական արժեքը։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("cp", "Պատճենել թվային ֆայլերը։"),
            A("hub_link/relay_[0-9].log", "Մեկ թվանշան ունեցող ֆայլերը պորտալի ներսից։"),
            A("active/", "Նպատակակետ սենյակը։"),
          ],
          effect: "Ընտրում է relay_1.log և relay_2.log՝ բաց թողնելով relay_ab.log-ը։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("grep", "Ֆիլտրել։"),
            F("-v", "Բացառել NOISE տողերը։"),
            A("NOISE", "Հեռացվող բառը։"),
            A("active/ch_1.log", "Աղբյուր ֆայլը։"),
            O(">", "Գրել ֆայլում։"),
            A("active/clean.dat", "Նպատակակետ ֆայլը։"),
          ],
          effect: "Ֆիլտրում է աղմուկը և պահում մաքուր տողերը active/clean.dat-ում։",
          out: ["(մաքուր տողերը գրվեցին active/clean.dat-ում)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(
        fs,
        h("grid/deep_sector/sensors/relay_1.log"),
        "PULSE 100 OK\nNOISE static\nPULSE 200 OK\n",
      );
      writeFile(
        fs,
        h("grid/deep_sector/sensors/relay_2.log"),
        "PULSE 300 OK\nNOISE hum\nPULSE 400 OK\n",
      );
      writeFile(fs, h("grid/deep_sector/sensors/relay_ab.log"), "DECOY SENSOR\n");
      mkdirp(fs, h("grid/active"));
    },
    objectives: [
      {
        text: "Ստեղծեք `sensors_link` անունով symbolic link դեպի `deep_sector/sensors`։",
        hint: "ln -s deep_sector/sensors sensors_link",
        check: (c) => typeAt(c.fs, h("grid/sensors_link"), false) === "link" && typeAt(c.fs, h("grid/sensors_link")) === "dir",
      },
      {
        text: "Պատճենեք (`cp`) `sensors_link/`-ից միայն մեկ թվանշան ունեցող `relay` լոգերը դեպի `active/` (օգտագործելով `[0-9]` դիմակը, առանց `relay_ab.log`-ի)։",
        hint: "cp sensors_link/relay_[0-9].log active/",
        needs: [0],
        check: (c) =>
          typeAt(c.fs, h("grid/active/relay_1.log")) === "file" &&
          typeAt(c.fs, h("grid/active/relay_2.log")) === "file" &&
          typeAt(c.fs, h("grid/active/relay_ab.log")) == null,
      },
      {
        text: "Ֆիլտրեք `NOISE` չպարունակող տողերը `active/relay_1.log`-ից (`grep -v NOISE`) և `>`-ով գրեք `active/merged.log`-ում, ապա `>>`-ով ավելացրեք `active/relay_2.log`-ի մաքուր տողերը։",
        hint: "grep -v NOISE active/relay_1.log > active/merged.log && grep -v NOISE active/relay_2.log >> active/merged.log",
        needs: [1],
        check: (c) =>
          read(c.fs, h("grid/active/merged.log")) === "PULSE 100 OK\nPULSE 200 OK\nPULSE 300 OK\nPULSE 400 OK\n",
      },
      {
        text: "Հաշվեք `active/merged.log`-ի մաքուր տողերի քանակը (`wc -l` pipeline-ով) և ավելացրեք (`>>`) `4 * 25` արժեքը (`$((...))`) `active/merged.log`-ի վերջից։",
        hint: "cat active/merged.log | wc -l && echo $((4 * 25)) >> active/merged.log",
        needs: [2],
        check: (c) =>
          read(c.fs, h("grid/active/merged.log")) === "PULSE 100 OK\nPULSE 200 OK\nPULSE 300 OK\nPULSE 400 OK\n100\n",
      },
    ],
    recap: [
      "Դուք համադրեցիք `ln -s`, `[0-9]` դիմակը, `grep -v`, `>`, `>>`, `wc -l` և `$((...))` գործիքները։",
    ],
  },
  {
    id: "4-5",
    act: 4,
    title: "Դիմակավորված Զտում · Գործնական սինթեզ III",
    commands: ["mkdir -p", "mv", "[ab]", "[0-9]", "?", "grep", "sort", "uniq", "head -n", "ln", "$(...)", "echo $((...))"],
    minCommands: 6,
    labs: [],
    start: h("grid"),
    story: [
      "Ուայլդքարդ Ուրվականի գլխավոր որջից առաջ պետք է փակել պաշտպանական պարագիծը․ տեղափոխել միայն ճիշտ հանգույցները (`node_a1.dat`, `node_a2.dat`, `node_b1.dat`), գտնել գաղտնի բանալու ուղին `manifest.idx`-ից և միացնել բազմաֆայլ տելեմետրիան։",
      "Կառուցեք `perimeter/locked` պահոցը (`mkdir -p`), տեղափոխեք հանգույցները համակցված `[...]` դիմակով (`mv`), pipeline-ով գտեք բանալու անունը, hard link արեք `$(...)`-ով, զտեք միայն թվային `telemetry` լոգերը և ավելացրեք թվաբանական հաշվարկը (`$((...))`)։",
    ],
    concepts: [
      { term: "Համակցված Դիմակներ", text: "`node_[ab][12].dat` նշանակում է՝ առաջին նիշը `a` կամ `b`, երկրորդը՝ `1` կամ `2`։ Այն չի դիպչի `node_x9.dat`-ին կամ `node_zz.dat`-ին։" },
      { term: "cat file_[0-9].log | grep ...", text: "Կարող եք wildcard-ով միացնել մի քանի ֆայլ `cat`-ով, ապա ֆիլտրել, դասավորել և մաքրել կրկնությունները մեկ pipeline-ում։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("mv", "Տեղափոխել ճշգրիտ դիմակով։"),
            A("node_[ab][12].dat", "Համակցված դիմակ՝ [ab] ապա [12]։"),
            A("perimeter/locked/", "Նպատակակետ պահոցը։"),
          ],
          effect: "Ընտրում է միայն a/b և 1/2 համադրությունները՝ շրջանցելով կեղծ ֆայլերը։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("ln", "Ստեղծել hard link։"),
            A("$(cat key_path.txt)", "Կարդալ բանալու ֆայլի անունը։"),
            A("perimeter/locked/anchor.key", "Նոր պիտակը պահոցում։"),
          ],
          effect: "Ներքին cat-ը տալիս է ֆայլի անունը, և ln-ը կապում է այն նույն inode-ին։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("cat", "Միավորել ֆայլերը։"),
            A("telemetry_[0-9].log", "Թվային լոգերը։"),
            O("|", "Pipe։"),
            C("grep", "Զտել։"),
            A("OK", "Պահել OK տողերը։"),
            O("|", "Pipe։"),
            C("sort", "Դասավորել։"),
            O("|", "Pipe։"),
            C("uniq", "Հեռացնել կրկնությունները։"),
          ],
          effect: "Բոլոր թվային լոգերից ստանում է եզակի OK ազդանշանների դասավորված ցուցակ։",
          out: ["OK pulse-1", "OK pulse-2"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("grid/node_a1.dat"), "NODE A1 READY\n");
      writeFile(fs, h("grid/node_a2.dat"), "NODE A2 READY\n");
      writeFile(fs, h("grid/node_b1.dat"), "NODE B1 READY\n");
      writeFile(fs, h("grid/node_x9.dat"), "DECOY X9\n");
      writeFile(fs, h("grid/node_zz.dat"), "DECOY ZZ\n");
      writeFile(fs, h("grid/manifest.idx"), "old_entry.bak\nvault_seed.key\nalpha_seed.key\nvault_seed.key\n");
      writeFile(fs, h("grid/alpha_seed.key"), "SEED-ALPHA-96\n");
      writeFile(fs, h("grid/vault_seed.key"), "SEED-VAULT-99\n");
      writeFile(fs, h("grid/telemetry_1.log"), "OK beacon-B\nERR noise\nOK beacon-A\n");
      writeFile(fs, h("grid/telemetry_2.log"), "OK beacon-A\nERR timeout\nOK beacon-C\n");
      writeFile(fs, h("grid/telemetry_bad.log"), "OK decoy-should-not-match\n");
    },
    objectives: [
      {
        text: "Կառուցեք `perimeter/locked` պահոցը։",
        hint: "mkdir -p perimeter/locked",
        check: (c) => typeAt(c.fs, h("grid/perimeter/locked")) === "dir",
      },
      {
        text: "Տեղափոխեք միայն `node_a1.dat`, `node_a2.dat`, `node_b1.dat` ֆայլերը `perimeter/locked/`՝ օգտագործելով համակցված `[...]` դիմակ (չդիպչելով `node_x9.dat` և `node_zz.dat`)։",
        hint: "mv node_[ab][12].dat perimeter/locked/",
        needs: [0],
        check: (c) =>
          ["node_a1.dat", "node_a2.dat", "node_b1.dat"].every((n) => typeAt(c.fs, h("grid/perimeter/locked/" + n)) === "file") &&
          typeAt(c.fs, h("grid/node_x9.dat")) === "file" &&
          typeAt(c.fs, h("grid/node_zz.dat")) === "file",
      },
      {
        text: "Ֆիլտրեք `.key` տողերը `manifest.idx`-ից, դասավորեք, հեռացրեք կրկնությունները (`sort` և `uniq`), վերցրեք առաջինը (`head`) և արդյունքը `>`-ով պահեք `key_path.txt`-ում։",
        hint: "grep .key manifest.idx | sort | uniq | head -n 1 > key_path.txt",
        check: (c) => (read(c.fs, h("grid/key_path.txt")) ?? "").trim() === "alpha_seed.key",
      },
      {
        text: "Ստեղծեք hard link `key_path.txt`-ում գրված ֆայլի վրա (`$(...)`) `perimeter/locked/anchor.key` անունով։",
        hint: "ln $(cat key_path.txt) perimeter/locked/anchor.key",
        needs: [0, 2],
        check: (c) => {
          const a = idAt(c.fs, h("grid/alpha_seed.key"), false);
          const b = idAt(c.fs, h("grid/perimeter/locked/anchor.key"), false);
          return a != null && a === b;
        },
      },
      {
        text: "Միավորեք միայն թվային `telemetry` լոգերը (`[0-9]` դիմակով), զտեք `OK` տողերը, դասավորեք ու մաքրեք կրկնությունները դեպի `perimeter/clean_ok.log`, ապա `>>`-ով ավելացրեք `32 * 3` հաշվարկի արժեքը (`$((...))`)։",
        hint: "cat telemetry_[0-9].log | grep OK | sort | uniq > perimeter/clean_ok.log && echo $((32 * 3)) >> perimeter/clean_ok.log",
        needs: [0],
        check: (c) =>
          read(c.fs, h("grid/perimeter/clean_ok.log")) === "OK beacon-A\nOK beacon-B\nOK beacon-C\n96\n",
      },
    ],
    recap: [
      "Դուք համադրեցիք համակցված glob դիմակները (`[ab][12]`, `[0-9]`), pipeline-ով գտնված անվան `ln $(cat ...)` կապումը և `$((...))` մաթեմատիկան։",
    ],
  },
  {
    id: "4-6",
    act: 4,
    title: "Բոս 4՝ Ուայլդքարդ Ուրվական",
    commands: ["ls -la", "mkdir -p", "cp", "rm -r", "rm", "[0-9]", "head -n", "tail -n", ">", "$(...)"],
    minCommands: 6,
    boss: "boss-4",
    labs: [],
    start: h("grid"),
    story: [
      "Արար IV-ի Բոսը՝ Ուայլդքարդ Ուրվականը (The Wildcard Phantom), պաշտպանված է Իլյուզիոն Էներգետիկ Վահանով (`պաշտպանիչ վահան`), շրջապատված է `phantom_nest` բնով և կեղծ կլոններով (`clone_1.tmp`, `clone_2.tmp`, `clone_3.tmp`), իսկ կողքին դրված է կենսական նշանակության `core_1.sys` համակարգային ֆայլը։",
      "Եթե օգտագործեք անզգույշ `rm *1*`, կոչնչացնեք համակարգի միջուկը։ Նախ պահուստավորեք `core_1.sys`-ը `backup/` սենյակում (`mkdir -p` և `cp`), ոչնչացրեք `phantom_nest` բույնը (`rm -r`), մաքրեք կլոնները ճշգրիտ `[0-9]` դիմակով և `.oracle.log`-ի 2-րդ տողից հանեք Բոսի իրական անունը `true_name.txt`-ի մեջ (`head` և `tail`)՝ վահանն անջատելու համար։ Ապա հարվածեք `$(...)` միջոցով։",
    ],
    concepts: [
      { term: "Բոսի պաշտպանիչ վահան", text: "Ուայլդքարդ Ուրվականի վահանն անջատվում է միայն բոլոր նախնական առաջադրանքները կատարելուց հետո։" },
      { term: "rm decoy_[0-9].bak", text: "Ճշգրիտ թվային դիմակով ջնջում է միայն կեղծ ֆայլերը՝ չդիպչելով համակարգային ֆայլերին։" },
      { term: "rm $(cat hint.txt)", text: "Կարդում է իրական թիրախի անունը հուշման ֆայլից և փոխանցում այն rm-ին։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("rm", "Ջնջել կեղծիքները։"),
            A("decoy_[0-9].bak", "Միայն մեկ թվանշան ունեցող .bak ֆայլերը։"),
          ],
          effect: "Ջնջում է decoy_1.bak, decoy_2.bak ֆայլերը՝ անվնաս թողնելով բոլոր .sys ֆայլերը։",
          out: ["(կլոնները մաքրվեցին)"],
        },
        {
          tokens: [
            C("rm", "Հարվածել իրական բոսին։"),
            A("$(cat hint.txt)", "Ներսի cat-ը վերադարձնում է իրական բոսի ֆայլի անունը։"),
          ],
          effect: "Սկսում է մարտը իրական բոսի դեմ, երբ պաշտպանիչ վահանն անջատված է։",
          out: ["(մարտը սկսվում է)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("grid/clone_1.tmp"), "PHANTOM DECOY 1\n");
      writeFile(fs, h("grid/clone_2.tmp"), "PHANTOM DECOY 2\n");
      writeFile(fs, h("grid/clone_3.tmp"), "PHANTOM DECOY 3\n");
      writeFile(fs, h("grid/core_1.sys"), "CRITICAL SYSTEM KERNEL - DO NOT DELETE\n");
      writeFile(fs, h("grid/.oracle.log"), "DECOY_NAME=clone_1.tmp\nboss_real.sys\nDECOY_NAME=clone_3.tmp\n");
      writeFile(fs, h("grid/phantom_nest/wisp_1.glitch"), "WISP 1\n");
      writeFile(fs, h("grid/phantom_nest/wisp_2.glitch"), "WISP 2\n");
      setGlitch(fs, h("grid/phantom_nest"), "nest");
      writeFile(fs, h("grid/boss_real.sys"), "BOSS_4::THE_WILDCARD_PHANTOM\n");
      setGlitch(fs, h("grid/boss_real.sys"), "boss-4");
    },
    objectives: [
      {
        text: "Սկանավորեք սենյակը `ls -la`-ով, ստեղծեք `backup` սենյակը և պատճենեք `core_1.sys`-ը դրա ներս։",
        hint: "ls -la && mkdir -p backup && cp core_1.sys backup/",
        check: (c) =>
          read(c.fs, h("grid/backup/core_1.sys")) === "CRITICAL SYSTEM KERNEL - DO NOT DELETE\n",
      },
      {
        text: "Ոչնչացրեք Ուրվականի `phantom_nest` բույնը։",
        hint: "rm -r phantom_nest",
        check: (c) => countNames(c.fs, (n) => n === "phantom_nest") === 0,
      },
      {
        text: "Մաքրեք միայն կեղծ կլոնները (`clone_1.tmp`, `clone_2.tmp`, `clone_3.tmp`)՝ օգտագործելով `[0-9]` դիմակը (առանց `core_1.sys`-ին դիպչելու)։",
        hint: "rm clone_[0-9].tmp",
        check: (c) => countNames(c.fs, (n) => /^clone_\d\.tmp$/.test(n)) === 0,
      },
      {
        text: "Անջատեք Ուրվականի պաշտպանիչ վահանը․ հանեք `.oracle.log`-ի ուղիղ 2-րդ տողը (`head` և `tail` pipeline-ով) և `>`-ով գրեք `true_name.txt`-ում։",
        hint: "head -n 2 .oracle.log | tail -n 1 > true_name.txt",
        check: (c) => (read(c.fs, h("grid/true_name.txt")) ?? "").trim() === "boss_real.sys",
      },
      {
        text: "Պաշտպանիչ վահանն անջատված է․ ոչնչացրեք Ուայլդքարդ Ուրվականին՝ `true_name.txt`-ում նշված թիրախին (`$(...)`-ով)։",
        hint: "rm $(cat true_name.txt)",
        needs: [0, 1, 2, 3],
        check: (c) => countNames(c.fs, (n) => n === "boss_real.sys") === 0,
      },
    ],
    guards: [
      {
        text: "Պահպանեք `core_1.sys` համակարգային ֆայլը անվնաս։",
        check: (c) => countNames(c.fs, (n) => n === "core_1.sys") > 0,
      },
    ],
    recap: [
      "Դուք վարպետորեն կիրառեցիք glob դիմակները, `head | tail` խողովակաշարը և `$(...)` կառուցվածքը, անջատեցիք վահանը և պարտության մատնեցիք Ուայլդքարդ Ուրվականին։",
    ],
  },

  /* ===== ACT V: ԱՐՄԱՏԱԿԱՆ ՏԻՐՈՒՅԹ (ROOT) ===== */
  {
    id: "5-1",
    act: 5,
    title: "Երեք պահապանները (u, g, o)",
    commands: ["ls -l", "chmod u+x", "chmod g-w", "chmod o=r", "rm"],
    minCommands: 5,
    labs: [{ kind: "permissions", showUmask: false, showChown: false, showSudo: false }],
    start: h("citadel"),
    story: [
      "Դուք հասաք Միջնաբերդ (`citadel`)՝ Արմատական Տիրույթի շեմին, որտեղ ներխուժել է `breach.glitch` խափանումը։ Այստեղ յուրաքանչյուր file ունի պաշտպանության երեք օղակ՝ Տեր (`u` — user/owner), Խումբ (`g` — group) և Մյուսներ (`o` — others)։",
      "`ls -l`-ի սկզբում գրված 9 տառերը (օրինակ՝ `rwxr-xr--`) ցույց են տալիս, թե ով ունի Կարդալու (`r`), Գրելու (`w`) և Գործարկելու (`x`) իրավունք։ Մաքրեք խափանումը և կարգավորեք Միջնաբերդի պաշտպանությունը `chmod`-ով։",
    ],
    concepts: [
      { term: "u, g, o, a", text: "`u` = տեր (user), `g` = խումբ (group), `o` = մյուսներ (others), `a` = բոլորը (all)։" },
      { term: "+, -, =", text: "`+` ավելացնում է իրավունք, `-` հեռացնում է, `=` սահմանում է ճշգրիտ նշվածը։" },
      { term: "chmod u+x FILE", text: "Տիրոջը տալիս է ծրագիրը գործարկելու (`x`) իրավունք (օրինակ՝ `chmod u+x turret.sh`)։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("chmod", "Փոխել file-ի թույլտվությունները (change mode)։"),
            A("u+x", "u (տիրոջը) + (ավելացնել) x (execute/գործարկել)։"),
            A("turret.sh", "Թիրախ file-ը։"),
          ],
          effect: "-rw-r--r-- թույլտվությունը դառնում է -rwxr--r--։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("chmod", "Փոխել թույլտվությունները։"),
            A("g-w", "g (խմբից) - (հեռացնել) w (write/գրել)։"),
            A("team.txt", "Թիրախ file-ը։"),
          ],
          effect: "-rw-rw-r-- թույլտվությունը դառնում է -rw-r--r--։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("chmod", "Փոխել թույլտվությունները։"),
            A("o=r", "o (մյուսներին) = (սահմանել միայն) r (read/կարդալ)։"),
            A("banner.txt", "Թիրախ file-ը։"),
          ],
          effect: "Մյուսների բիթերը դառնում են r--։",
          out: ["(ելք չկա)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("citadel/launcher.sh"), "#!/bin/sh\necho 'Defense grid online'\n");
      chmodAt(fs, h("citadel/launcher.sh"), 0o644);
      writeFile(fs, h("citadel/shared.cfg"), "mode=cooperative\n");
      chmodAt(fs, h("citadel/shared.cfg"), 0o664);
      writeFile(fs, h("citadel/public.key"), "PUBKEY-CITADEL-01\n");
      chmodAt(fs, h("citadel/public.key"), 0o640);
      writeFile(fs, h("citadel/breach.glitch"), "GLITCH::GATE_BREACH\n");
      setGlitch(fs, h("citadel/breach.glitch"), "single");
    },
    objectives: [
      {
        text: "Ստուգեք `citadel`-ի ֆայլերի թույլտվությունները `ls -l`-ի միջոցով։",
        hint: "ls -l",
        check: (c) => ran(c, "ls", (e) => e.flags.includes("l")),
      },
      {
        text: "Ոչնչացրեք դարպասի մոտ հայտնված `breach.glitch` խափանումը։",
        hint: "rm breach.glitch",
        check: (c) => countNames(c.fs, (n) => n === "breach.glitch") === 0,
      },
      {
        text: "Տիրոջը (`u`) տվեք գործարկման (`x`) իրավունք `launcher.sh`-ի վրա (`chmod`)։",
        hint: "chmod u+x launcher.sh",
        check: (c) => ((c.fs.inodes[idAt(c.fs, h("citadel/launcher.sh")) ?? -1]?.mode ?? 0) & 0o100) !== 0,
      },
      {
        text: "Հեռացրեք խմբի (`g`) գրելու (`w`) իրավունքը `shared.cfg`-ից (`chmod`)։",
        hint: "chmod g-w shared.cfg",
        check: (c) => ((c.fs.inodes[idAt(c.fs, h("citadel/shared.cfg")) ?? -1]?.mode ?? 0) & 0o020) === 0,
      },
      {
        text: "Մյուսների (`o`) համար սահմանեք միայն կարդալու (`r`) իրավունք `public.key`-ի վրա (`chmod`)։",
        hint: "chmod o=r public.key",
        check: (c) => ((c.fs.inodes[idAt(c.fs, h("citadel/public.key")) ?? -1]?.mode ?? 0) & 0o007) === 0o004,
      },
    ],
    recap: [
      "`u` (տեր), `g` (խումբ), `o` (մյուսներ) և `r`, `w`, `x` սիմվոլիկ կոդերը թույլ են տալիս ճշգրիտ կառավարել ֆայլերի հասանելիությունը։",
    ],
  },
  {
    id: "5-2",
    act: 5,
    title: "Թվային Կոդեր և Դիմակներ",
    commands: ["chmod 755", "chmod 600", "umask", "touch", "rm -r"],
    minCommands: 5,
    labs: [{ kind: "permissions", showUmask: true, showChown: false, showSudo: false }],
    start: h("citadel"),
    story: [
      "Փորձառու Ճարտարապետները սիմվոլների փոխարեն օգտագործում են եռանիշ ութական (octal) կոդեր․ `r = 4`, `w = 2`, `x = 1`։ Գումարելով դրանք՝ ստանում ենք `7` (`rwx`), `6` (`rw-`), `5` (`r-x`), `4` (`r--`) կամ `0` (`---`)։",
      "Մաքրեք Միջնաբերդ ներթափանցած `rogue_nest` բույնը `rm -r`-ով, կարգավորեք ութական թույլտվությունները և `umask`-ով սահմանեք պաշտպանիչ դիմակ նոր ստեղծվող ֆայլերի համար։",
    ],
    concepts: [
      { term: "chmod 755 FILE", text: "7 (`4+2+1=rwx`) տիրոջը, 5 (`4+0+1=r-x`) խմբին և 5 (`r-x`) մյուսներին (օրինակ՝ `chmod 755 engine.sh`)։" },
      { term: "chmod 600 FILE", text: "6 (`4+2=rw-`) միայն տիրոջը, իսկ խմբին և մյուսներին՝ 0 (`---`) (օրինակ՝ `chmod 600 diary.txt`)։" },
      { term: "umask 077", text: "Նոր ստեղծվող ֆայլերից հանում է խմբի (7) և մյուսների (7) բոլոր իրավունքները, այնպես որ նոր ֆայլերը ստեղծվում են `600` ռեժիմով։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("chmod", "Փոխել թույլտվությունները։"),
            A("750", "7 (rwx) տիրոջը, 5 (r-x) խմբին, 0 (---) մյուսներին։"),
            A("engine.sh", "Թիրախ ծրագիրը։"),
          ],
          effect: "engine.sh-ը ստանում է -rwxr-x--- թույլտվություն։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("umask", "Սահմանել նոր ֆայլերի թույլտվությունների դիմակը։"),
            A("022", "Հանել գրելու (2) իրավունքը խմբից և մյուսներից։"),
          ],
          effect: "Նոր ստեղծվող ֆայլերը (666 & ~022 = 644) կստանան 644 (-rw-r--r--) թույլտվություն (բիթային մաքրում՝ ոչ թե հանում)։",
          out: ["(ելք չկա)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("citadel/gate_daemon.bin"), "BINARY DAEMON\n");
      chmodAt(fs, h("citadel/gate_daemon.bin"), 0o644);
      writeFile(fs, h("citadel/master_seed.key"), "TOP SECRET SEED\n");
      chmodAt(fs, h("citadel/master_seed.key"), 0o644);
      writeFile(fs, h("citadel/rogue_nest/spy_1.glitch"), "SPY 1\n");
      writeFile(fs, h("citadel/rogue_nest/spy_2.glitch"), "SPY 2\n");
      setGlitch(fs, h("citadel/rogue_nest"), "nest");
    },
    objectives: [
      {
        text: "Ոչնչացրեք լրտեսական `rogue_nest` բույնը։",
        hint: "rm -r rogue_nest",
        check: (c) => countNames(c.fs, (n) => n === "rogue_nest") === 0,
      },
      {
        text: "Սահմանեք `755` (`rwxr-xr-x`) թույլտվություն `gate_daemon.bin`-ի վրա։",
        hint: "chmod 755 gate_daemon.bin",
        check: (c) => (c.fs.inodes[idAt(c.fs, h("citadel/gate_daemon.bin")) ?? -1]?.mode ?? 0) === 0o755,
      },
      {
        text: "Փակեք `master_seed.key`-ը օտարներից՝ սահմանելով `600` (`rw-------`) թույլտվություն։",
        hint: "chmod 600 master_seed.key",
        check: (c) => (c.fs.inodes[idAt(c.fs, h("citadel/master_seed.key")) ?? -1]?.mode ?? 0) === 0o600,
      },
      {
        text: "Սահմանեք `077` պաշտպանական դիմակը (`umask`)։",
        hint: "umask 077",
        check: (c) => ran(c, "umask", (e) => e.args.includes("077") || e.args.includes("0077")),
      },
      {
        text: "Ստեղծեք `sealed.key` file-ը `touch`-ով (այն ավտոմատ կստեղծվի `600` թույլտվությամբ)։",
        hint: "touch sealed.key",
        needs: [3],
        check: (c) =>
          typeAt(c.fs, h("citadel/sealed.key")) === "file" &&
          (c.fs.inodes[idAt(c.fs, h("citadel/sealed.key")) ?? -1]?.mode ?? 0) === 0o600,
      },
    ],
    recap: [
      "Ութական կոդերը (`755`, `644`, `600`, `700`) ամենաարագ միջոցն են `chmod`-ով թույլտվություններ տալու համար։",
      "`umask`-ը վերահսկում է նոր ստեղծվող ֆայլերի սկզբնական թույլտվությունները։",
    ],
  },
  {
    id: "5-3",
    act: 5,
    title: "Արմատական Իշխանություն (sudo և chown)",
    commands: ["sudo", "chown", "chmod", "grep", "sort", "uniq", "ln -s", ">", "rm", "rm -r"],
    minCommands: 6,
    labs: [{ kind: "permissions", showUmask: true, showChown: true, showSudo: true }],
    start: h("citadel"),
    story: [
      "Արմատական տիրույթի անվտանգության մատյանը (`locked_audit.log`) գրավված է `root`-ի կողմից և ունի `000` թույլտվություն, իսկ սենյակում գործում են `root_worm.glitch`-ը և `parasite_nest` բույնը։",
      "Մաքրեք երկու խափանումները, `sudo chown` և `chmod 644` հրամաններով բացեք մատյանը, `grep | sort | uniq >` pipeline-ով առանձնացրեք եզակի `BREACH` տողերը `clean_audit.log`-ի մեջ, փակեք այն `chmod 600`-ով և ստեղծեք `audit.link` symlink-ը։",
    ],
    concepts: [
      { term: "sudo chown + chmod", text: "Երբ ֆայլը պատկանում է `root`-ին և փակ է (`000`), նախ փոխեք տիրոջը `sudo chown`-ով, ապա բացեք կարդալու իրավունքը `chmod 644`-ով։" },
      { term: "Զտում և Կողպում", text: "Կարևոր հաշվետվությունը pipeline-ով ստեղծելուց հետո պաշտպանեք այն `chmod 600`-ով։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("sudo", "Գերօգտատիրոջ իրավունք։"),
            C("chown", "Փոխել տիրոջը։"),
            A("architect:architect", "Նոր տեր և խումբ։"),
            A("sec.log", "Կողպված ֆայլը։"),
          ],
          effect: "Փոխանցում է sec.log-ի տիրապետությունը architect-ին։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("grep", "Ֆիլտրել։"),
            A("ALERT", "Նմուշը։"),
            A("sec.log", "Աղբյուրը։"),
            O("|", "Pipe։"),
            C("sort", "Դասավորել։"),
            O("|", "Pipe։"),
            C("uniq", "Մաքրել կրկնությունները։"),
            O(">", "Գրել ֆայլում։"),
            A("pure.log", "Նպատակակետ ֆայլը։"),
          ],
          effect: "Մաքրում է մատյանի տողերը և պահում pure.log-ում։",
          out: ["(գրվեց pure.log-ում)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(
        fs,
        h("citadel/locked_audit.log"),
        "BREACH gate-2 unauthorized\nINFO heartbeat ok\nBREACH gate-1 token forged\nBREACH gate-2 unauthorized\n",
      );
      chmodAt(fs, h("citadel/locked_audit.log"), 0o000);
      chownAt(fs, h("citadel/locked_audit.log"), "root", "root");
      writeFile(fs, h("citadel/root_worm.glitch"), "GLITCH::ROOT_WORM\n");
      setGlitch(fs, h("citadel/root_worm.glitch"), "single");
      writeFile(fs, h("citadel/parasite_nest/mite_1.glitch"), "MITE 1\n");
      writeFile(fs, h("citadel/parasite_nest/mite_2.glitch"), "MITE 2\n");
      setGlitch(fs, h("citadel/parasite_nest"), "nest");
    },
    objectives: [
      {
        text: "Ոչնչացրեք `root_worm.glitch`-ը։",
        hint: "rm root_worm.glitch",
        check: (c) => countNames(c.fs, (n) => n === "root_worm.glitch") === 0,
      },
      {
        text: "Ոչնչացրեք `parasite_nest` բույնը։",
        hint: "rm -r parasite_nest",
        check: (c) => countNames(c.fs, (n) => n === "parasite_nest") === 0,
      },
      {
        text: "Վերցրեք `locked_audit.log`-ի տիրապետությունը (`architect:architect`, օգտագործելով `sudo chown`) և դարձրեք այն ընթեռնելի (`644`)։",
        hint: "sudo chown architect:architect locked_audit.log && chmod 644 locked_audit.log",
        check: (c) => {
          const n = c.fs.inodes[idAt(c.fs, h("citadel/locked_audit.log"), false) ?? -1];
          return n?.owner === "architect" && (n?.mode ?? 0) === 0o644;
        },
      },
      {
        text: "Զտեք `BREACH` տողերը `locked_audit.log`-ից, դասավորեք, հեռացրեք կրկնվող տողերը (`sort` և `uniq`) և արդյունքը `>`-ով պահեք `clean_audit.log`-ում։",
        hint: "grep BREACH locked_audit.log | sort | uniq > clean_audit.log",
        needs: [2],
        check: (c) =>
          read(c.fs, h("citadel/clean_audit.log")) ===
          "BREACH gate-1 token forged\nBREACH gate-2 unauthorized\n",
      },
      {
        text: "Կողպեք `clean_audit.log`-ը օտարներից (`600`) և ստեղծեք `audit.link` symlink դեպի այն։",
        hint: "chmod 600 clean_audit.log && ln -s clean_audit.log audit.link",
        needs: [3],
        check: (c) =>
          (c.fs.inodes[idAt(c.fs, h("citadel/clean_audit.log"), false) ?? -1]?.mode ?? 0) === 0o600 &&
          typeAt(c.fs, h("citadel/audit.link"), false) === "link",
      },
    ],
    recap: [
      "Դուք համադրեցիք `sudo chown`, `chmod`, `grep | sort | uniq >`, `ln -s` և Glitch մարտերը մեկ համալիր առաջադրանքում։",
    ],
  },
  {
    id: "5-4",
    act: 5,
    title: "Արմատական Աուդիտ · Գործնական սինթեզ I",
    commands: ["sudo", "chmod", "mkdir -p", "cp", "[0-9]", "head -n", "tail -n", "$(...)", "echo $((...))", ">", ">>"],
    minCommands: 6,
    labs: [],
    start: h("citadel"),
    story: [
      "Նախքան Ռութքիթ Տիրակալի գլխավոր պահոց մտնելը, անհրաժեշտ է վերականգնել Միջնաբերդի պաշտպանական կոդերը՝ համադրելով բոլոր 5 Արարների հրամանները։",
      "Բացեք արգելափակված `.root_ptr` ցուցիչը `sudo chmod 644`-ով, կառուցեք `secure` սենյակը, `$(...)` միջոցով պատճենեք գաղտնի մատրիցան, ընտրեք միայն թվային `[0-9]` բանալիները, հաշվեք ապակոդավորման թիվը և կողպեք արդյունքը `chmod 600`-ով։",
    ],
    concepts: [
      { term: "Բոլոր 5 Արարների սինթեզ", text: "Այստեղ միավորվում են `mkdir -p`, `cp`, `[0-9]`, `$(...)`, `head | tail`, `$((...))` և `sudo chmod` հրամանները։" },
      { term: "Գաղտնի ֆայլի կողպում", text: "Հաշվարկված կոդը գրելուց հետո փակեք այն օտարներից `chmod 600`-ով։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("sudo", "Գործարկել որպես root։"),
            C("chmod", "Փոխել թույլտվությունը։"),
            A("644", "Դարձնել ընթեռնելի։"),
            A(".hint_ref", "Թաքնված ցուցիչ ֆայլը։"),
          ],
          effect: "Բացում է թաքնված ցուցիչ ֆայլի կարդալու իրավունքը։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("cp", "Պատճենել։"),
            A("$(cat .hint_ref)", "Կարդալ թիրախ ֆայլի անունը ցուցիչից։"),
            A("safe_zone/table.dat", "Նպատակակետ ֆայլը։"),
          ],
          effect: "Պատճենում է ցուցիչում նշված ֆայլը safe_zone/ սենյակ։",
          out: ["(ելք չկա)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("citadel/.root_ptr"), "cipher_matrix.dat\n");
      chmodAt(fs, h("citadel/.root_ptr"), 0o000);
      chownAt(fs, h("citadel/.root_ptr"), "root", "root");
      writeFile(
        fs,
        h("citadel/cipher_matrix.dat"),
        "ROW 1: INIT=10\nROW 2: CODE_MULT=25 * 4\nROW 3: END=99\n",
      );
      writeFile(fs, h("citadel/key_1.pem"), "PEM KEY 1\n");
      writeFile(fs, h("citadel/key_2.pem"), "PEM KEY 2\n");
      writeFile(fs, h("citadel/key_old.pem"), "EXPIRED KEY\n");
    },
    objectives: [
      {
        text: "Դարձրեք թաքնված `.root_ptr` ֆայլը ընթեռնելի (`644`, օգտագործելով `sudo`) և կառուցեք `secure` սենյակը։",
        hint: "sudo chmod 644 .root_ptr && mkdir -p secure",
        check: (c) =>
          (c.fs.inodes[idAt(c.fs, h("citadel/.root_ptr"), false) ?? -1]?.mode ?? 0) === 0o644 &&
          typeAt(c.fs, h("citadel/secure")) === "dir",
      },
      {
        text: "Օգտագործեք command substitution (`$(...)`)՝ `.root_ptr`-ում նշված գաղտնի մատրիցան պատճենելու համար որպես `secure/matrix.dat`։",
        hint: "cp $(cat .root_ptr) secure/matrix.dat",
        needs: [0],
        check: (c) =>
          (read(c.fs, h("citadel/secure/matrix.dat")) ?? "").includes("CODE_MULT=25 * 4"),
      },
      {
        text: "Պատճենեք միայն մեկ թվանշան ունեցող `key` (`.pem`) ֆայլերը `secure/` սենյակ (օգտագործելով `[0-9]` դիմակը, առանց `key_old.pem`-ի)։",
        hint: "cp key_[0-9].pem secure/",
        needs: [0],
        check: (c) =>
          typeAt(c.fs, h("citadel/secure/key_1.pem")) === "file" &&
          typeAt(c.fs, h("citadel/secure/key_2.pem")) === "file" &&
          typeAt(c.fs, h("citadel/secure/key_old.pem")) == null,
      },
      {
        text: "Հանեք `secure/matrix.dat`-ի ուղիղ 2-րդ տողը (`head` և `tail` pipeline-ով) դեպի `secure/unlock.txt`, ապա `>>`-ով ավելացրեք այդ տողում գրված `25 * 4` արտահայտության արդյունքը (`$((...))`) և կողպեք `secure/unlock.txt`-ը `600` թույլտվությամբ։",
        hint: "head -n 2 secure/matrix.dat | tail -n 1 > secure/unlock.txt && echo $((25 * 4)) >> secure/unlock.txt && chmod 600 secure/unlock.txt",
        needs: [1],
        check: (c) =>
          read(c.fs, h("citadel/secure/unlock.txt")) === "ROW 2: CODE_MULT=25 * 4\n100\n" &&
          (c.fs.inodes[idAt(c.fs, h("citadel/secure/unlock.txt"), false) ?? -1]?.mode ?? 0) === 0o600,
      },
    ],
    recap: [
      "Դուք փայլուն կերպով կիրառեցիք բոլոր 5 Արարների հրամանները մեկ միասնական օպերացիայի մեջ։",
    ],
  },
  {
    id: "5-5",
    act: 5,
    title: "Դարպասի Պաշտպանության Կոդավորում · Գործնական սինթեզ II",
    commands: ["mkdir -p", "umask", "sudo", "chown", "chmod", "[0-9]", "cp", "touch", "grep", "sort", "uniq", "ln -s"],
    minCommands: 6,
    labs: [],
    start: h("citadel"),
    story: [
      "Միջնաբերդի ավտոմատ պաշտպանական սկրիպտները (`turret_1.sh`, `turret_2.sh`) կողպված են `root`-ի կողմից (`000`), իսկ նոր տեղակայման բանալին պետք է ստեղծվի խիստ `umask 077` ռեժիմում։",
      "Կառուցեք `defense/active` սենյակը, միացրեք `umask 077`, վերցրեք թվային `turret` սկրիպտների (`[0-9]`) տիրապետությունն ու գործարկման իրավունքը (`sudo chown` և `chmod 750`), պատճենեք դրանք `defense/active/`, ստեղծեք պաշտպանված `deploy.key` և կապեք `defense/current_key` symlink-ը։",
    ],
    concepts: [
      { term: "umask 077 + touch", text: "`umask 077` սահմանելուց հետո ցանկացած նոր ստեղծվող ֆայլ (`touch`) ստանում է `600` (`rw-------`) թույլտվություն։" },
      { term: "sudo chown + [0-9] + chmod", text: "Կարելի է միանգամից կիրառել glob դիմակ (`turret_[0-9].sh`) `sudo chown`-ի և `chmod`-ի հետ։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("sudo", "Գերօգտատիրոջ իրավունք։"),
            C("chown", "Փոխել տիրոջը։"),
            A("architect:architect", "Նոր տեր և խումբ։"),
            A("unit_[0-9].sh", "Glob դիմակով ընտրված սկրիպտները։"),
          ],
          effect: "Միանգամից փոխում է unit_1.sh և unit_2.sh ֆայլերի տիրոջը՝ չդիպչելով test_x.sh-ին։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("chmod", "Սահմանել թույլտվություն։"),
            A("750", "rwxr-x--- (գործարկելի տիրոջ և խմբի համար)։"),
            A("unit_[0-9].sh", "Թիրախ սկրիպտները։"),
          ],
          effect: "Թույլ է տալիս կարդալ, պատճենել և գործարկել պաշտպանական սկրիպտները։",
          out: ["(ելք չկա)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("citadel/turret_1.sh"), "#!/bin/sh\necho TURRET_1_READY\n");
      chmodAt(fs, h("citadel/turret_1.sh"), 0o000);
      chownAt(fs, h("citadel/turret_1.sh"), "root", "root");
      writeFile(fs, h("citadel/turret_2.sh"), "#!/bin/sh\necho TURRET_2_READY\n");
      chmodAt(fs, h("citadel/turret_2.sh"), 0o000);
      chownAt(fs, h("citadel/turret_2.sh"), "root", "root");
      writeFile(fs, h("citadel/test_x.sh"), "#!/bin/sh\necho TEST_ONLY\n");
      writeFile(
        fs,
        h("citadel/citadel_events.log"),
        "DEPLOY_OK sector-B\nNOISE ping\nDEPLOY_OK sector-A\nDEPLOY_OK sector-B\n",
      );
    },
    objectives: [
      {
        text: "Կառուցեք `defense/active` սենյակը և սահմանեք `077` պաշտպանիչ դիմակը (`umask`)։",
        hint: "mkdir -p defense/active && umask 077",
        check: (c) =>
          typeAt(c.fs, h("citadel/defense/active")) === "dir" &&
          ran(c, "umask", (e) => e.args.includes("077") || e.args.includes("0077")),
      },
      {
        text: "Վերցրեք միայն թվային `turret` (`.sh`, `[0-9]` դիմակով) սկրիպտների տիրապետությունը (`architect:architect`, օգտագործելով `sudo chown`), դարձրեք դրանք `750` և պատճենեք `defense/active/`։",
        hint: "sudo chown architect:architect turret_[0-9].sh && chmod 750 turret_[0-9].sh && cp turret_[0-9].sh defense/active/",
        needs: [0],
        check: (c) =>
          typeAt(c.fs, h("citadel/defense/active/turret_1.sh")) === "file" &&
          typeAt(c.fs, h("citadel/defense/active/turret_2.sh")) === "file" &&
          typeAt(c.fs, h("citadel/defense/active/test_x.sh")) == null &&
          (c.fs.inodes[idAt(c.fs, h("citadel/turret_1.sh"), false) ?? -1]?.mode ?? 0) === 0o750,
      },
      {
        text: "Ստեղծեք դատարկ `defense/active/deploy.key` ֆայլը `touch`-ով (այն `umask 077`-ի շնորհիվ կստանա `600` թույլտվություն)։",
        hint: "touch defense/active/deploy.key",
        needs: [0],
        check: (c) =>
          typeAt(c.fs, h("citadel/defense/active/deploy.key")) === "file" &&
          (c.fs.inodes[idAt(c.fs, h("citadel/defense/active/deploy.key"), false) ?? -1]?.mode ?? 0) === 0o600,
      },
      {
        text: "Զտեք `DEPLOY_OK` տողերը `citadel_events.log`-ից, դասավորեք, հեռացրեք կրկնվող տողերը (`sort` և `uniq`) և արդյունքը `>`-ով պահեք `defense/active/deploy.key`-ում։",
        hint: "grep DEPLOY_OK citadel_events.log | sort | uniq > defense/active/deploy.key",
        needs: [2],
        check: (c) =>
          read(c.fs, h("citadel/defense/active/deploy.key")) === "DEPLOY_OK sector-A\nDEPLOY_OK sector-B\n" &&
          (c.fs.inodes[idAt(c.fs, h("citadel/defense/active/deploy.key"), false) ?? -1]?.mode ?? 0) === 0o600,
      },
      {
        text: "Ստեղծեք `defense/current_key` symlink-ը, որը ցույց է տալիս `active/deploy.key`-ի վրա։",
        hint: "ln -s active/deploy.key defense/current_key",
        needs: [3],
        check: (c) =>
          typeAt(c.fs, h("citadel/defense/current_key"), false) === "link" &&
          (read(c.fs, h("citadel/defense/current_key")) ?? "").includes("DEPLOY_OK sector-A"),
      },
    ],
    recap: [
      "Դուք համադրեցիք `umask 077`, `sudo chown`, `chmod 750`, `[0-9]` դիմակները, `grep | sort | uniq >` և `ln -s` գործիքները։",
    ],
  },
  {
    id: "5-6",
    act: 5,
    title: "Միջնաբերդի Համալիր Պաշտպանություն · Գործնական սինթեզ III",
    commands: ["sudo", "chown", "chmod", "ls -la", "mkdir -p", "ln", "cat", "grep", "grep -v", "sort", "uniq", "head -n", "tail -n", "$(...)", "echo $((...))"],
    minCommands: 6,
    labs: [],
    start: h("citadel"),
    story: [
      "Ռութքիթ Տիրակալի պահոցի նախաշեմին փակված է `sealed_sector` արգելագոտին (`root`, `700`)։ Նրա ներսում թաքնված է `.vault_target` ցուցիչը, վավեր ու կեղծ նույնականացման լոգեր (`auth_a.log`, `auth_b.log`) և հաշվարկային մատրիցա։",
      "Ապակողպեք `sealed_sector`-ը (`sudo chown` և `chmod 755`), ռենտգենով գտեք թաքնված `.vault_target`-ը (`ls -la`), բացեք այն (`sudo chmod 644`), hard link արեք `$(...)`-ով դեպի `ready/vault_prep/`, զտեք բոլոր `AUTH` տողերը (առանց `FAKE`-ի) և ավելացրեք թվաբանական հաշվարկը (`$((...))`)։",
    ],
    concepts: [
      { term: "Կողպված սենյակի բացում", text: "Նախ փոխեք փակ directory-ի տիրոջը `sudo chown`-ով, ապա տվեք `chmod 755`՝ ներսի ֆայլերը սկանավորելու համար։" },
      { term: "Ամբողջական 5-Արար շղթա", text: "Համադրեք թույլտվությունները (`sudo`, `chown`, `chmod`), hard link + `$(...)`, wildcard `cat`, `grep | grep -v | sort | uniq` և `$((...))`։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("sudo", "Գերօգտատիրոջ իրավունք։"),
            C("chown", "Փոխել տիրոջը։"),
            A("architect:architect", "Նոր տեր և խումբ։"),
            A("locked_dir", "Փակ directory-ն։"),
          ],
          effect: "Տալիս է directory-ի տիրապետությունը architect-ին, որպեսզի հաջորդ chmod-ն աշխատի առանց sudo-ի։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("cat", "Միավորել ֆայլերը։"),
            A("dir/auth_[ab].log", "Կլորացված դիմակով երկու լոգերը։"),
            O("|", "Pipe։"),
            C("grep", "Պահել AUTH։"),
            A("AUTH", "Նմուշը։"),
            O("|", "Pipe։"),
            C("grep", "Հեռացնել FAKE։"),
            F("-v", "invert։"),
            A("FAKE", "Բացառվող բառը։"),
            O("|", "Pipe։"),
            C("sort", "Դասավորել։"),
            O("|", "Pipe։"),
            C("uniq", "Եզակի դարձնել։"),
          ],
          effect: "Ստանում է երկու ֆայլերի մաքուր և եզակի AUTH գրառումները։",
          out: ["AUTH token-1", "AUTH token-2"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      mkdirp(fs, h("citadel/sealed_sector"));
      writeFile(fs, h("citadel/sealed_sector/.vault_target"), "sealed_sector/core_seal.dat\n");
      chmodAt(fs, h("citadel/sealed_sector/.vault_target"), 0o000);
      chownAt(fs, h("citadel/sealed_sector/.vault_target"), "root", "root");
      writeFile(fs, h("citadel/sealed_sector/core_seal.dat"), "CITADEL-SEAL-INTEGRITY-100\n");
      writeFile(
        fs,
        h("citadel/sealed_sector/auth_a.log"),
        "AUTH key-alpha valid\nAUTH FAKE intruder\nNOISE static\n",
      );
      writeFile(
        fs,
        h("citadel/sealed_sector/auth_b.log"),
        "AUTH key-beta valid\nAUTH key-alpha valid\nAUTH FAKE decoy\n",
      );
      writeFile(
        fs,
        h("citadel/sealed_sector/formula.dat"),
        "HEADER: VAULT_CHECK\nCALC: 64 * 8 - 12\nEND: READY\n",
      );
      chmodAt(fs, h("citadel/sealed_sector"), 0o700);
      chownAt(fs, h("citadel/sealed_sector"), "root", "root");
    },
    objectives: [
      {
        text: "Վերցրեք `sealed_sector` սենյակի տիրապետությունը (`architect:architect`, օգտագործելով `sudo chown`), դարձրեք այն `755` և ռենտգենով (`ls -la`) սկանավորեք ներսի թաքնված ֆայլերը։",
        hint: "sudo chown architect:architect sealed_sector && chmod 755 sealed_sector && ls -la sealed_sector",
        check: (c) =>
          c.fs.inodes[idAt(c.fs, h("citadel/sealed_sector"), false) ?? -1]?.owner === "architect" &&
          (c.fs.inodes[idAt(c.fs, h("citadel/sealed_sector"), false) ?? -1]?.mode ?? 0) === 0o755 &&
          ran(c, "ls", (e) => e.flags.includes("a") || e.flags.includes("A")),
      },
      {
        text: "Դարձրեք թաքնված `sealed_sector/.vault_target` ցուցիչը ընթեռնելի (`644`, օգտագործելով `sudo`) և կառուցեք `ready/vault_prep` սենյակը։",
        hint: "sudo chmod 644 sealed_sector/.vault_target && mkdir -p ready/vault_prep",
        needs: [0],
        check: (c) =>
          (c.fs.inodes[idAt(c.fs, h("citadel/sealed_sector/.vault_target"), false) ?? -1]?.mode ?? 0) === 0o644 &&
          typeAt(c.fs, h("citadel/ready/vault_prep")) === "dir",
      },
      {
        text: "Ստեղծեք hard link `sealed_sector/.vault_target`-ում նշված ֆայլի համար (`$(...)` միջոցով) `ready/vault_prep/core_seal.dat` անունով։",
        hint: "ln $(cat sealed_sector/.vault_target) ready/vault_prep/core_seal.dat",
        needs: [1],
        check: (c) => {
          const a = idAt(c.fs, h("citadel/sealed_sector/core_seal.dat"), false);
          const b = idAt(c.fs, h("citadel/ready/vault_prep/core_seal.dat"), false);
          return a != null && a === b;
        },
      },
      {
        text: "Միավորեք `sealed_sector/`-ի `auth_a.log` և `auth_b.log` ֆայլերը (`[ab]` դիմակով), զտեք `AUTH` տողերը, բացառեք `FAKE` տողերը (`grep -v`), դասավորեք ու մաքրեք կրկնությունները և պահեք `ready/vault_prep/valid_auth.log`-ում։",
        hint: "cat sealed_sector/auth_[ab].log | grep AUTH | grep -v FAKE | sort | uniq > ready/vault_prep/valid_auth.log",
        needs: [1],
        check: (c) =>
          (read(c.fs, h("citadel/ready/vault_prep/valid_auth.log")) ?? "").startsWith(
            "AUTH key-alpha valid\nAUTH key-beta valid",
          ),
      },
      {
        text: "Կարդացեք `sealed_sector/formula.dat`-ի ուղիղ 2-րդ տողը (`head` և `tail` pipeline-ով), ավելացրեք (`>>`) այնտեղ գտնված բանաձևի արդյունքը (`$((...))`) `ready/vault_prep/valid_auth.log`-ի վերջից և կողպեք ֆայլը `600` թույլտվությամբ։",
        hint: "head -n 2 sealed_sector/formula.dat | tail -n 1 && echo $((64 * 8 - 12)) >> ready/vault_prep/valid_auth.log && chmod 600 ready/vault_prep/valid_auth.log",
        needs: [3],
        check: (c) =>
          read(c.fs, h("citadel/ready/vault_prep/valid_auth.log")) ===
            "AUTH key-alpha valid\nAUTH key-beta valid\n500\n" &&
          (c.fs.inodes[idAt(c.fs, h("citadel/ready/vault_prep/valid_auth.log"), false) ?? -1]?.mode ?? 0) === 0o600 &&
          ran(c, "tail", (e) => e.out.some((l) => l.includes("64 * 8 - 12"))),
      },
    ],
    recap: [
      "Դուք ավարտեցիք Միջնաբերդի բոլոր գործնական սինթեզները և պատրաստ եք եզրափակիչ մարտին Ռութքիթ Տիրակալի դեմ։",
    ],
  },
  {
    id: "5-7",
    act: 5,
    title: "Բոս 5՝ Ռութքիթ Տիրակալ",
    commands: ["sudo", "chown", "chmod", "cd", "ls -la", "grep", ">", "rm -r", "rm"],
    minCommands: 7,
    boss: "boss-5",
    labs: [],
    start: h("citadel"),
    story: [
      "Վերջնական մարտը սկսվում է։ Արար V-ի և ամբողջ Mainframe-ի գլխավոր թշնամին՝ Ռութքիթ Տիրակալը (Rootkit Overlord), կողպվել է `vault` պահոցի ներսում (`owner: root`, `mode: 700`) և պատված է Արմատական Էներգետիկ Վահանով (`պաշտպանիչ վահան`)։",
      "Տիրակալի պաշտպանիչ վահանն անջատելու համար․ 1) `sudo chown` և `chmod 755`-ով բացեք `vault`-ը և մտեք ներս, 2) ոչնչացրեք նրա պահապան `rootkit_nest` բույնը (`rm -r`) և `guard.glitch`-ը (`rm`), 3) բացեք `.shield_matrix.log`-ը (`sudo chmod 644`), ֆիլտրեք `OVERRIDE_KEY` տողը դեպի `override.key`, և 4) կոտրեք `rootkit.boss`-ի `400` զրահը (`sudo chmod 644`)։ Ապա ոչնչացրեք `rootkit.boss`-ին։",
    ],
    concepts: [
      { term: "sudo CMD", text: "Գործարկում է հրամանը գերօգտատիրոջ (`root`) անսահմանափակ իրավունքներով։" },
      { term: "chown USER:GROUP", text: "Փոխում է file-ի կամ directory-ի տիրոջը և խումբը (օրինակ՝ `sudo chown architect:architect bunker`)։" },
      { term: "Պաշտպանիչ վահանի կոտրում", text: "Եթե ֆայլը `400` (`r--------`) է և պատկանում է `root`-ին, նախ դարձրեք այն `644` (`sudo chmod 644 daemon.sys`) և ավարտեք նախնական առաջադրանքները։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("sudo", "Գործարկել որպես root։"),
            C("chown", "Փոխել տիրոջը (change owner)։"),
            A("architect:architect", "Նոր տերը և խումբը։"),
            A("bunker", "Թիրախ directory-ն։"),
          ],
          effect: "bunker directory-ի տերը root-ից դառնում է architect։",
          out: ["(ելք չկա)"],
        },
        {
          tokens: [
            C("sudo", "Գործարկել որպես root։"),
            C("chmod", "Փոխել թույլտվությունները։"),
            A("644", "Տիրոջը տալ կարդալու և գրելու իրավունք (rw-r--r--)։"),
            A("daemon.sys", "Պաշտպանված ֆայլը։"),
          ],
          effect: "Հեռացնում է միայն-կարդալու արգելափակումը, որպեսզի հնարավոր լինի ջնջել ֆայլը։",
          out: ["(ելք չկա)"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      mkdirp(fs, h("citadel/vault"));
      writeFile(fs, h("citadel/vault/rootkit.boss"), "BOSS_5::ROOTKIT_OVERLORD\n");
      writeFile(fs, h("citadel/vault/kernel.core"), "MAINFRAME ROOT CORE: RESTORED\n");
      writeFile(
        fs,
        h("citadel/vault/.shield_matrix.log"),
        "SHIELD_STATUS=LOCKED\nOVERRIDE_KEY=ROOT-OMEGA-00\nNOISE=0101\n",
      );
      chmodAt(fs, h("citadel/vault/.shield_matrix.log"), 0o000);
      chownAt(fs, h("citadel/vault/.shield_matrix.log"), "root", "root");
      writeFile(fs, h("citadel/vault/guard.glitch"), "GLITCH::VAULT_GUARD\n");
      setGlitch(fs, h("citadel/vault/guard.glitch"), "single");
      writeFile(fs, h("citadel/vault/rootkit_nest/drone_1.glitch"), "DRONE 1\n");
      writeFile(fs, h("citadel/vault/rootkit_nest/drone_2.glitch"), "DRONE 2\n");
      setGlitch(fs, h("citadel/vault/rootkit_nest"), "nest");
      chmodAt(fs, h("citadel/vault/rootkit.boss"), 0o400);
      chownAt(fs, h("citadel/vault/rootkit.boss"), "root", "root");
      setGlitch(fs, h("citadel/vault/rootkit.boss"), "boss-5");
      chmodAt(fs, h("citadel/vault"), 0o700);
      chownAt(fs, h("citadel/vault"), "root", "root");
    },
    objectives: [
      {
        text: "Վերցրեք `vault` պահոցի տիրապետությունը `root`-ից (`architect:architect`, օգտագործելով `sudo chown`), դարձրեք այն `755` և մտեք ներս։",
        hint: "sudo chown architect:architect vault && chmod 755 vault && cd vault",
        check: (c) =>
          c.fs.inodes[idAt(c.fs, h("citadel/vault"), false) ?? -1]?.owner === "architect" &&
          (c.fs.inodes[idAt(c.fs, h("citadel/vault"), false) ?? -1]?.mode ?? 0) === 0o755 &&
          c.cwd === h("citadel/vault"),
      },
      {
        text: "Ոչնչացրեք Տիրակալի պահապան `guard.glitch` խափանումը։",
        hint: "rm guard.glitch",
        needs: [0],
        check: (c) => countNames(c.fs, (n) => n === "guard.glitch") === 0,
      },
      {
        text: "Ոչնչացրեք `rootkit_nest` խափանումների բույնը։",
        hint: "rm -r rootkit_nest",
        needs: [0],
        check: (c) => countNames(c.fs, (n) => n === "rootkit_nest") === 0,
      },
      {
        text: "Դարձրեք թաքնված `.shield_matrix.log` ֆայլը ընթեռնելի (`644`, օգտագործելով `sudo`), ապա զտեք `OVERRIDE_KEY` տողը և `>`-ով պահեք `override.key`-ում։",
        hint: "sudo chmod 644 .shield_matrix.log && grep OVERRIDE_KEY .shield_matrix.log > override.key",
        needs: [0],
        check: (c) => (read(c.fs, h("citadel/vault/override.key")) ?? "").trim() === "OVERRIDE_KEY=ROOT-OMEGA-00",
      },
      {
        text: "Անջատեք `rootkit.boss`-ի պաշտպանիչ վահանը՝ փոխելով նրա թույլտվությունը `644`-ի (օգտագործելով `sudo`)։",
        hint: "sudo chmod 644 rootkit.boss",
        needs: [0, 1, 2, 3],
        check: (c) => (c.fs.inodes[idAt(c.fs, h("citadel/vault/rootkit.boss"), false) ?? -1]?.mode ?? 0) === 0o644,
      },
      {
        text: "Պաշտպանիչ վահանն անջատված է․ ոչնչացրեք Ռութքիթ Տիրակալին (`rootkit.boss`) և ազատագրեք Mainframe-ը։",
        hint: "rm rootkit.boss",
        needs: [0, 1, 2, 3, 4],
        check: (c) => countNames(c.fs, (n) => n === "rootkit.boss") === 0,
      },
    ],
    guards: [
      {
        text: "Պահպանեք `kernel.core` արմատական միջուկը անվնաս։",
        check: (c) => countNames(c.fs, (n) => n === "kernel.core") > 0,
      },
    ],
    recap: [
      "`sudo`-ն, `chown`-ը, `chmod`-ը և խողովակաշարերը ձեզ տվեցին լիակատար վերահսկողություն Արմատական Տիրույթի վրա։",
      "Ռութքիթ Տիրակալը ոչնչացված է, և ամբողջ Mainframe-ը վերականգնված է ձեր շնորհիվ, Ճարտարապե՛տ։",
    ],
  },

  /* ===== EPILOGUE (ACT 6) ===== */
  {
    id: "free",
    act: 6,
    title: "Համակարգը Ձերն է",
    commands: ["ամեն ինչ"],
    minCommands: 1,
    labs: [],
    hideAnatomy: true,
    story: [
      "Ռեակտորը բզզում է, և բոլոր 5 սեկտորները կայուն են։ Դուք արեցիք դա, Ճարտարապե՛տ, ստեղնաշարի միջոցով։",
      "Այստեղ նպատակներ չկան։ Կառուցեք սենյակներ, ստեղծեք links, միացրեք pipelines, փորձարկեք wildcards, permissions և մաթեմատիկա։ Մուտքագրեք `reset`, երբ ցանկանաք մաքուր աշխարհ։",
    ],
    concepts: [
      { term: "tree", text: "Գծում է ձեր ներքևում գտնվող directory-ների ամբողջ ծառը։" },
      { term: "head / tail", text: "Ցույց են տալիս հոսքի միայն առաջին կամ վերջին տողերը՝ `sort log | head -n 3`։" },
      { term: "uniq -c", text: "Հաշվում է, թե քանի անգամ է կրկնվում յուրաքանչյուր տողը՝ `sort log | uniq -c`։" },
      { term: "A && B", text: "Գործարկել B-ն միայն այն դեպքում, եթե A-ն հաջողվել է։ `A ; B`-ն գործարկում է երկուսն էլ՝ անկախ արդյունքից։" },
    ],
    diagram: {
      kind: "anatomy",
      variants: [
        {
          tokens: [
            C("grep", "Ֆիլտր։"),
            F("-v", "Շրջել համընկնումը։"),
            A("ENERGY", "PATTERN։"),
            A("reactor.log", "FILE։"),
            O("|", "Pipe։"),
            C("sort", "Դասավորել տողերը։"),
            O("|", "Pipe։"),
            C("uniq", "Միավորել հարևաններին…"),
            F("-c", "…և հաշվել, թե քանիսն են միավորվել։"),
            O("|", "Pipe։"),
            C("sort", "Կրկին դասավորել…"),
            F("-rn", "…-n ըստ թվի, -r ամենամեծերը սկզբում։"),
          ],
          effect: "Դասական օրինակ․ ո՞ր ոչ-էներգետիկ տողերն են ամենահաճախ հանդիպում։ Չորս փոքր մեքենա, մեկ պատասխան։",
          out: ["      2 NOISE static burst", "      2 MALWARE worm.exe injected", "      1 WARNING coolant low", "…"],
        },
      ],
    },
    seed: (fs, av) => {
      sheet(fs, av);
      writeFile(fs, h("fortress/vault/master.key"), KEY);
      writeFile(fs, h("fortress/civ_ada.bot"), "Ada: keeps the clocks in sync\n");
      writeFile(fs, h("labyrinth/map.txt"), "Here be dotfiles.\n");
      writeFile(fs, h("labyrinth/east_hall/.vault/secret.txt"), "You remembered ls -a.\n");
      writeFile(fs, h("refinery/reactor.log"), LOG);
      writeFile(fs, h("refinery/engine.tank"), CLEAN_ALL.join("\n") + "\n");
      const core = writeFile(fs, h("power/reactor.core"), CORE);
      link(fs, mkdirp(fs, h("outpost")), "anchor.core", core);
      symlink(fs, h("shortcut"), "labyrinth/east_hall");
      writeFile(fs, h("stray.glitch"), "zzzt\n");
      setGlitch(fs, h("stray.glitch"), "single");
    },
    objectives: [],
    recap: [],
  },
];
