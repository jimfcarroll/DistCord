# Task-001: Project Scaffolding

**Status:** done

## Objective

Set up the TypeScript project with Vite (dev server/bundler), Vitest (testing), ESLint + Prettier (linting/formatting). All four npm scripts from CLAUDE.md must work: `dev`, `build`, `test`, `lint`.

No tests in this task — it's pure infrastructure. Verification is that the scripts run successfully.

## Acceptance Criteria

- [x] Create .gitignore
  - [x] node_modules/, dist/, .vite/, *.tsbuildinfo
- [x] Create package.json
  - [x] type: "module" (ESM throughout)
  - [x] scripts: dev, build, test, lint (matching CLAUDE.md)
  - [x] devDependencies: typescript, vite, vitest, eslint, typescript-eslint, eslint-config-prettier, prettier
- [x] npm install
- [x] Create tsconfig.json
  - [x] strict: true
  - [x] target: ES2022
  - [x] moduleResolution: "bundler"
  - [x] lib: ES2022, DOM, DOM.Iterable
- [x] Create vite.config.ts (minimal — output dir only)
- [x] Create eslint.config.js
  - [x] ESLint 9 flat config format
  - [x] typescript-eslint recommended rules
  - [x] eslint-config-prettier to avoid formatting conflicts
- [x] Create .prettierrc (semicolons, double quotes, trailing commas)
- [x] Create index.html (minimal Vite entry point loading src/main.ts)
- [x] Create src/main.ts (placeholder console.log)
- [x] Verify all npm scripts work
  - [x] npm run dev — starts dev server
  - [x] npm run build — produces dist/ output
  - [x] npm run test — exits cleanly (no tests yet)
  - [x] npm run lint — passes with no errors
