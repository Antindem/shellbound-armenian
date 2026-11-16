export interface BattleQuestion {
  id: string;
  act: number;
  bossId?: "boss-1" | "boss-2" | "boss-3" | "boss-4" | "boss-5";
  prompt: string;          // Armenian question text (keep commands/flags/paths in English)
  mechanicHint?: string;   // Visual mechanic hint for Boss battles (e.g. scrambled path, stream snippet, decoys list, or permission shield bits like "rwxr-x---")
  options: string[];       // Exactly 4 options
  correctIndex: number;    // 0..3
  explanation?: string;    // Short Armenian explanation
}

export interface BossMeta {
  id: "boss-1" | "boss-2" | "boss-3" | "boss-4" | "boss-5";
  act: number;
  name: string;
  subtitle: string;
  maxHp: number;
  introLine: string;
  defeatLine: string;
}

export const BOSSES: Record<BossMeta["id"], BossMeta> = {
  "boss-1": {
    id: "boss-1",
    act: 1,
    name: "Ֆրագմենտատոր (The Fragmenter)",
    subtitle: "Արար I Բոս · Կոտրված Հասցեների Պահապան",
    maxHp: 4,
    introLine: "«Ես կխառնեմ քո բոլոր paths-ը և կթաքցնեմ ելքերը կետերի հետևում։ Տեսնենք՝ ինչպես կգտնես ճանապարհդ…»",
    defeatLine: "«Հասցեները… վերականգնվեցի՜ն… իմ թաքստոցը բացահայտված է…»",
  },
  "boss-2": {
    id: "boss-2",
    act: 2,
    name: "Հոսքակեր (The Stream Eater)",
    subtitle: "Արար II Բոս · Խողովակաշարերի Մակաբույծ",
    maxHp: 4,
    introLine: "«Քո տվյալների հոսքերը պատկանում են ի՛նձ։ Ես կհեղեղեմ քո terminal-ը աղմուկով և կկտրեմ բոլոր links-ը…»",
    defeatLine: "«Խողովակները մաքրվեցին… իմ կեղտոտ հոսքը շրջափակված է…»",
  },
  "boss-3": {
    id: "boss-3",
    act: 3,
    name: "Անվերջ Ցիկլ (The Infinite Loop)",
    subtitle: "Արար III Բոս · Ժամանակային Հաշվիչի Վիրուս",
    maxHp: 4,
    introLine: "«Կրկնել, կրկնել, անվե՜րջ կրկնել։ Հազարավոր տողերի մեջ դու երբեք չես հաշվի ճիշտ կոդը…»",
    defeatLine: "«Ցիկլը ընդհատվեց (break)… հաշվարկը ճշգրիտ էր…»",
  },
  "boss-4": {
    id: "boss-4",
    act: 4,
    name: "Ուայլդքարդ Ուրվական (The Wildcard Phantom)",
    subtitle: "Արար IV Բոս · Կեղծ Կլոնների Վարպետ",
    maxHp: 4,
    introLine: "«Ո՞րն է իմ իրական մարմինը, Ճարտարապե՛տ։ Մեկ սխալ wildcard, և կոչնչացնես սեփական համակարգդ…»",
    defeatLine: "«Դիմակները պատռվեցին… դու գտար իմ իրական file-ը…»",
  },
  "boss-5": {
    id: "boss-5",
    act: 5,
    name: "Ռութքիթ Տիրակալ (Rootkit Overlord)",
    subtitle: "Արար V Բոս · Արմատական Տիրույթի Բռնակալ",
    maxHp: 5,
    introLine: "«Permission denied! Այս պահոցը պատկանում է root-ին։ Քո սովորական հրամաններն անզոր են իմ վահանի դեմ…»",
    defeatLine: "«Վահանը փշրվեց… Root տիրույթը վերադարձավ Ճարտարապետին…»",
  },
};

export const QUESTIONS: BattleQuestion[] = [
  /* ==================== ACT 1 GENERAL QUESTIONS ==================== */
  {
    id: "a1-q1",
    act: 1,
    prompt: "Ո՞ր command-ն է ցույց տալիս այն սենյակի (directory-ի) ամբողջական հասցեն, որտեղ այս պահին կանգնած ես։",
    options: ["pwd", "cd", "ls", "whoami"],
    correctIndex: 0,
    explanation: "pwd (print working directory) հրամանը տպում է ընթացիկ directory-ի ամբողջական path-ը։",
  },
  {
    id: "a1-q2",
    act: 1,
    prompt: "Ինչպե՞ս կարող ես տեսնել directory-ում գտնվող թաքնված files-ը (որոնց անունը սկսվում է `.` կետով)։",
    options: ["ls -l", "ls -a", "pwd -a", "cat ."],
    correctIndex: 1,
    explanation: "-a (all) flag-ը ստիպում է ls-ին ցուցադրել բոլոր անունները, ներառյալ կետով սկսվող թաքնվածները։",
  },
  {
    id: "a1-q3",
    act: 1,
    prompt: "Եթե գտնվում ես `/home/architect/labyrinth` սենյակում, ո՞ր հրամանը քեզ մեկ մակարդակ վերև կբարձրացնի՝ `/home/architect`։",
    options: ["cd .", "cd ..", "cd /", "mkdir .."],
    correctIndex: 1,
    explanation: "..-ը միշտ ցույց է տալիս ծնող (մեկ մակարդակ վերև գտնվող) directory-ի վրա։",
  },
  {
    id: "a1-q4",
    act: 1,
    prompt: "Ո՞ր command-ն է ստեղծում նոր, դատարկ file՝ առանց դրա մեջ տեքստ գրելու։",
    options: ["mkdir note.txt", "touch note.txt", "cat note.txt", "cp note.txt"],
    correctIndex: 1,
    explanation: "touch-ը ստեղծում է դատարկ file, իսկ mkdir-ը նախատեսված է միայն directory-ների համար։",
  },
  {
    id: "a1-q5",
    act: 1,
    prompt: "Ուզում ես միանգամից կառուցել `base/tower/top` սենյակների շղթան, երբ `base`-ը դեռ գոյություն չունի։ Ի՞նչ պետք է գրես։",
    options: ["mkdir base/tower/top", "mkdir -p base/tower/top", "mkdir -r base/tower/top", "touch -p base/tower/top"],
    correctIndex: 1,
    explanation: "mkdir -p-ն (parents) ավտոմատ կառուցում է path-ի բոլոր բացակայող ծնող սենյակները։",
  },
  {
    id: "a1-q6",
    act: 1,
    prompt: "Ի՞նչ է անում `cp key.txt backup.txt` հրամանը։",
    options: [
      "Ջնջում է key.txt-ն և թողնում միայն backup.txt-ն",
      "Ստեղծում է key.txt-ի անկախ պատճենը backup.txt անունով",
      "Տեղափոխում է key.txt-ն backup.txt directory-ի մեջ",
      "Տպում է երկու files-ի պարունակությունը էկրանին",
    ],
    correctIndex: 1,
    explanation: "cp-ն (copy) պատճենում է աղբյուր file-ը նոր file-ի մեջ՝ պահպանելով բնօրինակը։",
  },
  {
    id: "a1-q7",
    act: 1,
    prompt: "Ո՞ր command-ով կպարզես՝ արդյոք `cd`-ն ներկառուցված է shell-ի մեջ (shell builtin), թե՞ առանձին ծրագիր է։",
    options: ["which cd", "type cd", "whatis cd", "ls cd"],
    correctIndex: 1,
    explanation: "type հրամանը բացահայտում է command-ի տեսակը՝ builtin, alias կամ արտաքին ծրագիր։",
  },
  {
    id: "a1-q8",
    act: 1,
    prompt: "Ո՞ր հրամանը կստեղծի `ll` կարճատումը (shortcut), որը կգործարկի `ls -la`։",
    options: ["alias ll='ls -la'", "ln -s 'ls -la' ll", "type ll='ls -la'", "whatis ll='ls -la'"],
    correctIndex: 0,
    explanation: "alias անուն='հրաման' կառուցվածքը ստեղծում է նոր կարճ հրաման։",
  },
  {
    id: "a1-q9",
    act: 1,
    prompt: "Ինչպե՞ս կարող ես ամբողջությամբ ջնջել `old_nest` directory-ն և դրա ներսում եղած բոլոր files-ը։",
    options: ["rm old_nest", "rmdir old_nest", "rm -r old_nest", "mv old_nest"],
    correctIndex: 2,
    explanation: "rm -r (recursive) հրամանը մտնում է directory-ի մեջ և ջնջում ամբողջ պարունակությունը։",
  },

  /* ==================== ACT 2 GENERAL QUESTIONS ==================== */
  {
    id: "a2-q1",
    act: 2,
    prompt: "Ի՞նչ է ստեղծում `ln core.dat anchor.dat` հրամանը (առանց `-s` flag-ի)։",
    options: [
      "Hard link՝ երկրորդ անուն նույն inode-ի համար",
      "Symbolic link, որը պահում է path-ը որպես տեքստ",
      "Նոր directory anchor.dat անունով",
      "Երկու տարբեր inodes ունեցող պատճեն",
    ],
    correctIndex: 0,
    explanation: "Առանց -s-ի ln-ը ստեղծում է hard link․ երկու անուններն էլ ցույց են տալիս նույն inode-ի վրա։",
  },
  {
    id: "a2-q2",
    act: 2,
    prompt: "Եթե file-ն ունի երկու hard link (`a.txt` և `b.txt`), ի՞նչ կպատահի տվյալներին, երբ կատարես `rm a.txt`։",
    options: [
      "Տվյալները կջնջվեն նաև b.txt-ից",
      "b.txt-ն կդառնա կոտրված (broken) link",
      "Տվյալները կմնան անվնաս և հասանելի b.txt-ի միջոցով",
      "rm-ը կհրաժարվի ջնջել a.txt-ն",
    ],
    correctIndex: 2,
    explanation: "Inode-ի տվյալները պահպանվում են, քանի դեռ link-երի քանակը (nlink) զրո չի դարձել։",
  },
  {
    id: "a2-q3",
    act: 2,
    prompt: "Ո՞ր հրամանն է ստեղծում symbolic link (հոլոգրաֆիկ պորտալ) դեպի `deep/vault` սենյակը՝ `gate` անունով։",
    options: ["ln deep/vault gate", "ln -s deep/vault gate", "ln -s gate deep/vault", "cp -s gate deep/vault"],
    correctIndex: 1,
    explanation: "ln -s TARGET NAME հրամանում նախ գրվում է թիրախի path-ը, հետո նոր link-ի անունը։",
  },
  {
    id: "a2-q4",
    act: 2,
    prompt: "Ի՞նչ տարբերություն կա `>` և `>>` օպերատորների միջև։",
    options: [
      "`>`-ն ավելացնում է վերջից, իսկ `>>`-ը վերագրանցում է",
      "`>`-ը նախ դատարկում է file-ը (overwrite), իսկ `>>`-ն ավելացնում է վերջից (append)",
      "Երկուսն էլ անում են նույն բանը",
      "`>>`-ն աշխատում է միայն directories-ի վրա",
    ],
    correctIndex: 1,
    explanation: "Մեկ սլաքը (`>`) ջնջում է հին պարունակությունը, իսկ կրկնակի սլաքը (`>>`) ավելացնում է նոր տողերը վերջից։",
  },
  {
    id: "a2-q5",
    act: 2,
    prompt: "Ի՞նչ է անում `|` (pipe) նշանը երկու հրամանների միջև, օրինակ՝ `cat log.txt | wc -l`։",
    options: [
      "Առաջին հրամանի output-ն ուղարկում է որպես երկրորդ հրամանի input",
      "Գրում է առաջին հրամանի արդյունքը wc անունով file-ի մեջ",
      "Ջնջում է log.txt-ն կարդալուց հետո",
      "Գործարկում է երկրորդ հրամանը միայն եթե առաջինը ձախողվել է",
    ],
    correctIndex: 0,
    explanation: "Pipe-ը (`|`) խողովակի պես միացնում է ձախ հրամանի stdout-ը աջ հրամանի stdin-ին։",
  },
  {
    id: "a2-q6",
    act: 2,
    prompt: "Ո՞ր հրամանը կգտնի և կտպի միայն այն տողերը `sensor.log`-ից, որոնք պարունակում են `ALERT` բառը։",
    options: ["cat ALERT sensor.log", "grep ALERT sensor.log", "wc ALERT sensor.log", "echo ALERT > sensor.log"],
    correctIndex: 1,
    explanation: "grep PATTERN FILE հրամանը ֆիլտրում է տողերը՝ թողնելով միայն նմուշին համընկնողները։",
  },
  {
    id: "a2-q7",
    act: 2,
    prompt: "Ի՞նչ է անում `grep -v NOISE signal.log` հրամանը։",
    options: [
      "Տպում է միայն NOISE պարունակող տողերը",
      "Տպում է բոլոր տողերը, որոնք ՉԵՆ պարունակում NOISE",
      "Հաշվում է NOISE տողերի քանակը",
      "Դասավորում է տողերը այբբենական կարգով",
    ],
    correctIndex: 1,
    explanation: "-v (invert) flag-ը շրջում է grep-ի ֆիլտրը՝ պահելով միայն չհամընկնող տողերը։",
  },
  {
    id: "a2-q8",
    act: 2,
    prompt: "Ո՞ր flag-ով `ls`-ը ցույց կտա յուրաքանչյուր file-ի inode համարը։",
    options: ["ls -a", "ls -i", "ls -d", "ls -F"],
    correctIndex: 1,
    explanation: "ls -i (inode) կամ ls -li հրամանը տպում է յուրաքանչյուր տարրի inode համարը։",
  },
  {
    id: "a2-q9",
    act: 2,
    prompt: "Ի՞նչ կտպի `grep ERROR system.log | wc -l` pipeline-ը։",
    options: [
      "system.log-ի բոլոր տողերը",
      "ERROR բառը պարունակող տողերի քանակը (մեկ թիվ)",
      "system.log-ի բայթերի քանակը",
      "Առաջին ERROR պարունակող տողը",
    ],
    correctIndex: 1,
    explanation: "grep-ը ընտրում է ERROR տողերը, իսկ wc -l-ը հաշվում է, թե քանի այդպիսի տող անցավ խողովակով։",
  },

  /* ==================== ACT 3 GENERAL QUESTIONS ==================== */
  {
    id: "a3-q1",
    act: 3,
    prompt: "Ինչո՞ւ ենք սովորաբար գործարկում `sort`-ը `uniq`-ից առաջ (`sort data.txt | uniq`)։",
    options: [
      "Որովհետև uniq-ը ջնջում է միայն իրար անմիջապես կողքի գտնվող կրկնօրինակ տողերը",
      "Որովհետև uniq-ն առանց sort-ի չի կարող կարդալ տեքստ",
      "Որովհետև sort-ը հաշվում է տողերի քանակը",
      "Հերթականությունը կապ չունի, uniq | sort-ը միշտ նույնն է",
    ],
    correctIndex: 0,
    explanation: "uniq-ը համեմատում է միայն հարևան տողերը, իսկ sort-ը բոլոր նույնական տողերը բերում է կողք կողքի։",
  },
  {
    id: "a3-q2",
    act: 3,
    prompt: "Ո՞ր հրամանը կտպի `stream.log` file-ի միայն առաջին 5 տողերը։",
    options: ["tail -n 5 stream.log", "head -n 5 stream.log", "wc -l 5 stream.log", "grep -n 5 stream.log"],
    correctIndex: 1,
    explanation: "head -n 5-ը վերցնում է file-ի կամ հոսքի գլխամասի (առաջին) 5 տողերը։",
  },
  {
    id: "a3-q3",
    act: 3,
    prompt: "Ո՞ր հրամանը կտպի `events.log` file-ի միայն վերջին 3 տողերը։",
    options: ["head -n 3 events.log", "tail -n 3 events.log", "sort -n 3 events.log", "uniq -c 3 events.log"],
    correctIndex: 1,
    explanation: "tail -n 3-ը վերցնում է file-ի պոչամասի (վերջին) 3 տողերը։",
  },
  {
    id: "a3-q4",
    act: 3,
    prompt: "Ինչպե՞ս կարող ես pipeline-ով ստանալ ` telemetry.log `-ի ուղիղ 4-րդ տողը։",
    options: [
      "head -n 4 telemetry.log | tail -n 1",
      "tail -n 4 telemetry.log | head -n 4",
      "grep 4 telemetry.log | wc -l",
      "head -n 1 telemetry.log | tail -n 4",
    ],
    correctIndex: 0,
    explanation: "head -n 4-ը վերցնում է առաջին 4 տողերը, իսկ tail -n 1-ը դրանցից պահում է վերջինը՝ 4-րդ տողը։",
  },
  {
    id: "a3-q5",
    act: 3,
    prompt: "Ի՞նչ կտպի `echo $((15 + 5 * 2))` հրամանը bash-ում։",
    options: ["40", "25", "15+5*2", "22"],
    correctIndex: 1,
    explanation: "$((...))-ը կատարում է մաթեմատիկական հաշվարկ․ նախ 5 * 2 = 10, ապա 15 + 10 = 25։",
  },
  {
    id: "a3-q6",
    act: 3,
    prompt: "Ի՞նչ է հաշվում `%` օպերատորը `echo $((17 % 5))` արտահայտության մեջ։",
    options: [
      "Բաժանման մնացորդը (2)",
      "Տոկոսը (85)",
      "Ամբողջ բաժանումը (3)",
      "Բազմապատկումը (85)",
    ],
    correctIndex: 0,
    explanation: "%-ը (modulo) վերադարձնում է բաժանման մնացորդը․ 17-ը 5-ի բաժանելիս քանակը 3 է, մնացորդը՝ 2։",
  },
  {
    id: "a3-q7",
    act: 3,
    prompt: "Ո՞ր pipeline-ը կպահպանի `reactor.log`-ի մաքուր, առանց կրկնությունների `ENERGY` տողերը `clean.txt` file-ի մեջ։",
    options: [
      "grep ENERGY reactor.log | sort | uniq > clean.txt",
      "grep ENERGY reactor.log > clean.txt | sort | uniq",
      "uniq reactor.log | grep ENERGY > clean.txt",
      "sort clean.txt > grep ENERGY reactor.log",
    ],
    correctIndex: 0,
    explanation: "Նախ ֆիլտրում ենք grep-ով, դասավորում sort-ով, հեռացնում կրկնությունները uniq-ով և վերջում > clean.txt։",
  },
  {
    id: "a3-q8",
    act: 3,
    prompt: "Ի՞նչ կտպի `echo $((100 / 4 - 5))` հրամանը։",
    options: ["20", "25", "50", "19"],
    correctIndex: 0,
    explanation: "100 / 4 = 25, իսկ 25 - 5 = 20։",
  },
  {
    id: "a3-q9",
    act: 3,
    prompt: "Ո՞ր flag-ն է ստիպում `sort`-ին դասավորել տողերը որպես թվեր (ոչ թե այբբենական կարգով)։",
    options: ["sort -n", "sort -r", "sort -u", "sort -c"],
    correctIndex: 0,
    explanation: "sort -n (numeric) flag-ը համեմատում է տողերի թվային արժեքները։",
  },

  /* ==================== ACT 4 GENERAL QUESTIONS ==================== */
  {
    id: "a4-q1",
    act: 4,
    prompt: "Ինչի՞ն է համընկնում `?` wildcard նշանը file-երի անունների մեջ։",
    options: [
      "Ցանկացած քանակությամբ նիշերի (նույնիսկ զրո)",
      "Ուղիղ ՄԵԿ ցանկացած նիշի",
      "Միայն թվանշանների (0-9)",
      "Միայն հարցական նշանի",
    ],
    correctIndex: 1,
    explanation: "?-ը փոխարինում է ուղիղ մեկ նիշի, մինչդեռ *-ը փոխարինում է ցանկացած երկարության տեքստի։",
  },
  {
    id: "a4-q2",
    act: 4,
    prompt: "Ո՞ր անուններին կհամընկնի `bot_[0-9].dat` նմուշը (glob pattern)։",
    options: [
      "Միայն bot_0.dat-ից մինչև bot_9.dat (մեկ թվանշանով)",
      "bot_10.dat և bot_99.dat",
      "bot_a.dat և bot_z.dat",
      "Բոլոր .dat files-ին",
    ],
    correctIndex: 0,
    explanation: "[0-9]-ը համընկնում է 0-ից 9 միջակայքի ուղիղ մեկ թվանշանի։",
  },
  {
    id: "a4-q3",
    act: 4,
    prompt: "Ունես `sec_a.log`, `sec_b.log`, `sec_c.log` և `sec_z.log`։ Ո՞ր նմուշը կընտրի միայն առաջին երեքը։",
    options: ["sec_*.log", "sec_?.log", "sec_[abc].log", "sec_[0-9].log"],
    correctIndex: 2,
    explanation: "[abc]-ն համընկնում է միայն փակագծերի մեջ նշված տառերից մեկին (a, b կամ c)։",
  },
  {
    id: "a4-q4",
    act: 4,
    prompt: "Ի՞նչ է անում `$(...)` կառուցվածքը (Command Substitution), օրինակ՝ `cat $(cat pointer.txt)`։",
    options: [
      "Նախ գործարկում է ներսի հրամանը և դրա output-ը տեղադրում արտաքին հրամանի մեջ",
      "Կատարում է միայն թվաբանական գումարում",
      "Ջնջում է pointer.txt file-ը",
      "Ստեղծում է symbolic link",
    ],
    correctIndex: 0,
    explanation: "$(command)-ը աշխատացնում է ներքին հրամանը և արդյունքը դարձնում արտաքին հրամանի argument։",
  },
  {
    id: "a4-q5",
    act: 4,
    prompt: "Եթե `target.txt` file-ի ներսում գրված է `vault/key.dat`, ի՞նչ կանի `cat $(cat target.txt)` հրամանը։",
    options: [
      "Կտպի target.txt բառը",
      "Կկարդա և կտպի vault/key.dat file-ի պարունակությունը",
      "Կջնջի vault/key.dat-ը",
      "Կտա syntax error",
    ],
    correctIndex: 1,
    explanation: "Ներսի $(cat target.txt)-ը վերածվում է vault/key.dat-ի, և արտաքին հրամանը դառնում է cat vault/key.dat։",
  },
  {
    id: "a4-q6",
    act: 4,
    prompt: "Ո՞ր նմուշը կընտրի `.tmp`-ով ավարտվող ԲՈԼՈՐ files-ը ընթացիկ directory-ում։",
    options: ["?.tmp", "*.tmp", "[a-z].tmp", "[0-9].tmp"],
    correctIndex: 1,
    explanation: "*-ը համընկնում է ցանկացած երկարության անվան, ուստի *.tmp-ն ընտրում է բոլոր .tmp files-ը։",
  },
  {
    id: "a4-q7",
    act: 4,
    prompt: "Ո՞ր file-ին ԿՀԱՄԸՆԿՆԻ `node_??.sys` նմուշը։",
    options: ["node_1.sys", "node_07.sys", "node_105.sys", "node_.sys"],
    correctIndex: 1,
    explanation: "Երկու հարցական նշանը (??) պահանջում է ուղիղ երկու նիշ (օրինակ՝ 07)։",
  },
  {
    id: "a4-q8",
    act: 4,
    prompt: "Ինչպե՞ս կարող ես `echo`-ի միջոցով `report.txt`-ում գրել `Lines: 12`, եթե 12-ը ստացվում է `wc -l data.log`-ից։",
    options: [
      'echo "Lines: $(wc -l data.log)" > report.txt',
      'echo "Lines: $((wc -l data.log))" > report.txt',
      'echo "Lines: wc -l data.log" > report.txt',
      'wc -l data.log | echo > report.txt',
    ],
    correctIndex: 0,
    explanation: "$(wc -l data.log)-ը տեղադրում է հրամանի արդյունքը տեքստի մեջ նախքան redirect անելը։",
  },
  {
    id: "a4-q9",
    act: 4,
    prompt: "Ո՞ր նմուշը կընտրի փոքրատառ լատինական տառով սկսվող երկնիշ `.key` files-ը (օրինակ՝ `a1.key`, `b9.key`)։",
    options: ["[a-z][0-9].key", "[0-9][a-z].key", "*[0-9].key", "?.[a-z].key"],
    correctIndex: 0,
    explanation: "[a-z]-ը ընտրում է առաջին տառը, իսկ [0-9]-ը՝ դրան հաջորդող թվանշանը։",
  },

  /* ==================== ACT 5 GENERAL QUESTIONS ==================== */
  {
    id: "a5-q1",
    act: 5,
    prompt: "Ի՞նչ են նշանակում `u`, `g` և `o` տառերը `chmod` հրամանում։",
    options: [
      "Upload, Group, Overwrite",
      "User (տեր), Group (խումբ), Others (մնացած բոլորը)",
      "Unix, Global, Output",
      "User, Guest, Owner",
    ],
    correctIndex: 1,
    explanation: "u = user/owner (ֆայլի տերը), g = group (խումբը), o = others (մյուս բոլոր օգտատերերը)։",
  },
  {
    id: "a5-q2",
    act: 5,
    prompt: "Ի՞նչ թվային արժեքներ ունեն `r` (read), `w` (write) և `x` (execute) թույլտվությունները։",
    options: [
      "r = 1, w = 2, x = 4",
      "r = 3, w = 2, x = 1",
      "r = 4, w = 2, x = 1",
      "r = 7, w = 5, x = 0",
    ],
    correctIndex: 2,
    explanation: "Ութական (octal) համակարգում read = 4, write = 2, execute = 1 (գումարը՝ 4+2+1 = 7)։",
  },
  {
    id: "a5-q3",
    act: 5,
    prompt: "Ո՞ր հրամանը file-ի տիրոջը (`u`) կտա գործարկման (`x` — execute) իրավունք։",
    options: ["chmod u-x script.sh", "chown u+x script.sh", "umask u+x script.sh", "chmod u+x script.sh"],
    correctIndex: 3,
    explanation: "chmod u+x-ը ավելացնում է (+) execute (x) իրավունքը տիրոջ (u) համար։",
  },
  {
    id: "a5-q4",
    act: 5,
    prompt: "Ի՞նչ թույլտվություններ է սահմանում `chmod 755 app.bin` հրամանը։",
    options: [
      "rwxr-xr-x (տիրոջը՝ 7=rwx, խմբին՝ 5=r-x, մյուսներին՝ 5=r-x)",
      "rwx------ (տիրոջը՝ 7, մյուսներին՝ 0)",
      "rw-r--r-- (տիրոջը՝ 6, մյուսներին՝ 4)",
      "rwxrwxrwx (բոլորին ամեն ինչ)",
    ],
    correctIndex: 0,
    explanation: "7 = 4+2+1 (rwx), իսկ 5 = 4+0+1 (r-x)։ Արդյունքում՝ rwxr-xr-x։",
  },
  {
    id: "a5-q5",
    act: 5,
    prompt: "Ո՞ր հրամանն է փոխում `vault` directory-ի տիրոջը (owner)՝ դարձնելով `architect`։",
    options: [
      "sudo chmod architect vault",
      "sudo chown architect:architect vault",
      "sudo umask architect vault",
      "sudo whoami architect vault",
    ],
    correctIndex: 1,
    explanation: "chown (change owner) հրամանը փոխում է file-ի կամ directory-ի տիրոջը և խումբը։",
  },
  {
    id: "a5-q6",
    act: 5,
    prompt: "Ի՞նչի համար է օգտագործվում `sudo` հրամանը։",
    options: [
      "Files-ը այբբենական կարգով դասավորելու համար",
      "Թաքնված directories-ը ջնջելու համար",
      "Հրամանը գերօգտատիրոջ (root / superuser) լիազորություններով գործարկելու համար",
      "Նոր alias ստեղծելու համար",
    ],
    correctIndex: 2,
    explanation: "sudo-ն թույլ է տալիս կատարել վարչական հրամաններ root-ի իրավունքներով։",
  },
  {
    id: "a5-q7",
    act: 5,
    prompt: "Ի՞նչ է որոշում `umask` հրամանը (օրինակ՝ `umask 077`)։",
    options: [
      "Թե որ files-ը պետք է թաքնված լինեն ls-ից",
      "Թե քանի CPU core ունի խաղացողը",
      "Թե ինչ գույն ունի կերպարի դիմակը",
      "Թե որ թույլտվությունները պետք է ՀԱՆՎԵՆ նոր ստեղծվող files-ից և directories-ից",
    ],
    correctIndex: 3,
    explanation: "umask-ը դիմակ է, որը նոր ստեղծվող տարրերից հանում է նշված թույլտվության բիթերը (077-ը փակում է խմբի և մյուսների մուտքը)։",
  },
  {
    id: "a5-q8",
    act: 5,
    prompt: "Ո՞ր թվային կոդն է համապատասխանում `-rw-------` թույլտվությանը (միայն տերը կարող է կարդալ և գրել)։",
    options: ["700", "600", "644", "755"],
    correctIndex: 1,
    explanation: "rw- = 4 + 2 = 6 տիրոջ համար, և 0 խմբի ու մյուսների համար -> 600։",
  },
  {
    id: "a5-q9",
    act: 5,
    prompt: "Եթե directory-ի վրա չունես `x` (execute) թույլտվություն, ի՞նչ ՉԵՍ կարող անել։",
    options: [
      "Չես կարող `cd`-ով մտնել այդ directory-ի ներս",
      "Չես կարող տեսնել directory-ի անունը ծնող սենյակից",
      "Չես կարող օգտագործել pwd հրամանը",
      "Չես կարող օգտագործել echo հրամանը",
    ],
    correctIndex: 0,
    explanation: "Directory-ի համար x բիթը նշանակում է «մուտքի իրավունք»․ առանց դրա cd-ն կտա Permission denied (EACCES)։",
  },

  /* ==================== BOSS 1: THE FRAGMENTER (Ֆրագմենտատոր) ==================== */
  {
    id: "b1-q1",
    act: 1,
    bossId: "boss-1",
    mechanicHint: "ԿՈՏՐՎԱԾ PATH-Ի ՖՐԱԳՄԵՆՏՆԵՐ՝ [ .chamber ] ⇄ [ /home/architect ] ⇄ [ .passkey ]",
    prompt: "Ֆրագմենտատորը խառնել է հասցեները։ Ո՞ր հրամանը կբացահայտի `.chamber` թաքնված սենյակը ընթացիկ directory-ում։",
    options: ["pwd", "ls -la", "cd ..", "mkdir .chamber"],
    correctIndex: 1,
    explanation: "ls -la (կամ ls -a) հրամանը ցույց է տալիս կետով սկսվող թաքնված սենյակները։",
  },
  {
    id: "b1-q2",
    act: 1,
    bossId: "boss-1",
    mechanicHint: "ԿՈՏՐՎԱԾ PATH-Ի ՖՐԱԳՄԵՆՏՆԵՐ՝ [ .. ] ⇄ [ sector_7 ] ⇄ [ /home/architect/labyrinth ]",
    prompt: "Դու գտնվում ես `/home/architect/labyrinth/east_hall`-ում։ Ո՞ր path-ը քեզ կտանի ուղիղ `/home/architect/sector_7`։",
    options: ["cd ./sector_7", "cd ../east_hall/sector_7", "cd ../../sector_7", "pwd sector_7"],
    correctIndex: 2,
    explanation: "Առաջին ..-ը տանում է labyrinth, երկրորդ ..-ը՝ /home/architect, իսկ այնտեղից՝ sector_7։",
  },
  {
    id: "b1-q3",
    act: 1,
    bossId: "boss-1",
    mechanicHint: "ՀՐԱՄԱՆԻ ՍԿԱՆԵՐ՝ [ builtin? ] ⇄ [ binary? ] ⇄ [ /bin/grep ]",
    prompt: "Ֆրագմենտատորը քողարկել է ծրագրերը։ Ո՞ր հրամանը ցույց կտա `grep` ծրագրի ճշգրիտ տեղը (`/bin/grep`)։",
    options: ["which grep", "mkdir grep", "cd grep", "rm grep"],
    correctIndex: 0,
    explanation: "which հրամանը գտնում է գործարկվող ծրագրի path-ը համակարգում։",
  },
  {
    id: "b1-q4",
    act: 1,
    bossId: "boss-1",
    mechanicHint: "ՀԱՆՐԱԳԻՏԱՐԱՆԻ ՖՐԱԳՄԵՆՏ՝ [ NAME ] ⇄ [ SYNOPSIS ] ⇄ [ mkdir -p ]",
    prompt: "Մոռացել ես `mkdir` հրամանի flags-ը։ Ո՞ր հրամանը կբացի դրա ուղեցույցը (manual page)։",
    options: ["which mkdir", "cp mkdir", "touch mkdir", "man mkdir"],
    correctIndex: 3,
    explanation: "man <command>-ը բացում է տվյալ հրամանի ամբողջական տեղեկատուն։",
  },
  {
    id: "b1-q5",
    act: 1,
    bossId: "boss-1",
    mechanicHint: "ԿՈՏՐՎԱԾ PATH-Ի ՖՐԱԳՄԵՆՏՆԵՐ՝ [ ~ ] ⇄ [ fortress ] ⇄ [ vault ] ⇄ [ deep ]",
    prompt: "Ինչպե՞ս մեկ հրամանով կստեղծես `fortress/vault/deep` ամբողջ շղթան, եթե ոչ մի սենյակ դեռ չկա։",
    options: ["mkdir fortress/vault/deep", "mkdir -p fortress/vault/deep", "cd -p fortress/vault/deep", "ls -la fortress/vault/deep"],
    correctIndex: 1,
    explanation: "mkdir -p flag-ը ստեղծում է բոլոր միջանկյալ ծնող directories-ը։",
  },
  {
    id: "b1-q6",
    act: 1,
    bossId: "boss-1",
    mechanicHint: "ՈՐՈՆՄԱՆ ԱԶԴԱՆՇԱՆ՝ [ search keyword: \"copy\" ] -> [ cp - copy files ]",
    prompt: "Ո՞ր հրամանն է փնտրում հրամանների կարճ նկարագրությունների մեջ ըստ բանալի բառի (օրինակ՝ `copy`)։",
    options: ["pwd copy", "mv copy", "apropos copy", "touch copy"],
    correctIndex: 2,
    explanation: "apropos-ը փնտրում է բոլոր man էջերի նկարագրություններում և գտնում համապատասխան հրամանները։",
  },
  {
    id: "b1-q7",
    act: 1,
    bossId: "boss-1",
    mechanicHint: "ԿՈՏՐՎԱԾ ՖԱՅԼԵՐ՝ [ bot_1.bot ] [ bot_2.bot ] ➔ [ safe_zone/ ]",
    prompt: "Ո՞ր հրամանը միանգամից կտեղափոխի բոլոր `.bot` ֆայլերը `safe_zone/` սենյակի մեջ։",
    options: ["mv *.bot safe_zone/", "cp safe_zone/ *.bot", "rm *.bot safe_zone/", "cd *.bot safe_zone/"],
    correctIndex: 0,
    explanation: "mv *.bot safe_zone/ հրամանը տեղափոխում է բոլոր համընկնող .bot ֆայլերը նշված directory։",
  },

  /* ==================== BOSS 2: THE STREAM EATER (Հոսքակեր) ==================== */
  {
    id: "b2-q1",
    act: 2,
    bossId: "boss-2",
    mechanicHint: "ՄՈՒՏՔԱՅԻՆ ՀՈՍՔ՝ [CORRUPT #99] [VALID_KEY=OMEGA] [NOISE ~~~] ➔ ԹԻՐԱԽ՝ shield.off",
    prompt: "Հոսքակերը աղտոտված լոգեր է նետում։ Ո՞ր հրամանը կզտի միայն `VALID_KEY` տողը `flood.log`-ից և կգրի `shield.off`-ի մեջ։",
    options: [
      "grep VALID_KEY flood.log | shield.off",
      "grep VALID_KEY flood.log > shield.off",
      "cat flood.log > VALID_KEY",
      "grep -v VALID_KEY flood.log > shield.off",
    ],
    correctIndex: 1,
    explanation: "grep VALID_KEY flood.log-ը ընտրում է ճիշտ տողը, իսկ > shield.off-ը պահում է այն ֆայլում։",
  },
  {
    id: "b2-q2",
    act: 2,
    bossId: "boss-2",
    mechanicHint: "ՀՈՍՔԻ ՎՏԱՆԳ՝ shield.off արդեն պարունակում է [PART_1] ➔ ԱՎԵԼԱՑՆԵԼ [PART_2] առանց ջնջելու",
    prompt: "`shield.off`-ում արդեն կա առաջին բանալին։ Ինչպե՞ս ավելացնել `PART_2` տողը `stream.log`-ից՝ ԱՌԱՆՑ ջնջելու առաջինը։",
    options: [
      "grep PART_2 stream.log > shield.off",
      "cat shield.off > stream.log",
      "grep PART_2 stream.log >> shield.off",
      "grep PART_2 stream.log | shield.off",
    ],
    correctIndex: 2,
    explanation: ">> օպերատորը ավելացնում է նոր տվյալները ֆայլի վերջից՝ պահպանելով հին պարունակությունը։",
  },
  {
    id: "b2-q3",
    act: 2,
    bossId: "boss-2",
    mechanicHint: "ՏՎՅԱԼՆԵՐԻ ՋՐՀԵՂԵՂ՝ [TOXIC_1] [CLEAN_A] [TOXIC_2] [CLEAN_B] ➔ ՀԱՇՎԵԼ ՄԱՔՈՒՐ ՏՈՂԵՐԸ",
    prompt: "Ինչպե՞ս հաշվել, թե քանի տող `flood.log`-ում ՉԻ պարունակում `TOXIC` բառը։",
    options: [
      "grep -v TOXIC flood.log | wc -l",
      "grep TOXIC flood.log | wc -l",
      "wc -l flood.log > TOXIC",
      "cat flood.log | grep TOXIC",
    ],
    correctIndex: 0,
    explanation: "grep -v TOXIC-ը հեռացնում է թունավոր տողերը, իսկ | wc -l-ը հաշվում է մաքուր տողերի քանակը։",
  },
  {
    id: "b2-q4",
    act: 2,
    bossId: "boss-2",
    mechanicHint: "ԿՈՏՐՎԱԾ ՊՈՐՏԱԼ՝ lrwxrwxrwx link -> old_core (ԲԱՑԱԿԱՅՈՒՄ Է) · ՆՈՐ ԹԻՐԱԽ՝ new_core",
    prompt: "Հոսքակերը կոտրել է `portal` symlink-ը։ Ինչպե՞ս մաքրել հինը և կապել `new_core`-ին։",
    options: [
      "rm new_core և ապա ln portal new_core",
      "mkdir portal/new_core",
      "cat new_core | portal",
      "rm portal և ապա ln -s new_core portal",
    ],
    correctIndex: 3,
    explanation: "Նախ ջնջում ենք կոտրված symlink-ը rm-ով, ապա ստեղծում նորը՝ ln -s new_core portal։",
  },
  {
    id: "b2-q5",
    act: 2,
    bossId: "boss-2",
    mechanicHint: "ԷՆԵՐԳԵՏԻԿ ԽԱՐԻՍԽ՝ Inode #42 [power.core] ➔ Ստեղծել Hard Link [backup.core]",
    prompt: "Ո՞ր հրամանը կստեղծի hard link, որպեսզի `backup.core`-ը կիսի նույն Inode #42-ը `power.core`-ի հետ։",
    options: [
      "ln -s power.core backup.core",
      "ln power.core backup.core",
      "cp power.core backup.core",
      "mv power.core backup.core",
    ],
    correctIndex: 1,
    explanation: "ln power.core backup.core հրամանը ստեղծում է hard link դեպի նույն inode-ը։",
  },
  {
    id: "b2-q6",
    act: 2,
    bossId: "boss-2",
    mechanicHint: "ԿՐԿՆԱԿԻ ՖԻԼՏՐ՝ [PULSE OK] [PULSE ERR] [STATIC] ➔ Պահել միայն PULSE և ոչ ERR",
    prompt: "Ո՞ր pipeline-ը կընտրի `PULSE` պարունակող տողերը `raw.log`-ից, բայց կբացառի `ERR` պարունակողները։",
    options: [
      "grep -v PULSE raw.log | grep ERR",
      "grep PULSE raw.log > grep -v ERR",
      "grep PULSE raw.log | grep -v ERR",
      "cat raw.log | wc -l | grep PULSE",
    ],
    correctIndex: 2,
    explanation: "Առաջին grep-ը թողնում է PULSE տողերը, իսկ երկրորդ grep -v ERR-ը դրանցից հեռացնում է սխալները։",
  },
  {
    id: "b2-q7",
    act: 2,
    bossId: "boss-2",
    mechanicHint: "ՀՈՍՔԻ ԱՎԱՐՏ՝ [grep CLEAN data.log] ➔ [wc -l] ➔ Պահել թիվը count.txt-ում",
    prompt: "Ինչպե՞ս հաշվել `data.log`-ի `CLEAN` տողերի քանակը և ստացված թիվը գրել `count.txt` ֆայլում։",
    options: [
      "grep CLEAN data.log | wc -l > count.txt",
      "grep CLEAN data.log > count.txt | wc -l",
      "wc -l CLEAN > data.log",
      "cat count.txt | grep CLEAN",
    ],
    correctIndex: 0,
    explanation: "Pipe-ից հետո դրված > count.txt-ը պահում է wc -l-ի վերջնական թիվը ֆայլի մեջ։",
  },

  /* ==================== BOSS 3: THE INFINITE LOOP (Անվերջ Ցիկլ) ==================== */
  {
    id: "b3-q1",
    act: 3,
    bossId: "boss-3",
    mechanicHint: "ՑԻԿԼԻ ՌԵԳԻՍՏՐ՝ Տող 1 = [ 40 ] · Տող 10 (վերջին) = [ 6 ] · ԳՈՐԾՈՂՈՒԹՅՈՒՆ՝ Բազմապատկում",
    prompt: "Անվերջ Ցիկլի առաջին տողում 40 է, վերջինում՝ 6։ Ո՞ր հրամանը կհաշվի դրանց արտադրյալը և կգրի `halt.key`-ում։",
    options: [
      "echo 40 * 6 > halt.key",
      "echo $((40 * 6)) > halt.key",
      "cat $((40 + 6)) > halt.key",
      "head -n 240 > halt.key",
    ],
    correctIndex: 1,
    explanation: "echo $((40 * 6)) > halt.key հրամանը հաշվում է 240 և գրում այն halt.key ֆայլի մեջ։",
  },
  {
    id: "b3-q2",
    act: 3,
    bossId: "boss-3",
    mechanicHint: "ԼՈԳԻ ԿՏՐՎԱԾՔ՝ loop.log (100 տող) ➔ Անհրաժեշտ է ՄԻԱՅՆ առաջին տողը",
    prompt: "Ո՞ր հրամանը `loop.log`-ից կհանի միայն ամենաառաջին տողը։",
    options: [
      "tail -n 1 loop.log",
      "uniq -c loop.log",
      "head -n 1 loop.log",
      "wc -l loop.log",
    ],
    correctIndex: 2,
    explanation: "head -n 1-ը տպում է միայն 1-ին տողը։",
  },
  {
    id: "b3-q3",
    act: 3,
    bossId: "boss-3",
    mechanicHint: "ԼՈԳԻ ԿՏՐՎԱԾՔ՝ loop.log (100 տող) ➔ Անհրաժեշտ է ՄԻԱՅՆ ամենավերջին տողը",
    prompt: "Ո՞ր հրամանը `loop.log`-ից կհանի միայն ամենավերջին տողը։",
    options: [
      "tail -n 1 loop.log",
      "head -n 1 loop.log",
      "sort -n loop.log",
      "grep 1 loop.log",
    ],
    correctIndex: 0,
    explanation: "tail -n 1-ը տպում է միայն վերջին տողը։",
  },
  {
    id: "b3-q4",
    act: 3,
    bossId: "boss-3",
    mechanicHint: "ՃՇԳՐԻՏ ՀԱՏՈՒՅԹ՝ loop.log ➔ Քաղել ուղիղ 3-րդ տողը",
    prompt: "Ինչպե՞ս `head` և `tail` հրամանների համադրությամբ ստանալ `loop.log`-ի ուղիղ 3-րդ տողը։",
    options: [
      "tail -n 3 loop.log | head -n 3",
      "head -n 1 loop.log | tail -n 3",
      "sort loop.log | head -n 3",
      "head -n 3 loop.log | tail -n 1",
    ],
    correctIndex: 3,
    explanation: "head -n 3-ը վերցնում է առաջին 3 տողերը, իսկ tail -n 1-ը դրանցից պահում է 3-րդը։",
  },
  {
    id: "b3-q5",
    act: 3,
    bossId: "boss-3",
    mechanicHint: "ՄԻՋՈՒԿԱՅԻՆ ՀԱՇՎԱՐԿ՝ A = 120, B = 45, C = 3 ➔ Հաշվել (A - B) / C",
    prompt: "Ի՞նչ արդյունք կտպի `echo $(((120 - 45) / 3))` հրամանը։",
    options: ["105", "25", "35", "15"],
    correctIndex: 1,
    explanation: "120 - 45 = 75, իսկ 75 / 3 = 25։",
  },
  {
    id: "b3-q6",
    act: 3,
    bossId: "boss-3",
    mechanicHint: "ԿՐԿՆՎՈՂ ՑԻԿԼԵՐ՝ [TICK 9] [TICK 2] [TICK 9] [TICK 2] ➔ Ստանալ եզակի տողերի քանակը",
    prompt: "Ո՞ր pipeline-ը կհեռացնի կրկնվող տողերը `ticks.log`-ից և կհաշվի, թե քանի եզակի տող մնաց։",
    options: [
      "uniq ticks.log | wc -l",
      "head ticks.log | tail | wc -l",
      "sort ticks.log | uniq | wc -l",
      "wc -l ticks.log | sort | uniq",
    ],
    correctIndex: 2,
    explanation: "Նախ sort, հետո uniq՝ կրկնությունները մաքրելու համար, և վերջում wc -l՝ հաշվելու համար։",
  },
  {
    id: "b3-q7",
    act: 3,
    bossId: "boss-3",
    mechanicHint: "ՑԻԿԼԻ ՄՆԱՑՈՐԴ՝ Ցիկլ #53, քայլը՝ 10 ➔ $((53 % 10))",
    prompt: "Անվերջ Ցիկլը կանգ է առնում բաժանման մնացորդի վրա։ Ի՞նչ կտպի `echo $((53 % 10))` հրամանը։",
    options: ["3", "5", "50", "13"],
    correctIndex: 0,
    explanation: "53-ը 10-ի բաժանելիս մնացորդը 3 է։",
  },

  /* ==================== BOSS 4: THE WILDCARD PHANTOM (Ուայլդքարդ Ուրվական) ==================== */
  {
    id: "b4-q1",
    act: 4,
    bossId: "boss-4",
    mechanicHint: "ՍԵՆՅԱԿԻ ՕԲՅԵԿՏՆԵՐ՝ [clone_1.tmp] [clone_2.tmp] [clone_3.tmp] [boss_real.sys] [core.sys]",
    prompt: "Ուրվականը ստեղծել է կլոններ։ Ո՞ր հրամանը կջնջի ՄԻԱՅՆ `clone_1.tmp`, `clone_2.tmp`, `clone_3.tmp` խաբկանքները՝ չդիպչելով `.sys` ֆայլերին։",
    options: [
      "rm *.*",
      "rm clone_[0-9].tmp",
      "rm *.sys",
      "rm clone_*.*",
    ],
    correctIndex: 1,
    explanation: "clone_[0-9].tmp նմուշը ճշգրիտ ընտրում է միայն թվանշանով կլոնների .tmp ֆայլերը։",
  },
  {
    id: "b4-q2",
    act: 4,
    bossId: "boss-4",
    mechanicHint: "ՍԵՆՅԱԿԻ ՕԲՅԵԿՏՆԵՐ՝ [phantom_a.decoy] [phantom_b.decoy] [phantom_1.key]",
    prompt: "Ո՞ր glob նմուշը կընտրի միայն տառով (`a` կամ `b`) կեղծ ֆայլերը՝ չդիպչելով `phantom_1.key`-ին։",
    options: [
      "phantom_?.*",
      "phantom_*",
      "phantom_[a-z].decoy",
      "phantom_[0-9].decoy",
    ],
    correctIndex: 2,
    explanation: "phantom_[a-z].decoy-ն ընտրում է միայն փոքրատառ տառ ունեցող .decoy ֆայլերը։",
  },
  {
    id: "b4-q3",
    act: 4,
    bossId: "boss-4",
    mechanicHint: "ՑՈՒՑԻՉԻ ՇՂԹԱ՝ locator.txt-ի ներսում գրված է «boss_real.sys»",
    prompt: "`locator.txt` ֆայլը պարունակում է իրական բոսի անունը։ Ո՞ր հրամանը կոչնչացնի բոսին՝ օգտագործելով command substitution։",
    options: [
      "rm $(cat locator.txt)",
      "rm locator.txt",
      "cat $(rm locator.txt)",
      "rm $((locator.txt))",
    ],
    correctIndex: 0,
    explanation: "$(cat locator.txt)-ը կարդում է boss_real.sys անունը և փոխանցում այն rm հրամանին։",
  },
  {
    id: "b4-q4",
    act: 4,
    bossId: "boss-4",
    mechanicHint: "ՍԵՆՅԱԿԻ ՕԲՅԵԿՏՆԵՐ՝ [key_1.dat] [key_2.dat] [key_10.dat] [key_a.dat]",
    prompt: "Ո՞ր նմուշը կհամընկնի `key_1.dat`, `key_2.dat` և `key_a.dat` ֆայլերին, բայց ՈՉ `key_10.dat`-ին։",
    options: [
      "key_*.dat",
      "key_[0-9].dat",
      "key_??.dat",
      "key_?.dat",
    ],
    correctIndex: 3,
    explanation: "?-ը պահանջում է ուղիղ մեկ նիշ (1, 2 կամ a), իսկ 10-ը երկու նիշ է։",
  },
  {
    id: "b4-q5",
    act: 4,
    bossId: "boss-4",
    mechanicHint: "ՀԱՄԱԿՑՎԱԾ ՀՐԱՄԱՆ՝ code.txt = «77» ➔ Պետք է գրել «CODE-77» unlock.sig-ի մեջ",
    prompt: "Ինչպե՞ս `code.txt`-ի պարունակությունը տեղադրել `CODE-` բառից հետո և պահել `unlock.sig` ֆայլում։",
    options: [
      'echo "CODE-$((code.txt))" > unlock.sig',
      'echo "CODE-$(cat code.txt)" > unlock.sig',
      'cat code.txt | echo CODE- > unlock.sig',
      'mv $(cat code.txt) unlock.sig',
    ],
    correctIndex: 1,
    explanation: "$(cat code.txt)-ը տեղադրում է 77-ը տեքստի մեջ՝ դարձնելով CODE-77։",
  },
  {
    id: "b4-q6",
    act: 4,
    bossId: "boss-4",
    mechanicHint: "ԹԱՔՆՎԱԾ ԿԼՈՆՆԵՐ՝ [s1.bot] [s2.bot] [m1.bot] ➔ Տեղափոխել միայն s-ով սկսվողները shelter/",
    prompt: "Ո՞ր հրամանը կտեղափոխի միայն `s1.bot` և `s2.bot` ֆայլերը `shelter/` սենյակ՝ թողնելով `m1.bot`-ը։",
    options: [
      "mv *.bot shelter/",
      "mv ?[0-9].bot shelter/",
      "mv s[0-9].bot shelter/",
      "cp s*.bot shelter/",
    ],
    correctIndex: 2,
    explanation: "s[0-9].bot-ը ընտրում է միայն s տառով և մեկ թվանշանով .bot ֆայլերը։",
  },
  {
    id: "b4-q7",
    act: 4,
    bossId: "boss-4",
    mechanicHint: "ՈՒՐՎԱԿԱՆԻ ՀԵՏՔ՝ [ghost_x.log] [ghost_y.log] [ghost_z.log] ➔ Միավորել մեկ trace.log-ում",
    prompt: "Ո՞ր հրամանը կկարդա բոլոր `ghost_?.log` ֆայլերը և դրանց ընդհանուր պարունակությունը կլցնի `trace.log`-ի մեջ։",
    options: [
      "cat ghost_?.log > trace.log",
      "echo ghost_?.log > trace.log",
      "mv ghost_?.log trace.log",
      "rm $(cat ghost_?.log)",
    ],
    correctIndex: 0,
    explanation: "cat ghost_?.log-ը կարդում է բոլոր համընկնող ֆայլերը, իսկ >-ը գրում է դրանք trace.log-ում։",
  },

  /* ==================== BOSS 5: ROOTKIT OVERLORD (Ռութքիթ Տիրակալ) ==================== */
  {
    id: "b5-q1",
    act: 5,
    bossId: "boss-5",
    mechanicHint: "ՎԱՀԱՆԻ ԿՈԴ՝ [ rwxr-x--- ] ➔ Փոխարկել ութական (octal) թվի",
    prompt: "Ռութքիթ Տիրակալի վահանի վրա գրված է `rwxr-x---`։ Ո՞ր եռանիշ թվային կոդն է համապատասխանում այս թույլտվությանը։",
    options: ["755", "750", "700", "640"],
    correctIndex: 1,
    explanation: "rwx = 4+2+1 = 7, r-x = 4+0+1 = 5, --- = 0։ Արդյունքը՝ 750։",
  },
  {
    id: "b5-q2",
    act: 5,
    bossId: "boss-5",
    mechanicHint: "ՓԱԿ ՊԱՀՈՑ՝ drwx------ root root vault ➔ Փոխել տիրոջը architect-ի",
    prompt: "`vault` սենյակը պատկանում է `root`-ին։ Ո՞ր հրամանով կդարձնես քեզ (`architect`) դրա տերը։",
    options: [
      "chown architect:architect vault",
      "sudo chmod 755 architect",
      "sudo chown architect:architect vault",
      "sudo umask architect vault",
    ],
    correctIndex: 2,
    explanation: "Քանի որ տերը root-ն է, անհրաժեշտ է sudo chown architect:architect vault։",
  },
  {
    id: "b5-q3",
    act: 5,
    bossId: "boss-5",
    mechanicHint: "ՎԱՀԱՆԻ ԿՈԴ՝ [ r-------- ] (400) ➔ Դարձնել [ rw-r--r-- ] (644)",
    prompt: "`rootkit.boss` ֆայլը պաշտպանված է գրելուց (`r--------`)։ Ո՞ր հրամանը կդարձնի այն `rw-r--r--`՝ ջնջելու համար։",
    options: [
      "sudo chmod 644 rootkit.boss",
      "sudo chmod 400 rootkit.boss",
      "sudo chown 644 rootkit.boss",
      "umask 644 rootkit.boss",
    ],
    correctIndex: 0,
    explanation: "644-ը տիրոջը տալիս է rw- (4+2=6), իսկ խմբին ու մյուսներին՝ r-- (4)։",
  },
  {
    id: "b5-q4",
    act: 5,
    bossId: "boss-5",
    mechanicHint: "ՍԻՄՎՈԼԻԿ ՎԱՀԱՆ՝ [ rw-rw-r-- ] ➔ Հեռացնել խմբի (g) գրելու (w) իրավունքը",
    prompt: "Ո՞ր սիմվոլիկ հրամանը կհեռացնի խմբի (`group`) գրելու (`write`) թույլտվությունը `config.sys` ֆայլից։",
    options: [
      "chmod g+w config.sys",
      "chmod u-w config.sys",
      "chmod o-w config.sys",
      "chmod g-w config.sys",
    ],
    correctIndex: 3,
    explanation: "g-w նշանակում է group (խումբ) հանած (-) write (գրել)։",
  },
  {
    id: "b5-q5",
    act: 5,
    bossId: "boss-5",
    mechanicHint: "ՎԱՀԱՆԻ ԿՈԴ՝ [ rwx------ ] ➔ Միայն տիրոջը բոլոր իրավունքները",
    prompt: "Ո՞ր `chmod` հրամանն է սահմանում `rwx------` թույլտվությունը `secret_dir` սենյակի վրա։",
    options: [
      "chmod 777 secret_dir",
      "chmod 700 secret_dir",
      "chmod 600 secret_dir",
      "chmod 077 secret_dir",
    ],
    correctIndex: 1,
    explanation: "700-ը տիրոջը տալիս է rwx (7), իսկ խմբին և մյուսներին՝ ոչինչ (0 և 0)։",
  },
  {
    id: "b5-q6",
    act: 5,
    bossId: "boss-5",
    mechanicHint: "ՊԱՇՏՊԱՆԱԿԱՆ ԴԻՄԱԿ՝ Նոր ֆայլերը պետք է անհասանելի լինեն group-ի և others-ի համար",
    prompt: "Ո՞ր հրամանը կսահմանի այնպիսի դիմակ (mask), որ նոր ստեղծվող ֆայլերի վրա խումբն ու մյուսները ոչ մի իրավունք չունենան։",
    options: [
      "umask 777",
      "chmod 077",
      "umask 077",
      "chown 077",
    ],
    correctIndex: 2,
    explanation: "umask 077-ը հանում է բոլոր 7 (rwx) իրավունքները խմբից և մյուսներից։",
  },
  {
    id: "b5-q7",
    act: 5,
    bossId: "boss-5",
    mechanicHint: "ՎԵՐՋՆԱԿԱՆ ՀԱՐՎԱԾ՝ [ -rwxr-xr-x ] ➔ Ավելացնել տիրոջ գործարկման իրավունքը սիմվոլիկ կոդով",
    prompt: "`breaker.sh` ծրագիրը գործարկելու համար տիրոջը պետք է `x` իրավունք։ Ինչպե՞ս ավելացնել այն սիմվոլիկ ձևով։",
    options: [
      "chmod u+x breaker.sh",
      "chmod o+x breaker.sh",
      "chmod u-x breaker.sh",
      "chown u+x breaker.sh",
    ],
    correctIndex: 0,
    explanation: "chmod u+x-ը տիրոջը (user) տալիս է գործարկման (execute) իրավունք։",
  },
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Returns randomized questions for a Glitch Battle.
 * Always includes extra reserve questions beyond `count` (at least `count + 3`)
 * so that if a player answers wrongly (losing up to 2 CPU cores before a crash),
 * advancing `qIdx` never runs out of questions.
 */
export function getQuestionsForBattle(
  act: number,
  count: number,
  bossId?: BossMeta["id"],
): BattleQuestion[] {
  const targetCount = Math.max(count + 3, 6);

  if (bossId) {
    const bossPool = shuffle(QUESTIONS.filter((q) => q.bossId === bossId));
    const actPool = shuffle(
      QUESTIONS.filter((q) => !q.bossId && q.act <= Math.max(1, act)),
    );
    const combined = [...bossPool, ...actPool];
    return combined.slice(0, Math.max(targetCount, bossPool.length));
  }

  const currentActPool = shuffle(
    QUESTIONS.filter((q) => !q.bossId && q.act === Math.max(1, act)),
  );
  const earlierActPool = shuffle(
    QUESTIONS.filter((q) => !q.bossId && q.act < Math.max(1, act)),
  );
  const fallbackPool = shuffle(QUESTIONS.filter((q) => !q.bossId));

  const combined = [...currentActPool, ...earlierActPool];
  if (combined.length >= targetCount) {
    return combined.slice(0, targetCount);
  }
  return [...combined, ...fallbackPool].slice(0, targetCount);
}
