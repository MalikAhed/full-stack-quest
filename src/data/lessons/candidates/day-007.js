import { defineMarkdownLesson } from "../../../markdown/lesson-model.js";

export const LESSON_MARKDOWN = `<!-- step-id: git-ship-mission -->
# Git, ship, review

The profile page is not finished when it looks right on your computer. It is finished when its history explains the work, GitHub has the same commits, and a fresh clone contains everything needed to open the page.

[[term: Git | A version-control program that records chosen project states and lets you inspect their history.]] A [[term: repository | A project history managed by Git, normally stored as metadata alongside a working copy of the project files.]] is local unless you deliberately exchange its commits with another repository. GitHub is a hosting service for remote Git repositories; Git and GitHub are related, but they are not the same thing.

Today is a **terminal day**. You will type the commands yourself, read every result, and run \`git status\` after every command. The repetition is deliberate: these commands will eventually happen under mild pressure, so they need to become ordinary.

By the end of this three-hour session, you will be able to:

- trace a file through the working directory, staging area, and repository;
- predict what \`git status\`, \`git diff\`, and \`git diff --staged\` will reveal;
- create meaningful snapshot commits and read them with \`git log --oneline\`;
- connect a local repository to an empty GitHub repository and set its upstream;
- prove the remote copy is complete with a clone test in a different folder; and
- perform \`init → gitignore → add → commit → remote → push\` from a cold terminal without another tab.

:::warning Use a real terminal
This lesson page cannot run Git, inspect your filesystem, create a GitHub repository, or authenticate as you. Run every build command in a terminal opened in your actual profile-page folder. A successful lesson interaction is not evidence that a push worked; the GitHub page and fresh clone are the evidence.
:::

## Your three-hour route

| Time | Activity |
| --- | --- |
| **0:00–0:40** | Read [Pro Git, Chapters 1 and 2](https://git-scm.com/book/en/v2): Getting Started and Git Basics. Stop before Branching. |
| **0:40–1:30** | Version the profile page in meaningful commits and push it. |
| **1:30–1:40** | Break. |
| **1:40–2:00** | Clone into a different folder and inspect the fresh copy. |
| **2:00–3:00** | Review the week and perform the Sunday checkpoint aloud, standing, with no notes. |

:::remember The deadline that matters
The page gets pushed today even if it is ugly. This is a warmup, not the portfolio you will build later. **Ugly and shipped beats beautiful and local.**
:::

<!-- lesson-step -->
<!-- step-id: terminal-preflight -->
# Prepare the terminal, not the project

A [[term: terminal | A text interface where you run programs by typing commands.]] shows a prompt, waits for a command, and prints the program's output. Do not type the prompt symbols shown in documentation; type only the command.

In \`git commit -m "Add README"\`, \`git\` names the program, \`commit\` is its subcommand, \`-m\` is an option, and the quoted text is the option's value. Quotation marks keep a message containing spaces together as one argument.

Before initializing anything, open a terminal in the profile-page folder and establish where you are:

\`\`\`bash title=terminal-preflight.sh
pwd
ls
git --version
git config --global user.name
git config --global user.email
\`\`\`

- \`pwd\` prints the current directory. Confirm it is the folder containing your \`index.html\`.
- \`ls\` lists its visible contents. Confirm this is the profile page, not your home folder or a parent containing unrelated work.
- \`git --version\` proves the Git program is installed. If the command is missing, use the [official Git installation guide](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git), then reopen the terminal.
- The final two commands inspect the author identity Git will record in commits.

If the name or email is empty or wrong, configure it once with your own values:

\`\`\`bash title=configure-author.sh
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
\`\`\`

The \`--global\` setting applies to repositories for your user account. It is Git author metadata, not GitHub authentication. GitHub may require its own browser, credential-manager, personal-access-token, or SSH setup when you push. Follow the authentication instructions GitHub presents; never paste a secret into source files, the README, screenshots, or this lesson.

:::warning Check the target before init
\`git init\` writes a hidden \`.git\` directory in the current folder. If \`pwd\` or \`ls\` identifies the wrong folder, stop and navigate to the project before continuing.
:::

<!-- lesson-step -->
<!-- step-id: three-areas-model -->
# Draw Git's three areas

Put the keyboard aside for two minutes. On paper, draw three boxes and two arrows:

| Area | What it represents | What changes it | What inspects it |
| --- | --- | --- | --- |
| **Working directory** (working tree) | The files currently on disk that you edit and open in the browser. | Your editor, file tools, formatters, and generators. | \`git status\` and \`git diff\` |
| **Staging area** (index) | The exact file content proposed for the next commit. | \`git add <file>\` or \`git add .\` | \`git status\` and \`git diff --staged\` |
| **Repository** | The committed history stored in the hidden \`.git\` directory. | \`git commit\` | \`git log --oneline\` |

Label the first arrow **\`git add\`** and the second **\`git commit\`**:

\`working directory → staging area (index) → repository\`

“Moves” is useful muscle-memory shorthand, but no physical file leaves your project folder. More precisely:

1. \`git add\` copies the selected content as it exists *at that moment* into the index.
2. \`git commit\` records the index as the project snapshot for a new commit.
3. After the commit, the index remains present but matches the new commit, so a clean working tree has no difference among those versions.

That refinement explains a common surprise: if you stage a file and then edit it again, the file can have **both staged and unstaged changes**. The index still holds the earlier staged content; the working file holds the newer edit.

:::sequence
id: three-area-transition-order
title: Move one change into history
question: Put the state transitions in order after you edit index.html.
- [3] repository-snapshot | Run git commit so the staged tree becomes a repository snapshot
- [1] working-edit | Save the edit in the working directory
- [4] inspect-history | Run git log --oneline to inspect the new commit
- [2] stage-content | Run git add index.html to copy that content into the index
explanation: The edit begins in the working directory. git add captures it in the index, git commit records that staged tree, and git log reads the resulting history.
hint: Start where your editor writes the file; end where committed history is visible.
:::

<!-- step-id: initialize-and-observe -->
# Initialize, then believe status

Run this inside the profile-page folder:

\`\`\`bash title=initialize-repository.sh
git init -b main
git status
\`\`\`

\`git init\` creates the repository metadata. The \`-b main\` option names the initial branch \`main\`, matching the later push command. It does **not** commit the existing files. They remain working-directory files, and \`git status\` should report them as untracked.

If your installed Git does not accept \`-b\`, run plain \`git init\`, read the branch name in \`git status\`, and use the branch name GitHub shows in its push instructions. Do not guess between \`main\` and \`master\`.

[[term: untracked file | A working-directory file that is not in the current commit or staging area.]] does not mean “Git cannot see it.” Git sees it and reports it, but it will not enter a commit until you stage it.

For today's drill, use this loop after **every command**:

1. Run the intended command.
2. Run \`git status\`.
3. Read every heading and filename before the next command.

Do not replace the loop with a Git GUI during the first month. A GUI can be useful later, once its buttons describe state transitions you already understand.

:::true-false
id: init-does-not-commit
title: Predict the first status
question: Running git init inside a folder full of HTML and CSS automatically records those files in the first commit.
answer: false
explanation: git init creates repository metadata. Existing files are still untracked until git add stages them and git commit records a snapshot.
hint: Separate creating a repository from creating a commit.
:::

<!-- step-id: ignore-before-tracking -->
# Ignore files before they exist

A [[term: .gitignore | A repository file whose patterns identify intentionally untracked paths that Git should not offer for tracking.]] records a team decision: these local or generated files do not belong in the project history.

Create \`.gitignore\` in the project root with exactly these starter rules:

\`\`\`gitignore title=.gitignore
.DS_Store
node_modules/
.env
\`\`\`

- \`.DS_Store\` is operating-system metadata, not project source.
- \`node_modules/\` is generated dependency content that can later be recreated from dependency manifests.
- \`.env\` commonly contains machine-specific configuration and secrets. It must never be casually committed.

These paths may not exist yet. That is the point: create the safety boundary before the risky file appears.

Run the first focused stage:

\`\`\`bash title=stage-ignore-file.sh
git status
git add .gitignore
git status
git diff --staged
\`\`\`

The ignore file itself should appear under **Changes to be committed**. The ignored paths should not. A rule only affects intentionally untracked content; adding \`.env\` to \`.gitignore\` later does not erase a secret that was already committed. If that ever happens, stop and treat it as a credential incident rather than assuming ignore rules repaired history.

:::remember Focused before broad
\`git add <file>\` stages one named path. \`git add .\` stages changes beneath the current directory, including modifications and deletions. Always inspect \`git status\` and \`git diff --staged\` before committing a broad selection.
:::

<!-- lesson-step -->
<!-- step-id: diff-boundaries -->
# Ask each diff one precise question

\`git status\` tells you *which paths* differ. A diff shows the changed lines across one boundary.

| Command | Comparison | Question it answers |
| --- | --- | --- |
| \`git diff\` | Working directory versus staging area | What have I changed but not staged? |
| \`git diff --staged\` | Staging area versus the current commit | What am I about to commit? |

Before the first commit, \`git diff --staged\` compares staged content with an empty starting point. After commits exist, it compares the proposed next snapshot with the current one.

An untracked file is in neither comparison yet, so plain \`git diff\` does not print its full contents. Use \`git status\` to discover untracked paths, inspect the file itself, and stage it only if it belongs in the project.

Trace this realistic sequence:

1. Save a new sentence in \`README.md\`.
2. Run \`git add README.md\`. The sentence is now in both the working file and index.
3. Save a second sentence in \`README.md\` without adding again.
4. Run \`git status\`. The same path can appear staged and unstaged.
5. Run \`git diff --staged\`. It shows the first staged version relative to the current commit.
6. Run \`git diff\`. It shows the second edit relative to the staged version.

The durable rule is not “run both because Git is confusing.” It is: **each command compares different states**.

:::mcq
id: staged-then-edited-prediction
title: Predict both diff views
question: You stage style.css, then change its brand color without staging again. Where does the newest color change appear?
- [ ] staged-only | Only in git diff --staged
- [x] unstaged-diff | In git diff, because the newest edit exists in the working file but not the index
- [ ] log-only | Only in git log --oneline
- [ ] nowhere | Nowhere until a commit exists
explanation: git add captured the earlier file content. The later color edit differs between the working directory and index, so git diff reveals it.
hint: Ask whether the latest edit happened before or after git add copied content into the index.
:::

<!-- step-id: snapshot-not-diff -->
# A commit is a snapshot with a parent

Run a commit only after the staged diff tells one coherent story:

\`\`\`bash title=first-commit.sh
git commit -m "Add project ignore rules"
git status
git log --oneline
\`\`\`

Conceptually, a commit stores:

- a pointer to the complete staged tree—the snapshot of tracked project paths at that moment;
- a pointer to its parent commit, except for the first commit, which has no parent;
- author and committer metadata; and
- the commit message.

Git can store content efficiently and can *display* differences between snapshots, but the commit's model is a snapshot, not a patch that must be replayed from the beginning. This distinction is why later history and branching make sense: each commit identifies a whole project state and links backward to its parent.

:::mcq
id: commit-content-boundary
title: Decide what enters the snapshot
question: index.html is staged, style.css has an unstaged edit, and notes.txt is untracked. You run git commit. What does the new commit record?
- [ ] every-file | The current contents of all three working-directory files
- [x] staged-tree | The staged index.html content and the staged versions of other tracked paths; the unstaged and untracked content stays outside this commit
- [ ] diff-only | Only a text patch with no project snapshot
- [ ] notes-only | Only untracked files, because Git discovers them during commit
explanation: git commit records the tree prepared in the staging area. Unstaged edits and untracked files remain in the working directory for later decisions.
hint: The commit boundary is the index, not every file visible in the folder.
:::

<!-- step-id: meaningful-commit-story -->
# Make the log read like the build

A commit subject should describe one coherent change in **imperative mood**, as though completing the phrase “This commit will…”. Keep the subject at 50 characters or fewer.

| Weak subject | Better subject | Why |
| --- | --- | --- |
| \`added stuff\` | \`Add responsive project card grid\` | Names a concrete outcome and uses imperative mood. |
| \`final final v2 REAL\` | \`Fix mobile card overflow\` | Explains the change instead of your anxiety. |
| \`updates\` | \`Add contact form labels\` | Lets a reviewer scan history without opening every commit. |

The week's target story is at least these five meaningful steps:

\`\`\`text title=target-history.txt
Add semantic HTML structure for profile page
Add base typography and color tokens
Add flexbox navigation bar
Add responsive project card grid
Add contact form and README
\`\`\`

Use those exact subjects only when the staged content actually tells that story. Git cannot recover the order of work completed before \`git init\`. If the page already exists as one finished working tree, do not create empty commits or write false messages. Make at least five honest units from real content and remaining work—for example: ignore rules, HTML, stylesheet and assets, README, screenshot, and any verified accessibility or overflow fix.

For each unit, repeat the whole evidence loop:

\`\`\`bash title=commit-loop.sh
git status
git diff
git add <file>
git status
git diff --staged
git commit -m "Add one coherent outcome"
git status
git log --oneline
\`\`\`

Replace \`<file>\` with a real path; the angle brackets are documentation placeholders, not characters to type. Use \`git add .\` only when every change under the current folder belongs to the same commit. If one file contains multiple unrelated edits, \`git add -p\` can stage selected patches, but today's minimum is confident use of \`git add <file>\`.

## Write the README and add its screenshot

Create \`README.md\` with:

1. what the page is;
2. the HTML and CSS ideas you used; and
3. a screenshot of the rendered page.

Three clear sentences are enough. Save the screenshot inside the project, reference it with Markdown such as \`![Profile page screenshot](screenshot.png)\`, then stage both the image and README. Open the README on GitHub after pushing to confirm the image path and filename capitalization are correct.

:::warning Let the diff name the commit
If \`git diff --staged\` does not support the commit subject, either stage the missing change, remove unrelated staged content, or rewrite the subject. Do not make history perform a story the snapshot does not contain.
:::

<!-- lesson-step -->
<!-- step-id: remote-and-upstream -->
# Connect the local history to GitHub

Your local repository and a GitHub repository are separate stores. A [[term: remote | A saved name and URL for another Git repository that this repository can exchange commits with.]] tells Git where the other store is; it does not automatically keep them synchronized.

On GitHub, create a **new empty repository**. Because the local project already has commits, do not ask GitHub to add a README, \`.gitignore\`, or license during creation. Those would create a separate initial history and make this first push harder to reason about.

Copy the repository URL GitHub shows, then run:

\`\`\`bash title=connect-and-push.sh
git remote add origin <repository-url>
git status
git remote -v
git status
git push -u origin main
git status
\`\`\`

Replace \`<repository-url>\` with the HTTPS or SSH URL from your GitHub page.

- \`origin\` is the conventional local nickname for that URL. It is not a special server and can be named differently.
- \`git push\` sends reachable commits and updates the named branch on the remote when the server accepts the update.
- \`-u\` is short for \`--set-upstream\`. On a successful push, it records that local \`main\` tracks \`origin/main\`.
- The upstream lets later argument-free commands such as \`git push\` know the default remote branch for this local branch. It is a relationship in Git configuration, not a second upload.

Open the GitHub repository and verify the latest commit subject and project files. A success message in the terminal is useful; the remote page is independent confirmation.

:::mcq
id: upstream-meaning-check
title: Explain the -u option
question: What new information does a successful git push -u origin main record locally?
- [ ] credentials | It stores your GitHub password inside the repository
- [ ] auto-commit | It commits every future working-directory edit automatically
- [x] tracking | It associates local main with origin/main as its upstream, so later push or pull commands can infer that branch
- [ ] clone | It creates a second working directory on your computer
explanation: The first push transfers commits and -u records tracking information between the local and remote branches. It does not store source edits or credentials.
hint: Expand -u to --set-upstream and ask what future argument-free commands need to infer.
:::

<!-- step-id: first-push-debugging -->
# Debug the first push from evidence

Do not paste random repair commands from a search result. Read the first meaningful error and localize it.

| Symptom | Likely cause | Smallest useful check |
| --- | --- | --- |
| \`src refspec main does not match any\` | There is no local \`main\` commit to push, often because no commit exists or the branch has a different name. | Run \`git status\` and \`git log --oneline\`. Read the branch name. |
| \`remote origin already exists\` | This repository already has a remote with that nickname. | Run \`git remote -v\`; do not add a duplicate. |
| Authentication or permission failure | GitHub did not accept the current identity for that repository URL. | Confirm the copied URL, signed-in account, repository ownership, and GitHub's current authentication instructions. |
| Push rejected because the remote contains work | The GitHub repository was not empty or someone else added a commit. | Inspect the GitHub history. For today's controlled exercise, create the intended empty repository instead of improvising merge commands. |
| GitHub lacks a stylesheet or image | The file was not committed, was ignored, or its path/capitalization differs. | Compare \`git status\`, \`git log --oneline\`, and the GitHub file list. |

Branching, merging, and merge conflicts belong on Day 21. Do not turn a deliberately empty-repository exercise into an accidental merge lesson.

:::mcq
id: missing-stylesheet-diagnosis
title: Locate a missing remote file
question: The local page is styled, but GitHub shows index.html and no style.css. Which evidence should you inspect first?
- [ ] browser-cache | Clear every browser cache before looking at Git
- [x] git-state | Run git status and inspect the commit/file list to determine whether style.css was staged and committed
- [ ] reset-hard | Run git reset --hard immediately
- [ ] rebase | Rebase the repository because every missing file is a history conflict
explanation: Push sends committed Git objects, not arbitrary files visible on your disk. First determine whether style.css entered a commit; then push that commit if needed.
hint: Ask which Git area the file reached before the push.
:::

<!-- step-id: clone-test -->
# Prove it with a fresh clone

A push can succeed while the project is incomplete because Git faithfully transferred the commits you made. The clone test asks a stronger question: **does the remote repository contain everything a new developer receives?**

Choose a safe test folder that is not inside the original project. Then run:

\`\`\`bash title=fresh-clone-test.sh
cd /path/to/a/separate-test-folder
git clone <repository-url> profile-page-check
cd profile-page-check
git status
git log --oneline
\`\`\`

Use a real safe path and the copied repository URL. Git requires the destination folder to be absent or empty.

Open \`index.html\` from this fresh folder in a browser. Check all of the following:

- the stylesheet loads;
- every image loads, including the README screenshot;
- navigation links and form controls still work;
- the project has no unexpected horizontal scrollbar at 360px;
- \`git status\` reports a clean working tree; and
- \`git log --oneline\` reads like the story of the build.

If something is missing, return to the **original** project, inspect its three areas, add the missing tracked content, create a truthful fix commit, push, and clone again into a new empty destination. Do not patch only the clone: that would prove neither that the original nor remote was fixed.

:::true-false
id: clone-test-purpose
title: Interpret a successful clone test
question: If the page works from a fresh clone, that is evidence the required files and commits exist in the remote repository rather than only in the original working directory.
answer: true
explanation: The fresh folder is reconstructed from the remote Git repository. Files that existed only as untracked or uncommitted local content would not arrive in that clone.
hint: Identify which source supplies the fresh folder.
:::

<!-- step-id: pages-timebox -->
# Optional: publish with a hard cap

If the push and clone test are complete, you may spend **at most 15 minutes** enabling GitHub Pages in the repository settings and obtaining a live URL. Use GitHub's [current Pages quickstart](https://docs.github.com/en/pages/quickstart) because the settings UI can change.

This is optional. Day 28 is the planned first deployment milestone. If Pages threatens to consume an hour, stop at 15 minutes: the Git repository and verified clone are today's non-negotiable result.

:::remember External state is real state
Repository creation, authentication, push acceptance, and Pages settings depend on your GitHub account and network. This lesson cannot mark them successful. Record the repository URL, inspect its commit list, and keep the fresh-clone folder as your evidence.
:::

<!-- lesson-step -->
<!-- step-id: deliberately-deferred-git -->
# Know what is deferred

Today's narrow command surface is intentional. Do not front-run later lessons and form half-models under deadline pressure.

- **Day 21:** branches, \`merge\`, and merge conflicts.
- **Awareness only:** \`rebase\`, \`cherry-pick\`, \`reflog\`, \`stash\`, and \`bisect\` exist. The one safety rule for now is: **rebase rewrites history; do not rebase shared branches.**
- **When you need to undo:** learn the difference among hard, soft, and mixed reset. Do not experiment with \`git reset --hard\` today.
- **After terminal muscle memory:** GUI clients such as GitHub Desktop and the VS Code Source Control panel become reasonable choices. Use the terminal for the first month so you know what their buttons do.
- **Later or when a project requires them:** signed commits, hooks, submodules, and Git Large File Storage (LFS).

These are retrieval hooks, not hidden homework. Today's goal is to control the three areas and ship one small repository safely.

<!-- lesson-step -->
<!-- step-id: sunday-checkpoint -->
# Sunday checkpoint: six answers, no notes

Close the lesson, browser tabs, and notes. Stand up. Record yourself on your phone once; vague language becomes audible. Answer all six prompts aloud.

1. **“What happens when you type a URL and press Enter?”** Speak for 90 seconds and end with the browser painting pixels. Then define an origin exactly.
2. **“What's the difference between 401 and 403? Between POST and PUT?”** Give one sentence each. Then answer: a user signs up with an email that already exists—what status do you return, and why not 400?
3. **“Why is a button different from a div with a click handler?”** Give at least two reasons. One must not be about accessibility.
4. **“In Flexbox, what does justify-content do?”** Then explain what it does with \`flex-direction: column\` and whether the property belongs on the parent or child.
5. **“Grid or Flexbox—how do you choose?”** Answer in one sentence. Then explain \`minmax(250px, 1fr)\` token by token.
6. **“What are the three places a file can live in Git, and what moves it between them?”** Then answer: is a commit a snapshot or a diff?

Do not open the calibration key until you have attempted every answer.

:::reveal Checkpoint calibration key
1. A strong URL-to-pixels answer traces URL parsing, DNS, connection and TLS for HTTPS, HTTP request, server work, HTTP response, parsing dependencies, layout, and paint. An origin is **scheme + hostname + port**.
2. \`401\` means valid authentication evidence is missing or rejected; \`403\` means the server recognizes the request's identity or context but refuses the action. \`POST\` submits to a target and commonly creates a new resource; \`PUT\` replaces the named target and is idempotent. A duplicate unique email is \`409 Conflict\` because the request conflicts with current resource state; \`400\` is only a generic malformed/invalid-request answer and loses that specific meaning.
3. A real button has native keyboard and focus behavior, an accessible role, and browser-managed disabled behavior. The non-accessibility reason can be that a button participates in forms and a submit button can submit without custom JavaScript; a div has no native button or form behavior.
4. \`justify-content\` distributes items along the main axis and belongs on the flex parent. In a column, that main axis normally runs vertically.
5. Use Grid for an imposed two-dimensional row-and-column layout; use Flexbox for content flowing in one dimension. \`minmax\` sets a range: \`250px\` is the minimum track size, and \`1fr\` lets the track take one share of remaining grid space as its maximum.
6. Working directory → staging area/index → repository. \`git add\` captures working content in the index; \`git commit\` records the staged tree. A commit is a full-tree snapshot linked to its parent, not merely a diff.
:::

If an answer is mushy, write down only its number. Fix that gap for 15 minutes Monday morning before opening TypeScript. Do not restart the whole week.

<!-- lesson-step -->
<!-- step-id: fall-behind-rules -->
# If the week ran long, cut deliberately

Cut in this order and stop when you are back on schedule:

1. Reduce Flexbox Froggy and Grid Garden to 20 minutes each.
2. Drop Day 4's specificity duel and DevTools archaeology, but keep \`box-sizing\`, the base stylesheet, and specificity ordering.
3. Test two widths—360px and 1280px—instead of three.
4. Reduce Day 3 accessibility work to labels and the keyboard Tab test.
5. Build three project cards instead of six.
6. Skip Day 1's video and keep the MDN reading.

Never cut:

- **Day 2: HTTP.** It is the foundation for the backend, APIs, authentication, and deployment work later in the course. If only four hours remain in the whole week, spend them there.
- **Day 7: Git and push.** It turns local practice into inspectable work.

If you have only two days total, do Day 2 and Day 7 and push whatever exists.

:::warning Stop polishing when the deadline arrives
The common failure is not misunderstanding one Flexbox property. It is nudging padding for days, deciding the page is not worthy of a push, and starting Week 2 late. Ship the warmup at today's quality, record real gaps, and continue.
:::

<!-- lesson-step -->
<!-- step-id: git-day-finish-line -->
# Day 7 finish line

You are done when all of this is true:

- the project has \`.gitignore\` with \`.DS_Store\`, \`node_modules/\`, and \`.env\`;
- \`git log --oneline\` contains at least five meaningful, honest commits and reads like a story;
- you can explain what \`git diff\` and \`git diff --staged\` compare;
- you can say “a commit is a tree snapshot plus a parent pointer,” with the first commit as the no-parent exception;
- GitHub shows the files and latest commit you intended to push;
- a fresh clone in a separate folder opens correctly with no missing stylesheet or image; and
- from a cold terminal in a new project, you can perform \`init → gitignore → add → commit → remote → push\` without opening another tab.

![Git state recap: the working tree with app.css v2 flows through git add to a staging index that still has app.css v1, then git commit records a snapshot linked to its parent, git push sends committed history to the remote, and git clone reconstructs a separate fresh folder; comparison brackets place git diff between working and staging and git diff --staged between staging and the current commit.](assets/lessons/day-007/git-state-to-clone-recap.webp)

**How to read this recap:** Follow the solid arrows from the folder you edit to the separate clone that proves the remote. Then scan the two brackets: each diff command compares the states at its endpoints, while the two \`app.css\` cards show that working and staged content can differ at the same moment.

Use these primary references when an exact command or current GitHub screen needs checking:

- [Pro Git: Getting a Git Repository](https://git-scm.com/book/en/v2/Git-Basics-Getting-a-Git-Repository)
- [Pro Git: Recording Changes](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)
- [Pro Git: Viewing Commit History](https://git-scm.com/book/en/v2/Git-Basics-Viewing-the-Commit-History)
- [Pro Git: Working with Remotes](https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes)
- [Git's gitignore reference](https://git-scm.com/docs/gitignore)
- [GitHub: add locally hosted code](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)
- [GitHub: clone a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)

:::remember Carry this model into every repository
Your editor changes the working tree. \`git add\` prepares the index. \`git commit\` records that staged tree as a snapshot linked to its parent. \`git push\` transfers committed history; it does not rescue uncommitted local files.
:::

Tomorrow, Week 2 shifts from layout typing to JavaScript reasoning with javascript.info. Hoisting, \`this\`, and closures are the first genuinely deep material. Keep the Day 2 habit: **predict, then run, then explain the mismatch**. After today's push, rest. The buffer is part of the plan.`;

export default defineMarkdownLesson({
  status:"published",
  title:"Git: turn local work into shipped history",
  summary:"Control Git's three areas, create honest snapshot commits, push to GitHub, and prove the remote with a fresh clone.",
  outcome:"Trace file state, inspect staged and unstaged changes, build a story-like commit history, set an upstream, and ship a verified repository.",
  mode:"Read → version → push → clone → review",
  mission:"Make the Week 1 profile page real by turning a working folder into inspectable history that survives a fresh clone.",
  duration:"3 hours",
  level:"Complete beginner",
  reward:50,
  passingScore:80,
}, LESSON_MARKDOWN, { day:7 });
