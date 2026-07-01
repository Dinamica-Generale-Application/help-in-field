# Tech Stack

## Core

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode, ES2022 target) |
| Framework | React 19 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite` plugin) |
| Routing | React Router DOM 7 |
| State | Zustand 5 (with `persist` middleware → localStorage) |
| Testing | Vitest 4 + @testing-library/jest-dom + jsdom |

## Key Libraries

- **UI primitives**: Radix UI (dialog, dropdown-menu, label, popover, select, slot, toast)
- **Icons**: lucide-react
- **Class utilities**: clsx + tailwind-merge (combined via `cn()` helper in `src/lib/utils.ts`)
- **Map**: Leaflet + react-leaflet (lazy-loaded)
- **PDF export**: html2pdf.js (lazy-loaded)
- **CSS utility**: class-variance-authority (CVA) for variant-based component styles

## Path Alias

`@/` maps to `src/` — configured in both `vite.config.ts` and `tsconfig.json`.

## TypeScript Config

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noUncheckedIndexedAccess: true`
- `noFallthroughCasesInSwitch: true`

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server on port 3000 |
| `npm run build` | Type-check (`tsc -b`) then Vite production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run Vitest in single-run mode (not watch) |

## Storage

All persistence uses browser `localStorage`. No backend API. Zustand stores serialize to localStorage via the `persist` middleware with custom quota-handling storage adapter.

## Deployment

Static site — the `dist/` folder is deployed as-is to any static host.
