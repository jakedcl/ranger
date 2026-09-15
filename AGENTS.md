# RANGER agent instructions

RANGER is an IT administration product for companies, people, digital accounts, groups, devices, subscriptions, and investigations.

## Authoritative specification

Read and follow [RANGER-M0-M5-BUILD-SPEC.md](./RANGER-M0-M5-BUILD-SPEC.md). Do not invent product scope, Microsoft capabilities, or archive behavior that contradicts it.

## Current milestone

**M5 — Complete verification and portfolio delivery**

M4 investigations are implemented (Microsoft audit still Blocked). Finish end-to-end polish, documentation, operational verification, demo packaging, and the acceptance matrix. Separate live/hosted gates from completed software work. Do not invent live Graph or public hosting success.

Live Microsoft **writes** and optional Graph audit remain **Blocked** without an authorized test tenant.

Never commit credentials or real employee data. Distinguish simulated, implemented, and live-verified behavior.

## Required status record

Keep [docs/build-status.md](./docs/build-status.md) current. Mark every tracked requirement **Not started**, **In progress**, **Implemented/unverified**, **Verified**, or **Blocked**. Link evidence for verified requirements. After each milestone, write `docs/verification/M<number>.md`.

## Working rules

- One web app, one API, one worker, PostgreSQL.
- Never commit credentials, live tenant secrets, or real employee data.
- Distinguish simulated, implemented, and live-verified behavior.
- Ask the human only for material scope choices, credentials, or external authorization.
- Screens must operate on the same persisted domain model (assignment on a person = assignment on the subscription).
