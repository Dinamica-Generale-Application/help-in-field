# Project Structure

Architecture based on [Bulletproof React](https://github.com/alan2207/bulletproof-react) — feature-driven modular structure with co-located code, clear boundaries between features, and shared infrastructure in top-level folders.

```
src/
├── app/               # App shell: provider, router, route definitions
│   ├── index.tsx      # App component (composes provider + router)
│   ├── provider.tsx   # Global providers (ErrorBoundary, etc.)
│   ├── router.tsx     # BrowserRouter with all route declarations
│   └── routes/        # App-level routes (404, etc.)
├── components/        # Shared (non-feature-specific) components
│   ├── errors/        # ErrorBoundary
│   ├── layouts/       # AppLayout (shell with nav)
│   └── ui/            # Reusable UI primitives
├── config/            # App-wide constants (rates, limits)
├── features/          # Feature modules (see below)
├── hooks/             # Shared custom hooks
├── lib/               # Third-party wrappers (cn utility, html2pdf)
├── stores/            # Shared Zustand stores (if any)
├── testing/           # Test setup and helpers
├── types/             # Shared TypeScript types and storage keys
└── utils/             # Pure utility functions (format, storage, image, IDs)
```

## Feature Module Pattern

Each feature lives in `src/features/{name}/` and follows this internal structure:

```
features/{name}/
├── api/           # Data access layer (if applicable)
├── components/    # Feature-specific React components
├── hooks/         # Feature-specific custom hooks
├── routes/        # Route page components (one per route)
├── stores/        # Zustand stores scoped to this feature
├── types/         # Feature-specific TypeScript types
└── utils/         # Feature-specific utility functions
```

Not every feature needs all subfolders — only create what's needed.

## Current Features

- `reports/` — Core CRUD for intervention reports (list, detail, new, edit)
- `map/` — Leaflet map view of intervention locations
- `settings/` — User preferences (operator name, rates, etc.)

## Conventions

- **Route components** are named `{Feature}{Action}Route` (e.g., `ReportListRoute`, `ReportEditRoute`)
- **Store files** are named `{entity}Store.ts` with a matching `.test.ts`
- **Path alias**: always import with `@/` prefix (e.g., `@/features/reports/stores/reportStore`)
- **Lazy loading**: heavy dependencies (map, PDF) are lazy-loaded via `React.lazy()` or dynamic `import()`
- **Co-located tests**: test files sit next to the file they test (`*.test.ts` / `*.test.tsx`)

## Legacy Code

The `old/` folder contains the previous React Native (Expo) implementation. It is kept for reference only and is not part of the build.
