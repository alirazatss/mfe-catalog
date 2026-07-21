# OpenCode Agent Memory - MF Mono Project

## Skill Usage Guidelines

**IMPORTANT**: This project has access to specialized skills that should be used proactively when appropriate. These skills are located in the user's global skills directory (not project-specific).

### Global Skills Directory

- **Path Pattern**: `~/.agents/skills/` or `$HOME/.agents/skills/`
- **Current User**: `ali.raza` (but this varies per system)
- **Skills are shared across all projects for this user**

### When to Use Skills

#### 1. **spec-writer** - ALWAYS use for feature specifications

**Use when**:

- User requests a new feature or functionality
- Need to document requirements
- Creating OpenSpec scenarios
- Writing GIVEN/WHEN/THEN specifications

**Location**: `~/.agents/skills/spec-writer/SKILL.md`

**Example triggers**:

- "Add a new dashboard feature"
- "We need to implement user notifications"
- "Create a spec for the reporting module"

---

#### 2. **backend-developer** - Use for server-side implementation

**Use when**:

- Implementing REST APIs
- Designing database schemas
- Backend service architecture
- Server-side business logic
- Authentication/authorization endpoints
- Data validation and processing

**Location**: `~/.agents/skills/backend-developer/SKILL.md`

**Example triggers**:

- "Implement the /api/auth/login endpoint"
- "Design the database schema for orders"
- "Create a REST API for product management"
- "Add Keycloak integration to the backend"

---

#### 3. **frontend-developer** - Use for UI/UX implementation

**Use when**:

- Building React components
- Implementing UI features
- Frontend state management
- Client-side routing
- Form validation
- Responsive design
- CSS/styling work

**Location**: `~/.agents/skills/frontend-developer/SKILL.md`

**Example triggers**:

- "Create a user profile page"
- "Implement a file upload component"
- "Add dark mode support"
- "Build a data table with sorting and filtering"

---

#### 4. **team-lead** - Use for project coordination

**Use when**:

- Planning sprints
- Breaking down large features into tasks
- Coordinating multi-agent work
- Managing OpenSpec changes
- Orchestrating development workflow
- Prioritizing work

**Location**: `~/.agents/skills/team-lead/SKILL.md`

**Example triggers**:

- "Plan the next sprint"
- "Break down this epic into user stories"
- "What should we work on next?"
- "Coordinate the payment integration feature"

---

#### 5. **tester** - Use for quality assurance

**Use when**:

- Writing unit tests
- Creating integration tests
- E2E test scenarios
- Verifying OpenSpec scenarios
- Testing against requirements
- Test coverage analysis

**Location**: `~/.agents/skills/tester/SKILL.md`

**Example triggers**:

- "Write tests for the auth flow"
- "Test the API endpoints"
- "Verify the login functionality works"
- "Add E2E tests for checkout"

---

#### 6. **git-commit** - Use for intelligent commits

**Use when**:

- User asks to commit changes
- Mentions "/commit"
- Says "commit this" or "git commit"
- Need to create a conventional commit message
- Should analyze changes and generate appropriate commit message

**Location**: `~/.agents/skills/git-commit/SKILL.md`

**Example triggers**:

- "Commit these changes"
- "/commit"
- "Create a commit for the auth implementation"

---

#### 7. **architect** - Use for system design

**Use when**:

- Designing scalable solutions
- Making technology decisions
- Evaluating architectural patterns
- System architecture reviews
- Performance optimization strategies
- Microservices design

**Location**: `~/.agents/skills/architect/SKILL.md`

**Example triggers**:

- "How should we architect the notification system?"
- "What's the best way to handle file uploads at scale?"
- "Design a caching strategy"

---

#### 8. **brainstorming** - ALWAYS use before creative work

**Use when**:

- Starting any new feature
- User wants to explore ideas
- Need to clarify requirements
- Design discussions
- Before implementing something new

**Location**: `~/.agents/skills/brainstorming/SKILL.md`

**Example triggers**:

- "Let's build a new feature"
- "I want to add X functionality"
- "How should we implement Y?"

---

### Project-Specific Skills (Local)

In addition to global skills, this project has local skills in `.opencode/skills/`:

#### OpenSpec Workflow Skills

- **openspec-propose**: Propose new changes with full artifacts
- **openspec-explore**: Explore mode for thinking through problems
- **openspec-apply-change**: Implement tasks from OpenSpec changes
- **openspec-archive-change**: Archive completed changes

**Location**: `/Users/ali.raza/dev/mf-mono/.opencode/skills/`

---

## Skill Coordination Pattern

### Recommended Workflow

1. **Brainstorming** → Understand requirements
2. **Spec-Writer** → Document as OpenSpec
3. **Team-Lead** → Break into tasks, coordinate
4. **Backend-Developer** → Implement server-side
5. **Frontend-Developer** → Implement client-side
6. **Tester** → Verify implementation
7. **Git-Commit** → Commit with conventional messages

### Example Session Flow

```
User: "Add a shopping cart feature"

Agent: [Uses brainstorming skill] → Explore requirements
       [Uses spec-writer skill] → Create OpenSpec
       [Uses team-lead skill] → Break into tasks
       [Uses backend-developer] → Implement cart API
       [Uses frontend-developer] → Implement cart UI
       [Uses tester skill] → Write tests
       [Uses git-commit skill] → Commit changes
```

---

## Path Detection Logic

Since usernames vary across systems, always use:

- `$HOME/.agents/skills/` or `~/.agents/skills/`
- Never hardcode `/Users/ali.raza/`

The system will resolve `~` to the correct home directory automatically.

---

## When NOT to Use Skills

**Direct implementation is fine when**:

- Simple file edits (fixing typos, updating config)
- Reading/searching code
- Quick bug fixes
- Documentation updates
- Running commands

**Use skills for**:

- Feature development
- Complex implementations
- Multi-step workflows
- Quality assurance
- Project management

---

## Current Project Context

**Project**: Micro-Frontend Monorepo (mf-mono)  
**Tech Stack**: React, TypeScript, Vite, Module Federation, Turborepo  
**Architecture**: Shell + MFEs with event bus communication  
**Auth**: Keycloak via backend proxy, HttpOnly cookies + memory tokens  
**Status**: Auth system implemented, event bus complete

**Active OpenSpec Changes**:

1. `auth-token-management` - Partially implemented (core done, tests pending)
2. `event-bus-communication` - Partially implemented (core done, tests pending)
3. `environment-configuration` - Not started (80 tasks, 16-20h)
4. `error-handling-recovery` - Not started (73 tasks, 18-25h)

---

## Reminders

- ✅ Always prefer skills over direct implementation for features
- ✅ Use spec-writer BEFORE implementing new features
- ✅ Use git-commit for intelligent commit messages
- ✅ Use team-lead to coordinate multi-skill work
- ✅ Use tester to verify implementations
- ✅ Skills are in `~/.agents/skills/` (global) and `.opencode/skills/` (local)
- ✅ Never hardcode usernames in paths

---

## Last Updated

2026-07-09 - Auth system implementation complete
