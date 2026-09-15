# Integration capabilities

M2 implements typed inventory read capabilities in `@ranger/integrations`:

| Capability ID | Access | Execution | Notes |
|---|---|---|---|
| `microsoft.users.read` | read | graph | `GET /users` with selected assignment fields |
| `microsoft.groups.read` | read | graph | `GET /groups` |
| `microsoft.groups.members.read` | read | graph | `GET /groups/{id}/members` (direct user members) |
| `microsoft.skus.read` | read | graph | `GET /subscribedSkus` |

`CapabilityState` records **Implemented / Granted / Available in tenant / Last tested / Read-Write / Execution method**.

- **DemoInventoryProvider:** synthetic Harbor fixtures; capabilities granted unless connection-failure or groups-unauthorized modes are enabled.
- **MicrosoftInventoryProvider without credentials:** `implemented=true`, `granted=false`; reads throw `ConnectionFailed` (no live calls).
- **Live tenant:** Blocked until an authorized test tenant is supplied. Do not treat fixture success as live-verified.

Does not call `/users/{id}/licenseDetails` (application permissions unsupported). SketchUp / Adobe remain manual catalog products — not Microsoft SKUs.
