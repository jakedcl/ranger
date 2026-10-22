# RANGER agent instructions

RANGER is an IT administration product for companies, people, digital accounts, groups, devices, subscriptions, and investigations.

## Authoritative specification

Read and follow [RANGER-M0-M5-BUILD-SPEC.md](./RANGER-M0-M5-BUILD-SPEC.md). Do not invent product scope, Microsoft capabilities, or archive behavior that contradicts it.

## Current status

See [docs/build-status.md](./docs/build-status.md) for the current milestone and what is Blocked. Live Microsoft writes and Graph audit stay Blocked without an authorized test tenant; never claim live Graph or hosting success.

## Required status record

Keep [docs/build-status.md](./docs/build-status.md) current. Mark every tracked requirement **Not started**, **In progress**, **Implemented/unverified**, **Verified**, or **Blocked**. Link evidence for verified requirements. After each milestone, write `docs/verification/M<number>.md`.

## Working rules

- One web app, one API, one worker, PostgreSQL.
- Never commit credentials, live tenant secrets, or real employee data.
- Distinguish simulated, implemented, and live-verified behavior.
- Ask the human only for material scope choices, credentials, or external authorization.
- Screens must operate on the same persisted domain model (assignment on a person = assignment on the subscription).
