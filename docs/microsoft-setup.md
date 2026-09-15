# Microsoft setup

M2 supports a **demo/fixture adapter** without tenant credentials. Live Graph smoke remains **blocked** until an authorized private test tenant is supplied.

## Demo adapter (no secrets)

1. Sign in as admin.
2. Open a company → Integrations (or `/companies/{id}/integrations`).
3. Add demo Microsoft adapter → Sync now.
4. Observed accounts/groups/SKU pools appear with `demo` source and freshness notes. They are not live Graph.

## Live inventory app (when authorized)

Create a **read-only** inventory app registration (separate from future action apps). Grant only implemented read capabilities.

Typical application permissions for M2 inventory (verify against current Graph docs before consent):

- `User.Read.All`
- `Group.Read.All`
- `Organization.Read.All` / subscribed SKU access as required for `/subscribedSkus`

Do **not** rely on application `licenseDetails` for users — M2 uses `/users` selected license fields and `/subscribedSkus`.

Store secrets only in environment / secret manager — never in the repo or browser:

```bash
MICROSOFT_TENANT_ID=
MICROSOFT_INVENTORY_CLIENT_ID=
MICROSOFT_INVENTORY_CLIENT_SECRET=
```

Connection records store `tenant_id` and a `credential_ref` name only.

## Not in M2

- Intune / device enrollment reads
- Write/actions (M3)
- Claiming live verification without the recorded smoke test in `docs/verification/M2.md`
