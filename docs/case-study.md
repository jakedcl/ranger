# Product case study — RANGER (synthetic)

## Problem

IT technicians lose context across admin consoles, spreadsheets, and tickets when someone joins or leaves. The painful unit of work is a **person checklist with dates and seats**, not another documentation wiki or full PSA.

## Design choices

- One web app, one API, one worker, PostgreSQL.
- Same domain model on every screen (assignment on a person = assignment on the subscription).
- Demo Microsoft adapters first; live Graph separately gated.
- Duration shown as **days first**, then ~months after 30 days as a reading aid — not billing.
- Explicit wedge: joiner/leaver board + investigations — not client portal, invoices, or KB.

## Before / after (technician story)

**Before:** Chase who has SketchUp, whether mailbox access cleared, and whether “Departed” means cleanup finished.  
**After:** Preview a frozen onboarding/offboarding plan, keep Departed visible while steps run, file an incident from a failed license step, export a reviewed handoff package.

## Tradeoffs

- Live Graph verification waits on an authorized sandbox — demo success is not live-verified.
- Related incidents are explainable heuristics, not proof of common cause.
- Archive has no force bypass; incomplete cleanup stays visible.

## What testing changed

Integration tests caught company-boundary leaks, duplicate account creation on retry, and viewer export denial. Domain tests locked related-scoring thresholds and evidence type rejection. Those failures shaped the UI copy (“Departed while cleanup runs”, redacted export preference) more than feature inventiveness.
