# Repository instructions

## Branches and publishing

- Use `proto` for development and ordinary commits and pushes.
- Do not push to `master` unless the user explicitly authorizes that specific push. Authorization for the initial publication is not standing permission for later pushes.
- Do not merge `proto` into `master`, change the default branch, or force-push without explicit user authorization.
- Before pushing, check the current branch, remote URL, and staged files. Push the intended branch explicitly.
- Keep `.env`, credentials, SQLite databases, `node_modules`, and build output out of commits.

## Development

- Read `README.md` and `docs/DEPENDENCIES.md` for setup and provider explanations.
- Cloud tasks already run in an isolated environment. Use the existing checkout; do not create a Git worktree unless the user requests one.
- Do not manually edit installed packages or generated Prisma files inside `node_modules`. Change application source or the Prisma schema, then use the documented generation commands.
- Use the lockfile with `npm ci`. Preserve TLS and package integrity verification.
- Metadata credentials are optional. Twitch credentials belong only to IGDB authentication; HowLongToBeat does not use them.
- Run checks appropriate to the change. For application changes: `npm run build`; with a server running, `npm run test:api` exercises persistence and validation.
