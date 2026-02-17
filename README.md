# Smart Paste Hub

Smart Paste Hub is an Electron + React clipboard formatter app based on `docs/` specifications.

## Open Source Standards

This repository now includes baseline project governance:

- License: `LICENSE`
- Contribution guide: `CONTRIBUTING.md`
- Code of conduct: `CODE_OF_CONDUCT.md`
- Security policy: `SECURITY.md`
- Support channels: `SUPPORT.md`
- Community templates: `.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md`
- Security automation: CodeQL, dependency review, and Dependabot workflows

## Current Status

- Desktop app scaffold is functional
- Core cleaning pipeline is implemented
- Settings/History/Snippets pages are connected to IPC/database
- Quick clean workflow is available in Settings
- Unit tests, lint, typecheck, build, and E2E smoke test pass

## Run (Normal Node.js)

```bash
npm install
npm run dev:desktop
```

If you want to run each process manually:

```bash
npm run dev:renderer -- --host 127.0.0.1 --port 5173 --strictPort
npm run dev:main
npm run dev:electron
```

## Run (Portable Node 20 in this repository)

```bash
export PATH="$PWD/.tools/node-v20.19.0-win-x64:$PATH"
./.tools/node-v20.19.0-win-x64/node.exe ./.tools/node-v20.19.0-win-x64/node_modules/npm/bin/npm-cli.js install
./.tools/node-v20.19.0-win-x64/node.exe ./.tools/node-v20.19.0-win-x64/node_modules/npm/bin/npm-cli.js run dev:desktop
```

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

## Recommended Contributor Flow

1. Create branch: `feat/<name>` or `fix/<name>`
2. Implement change and tests
3. Run quality checks
4. Open PR and complete checklist

## Security Notes

- Do not commit secrets in any file.
- Use private reporting channel in `SECURITY.md` for vulnerabilities.
- IPC and desktop integrations should be validated and least-privilege.

## Key Paths

- Desktop main process: `src/main/index.ts`
- Renderer app shell: `src/renderer/App.tsx`
- Core cleaning engine: `src/core/cleaner.ts`
- Security scanner/masking: `src/security/`
- SQLite schema/init: `src/main/db.ts`
