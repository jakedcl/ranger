# 0001 — Architecture

Date: 2026-09-09  
Status: Accepted  
Milestone: M0

## Context

RANGER is a new repository. Section 10 of `RANGER-M0-M5-BUILD-SPEC.md` defines the default stack. The existing folder contained only Git history and a placeholder file.

## Decision

Use the specified modest architecture:

- TypeScript, strict
- React 19 + Vite 7, React Router 7, TanStack Query 5
- Node.js 24 LTS target (local machine currently has Node 25; CI pins 24)
- Fastify 5 API under `/api/v1`
- PostgreSQL 14 locally (Homebrew) / 16 in Compose and CI
- node-postgres, checked-in SQL migrations
- Better Auth with PostgreSQL sessions, email/password, `disableSignUp: true`
- pg-boss worker
- Vitest + Fastify inject tests, Playwright e2e
- CSS variables and semantic HTML; no second component library

Docker is documented via `infra/compose.yaml` but is not installed on this development machine. Local M0 uses Homebrew PostgreSQL 14.

## Consequences

- No ORM. Domain rules live in `@ranger/domain`; SQL lives in `@ranger/db`.
- Microsoft adapters remain typed contracts only until M2.
- Public demo clones a synthetic organization per visitor; private seed staff share the Northstar development organization.
