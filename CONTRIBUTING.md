# Contributing

Thanks for contributing to Smart Paste Hub.

## Development Setup

1. Fork and clone repository.
2. Install dependencies: `npm install`
3. Run checks before opening PR:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`

For desktop development:

- `npm run dev:renderer` (renderer)
- `npm run dev:main` (main process watcher)
- `npm run dev:electron` (desktop shell)

Or use one command: `npm run dev:desktop`.

## Branch and Commit Guidelines

- Branch naming:
  - `feat/<short-name>`
  - `fix/<short-name>`
  - `docs/<short-name>`
- Commit style (Conventional Commits):
  - `feat: add clipboard template variable parser`
  - `fix: handle clipboard fallback on restricted browsers`
  - `docs: update desktop setup instructions`

## Pull Request Requirements

- Keep PR scope focused and atomic.
- Add/update tests for behavior changes.
- Update docs when user-facing behavior changes.
- Ensure CI is green before requesting review.
- Fill PR template checklist fully.

## Coding Standards

- TypeScript strict mode compliance.
- No `as any`, no `@ts-ignore`.
- Avoid empty catch blocks.
- Prefer explicit error handling with safe fallback.

## Review Expectations

- Maintainers review for correctness, security, and maintainability.
- Requested changes should be addressed in follow-up commits.
