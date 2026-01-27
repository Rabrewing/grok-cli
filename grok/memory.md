# Grok CLI Self-Heal Memory

## Current Phases

- Phase 1: UI Fix (scroll jumping), --apply mode, 410 fix
- Phase 2: Repo Mode Foundation (utils, detection, rules, snapshot)
- Phase 3: Commands (snap, ticket)
- Phase 4: Guardrails (bash filter, output enforcement)
- Phase 5: Full flags, testing

## Todo Integration from Roadmap

- Integrate BrewVerse roadmap items: UI stability, local tools, apply safety
- Track progress: Use CLI todo list for sub-tasks

## Notes

- Repo: ~/grok-cli-pr132
- Global rules: ~/brewdocs/GROK_GLOBAL_RULES.md
- No remote search
- Diff-first, apply guarded
- Timestamp: 2026-01-27 03:57:22 EST
- UI Audit: Thorough check - useInput only in app.tsx (lines 39-73); no other instances in src/ui. Moved to local ChatInput to stop root re-renders. Memoized ChatHistory. Streaming updates isolated. If flicker persists, restart terminal (clear Ink state) or check useEffect in app.tsx (line 22, 35 - confirmation only, no input trigger). Test command: pnpm build && grok (type slowly, stream prompt).