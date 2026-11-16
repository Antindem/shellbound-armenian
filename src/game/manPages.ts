export interface ManPage {
  cmd: string;
  name: string;
  synopsis: string;
  description: string;
  options?: { flag: string; desc: string }[];
  examples: { cmd: string; desc: string }[];
}

export const MAN_PAGES: Record<string, ManPage> = {
  pwd: {
    cmd: "pwd",
    name: "pwd - print name of current/working directory",
    synopsis: "pwd",
    description:
      "Prints the full absolute path (starting from /) of the directory room where you are currently standing.",
    examples: [{ cmd: "pwd", desc: "Display your exact location in the filesystem." }],
  },
  ls: {
    cmd: "ls",
    name: "ls - list directory contents",
    synopsis: "ls [-a] [-l] [-i] [DIR...]",
    description:
      "Scans a directory and lists the files and subdirectories inside it. Without arguments, it lists the room you are currently standing in.",
    options: [
      { flag: "-a", desc: "Show all entries, including hidden dotfiles starting with '.'" },
      { flag: "-l", desc: "Use long listing format showing permissions, owner, size, and link targets" },
      { flag: "-i", desc: "Print the index number (inode) of each file" },
    ],
    examples: [
      { cmd: "ls", desc: "List visible files and folders in the current directory." },
      { cmd: "ls -la", desc: "Show every file (including hidden ones) with full permission and owner details." },
    ],
  },
  cd: {
    cmd: "cd",
    name: "cd - change the working directory",
    synopsis: "cd [DIR]",
    description:
      "Moves you into another directory room. Use '..' to step up to the parent directory, '~' or no argument to return to your home directory, or '-' to jump back to your previous directory.",
    examples: [
      { cmd: "cd garden", desc: "Enter the 'garden' subdirectory." },
      { cmd: "cd ..", desc: "Move one level up to the parent directory." },
      { cmd: "cd ~", desc: "Return straight to your home directory (/home/architect)." },
    ],
  },
  touch: {
    cmd: "touch",
    name: "touch - create empty files or update timestamps",
    synopsis: "touch FILE...",
    description:
      "Creates a brand-new empty file if it does not exist yet. You can pass multiple filenames to create several files at once.",
    examples: [
      { cmd: "touch notes.txt", desc: "Create an empty file named notes.txt." },
      { cmd: "touch draft1.txt draft2.txt", desc: "Create two empty files at once." },
    ],
  },
  mkdir: {
    cmd: "mkdir",
    name: "mkdir - make directories",
    synopsis: "mkdir [-p] DIR...",
    description:
      "Builds one or more new directories (rooms) in the filesystem.",
    options: [
      { flag: "-p", desc: "Create parent directories as needed without error if they already exist" },
    ],
    examples: [
      { cmd: "mkdir workshop", desc: "Create a new directory called workshop." },
      { cmd: "mkdir -p base/tower/roof", desc: "Build an entire chain of nested directories in one step." },
    ],
  },
  rmdir: {
    cmd: "rmdir",
    name: "rmdir - remove empty directories",
    synopsis: "rmdir DIR...",
    description:
      "Removes a directory, but ONLY if it is completely empty. This safety check prevents accidentally deleting rooms that still hold files.",
    examples: [{ cmd: "rmdir old_shed", desc: "Remove the empty directory old_shed." }],
  },
  rm: {
    cmd: "rm",
    name: "rm - remove files or directories",
    synopsis: "rm [-r] [-f] FILE...",
    description:
      "Permanently unlinks (deletes) files from the filesystem. Caution: there is no trash can in the shell! When targeting a Glitch entity, rm engages the Glitch Combat protocol.",
    options: [
      { flag: "-r, -R", desc: "Remove directories and their contents recursively" },
      { flag: "-f", desc: "Ignore nonexistent files and never prompt" },
    ],
    examples: [
      { cmd: "rm scrap.txt", desc: "Delete the file scrap.txt." },
      { cmd: "rm -r old_cache", desc: "Delete the old_cache directory and everything inside it." },
    ],
  },
  cp: {
    cmd: "cp",
    name: "cp - copy files and directories",
    synopsis: "cp [-r] SOURCE... DEST",
    description:
      "Creates an independent duplicate copy of a file or directory at a new name or inside another directory.",
    options: [
      { flag: "-r, -R", desc: "Copy directories recursively along with all their contents" },
    ],
    examples: [
      { cmd: "cp blueprint.txt backup.txt", desc: "Duplicate blueprint.txt as backup.txt." },
      { cmd: "cp -r library archive/", desc: "Copy the entire library directory into archive/." },
    ],
  },
  mv: {
    cmd: "mv",
    name: "mv - move (rename) files and directories",
    synopsis: "mv SOURCE... DEST",
    description:
      "Moves files or directories into another room, or renames them in place. Moving within the same filesystem simply re-attaches the name without copying data.",
    examples: [
      { cmd: "mv rough.txt final.txt", desc: "Rename rough.txt to final.txt." },
      { cmd: "mvparcel.dat storage/", desc: "Move parcel.dat into the storage directory." },
    ],
  },
  ln: {
    cmd: "ln",
    name: "ln - make links between files",
    synopsis: "ln [-s] TARGET [LINK_NAME]",
    description:
      "Creates either a hard link (a second name pointing to the exact same inode data crystal) or, with -s, a symbolic link (a portal storing a path string to another file or directory).",
    options: [
      { flag: "-s", desc: "Create a symbolic link (symlink portal) instead of a hard link" },
      { flag: "-f", desc: "Replace existing destination link files" },
    ],
    examples: [
      { cmd: "ln gem.dat spare_gem.dat", desc: "Create a hard link sharing the same inode as gem.dat." },
      { cmd: "ln -s /home/architect/hangar shortcut", desc: "Create a symbolic link portal named shortcut." },
    ],
  },
  cat: {
    cmd: "cat",
    name: "cat - concatenate files and print on standard output",
    synopsis: "cat [-n] [FILE...]",
    description:
      "Reads one or more files in order and prints their text lines to standard output (stdout).",
    options: [
      { flag: "-n", desc: "Number all output lines" },
    ],
    examples: [
      { cmd: "cat journal.txt", desc: "Print the contents of journal.txt to the terminal." },
      { cmd: "cat part1.txt part2.txt > full.txt", desc: "Combine two files into full.txt." },
    ],
  },
  echo: {
    cmd: "echo",
    name: "echo - display a line of text",
    synopsis: "echo [-n] [STRING...]",
    description:
      "Prints its arguments separated by spaces. Often paired with '>' or '>>' to write or append text lines into configuration files, or with $((...)) to evaluate math.",
    options: [
      { flag: "-n", desc: "Do not output the trailing newline" },
    ],
    examples: [
      { cmd: "echo \"Hello World\"", desc: "Print Hello World to the terminal." },
      { cmd: "echo \"Mode=active\" >> settings.cfg", desc: "Append a setting line to the end of settings.cfg." },
    ],
  },
  grep: {
    cmd: "grep",
    name: "grep - print lines that match patterns",
    synopsis: "grep [-i] [-v] [-c] [-n] PATTERN [FILE...]",
    description:
      "Searches through input lines (from files or a pipe '|') and keeps only the lines matching PATTERN.",
    options: [
      { flag: "-i", desc: "Ignore case distinctions (match both uppercase and lowercase)" },
      { flag: "-v", desc: "Invert match: select only non-matching lines" },
      { flag: "-c", desc: "Print only a count of matching lines" },
      { flag: "-n", desc: "Prefix each matching line with its line number" },
    ],
    examples: [
      { cmd: "grep WARN sensor.log", desc: "Show every line in sensor.log containing WARN." },
      { cmd: "cat events.log | grep -v DEBUG", desc: "Filter out DEBUG lines from events.log." },
    ],
  },
  sort: {
    cmd: "sort",
    name: "sort - sort lines of text files",
    synopsis: "sort [-r] [-n] [-u] [FILE...]",
    description:
      "Arranges lines of text alphabetically or numerically. Often used before 'uniq' so identical lines sit next to each other.",
    options: [
      { flag: "-r", desc: "Reverse the result of comparisons (descending order)" },
      { flag: "-n", desc: "Compare according to string numerical value" },
      { flag: "-u", desc: "Output only the first of an equal run (unique lines)" },
    ],
    examples: [
      { cmd: "sort names.txt", desc: "Sort lines in names.txt from A to Z." },
      { cmd: "sort -n scores.txt", desc: "Sort numbers from smallest to largest." },
    ],
  },
  uniq: {
    cmd: "uniq",
    name: "uniq - report or omit repeated adjacent lines",
    synopsis: "uniq [-c] [FILE]",
    description:
      "Filters adjacent matching lines from input, writing unique lines to output. Tip: sort the input first with 'sort' so all duplicates are adjacent!",
    options: [
      { flag: "-c", desc: "Prefix lines by the number of occurrences" },
    ],
    examples: [
      { cmd: "sort items.txt | uniq", desc: "Sort items.txt and remove all duplicate lines." },
      { cmd: "sort items.txt | uniq -c", desc: "Count how many times each unique line appears." },
    ],
  },
  wc: {
    cmd: "wc",
    name: "wc - print newline, word, and byte counts",
    synopsis: "wc [-l] [-w] [-c] [FILE...]",
    description:
      "Counts lines, words, and bytes in each input file or piped stream.",
    options: [
      { flag: "-l", desc: "Print the newline (line) counts only" },
      { flag: "-w", desc: "Print the word counts only" },
      { flag: "-c", desc: "Print the byte counts only" },
    ],
    examples: [
      { cmd: "wc -l roster.txt", desc: "Count how many lines are in roster.txt." },
      { cmd: "grep OK status.log | wc -l", desc: "Count how many lines contain OK." },
    ],
  },
  head: {
    cmd: "head",
    name: "head - output the first part of files",
    synopsis: "head [-n NUM] [FILE...]",
    description:
      "Prints the first 10 lines of each file (or piped input) to standard output. Use -n NUM to slice a specific number of lines from the top.",
    options: [
      { flag: "-n NUM", desc: "Print the first NUM lines instead of the first 10" },
    ],
    examples: [
      { cmd: "head -n 5 telemetry.log", desc: "Show only the first 5 lines of telemetry.log." },
      { cmd: "head -n 1 header.txt", desc: "Extract just the very first line of header.txt." },
    ],
  },
  tail: {
    cmd: "tail",
    name: "tail - output the last part of files",
    synopsis: "tail [-n NUM] [FILE...]",
    description:
      "Prints the last 10 lines of each file (or piped input) to standard output. Combine with 'head' in a pipeline to isolate any middle line!",
    options: [
      { flag: "-n NUM", desc: "Output the last NUM lines instead of the last 10" },
    ],
    examples: [
      { cmd: "tail -n 3 history.log", desc: "Show the last 3 lines of history.log." },
      { cmd: "head -n 10 data.log | tail -n 1", desc: "Extract exactly the 10th line of data.log." },
    ],
  },
  tree: {
    cmd: "tree",
    name: "tree - list contents of directories in a tree-like format",
    synopsis: "tree [-a] [DIR]",
    description:
      "Draws a visual branching diagram of a directory and all its subdirectories and files.",
    options: [
      { flag: "-a", desc: "Include hidden dotfiles and hidden directories in the tree" },
    ],
    examples: [
      { cmd: "tree", desc: "Draw the directory tree starting from the current room." },
      { cmd: "tree -a", desc: "Draw the tree including hidden files." },
    ],
  },
  type: {
    cmd: "type",
    name: "type - describe how a command name is interpreted",
    synopsis: "type NAME...",
    description:
      "Reveals whether a command name is a shell builtin (like cd or echo), an alias shortcut, or an external binary program stored in /bin or /usr/bin.",
    examples: [
      { cmd: "type cd", desc: "Check what kind of command 'cd' is (shell builtin)." },
      { cmd: "type grep", desc: "See where the 'grep' program lives." },
    ],
  },
  which: {
    cmd: "which",
    name: "which - locate a command executable in PATH",
    synopsis: "which COMMAND...",
    description:
      "Searches standard system directories (/bin, /usr/bin) and prints the full path of the executable program that would run.",
    examples: [
      { cmd: "which ls", desc: "Print the executable path for ls (/bin/ls)." },
      { cmd: "which sort", desc: "Locate the sort binary (/usr/bin/sort)." },
    ],
  },
  man: {
    cmd: "man",
    name: "man - an interface to the system reference manuals",
    synopsis: "man COMMAND",
    description:
      "Opens the reference manual page for a command in the side panel, showing its synopsis, description, flags, and examples.",
    examples: [
      { cmd: "man ls", desc: "Open the manual page for ls." },
      { cmd: "man chmod", desc: "Read how chmod permissions work." },
    ],
  },
  info: {
    cmd: "info",
    name: "info - read hypertext documentation for a command",
    synopsis: "info COMMAND",
    description:
      "Displays detailed documentation and usage guidance for a command and opens its reference guide panel.",
    examples: [
      { cmd: "info grep", desc: "Open the documentation guide for grep." },
      { cmd: "info tar", desc: "Read documentation for a command." },
    ],
  },
  whatis: {
    cmd: "whatis",
    name: "whatis - display one-line manual page descriptions",
    synopsis: "whatis COMMAND...",
    description:
      "Prints a short, one-line summary of what a command does without opening the full manual page.",
    examples: [
      { cmd: "whatis pwd", desc: "Show a one-line explanation of pwd." },
      { cmd: "whatis chmod chown", desc: "Check brief summaries for chmod and chown." },
    ],
  },
  apropos: {
    cmd: "apropos",
    name: "apropos - search the manual page names and descriptions",
    synopsis: "apropos KEYWORD",
    description:
      "Searches all manual entries for KEYWORD and lists every command whose name or description matches. Great when you forget a command's name!",
    examples: [
      { cmd: "apropos directory", desc: "Find all commands related to directories." },
      { cmd: "apropos permission", desc: "Search for commands that manage permissions." },
    ],
  },
  alias: {
    cmd: "alias",
    name: "alias - define or display command shortcuts",
    synopsis: "alias [NAME='COMMAND']...",
    description:
      "Creates a custom shorthand command. Running 'alias' with no arguments lists all currently active aliases in your shell session.",
    examples: [
      { cmd: "alias ll='ls -la'", desc: "Create a shortcut 'll' that runs 'ls -la'." },
      { cmd: "alias", desc: "List all defined aliases." },
    ],
  },
  chmod: {
    cmd: "chmod",
    name: "chmod - change file mode bits (permissions)",
    synopsis: "chmod MODE FILE...",
    description:
      "Changes the access permissions of files or directories. MODE can be symbolic — combining who (u=user/owner, g=group, o=others, a=all), an operator (+, -, =), and permissions (r=read, w=write, x=execute) — or a 3-digit octal number (where 4=read, 2=write, 1=execute).",
    options: [
      { flag: "u / g / o / a", desc: "Target User (owner), Group, Others, or All" },
      { flag: "+ / - / =", desc: "Add, remove, or set exact permission bits" },
      { flag: "r (4), w (2), x (1)", desc: "Read (4), Write (2), and Execute/Enter (1) bits" },
    ],
    examples: [
      { cmd: "chmod u+x launcher.sh", desc: "Grant execute permission to the file's owner." },
      { cmd: "chmod 755 gate", desc: "Set rwxr-xr-x (owner full access, group/others read+execute)." },
      { cmd: "chmod 600 secret.key", desc: "Set rw------- (only owner can read and write)." },
    ],
  },
  chown: {
    cmd: "chown",
    name: "chown - change file owner and group",
    synopsis: "chown OWNER[:GROUP] FILE...",
    description:
      "Transfers ownership of a file or directory to a new user (and optionally a new group). Changing ownership of root-owned files requires 'sudo'.",
    examples: [
      { cmd: "sudo chown architect:architect chamber", desc: "Transfer ownership of chamber to architect." },
      { cmd: "sudo chown architect datafile.dat", desc: "Change the owner of datafile.dat to architect." },
    ],
  },
  umask: {
    cmd: "umask",
    name: "umask - display or set file mode creation mask",
    synopsis: "umask [MASK]",
    description:
      "Views or sets the default permission mask subtracted from newly created files (base 666) and directories (base 777). Without arguments, prints the current 4-digit octal mask (default 0022).",
    examples: [
      { cmd: "umask", desc: "Display the current file creation mask (e.g. 0022)." },
      { cmd: "umask 077", desc: "Mask out all group and other permissions for newly created files." },
    ],
  },
  sudo: {
    cmd: "sudo",
    name: "sudo - execute a command as the superuser (root)",
    synopsis: "sudo COMMAND [ARGS...]",
    description:
      "Runs a single command with elevated root administrator privileges, bypassing normal file permission restrictions.",
    examples: [
      { cmd: "sudo chown architect:architect locked_box", desc: "Use root authority to reclaim ownership of locked_box." },
      { cmd: "sudo chmod 755 locked_box", desc: "Unlock permissions on a root-protected directory." },
    ],
  },
  whoami: {
    cmd: "whoami",
    name: "whoami - print effective username",
    synopsis: "whoami",
    description:
      "Prints the username of the current user account ('architect', or 'root' when invoked via sudo).",
    examples: [
      { cmd: "whoami", desc: "Print your current username." },
      { cmd: "sudo whoami", desc: "Verify that sudo runs commands as 'root'." },
    ],
  },
  clear: {
    cmd: "clear",
    name: "clear - clear the terminal screen",
    synopsis: "clear",
    description:
      "Clears previous command output from the terminal scrollback view.",
    examples: [{ cmd: "clear", desc: "Wipe the terminal screen clean." }],
  },
  help: {
    cmd: "help",
    name: "help - display overview of available mainframe commands",
    synopsis: "help",
    description:
      "Prints a categorized cheat-sheet of all commands supported in the Shellbound terminal.",
    examples: [{ cmd: "help", desc: "Show the list of available commands." }],
  },
  hint: {
    cmd: "hint",
    name: "hint - reveal a hint for the current objective",
    synopsis: "hint",
    description:
      "Displays a helpful tip for your next uncompleted mission objective (note: using a hint deducts 100 points from the level score).",
    examples: [{ cmd: "hint", desc: "Request a hint for the current objective." }],
  },
  reset: {
    cmd: "reset",
    name: "reset - restore the current mission room to its starting state",
    synopsis: "reset",
    description:
      "Rebuilds the current mission's filesystem from scratch in case you deleted something important.",
    examples: [{ cmd: "reset", desc: "Reset the current level's filesystem." }],
  },
};
