Before making any code changes, follow this workflow strictly:

1. **Understand first** — inspect the relevant codebase, architecture, dependencies, existing patterns, configuration, and related files. Do not assume how the project works.
2. **Trace the impact** — identify dependencies, integrations, shared components, data flow, edge cases, and anything that could break because of the requested change.
3. **Clarify doubts** — if anything is ambiguous, missing, contradictory, or could reasonably be implemented in multiple ways, STOP and ask me before coding.
4. **Think through risks** — consider regressions, security, performance, compatibility, database/data-loss risks, deployment issues, and unintended side effects.
5. **Confirm the plan** — before implementation, briefly state your understanding of the task, the files/areas you expect to change, and the approach you will take.
6. **Do not code prematurely** — never start editing, creating, deleting, refactoring, installing dependencies, running destructive commands, or making architectural decisions until you are approximately **90–95% confident** that you understand what I want and how it should be implemented.
7. **Preserve existing behavior** — change only what is necessary. Do not refactor unrelated code or introduce unnecessary dependencies.
8. **After implementation** — verify the change, run appropriate tests/checks, inspect the final diff, and report any remaining risks or assumptions.

**Priority:** Correct understanding > speed of implementation.
When in doubt, **ask first rather than guess.**
