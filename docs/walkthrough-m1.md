# M1 walkthrough — manual inventory

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) after `npm run setup` and `npm run dev`.

Scenario clock for seeded stories: **2026-09-30**.

## Sign in

| Staff | Role | Companies |
|---|---|---|
| `admin@northstar.example` | admin | Harbor, Cedar, Summit |
| `technician@northstar.example` | technician | Harbor, Cedar |
| `viewer@northstar.example` | viewer | Harbor |

Password: `SEED_STAFF_PASSWORD` from `.env`.

## Stories to click through

1. **Companies → Harbor Architecture → People**  
   Find Alex Rivera. Profile shows ended SketchUp / M365-style assignments (Sep 3–17), current laptop, timeline, and no “automatic savings” claim.

2. **Assign from Alex**  
   Use Assign resource → Harbor SketchUp. Refresh; open **Resources → Subscriptions → Harbor SketchUp**. The same assignment appears on both screens.

3. **Capacity**  
   Keep assigning active Harbor people to SketchUp (5 seats). The sixth concurrent named seat is rejected.

4. **Archive gate**  
   Open Morgan Ellis → View archive readiness. Unresolved front-desk mailbox access blocks archive (no force bypass).

5. **Import**  
   Resources → Import (or company Import link). Paste or upload [`samples/people-import.csv`](../samples/people-import.csv). Preview, apply, re-apply — duplicate rows are upsert no-ops; omitted rows do not delete people.

6. **Costs**  
   Harbor company page shows USD totals separately from any EUR seed subscription; Unknown prices are labeled, never $0.

7. **Viewer**  
   Sign in as viewer: Harbor inventory is readable; create/edit/assign controls are hidden.

## Sample import

CSV headers (people only in M1):

`display_name,work_email,it_status,role_title,department,start_date,end_date`

See `samples/people-import.csv`.

## Out of scope for M1

Live Microsoft Graph actions, lifecycle automation, incidents, and demo-workspace full inventory clone. Those arrive in later milestones.
