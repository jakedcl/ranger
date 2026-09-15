# Data model notes

## M0

Implemented tables:

- Better Auth: `user`, `session`, `account`, `verification`
- `organizations` — name, deployment environment (`demo` / `private` / `live`). No timezone or general-business fields.
- `companies` — IT contact and notes only
- `organization_memberships` — staff user, role, active, automation_execute
- `company_grants` — composite organization/company foreign key
- `audit_events` — append-only application audit trail
- `demo_workspaces` — visitor synthetic org, expiry, generation
- `file_objects` — private download authorization foundation; no files stored in M0

Staff users are Better Auth identities. Managed company people are a separate entity family (`people`).

## M1 inventory (`0003_inventory.sql`)

Company-scoped rows carry `organization_id` + `company_id` with `UNIQUE (organization_id, company_id, id)` and composite FKs mirroring `companies (organization_id, id)`.

| Table | Notes |
|---|---|
| `people` | IT status + separate `archived_at` / `workflow_badge`; date-only start/end; no HR/payroll fields |
| `accounts` | Optional same-company `person_id`; `external_id` is identity, not email |
| `products` | Organization catalog; `assignment_model`; soft retire via `retired_at` |
| `subscriptions` | Company purchase of org-compatible product; CHAR(3) currency |
| `subscription_price_versions` | Historical prices; null `unit_price` = unknown |
| `license_pools` | Company/product pool; optional provider SKU |
| `license_assignments` | Person and/or account; status active / removal_pending / ended |
| `groups` / `group_memberships` | Typed groups; membership kind + active/ended |
| `shared_mailboxes` / `mailbox_access` | Distinct from people/groups; permission kinds |
| `devices` / `device_assignments` | Cost+currency paired; one current assignment per device |
| `work_items` | Basic IT work; completion evidence text for M1 |
| `timeline_events` | Effective / observed / recorded times |
| `import_batches` / `import_rows` | Preview validation + apply results |
| `offboarding_obligations` | Manifest targets survive unlink; open/resolved/not_applicable |

## Relationship rules (M1)

```
Organization
  └── Products (catalog; may be retired)
  └── Companies
        ├── People ── accounts (optional link; unlink ≠ archive)
        │      ├── license_assignments → product (+ optional subscription/pool)
        │      ├── device_assignments (one current per device)
        │      └── work_items (target person)
        ├── Subscriptions → product + price_versions + license_assignments
        ├── Groups → group_memberships → accounts
        ├── Shared mailboxes → mailbox_access → accounts
        └── Devices → device_assignments → people
```

- **Same company only:** person, account, subscription, group, mailbox, and device FKs are composite `(organization_id, company_id, …)`. Cross-company links fail at the API.
- **Products ≠ subscriptions ≠ assignments.** Ending an assignment does not cancel the purchase.
- **Staff ≠ managed people.** Better Auth `user` never appears in `people`.
- **Archive** uses `evaluateArchiveReadiness` on live relationships; there is no force-archive bypass.
- **Import** upserts people by email; omitted CSV rows do not delete inventory.

Scenario seed clock: `2026-09-30` (Alex Sep 3–17 contractor interval is Ended).

## M3 lifecycle (`0005_lifecycle.sql`)

| Table | Notes |
|---|---|
| `role_templates` / `role_template_versions` | Immutable versioned intents; editing creates a new version |
| `company_template_bindings` | Maps intent keys to this company's groups/subscriptions |
| `workflow_runs` | Frozen plan JSON, idempotency key, actor |
| `workflow_steps` / `workflow_step_attempts` | Provider accepted vs verified stay distinct on attempts |
| `in_app_notifications` | Step failures and blocked execution |
| `welcome_email_previews` | Local preview only; never sent on retry |

## M4 investigations (`0006_incidents.sql`)

| Table | Notes |
|---|---|
| `incidents` | Company-scoped; status/severity; optional workflow failure context |
| `incident_affected_resources` | person/account/group/product/device/subscription/workflow_run |
| `incident_evidence` | Upload + ranger_event refs + redacted derivatives; hash/limits |
| `investigation_entries` | observation / hypothesis / action / result / note |
| `related_incident_suggestions` | Same-company scoring version + dismiss persistence |
| `problems` / `problem_incidents` | Human-confirmed recurring problem links |
| `incident_exports` | Private ZIP packages with selected evidence versions |

Evidence bytes live outside the web root (`data/evidence/` or `EVIDENCE_STORAGE_DIR`).

