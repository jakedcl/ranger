# RANGER — Complete Product and AI Build Specification

**Version:** 1.0  
**Prepared:** September 9, 2026  
**Audience:** The AI coding agent building RANGER and the human reviewing it  
**Format:** One authoritative specification, implemented through milestones M0–M5

> RANGER connects companies, people, digital accounts, email and access groups, devices, subscriptions, and investigations. It helps IT staff understand a person's setup, make changes, and retain evidence of what happened.

## Contents

1. [Instructions to the building agent](#1-instructions-to-the-building-agent)
2. [Product definition and boundaries](#2-product-definition-and-boundaries)
3. [Product language and information architecture](#3-product-language-and-information-architecture)
4. [Domain model and invariants](#4-domain-model-and-invariants)
5. [Core screens and interaction requirements](#5-core-screens-and-interaction-requirements)
6. [Status changes, lifecycle work, and archive gates](#6-status-changes-lifecycle-work-and-archive-gates)
7. [Microsoft and other integrations](#7-microsoft-and-other-integrations)
8. [Workflow execution and reliability](#8-workflow-execution-and-reliability)
9. [Incidents, evidence, and recurring issues](#9-incidents-evidence-and-recurring-issues)
10. [Technical architecture](#10-technical-architecture)
11. [M0 — Foundation and runnable skeleton](#11-m0--foundation-and-runnable-skeleton)
12. [M1 — Connected inventory and manual management](#12-m1--connected-inventory-and-manual-management)
13. [M2 — Real Microsoft read integration](#13-m2--real-microsoft-read-integration)
14. [M3 — Lifecycle workflows and Microsoft actions](#14-m3--lifecycle-workflows-and-microsoft-actions)
15. [M4 — Investigation and recurring problems](#15-m4--investigation-and-recurring-problems)
16. [M5 — Complete verification and portfolio delivery](#16-m5--complete-verification-and-portfolio-delivery)
17. [Demo dataset and scripted scenarios](#17-demo-dataset-and-scripted-scenarios)
18. [Cross-cutting acceptance matrix](#18-cross-cutting-acceptance-matrix)
19. [Completion reporting and handoff](#19-completion-reporting-and-handoff)
20. [Explicit future scope](#20-explicit-future-scope)
21. [Source references](#21-source-references)

---

## 1. Instructions to the building agent

### 1.1 Build the product, not just its appearance

Implement a working application with durable data, authorization, meaningful workflows, a real Microsoft connection where credentials are available, and an honest synthetic demonstration mode. Screens must operate on the same persisted domain model. A user assignment changed in Resources must appear immediately on the person's profile and timeline.

This is a portfolio flagship intended to demonstrate IT administration, product judgment, and software engineering. Its success is a coherent, credible demonstration—not the number of navigation items.

### 1.2 Execution contract

1. Read this entire file before designing the schema. Inspect existing repository instructions and code before changing anything.
2. Use the default stack in section 10 for a new repository. Preserve a suitable existing stack if replacing it would add migration work; record the equivalent architecture in an architecture decision record (ADR).
3. Work through M0–M5 in order. A milestone includes implementation, verification, documentation, and a short handoff record.
4. Maintain `docs/build-status.md` with each requirement marked **Not started, In progress, Implemented/unverified, Verified, or Blocked**. Link evidence for verified requirements.
5. Do not claim a live connector is complete based on fixture tests alone. Distinguish simulated behavior, implemented behavior, and live-verified behavior.
6. If credentials or tenant eligibility block live tests, finish all independent work and state the exact remaining dependency. Do not invent permission grants or claim successful external actions.
7. Use real failure handling. Do not silently swallow errors, replace failed requests with demo data, or count failed operations as success.
8. Keep the architecture modest: one web application, one API, one background worker, and PostgreSQL. Do not introduce Kubernetes, microservices, a data warehouse, or an LLM requirement.
9. Record routine implementation decisions and continue. Ask the human only for a material scope choice, necessary credential/setup work, or an external action requiring their authorization.
10. Never place live tenant secrets, temporary passwords, real log files, or employee data in source control or public demo assets.
11. Respect the environment's permissions and the user's authorization for live changes. A product specification is not permission to modify arbitrary Microsoft tenants.

### 1.3 Definition of a complete feature

A complete feature has a persisted data model, server-side authorization, working UI, validation, helpful empty/error/loading states, appropriate audit history, meaningful verification, and no misleading claims. Buttons without working behavior must not appear as enabled features.

---

## 2. Product definition and boundaries

### 2.1 Who uses it

- **Internal IT:** one organization managing its own company.
- **MSP:** one organization managing several client companies.
- **Primary operator:** an IT technician investigating or changing a person's digital setup.
- **Administrator:** configures staff access, connections, and templates.
- **Viewer:** can inspect permitted records without changing them.

RANGER staff accounts and managed company people are different entities. Creating a managed person does not grant that person access to RANGER.

### 2.2 The primary questions

- Who is this person, and what digital resources do they have?
- Which accounts, email groups, access groups, subscriptions, and devices are involved?
- Which records are live, manual, stale, or unknown?
- What needs to happen when their IT status changes?
- Which steps actually succeeded, and what still needs attention?
- What changed before an incident, and what evidence can we hand to the next technician?

### 2.3 Included in the first full release

- Organization/company separation and staff permissions.
- People linked to digital accounts, groups, shared mailbox access records, devices, and software assignments.
- A manually editable software catalog and company subscriptions.
- Historical assignments and IT cost summaries.
- A real Microsoft read integration and a bounded set of real administrative actions.
- Role templates, guided onboarding/offboarding, status checklists, and enforced archive readiness.
- Work items with owners, evidence, and execution history.
- Incident investigation, selected log ingestion, escalation export, and rule-based related incidents.
- A synthetic public demo plus a separate private tenant-backed demonstration.

### 2.4 Explicit exclusions

Do not add payroll, HR administration, sales CRM, company projects, accounting, procurement approval chains, general business tasks, or company timezone settings. Companies are IT data boundaries—not general business-management workspaces.

Person role, department, sponsor, start/end dates, and IT status exist only to support access/resource workflows. Do not add salary, home address, government ID, medical data, or performance records.

Do not implement remote desktop, endpoint privilege elevation, a network scanner, universal SaaS provisioning, automatic invoice charging, or a general-purpose chatbot. The support session recorder is a separate future project.

### 2.5 Product promises

- A person's digital setup is understandable from one profile.
- Manual and automated work are both first-class, clearly distinguished operations.
- Archiving does not hide unfinished offboarding.
- History is preserved without pretending unknown dates are known.
- A failed integration produces visible uncertainty, not fabricated state.
- The application is useful without paid AI services or paid observability infrastructure.

---

## 3. Product language and information architecture

### 3.1 Navigation

Use a persistent company scope switcher: **All companies** or a permitted company. In single-company deployments, select that company automatically and keep the switcher unobtrusive.

| Section | Purpose |
|---|---|
| Overview | Actionable queue, connection health, upcoming IT lifecycle dates, open incidents |
| Companies | Client/company directory and IT-specific settings |
| People | Search, filter, and manage connected person profiles |
| Resources | Accounts, groups, shared mailboxes, devices, products, and subscriptions |
| Work | IT tasks and lifecycle workflow runs |
| Incidents | Investigations, evidence, and recurring problem records |
| Automations | Role templates, workflow definitions, execution history |
| Integrations | Connections, import history, supported capabilities, sync results |
| Settings | Staff permissions, organization configuration, and demo administration |

Global search respects company permissions. Results show entity type, company, and enough context to distinguish identical names. Selecting a result updates scope and opens its actual record.

### 3.2 Source and freshness are separate concepts

Store and display two axes:

- **Environment:** demo or live.
- **Record source:** Microsoft, manual, import, or RANGER workflow.

A demo record can simulate a Microsoft source but must still carry an unmistakable **Demo** indicator. Freshness is a third property: last observed, last successful sync, stale, or unknown.

Prefer labels such as “Microsoft · checked 4 minutes ago” and “Manually confirmed by Taylor · Sep 8.” Do not bury source information in an administrative settings page.

### 3.3 Visual and interaction direction

Build a polished operational application: calm neutral surfaces, restrained forest-green accent, clear typography, and dense but readable tables. Use color for meaning, not decoration. Avoid giant hero sections, decorative charts, excessive gradients, and a dashboard made entirely of statistic cards.

- Tables support search, useful filters, stable sorting, pagination, and keyboard access.
- Forms use plain labels, visible required fields, inline errors, and a clear save/cancel path.
- Drawers handle small contextual edits; full pages handle investigations and lifecycle workflows.
- Keep company context and breadcrumbs visible on detail pages.
- Use text and icons alongside status colors.
- Make destructive or external actions visually distinct and explain their target.
- Preserve filters in the URL where useful; a refresh should not lose investigation context.
- Give every async action a pending state and prevent accidental duplicate submission.
- Desktop is the primary experience; smaller screens must remain usable without overlapping controls.
- Cover 1440px, 1024px, and 390px widths in visual verification. Use horizontally scrollable tables where needed.

---

## 4. Domain model and invariants

### 4.1 Shared conventions

Use opaque internal IDs and stable external IDs. Company-scoped records carry `organization_id` and `company_id`; enforce compatible parent relationships in the database and service layer. An ID supplied by the browser is never sufficient authorization.

Store event timestamps as UTC instants. Display them in the viewer's browser locale with a visible offset in detailed evidence. Date-only fields, such as a contractor end date, remain date-only values. **Do not add a company timezone field.** Date-only deadlines generate review work; scheduled external execution requires an explicitly selected instant, displayed with its offset before confirmation.

Use database decimal/numeric values for money. Store a currency with each amount. Do not sum unlike currencies or use floating-point arithmetic for cost totals.

Keep effective time separate from observed/recorded time. An import collected September 8 may describe an assignment effective September 3. Store the source of that date. If the effective date is unknown, record the observation interval and uncertainty instead of inventing September 8 as the true start date.

### 4.2 Required entity families

| Entity | Required contents and relationships |
|---|---|
| Organization | Name, deployment environment, operational settings; no general business fields |
| StaffUser / Session | Authentication-library identity and server-side session |
| OrganizationMembership | Staff user, role, active state |
| CompanyGrant | Which companies a technician/viewer may access; admin has organization scope |
| Company | Name, domains, IT contact details if supplied, IT notes; no timezone; company archival is deferred |
| Person | Company, display name, work email, role/department/sponsor if useful, IT lifecycle status, relevant dates |
| Account | Company, optional linked person, provider/source, external ID, login name, account kind, enabled/disabled/unknown state, freshness |
| Product | Organization catalog name, vendor, category, assignment model, optional documentation URL, retired state |
| Subscription | Company, product, supplier, external reference, purchased quantity, currency, payer, billing cadence, commitment/renewal dates, state |
| SubscriptionPriceVersion | Effective dates, unit or flat price, cadence, source; preserve historical prices |
| LicensePool | Company/product/provider SKU, purchased/consumed quantities when known, source and freshness; can aggregate multiple subscriptions |
| LicenseAssignment | Person/account, product/pool, optional proven subscription link, start/end provenance, desired/observed status |
| Device | Company, asset tag/serial, type, hostname/model if available, state, source; optional cost |
| DeviceAssignment | Device, person, issued/returned dates, custody disposition and evidence |
| Group | Company, source/external ID, display name, address if present, group type, membership management capability |
| GroupMembership | Account/group, direct/inherited/dynamic observation, dates, verification source |
| SharedMailbox | Company, address, source, state, known owner; distinct from a person and group |
| MailboxAccess | Account/mailbox, permission kind, dates, source, verification status |
| WorkItem | Company, type, target person/resources, owner, status, due date, completion requirements |
| WorkStep | Work item/run, step kind, dependencies, required flag, state, evidence references |
| OffboardingManifest / Obligation | Versioned inventory of resources requiring resolution, including detached historical targets; current outcome and supporting evidence |
| RoleTemplate / Version | Organization, title, immutable version, intent and resource bindings |
| CompanyTemplateBinding | Maps template resource intent to exact company groups/products; never cross-client IDs |
| WorkflowRun / StepAttempt | Frozen plan, actor, target, idempotency key, states, attempts, verification results |
| Connection / Capability | Company tenant mapping, authentication configuration reference, supported/granted/tested capabilities |
| SyncRun / Observation | Resource collection, checkpoint, completion, timing, source snapshot/hash as appropriate |
| ImportBatch / ImportRow | File metadata, schema mapping, row validation, deduplication identity, application results |
| TimelineEvent | Entity links, event kind, actor, effective/observed/recorded time, source, sanitized summary |
| AuditEvent | Append-only application action record, actor, target, before/after summary, correlation ID |
| Incident | Company, title, impact, severity, status, owner, linked resources, onset/resolution times |
| EvidenceItem | Incident/company, kind, provenance, timestamps, object reference/hash, redaction state |
| InvestigationEntry | Fact/hypothesis/action/result/note classification, author and evidence links |
| Problem / IncidentRelationship | Human-confirmed recurring issue group and explainable suggestions |
| ExportArtifact | Requester, company, included evidence versions, generation state, authorized download |

Use join tables for typed relationships where integrity matters. Avoid a universal unvalidated `entity_type/entity_id` pair as the sole guard against cross-company links. JSON may hold connector payload metadata or versioned workflow parameters, not replace the core relational model.

### 4.3 Subscription and seat rules

- Products are catalog entries; subscriptions are company purchases; assignments connect people/accounts to access. These are not interchangeable.
- A requested product is a WorkItem, not an active LicenseAssignment. Only provider observation or technician-confirmed fulfillment creates an active assignment. A preview/request neither consumes assigned-seat totals nor establishes service history; seat reservations are deferred. Recheck capacity at actual fulfillment.
- For named-seat manual subscriptions, reject over-allocation transactionally. A connected source reporting over-allocation is imported as an observed discrepancy, not discarded.
- The catalog identifies named-user, shared/device, and organization-wide purchase models. In the first release only named-user seats create LicenseAssignments to people/accounts. Other models remain company-level subscription records and costs; device-bound software-seat allocation is deferred. Never invent person assignments to make their totals fit.
- A Microsoft SKU/license pool may span multiple commercial subscriptions. Keep allocation unlinked to a specific purchase unless a source or reviewed mapping establishes it. Do not infer invoice dates or contract price from Graph inventory.
- A company purchase can remain active with zero assigned seats. Show unassigned capacity and commitment state.
- Retirement prevents new selection while preserving old history. Do not delete products/subscriptions referenced by history.
- Reassignment closes the old assignment and opens a new one in one transaction.
- “Access removed,” “seat unassigned,” “quantity reduced,” “renewal disabled,” and “subscription canceled” are distinct events.

### 4.4 Costs

Track IT resource costs only. Initial summaries include company purchase cost, assigned share, unassigned share, and upcoming commitments. Label allocations as estimates when they are estimates.

- Annual price divided by 12 may be shown as a **monthly equivalent**, not a monthly invoice amount.
- Preserve source billing cadence and commitment term separately.
- Separate MSP-paid/resold and company-direct purchases. Optional resale rate is informational only in this release.
- Null price is “Unknown,” not $0.
- Do not count a removed assignment as savings while the paid subscription continues unchanged.
- Avoid double-counting a purchased pool and its individual assignments in company totals.
- Unknown historical dates prevent exact historical allocation; show the limitation.

### 4.5 Identity and synchronization invariants

- External account key: organization/company + connection + provider object ID. Email is an attribute, not identity.
- Manual linkage proposals based on email require review when ambiguous. Never automatically merge across companies.
- Guest accounts, service accounts, shared mailboxes, and human members stay distinguishable.
- One person may have several accounts, including two accounts in one provider.
- Connected fields are source-owned. Store manual annotations/overrides separately and show conflicts.
- A partial sync cannot infer removals. Complete a resource collection before reconciling absence.
- Even a full snapshot's absence initially means **Not observed / needs verification** unless the provider gives authoritative deletion evidence or a bounded follow-up confirms it.
- Never end an access assignment merely because a connection failed or an administrator lost permission to list it.
- A Microsoft account disappearing must not automatically set a person's IT status to Departed.
- Confirmed deletion of an external object preserves its local historical record.
- Import and sync replay must be idempotent. Corrections append/revise with attribution instead of erasing old evidence.

### 4.6 History and concurrent edits

Use version numbers/ETags for editable records and workflow plans. Reject stale conflicting edits with a useful refresh/compare path. Audit who changed manual dates, costs, statuses, and links.

Timeline history is readable and filterable. Audit history is append-only through normal application access; describe it as an application audit trail, not cryptographically immutable or legally authoritative.

### 4.7 Assignment lifecycle

LicenseAssignments use **Active, Removal pending, Ended** as the adjudicated relationship state. Requests/proposals remain WorkItems. Separate provider observations retain their own source state, time, and uncertainty. Removal pending remains a current obligation and cannot pass the archive gate.

Transition to Ended only from authoritative provider evidence or a valid later technician verification under section 6.5. Record why the relationship ended and preserve contrary/older observations. Do not treat a local requested removal as completed service termination.

---

## 5. Core screens and interaction requirements

### 5.1 Overview

Show actionable sections: failed or waiting workflow steps, people offboarding, upcoming contractor reviews, stale connections, and open incidents. Every item opens its record. Company-scoped overview filters all sections consistently.

### 5.2 Company workspace

Tabs: Summary, People, Resources, Work, Incidents, Integration. Summary is about digital inventory and operational state. Company editing has no timezone, payroll, billing address, sales stage, or general business-task fields.

Company archival/deletion is deferred in the first release. Do not add a company archive button or soft-delete API that could hide active people or work. Demo reset is separately scoped to synthetic data. Person archival remains a core feature.

### 5.3 Person profile

Header: name, company, work email, IT status, source/freshness, primary actions. Tabs:

1. **Overview:** connected setup summary and unfinished work.
2. **Accounts & groups:** identities, enabled state, email/access groups, shared mailbox permissions.
3. **Apps & subscriptions:** assignments, dates, purchased commitment context, costs where known.
4. **Devices:** issued equipment and return disposition.
5. **Work & incidents:** linked tasks and investigations.
6. **Timeline:** chronological changes with source, actor, and time precision.

Actions: Edit IT details, Assign resource, Change status, Start onboarding/offboarding, Create incident, View archive readiness. Archive is disabled with an explanation until the server-computed gate passes.

### 5.4 Subscription and assignment screens

Product catalog offers add/edit/retire. Company subscription offers add/edit, seat capacity, price history, commitment dates, and assignment list. Person assignment picker shows only eligible company subscriptions/pools, available capacity, and manual/connected capability.

Removal confirmation explains whether it records manual removal, starts an external unassignment, or closes a proposed assignment. Never label all three “Unsubscribe.”

### 5.5 Group and mailbox screens

Group type is explicit: Security, Microsoft 365, Distribution, Mail-enabled security, or a clearly labeled manually maintained type. Show email address where applicable and supported management actions.

Shared mailboxes have a separate list with Full Access, Send As, and Send on Behalf records where known. Dynamic/inherited membership cannot be edited as if it were direct membership. Provide a reason and a supported alternative/manual task.

### 5.6 Work and automation screens

Work queue: type, company, target, owner, due date, status, blockers. Detail: ordered steps, source resources, evidence, attempts, next action. Automation configuration uses templates and a linear/dependency-aware step editor; a visual drag-and-drop workflow canvas is unnecessary.

### 5.7 Common screen behavior

- Empty state explains how to create/import/connect the first record.
- Errors distinguish validation, missing permission, unavailable provider, and stale state.
- Form edits survive recoverable server errors.
- Company switches clear incompatible selections.
- Bulk operations preview exact affected records; no hidden cross-company selection.
- All external mutation buttons route through a reviewable plan and authorized server endpoint.

---

## 6. Status changes, lifecycle work, and archive gates

### 6.1 Person states

Store the declared person status as **Planned, Active, On leave, or Departed**. Store `archived_at` separately. Derive an additional workflow badge such as **Onboarding in progress, Offboarding scheduled, Offboarding in progress, or Needs attention**. These are RANGER operational records, not an HR source of truth.

A person who has departed must visibly say **Departed · Offboarding in progress**, even while removal work is incomplete. Do not make factual departure depend on successful automation. “Archived” is the default display label for an archived record, while its underlying Departed status remains preserved.

| Transition | Required behavior |
|---|---|
| Planned → onboarding workflow | Create/reuse a reviewed workflow; display progress alongside Planned |
| Planned → Active | Required readiness steps resolved; show optional unfinished tasks separately |
| Active → On leave | Show access-review checklist; no automatic account suspension solely from status |
| On leave → Active | Review intended restoration; execute explicit actions if needed |
| Active/On leave → Departed | Record departure and create/link offboarding; badge shows incomplete cleanup |
| Future departure requested | Keep current declared status; show scheduled review/run; no early disabling |
| Offboarding workflow → Completed | Required checklist obligations resolved; person remains Departed |
| Departed → Archived | Set archived_at only when all required archive conditions pass atomically |
| Archived → Planned | Explicit reactivation clears archived_at, starts a new lifecycle cycle, and preserves history; no automatic access restoration |

Imported historical departed people can start as Departed but still require readiness assessment before archiving. Date passage creates a review item; it does not silently disable someone.

### 6.2 Status-change interaction

1. Choose target status and effective date if relevant.
2. See current resources and proposed checklist/actions.
3. Review owners, dependencies, supported automation, and manual requirements.
4. Confirm the request. Record actor/time and freeze the workflow plan version.
5. Show progress on the person profile and in Work.
6. Recompute readiness when new resources or source observations arrive.

### 6.3 Offboarding checklist

Required categories:

- **Accounts:** disable sign-in for linked human accounts where supported; verify result. Retain a disabled account if needed for history/retention; deletion is not mandatory.
- **Sessions:** attempt and record supported session revocation; distinguish API acceptance from guarantees about every downstream session.
- **Groups:** remove direct applicable memberships; for dynamic/inherited membership, resolve the upstream source or applicable rule through supported/manual work and verify effective removal. A checked “reviewed” box or account disable alone does not claim membership is removed. If effective removal is impossible in the available scope, keep a visible blocker rather than invent an exception. Unsupported email-group changes use explicit tasks.
- **Applications:** remove personal access and close all active personal license assignments with appropriate verification.
- **Shared resources:** resolve mailbox delegation and required file/mailbox ownership handoff tasks; no automatic destructive mailbox deletion.
- **Devices:** record return, reassignment, retirement, or a documented administrator-approved loss disposition. A missing device cannot simply disappear from the checklist.
- **Subscriptions:** review resulting unused seats and remaining commitments. Each affected continuing purchase has a recorded disposition: available for reuse, reduction scheduled, renewal review scheduled, or cancellation verified.

### 6.4 Archive predicate

Implement one authoritative server function `evaluateArchiveReadiness(personId, authorizedScope)` that returns `ready`, typed blockers, and evidence references. UI uses the same server result; API writes enforce the predicate again.

Archive requires all of the following:

1. Person is Departed and no lifecycle operation is running or awaiting verification.
2. No Active or Removal pending personal application/license assignment remains according to current verified evidence.
3. Every linked in-scope human account has verified access-disabled/deleted disposition, and required session work is resolved.
4. No unresolved personal group or mailbox permission remains in the tracked scope.
5. Required ownership/custody work has a valid recorded disposition.
6. Continuing subscription purchases have reviewed disposition, without requiring company-wide cancellation.
7. Required manual steps have actor, completion time, and evidence reference or a structured verification note describing what was checked.
8. Verification is after the latest relevant action/material resource change and has no unresolved newer contradictory observation. It must also be sufficiently fresh: default maximum age is 24 hours. Rerun stale checks. Manual confirmation follows section 6.5 and never changes an older displayed Microsoft observation into a new provider-verified fact.

Generate a versioned offboarding obligation manifest from the person's resource relationships and retain its targets. New discovered resources add obligations. Unlinking an account, retiring a product, editing a mapping, or reassigning a resource cannot erase unresolved obligations. Correcting a genuinely mistaken person/account link requires an audited identity-correction record, evidence, and the appropriate replacement owner; it must not falsely claim access removal. The archive evaluator checks both current relationships and unresolved manifest obligations.

There is **no “force archive” bypass for unresolved access or active personal assignments**. A valid Not applicable resolution requires a typed reason consistent with the target, not arbitrary text replacing a failed action. A blocker due to unsupported automation becomes a manual verification task; it does not disappear.

Use a per-person operation lock/transaction and version check to prevent simultaneous assignment and archival. Reject new assignments to Departed/Archived people or people with an executing offboarding run through normal UI/API. If a later sync discovers restored access for an archived person, clear archived_at through an audited system action, keep declared status Departed, create a high-priority follow-up work item, and show **Departed · Needs attention** in active operational queues. Preserve the original archive event. This local reopening must not silently mutate the external provider.

An archive result proves completion within the tracked and declared resource scope. Never claim RANGER can verify every unconnected application in existence.

### 6.5 Manual verification versus older provider observations

Manual verification may resolve unsupported provider actions/reads when a technician records the exact resource, external console/check used, observed final state, actor, time, and evidence reference or structured inspection note. It cannot merely say “done.” If an automated verification read is supported and available, run it rather than using a generic checkbox as an override.

A valid later manual verification can close the operational relationship/obligation while an older source observation stays visible as **Last Microsoft observation: active; later technician verification: removed**. Preserve both records and mark reconciliation pending; do not overwrite provider provenance. A newer contradictory provider observation reopens the obligation and invalidates archive readiness. Failed/partial sync alone supplies no manual verification evidence and cannot close anything.

---

## 7. Microsoft and other integrations

### 7.1 Connection strategy

Start with Microsoft Graph v1.0 and **app-only authentication for background inventory**, using an official supported authentication library and server-side credentials. For a private developer sandbox, use tenant-specific registrations. Inventory and action capabilities use separate app registrations/credential references, so inventory credentials genuinely remain read-only. A UI toggle does not remove application roles from a token. Design per-company connection records so a future production setup can use reviewed multi-tenant admin consent. Do not require MSP partner enrollment for basic tenant inventory.

Keep RANGER login separate from permission to administer a company's Microsoft tenant. A signed-in RANGER administrator does not automatically have external Microsoft authority.

The connection wizard records a tenant ID, verifies its identity, links it to the company, and tests individual capabilities. Store credential references in secured configuration; never expose tokens to the browser. A live tenant cannot be ambiguously mapped to two active companies in one organization.

### 7.2 Required capability vocabulary

Every capability records: **Implemented, Granted, Available in tenant, Last tested, Read/Write, and Execution method**. The UI derives enablement from these values.

Capabilities initially include user read/create/disable, direct membership read/write for supported groups, SKU/license read, license assign/remove, session revocation, and optional audit read. Email distribution administration and mailbox delegation initially use manual tasks.

### 7.3 Management boundaries

- Security groups and Microsoft 365 groups can have supported Graph membership operations, subject to permissions and group type.
- Email distribution groups and mail-enabled security groups are not ordinary Graph-writable membership targets. Read/classify where exposed; use explicit manual Exchange tasks for initial management.
- Dynamic distribution groups are not covered by ordinary Graph group inventory. Create manually maintained records when needed and show the coverage limitation.
- Shared mailbox discovery/permissions are not equivalent to listing Graph users. Use manual mailbox/delegation records initially. Exchange Online integration is future scope.
- A member account creation, an external guest invitation, and a mailbox becoming usable are distinct workflows. Do not treat a Graph invitation as how all employee accounts are created.
- User creation does not guarantee mailbox readiness. Licensing, prerequisites, asynchronous provisioning, and available permissions affect the outcome.
- Product assignment data does not prove negotiated supplier cost, cancellation eligibility, or subscription invoice terms.
- Do not auto-change privileged administrator accounts, role-assignable groups, or protected emergency accounts in this portfolio scope. Identify and block unsupported high-privilege targets with a clear explanation.

Initial live actions are restricted to an explicitly enrolled allowlist of disposable test identities and configured allowed tenant domains. Record reviewed test-account provenance; a naming prefix alone is insufficient authorization. Ordinary User.Read.All does not establish that a target lacks privileged roles. Before enrolling an existing target, require a documented administrator classification/check; block unclassified targets. If automated current role detection is later implemented, add its narrowly justified read capability and tests explicitly. Provider role restrictions remain an additional boundary, not a substitute for the allowlist.

### 7.4 Tenant setup and permissions appendix

The implementation must create `docs/microsoft-setup.md` and `docs/integration-capabilities.md`, using the official sources in section 21. Record exact endpoints, supported application/delegated permission types, and any required Entra roles for the chosen execution mode. Validate current least-privilege permissions during implementation rather than copying broad Directory permissions everywhere.

Separate read setup from opt-in action setup. A read-only connection should remain useful when mutation permissions are absent. Grant only capabilities that have implemented workflows. Do not request mail-send, directory write, audit read, or device management scopes solely because they might be useful later.

The live milestone includes a human-controlled tenant setup checklist. Credentials, eligible test licenses, and tenant-admin consent are external prerequisites. Microsoft developer sandbox eligibility must be checked; do not assume every Microsoft account qualifies.

### 7.5 Sync behavior

- Paginate completely. Persist safe checkpoints/delta cursors only after successful application of a batch.
- Use delta support where suitable; use bounded full snapshots for collections without appropriate delta support.
- Honor throttling/Retry-After and use bounded retry/backoff.
- Record collection-level success, errors, and last successful observation—not just one misleading green connection light.
- Periodic polling plus supported events/history can improve coverage, but cannot guarantee every short-lived assignment is observed. Show that limitation.
- Sanitized connector payloads retain source IDs and enough provenance for diagnosis; do not retain unnecessary full directory payloads indefinitely.
- Serialize overlapping sync runs per connection/collection. Reject older observations overwriting newer confirmed state.
- Tenant consent revocation produces a visible reconnect requirement and stops dependent automation.

Scope initial Graph membership inventory to **direct user memberships**. Preserve ID/type-only restricted member objects and mark their details unavailable. Hidden memberships require an extra capability such as Member.Read.Hidden; do not request it by default or interpret its absence as an empty group. Nested/effective membership is unknown unless calculated from a complete supported graph. Disclose Graph v1.0 member-type limitations, including service-principal omissions, rather than claiming a comprehensive directory permission graph. See [Microsoft membership behavior](https://learn.microsoft.com/en-us/graph/api/group-list-members?view=graph-rest-1.0).

### 7.6 Other vendors and import behavior

Adobe, SketchUp, and other products initially work through the manual catalog, company subscriptions, and assignments. Do not display functioning “Connect Adobe” or “Connect SketchUp” buttons unless those integrations actually exist.

Support CSV import templates for people, devices, subscriptions, and assignments. Each import has mapping/preview, row validation, duplicates, date precision, and a review step before applying changes. Use explicit stable external keys where supplied; do not rely only on display names.

Import mode is **upsert supplied rows**, not deletion-by-absence. Any snapshot reconciliation/removal mode must be an explicit separate reviewed operation. Show row-level outcomes and keep the source batch reference. Guard exported CSV cells against spreadsheet formula injection.

---

## 8. Workflow execution and reliability

### 8.1 Template model

Role templates express setup intent: account attributes, group targets, license targets, manual product tasks, device tasks, and an optional required end-date review. Shared templates use company-specific bindings. Never reuse one client's external group IDs for another client.

Template versions are immutable once used. Editing creates a new version and does not silently change existing people or active runs.

### 8.2 Plan, approve, execute, verify

1. Resolve exact company, person, accounts, groups, and resources.
2. Check permissions, capability support, required fields, and available capacity.
3. Produce an immutable plan with proposed differences, manual steps, risks/limitations relevant to the action, and target version.
4. Show the preview and collect product-level confirmation from an authorized operator.
5. Before execution, recheck authorization, target state, and significant plan assumptions. Require a new preview if the plan has materially changed.
6. Execute background steps with dependencies and durable attempts.
7. Verify resulting state where possible. Distinguish **Request accepted** from **Verified complete**.
8. Update the work queue and timeline with sanitized outcomes.

### 8.3 State model

Runs: Draft, Ready, Queued, Running, Waiting for manual work, Needs attention, Completed, Canceled.

Steps: Pending, Running, Awaiting verification, Waiting for manual work, Succeeded, Failed, Skipped, Canceled.

Required steps cannot be marked Skipped without a semantically valid Not applicable result. Optional steps remain distinguishable. A run completes only when its completion predicate passes; queue delivery success is not workflow success.

### 8.4 Recovery semantics

- Use a durable queue plus application idempotency keys. Queue guarantees alone do not make external APIs exactly-once.
- Lock the target operation to prevent overlapping lifecycle changes.
- Persist external correlation IDs and discovery keys before/after requests as appropriate.
- After a timeout on account creation, query for the operation's intended external account and reconcile before retrying. Do not create a second account blindly.
- Retry only failed/unverified steps after checking current state. Do not repeat successful creation or invitations.
- Cancellation stops pending work but does not imply rollback of completed external actions.
- Rollback/compensation, where offered, requires an explicit plan. Do not automatically delete a newly created account containing data to undo a later failure.
- Recheck staff authority at enqueue and execution. Revoked permissions stop pending actions.
- Startup recovery resumes durable work without relying on browser tabs or in-memory timers.
- Worker jobs carry tenant/company context from trusted records, never arbitrary client-supplied URLs or credentials.

### 8.5 Notifications and secrets

Initial notifications are in-app. A local email preview sink can demonstrate a welcome message without delivering real email. Real welcome email is optional and requires a configured approved sender and a separate successful delivery state.

No passwords in email, logs, screenshots, or normal event records. If account creation requires an initial secret, generate and persist it in encrypted short-lived secret storage **before** POST /users; queue payloads contain only a secret reference. Use forced change where supported, one-time authorized retrieval if implemented, and prompt disposal. After an ambiguous create, reconcile the same operation before retry. If creation succeeded but the initial secret is lost/expired, require an explicit manual administrator reset path; do not recreate the account or assume User.Create includes password-reset authority. Document this recovery path.

---

## 9. Incidents, evidence, and recurring issues

### 9.1 Incident essentials

Required: company, title, reported symptom, owner, severity, status. Optional: affected people/resources, onset time, impact description, tags, external ticket reference.

Statuses: Open, Investigating, Waiting, Resolved, Closed. Resolution requires a summary and distinguishes confirmed cause from an unresolved hypothesis. Reopening preserves prior resolution history.

### 9.2 Evidence sources for the first release

- RANGER timeline/audit/workflow events linked by resource and selected time range.
- Uploaded `.txt`, `.log`, `.csv`, `.json`, and `.jsonl` files.
- PNG/JPEG screenshots.
- One deterministic local demo service that emits structured events and correlation IDs.
- Optional Microsoft audit events only when the tenant capability is granted and available.

Native Windows `.evtx`, arbitrary binary parsing, internet-wide collection, and unrestricted webhook ingestion are outside the first release. Windows events exported as supported text/JSON/XML-derived text can be attached as text; do not claim native EVTX support.

### 9.3 Ingestion and evidence integrity

- Default limit: 10 MB per file, 25 files per incident, 100 MB total per incident. Make limits configurable and enforce on the server and streaming upload path.
- Treat uploaded content as untrusted data. Never execute commands, follow embedded instructions, or auto-open remote URLs from a log.
- Validate allowed types and decoded content; reject archives, HTML/SVG, executables, and malformed oversized structures.
- Store files outside the web root or in private object storage. Downloads require current authorization; use safe attachment headers.
- Record file hash, uploader, source label, collection time if known, original timestamp precision, parser version, and parsing result.
- Parse in a bounded worker; preserve the source file and show parse warnings. Do not silently drop malformed rows.
- Normalize timestamps where interpretable; preserve originals and timezone uncertainty. Do not silently assume an unstated source timezone.
- Allow a redacted derivative for export; preserve internal provenance. Export the selected reviewed version, not the unredacted original by accident.
- Avoid secrets in application telemetry. Provide review/redaction guidance for uploaded logs; label redaction helpers as assistance rather than a guarantee.

### 9.4 Investigation timeline

Merge selected evidence and related resource changes into a time-ordered view. Show time source/precision, source system, event type, and linked resource. Unknown-time items have a separate section rather than a fabricated order.

Entries are typed **Observation, Hypothesis, Action, Result, or Note**. A technician can link supporting/contradicting evidence and record attempted fixes. No automatic statement of root cause based solely on temporal correlation.

### 9.5 Escalation package

Generate a Markdown report and a downloadable ZIP containing that report, a manifest, and explicitly selected permitted attachments. A print-friendly HTML preview is sufficient; PDF generation is optional.

Include incident identity, impact, affected resources, timeline, attempted fixes/results, confirmed findings, hypotheses, outstanding questions, selected evidence references, and known data limitations. Show a review screen before export with sensitive fields/attachments visible for exclusion.

Record the package's creator, scope, selected evidence versions, and generation time. Exports are private and access-controlled. Do not email or publicly share packages automatically.

### 9.6 Related incidents and problems

Implement deterministic explainable scoring first. Suggested weights: same error code +4, same affected application +2, same device +3, shared symptom tag +1 each (cap 3). Require enough overlap to avoid generic suggestions; calibrate against fixtures. Store the scoring version and reasons.

Do not compare across companies by default. An authorized MSP-wide aggregate can be future scope; no client should learn about another client's incidents through suggestions.

A technician can dismiss a suggestion, link incidents, or create a Problem record with owner, linked incidents, working cause, permanent-fix task, and resolution. A suggestion is not proof of a common cause.

---

## 10. Technical architecture

### 10.1 Default stack for a new repository

Choose current stable compatible releases at M0, verify their official documentation, and pin exact dependencies in a lockfile. Do not write speculative future APIs from memory.

| Layer | Default |
|---|---|
| Language | TypeScript with strict checking |
| Web | React + Vite, React Router, TanStack Query |
| UI | Accessible reusable components, semantic HTML, CSS variables; a maintained accessible component library is acceptable |
| API | Node.js current supported LTS + Fastify; request/response schema validation |
| Database | PostgreSQL; node-postgres with parameterized SQL and checked-in migrations |
| Authentication | Better Auth with PostgreSQL-backed sessions; disable public self-registration in private mode |
| Jobs | pg-boss backed by PostgreSQL, plus application-level step idempotency |
| Evidence storage | Local private directory in development; private S3-compatible object storage adapter for deployment |
| Unit/API tests | Vitest and Fastify injection/integration tests against an isolated PostgreSQL database |
| Browser verification | Playwright end-to-end tests |
| Local development | Docker Compose for PostgreSQL; documented processes for web/API/worker |
| CI | Repository-native CI, such as GitHub Actions, with lint, typecheck, tests, migration check, and production build |

This stack deliberately keeps UI, API, background work, and data storage explicit. Do not introduce an ORM as a second data path halfway through. If the existing project already uses one, use it consistently and retain the domain constraints.

Official starting references: [React/Vite](https://react.dev/learn/build-a-react-app-from-scratch), [Fastify TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/), [Better Auth with Fastify](https://better-auth.com/docs/integrations/fastify), [node-postgres transactions](https://node-postgres.com/features/transactions), [pg-boss](https://github.com/timgit/pg-boss).

### 10.2 Suggested repository layout

```text
apps/
  web/                  # Product UI; no provider credentials
  api/                  # HTTP API, authentication integration, authorization
  worker/               # Sync, workflow steps, parsing, exports
packages/
  domain/               # Types, state rules, readiness/cost functions
  db/                   # SQL migrations, repositories, transaction helpers
  integrations/         # Microsoft adapter and deterministic demo adapter
  contracts/            # Validated API/event payload schemas
  test-fixtures/        # Synthetic tenant/resource/incident scenarios
docs/
  build-status.md
  architecture.md
  data-model.md
  microsoft-setup.md
  integration-capabilities.md
  operations-runbook.md
  security-and-limitations.md
  demo-guide.md
  decisions/
tests/
  integration/
  e2e/
infra/
  compose.yaml
```

Avoid circular package imports. The domain layer should not import React or make Microsoft HTTP calls. Providers implement typed interfaces; domain services decide the workflow and authorization.

### 10.3 API conventions

Use routes under `/api/v1`. Company routes look like `/companies/:companyId/people/:personId`; derive organization scope from the authenticated session and checked membership.

Essential route families:

- Companies and staff company grants.
- People and resource relationships.
- Catalog products, company subscriptions, assignments, and price versions.
- Groups, mailboxes, devices, and their assignments.
- Import preview/apply/results.
- Connection test/sync/status/capabilities.
- Workflow preview/confirm/status/retry/cancel.
- Person status-change preview/confirm and archive-readiness/archive/reactivate.
- Incident CRUD, evidence upload/list/download, investigation entries, related suggestions, problem links.
- Escalation preview/generate/download.

Return consistent validation errors and a safe request correlation ID. Use 401 for unauthenticated, 403 for a known forbidden operation where disclosure is appropriate, 404 for inaccessible object lookup, 409 for state/version conflicts, and 422 for valid requests failing domain prerequisites. Do not leak foreign object existence through detailed errors.

List endpoints require pagination and bounded filters. Persist field constraints on both API and database. Use a transaction client for all queries within a transaction; do not mix pooled clients during one atomic operation.

### 10.4 Authorization model

| Operation | Admin | Technician with company grant | Viewer with company grant |
|---|---|---|---|
| Read permitted company inventory/incidents | Yes | Yes | Yes |
| Manual IT resource/task changes | Yes | Yes | No |
| Execute enabled ordinary lifecycle actions | Yes | Only with explicit automation-execute grant | No |
| Configure live connections/credentials | Yes | No | No |
| Manage staff and company grants | Yes | No | No |
| Export incident evidence | Yes | Yes | No by default |
| Approve special device-loss disposition | Yes | No | No |
| Archive a person | Gate required | Gate required | No |

Global Product catalog editing is admin-only; technicians can select existing products and manage subscriptions in granted companies. Staff account creation/invitations are explicit private administrative actions; do not make managed company users RANGER staff automatically.

Enforce authorization in queries, mutation services, background jobs, downloads, exports, and search. Test cross-company links at the database boundary. Row-level security can add defense in depth if implemented with a correctly scoped non-owner application role, but it does not replace explicit authorization. Do not add an untested RLS policy and claim tenant isolation is solved.

### 10.5 Authentication and demo isolation

Private mode uses the maintained authentication library's email/password login and session mechanism, secure cookies, CSRF/origin protections for mutations, and explicit staff provisioning. Provide a first-admin provisioning command using securely supplied credentials; do not check credentials into the repository. External identity-provider login is optional later. Disable public signup by default. Do not build custom password hashing or accept a role header from the client.

Public demo mode uses the maintained authentication library/session framework to issue an expiring demo session and a per-visitor synthetic organization copied from deterministic seeds. Create unique server-owned demo identities/memberships for each visitor; do not reuse a global admin identity across cloned workspaces. Any demo role switching remains restricted to that visitor's workspace and is authorized by the server. The session is bound to that demo organization's permitted role. Rate-limit creation, cap concurrent demo jobs/uploads, and expire/demo-cleanup the data. A simpler shared read-only demo is an acceptable fallback if interactive isolation cannot be completed; document that limitation rather than exposing shared writable data.

Public demo process/configuration must contain no live credentials and must reject live connector creation and outbound administrative actions on the server. Private sandbox demonstration runs separately. Seed/demo reset actions must be physically and logically unable to mutate the live tenant.

### 10.6 Reliability, operations, and performance

- Structured application logs with correlation IDs and secret redaction.
- Health endpoint for process liveness; readiness checks database/worker essentials without expensive provider calls.
- Database migrations checked in and reproducible from an empty database.
- Graceful worker shutdown and safe restart recovery.
- Private storage access, expiration, backup, and deletion policy documented.
- A backup/restore rehearsal for the demo database and evidence storage, with observed results.
- No universal exact-once claim. Make application state transitions idempotent and externally reconcile ambiguous outcomes.
- No unbounded process memory for log parsing or reports.
- Initial measured fixture target: 10 companies, 2,000 people, 10,000 assignments, 20,000 timeline events. Aim for a typical paginated list/search API under 750 ms on documented development hardware. Measure and report actual results; do not assert an unmeasured production SLA.
- External sync and parsing run in background jobs; the UI returns a run ID promptly and displays progress.

---

## 11. M0 — Foundation and runnable skeleton

**Outcome:** A new developer can start RANGER, sign in to a private development instance or enter the synthetic demo, navigate company scope, and verify that unauthorized data is inaccessible.

### M0.1 Implement

1. Inspect repository and document stack/version choices in `docs/decisions/0001-architecture.md`.
2. Scaffold web, API, worker, shared schemas, PostgreSQL, migrations, lint/typecheck, and test runners.
3. Configure maintained authentication and the organization membership/company grant model.
4. Create minimal Organization, Company, StaffUser references, grants, audit events, and demo-session records.
5. Implement the application shell, company switcher, breadcrumbs, keyboard navigation, and basic error boundary.
6. Create organization/company overview skeletons backed by actual records. Only implemented destinations are enabled; show explicit empty states for later features.
7. Add the initial deterministic seed organization and three companies from section 17.
8. Implement same-company relationship helpers, authorization middleware/service guards, and private download authorization foundation.
9. Add CI and one-command documented setup. Include `.env.example` containing names and placeholders only.
10. Create `docs/build-status.md` and a milestone verification folder.

### M0.2 Verification

- Database can migrate and seed from empty state without manual SQL edits.
- Admin sees all three seed companies; technician sees only granted companies; viewer cannot mutate.
- Guessed foreign company IDs are denied in both a direct API request and UI navigation.
- Session expiration/log out removes access; mutating requests require valid session/origin protections.
- App shell works with keyboard and at specified viewport widths.
- Restarting API/worker preserves stored records.
- No live credential exists in demo fixtures, browser responses, or logs.

### M0.3 Done means

The skeleton is runnable and authorization is exercised by tests. It is not enough to render a login mockup and static sidebar. Deliver README setup, initial architecture/data model notes, and a recorded verification result with commands and outcomes.

---

## 12. M1 — Connected inventory and manual management

**Outcome:** A technician can model a company's real digital setup using manual records, inspect it from any direction, and preserve historical changes.

### M1.1 Implement in vertical slices

**Slice A — People and accounts**

- Company People list, search, filters, creation/editing, and profile.
- Declared IT status plus separate workflow/archive fields as specified; direct archive remains gated.
- Manual account records with account kind and enabled/disabled/unknown state.
- Reviewed linking/unlinking of a person and account; retain audit history and offboarding obligations. An unlink must not be an archive bypass.

**Slice B — Products and subscriptions**

- Organization product catalog: add, edit, retire.
- Company subscriptions: quantities, supplier/payer, price versions, cadence, commitment/renewal dates.
- Seat/entitlement pools and assignments; unknown and multi-purchase mappings supported.
- Assign, remove, and reassign actions with historical intervals and source/evidence.
- Product and subscription detail pages link to assigned people.

**Slice C — Groups, email, and devices**

- Manual security/Microsoft 365/distribution/mail-enabled groups and group memberships.
- Separate shared mailbox/delegation records.
- Devices and current/historical assignment; custody disposition.
- Person tabs display all relationships without duplicating data into independent UI stores.

**Slice D — Import, work, and cost views**

- CSV templates, preview, validation, deduplication, apply, row-level result display.
- Basic IT WorkItem CRUD with typed completion evidence, before advanced automation.
- Company and person cost summaries with currency separation and unknown prices.
- Timeline filters and record-level change history.
- Basic archive readiness endpoint evaluates manual obligations; it must already reject unresolved access. The full guided flow arrives in M3.

### M1.2 Representative user stories

- Add SketchUp Pro to the catalog, create Harbor's five-seat subscription, and assign a seat to Alex from Alex's profile.
- Open the subscription and see Alex immediately; open Alex and see the same assignment and price provenance.
- End Alex's assignment while the purchased seat remains available. History retains both events.
- Move a laptop from one person to another; one current assignment and both historical holders remain.
- Add a distribution group and shared mailbox access without pretending either is a software purchase.
- Edit a historical price by creating an effective-dated version; the old period remains reproducible.

### M1.3 Verification

- Duplicate import is a no-op for current assignments and does not duplicate timeline events.
- Omitted CSV rows do not delete people or resources.
- A company A person cannot receive company B's device, group, or subscription—even through direct API calls.
- Manual capacity is enforced under concurrent assignment attempts.
- Person email change preserves identity and relationships.
- USD/EUR costs remain separate; missing price is Unknown.
- Removed assignment remains in historical report and does not reduce purchased subscription cost automatically.
- Retiring a catalog product blocks new selection and preserves existing records.
- Archive fails if a manual personal assignment remains active, even if a work item is marked complete.
- All implemented add/edit/remove actions persist after refresh; form errors are useful.

### M1.4 Done means

The app already works as a manual digital IT inventory. Deliver sample import files, a short walkthrough, relationship/schema documentation, and passing invariant tests. Microsoft actions may not be simulated as live in this milestone.

---

## 13. M2 — Real Microsoft read integration

**Outcome:** A permitted company can connect a Microsoft test tenant and display real users, supported groups, memberships, and license observations with honest freshness and capability information.

### M2.1 Implement

1. Create Microsoft and demo provider adapters behind typed contracts.
2. Implement secure connection configuration and tenant/company identity validation.
3. Add a capability test and staged permission guidance with official endpoint references.
4. Implement user inventory with selected required properties, complete pagination, stable external IDs, and safe person-link proposals.
5. Implement supported group inventory/classification and direct membership observations. Mark hidden/inaccessible/computed coverage appropriately.
6. Read subscribed SKU pools and user license assignment properties compatible with the chosen authentication mode.
7. Persist per-collection sync runs, timestamps, errors, and normalized observations.
8. Schedule bounded background sync; expose Sync now/status/history.
9. Preserve manual subscription pricing and purchase mappings separately from observed licensing pools.
10. Add linked timelines and source/freshness badges throughout the inventory screens.

### M2.2 Required Microsoft read details

For app-only background sync, use `/users` with the necessary selected assignment fields and `/subscribedSkus`. Do not depend on `/users/{id}/licenseDetails` for app-only operation: the current permission table lists application permissions as unsupported. An optional delegated detail view may be implemented separately if needed. See [licenseDetails permissions](https://learn.microsoft.com/en-us/graph/api/user-list-licensedetails?view=graph-rest-1.0).

Treat `assignedLicenses` and `licenseAssignmentStates` as entitlement observations, not proof of historical exact assignment dates or supplier contract prices. Distinguish direct and group-derived assignments so later removal plans address the real source.

Do not request Intune permissions or imply device enrollment visibility merely because devices exist in RANGER. Devices remain manual initially.

### M2.3 Verification without tenant credentials

Fixture/API-contract tests cover multiple pages, missing fields, unauthorized collections, throttling, token expiry, duplicate observations, out-of-order observations, deleted users, renamed users, and a SKU linked to multiple purchase records.

Show a deterministic connection failure and recover it. A partial group sync must not remove memberships or satisfy offboarding.

### M2.4 Live smoke test

In an explicitly authorized private test tenant:

- Connect with read capabilities and retrieve real objects.
- Compare a small sample of users, group memberships, and SKU quantities with the administrator's source view.
- Change a test account attribute or license assignment externally using authorized tools; sync and verify RANGER updates the correct existing record.
- Record endpoint/auth mode, test time, sanitized object references, expected/observed result, and limitations.
- Verify no real account data enters the public demo dataset or screenshots without deliberate sanitization.

### M2.5 Done means

Read integration code, capability/error UI, and fixture tests are complete. Mark **live verified** only after the real smoke test passes. If tenant access is unavailable, label that gate blocked and continue independent later work using the explicit demo adapter.

---

## 14. M3 — Lifecycle workflows and Microsoft actions

**Outcome:** A technician can onboard a person using a reviewed template, recover partial failures, change IT status with a checklist, and archive only after tracked offboarding obligations are resolved.

### M3.1 Implement

1. Versioned role templates and company resource bindings.
2. Onboarding preview with target IDs, desired changes, capacity/prerequisite checks, manual steps, and approval.
3. Durable workflow runs/step attempts, dependency execution, retries, cancel, and post-action verification.
4. Supported Microsoft actions for ordinary cloud test users: create account, add/remove supported direct group membership, assign/remove direct license, disable account, request session revocation.
5. Manual email-group/shared mailbox/application steps with honest verification provenance.
6. Status-change wizard and separate declared status/progress badge.
7. Offboarding resource discovery, checklist generation, and required evidence.
8. Authoritative archive readiness, transactional gate, archival, and audited reactivation.
9. Reopening/follow-up when a later source observation discovers renewed access for an archived person.
10. In-app notifications and optional local welcome-email preview. Real guest invitations/email are not required to finish M3.

### M3.2 Onboarding flow

Person details → role template → company resource mapping → planned actions → operator confirmation → queued execution → step verification/manual fulfillment → ready to mark Active.

Licensing prerequisites include a valid usage location where required. Set it at account creation. Repairing an existing account's missing usageLocation is a separate supported update capability or manual prerequisite; LicenseAssignment.ReadWrite.All alone does not authorize arbitrary profile changes. This is a person/account licensing field, not a company timezone setting. Handle unavailable license capacity with an actionable failure. Group-based licensing is only used when the tenant supports it and the template explicitly chooses it; do not assign both direct and inherited licenses accidentally.

Mailbox readiness remains a distinct explicit verification/manual step if there is no tested mailbox-admin capability. A non-null `mail` attribute is insufficient evidence of a usable mailbox.

### M3.3 Offboarding flow

Choose Departed or schedule a departure review → record request/date → inspect linked resources → preview changes → execute supported steps → verify/manual evidence → review continuing purchases and device custody → evaluate archive readiness → archive.

“Departed” remains visible immediately when recorded, alongside incomplete offboarding. Do not imply the person is still active simply because cleanup failed.

### M3.4 Critical action-specific constraints

- Group membership removal must use `DELETE /groups/{groupId}/members/{userId}/$ref`. Verify the exact URL in a test. Omitting `/$ref` can delete the directory object if permissions allow it. See [Microsoft removal documentation](https://learn.microsoft.com/en-us/graph/api/group-delete-members?view=graph-rest-1.0).
- Block dynamic, hybrid-mastered, role-assignable, and otherwise unsupported group mutations.
- Do not claim direct license removal resolves a group-inherited entitlement. Resolve the source or create a manual exception task and verify final effective assignment.
- Treat provider acceptance, propagation, and verified state as separate phases with bounded verification retries.
- Account deletion and mailbox deletion are not routine offboarding actions in this release.
- Do not execute against protected/admin/service accounts. A denied or unclassified target requires review and stays unresolved.
- Session revocation completion records that the provider accepted the supported request, not that every session everywhere ended instantly. Effects can be delayed and external guests' home-tenant sessions are outside that operation. Keep this limitation visible in the step evidence.

### M3.5 Verification

- A successful synthetic workflow creates one account, correct memberships, one assignment, manual tasks, and a coherent timeline.
- A license failure leaves earlier successful steps intact; retry does not create a second account.
- Timeout after external creation triggers reconciliation rather than duplicate creation.
- Restarting the worker resumes without duplicate side effects.
- Editing a template does not change an already approved run.
- Revoking a technician's execution permission prevents queued writes from running.
- Distribution group and mailbox tasks are visibly manual and cannot masquerade as provider-verified.
- All checklist ticks plus an active assignment still fails archive.
- A retained annual seat with ended personal access and reviewed disposition does not block archive.
- A concurrent archive/resource change fails safely and refreshes the blocker list.
- New access on an archived person reopens local attention without silent remote remediation.
- Optional emails are never sent during demo reset or repeated workflow retries.

### M3.6 Private live action demonstration

Use an explicitly permitted disposable test user in the authorized sandbox. Preview and perform one bounded onboarding cycle, then offboarding. Verify account creation, supported memberships, and license assignment/removal with real provider observations. Record any capability that required manual completion. Do not delete unrelated tenant objects or create paid subscriptions.

### M3.7 Done means

The complete lifecycle story is usable, gates are server-enforced, retries work, and simulated versus live verification is reported accurately. Deliver the setup/action runbook and a before/after demonstration with no exposed secrets.

---

## 15. M4 — Investigation and recurring problems

**Outcome:** A technician can investigate an issue with connected context, uploaded evidence, attempted fixes, and an export another technician can use. Related incidents help identify repeated operational problems.

### M4.1 Implement

1. Incident list/detail, status/severity/owner controls, and affected-resource linking.
2. Company-scoped evidence upload, private storage, hashing, bounded parsing, safe preview, and download authorization.
3. JSON/JSONL and plain-text log ingestion; CSV row inspection. Generic parsing may extract timestamps and error codes conservatively; retain warnings and raw context.
4. Selection of relevant RANGER events by resource/time range; preserve source references rather than copying editable summaries as original evidence.
5. A small local demonstration service that emits documented JSONL events for normal behavior, a deliberate authentication error, and a recovery. It must run independently of a paid service.
6. Optional Microsoft audit collection behind a separately granted capability. Missing audit entitlement does not break ordinary incident use.
7. Investigation timeline with observations, hypotheses, actions, results, and notes.
8. Escalation preview, attachment selection/redaction selection, Markdown report, ZIP/manifest export, and private downloads.
9. Explainable same-company related-incident suggestions and human-confirmed Problem records.
10. Incident/problem links on person, account, group, product, and device pages.

### M4.2 Primary scenario

An onboarding run fails to assign a license. From the failed step, create an incident with the exact person, account, run, provider error, and correlation ID already attached. Add a sanitized log and an investigation note. Compare with an earlier incident involving the same error/application. Record the fix, retry the failed step, attach the verified result, and export the handoff.

This is one connected workflow. Do not build an independent ticket mockup that cannot reference the actual automation failure.

### M4.3 Secondary scenario

The local demo service emits a burst of authentication errors after a configuration change. Import the logs, preserve the timestamps and source, link the affected application, and build an investigation timeline. Show the configuration-change observation and the error burst without asserting causation automatically. A technician records their confirmed explanation after the demonstration verifies it.

### M4.4 Verification

- Upload limits apply before and during processing; malformed records produce warnings without crashing the worker.
- HTML/script-looking text and embedded commands render inertly.
- One company cannot link, fetch, search, or export another company's evidence.
- Unknown log timezone remains explicit; events are not silently placed in the wrong order.
- File hash and source metadata remain stable; redacted derivatives are separately identifiable.
- Selected redacted attachments—not their raw originals—appear in the export.
- Escalation report faithfully reflects the chosen evidence and hypothesis/fact classification.
- Repeated exports are consistent with the selected source versions, while retaining distinct generation metadata.
- Related-incident suggestions have visible reasons and remain within authorized company scope.
- Dismissed suggestions stay dismissed for the same evidence/scoring revision.
- Creating a Problem links existing incidents and their permanent-fix task without duplicating them.

### M4.5 Done means

The investigator can complete both scenarios and another person can understand the exported report without opening the original RANGER session. Deliver sample sanitized logs, parser limitations, the local demo-service instructions, and example synthetic escalation output.

---

## 16. M5 — Complete verification and portfolio delivery

**Outcome:** RANGER is a cohesive, documented, demonstrable application with known limits and evidence supporting its implementation claims.

### M5.1 End-to-end completion

Walk every enabled route and primary action with the seed dataset. Remove abandoned features/placeholders. Fix broken navigation, inconsistent company scope, orphaned relationships, ambiguous labels, missing empty states, and unrecoverable form errors.

Complete the main person lifecycle story and the investigation story without modifying the database by hand. Verify refresh/back navigation, filtered links, search, and record history.

### M5.2 Required test layers

**Domain tests:** archive predicate, money/cadence calculations, assignment intervals, status transitions, capacity rules, source freshness, and recurring scoring.

**Database/API tests:** company boundary enforcement, transactional assignment/archive conflicts, idempotent imports, history retention, scoped search, worker ownership, private evidence authorization, and stale-plan conflicts. Use real PostgreSQL for constraint/concurrency tests.

**Provider contract tests:** paginated reads, throttling, insufficient permissions, ambiguous creation, eventual consistency, revoked consent, safe group-removal URL, and inherited entitlement handling. These are not substitutes for live verification.

**Browser journeys:**

1. Manual catalog → company subscription → person assignment → removal → historical view.
2. Onboarding → injected license failure → recovery → person readiness.
3. Departed status → offboarding blockers → manual/automated resolution → archive.
4. New observation after archive → reopened needs-attention work.
5. Incident → evidence → related suggestion → escalation export.
6. Technician/viewer restrictions and company-switch consistency.

Do not inflate test count with tests that merely repeat trivial UI implementation. Focus on meaningful behavior and failure cases.

### M5.3 Operational verification

- Production build succeeds from a clean checkout with the pinned lockfile.
- Database migrations work on an empty database and on a prior milestone fixture.
- Worker restart during a run recovers safely.
- Private credential configuration fails clearly when missing; no fallback to unauthorized demo data.
- Restore a synthetic database/evidence backup into a separate development environment and verify linked records/files.
- Measure representative list/search performance and record fixture size, hardware, and latency observations.
- Run accessibility checks plus keyboard/manual review of the critical journeys.
- Verify automated dependency checks and resolve material exposed issues; document remaining relevant limitations without claiming a security certification.

### M5.4 Demonstration modes

**Public synthetic demo:** accessible without live tenant credentials; clearly marked Demo; supports safe scripted interactions in an isolated visitor workspace or a documented read-only fallback.

**Private Microsoft demo:** authorized tenant-backed connection, known disposable test identities, real observations, separately enabled actions, sanitized screen recording. It must remain private unless the human explicitly approves a safe presentation of its data.

**Failure demonstration:** deliberately fail one license action in the demo adapter, show partial completion, retry after resolving the cause, and prove there is only one created account. This is a product story, not a hidden test-only console trick.

### M5.5 Deployment

Prepare container/build configuration, environment-variable documentation, database migration procedure, worker launch, private storage, backups, and rollback steps. Use the human's selected hosting environment and applicable repository/deployment instructions. Do not purchase hosting or publish live client data as a side effect of completing this file.

If public hosting is not configured, deliver a reproducible local/container demo and a deployment-ready package; mark actual public deployment as pending rather than claiming a URL exists.

### M5.6 Required documentation and portfolio artifacts

- **README:** what RANGER does, screenshots, quickstart, demo path, and live/manual capabilities.
- **Architecture diagram:** web/API/worker/database/provider boundaries and credential location.
- **Data model:** key entities, relationships, and history/archive invariants.
- **Microsoft setup:** exact chosen authentication mode, scopes, consent/setup steps, capability tests, test identity restrictions, and known endpoint limits.
- **Operations runbook:** failed sync, expired consent, failed workflow step, incomplete offboarding, backup/restore, and evidence export.
- **Security and limitations:** tracked scope, tenant isolation, secret handling, manual verification, logs, source coverage, and non-goals.
- **Demo guide:** five-to-seven-minute script and how to reset synthetic data safely.
- **Verification report:** passed/failed/blocked checks, fixture sizes, actual measurements, and live-verified scope.
- **Short product case study:** the user problem, design choices, a concrete before/after workflow, tradeoffs, and what testing changed. Do not invent customers, revenue, interviews, or time savings.
- **Sanitized screenshots and optional recording:** show genuine app state. Label simulated provider behavior.

### M5.7 Done means

The acceptance matrix in section 18 is accounted for; critical gates pass; the complete story runs; documentation supports another developer/operator; and no unresolved limitation is disguised as a finished feature. Any blocked live or hosting gate is clearly separated from completed software work.

---

## 17. Demo dataset and scripted scenarios

### 17.1 Synthetic organization

Create **Northstar IT — Demo** with these fictional companies:

| Company | Purpose in the demonstration |
|---|---|
| Harbor Architecture | Primary contractor onboarding/offboarding and design subscriptions |
| Cedar Studio | Separate company with similar product names and independently scoped users |
| Summit Systems | Smaller internal-style IT environment and incident examples |

Use reserved `.example` email domains in synthetic data. Never send messages to them. Live test users use the actual authorized tenant domain configured by the operator, not a hard-coded real organization domain.

Create admin, technician, and viewer demo staff identities. The technician has Harbor/Cedar grants, the viewer only Harbor. The seed must contain at least one company inaccessible to each non-admin role.

### 17.2 Resource inventory

Seed approximately 36 people across the three companies, with a mixture of declared statuses and workflow progress. Include:

- Alex Rivera, a Harbor design contractor with an explicit two-week assignment interval.
- A new planned starter waiting on an onboarding step.
- A departed person with unresolved mailbox delegation.
- An archived person with clean historical assignments.
- Two different people in different companies with the same display name.
- A same-email collision across companies to exercise isolation/linking logic.
- A service account with no person; a guest account; a manually maintained shared mailbox.
- Security, Microsoft 365, distribution, mail-enabled security, and computed/dynamic membership examples, all labeled with actual demo capabilities.
- Devices in assigned, available, repair, returned, and retired states.
- Microsoft demo pools plus manually maintained Adobe, SketchUp, and one organization-wide product.
- An unknown price, a second currency, a subscription with zero available seats, and an annual commitment billed monthly.

All prices are explicitly fictional test values. Do not present them as current vendor pricing.

### 17.3 Fixed scenario clock

Use a controllable clock in domain tests and deterministic fixture generation. The demo can show a clearly labeled scenario date, for example September 30, 2026, so the two-week September 3–17 contractor history is reproducible. Do not alter the machine's clock or reuse the scenario clock for real provider actions. Sessions, rate limits, credential expiry, job leases, and demo cleanup always use real time. The scenario clock affects only synthetic IT lifecycle events and domain scenarios.

### 17.4 Mandatory scenarios

**D1 — Temporary contractor history**  
Alex has Microsoft and SketchUp assignments effective September 3–17. A September 30 active view excludes the assignments; the historical view retains them with known date provenance. The purchased annual SketchUp seat remains available. No automatic savings claim appears.

**D2 — Partial onboarding**  
Create account succeeds; supported group addition succeeds; license assignment fails due to a simulated capacity/prerequisite issue. Manual SketchUp work can progress independently. Resolve the issue and retry only the failed step.

**D3 — Archive blocked**  
Alex is marked Departed. A manual application assignment and mailbox delegation remain active. Archive-readiness names both blockers. Checking unrelated tasks does not satisfy them.

**D4 — Clean personal exit, continuing purchase**  
Personal access is removed and verified, equipment disposition resolved, and the ongoing annual seat is marked available for reuse. Archive succeeds. The company subscription remains active.

**D5 — Incomplete provider visibility**  
User sync succeeds but group pagination fails. Last-known memberships stay visible and stale. Archive verification does not turn green.

**D6 — Incident handoff**  
Create an incident from the failed licensing step. Add sanitized evidence, record an attempted fix, link a suggested previous incident, attach verified recovery, and export the reviewed package.

**D7 — Renewed access after archive**  
A demo provider observation restores a tracked assignment. RANGER unarchives locally into Departed/Needs attention, creates follow-up work, and preserves the original archive event. It does not silently remove the provider assignment.

**D8 — Permissions and isolation**  
Try to view Summit as the Harbor-only viewer, download a foreign attachment, create a cross-company assignment, and run a workflow without execution permission. Every attempt is denied on the server.

### 17.5 Reset behavior

Reset only the current synthetic demo workspace. Preserve other visitors' work until their own expiration/reset. Disable the reset endpoint outside demo mode. Do not include live connections or real company rows in seed cleanup selectors. Test these conditions before exposing any public demo.

Each demo reset creates a new workspace generation. Jobs carry the generation and check it before writes; obsolete jobs cannot mutate the new generation. Cancel/drain old jobs before deleting their records/files, and reject stale browser mutations after reset. Test reset during a running workflow and export, not only while idle.

---

## 18. Cross-cutting acceptance matrix

Use these IDs in `docs/build-status.md` and the verification report. “Verified” requires an actual observed test/result; implementation alone is insufficient.

| ID | Requirement | First gate |
|---|---|---|
| F01 | Clean setup, migration, seed, API/web/worker startup documented and runnable | M0 |
| F02 | Managed people and RANGER staff are distinct identities | M0/M1 |
| F03 | Company has no timezone or general-business workflow fields | M0/M1 |
| F04 | Direct API/object access cannot bypass company grants | M0 |
| F05 | Viewer cannot mutate; technician execution requires explicit grant | M0/M3 |
| I01 | Person profile and resource detail show the same persisted relationships | M1 |
| I02 | Product, subscription, pool, assignment, account, and person remain distinct | M1 |
| I03 | Stable external identity survives email/name changes | M1/M2 |
| I04 | Reassignment preserves old and new historical intervals | M1 |
| I05 | Retired product and archived person remain in historical reports | M1 |
| I06 | Duplicate import does not duplicate assignments/events | M1 |
| I07 | Omitted import row does not delete access | M1 |
| I08 | Concurrent manual assignment cannot exceed known named-seat capacity | M1 |
| I09 | Cross-company relationship fails at API/database boundary | M1 |
| I10 | Unknown prices/dates are visibly unknown; currencies never silently mixed | M1 |
| I11 | Continuing purchase is not counted as savings when a person loses a seat | M1 |
| C01 | Real read connection verifies tenant/company identity | M2 live |
| C02 | All pages collected before snapshot completeness is declared | M2 |
| C03 | Partial/failed/permission-limited sync never implies deletion | M2 |
| C04 | Out-of-order observation does not restore stale current state | M2 |
| C05 | App-only licensing read does not rely on unsupported licenseDetails auth | M2 |
| C06 | Restricted group/mailbox capabilities are visible, not empty success | M2 |
| C07 | SKU capacity is not fabricated into invoice price/contract terms | M2 |
| C08 | Public demo has no live credentials or provider-write path | M0/M5 |
| W01 | Declared Departed status is visible while offboarding remains incomplete | M3 |
| W02 | Future departure does not cause immediate remote disable | M3 |
| W03 | Template version changes do not alter approved running plans | M3 |
| W04 | Preview identifies exact company, person, resources, and manual steps | M3 |
| W05 | Ambiguous external creation reconciles before retry | M3 |
| W06 | Worker restart does not duplicate successful operations | M3 |
| W07 | Permission revoked after queuing blocks later execution | M3 |
| W08 | Membership removal uses /$ref; protected/unsupported targets blocked | M3 |
| W09 | Direct removal does not falsely resolve inherited license/group access | M3 |
| W10 | Provider acceptance and verified completion remain distinct | M3 |
| W11 | Cancel stops future work without claiming completed work was rolled back | M3 |
| A01 | Active personal assignment blocks archive despite checked tasks | M1/M3 |
| A02 | Relevant unknown/stale access verification blocks clean completion | M3 |
| A03 | Manual evidence identifies actor, time, method, and checked outcome | M3 |
| A04 | Continuing company subscription allows archive after personal cleanup and disposition | M3 |
| A05 | Archive predicate rechecked atomically against current version | M3 |
| A06 | Renewed access reopens local attention while preserving archive history | M3 |
| A07 | No force-archive bypass for unresolved personal access | M3 |
| A08 | Unlink/edit/retire cannot erase unresolved manifest obligations | M3 |
| A09 | Verification follows the latest relevant action and newer contradiction reopens work | M3 |
| E01 | Logs and attachments render as inert data; limits enforced | M4 |
| E02 | Private evidence authorization applies to downloads and exports | M4 |
| E03 | Unknown source time offset remains explicit | M4 |
| E04 | Export includes only selected reviewed evidence versions | M4 |
| E05 | Facts, hypotheses, attempted actions, and results remain distinct | M4 |
| E06 | Related suggestions explain reasons and do not leak other companies | M4 |
| E07 | Failed workflow → incident → evidence → escalation works end to end | M4 |
| P01 | Key workflows pass browser/keyboard/viewport review | M5 |
| P02 | Backup restore and worker recovery have observed results | M5 |
| P03 | Performance measurements include environment and dataset context | M5 |
| P04 | Demo reset cannot reach live data, external actions, or other visitors | M5 |
| P05 | README, setup, capabilities, runbook, demo script, and limits delivered | M5 |
| P06 | Live, simulated, blocked, and deployed claims are separately evidenced | M5 |
| P07 | Demo reset generation rejects old worker/browser writes; security expiry uses real time | M5 |

### Release gate policy

Cross-company access, exposed credentials, unsafe live actions, false archive completion, duplicate external creation, and data loss are release-blocking failures. Fix them before calling the private live or public demo release complete.

Unavailable optional external capabilities may remain explicitly documented manual tasks. Missing tenant credentials block live verification only; they do not justify leaving manual workflows, demo tests, or UI unfinished.

---

## 19. Completion reporting and handoff

### 19.1 After every milestone

Update `docs/build-status.md` and write `docs/verification/M<number>.md` containing:

1. What now works for the user.
2. Requirements/acceptance IDs completed.
3. Commands/tests run and observed outcomes.
4. Relevant screenshots or a short reproduction path.
5. Database migrations and operational changes.
6. Decisions/limitations with links to ADRs or source documentation.
7. Exact remaining blockers and the next useful milestone.

If a test did not run, write **Not run** and why. If an API was tested only against a fixture, write **Fixture verified**, not **Microsoft verified**.

### 19.2 Final delivery summary

The human should receive a concise explanation, launch/demo instructions, links to the implementation and documentation, verification results, and important remaining limitations. Do not bury the working product behind raw command output.

### 19.3 Suggested instruction to start the build

> Read this entire specification and the repository instructions. Implement RANGER through the defined M0–M5 milestones, beginning with M0. Maintain the requirement and verification records as specified. Make routine implementation decisions and continue through work that does not require missing external setup. Do not treat fixture-backed behavior as live verification. Preserve the IT-only scope, person/resource relationships, status-driven checklists, email-group distinctions, and server-enforced archive gates throughout the build.

### 19.4 Decisions already made—do not repeatedly reopen

- RANGER serves internal IT and MSPs using one underlying model.
- Company records are limited to managing digital IT context; no company timezone.
- People are the central navigation/relationship experience.
- Real Microsoft integration is the first external connection.
- Other vendors initially use manual subscriptions and assignments.
- Email groups matter; shared mailboxes are modeled separately.
- Person status changes create guided IT work; declaration and cleanup progress remain separate.
- Archive requires resolved tracked personal access, required tasks, and resource dispositions.
- Remaining company subscription commitments do not require cancellation to archive a departed person.
- Incident investigation and escalation belong in RANGER.
- Recurring issue suggestions are explainable and human-confirmed.
- Support session recording and temporary local admin privileges are separate projects.
- No paid AI API is required for the product to function.

---

## 20. Explicit future scope

Only consider these after M5 or an explicit human scope change:

- Exchange Online connector for supported mailbox and distribution-group administration.
- Additional SaaS connectors or SCIM provisioning after verifying vendor/account eligibility.
- Intune or another endpoint inventory source.
- More advanced historical billing reconciliation, proration, and PSA integrations.
- Client self-service access requests and approval portal.
- Scheduled temporary access with separately verified expiry behavior.
- Dedicated evidence-collection agent or the separate support session recorder integration.
- DNS/certificate/connectivity diagnostic tools attached to incidents.
- Semantic incident similarity or optional AI-assisted summarization with a defined data/privacy model.
- Full workflow canvas, advanced custom-role editor, and custom field framework.

Do not scaffold every future feature into empty navigation or speculative database complexity. Preserve clean extension points through providers, typed workflow steps, and relational resource links.

---

## 21. Source references

The following official references informed the integration boundaries and implementation choices. Checked during specification preparation on September 9, 2026. Recheck permission tables and tenant support when implementing; this file is not a substitute for live capability tests.

### 21.1 Microsoft endpoint and permission starting matrix

This table is a starting manifest for the specified auth modes, not a request to grant every permission. Separate read and action credentials/consent, and enable only implemented capabilities. Tenant policies and target roles can impose additional restrictions.

| Capability | Endpoint/approach | Current documented permission starting point |
|---|---|---|
| Background user inventory | GET /users with selected properties | Application User.Read.All |
| License pools | GET /subscribedSkus | Application LicenseAssignment.Read.All |
| User assignment observations | selected assignedLicenses/licenseAssignmentStates on users | Relevant user-read permission; verify field coverage |
| Optional detailed per-user licenses | GET /users/{id}/licenseDetails | Delegated LicenseAssignment.Read.All; application mode currently unsupported |
| Group/membership inventory | GET /groups and /groups/{id}/members | Application GroupMember.Read.All; justify Group.Read.All only if needed for implemented metadata |
| Create ordinary cloud member | POST /users | User.Create, currently listed as least privilege; validate chosen auth mode |
| Direct supported membership changes | POST /groups/{id}/members/$ref; DELETE /groups/{id}/members/{id}/$ref | GroupMember.ReadWrite.All; exclude unsupported/protected group types |
| Direct user license assignment/removal | POST /users/{id}/assignLicense | LicenseAssignment.ReadWrite.All |
| Disable ordinary supported account | PATCH /users/{id}, accountEnabled only | User.EnableDisableAccount.All plus User.Read.All; target/role restrictions still apply |
| Revoke supported sign-in sessions | POST /users/{id}/revokeSignInSessions | User.RevokeSessions.All; do not claim universal instant logout |
| Optional guest invitation | POST /invitations | User.Invite.All; separate from member onboarding |
| Optional directory/sign-in audit | GET /auditLogs/directoryAudits or /auditLogs/signIns | AuditLog.Read.All; tenant licensing/retention/capability conditions apply |
| Distribution/shared-mailbox changes | Initial manual EAC/Exchange task | No Graph mail-content scope requested for this manual capability |

Official endpoint references:

- [List users](https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0) and [user properties](https://learn.microsoft.com/en-us/graph/api/resources/user?view=graph-rest-1.0): selected properties, identity, and account observations.
- [List subscribed SKUs](https://learn.microsoft.com/en-us/graph/api/subscribedsku-list?view=graph-rest-1.0): license pool inventory and permissions.
- [Per-user license details](https://learn.microsoft.com/en-us/graph/api/user-list-licensedetails?view=graph-rest-1.0): authentication-mode limits.
- [List groups](https://learn.microsoft.com/en-us/graph/api/group-list?view=graph-rest-1.0), [list members](https://learn.microsoft.com/en-us/graph/api/group-list-members?view=graph-rest-1.0), and [group types](https://learn.microsoft.com/en-us/graph/api/resources/groups-overview?view=graph-rest-1.0): classification, listing, and supported management boundaries.
- [Add group member](https://learn.microsoft.com/en-us/graph/api/group-post-members?view=graph-rest-1.0) and [remove group member](https://learn.microsoft.com/en-us/graph/api/group-delete-members?view=graph-rest-1.0): membership actions and the required /$ref removal form.
- [Create user](https://learn.microsoft.com/en-us/graph/api/user-post-users?view=graph-rest-1.0), [update user](https://learn.microsoft.com/en-us/graph/api/user-update?view=graph-rest-1.0), and [assign user license](https://learn.microsoft.com/en-us/graph/api/user-assignlicense?view=graph-rest-1.0): onboarding/offboarding action requirements.
- [Revoke sign-in sessions](https://learn.microsoft.com/en-us/graph/api/user-revokesigninsessions?view=graph-rest-1.0): semantics and permission requirements.
- [Create invitation](https://learn.microsoft.com/en-us/graph/api/invitation-post?view=graph-rest-1.0): guest invitations and external communication behavior.
- [Directory audits](https://learn.microsoft.com/en-us/graph/api/directoryaudit-list?view=graph-rest-1.0) and [sign-in logs](https://learn.microsoft.com/en-us/graph/api/signin-list?view=graph-rest-1.0): optional identity event sources.
- [Shared mailboxes](https://learn.microsoft.com/en-us/exchange/collaboration-exo/shared-mailboxes), [mailbox provisioning](https://learn.microsoft.com/en-us/exchange/recipients-in-exchange-online/create-user-mailboxes), and [Exchange app-only authentication](https://learn.microsoft.com/en-us/powershell/exchange/app-only-auth-powershell-v2?view=exchange-ps): boundaries for a future separate Exchange adapter.
- [Microsoft 365 developer sandbox](https://learn.microsoft.com/en-us/office/developer-program/microsoft-365-developer-program-get-started): eligibility and development-use conditions. Free permanent availability is not assumed.

### 21.2 Other vendor boundaries

- [Adobe User Management API](https://developer.adobe.com/umapi/) and [Adobe CSV user exports](https://helpx.adobe.com/business/enterprise/users/users-and-groups/bulk-upload-users.html): potential later integration and import sources. Initial RANGER does not claim an Adobe live connector.
- [SketchUp license assignments](https://help.sketchup.com/en/accounts-and-administration/axp-assigning-products): purchased licenses and named assignment are separate concepts. Initial RANGER uses manual records; no public administration API is assumed.

### 21.3 Framework references

- [React application setup](https://react.dev/learn/build-a-react-app-from-scratch)
- [Fastify TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- [Better Auth installation](https://better-auth.com/docs/installation) and [Fastify integration](https://better-auth.com/docs/integrations/fastify)
- [node-postgres transactions](https://node-postgres.com/features/transactions)
- [pg-boss source and documentation](https://github.com/timgit/pg-boss)
- [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), if chosen as an additional isolation layer

---

**Final product test:** Can someone open a person, understand their digital setup, carry out a real or explicitly manual IT change, investigate a failure, and verify the resulting state and history? If the answer is yes across the documented scenarios, RANGER has achieved the purpose of this specification.
