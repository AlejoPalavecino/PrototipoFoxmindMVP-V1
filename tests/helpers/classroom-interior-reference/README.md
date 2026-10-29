# Classroom interior synthetic fixture

From the worktree, run:

```powershell
node tests/helpers/classroom-interior-reference/harness.mjs
node node_modules/next/dist/bin/next dev .test-artifacts/classroom-interior-reference/apps/web --webpack --hostname 127.0.0.1 --port 53196
```

Open `http://127.0.0.1:53196/classroom?mode=teacher`. Modes: `teacher`, `student`, `archived`, `empty`, `error`, `loading`. Uses real ClassroomView and Navbar with the existing `platform-polish/classroom-data.ts` in-memory port, cloned into the ignored scaffold. The synthetic client rejects classroom mutations, provider calls and uploads; fixture data resets on reload. No production API routes, environment files, database or account are used. It provides component and responsive QA, not authenticated E2E proof. The scaffold must be regenerated after changing fixture source, product `_app.tsx` imports or fixture data; product component/style junctions reflect edits directly.
