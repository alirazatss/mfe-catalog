# Agent Instructions - MF Mono Project

## Critical: Always Use Skills When Appropriate

This project has access to specialized skills that MUST be used proactively. Skills are located in `~/.agents/skills/` (global skills shared across all projects).

### Skill Activation Rules

**ALWAYS activate these skills when the task matches:**

1. **spec-writer** → Any new feature, requirement documentation, OpenSpec scenarios
2. **backend-developer** → REST APIs, databases, server-side logic, auth endpoints
3. **frontend-developer** → React components, UI implementation, forms, styling
4. **team-lead** → Sprint planning, task breakdown, multi-agent coordination
5. **tester** → Unit tests, integration tests, E2E tests, verification
6. **git-commit** → When user says "commit" or mentions git commit
7. **architect** → System design, architectural decisions, scalability
8. **brainstorming** → Before implementing any new feature (explore requirements first)

### Path Resolution

- Global skills: `~/.agents/skills/<skill-name>/`
- Local skills: `.opencode/skills/<skill-name>/`
- Never hardcode usernames (use `~` or `$HOME`)

### Workflow Pattern

```
brainstorming → spec-writer → team-lead →
  backend-developer → frontend-developer →
    tester → git-commit
```

### Current Project State

**Stack**: React + TypeScript + Vite + Module Federation + Turborepo
**Auth**: Keycloak (HttpOnly cookies + memory tokens) - ✅ Implemented
**Event Bus**: Native EventTarget - ✅ Implemented
**Pending**: Environment config (80 tasks), Error handling (73 tasks)

---

## Project-Specific Context

### Architecture Principles

- Shell loads MFEs, NO business logic in shell
- Zero deps for core packages (native browser APIs)
- Event-driven communication (mfe:domain:action)
- Singleton pattern for shared services

### Tech Constraints

- Use `vp` CLI (Vite+) for all package management
- Convention: `apps/mfe-*` for micro-frontends
- Auto-discovery via glob patterns
- React Router v8 (declarative API)

### Security

- Access tokens: Memory only (XSS safe)
- Refresh tokens: HttpOnly cookies (CSRF safe)
- Auto-refresh at 80% token lifetime
- Props + Events for auth propagation

---

## OpenSpec Workflow

Active changes in `openspec/changes/`:

1. `auth-token-management` - Core ✅, Tests pending
2. `event-bus-communication` - Core ✅, Tests pending
3. `environment-configuration` - Not started
4. `error-handling-recovery` - Not started

Use local OpenSpec skills:

- `openspec-propose` - Create new changes
- `openspec-explore` - Think through problems
- `openspec-apply-change` - Implement tasks
- `openspec-archive-change` - Archive when done

---

## Remember

✅ Load appropriate skill BEFORE starting implementation
✅ Use spec-writer for any new feature
✅ Use git-commit for intelligent commits
✅ Skills make work better - don't skip them
