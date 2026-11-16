import { FS, lookup, normalize } from "./vfs";
import type { ShErr } from "./shell";

/** One-line English usage for every command. Also powers `man`, `whatis`, `apropos`, `help`, and Tab completion. */
export const MAN: Record<string, string> = {
  pwd: "pwd - print the full path of the current working directory",
  ls: "ls [-l] [-a] [-i] [DIR] - list directory contents (-l long format, -a show hidden dotfiles, -i show inode numbers)",
  cd: "cd [DIR] - change working directory ('cd ..' moves up, 'cd' goes home, 'cd -' returns to previous directory)",
  touch: "touch FILE... - create empty file(s) or update timestamps",
  mkdir: "mkdir [-p] DIR... - create directory (-p creates parent directories as needed)",
  rmdir: "rmdir DIR... - remove empty directory",
  rm: "rm [-r] [-f] NAME... - remove files or directories (-r recursively removes directories and their contents)",
  cp: "cp [-r] SOURCE... DEST - copy files and directories (-r copies directories recursively)",
  mv: "mv SOURCE... DEST - move or rename files and directories",
  ln: "ln [-s] TARGET [NAME] - create a hard link or (-s) a symbolic link portal",
  cat: "cat [-n] FILE... - concatenate and print file contents to standard output",
  echo: "echo [-n] TEXT... - print text arguments to standard output",
  grep: "grep [-i] [-v] [-c] [-n] PATTERN [FILE...] - print lines matching a pattern (-v invert match, -i ignore case)",
  sort: "sort [-r] [-n] [-u] [FILE...] - sort lines of text (-n numeric, -r reverse, -u unique)",
  uniq: "uniq [-c] [FILE] - omit or count (-c) repeated adjacent lines",
  wc: "wc [-l] [-w] [-c] [FILE...] - print line (-l), word (-w), and byte (-c) counts",
  head: "head [-n NUM] [FILE] - output the first NUM lines of a file (default 10)",
  tail: "tail [-n NUM] [FILE] - output the last NUM lines of a file (default 10)",
  tree: "tree [-a] [DIR] - display directory contents in a branching tree diagram",
  type: "type NAME... - describe how a command name is interpreted (builtin, alias, or binary)",
  which: "which COMMAND... - locate the executable binary path of a command",
  man: "man COMMAND - open the system reference manual page for a command",
  info: "info COMMAND - read hypertext documentation and guide for a command",
  whatis: "whatis COMMAND... - display one-line manual page descriptions",
  apropos: "apropos KEYWORD - search manual page names and descriptions for a keyword",
  alias: "alias [NAME='COMMAND'] - define or display command shortcuts",
  chmod: "chmod MODE FILE... - change file mode bits using symbolic (u+x, g-w, o=r) or octal (755, 644) permissions",
  chown: "chown OWNER[:GROUP] FILE... - change file owner and group",
  umask: "umask [MASK] - display or set the file mode creation mask",
  sudo: "sudo COMMAND [ARGS...] - execute a command with superuser (root) privileges",
  whoami: "whoami - print the effective username",
  clear: "clear - clear the terminal screen",
  help: "help - display a summary of all available commands",
  hint: "hint - reveal a hint for the current objective",
  reset: "reset - restore the current mission filesystem to its initial state",
};

/**
 * Turn a raw stderr message into a plain-language explanation in Armenian.
 * The real error text is always shown first; this is the decoder ring.
 */
export function explain(e: ShErr, fs: FS, cwd: string): string {
  const arg = e.arg ?? "";
  const usage = MAN[e.cmd] ? ` Օգտագործումը՝ ${MAN[e.cmd]}։` : "";

  if (e.code === "ENOENT" && arg) {
    const nf = lookup(fs, normalize(cwd, arg), false);
    if (nf.id != null && fs.inodes[nf.id].type === "link") {
      return `«${arg}» պորտալը գոյություն ունի, բայց այն ցույց է տալիս «${fs.inodes[nf.id].target}»-ի վրա, իսկ այդ path-ում այլևս ոչինչ չկա։ Symbolic link-ը պահում է path-ը, ոչ թե տվյալները, ուստի երբ թիրախը տեղափոխվում է, պորտալը կոտրվում է։ Հեռացրեք այն և link ստեղծեք դեպի նոր տեղը։`;
    }
  }

  switch (e.code) {
    case "ENOENT":
      return e.cmd === "cd"
        ? `Դուք փորձեցիք մտնել «${arg}», բայց այդ անունով ոչ մի սենյակ կապված չէ այս մեկին, ուստի բախվեցիք պատին։ Անունները զգայուն են մեծատառ-փոքրատառի նկատմամբ (case-sensitive)։ Գործարկեք ls՝ իրական ելքերը տեսնելու համար։`
        : `Shell-ը փնտրեց «${arg}»-ը և այդ անունով ոչինչ չգտավ։ Ստուգեք ուղղագրությունը (մեծատառերը նշանակություն ունեն) և գործարկեք ls՝ տեսնելու, թե իրականում ինչ կա այստեղ։`;
    case "ENOTDIR":
      return `«${arg}»-ը file է, ոչ թե սենյակ։ Դուք կարող եք cd անել միայն directories-ի մեջ։ File-ի ներսը նայելու համար օգտագործեք cat։`;
    case "EISDIR":
      return e.cmd === "rm"
        ? `«${arg}»-ը directory է։ rm-ը հրաժարվում է ջնջել ամբողջ սենյակը, քանի դեռ չեք ավելացրել -r (recursive), ինչը նշանակում է «այս սենյակը ԵՎ դրա ներսում եղած ամեն ինչ»։`
        : e.cmd === "bash"
          ? `«${arg}»-ը directory է։ Ելքային տվյալները (output) կարելի է լցնել միայն file-ի մեջ, երբեք՝ սենյակի։`
          : `«${arg}»-ը սենյակ է, ոչ թե file, ուստի կարդալու տեքստ չկա։ Ներսը նայելու համար օգտագործեք ls։`;
    case "EEXIST":
      return `Այստեղ արդեն գոյություն ունի «${arg}» անունով բան։ Ընտրեք այլ անուն կամ նախ հեռացրեք հինը։`;
    case "NOPARENT":
      return `Այն directory-ն, որի ներսում պետք է լինի «${arg}»-ը, դեռ գոյություն չունի։ Նախ կառուցեք ծնող directory-ն (mkdir -p-ն միանգամից կառուցում է ամբողջ շղթան) կամ ստուգեք path-ի տառասխալները։`;
    case "REFUSE":
      return `Shell-ը հրաժարվեց․ դա կջնջեր այն սենյակը, որտեղ դուք կանգնած եք, կամ դրա ծնողին։ Նախ դուրս եկեք և նշեք ձեր ուզած directory-ի անունը։`;
    case "UNSUPPORTED":
      return `Bash-ի այդ syntax-ն իրական է, բայց այս mainframe-ում այն տեղադրված չէ։ Այն ձեզ պետք չի գա ոչ մի առաքելության համար։`;
    case "ENOTEMPTY":
      return `«${arg}»-ի ներսում դեռ բաներ կան։ rmdir-ը հեռացնում է միայն դատարկ սենյակները։ Սենյակն իր պարունակությամբ ջնջելու համար օգտագործեք rm -r։`;
    case "NOCMD":
      return `Shell-ը չգիտի «${arg}» անունով որևէ ծրագիր կամ ուղեցույց։ Ստուգեք տառասխալները կամ մուտքագրեք help՝ հասանելի commands-ի ցանկը տեսնելու համար։`;
    case "USAGE":
      return `Այս command-ին գործարկվելու համար ավելի շատ տեղեկություն է պետք։${usage}`;
    case "BADOPT":
      return `«-${arg}»-ը այս command-ի համար հասկանալի flag կամ ռեժիմ չէ։${usage}`;
    case "OMITDIR":
      return `«${arg}»-ը directory է։ cp-ն պատճենում է առանձին files, քանի դեռ չեք ավելացրել -r, որը պատճենում է սենյակն ու դրա մեջ եղած ամեն ինչ։`;
    case "SAMEFILE":
      return `Աղբյուրը և նպատակակետը նույն file-ն են, ուստի անելու ոչինչ չկա։ Պատճենին տվեք այլ անուն։`;
    case "SUBDIR":
      return `Դուք չեք կարող տեղափոխել սենյակն ինքն իր ներսում։ Դա քարտեզը հանգույցի կվերածեր։`;
    case "HARDDIR":
      return `Directories-ի վրա hard links չեն թույլատրվում, քանի որ դրանք կարող են անվերջ ցիկլեր ստեղծել քարտեզում։ Սենյակի համար դյուրանցում ստեղծելու նպատակով կառուցեք պորտալ ln -s-ով։`;
    case "NOTDIRTARGET":
      return `Երբ նշում եք մի քանի աղբյուր, վերջին argument-ը պետք է լինի գոյություն ունեցող directory, որպեսզի բոլորը տեղադրվեն դրա մեջ։`;
    case "NOINPUT":
      return `Այս command-ը ֆիլտր է․ աշխատելու համար դրան տողեր են պետք։ Տվեք file-ի անուն կամ pipe-ով ( | ) փոխանցեք մեկ այլ command-ի output-ը։`;
    case "SYNTAX":
      return `Shell-ը չկարողացավ հասկանալ այդ տողը։ Ստուգեք՝ արդյոք չկա չփակված չակերտ, փակագիծ, կամ | թե >, որոնցից հետո ոչինչ գրված չէ։`;
    case "ELOOP":
      return `Այդ պորտալն օղակաձև ցույց է տալիս ինքն իր վրա, ուստի shell-ը դադարեցրեց դրան հետևելը։`;
    case "EACCES":
    case "EPERM":
    case "DENIED":
      return `Մուտքը մերժված է (Permission denied)։ «${arg || e.cmd}»-ի թույլտվությունները (permissions) կամ սեփականատերը (owner) արգելափակում են այս գործողությունը։ Ստուգեք ls -l-ով և օգտագործեք chmod, chown կամ sudo։`;
    default:
      return `Command-ը կանգ առավ և խնդրի մասին հաղորդեց stderr-ով՝ այն ալիքով, որը ծրագրերն օգտագործում են սխալների մասին հաղորդագրությունների համար։${usage}`;
  }
}
