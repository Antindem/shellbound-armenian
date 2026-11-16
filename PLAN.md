# Project Enhancement & Expansion Plan (`PLAN.md`)

> **CRITICAL GLOBAL CONSTRAINTS FOR AI AGENT:**
> 1. **Language:** The game UI, narrative, tutorials, boss dialogues, and battle questions **MUST be written in Armenian (Հայերեն)**, matching the existing codebase's tone and terminology. However, Linux commands, flags, file paths, `man` / `info`  manual pages and termins **MUST be written in English** (mirroring real-world terminal environments).
> 2. **Target Audience:** 12–14-year-old students. Keep explanations fun, clear, encouraging, and age-appropriate.
> 3. **Visual Consistency:** Strictly preserve the existing style of the game.

---

## 1. Data Architecture & Persistence (`localStorage`)

Separate **active playthrough progress** from **all-time historical statistics** so soft resets and hard resets behave predictably.

### Storage Keys & Schemas
1. **`cli_game_active_save`** (Cleared on "New Game", wiped on "Hard Reset"):
   ```json
   {
     "hasActiveSave": true,
     "currentAct": 1,
     "currentLevel": 1,
     "unlockedLevels": ["1-1"],
     "levelScores": {
       "1-1": { "score": 300, "maxScore": 300 }
     },
     "avatar": {
       "color": "#00ffcc",
       "hat": "none",
       "suit": "cadet"
     }
   }
   ```
2. **`cli_game_history`** (Preserved on "New Game", wiped ONLY on "Hard Reset"):
   ```json
   {
     "completedRuns": [
       { "timestamp": 1700000000, "totalScore": 4200, "glitchesDefeated": 14 }
     ],
     "bestLevelScores": { "1-1": 300 },
     "totalGlitchesDefeated": 14,
     "totalCommandsRun": 250
   }
   ```
3. **`cli_game_settings`** (Persists across resets unless wiped):
   ```json
   {
     "sfxMuted": false,
     "musicMuted": false
   }
   ```

---

## 2. Feature Specifications (By Module)

### Module A: Main Menu, Level Select & Resets
- **Main Menu Screen:**
  - **"Start" / "New Game" (Սկսել / Նոր խաղ):** Resets `cli_game_active_save` (keeping `cli_game_history`), opens **Character Customization**, then starts Act 1, Level 1.
  - **"Continue" (Շարունակել):** Visible only if `hasActiveSave === true`. Routes to the **Level Selection** screen.
  - **"Statistics" (Վիճակագրություն):** Opens the Historical Statistics modal showing data from `cli_game_history` (best scores, total glitches defeated, past playthroughs).
  - **"Reset All" (Զրոյացնել ամենը):** Opens a confirmation dialog. If confirmed, deletes `cli_game_active_save` AND `cli_game_history` completely.
- **Level Selection Screen:**
  - Displays all Acts (1–5) and their levels.
  - Visually highlights `currentLevel` (where the player last left off).
  - **Hover Tooltip:** Hovering over any completed level in the current run displays: `Միավորներ՝ [score] / [maxScore]`. Uncompleted levels in the current run do not show old scores from previous runs.

---

### Module B: Web Audio Engine (SFX & BGM)
- Implement a self-contained synthesizer/audio controller using the **Web Audio API** (no external MP3 dependencies required, avoiding broken asset paths).
- **Sound Effects (Subtle & crisp):**
  - `click`: Soft UI tick on menu/button clicks.
  - `exec`: Short positive blip on valid command execution.
  - `error`: Low dull buzz on invalid command / syntax error.
  - `burnout`: Electrical spark + descending tone when losing a CPU core.
  - `laser`: Sci-fi pew/zap when answering a battle question correctly.
  - `glitchHit`: Digital static crunch when a glitch attacks the player.
- **Background Music (BGM):**
  - Low-volume, non-intrusive ambient synth loop. Initializes on first user click to comply with browser autoplay rules.
- **HUD Controls:**
  - Add two persistent toggle buttons in the top HUD: **SFX Mute/Unmute** and **BGM Mute/Unmute**, synced with `cli_game_settings`.

---

### Module C: Scoring System (Base-100 Formula)
- Every level defines `minCommands` (optimal number of commands to solve the level).
- **Maximum Possible Score:** `maxScore = minCommands * 100`.
- **Penalty Rules (Calculated upon level completion):**
  - Extra commands used (`commandsUsed - minCommands`): `-20` points per extra command.
  - Hints used: `-100` points per hint.
  - CPU Cores (lives) lost during the level: `-150` points per core lost.
  - **Floor:** Minimum score for completing a level is `100` points (never `0` or negative).
- On level completion, save `{ score, maxScore }` to `activeSave.levelScores[levelId]` and update `history.bestLevelScores[levelId]` if higher.

---

### Module D: Player Lives ("CPU Cores") & Damage
- **HUD Display:** Render **3 CPU Core icons** in the top status bar at the start of every level.
- **Damage Triggers:**
  1. Entering an invalid/unrecognized command or failing a level constraint during gameplay.
  2. Answering a question incorrectly during a Glitch Battle.
- **Burnout Feedback:**
  - Decrement 1 core $\rightarrow$ play CSS/SVG spark & smoke burnout animation $\rightarrow$ turn core dark/cracked $\rightarrow$ play `burnout` SFX.
- **Game Over (0 Cores):**
  - Freeze terminal input and show a **"Համակարգի խափանում (System Crash)"** overlay with a **"Կրկին փորձել (Retry Level)"** button that resets the current level and restores all 3 CPU cores.

---

### Module E: Map Visibility Rule (`ls` & `ls -a`)
- **CRITICAL BEHAVIOR CHANGE:** Update the visual filesystem map renderer so that **files are hidden from the visual map by default** when entering a directory:
  - Standard (non-hidden) files in a directory only appear on the visual map **after** the player executes `ls` (or `ls -l`, `ls -a`, etc.) inside that directory.
  - Hidden dotfiles (starting with `.`) only appear on the visual map **after** the player executes `ls -a` (or `ls -la`) inside that directory.
  - Directories remain visible as structural nodes, or reveal their contents upon `ls`.

---

### Module F: Glitch Combat System & Act Bosses
- **Narrative Integration:** Introduce "Glitches" (Խափանումներ / Վիրուսային սխալներ) at the end of Act 1 as corrupted data entities invading the ship's filesystem, escalating in Acts 2–5.
- **Triggering Battles:**
  - **Single Glitch (File):** Running `rm <glitch_filename>` intercepts deletion and launches a **1-question** battle.
  - **Glitch Nest (Directory):** Running `rm -r <glitch_dirname>` (or `rm -rf`) intercepts deletion and launches a **multi-question** battle (3 questions in a row).
- **Pokémon-Style Battle Overlay:**
  - Displays Player Avatar (left, showing CPU cores) vs. Animated Glitch Sprite (right, showing Glitch HP bar).
  - Presents a random multiple-choice question (4 options) in Armenian covering concepts from the current or previous acts.
  - **On Correct Answer:** Player avatar fires a laser beam $\rightarrow$ Glitch takes damage $\rightarrow$ If Glitch HP reaches 0, battle closes, `rm` succeeds, and the file/directory is deleted from the map.
  - **On Wrong Answer:** Glitch executes an attack animation $\rightarrow$ Player loses 1 CPU Core $\rightarrow$ If cores > 0, load a new question.
- **End-of-Act Boss Glitches (Acts 1–5):**
  - Accessing each Boss requires a multi-step CLI puzzle using that Act's commands (e.g., finding a hidden key file, combining logs, filtering with wildcards, unlocking permissions).
  - **Boss Roster & Unique Mechanics:**
    1. **Act 1 Boss — Ֆրագմենտատոր (The Fragmenter):** Located behind a hidden directory (`ls -a`) and requires reading a `.key` file (`cat`). *Battle mechanic:* Questions test file paths, `type`/`which`, and basic command flags; every turn it scrambles visual path hints.
    2. **Act 2 Boss — Հոսքակեր (The Stream Eater):** Corrupted log daemon; player must redirect/filter clues (`grep`, `>`, `|`) to expose its directory. *Battle mechanic:* Player must choose the exact pipe/redirection command snippet to deflect its data-flood attacks.
    3. **Act 3 Boss — Անվերջ Ցիկլ (The Infinite Loop):** Trapped in a massive log file; player must use `head`/`tail` to extract the passkey and `$(( ))` arithmetic to calculate the unlock code. *Battle mechanic:* Rapid-fire questions mixing line-slicing (`head -n`, `tail -n`) and bash math (`$((...))`).
    4. **Act 4 Boss — Ուայլդքարդ Ուրվական (The Wildcard Phantom):** Spawns decoy clone files (`clone_1.tmp`, `clone_2.tmp`, `boss_real.sys`). *Battle mechanic:* Player must select the exact glob pattern (`*`, `?`, `[0-9]`) or command substitution `$(...)` that isolates the real boss without hitting decoys.
    5. **Act 5 Boss — Ռութքիթ Տիրակալ (Rootkit Overlord):** Locked inside a `700 root:root` vault; player must use `sudo`, `chown`, and `chmod` to gain entry. *Battle mechanic:* Shielded by permission bits (e.g., `rwxr-x---`); player must convert between symbolic (`u+x`) and octal (`750`) permissions to shatter its armor.

---

### Module G: Curriculum Expansion, Examples & `man` Side Panel
1. **Sanitize Introductory Examples:**
   - Audit every level's tutorial text. Ensure **none** of the example commands use the exact file names, folder names, or target strings required to solve the level (e.g., if the task requires `mkdir reactor`, the tutorial example must use `mkdir garden` or similar).
2. **`man` / `info` Side Panel (in English):**
   - When the player runs `man <command>` or `info <command>`, open a dedicated scrollable side panel (reusing the UX pattern of the output redirection panel) displaying a clean, kid-friendly **English** manual entry (`NAME`, `SYNOPSIS`, `DESCRIPTION`, `OPTIONS`, `EXAMPLES`) for that command.
3. **Expanded Pacing & Mandatory New Topics:**
   - **Act 1 Expansion:** Add extra combination practice levels + 2 new levels after `mkdir` covering:
     - Identifying commands: `type`, `which`
     - Help system: `man`, `apropos`, `whatis`, `info`
     - Command shortcuts: `alias`
     - Final level: Act 1 Glitch intro & Boss 1.
   - **Act 2 Expansion:** Add extra practice levels combining navigation, `cat`, `grep`, `>`, `>>`, and `|` before Boss 2.
   - **Act 3 Expansion:** Add practice levels + new levels covering:
     - Slicing files: `head`, `tail` (with `-n`)
     - Bash arithmetic: `$((a + b))`, `-`, `*`, `/`, `%`
     - Final level: Boss 3.
   - **New Act 4 — Wildcards, Subshells & Complex Pipelines:**
     - Wildcards/Globbing: `*`, `?`, `[abc]`, `[0-9]`
     - Command substitution: `$(command)`
     - Multi-command challenges combining pipes (`|`), append (`>>`), wildcards, and arithmetic + Boss 4.
   - **New Act 5 — Permissions, Ownership & Root:**
     - Concepts: Owner (`u`), Group (`g`), Others (`o`), Read (`r`/4), Write (`w`/2), Execute (`x`/1), `root` user.
     - Commands: `chmod` (symbolic & octal), `chown`, `umask`, `sudo` + Boss 5.

---

### Module H: Character Customization Expansion
- Expand the pre-game customization screen (triggered on "New Game") while keeping the existing SVG/canvas art style:
  - **Suit Colors:** At least 10 vibrant colors.
  - **Headgear (`hat`):** None, Astro Helmet, Wizard Hat, Cyber Visor, Cat Ears, Captain's Cap.
  - **Outfits (`suit`):** Cadet Uniform, Heavy Spacesuit, Neon Hacker Hoodie, Retro Cyber Armor.
- Render the chosen customization consistently across:
  1. Character preview card
  2. Filesystem map player token
  3. Pokémon-style Glitch Battle arena

---

## 3. Recommended Implementation Sequence for AI Agent

Execute in these 5 self-contained phases to prevent regressions:

1. **Phase 1 — State, Menu, Scoring & Audio:**
   - Implement `localStorage` schemas (`activeSave`, `history`, `settings`).
   - Build Main Menu, Reset confirmation, Level Select with score hover tooltips, Statistics modal, and Web Audio synthesizer + HUD mute buttons.
2. **Phase 2 — CPU Cores, Map Visibility & `man` Side Panel:**
   - Implement the 3 CPU Cores HUD, damage/burnout animations, and Game Over retry modal.
   - Update map rendering so files only appear after `ls` / `ls -a`.
   - Build the English `man` / `info` side panel component.
3. **Phase 3 — Glitch Battle Engine:**
   - Intercept `rm` / `rm -r` on glitch-flagged files/directories.
   - Build the Pokémon-style battle UI, laser/attack animations, HP tracking, and Armenian question bank loader.
4. **Phase 4 — Character Customization:**
   - Expand color, hat, and suit options and wire them into the map token and battle sprite.
5. **Phase 5 — Curriculum & Boss Content Authoring:**
   - Audit and rewrite all existing tutorial examples so they never spoil task solutions.
   - Author the expanded levels for Acts 1–3, create Acts 4 and 5, and implement all 5 Act Boss encounters.