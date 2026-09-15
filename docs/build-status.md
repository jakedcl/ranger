# Build status

Current milestone: **M5 — Complete verification and portfolio delivery**  
M4 reviewed by continue-to-M5. Live Graph / public hosting remain Blocked.

Status values: Not started · In progress · Implemented/unverified · Verified · Blocked

## M0–M1

**Verified**. Evidence: [verification/M0.md](./verification/M0.md), [verification/M1.md](./verification/M1.md)

## M2

| ID | Status | Evidence |
|---|---|---|
| Demo/fixture Microsoft read | Implemented/unverified | [verification/M2.md](./verification/M2.md) |
| M2.live | Blocked | No tenant credentials |

## M3

| ID | Status | Evidence |
|---|---|---|
| Templates / workflows / demo lifecycle | Implemented/unverified | [walkthrough-m3.md](./walkthrough-m3.md) |
| M3.live | Blocked | No tenant credentials |

## M4

| ID | Status | Evidence |
|---|---|---|
| Incidents / evidence / related / export | Implemented/unverified | [walkthrough-m4.md](./walkthrough-m4.md) |
| M4.audit | Blocked | Capability + tenant |

## M5

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| M5.1 | End-to-end polish | Implemented/unverified | Stale placeholders removed; walkthroughs |
| M5.2 | Test layers | Implemented/unverified | 84 vitest + e2e specs |
| M5.3 | Operational verification | Implemented/unverified | backup/restore scripts, build, runbook |
| M5.4 | Demo modes | Implemented/unverified | Synthetic yes; live Microsoft Blocked |
| M5.5 | Deployment package | Implemented/unverified | Local/compose; public URL pending |
| M5.6 | Portfolio docs | Implemented/unverified | [verification/M5.md](./verification/M5.md) |
| M5.live | Live tenant demo | Blocked | No authorized tenant |
| M5.host | Public hosting | Blocked / pending | Not configured |

## Commands

`npx vitest run` · `npm run build -w @ranger/web` · `bash scripts/backup-dev.sh`

Docs hub: [README](../README.md) · [demo-guide.md](./demo-guide.md) · [operations-runbook.md](./operations-runbook.md)
