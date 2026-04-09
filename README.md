# Charge Nurse Assigner

A mobile PWA that helps a charge nurse distribute patients to RNs on an L-shaped
floor. Assignments are balanced by workload (H/M/L criticality) and kept
geographically contiguous to minimize walking.

## Features

- Tap-to-edit census with list and L-shape map views
- Auto-distribute patients into contiguous zones balanced by workload score
- Manual room moves between RNs
- Admission flow with top-3 RN recommendations (distance + workload + mix)
- Fully offline PWA — works on a phone home screen like a native app
- No accounts, no backend, no patient data stored

## Tech

React 18, Vite, TypeScript, react-router-dom, vite-plugin-pwa, Vitest,
Playwright. Deployed to GitHub Pages via GitHub Actions.

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run test:e2e   # end-to-end smoke test
npm run build      # production build to dist/
```

## Deploy

Push to `main` — the GitHub Actions workflow at `.github/workflows/deploy.yml`
runs tests, builds, and publishes to GitHub Pages. The live URL is
`https://<user>.github.io/<repo-name>/`.

The `base` path in `vite.config.ts` must match the repo name for assets to
resolve correctly. It currently defaults to `/AcuityFlow/`.

## Documentation

- Design spec: `docs/superpowers/specs/2026-04-08-charge-nurse-assigner-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-08-charge-nurse-assigner.md`
