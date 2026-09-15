# M4 walkthrough — investigations

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) after `npm run setup` and `npm run dev`.

Scenario clock: **2026-09-30**. Staff: `admin@northstar.example` / `SEED_STAFF_PASSWORD`.

## Primary — license failure → incident → related → export

1. Run Harbor Casey onboarding until a license step fails, **or** open Automations on a failed step → **Create incident** (person, run, error, correlation prefilled).
2. Or create manually: **Incidents** → new → symptom + tags `onboarding,license` + provider error `LicenseAssignmentFailed` + link Casey + SketchUp product.
3. Upload `samples/incidents/license-assignment-failed.log`.
4. Add a note/hypothesis. Open **Related** — seeded “Earlier SketchUp license assign failure” should appear with visible score reasons.
5. Record an action/result after retry. **Export** — select evidence (prefer redacted if you created one) → download ZIP (`report.md` + `manifest.json` + attachments).

## Secondary — demo auth JSONL

1. Generate/copy logs: `node apps/api/scripts/demo-auth-events.mjs > samples/demo-auth-events.jsonl`
2. Open seeded Harbor incident **Demo auth error burst…** (or create one).
3. Upload the JSONL. Timeline shows config change observation and AuthFailed rows with timestamps; **no automatic root cause**.
4. Add a confirmed **result** only after you decide the explanation.

## Boundaries

- Viewer can read Harbor incidents; cannot export ZIP.
- Cedar cannot open Harbor incident IDs.
- HTML/EXE uploads rejected. Script-like text in logs is stored/rendered as inert data.

## Out of scope

Live Microsoft audit collection (Blocked). M5 portfolio polish.
