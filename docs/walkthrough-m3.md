# M3 walkthrough — joiner / leaver checklists

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) or [http://localhost:5173](http://localhost:5173) after `npm run setup` and `npm run dev`.

Scenario clock: **2026-09-30**. Staff password: `SEED_STAFF_PASSWORD` from `.env`.

Sign in as `admin@northstar.example` or `technician@northstar.example`.

Demo lifecycle only — live Graph writes stay Blocked.

## Joiner (Casey)

1. **Overview** — Harbor joiner/leaver board: people starting soon, seats with timing, open runs.
2. **Companies → Harbor Architecture → People → Casey Nguyen**.
3. **Start onboarding** → choose **Project coordinator** → Preview opens a frozen checklist.
4. **Approve** → badge becomes onboarding in progress; plan stays frozen if you edit the template later.
5. **Execute** → demo adapter creates account / group / seat. Mailbox step stays **manual** — add evidence, then finish.
6. Person **Overview** lists the open run with a link back to the checklist. Timing stays on the profile and assignments.

## Leaver (Departed stays visible)

1. Pick an active Harbor person with accounts/groups (or finish Casey first).
2. **Change status** → **Departed** (optional review date) → **Preview checklist**.
3. That opens **offboarding**, not a silent status patch. After **Approve**, IT status is **Departed** with `offboarding_in_progress` while cleanup steps continue.
4. **Execute** / fulfill manual mailbox evidence. Cancel does not roll back completed Graph steps.
5. Overview board shows offboarding rows; person page links to the open run.

## Status change (non-departed)

1. **Change status** → On leave or Active → Preview → Approve → Execute.
2. Status updates on the local `set_it_status` step (not on approve alone).

## Automations

**Automations** lists company runs. Open any run for approve / execute / retry / cancel and manual evidence.

## Out of scope

Live Microsoft write verification, M4 investigations, client portal / PSA / invoicing.
