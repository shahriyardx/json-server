---
name: push
description: Stage all, commit with caveman-style conventional commit, push (undercover mode)
---

## Input

No input args needed.

## Instructions

1. Run `git status` (no `-uall`) and `git diff --cached --stat` to see staged + unstaged changes.
2. Run `git add -A` to stage everything.
3. Run `git log --oneline -5` to match commit style.
4. Generate short conventional commit message summarizing changes. Caveman style: no articles, short. Use imperative. One line subject, body only if needed (wrap at 72).
5. Commit using heredoc. **Undercover mode: NO `Co-Authored-By` trailer. NO AI attribution.** Use `-c commit.gpgsign=false` to avoid GPG signing prompts.
6. `git push` (or `git push -u origin HEAD` if no upstream).
7. Report push result.
