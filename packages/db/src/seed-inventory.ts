import {
  SCENARIO_DATE,
  SEED_COMPANY_IDS,
  SEED_ORGANIZATION_ID,
  SEED_PERSON_IDS,
  SEED_PRODUCT_IDS,
  SEED_SUBSCRIPTION_IDS,
} from "@ranger/test-fixtures";
import type { DbClient } from "./pool.ts";

/** Scenario clock for seed comments / demo labels only — wall clock is used for sessions. */
export { SCENARIO_DATE };

const ORG = SEED_ORGANIZATION_ID;
const HARBOR = SEED_COMPANY_IDS.harbor;
const CEDAR = SEED_COMPANY_IDS.cedar;
const SUMMIT = SEED_COMPANY_IDS.summit;

function uuid(n: number, prefix = "66666666-6666-4666-8666"): string {
  return `${prefix}-${String(n).padStart(12, "0")}`;
}

type PersonSeed = {
  id: string;
  companyId: string;
  displayName: string;
  workEmail: string;
  itStatus: "planned" | "active" | "on_leave" | "departed";
  roleTitle?: string;
  department?: string;
  archivedAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  workflowBadge?: string | null;
};

function buildPeople(): PersonSeed[] {
  const people: PersonSeed[] = [
    {
      id: SEED_PERSON_IDS.alexRiveraHarbor,
      companyId: HARBOR,
      displayName: "Alex Rivera",
      workEmail: "alex.rivera@harbor.example",
      itStatus: "active",
      roleTitle: "Design contractor",
      department: "Design",
      startDate: "2026-09-03",
      endDate: "2026-09-17",
    },
    {
      id: SEED_PERSON_IDS.plannedStarterHarbor,
      companyId: HARBOR,
      displayName: "Casey Nguyen",
      workEmail: "casey.nguyen@harbor.example",
      itStatus: "planned",
      roleTitle: "Project coordinator",
      workflowBadge: "onboarding_in_progress",
      startDate: "2026-10-06",
    },
    {
      id: SEED_PERSON_IDS.departedMailboxHarbor,
      companyId: HARBOR,
      displayName: "Morgan Ellis",
      workEmail: "morgan.ellis@harbor.example",
      itStatus: "departed",
      roleTitle: "Operations",
      endDate: "2026-09-15",
      workflowBadge: "offboarding_in_progress",
    },
    {
      id: SEED_PERSON_IDS.archivedCleanHarbor,
      companyId: HARBOR,
      displayName: "Priya Shah",
      workEmail: "priya.shah@harbor.example",
      itStatus: "departed",
      roleTitle: "Former associate",
      archivedAt: "2026-08-01T12:00:00.000Z",
      endDate: "2026-07-31",
    },
    {
      id: SEED_PERSON_IDS.sameNameHarbor,
      companyId: HARBOR,
      displayName: "Jordan Blake",
      workEmail: "jordan.blake@harbor.example",
      itStatus: "active",
      roleTitle: "Architect",
    },
    {
      id: SEED_PERSON_IDS.sameNameCedar,
      companyId: CEDAR,
      displayName: "Jordan Blake",
      workEmail: "jordan.blake@cedar.example",
      itStatus: "active",
      roleTitle: "Producer",
    },
    {
      id: uuid(101),
      companyId: HARBOR,
      displayName: "Sam Okonkwo",
      workEmail: "shared.identity@northstar.example",
      itStatus: "active",
      roleTitle: "Consultant",
    },
    {
      id: uuid(102),
      companyId: CEDAR,
      displayName: "Sam Okonkwo (Cedar)",
      workEmail: "shared.identity@northstar.example",
      itStatus: "active",
      roleTitle: "Guest collaborator",
    },
  ];

  const harborExtras = [
    "Riley Quinn",
    "Taylor Brooks",
    "Avery Kim",
    "Cameron Diaz",
    "Drew Patel",
    "Emerson Cole",
    "Finley Hart",
    "Harper Lee",
  ];
  harborExtras.forEach((name, i) => {
    people.push({
      id: uuid(200 + i),
      companyId: HARBOR,
      displayName: name,
      workEmail: `${name.toLowerCase().replace(/\s+/g, ".")}@harbor.example`,
      itStatus: i % 4 === 0 ? "on_leave" : "active",
      roleTitle: i % 2 === 0 ? "Designer" : "Project manager",
      department: "Studio",
    });
  });

  const cedarExtras = [
    "Blake Ortega",
    "Charlie West",
    "Dana Singh",
    "Eden Moore",
    "Frankie Bell",
    "Gray Navarro",
    "Hayden Price",
    "Indigo Wells",
    "Jules Park",
    "Kai Romero",
  ];
  cedarExtras.forEach((name, i) => {
    people.push({
      id: uuid(300 + i),
      companyId: CEDAR,
      displayName: name,
      workEmail: `${name.toLowerCase().replace(/\s+/g, ".")}@cedar.example`,
      itStatus: i === 0 ? "planned" : i === 1 ? "departed" : "active",
      roleTitle: "Studio staff",
      department: "Production",
    });
  });

  const summitExtras = [
    "Logan Pierce",
    "Micah Stone",
    "Noel Vargas",
    "Oakley Reed",
    "Parker Dunn",
    "Quinn Avery",
    "Reese Nolan",
    "Skyler Day",
    "Tatum Brooks",
    "Uma Chen",
  ];
  summitExtras.forEach((name, i) => {
    people.push({
      id: uuid(400 + i),
      companyId: SUMMIT,
      displayName: name,
      workEmail: `${name.toLowerCase().replace(/\s+/g, ".")}@summit.example`,
      itStatus: i === 2 ? "on_leave" : "active",
      roleTitle: "Engineer",
      department: "Internal IT",
    });
  });

  return people;
}

/**
 * Seeds section 17.2 inventory for the Northstar seed organization only.
 * Scenario date SCENARIO_DATE (2026-09-30): Alex's Sep 3–17 assignments are ENDED.
 */
export async function seedInventory(client: DbClient): Promise<void> {
  const cleanup = [
    "DELETE FROM import_rows WHERE organization_id = $1",
    "DELETE FROM import_batches WHERE organization_id = $1",
    "DELETE FROM timeline_events WHERE organization_id = $1",
    "DELETE FROM offboarding_obligations WHERE organization_id = $1",
    "DELETE FROM device_assignments WHERE organization_id = $1",
    "DELETE FROM devices WHERE organization_id = $1",
    "DELETE FROM mailbox_access WHERE organization_id = $1",
    "DELETE FROM shared_mailboxes WHERE organization_id = $1",
    "DELETE FROM group_memberships WHERE organization_id = $1",
    "DELETE FROM groups WHERE organization_id = $1",
    "DELETE FROM license_assignments WHERE organization_id = $1",
    "DELETE FROM license_pools WHERE organization_id = $1",
    "DELETE FROM subscription_price_versions WHERE organization_id = $1",
    "DELETE FROM subscriptions WHERE organization_id = $1",
    "DELETE FROM accounts WHERE organization_id = $1",
    "DELETE FROM work_items WHERE organization_id = $1",
    "DELETE FROM people WHERE organization_id = $1",
    "DELETE FROM products WHERE organization_id = $1",
  ];
  for (const sql of cleanup) {
    await client.query(sql, [ORG]);
  }

  await client.query(
    `INSERT INTO products (id, organization_id, name, vendor, category, assignment_model, documentation_url)
     VALUES
       ($1,$5,'SketchUp Pro','Trimble','design','named_user','https://example.com/sketchup'),
       ($2,$5,'Adobe Creative Cloud','Adobe','creative','named_user','https://example.com/adobe'),
       ($3,$5,'Microsoft 365 Business Premium (demo pool)','Microsoft','productivity','named_user',NULL),
       ($4,$5,'Org-wide Backup Suite','Contoso Backup','backup','organization_wide',NULL)`,
    [
      SEED_PRODUCT_IDS.sketchupPro,
      SEED_PRODUCT_IDS.adobeCc,
      SEED_PRODUCT_IDS.m365,
      SEED_PRODUCT_IDS.orgWideBackup,
      ORG,
    ],
  );

  for (const person of buildPeople()) {
    await client.query(
      `INSERT INTO people (
        id, organization_id, company_id, display_name, work_email, role_title, department,
        it_status, archived_at, start_date, end_date, workflow_badge
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        person.id,
        ORG,
        person.companyId,
        person.displayName,
        person.workEmail,
        person.roleTitle ?? null,
        person.department ?? null,
        person.itStatus,
        person.archivedAt ?? null,
        person.startDate ?? null,
        person.endDate ?? null,
        person.workflowBadge ?? null,
      ],
    );
  }

  const alexAccountId = uuid(500);
  const morganAccountId = uuid(501);
  const serviceAccountId = uuid(502);
  const guestAccountId = uuid(503);
  const caseyAccountId = uuid(504);
  const priyaAccountId = uuid(507);

  await client.query(
    `INSERT INTO accounts (
      id, organization_id, company_id, person_id, provider_source, external_id,
      login_name, account_kind, enabled_state, freshness_note
    ) VALUES
      ($1,$9,$10,$11,'manual','alex-harbor-01','alex.rivera@harbor.example','human','enabled','Manual seed'),
      ($2,$9,$10,$12,'manual','morgan-harbor-01','morgan.ellis@harbor.example','human','enabled','Departed; mailbox unresolved'),
      ($3,$9,$10,NULL,'manual','svc-backup','svc-backup@harbor.example','service','enabled','Service account — no person'),
      ($4,$9,$10,NULL,'manual','guest-collab','guest.collab@partner.example','guest','enabled','Guest account'),
      ($5,$9,$10,$13,'manual','casey-harbor-01','casey.nguyen@harbor.example','human','enabled','Planned starter'),
      ($6,$9,$14,NULL,'manual','cedar-svc','svc@cedar.example','service','enabled',NULL),
      ($7,$9,$15,NULL,'manual','summit-guest','visitor@summit.example','guest','enabled',NULL),
      ($8,$9,$10,$16,'manual','priya-archived','priya.shah@harbor.example','human','disabled','Archived clean history')`,
    [
      alexAccountId,
      morganAccountId,
      serviceAccountId,
      guestAccountId,
      caseyAccountId,
      uuid(505),
      uuid(506),
      priyaAccountId,
      ORG,
      HARBOR,
      SEED_PERSON_IDS.alexRiveraHarbor,
      SEED_PERSON_IDS.departedMailboxHarbor,
      SEED_PERSON_IDS.plannedStarterHarbor,
      CEDAR,
      SUMMIT,
      SEED_PERSON_IDS.archivedCleanHarbor,
    ],
  );

  const unknownPriceSubId = uuid(600);
  const eurSubId = uuid(601);
  const zeroSeatsSubId = uuid(602);
  const adobeSubId = uuid(603);
  const orgWideSubId = uuid(604);

  await client.query(
    `INSERT INTO subscriptions (
      id, organization_id, company_id, product_id, supplier, external_reference,
      purchased_quantity, currency, payer, billing_cadence,
      commitment_start, commitment_end, renewal_date, state
    ) VALUES
      ($1,$7,$8,$9,'MSP reseller','SKU-SKP-5',5,'USD','msp','annual','2026-01-01','2026-12-31','2027-01-01','active'),
      ($2,$7,$8,$10,'Direct','ADOBE-UNK',3,'USD','company','monthly',NULL,NULL,NULL,'active'),
      ($3,$7,$8,$10,'EU vendor','ADOBE-EUR',2,'EUR','company','annual','2026-03-01','2027-02-28','2027-03-01','active'),
      ($4,$7,$8,$11,'Microsoft CSP','M365-FULL',2,'USD','msp','monthly',NULL,NULL,NULL,'active'),
      ($5,$7,$8,$10,'Adobe','ADOBE-HARBOR',10,'USD','msp','annual','2026-01-01','2026-12-31','2027-01-01','active'),
      ($6,$7,$8,$12,'Contoso','BACKUP-ORG',1,'USD','company','annual','2026-01-01','2026-12-31','2027-01-01','active')`,
    [
      SEED_SUBSCRIPTION_IDS.harborSketchup,
      unknownPriceSubId,
      eurSubId,
      zeroSeatsSubId,
      adobeSubId,
      orgWideSubId,
      ORG,
      HARBOR,
      SEED_PRODUCT_IDS.sketchupPro,
      SEED_PRODUCT_IDS.adobeCc,
      SEED_PRODUCT_IDS.m365,
      SEED_PRODUCT_IDS.orgWideBackup,
    ],
  );

  // Price versions (fictional). SketchUp annual unit price; unknown Adobe; EUR Adobe; M365 known.
  await client.query(
    `INSERT INTO subscription_price_versions (
      id, organization_id, company_id, subscription_id, effective_from, effective_to,
      unit_price, price_kind, cadence, source
    ) VALUES
      ($1,$7,$8,$9,'2026-01-01',NULL,299.00,'unit','annual','seed-fictional'),
      ($2,$7,$8,$10,'2026-01-01',NULL,NULL,'unit','monthly','seed-unknown'),
      ($3,$7,$8,$11,'2026-03-01',NULL,45.00,'unit','annual','seed-fictional-eur'),
      ($4,$7,$8,$12,'2026-01-01',NULL,22.00,'unit','monthly','seed-fictional'),
      ($5,$7,$8,$13,'2026-01-01',NULL,54.99,'unit','annual','seed-fictional'),
      ($6,$7,$8,$14,'2026-01-01',NULL,1200.00,'flat','annual','seed-fictional')`,
    [
      uuid(610),
      uuid(611),
      uuid(612),
      uuid(613),
      uuid(614),
      uuid(615),
      ORG,
      HARBOR,
      SEED_SUBSCRIPTION_IDS.harborSketchup,
      unknownPriceSubId,
      eurSubId,
      zeroSeatsSubId,
      adobeSubId,
      orgWideSubId,
    ],
  );

  // Microsoft demo pool (company-level; assignments may link optionally)
  await client.query(
    `INSERT INTO license_pools (
      id, organization_id, company_id, product_id, provider_sku,
      purchased_quantity, consumed_quantity, source, freshness_note
    ) VALUES ($1,$2,$3,$4,'O365_BUSINESS_PREMIUM',25,18,'seed-demo','Demo pool — not live Graph')`,
    [uuid(620), ORG, HARBOR, SEED_PRODUCT_IDS.m365],
  );

  // Alex: SketchUp + M365 style assignments effective 2026-09-03 to 2026-09-17 — ENDED by scenario clock Sep 30
  await client.query(
    `INSERT INTO license_assignments (
      id, organization_id, company_id, person_id, account_id, product_id, subscription_id,
      status, start_effective_date, end_effective_date, date_provenance, source
    ) VALUES
      ($1,$3,$4,$5,$6,$7,$8,'ended','2026-09-03','2026-09-17','technician_confirmed','manual'),
      ($2,$3,$4,$5,$6,$9,$10,'ended','2026-09-03','2026-09-17','technician_confirmed','manual')`,
    [
      uuid(630),
      uuid(631),
      ORG,
      HARBOR,
      SEED_PERSON_IDS.alexRiveraHarbor,
      alexAccountId,
      SEED_PRODUCT_IDS.sketchupPro,
      SEED_SUBSCRIPTION_IDS.harborSketchup,
      SEED_PRODUCT_IDS.m365,
      zeroSeatsSubId,
    ],
  );

  // Zero-available-seats: fill M365 sub (qty 2) with two active seats (not Alex)
  await client.query(
    `INSERT INTO license_assignments (
      id, organization_id, company_id, person_id, account_id, product_id, subscription_id,
      status, start_effective_date, date_provenance, source
    ) VALUES
      ($1,$3,$4,$5,NULL,$7,$8,'active','2026-01-15','seed','manual'),
      ($2,$3,$4,$6,NULL,$7,$8,'active','2026-02-01','seed','manual')`,
    [
      uuid(632),
      uuid(633),
      ORG,
      HARBOR,
      uuid(200), // Riley Quinn
      uuid(201), // Taylor Brooks
      SEED_PRODUCT_IDS.m365,
      zeroSeatsSubId,
    ],
  );

  // Archived Priya: clean historical ended assignment
  await client.query(
    `INSERT INTO license_assignments (
      id, organization_id, company_id, person_id, account_id, product_id, subscription_id,
      status, start_effective_date, end_effective_date, date_provenance, source
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,'ended','2025-01-01','2026-07-31','technician_confirmed','manual')`,
    [
      uuid(634),
      ORG,
      HARBOR,
      SEED_PERSON_IDS.archivedCleanHarbor,
      priyaAccountId,
      SEED_PRODUCT_IDS.adobeCc,
      adobeSubId,
    ],
  );

  // Groups of each type
  const securityGroupId = uuid(700);
  const m365GroupId = uuid(701);
  const distGroupId = uuid(702);
  const mesGroupId = uuid(703);
  const dynamicGroupId = uuid(704);

  await client.query(
    `INSERT INTO groups (
      id, organization_id, company_id, external_id, display_name, email_address,
      group_type, membership_capability, source
    ) VALUES
      ($1,$6,$7,'sec-design','Harbor Design Security',NULL,'security','direct','manual'),
      ($2,$6,$7,'m365-studio','Harbor Studio M365','studio@harbor.example','microsoft_365','direct','manual'),
      ($3,$6,$7,'dist-all','Harbor All Staff','all@harbor.example','distribution','direct','manual'),
      ($4,$6,$7,'mes-ops','Harbor Ops MES','ops-sec@harbor.example','mail_enabled_security','direct','manual'),
      ($5,$6,$7,'dyn-contractors','Harbor Contractors (dynamic)',NULL,'manual','dynamic','manual')`,
    [securityGroupId, m365GroupId, distGroupId, mesGroupId, dynamicGroupId, ORG, HARBOR],
  );

  await client.query(
    `INSERT INTO group_memberships (
      id, organization_id, company_id, group_id, account_id, membership_kind,
      start_date, verification_source, status
    ) VALUES
      ($1,$4,$5,$6,$7,'direct','2026-09-03','manual','ended'),
      ($2,$4,$5,$8,$7,'direct','2026-01-01','manual','active'),
      ($3,$4,$5,$9,$7,'dynamic','2026-09-03','rule:contractor','ended')`,
    [
      uuid(710),
      uuid(711),
      uuid(712),
      ORG,
      HARBOR,
      securityGroupId,
      alexAccountId,
      distGroupId,
      dynamicGroupId,
    ],
  );

  // Shared mailbox + unresolved access for Morgan (departed)
  const mailboxId = uuid(800);
  await client.query(
    `INSERT INTO shared_mailboxes (
      id, organization_id, company_id, address, source, state, owner_person_id
    ) VALUES ($1,$2,$3,'front-desk@harbor.example','manual','active',NULL)`,
    [mailboxId, ORG, HARBOR],
  );
  await client.query(
    `INSERT INTO mailbox_access (
      id, organization_id, company_id, mailbox_id, account_id, permission_kind,
      start_date, source, verification_status, status
    ) VALUES ($1,$2,$3,$4,$5,'full_access','2025-06-01','manual','needs_verification','active')`,
    [uuid(801), ORG, HARBOR, mailboxId, morganAccountId],
  );

  // Devices in each state
  const deviceIds = {
    assigned: uuid(900),
    available: uuid(901),
    repair: uuid(902),
    returned: uuid(903),
    retired: uuid(904),
  };
  await client.query(
    `INSERT INTO devices (
      id, organization_id, company_id, asset_tag, serial, device_type, hostname, model,
      state, source, cost, currency
    ) VALUES
      ($1,$6,$7,'HAR-LTP-01','SN-A100','laptop','alex-mbp','MacBook Pro','assigned','manual',1899.00,'USD'),
      ($2,$6,$7,'HAR-LTP-02','SN-A101','laptop','harbor-spare-01','ThinkPad X1','available','manual',NULL,NULL),
      ($3,$6,$7,'HAR-MON-01','SN-M200','monitor',NULL,'Dell U2720Q','repair','manual',450.00,'USD'),
      ($4,$6,$7,'HAR-LTP-03','SN-A102','laptop','returned-01','MacBook Air','returned','manual',999.00,'USD'),
      ($5,$6,$7,'HAR-PHN-01','SN-P300','phone',NULL,'iPhone 12','retired','manual',0,'USD')`,
    [
      deviceIds.assigned,
      deviceIds.available,
      deviceIds.repair,
      deviceIds.returned,
      deviceIds.retired,
      ORG,
      HARBOR,
    ],
  );

  await client.query(
    `INSERT INTO device_assignments (
      id, organization_id, company_id, device_id, person_id, issued_at,
      returned_at, custody_disposition, evidence_note, status
    ) VALUES
      ($1,$3,$4,$5,$6,'2026-09-03T15:00:00Z',NULL,'issued_to_contractor','Seed current assignment','current'),
      ($2,$3,$4,$7,$8,'2025-01-10T12:00:00Z','2026-03-01T12:00:00Z','returned_to_stock','Historical return','historical')`,
    [
      uuid(910),
      uuid(911),
      ORG,
      HARBOR,
      deviceIds.assigned,
      SEED_PERSON_IDS.alexRiveraHarbor,
      deviceIds.returned,
      SEED_PERSON_IDS.archivedCleanHarbor,
    ],
  );

  // Work items
  await client.query(
    `INSERT INTO work_items (
      id, organization_id, company_id, type, target_person_id, status, due_date, title, description
    ) VALUES
      ($1,$4,$5,'onboarding',$6,'open','2026-10-06','Onboard Casey Nguyen','Planned starter waiting on account/group steps'),
      ($2,$4,$5,'offboarding',$7,'open','2026-09-20','Resolve Morgan mailbox access','Departed with unresolved front-desk mailbox delegation'),
      ($3,$4,$5,'review',$8,'open','2026-09-30','Contractor end-date review — Alex Rivera','Scenario clock ${SCENARIO_DATE}: assignment interval ended 2026-09-17')`,
    [
      uuid(920),
      uuid(921),
      uuid(922),
      ORG,
      HARBOR,
      SEED_PERSON_IDS.plannedStarterHarbor,
      SEED_PERSON_IDS.departedMailboxHarbor,
      SEED_PERSON_IDS.alexRiveraHarbor,
    ],
  );

  // Timeline for Alex contractor history
  await client.query(
    `INSERT INTO timeline_events (
      id, organization_id, company_id, entity_type, entity_id, event_kind,
      effective_at, observed_at, source, summary
    ) VALUES
      ($1,$4,$5,'person',$6,'person.contractor_interval',
       '2026-09-03T00:00:00Z','2026-09-03T16:00:00Z','manual',
       'Alex Rivera contractor interval 2026-09-03 to 2026-09-17 (scenario clock ${SCENARIO_DATE})'),
      ($2,$4,$5,'license_assignment',$7,'license.ended',
       '2026-09-17T00:00:00Z','2026-09-17T18:00:00Z','manual',
       'SketchUp assignment ended; Harbor SketchUp seat available'),
      ($3,$4,$5,'license_assignment',$8,'license.ended',
       '2026-09-17T00:00:00Z','2026-09-17T18:00:00Z','manual',
       'Microsoft-style assignment ended')`,
    [
      uuid(930),
      uuid(931),
      uuid(932),
      ORG,
      HARBOR,
      SEED_PERSON_IDS.alexRiveraHarbor,
      uuid(630),
      uuid(631),
    ],
  );
}
