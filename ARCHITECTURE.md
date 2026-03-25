# Architecture

This document describes the actual current state of the SeeingwithHand codebase. It supersedes `REFACTORING_SUMMARY.md` (deleted).

---

## Overview

A Vite + React + TypeScript single-page application. The client is the only runtime — there is no SSR. All persistent data lives in Supabase.

**Entry point:** `src/main.tsx`  
**Build tool:** Vite 5 + SWC  
**Styling:** Tailwind CSS + Radix UI primitives (`src/components/ui/`)  
**State:** React context (`ApplicationContext`) — one context system  
**Storage:** Supabase (canvas annotations, audio recordings, session metadata, survey responses)

---

## Routing

Defined entirely in `src/main.tsx` using React Router v6.

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `GalleryPage` | Image gallery and session browser |
| `/gallery` | `GalleryPage` | Alias for `/` |
| `/session/:imageId/:sessionId` | `SessionPage` | Active recording / session playback |

All routes are wrapped in `ErrorBoundary` components.

---

## Page Components

### `GalleryPage` (`src/GalleryPage.tsx`)
Renders the two-panel gallery layout via `GalleryLayout`. Left panel: image catalogue with sessions. Right panel: detail view, hover/click driven.

Key child components:
- `GalleryCataloguePanel` — scrollable image list with session variants
- `GalleryDetailPanel` — detail/prepare view; hosts the "Start Seeing Session" CTA

### `SessionPage` (`src/SessionPage.tsx`)
Wraps everything in `ApplicationProvider`. Reads `imageId` and `sessionId` from URL params. Conditionally renders:
- `home` (the main recording interface) during an active session
- `AmbienceSurvey` after "Stop Recording" is pressed
- `SessionSurveyPage` for standalone survey access

---

## State Management

**One context system: `ApplicationContext`** (`src/context/ApplicationContext.tsx`)

Provides:
- `ApplicationProvider` — wraps `SessionPage` tree
- `useApplication()` — primary hook for all session/annotation state
- `useAnnotations()` — compatibility alias → delegates to `useApplication`
- `useSession()` — compatibility alias → delegates to `useApplication`

The context manages: active tool, annotations array, session recording state, audio state, and session metadata.

> **Note:** `AnnotationContext.tsx` and `SessionContext.tsx` were the original split-context design. Both have been deleted. `ApplicationContext` is the only context in the codebase.

---

## Canvas and Drawing

### `AnnotationCanvas` (`src/components/AnnotationCanvas.tsx`)
The single, monolithic canvas component (~1565 lines). Handles:
- Image loading and scaling
- All drawing tools: point, line, frame, area, freehand, hover, select, group
- Pointer event handling and coordinate transformation
- Recording integration with `ApplicationContext`

Imported by `home.tsx`. This is the active canvas implementation.

> **Note:** A split refactor (`AnnotationCanvasRefactored`, `CanvasRenderer`, `InputHandler`, `PerformanceOptimizer`) was started but not completed and has been deleted. A proper refactor is planned as a separate effort.

---

## Replay Logic

Extracted pure functions live in `src/lib/replayUtils.ts`:

| Function | Purpose |
|----------|---------|
| `sortAnnotationsByTime(annotations)` | Returns a new array sorted ascending by timestamp |
| `computeReplayBaseTime(sorted, sessionStartTime)` | Determines t=0 for playback |
| `computeTotalDuration(sorted, replayBaseTime)` | Duration from base to last stroke |
| `getAnnotationsAtTime(sorted, replayBaseTime, currentTime)` | Filters strokes visible at a given playback time |

`SessionReplay` (`src/components/SessionReplay.tsx`) calls these functions to drive its animation loop.

---

## Utility Libraries

| File | Exports |
|------|---------|
| `src/lib/utils.ts` | `cn`, `formatTimeGap`, `formatCoordinates`, `formatFreehandTrace`, `processTracesForDisplay`, `generateId`, `debounce`, `calculateImageScaling`, `imagePointToDisplay`, `displayPointToImage`, `createCoordinateTransform` |
| `src/lib/imageProcessing.ts` | `createVisualization`, `drawAnnotations` |
| `src/lib/replayUtils.ts` | `sortAnnotationsByTime`, `computeReplayBaseTime`, `computeTotalDuration`, `getAnnotationsAtTime` |
| `src/lib/supabase.ts` | Supabase client singleton |
| `src/lib/svgExporter.ts` | SVG export utilities |
| `src/lib/cn.ts` | Class name helper (re-export) |

---

## Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useAudioRecorder.ts` | Manages MediaRecorder for voice narration during sessions |

---

## Data

- **Images:** `public/images/` (static files) + `public/images/images.json` (metadata: title, caption, source, upload_date, display_order)
- **Sessions, annotations, audio, survey responses:** Supabase (see `supabase-schema.sql`)
- **Config:** `src/config/appConfig.ts`

---

## Testing

### Unit tests — `pnpm test`
Vitest 2, jsdom environment. Test files in `src/__tests__/`.

| File | Coverage |
|------|---------|
| `utils.test.ts` | `formatTimeGap`, `formatCoordinates`, `calculateImageScaling`, coordinate transforms |
| `sessionReplay.test.ts` | All four `replayUtils` functions (ordering, base time, duration, time filtering) |
| `imageProcessing.test.ts` | `drawAnnotations` with mocked canvas context |

**50 tests, all passing.**

### E2E tests — `pnpm test:e2e`
Playwright 1.x, Chromium only. Test files in `tests/`.

| File | Coverage |
|------|---------|
| `gallery.spec.ts` | Page load, panel visibility, hover interaction, screenshot baseline |
| `session.spec.ts` | Canvas visibility, start/stop flow, stroke drawing, survey appearance |
| `replay.spec.ts` | CO-23 regression: replay snapshots at t=0, t=1s, t=3s after recording |
| `visual-regression.spec.ts` | Full-page screenshot baselines for gallery and session views |

Baseline snapshots: `tests/visual-regression.spec.ts-snapshots/`  
Ad-hoc screenshots: `tests/screenshots/`

To update visual baselines after an intentional UI change:
```
pnpm test:e2e --update-snapshots
```

**15 tests, all passing.**

---

## What's Planned (Not Done)

- **Canvas refactor:** `AnnotationCanvas.tsx` is monolithic and a good candidate for a clean refactor into a renderer/input-handler split. This should be done as a separate, intentional effort with tests in place.
- **CO-23 fix:** The replay ordering logic is now extracted and tested in `replayUtils.ts`. The next step is to fix the coordinate transform bug in `SessionReplay.tsx` (hardcoded recording dimensions on lines 93–96) using the existing `createCoordinateTransform` utility.
