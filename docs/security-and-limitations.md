# Security and limitations

## Isolation

- Staff users are not managed people.
- Company grants and API authorization enforce tenant/company boundaries.
- Related-incident suggestions never cross companies by default.
- Evidence downloads and exports re-check company access.

## Secrets

- Never commit `.env`, tenant secrets, or real employee data.
- Microsoft credentials live in environment / secret manager; connections store `tenant_id` + `credential_ref` only.
- Uploaded logs are untrusted data — not executed, not used as instructions.

## AuthZ summary

| Action | Admin | Technician | Viewer |
|---|---|---|---|
| Read granted companies | Yes | Yes | Yes |
| Mutate inventory / workflows preview | Yes | Yes | No |
| Execute automation Graph/demo writes | Yes / flag | automation_execute | No |
| Export incident packages | Yes | Yes | No |

## Manual verification

Unsupported provider actions remain explicit manual steps with actor, time, method, and evidence. A non-null `mail` attribute is not mailbox proof.

## Known non-goals (this release)

- Client portal, invoicing, KB/docs product, second PSA
- Native Windows EVTX parsing
- MSP-wide cross-client incident intelligence
- Claiming live Microsoft verification without an authorized tenant
- Public hosting URL (local/container demo is the delivered package unless you deploy)

## Simulated vs live

| Mode | Meaning |
|---|---|
| Demo / fixture | Synthetic Northstar + demo adapters |
| Implemented/unverified | Code path exists; not live-proven |
| Live-verified | Blocked until tenant smoke is recorded |
| Blocked | Waiting on credentials or human authorization |
