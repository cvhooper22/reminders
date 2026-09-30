# Reminders

## Git: read-only

Never commit, push, or otherwise change git state. Only read operations are allowed
(`git status`, `git diff`, `git log`, `git show`, `git blame`, `git branch --list`, etc.).

Not allowed, even if asked to "wrap up" or "save the work": `git add`, `git commit`,
`git push`, `git stash`, `git checkout`/`switch` (branch changes), `git reset`, `git rebase`,
`git merge`, `git tag`, creating or deleting branches, opening PRs. If a task seems to need
one, say so and let the user run it.

This rule stays until the user removes it from this file.
