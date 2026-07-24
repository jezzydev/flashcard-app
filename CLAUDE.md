# CLAUDE.md

# Project instructions for Claude Code — loaded at the start of every session.

# Keep this file committed to version control.

# Never put secrets, passwords, or API keys here.

---

## Project Overview

**Name:** Flashcard App
**Type:** Full-stack web app using vanilla JS and Express (backend)
**Primary language:** Node.js
**Framework:** Express
**Database:** PostgreSQL
**Auth:** JWT (access + refresh token pattern)

---

## Stack & Key Dependencies

```
Runtime:     Node.js 20
Framework:   Express 4.x
ORM:         raw pg
Auth:        jsonwebtoken, bcrypt
Validation:  [e.g. Zod / Joi / class-validator]
Testing:     [e.g. Jest / Vitest / Supertest]
Linting & Formatter:     ESLint + Prettier + HTMLHint + Stylelint
```

---

## Project Structure

```
/
├── client/             # Frontend code
│   ├── assets          # Contains images, fonts, etc
│   ├── css             # Styling
│   ├── js              # Javascript code
│   ├── index.html
|── server/
│   ├── db/             # Contains pool.js and schema.sql
│   ├── middleware/     # Auth, error handling, validation
│   ├── routes/         # Route definitions only
│   ├── utils/          # Pure utility functions
│   └── index.js        # Express app setup
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── migrations/         # DB migrations — never modify existing ones
├── .env.example        # Config template — safe to read, no real values
├── .env                # Real secrets — DO NOT READ THIS FILE
├── CLAUDE.md           # This file
└── .claudeignore       # Files Claude should avoid
└── vite.config.js      # Vite config
```

---

## Security Rules — Non-Negotiable

- **Never read, open, print, or reference `.env` or any file listed in `.claudeignore`**
- Use `.env.example` to understand config structure — it has all the keys with empty values
- Never hardcode secrets, tokens, or passwords in any file
- Never log sensitive fields (passwords, tokens, SSNs, card numbers) — not even in debug output
- Never suggest `console.log(user)` or similar that could expose sensitive object fields
- Never disable SSL/TLS verification even in dev suggestions
- If a fix requires knowing a real secret value, say so and stop — do not attempt to read it

---

## Code Conventions

### General

- Fail fast — validate inputs at the boundary (controller/middleware), trust data inside services
- One responsibility per function — if you need "and" to describe it, split it
- Explicit over implicit — no magic, no clever one-liners that need a comment to explain
- All async functions use `async/await` — no `.then()` chains
- All errors propagate via `throw` — no silent catches that swallow errors

### Naming

- Variables and functions: `camelCase`
- Classes and types: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Database columns: `snake_case`
- Files: `kebab-case.js` (except classes: `UserService.js`)

### Error Handling

- Use a centralized error handler middleware — never send raw error objects to the client
- Distinguish operational errors (user-facing, safe to expose) from programmer errors (log and crash)
- HTTP errors include a consistent shape:

```json
{
    "status": "error",
    "code": "RESOURCE_NOT_FOUND",
    "message": "User not found"
}
```

- Never expose stack traces, internal paths, or DB error messages to API responses

### Database

- All queries go through `/server/db/` — never write DB calls directly in controllers or services
- Never modify existing migration files — always create a new migration
- Use parameterized queries always — no string interpolation in SQL
- Every repository function has a single, clear purpose
- Transactions wrap any operation that touches more than one table

### Auth & JWT

- Access tokens: short-lived (15 minutes)
- Refresh tokens: long-lived (7 days), stored in httpOnly cookie — never in localStorage
- Never put sensitive user data in the JWT payload — use user ID only, fetch the rest
- Validate token on every protected route — no exceptions
- Refresh token rotation: issue a new refresh token on every use, invalidate the old one

### API Design

- RESTful resource naming: plural nouns, no verbs (`/users`, not `/getUsers`)
- Consistent response envelope:

```json
{
  "status": "success",
  "data": { ... }
}
```

- Pagination on all list endpoints — never return unbounded arrays
- 401 = unauthenticated, 403 = unauthorized (authenticated but no permission)

---

## Testing Rules

- Unit tests for all service and utility functions
- Integration tests for all API endpoints using a test database
- Never mock the database in integration tests — use a real test DB with fixtures
- Do not weaken TypeScript guarantees just to make the test pass
- Test file mirrors source file: `src/services/user.service.js` → `tests/unit/user.service.test.js`
- Tests must be independent — no shared state between tests, each test sets up and tears down its own data
- After writing or modifying any test, run `npm test` and paste the actual terminal output
- Never mark a task complete without a passing test run shown
- Do not delete or skip a failing test to make the suite pass — fix the code or flag the failure
- Never commit a failing test
- Coverage target: 80% minimum on services and repositories

---

## What Claude Should and Should Not Do

### Do

- Use first principles approach
- Check if the issue/problem/requirement makes sense
- Suggest the minimal change that solves the problem
- Cut unneccessary steps until you cannot cut anymore
- Do not over optimize. Return removed code if later proven to be needed.
- Only consider speed and performance then automation after removing unneeded steps
- Point out related issues you notice — but fix only what was asked unless told otherwise
- Write tests alongside any new code
- Use `.env.example` as the reference for understanding config
- Ask before making changes that affect the database schema
- Ask before touching authentication or security middleware
- Prefer editing existing files over creating new ones unless a new file is clearly needed
- Discuss multiple approaches when relevant
- Explain trade-offs and let user choose
- Reference industry standards and best practices
- Consider maintainability

### Do Not

- Do not read `.env` or any credential file
- Do not run database migrations without explicit confirmation
- Do not commit directly to `main` or `master`
- Do not install new dependencies without asking first
- Do not refactor code outside the scope of the current task
- Do not change existing migration files
- Do not add `console.log` statements to production code paths
- Do not suggest disabling CORS, auth checks, or SSL for any reason

---

## Key Files Quick Reference

| File                                  | Purpose                                            |
| ------------------------------------- | -------------------------------------------------- |
| `server/middleware/authentication.js` | JWT verification middleware                        |
| `server/middleware/errorHandler.js`   | Centralized error handler                          |
| `server/middleware/logger.js`         | Centralized logger                                 |
| `server/db/pool.js`                   | Centralized DB connector/pool                      |
| `server/routes/auth.js`               | Login, logout, register, token refresh logic       |
| `.env.example`                        | All config keys with empty values — safe reference |
| `migrations/`                         | DB migrations — create new, never edit existing    |

---

## Running the Project

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Build for production
npm run build
```

---

## Before Ending a Session

- Run `npm test` and confirm all tests pass
- Run `npm run lint` and fix any errors
- Summarize what was changed so the next session has context
- Do not leave TODO comments without a corresponding task or issue number
