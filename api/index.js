var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// packages/db/src/pool.ts
import pg from "pg";
function createPool(connectionString) {
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  return new Pool({
    connectionString,
    max: serverless ? 1 : 10,
    idleTimeoutMillis: serverless ? 5e3 : 3e4,
    connectionTimeoutMillis: 1e4
  });
}
async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
var Pool;
var init_pool = __esm({
  "packages/db/src/pool.ts"() {
    "use strict";
    ({ Pool } = pg);
  }
});

// packages/db/src/migrations.ts
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
async function applyMigrations(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  const appliedNow = [];
  for (const file of files) {
    const applied = await pool.query("SELECT 1 FROM schema_migrations WHERE id = $1", [file]);
    if ((applied.rowCount ?? 0) > 0) {
      continue;
    }
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      appliedNow.push(file);
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }
  return appliedNow;
}
var migrationsDir;
var init_migrations = __esm({
  "packages/db/src/migrations.ts"() {
    "use strict";
    migrationsDir = fileURLToPath(new URL("../migrations", import.meta.url));
  }
});

// packages/test-fixtures/src/index.ts
var SEED_ORGANIZATION_ID, SEED_COMPANY_IDS, SEED_STAFF, SEED_COMPANIES, SCENARIO_DATE, SEED_PRODUCT_IDS, SEED_PERSON_IDS, SEED_SUBSCRIPTION_IDS, SEED_GROUP_IDS, SEED_TEMPLATE_IDS, SEED_TEMPLATE_VERSION_IDS;
var init_src = __esm({
  "packages/test-fixtures/src/index.ts"() {
    "use strict";
    SEED_ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
    SEED_COMPANY_IDS = {
      harbor: "22222222-2222-4222-8222-222222222221",
      cedar: "22222222-2222-4222-8222-222222222222",
      summit: "22222222-2222-4222-8222-222222222223"
    };
    SEED_STAFF = {
      admin: {
        email: "admin@northstar.example",
        name: "Northstar Admin",
        role: "admin"
      },
      technician: {
        email: "technician@northstar.example",
        name: "Taylor Chen",
        role: "technician"
      },
      viewer: {
        email: "viewer@northstar.example",
        name: "Riley Patel",
        role: "viewer"
      }
    };
    SEED_COMPANIES = [
      {
        id: SEED_COMPANY_IDS.harbor,
        name: "Harbor Architecture",
        slug: "harbor-architecture",
        domains: ["harbor.example"],
        itContactName: "Alex Rivera",
        itContactEmail: "it@harbor.example",
        itNotes: "Primary contractor onboarding and design subscriptions."
      },
      {
        id: SEED_COMPANY_IDS.cedar,
        name: "Cedar Studio",
        slug: "cedar-studio",
        domains: ["cedar.example"],
        itContactName: "Jordan Blake",
        itContactEmail: "it@cedar.example",
        itNotes: "Separate company with similar product names."
      },
      {
        id: SEED_COMPANY_IDS.summit,
        name: "Summit Systems",
        slug: "summit-systems",
        domains: ["summit.example"],
        itContactName: "Sam Okonkwo",
        itContactEmail: "it@summit.example",
        itNotes: "Smaller internal-style IT environment."
      }
    ];
    SCENARIO_DATE = "2026-09-30";
    SEED_PRODUCT_IDS = {
      sketchupPro: "33333333-3333-4333-8333-333333333331",
      adobeCc: "33333333-3333-4333-8333-333333333332",
      m365: "33333333-3333-4333-8333-333333333333",
      orgWideBackup: "33333333-3333-4333-8333-333333333334"
    };
    SEED_PERSON_IDS = {
      alexRiveraHarbor: "44444444-4444-4444-8444-444444444441",
      plannedStarterHarbor: "44444444-4444-4444-8444-444444444442",
      departedMailboxHarbor: "44444444-4444-4444-8444-444444444443",
      archivedCleanHarbor: "44444444-4444-4444-8444-444444444444",
      sameNameHarbor: "44444444-4444-4444-8444-444444444445",
      sameNameCedar: "44444444-4444-4444-8444-444444444446"
    };
    SEED_SUBSCRIPTION_IDS = {
      harborSketchup: "55555555-5555-4555-8555-555555555551"
    };
    SEED_GROUP_IDS = {
      harborDesignSecurity: "66666666-6666-4666-8666-000000000700",
      harborStudioM365: "66666666-6666-4666-8666-000000000701",
      harborAllStaff: "66666666-6666-4666-8666-000000000702"
    };
    SEED_TEMPLATE_IDS = {
      projectCoordinator: "77777777-7777-4777-8777-777777777771"
    };
    SEED_TEMPLATE_VERSION_IDS = {
      projectCoordinatorV1: "77777777-7777-4777-8777-777777777772"
    };
  }
});

// packages/db/src/seed-inventory.ts
function uuid(n, prefix = "66666666-6666-4666-8666") {
  return `${prefix}-${String(n).padStart(12, "0")}`;
}
function buildPeople() {
  const people = [
    {
      id: SEED_PERSON_IDS.alexRiveraHarbor,
      companyId: HARBOR,
      displayName: "Alex Rivera",
      workEmail: "alex.rivera@harbor.example",
      itStatus: "active",
      roleTitle: "Design contractor",
      department: "Design",
      startDate: "2026-09-03",
      endDate: "2026-09-17"
    },
    {
      id: SEED_PERSON_IDS.plannedStarterHarbor,
      companyId: HARBOR,
      displayName: "Casey Nguyen",
      workEmail: "casey.nguyen@harbor.example",
      itStatus: "planned",
      roleTitle: "Project coordinator",
      workflowBadge: "onboarding_in_progress",
      startDate: "2026-10-06"
    },
    {
      id: SEED_PERSON_IDS.departedMailboxHarbor,
      companyId: HARBOR,
      displayName: "Morgan Ellis",
      workEmail: "morgan.ellis@harbor.example",
      itStatus: "departed",
      roleTitle: "Operations",
      endDate: "2026-09-15",
      workflowBadge: "offboarding_in_progress"
    },
    {
      id: SEED_PERSON_IDS.archivedCleanHarbor,
      companyId: HARBOR,
      displayName: "Priya Shah",
      workEmail: "priya.shah@harbor.example",
      itStatus: "departed",
      roleTitle: "Former associate",
      archivedAt: "2026-08-01T12:00:00.000Z",
      endDate: "2026-07-31"
    },
    {
      id: SEED_PERSON_IDS.sameNameHarbor,
      companyId: HARBOR,
      displayName: "Jordan Blake",
      workEmail: "jordan.blake@harbor.example",
      itStatus: "active",
      roleTitle: "Architect"
    },
    {
      id: SEED_PERSON_IDS.sameNameCedar,
      companyId: CEDAR,
      displayName: "Jordan Blake",
      workEmail: "jordan.blake@cedar.example",
      itStatus: "active",
      roleTitle: "Producer"
    },
    {
      id: uuid(101),
      companyId: HARBOR,
      displayName: "Sam Okonkwo",
      workEmail: "shared.identity@northstar.example",
      itStatus: "active",
      roleTitle: "Consultant"
    },
    {
      id: uuid(102),
      companyId: CEDAR,
      displayName: "Sam Okonkwo (Cedar)",
      workEmail: "shared.identity@northstar.example",
      itStatus: "active",
      roleTitle: "Guest collaborator"
    }
  ];
  const harborExtras = [
    "Riley Quinn",
    "Taylor Brooks",
    "Avery Kim",
    "Cameron Diaz",
    "Drew Patel",
    "Emerson Cole",
    "Finley Hart",
    "Harper Lee"
  ];
  harborExtras.forEach((name, i) => {
    people.push({
      id: uuid(200 + i),
      companyId: HARBOR,
      displayName: name,
      workEmail: `${name.toLowerCase().replace(/\s+/g, ".")}@harbor.example`,
      itStatus: i % 4 === 0 ? "on_leave" : "active",
      roleTitle: i % 2 === 0 ? "Designer" : "Project manager",
      department: "Studio"
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
    "Kai Romero"
  ];
  cedarExtras.forEach((name, i) => {
    people.push({
      id: uuid(300 + i),
      companyId: CEDAR,
      displayName: name,
      workEmail: `${name.toLowerCase().replace(/\s+/g, ".")}@cedar.example`,
      itStatus: i === 0 ? "planned" : i === 1 ? "departed" : "active",
      roleTitle: "Studio staff",
      department: "Production"
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
    "Uma Chen"
  ];
  summitExtras.forEach((name, i) => {
    people.push({
      id: uuid(400 + i),
      companyId: SUMMIT,
      displayName: name,
      workEmail: `${name.toLowerCase().replace(/\s+/g, ".")}@summit.example`,
      itStatus: i === 2 ? "on_leave" : "active",
      roleTitle: "Engineer",
      department: "Internal IT"
    });
  });
  return people;
}
async function seedInventory(client) {
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
    "DELETE FROM products WHERE organization_id = $1"
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
      ORG
    ]
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
        person.workflowBadge ?? null
      ]
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
      ($3,$9,$10,NULL,'manual','svc-backup','svc-backup@harbor.example','service','enabled','Service account \u2014 no person'),
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
      SEED_PERSON_IDS.archivedCleanHarbor
    ]
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
      SEED_PRODUCT_IDS.orgWideBackup
    ]
  );
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
      orgWideSubId
    ]
  );
  await client.query(
    `INSERT INTO license_pools (
      id, organization_id, company_id, product_id, provider_sku,
      purchased_quantity, consumed_quantity, source, freshness_note
    ) VALUES ($1,$2,$3,$4,'O365_BUSINESS_PREMIUM',25,18,'seed-demo','Demo pool \u2014 not live Graph')`,
    [uuid(620), ORG, HARBOR, SEED_PRODUCT_IDS.m365]
  );
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
      zeroSeatsSubId
    ]
  );
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
      uuid(200),
      // Riley Quinn
      uuid(201),
      // Taylor Brooks
      SEED_PRODUCT_IDS.m365,
      zeroSeatsSubId
    ]
  );
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
      adobeSubId
    ]
  );
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
    [securityGroupId, m365GroupId, distGroupId, mesGroupId, dynamicGroupId, ORG, HARBOR]
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
      dynamicGroupId
    ]
  );
  const mailboxId = uuid(800);
  await client.query(
    `INSERT INTO shared_mailboxes (
      id, organization_id, company_id, address, source, state, owner_person_id
    ) VALUES ($1,$2,$3,'front-desk@harbor.example','manual','active',NULL)`,
    [mailboxId, ORG, HARBOR]
  );
  await client.query(
    `INSERT INTO mailbox_access (
      id, organization_id, company_id, mailbox_id, account_id, permission_kind,
      start_date, source, verification_status, status
    ) VALUES ($1,$2,$3,$4,$5,'full_access','2025-06-01','manual','needs_verification','active')`,
    [uuid(801), ORG, HARBOR, mailboxId, morganAccountId]
  );
  const deviceIds = {
    assigned: uuid(900),
    available: uuid(901),
    repair: uuid(902),
    returned: uuid(903),
    retired: uuid(904)
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
      HARBOR
    ]
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
      SEED_PERSON_IDS.archivedCleanHarbor
    ]
  );
  await client.query(
    `INSERT INTO work_items (
      id, organization_id, company_id, type, target_person_id, status, due_date, title, description
    ) VALUES
      ($1,$4,$5,'onboarding',$6,'open','2026-10-06','Onboard Casey Nguyen','Planned starter waiting on account/group steps'),
      ($2,$4,$5,'offboarding',$7,'open','2026-09-20','Resolve Morgan mailbox access','Departed with unresolved front-desk mailbox delegation'),
      ($3,$4,$5,'review',$8,'open','2026-09-30','Contractor end-date review \u2014 Alex Rivera','Scenario clock ${SCENARIO_DATE}: assignment interval ended 2026-09-17')`,
    [
      uuid(920),
      uuid(921),
      uuid(922),
      ORG,
      HARBOR,
      SEED_PERSON_IDS.plannedStarterHarbor,
      SEED_PERSON_IDS.departedMailboxHarbor,
      SEED_PERSON_IDS.alexRiveraHarbor
    ]
  );
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
      uuid(631)
    ]
  );
}
var ORG, HARBOR, CEDAR, SUMMIT;
var init_seed_inventory = __esm({
  "packages/db/src/seed-inventory.ts"() {
    "use strict";
    init_src();
    ORG = SEED_ORGANIZATION_ID;
    HARBOR = SEED_COMPANY_IDS.harbor;
    CEDAR = SEED_COMPANY_IDS.cedar;
    SUMMIT = SEED_COMPANY_IDS.summit;
  }
});

// packages/domain/src/person-status.ts
function isArchivedPerson(archivedAt) {
  return archivedAt != null;
}
var init_person_status = __esm({
  "packages/domain/src/person-status.ts"() {
    "use strict";
  }
});

// packages/domain/src/archive.ts
function evaluateArchiveReadiness(snapshot) {
  const blockers = [];
  if (isArchivedPerson(snapshot.person.archivedAt)) {
    blockers.push({
      code: "already_archived",
      message: "Person is already archived"
    });
  }
  if (snapshot.person.itStatus !== "departed") {
    blockers.push({
      code: "not_departed",
      message: "Person must be Departed before archiving"
    });
  }
  if (snapshot.person.lifecycleOperationPending) {
    blockers.push({
      code: "lifecycle_operation_pending",
      message: "A lifecycle operation is still running or awaiting verification"
    });
  }
  for (const assignment of snapshot.licenseAssignments ?? []) {
    if (assignment.status === "active") {
      blockers.push({
        code: "active_license_assignment",
        message: "Active personal license assignment remains",
        targetType: "license_assignment",
        targetId: assignment.id
      });
    } else if (assignment.status === "removal_pending") {
      blockers.push({
        code: "removal_pending_license_assignment",
        message: "Removal-pending license assignment remains a current obligation",
        targetType: "license_assignment",
        targetId: assignment.id
      });
    }
  }
  for (const access of snapshot.mailboxAccess ?? []) {
    if (access.status === "active") {
      blockers.push({
        code: "unresolved_mailbox_access",
        message: "Unresolved shared mailbox permission remains",
        targetType: "mailbox_access",
        targetId: access.id
      });
    }
  }
  for (const obligation of snapshot.obligations ?? []) {
    if (obligation.status === "open") {
      blockers.push({
        code: "unresolved_obligation",
        message: `Unresolved offboarding obligation (${obligation.obligationKind})`,
        targetType: obligation.targetType,
        targetId: obligation.targetId
      });
    }
  }
  for (const account of snapshot.linkedAccounts ?? []) {
    if (account.accountKind !== "human") {
      continue;
    }
    if (account.enabledState !== "disabled") {
      blockers.push({
        code: "account_not_disabled",
        message: "Linked human account is not verified disabled",
        targetType: "account",
        targetId: account.id
      });
    }
  }
  for (const device of snapshot.deviceAssignments ?? []) {
    if (device.status !== "current") {
      continue;
    }
    if (!device.custodyDisposition) {
      blockers.push({
        code: "unresolved_device_custody",
        message: "Current device assignment lacks a recorded custody disposition",
        targetType: "device_assignment",
        targetId: device.id
      });
    }
  }
  return {
    ready: blockers.length === 0,
    blockers
  };
}
var init_archive = __esm({
  "packages/domain/src/archive.ts"() {
    "use strict";
    init_person_status();
  }
});

// packages/domain/src/capacity.ts
function checkNamedSeatCapacity(input) {
  const requested = input.requestedQuantity ?? 1;
  if (!Number.isInteger(input.purchasedQuantity) || !Number.isInteger(input.consumedQuantity) || !Number.isInteger(requested) || input.purchasedQuantity < 0 || input.consumedQuantity < 0 || requested <= 0) {
    return {
      ok: false,
      available: Math.max(0, input.purchasedQuantity - input.consumedQuantity),
      requested,
      reason: "invalid_quantity"
    };
  }
  const available = input.purchasedQuantity - input.consumedQuantity;
  if (requested > available) {
    return {
      ok: false,
      available,
      requested,
      reason: "insufficient_capacity"
    };
  }
  return { ok: true, available, requested };
}
var init_capacity = __esm({
  "packages/domain/src/capacity.ts"() {
    "use strict";
  }
});

// packages/domain/src/costs.ts
function isKnownPrice(amount) {
  return amount != null && Number.isFinite(amount);
}
function partitionByCurrency(amounts) {
  const byCurrency = /* @__PURE__ */ new Map();
  let unknownCount = 0;
  for (const item of amounts) {
    if (!isKnownPrice(item.amount) || !CURRENCY_RE.test(item.currency)) {
      unknownCount += 1;
      continue;
    }
    byCurrency.set(item.currency, (byCurrency.get(item.currency) ?? 0) + item.amount);
  }
  return { byCurrency, unknownCount };
}
var CURRENCY_RE;
var init_costs = __esm({
  "packages/domain/src/costs.ts"() {
    "use strict";
    CURRENCY_RE = /^[A-Z]{3}$/;
  }
});

// packages/domain/src/dates.ts
function parseDateOnly(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}
function daysBetween(start, end) {
  const a = parseDateOnly(start);
  const b = parseDateOnly(end);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}
function formatDurationDays(days) {
  if (days == null || !Number.isFinite(days)) return "Unknown";
  const rounded = Math.round(days);
  const abs = Math.abs(rounded);
  if (abs <= 30) {
    return `${abs} day${abs === 1 ? "" : "s"}`;
  }
  const months = abs / 30;
  const shown = Math.round(months * 10) / 10;
  return `~${shown} mo`;
}
function intervalProgress(input) {
  const start = input.start ?? null;
  const end = input.end ?? null;
  const asOf = input.asOf;
  if (!start) {
    return {
      asOf,
      start: null,
      end,
      elapsedDays: null,
      remainingDays: end ? daysBetween(asOf, end) : null,
      elapsedLabel: "Unknown",
      remainingLabel: end ? formatDurationDays(daysBetween(asOf, end)) : null,
      summary: end ? `End ${end} \xB7 remaining ${formatDurationDays(daysBetween(asOf, end))}` : "Dates unknown"
    };
  }
  const elapsedDays = daysBetween(start, asOf);
  const remainingDays = end ? daysBetween(asOf, end) : null;
  const elapsedLabel = formatDurationDays(elapsedDays);
  const remainingLabel = end ? formatDurationDays(remainingDays) : null;
  let summary = `Start ${start} \xB7 ${elapsedLabel} in`;
  if (end && remainingDays != null) {
    if (remainingDays < 0) {
      summary = `Start ${start} \xB7 ended ${formatDurationDays(Math.abs(remainingDays))} ago (${end})`;
    } else {
      summary = `Start ${start} \xB7 ${elapsedLabel} in \xB7 ${remainingLabel} left`;
    }
  } else if (elapsedDays != null && elapsedDays < 0) {
    summary = `Starts in ${formatDurationDays(Math.abs(elapsedDays))} (${start})`;
  }
  return {
    asOf,
    start,
    end,
    elapsedDays,
    remainingDays,
    elapsedLabel,
    remainingLabel,
    summary
  };
}
var DAY_MS;
var init_dates = __esm({
  "packages/domain/src/dates.ts"() {
    "use strict";
    DAY_MS = 864e5;
  }
});

// packages/domain/src/errors.ts
var DomainError, NotFoundError, ForbiddenError, ConflictError, UnprocessableError;
var init_errors = __esm({
  "packages/domain/src/errors.ts"() {
    "use strict";
    DomainError = class extends Error {
      constructor(message, code, statusCode) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = "DomainError";
      }
      code;
      statusCode;
    };
    NotFoundError = class extends DomainError {
      constructor(message = "Not found") {
        super(message, "not_found", 404);
      }
    };
    ForbiddenError = class extends DomainError {
      constructor(message = "Forbidden") {
        super(message, "forbidden", 403);
      }
    };
    ConflictError = class extends DomainError {
      constructor(message = "Conflict") {
        super(message, "conflict", 409);
      }
    };
    UnprocessableError = class extends DomainError {
      constructor(message, code = "unprocessable") {
        super(message, code, 422);
      }
    };
  }
});

// packages/domain/src/evidence.ts
function validateEvidenceUpload(input) {
  if (input.existingFileCount >= EVIDENCE_MAX_FILES_PER_INCIDENT) {
    return { ok: false, reason: `At most ${EVIDENCE_MAX_FILES_PER_INCIDENT} files per incident` };
  }
  if (input.byteSize <= 0) {
    return { ok: false, reason: "Empty file rejected" };
  }
  if (input.byteSize > EVIDENCE_MAX_FILE_BYTES) {
    return { ok: false, reason: `File exceeds ${EVIDENCE_MAX_FILE_BYTES} byte limit` };
  }
  if (input.existingTotalBytes + input.byteSize > EVIDENCE_MAX_TOTAL_BYTES) {
    return { ok: false, reason: `Incident evidence exceeds ${EVIDENCE_MAX_TOTAL_BYTES} byte total` };
  }
  const lower = input.filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  const extension = dot >= 0 ? lower.slice(dot) : "";
  if (REJECT_EXTENSIONS.has(extension)) {
    return { ok: false, reason: `File type ${extension || "(none)"} is not allowed` };
  }
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return { ok: false, reason: `Unsupported extension ${extension || "(none)"}` };
  }
  const contentType = (input.contentType || "application/octet-stream").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(contentType) && contentType !== "text/x-log") {
    if (!(contentType === "application/octet-stream" && ALLOWED_EXTENSIONS.has(extension))) {
      return { ok: false, reason: `Unsupported content type ${contentType}` };
    }
  }
  return { ok: true, extension, contentType };
}
function parseEvidenceText(filename, text) {
  const warnings = [];
  const rows = [];
  const errorCodes = /* @__PURE__ */ new Set();
  const lower = filename.toLowerCase();
  if (/<script|javascript:|onerror=/i.test(text)) {
    warnings.push("Content contains script-like text; rendered inertly as data only");
  }
  if (lower.endsWith(".json")) {
    try {
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (let i = 0; i < items.length; i++) {
        const row = objectToRow(i + 1, items[i]);
        rows.push(row);
        if (row.errorCode) errorCodes.add(row.errorCode);
        if (row.warning) warnings.push(row.warning);
      }
    } catch {
      warnings.push("JSON parse failed; raw text retained without structured rows");
    }
    return { rows, warnings, extractedErrorCodes: [...errorCodes] };
  }
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lower.endsWith(".jsonl")) {
    for (let i = 0; i < lines.length; i++) {
      try {
        const row = objectToRow(i + 1, JSON.parse(lines[i]));
        rows.push(row);
        if (row.errorCode) errorCodes.add(row.errorCode);
        if (row.warning) warnings.push(row.warning);
      } catch {
        rows.push({
          line: i + 1,
          timestamp: null,
          timestampPrecision: "unknown",
          errorCode: null,
          message: lines[i].slice(0, 500),
          warning: "Malformed JSONL row retained as raw text"
        });
        warnings.push(`Line ${i + 1}: malformed JSONL`);
      }
    }
    return { rows, warnings, extractedErrorCodes: [...errorCodes] };
  }
  for (let i = 0; i < Math.min(lines.length, 2e3); i++) {
    const line = lines[i];
    const tsMatch = line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/);
    const errMatch = line.match(/\b([A-Z][A-Z0-9_]{2,}|ErrorCode[=:]\s*\S+|0x[0-9a-fA-F]+)\b/);
    let precision = "unknown";
    let timestamp = null;
    if (tsMatch) {
      timestamp = tsMatch[0];
      precision = /(?:Z|[+-]\d{2}:?\d{2})$/.test(timestamp) ? "exact" : "assumed_utc";
      if (precision === "assumed_utc") {
        warnings.push(`Line ${i + 1}: timestamp lacks explicit offset; labeled assumed_utc`);
      }
    }
    const errorCode = errMatch ? errMatch[1].replace(/^ErrorCode[=:]\s*/i, "") : null;
    if (errorCode) errorCodes.add(errorCode);
    rows.push({
      line: i + 1,
      timestamp,
      timestampPrecision: precision,
      errorCode,
      message: line.slice(0, 500)
    });
  }
  if (lines.length > 2e3) {
    warnings.push(`Only first 2000 of ${lines.length} lines were structured; raw file preserved`);
  }
  return { rows, warnings, extractedErrorCodes: [...errorCodes] };
}
function objectToRow(line, value) {
  if (!value || typeof value !== "object") {
    return {
      line,
      timestamp: null,
      timestampPrecision: "unknown",
      errorCode: null,
      message: String(value).slice(0, 500)
    };
  }
  const obj = value;
  const ts = typeof obj.timestamp === "string" && obj.timestamp || typeof obj.time === "string" && obj.time || typeof obj.ts === "string" && obj.ts || null;
  const errorCode = typeof obj.errorCode === "string" && obj.errorCode || typeof obj.error_code === "string" && obj.error_code || typeof obj.code === "string" && obj.code || null;
  const message = typeof obj.message === "string" && obj.message || typeof obj.msg === "string" && obj.msg || JSON.stringify(obj).slice(0, 500);
  let precision = "unknown";
  let warning;
  if (ts) {
    precision = /(?:Z|[+-]\d{2}:?\d{2})$/.test(ts) ? "exact" : "assumed_utc";
    if (precision === "assumed_utc") {
      warning = `Row ${line}: timestamp lacks explicit offset; labeled assumed_utc`;
    }
  }
  return { line, timestamp: ts, timestampPrecision: precision, errorCode, message, warning };
}
var EVIDENCE_MAX_FILE_BYTES, EVIDENCE_MAX_FILES_PER_INCIDENT, EVIDENCE_MAX_TOTAL_BYTES, EVIDENCE_PARSER_VERSION, ALLOWED_EXTENSIONS, ALLOWED_CONTENT_TYPES, REJECT_EXTENSIONS;
var init_evidence = __esm({
  "packages/domain/src/evidence.ts"() {
    "use strict";
    EVIDENCE_MAX_FILE_BYTES = 10 * 1024 * 1024;
    EVIDENCE_MAX_FILES_PER_INCIDENT = 25;
    EVIDENCE_MAX_TOTAL_BYTES = 100 * 1024 * 1024;
    EVIDENCE_PARSER_VERSION = "ranger-log-parser-1";
    ALLOWED_EXTENSIONS = /* @__PURE__ */ new Set([".txt", ".log", ".csv", ".json", ".jsonl", ".png", ".jpg", ".jpeg"]);
    ALLOWED_CONTENT_TYPES = /* @__PURE__ */ new Set([
      "text/plain",
      "text/csv",
      "application/json",
      "application/x-ndjson",
      "image/png",
      "image/jpeg",
      "application/octet-stream"
    ]);
    REJECT_EXTENSIONS = /* @__PURE__ */ new Set([
      ".html",
      ".htm",
      ".svg",
      ".exe",
      ".dll",
      ".zip",
      ".gz",
      ".tgz",
      ".rar",
      ".7z",
      ".js",
      ".mjs",
      ".sh",
      ".bat",
      ".cmd",
      ".ps1"
    ]);
  }
});

// packages/domain/src/ids.ts
var init_ids = __esm({
  "packages/domain/src/ids.ts"() {
    "use strict";
  }
});

// packages/domain/src/related-incidents.ts
function scoreRelatedIncidents(a, b) {
  const reasons = [];
  let score = 0;
  const errA = normalizeToken(a.errorCode);
  const errB = normalizeToken(b.errorCode);
  if (errA && errB && errA === errB) {
    reasons.push({ code: "same_error_code", points: 4, detail: `Same error code: ${errA}` });
    score += 4;
  }
  const apps = intersect(a.applicationIds ?? [], b.applicationIds ?? []);
  if (apps.length > 0) {
    reasons.push({
      code: "same_application",
      points: 2,
      detail: `Shared application resource(s): ${apps.slice(0, 3).join(", ")}`
    });
    score += 2;
  }
  const devices = intersect(a.deviceIds ?? [], b.deviceIds ?? []);
  if (devices.length > 0) {
    reasons.push({
      code: "same_device",
      points: 3,
      detail: `Shared device(s): ${devices.slice(0, 3).join(", ")}`
    });
    score += 3;
  }
  const tags = intersect(
    (a.tags ?? []).map((t) => t.toLowerCase()),
    (b.tags ?? []).map((t) => t.toLowerCase())
  );
  if (tags.length > 0) {
    const tagPoints = Math.min(3, tags.length);
    reasons.push({
      code: "shared_tags",
      points: tagPoints,
      detail: `Shared symptom tags (+1 each, cap 3): ${tags.slice(0, 5).join(", ")}`
    });
    score += tagPoints;
  }
  return { score, reasons };
}
function isRelatedSuggestion(score) {
  return score >= RELATED_SCORE_MINIMUM;
}
function normalizeToken(value) {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}
function intersect(a, b) {
  const setB = new Set(b.map((x) => x.toLowerCase()));
  return [...new Set(a.filter((x) => setB.has(x.toLowerCase())))];
}
var RELATED_SCORING_VERSION, RELATED_SCORE_MINIMUM;
var init_related_incidents = __esm({
  "packages/domain/src/related-incidents.ts"() {
    "use strict";
    RELATED_SCORING_VERSION = 1;
    RELATED_SCORE_MINIMUM = 4;
  }
});

// packages/domain/src/roles.ts
var init_roles = __esm({
  "packages/domain/src/roles.ts"() {
    "use strict";
  }
});

// packages/domain/src/scope.ts
function canMutate(actor, kind) {
  if (kind === "read") {
    return true;
  }
  if (kind === "download") {
    return actor.role !== "viewer";
  }
  if (actor.role === "viewer") {
    return false;
  }
  if (kind === "admin") {
    return actor.role === "admin";
  }
  if (kind === "automation") {
    return actor.role === "admin" || actor.automationExecute;
  }
  return actor.role === "admin" || actor.role === "technician";
}
var init_scope = __esm({
  "packages/domain/src/scope.ts"() {
    "use strict";
    init_errors();
  }
});

// packages/domain/src/workflow.ts
function groupMutationAllowed(group) {
  if (group.membershipCapability === "dynamic") {
    return {
      code: "unsupported_group",
      message: `Cannot mutate dynamic group ${group.displayName}`
    };
  }
  if (group.membershipCapability === "unsupported") {
    return {
      code: "unsupported_group",
      message: `Group ${group.displayName} does not support membership writes`
    };
  }
  if (group.groupType === "distribution") {
    return {
      code: "manual_distribution_group",
      message: `${group.displayName} is a distribution group \u2014 membership is a manual step`
    };
  }
  return null;
}
function buildOnboardingPlan(input) {
  const bindingByKey = new Map(input.bindings.map((b) => [b.bindingKey, b]));
  const groupById = new Map(input.groups.map((g) => [g.id, g]));
  const subById = new Map(input.subscriptions.map((s) => [s.id, s]));
  const steps = [];
  const issues = [];
  let previousKey = null;
  const usageLocation = input.usageLocation ?? null;
  for (const intent of input.intents) {
    const dependsOn = previousKey ? [previousKey] : [];
    if (intent.kind === "create_account") {
      const location = intent.usageLocation ?? usageLocation;
      if (!location) {
        issues.push({
          code: "usage_location_required",
          message: "Licensing requires a usage location at account creation",
          stepKey: intent.key
        });
      }
      steps.push({
        key: intent.key,
        kind: "create_account",
        executionMethod: "graph",
        dependsOn,
        summary: `Create cloud account for ${input.personDisplayName}`,
        params: {
          loginName: input.personEmail,
          displayName: input.personDisplayName,
          usageLocation: location
        }
      });
      previousKey = intent.key;
      continue;
    }
    if (intent.kind === "group_membership") {
      const binding = bindingByKey.get(intent.bindingKey);
      if (!binding || binding.resourceType !== "group") {
        issues.push({
          code: "missing_binding",
          message: `Company binding missing for group intent ${intent.bindingKey}`,
          stepKey: intent.key
        });
        continue;
      }
      const group = groupById.get(binding.resourceId);
      if (!group) {
        issues.push({
          code: "missing_resource",
          message: `Bound group ${binding.resourceId} is not in this company`,
          stepKey: intent.key
        });
        continue;
      }
      const mutation = groupMutationAllowed(group);
      if (mutation?.code === "manual_distribution_group") {
        steps.push({
          key: intent.key,
          kind: "manual_distribution_group",
          executionMethod: "manual",
          dependsOn,
          summary: `Manually add ${input.personDisplayName} to ${group.displayName}`,
          params: { groupId: group.id, groupName: group.displayName }
        });
        previousKey = intent.key;
        continue;
      }
      if (mutation) {
        issues.push({ ...mutation, stepKey: intent.key });
        continue;
      }
      steps.push({
        key: intent.key,
        kind: "add_group_membership",
        executionMethod: "graph",
        dependsOn,
        summary: `Add to ${group.displayName}`,
        params: {
          groupId: group.id,
          groupName: group.displayName,
          groupExternalId: group.externalId ?? null
        }
      });
      previousKey = intent.key;
      continue;
    }
    if (intent.kind === "license") {
      const binding = bindingByKey.get(intent.bindingKey);
      if (!binding || binding.resourceType !== "subscription") {
        issues.push({
          code: "missing_binding",
          message: `Company binding missing for license intent ${intent.bindingKey}`,
          stepKey: intent.key
        });
        continue;
      }
      const sub = subById.get(binding.resourceId);
      if (!sub) {
        issues.push({
          code: "missing_resource",
          message: `Bound subscription ${binding.resourceId} is not in this company`,
          stepKey: intent.key
        });
        continue;
      }
      const available = sub.purchasedQuantity - sub.consumedQuantity;
      if (available < 1) {
        issues.push({
          code: "insufficient_capacity",
          message: `No named seats available on ${sub.productName ?? sub.id} (${available} remaining)`,
          stepKey: intent.key
        });
      }
      steps.push({
        key: intent.key,
        kind: "assign_license",
        executionMethod: "graph",
        dependsOn,
        summary: `Assign ${sub.productName ?? "license"}`,
        params: {
          subscriptionId: sub.id,
          productId: sub.productId,
          productName: sub.productName ?? null
        }
      });
      previousKey = intent.key;
      continue;
    }
    if (intent.kind === "manual_mailbox") {
      steps.push({
        key: intent.key,
        kind: "manual_mailbox",
        executionMethod: "manual",
        dependsOn,
        summary: "Verify mailbox readiness (mail attribute is not proof of a usable mailbox)",
        params: {}
      });
      previousKey = intent.key;
      continue;
    }
    if (intent.kind === "manual_distribution_group") {
      const binding = bindingByKey.get(intent.bindingKey);
      steps.push({
        key: intent.key,
        kind: "manual_distribution_group",
        executionMethod: "manual",
        dependsOn,
        summary: "Manually update distribution group membership",
        params: { groupId: binding?.resourceId ?? null }
      });
      previousKey = intent.key;
      continue;
    }
    steps.push({
      key: intent.key,
      kind: "manual_application",
      executionMethod: "manual",
      dependsOn,
      summary: intent.label,
      params: { label: intent.label }
    });
    previousKey = intent.key;
  }
  return {
    kind: "onboarding",
    templateId: input.templateId,
    templateVersionId: input.templateVersionId,
    templateVersionNumber: input.templateVersionNumber,
    companyId: input.companyId,
    personId: input.personId,
    usageLocation,
    steps,
    issues
  };
}
function buildOffboardingPlan(input) {
  const steps = [];
  const issues = [];
  let previous = null;
  const dep = () => previous ? [previous] : [];
  const push = (step) => {
    steps.push(step);
    previous = step.key;
  };
  for (const account of input.accounts) {
    if (account.accountKind !== "human") {
      issues.push({
        code: "unclassified_account",
        message: `${account.loginName} is not an ordinary human account and requires review`
      });
      continue;
    }
    push({
      key: `disable:${account.id}`,
      kind: "disable_account",
      executionMethod: "graph",
      dependsOn: dep(),
      summary: `Disable ${account.loginName}`,
      params: { accountId: account.id, externalId: account.externalId ?? null, loginName: account.loginName }
    });
    push({
      key: `revoke:${account.id}`,
      kind: "revoke_sessions",
      executionMethod: "graph",
      dependsOn: dep(),
      summary: `Request session revocation for ${account.loginName} (acceptance \u2260 instant global sign-out)`,
      params: { accountId: account.id, externalId: account.externalId ?? null }
    });
  }
  for (const membership of input.memberships) {
    if (membership.membershipKind !== "direct") {
      steps.push({
        key: `membership-manual:${membership.id}`,
        kind: "manual_application",
        executionMethod: "manual",
        dependsOn: dep(),
        summary: `Inherited/dynamic membership on ${membership.groupName} cannot be removed as a direct member`,
        params: { membershipId: membership.id, groupId: membership.groupId }
      });
      previous = `membership-manual:${membership.id}`;
      continue;
    }
    const group = {
      id: membership.groupId,
      displayName: membership.groupName,
      groupType: membership.groupType,
      membershipCapability: membership.membershipCapability
    };
    const mutation = groupMutationAllowed(group);
    if (mutation?.code === "manual_distribution_group") {
      push({
        key: `remove-dist:${membership.id}`,
        kind: "manual_distribution_group",
        executionMethod: "manual",
        dependsOn: dep(),
        summary: `Manually remove from ${membership.groupName}`,
        params: { membershipId: membership.id, groupId: membership.groupId }
      });
      continue;
    }
    if (mutation) {
      issues.push({ ...mutation, stepKey: `remove:${membership.id}` });
      continue;
    }
    push({
      key: `remove-member:${membership.id}`,
      kind: "remove_group_membership",
      executionMethod: "graph",
      dependsOn: dep(),
      summary: `Remove from ${membership.groupName} via members/$ref`,
      params: { membershipId: membership.id, groupId: membership.groupId, accountId: membership.accountId }
    });
  }
  for (const assignment of input.assignments) {
    if (assignment.status !== "active" && assignment.status !== "removal_pending") continue;
    if (assignment.assignedByGroup) {
      push({
        key: `license-manual:${assignment.id}`,
        kind: "manual_application",
        executionMethod: "manual",
        dependsOn: dep(),
        summary: `Direct license removal would not resolve group-inherited ${assignment.productName ?? "entitlement"}`,
        params: { assignmentId: assignment.id }
      });
      continue;
    }
    push({
      key: `remove-license:${assignment.id}`,
      kind: "remove_license",
      executionMethod: "graph",
      dependsOn: dep(),
      summary: `Remove ${assignment.productName ?? "license"} assignment`,
      params: { assignmentId: assignment.id }
    });
  }
  for (const access of input.mailboxAccess) {
    push({
      key: `mailbox:${access.id}`,
      kind: "manual_mailbox",
      executionMethod: "manual",
      dependsOn: dep(),
      summary: `Record mailbox permission evidence (${access.mailboxAddress ?? access.id})`,
      params: { mailboxAccessId: access.id }
    });
  }
  return {
    kind: "offboarding",
    templateId: null,
    templateVersionId: null,
    templateVersionNumber: null,
    companyId: input.companyId,
    personId: input.personId,
    usageLocation: null,
    steps,
    issues
  };
}
function buildStatusChangePlan(input) {
  if (input.toStatus === "departed" && input.fromStatus === "departed") {
    throw new UnprocessableError("Person is already Departed");
  }
  return {
    kind: "status_change",
    templateId: null,
    templateVersionId: null,
    templateVersionNumber: null,
    companyId: input.companyId,
    personId: input.personId,
    usageLocation: null,
    steps: [
      {
        key: "set-status",
        kind: "set_it_status",
        executionMethod: "local",
        dependsOn: [],
        summary: `Set IT status to ${input.toStatus}${input.toStatus === "departed" ? " (visible even if cleanup is incomplete)" : ""}`,
        params: { toStatus: input.toStatus, departureDate: input.departureDate ?? null }
      }
    ],
    issues: []
  };
}
function executableStepKeys(steps, statuses) {
  const ready = [];
  for (const step of steps) {
    const status = statuses[step.key] ?? "pending";
    if (status !== "pending") continue;
    const depsOk = step.dependsOn.every((dep) => statuses[dep] === "succeeded" || statuses[dep] === "skipped");
    if (depsOk) ready.push(step.key);
  }
  return ready;
}
function deriveRunStatus(stepStatuses) {
  if (stepStatuses.some((s) => s === "canceled")) {
    if (stepStatuses.some((s) => s === "succeeded")) return "canceled";
    return "canceled";
  }
  if (stepStatuses.some((s) => s === "running")) return "running";
  if (stepStatuses.some((s) => s === "awaiting_manual")) return "waiting_manual";
  if (stepStatuses.some((s) => s === "failed")) {
    return stepStatuses.some((s) => s === "succeeded") ? "partial" : "failed";
  }
  if (stepStatuses.every((s) => s === "succeeded" || s === "skipped")) return "succeeded";
  if (stepStatuses.some((s) => s === "succeeded")) return "running";
  return "approved";
}
function planIsApprovable(plan) {
  return plan.issues.length === 0 && plan.steps.length > 0;
}
var init_workflow = __esm({
  "packages/domain/src/workflow.ts"() {
    "use strict";
    init_errors();
  }
});

// packages/domain/src/index.ts
var init_src2 = __esm({
  "packages/domain/src/index.ts"() {
    "use strict";
    init_archive();
    init_capacity();
    init_costs();
    init_dates();
    init_errors();
    init_evidence();
    init_ids();
    init_person_status();
    init_related_incidents();
    init_roles();
    init_scope();
    init_workflow();
  }
});

// packages/db/src/incidents.ts
import { randomUUID } from "node:crypto";
async function listIncidents(client, organizationId, companyId, filters) {
  const params = [organizationId, companyId];
  let sql = `SELECT * FROM incidents WHERE organization_id = $1 AND company_id = $2`;
  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND status = $${params.length}`;
  }
  if (filters?.personId) {
    params.push(filters.personId);
    sql += ` AND EXISTS (
      SELECT 1 FROM incident_affected_resources r
      WHERE r.incident_id = incidents.id AND r.resource_type = 'person' AND r.resource_id = $${params.length}
    )`;
  }
  sql += ` ORDER BY updated_at DESC`;
  const result = await client.query(sql, params);
  return result.rows;
}
async function getIncident(client, organizationId, companyId, incidentId) {
  const result = await client.query(
    `SELECT * FROM incidents WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, incidentId]
  );
  return result.rows[0] ?? null;
}
async function listAffectedResources(client, organizationId, companyId, incidentId) {
  const result = await client.query(
    `SELECT id, resource_type, resource_id, label
     FROM incident_affected_resources
     WHERE organization_id = $1 AND company_id = $2 AND incident_id = $3
     ORDER BY created_at`,
    [organizationId, companyId, incidentId]
  );
  return result.rows;
}
async function createIncident(client, input) {
  const id = randomUUID();
  await client.query(
    `INSERT INTO incidents (
      id, organization_id, company_id, title, reported_symptom, impact_description,
      severity, status, owner_staff_user_id, onset_at, external_ticket_ref, tags,
      workflow_run_id, workflow_step_key, correlation_id, provider_error
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,'open',$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.title,
      input.reportedSymptom,
      input.impactDescription ?? null,
      input.severity,
      input.ownerStaffUserId ?? null,
      input.onsetAt ? new Date(input.onsetAt) : null,
      input.externalTicketRef ?? null,
      input.tags ?? [],
      input.workflowRunId ?? null,
      input.workflowStepKey ?? null,
      input.correlationId ?? null,
      input.providerError ?? null
    ]
  );
  for (const resource of input.affected ?? []) {
    await client.query(
      `INSERT INTO incident_affected_resources (
        id, organization_id, company_id, incident_id, resource_type, resource_id, label
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT DO NOTHING`,
      [
        randomUUID(),
        input.organizationId,
        input.companyId,
        id,
        resource.resourceType,
        resource.resourceId,
        resource.label ?? null
      ]
    );
  }
  const incident = await getIncident(client, input.organizationId, input.companyId, id);
  await refreshRelatedSuggestions(client, input.organizationId, input.companyId, id);
  return incident;
}
async function updateIncident(client, input) {
  const current = await getIncident(client, input.organizationId, input.companyId, input.incidentId);
  if (!current) throw new NotFoundError("Incident not found");
  if (current.version !== input.version) {
    throw new UnprocessableError("Incident was modified by another user; refresh and retry");
  }
  if ((input.status === "resolved" || input.status === "closed") && !(input.resolutionSummary ?? current.resolution_summary)) {
    throw new UnprocessableError("Resolution summary is required to resolve or close");
  }
  const result = await client.query(
    `UPDATE incidents SET
      title = COALESCE($4, title),
      reported_symptom = COALESCE($5, reported_symptom),
      impact_description = CASE WHEN $6::boolean THEN $7 ELSE impact_description END,
      severity = COALESCE($8, severity),
      status = COALESCE($9, status),
      owner_staff_user_id = CASE WHEN $10::boolean THEN $11 ELSE owner_staff_user_id END,
      tags = COALESCE($12, tags),
      resolution_summary = CASE WHEN $13::boolean THEN $14 ELSE resolution_summary END,
      resolution_kind = CASE WHEN $15::boolean THEN $16 ELSE resolution_kind END,
      resolved_at = CASE
        WHEN $9 = 'resolved' AND resolved_at IS NULL THEN NOW()
        WHEN $9 IN ('open', 'investigating', 'waiting') THEN NULL
        ELSE resolved_at
      END,
      closed_at = CASE WHEN $9 = 'closed' THEN NOW() ELSE closed_at END,
      version = version + 1,
      updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND id = $3 AND version = $17
     RETURNING *`,
    [
      input.organizationId,
      input.companyId,
      input.incidentId,
      input.title ?? null,
      input.reportedSymptom ?? null,
      input.impactDescription !== void 0,
      input.impactDescription ?? null,
      input.severity ?? null,
      input.status ?? null,
      input.ownerStaffUserId !== void 0,
      input.ownerStaffUserId ?? null,
      input.tags ?? null,
      input.resolutionSummary !== void 0,
      input.resolutionSummary ?? null,
      input.resolutionKind !== void 0,
      input.resolutionKind ?? null,
      input.version
    ]
  );
  if (!result.rows[0]) throw new UnprocessableError("Incident was modified by another user; refresh and retry");
  return result.rows[0];
}
async function addAffectedResource(client, input) {
  await client.query(
    `INSERT INTO incident_affected_resources (
      id, organization_id, company_id, incident_id, resource_type, resource_id, label
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT DO NOTHING`,
    [
      randomUUID(),
      input.organizationId,
      input.companyId,
      input.incidentId,
      input.resourceType,
      input.resourceId,
      input.label ?? null
    ]
  );
  await refreshRelatedSuggestions(client, input.organizationId, input.companyId, input.incidentId);
}
async function listEvidence(client, organizationId, companyId, incidentId) {
  const result = await client.query(
    `SELECT * FROM incident_evidence
     WHERE organization_id = $1 AND company_id = $2 AND incident_id = $3
     ORDER BY created_at`,
    [organizationId, companyId, incidentId]
  );
  return result.rows;
}
async function getEvidence(client, organizationId, companyId, evidenceId) {
  const result = await client.query(
    `SELECT * FROM incident_evidence
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, evidenceId]
  );
  return result.rows[0] ?? null;
}
async function evidenceTotals(client, organizationId, companyId, incidentId) {
  const result = await client.query(
    `SELECT COUNT(*)::text AS count, COALESCE(SUM(byte_size), 0)::text AS bytes
     FROM incident_evidence
     WHERE organization_id = $1 AND company_id = $2 AND incident_id = $3
       AND kind IN ('upload', 'demo_service', 'redacted_derivative')`,
    [organizationId, companyId, incidentId]
  );
  return {
    count: Number(result.rows[0]?.count ?? 0),
    bytes: Number(result.rows[0]?.bytes ?? 0)
  };
}
async function insertEvidenceRecord(client, input) {
  const id = randomUUID();
  const result = await client.query(
    `INSERT INTO incident_evidence (
      id, organization_id, company_id, incident_id, file_object_id, kind, source_label,
      original_filename, content_type, byte_size, sha256, storage_key, collection_time,
      timestamp_precision, parser_version, parse_warnings, parsed_summary,
      redacted_from_evidence_id, is_redacted, ranger_event_ref, uploaded_by_staff_user_id
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18,$19,$20::jsonb,$21
    ) RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.incidentId,
      input.fileObjectId ?? null,
      input.kind,
      input.sourceLabel,
      input.originalFilename ?? null,
      input.contentType ?? null,
      input.byteSize ?? null,
      input.sha256 ?? null,
      input.storageKey ?? null,
      input.collectionTime ?? null,
      input.timestampPrecision ?? null,
      input.parserVersion ?? null,
      JSON.stringify(input.parseWarnings ?? []),
      JSON.stringify(input.parsedSummary ?? null),
      input.redactedFromEvidenceId ?? null,
      input.isRedacted ?? false,
      JSON.stringify(input.rangerEventRef ?? null),
      input.uploadedByStaffUserId ?? null
    ]
  );
  return result.rows[0];
}
function assertUploadAllowed(input) {
  const result = validateEvidenceUpload(input);
  if (result.ok === false) throw new UnprocessableError(result.reason);
}
function buildParsedSummary(filename, text) {
  const parsed = parseEvidenceText(filename, text);
  return {
    parserVersion: EVIDENCE_PARSER_VERSION,
    rowCount: parsed.rows.length,
    extractedErrorCodes: parsed.extractedErrorCodes,
    warnings: parsed.warnings,
    sampleRows: parsed.rows.slice(0, 50)
  };
}
async function insertFileObject(client, input) {
  const id = randomUUID();
  await client.query(
    `INSERT INTO file_objects (
      id, organization_id, company_id, storage_key, original_filename, content_type,
      byte_size, sha256, created_by_staff_user_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.storageKey,
      input.originalFilename,
      input.contentType,
      input.byteSize,
      input.sha256,
      input.createdByStaffUserId
    ]
  );
  return id;
}
async function listInvestigationEntries(client, organizationId, companyId, incidentId) {
  const result = await client.query(
    `SELECT * FROM investigation_entries
     WHERE organization_id = $1 AND company_id = $2 AND incident_id = $3
     ORDER BY COALESCE(occurred_at, created_at), created_at`,
    [organizationId, companyId, incidentId]
  );
  return result.rows;
}
async function createInvestigationEntry(client, input) {
  const id = randomUUID();
  const result = await client.query(
    `INSERT INTO investigation_entries (
      id, organization_id, company_id, incident_id, entry_kind, body,
      occurred_at, time_precision, author_staff_user_id, linked_evidence_ids
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.incidentId,
      input.entryKind,
      input.body,
      input.occurredAt ? new Date(input.occurredAt) : null,
      input.timePrecision ?? (input.occurredAt ? "exact" : "unknown"),
      input.authorStaffUserId,
      input.linkedEvidenceIds ?? []
    ]
  );
  return result.rows[0];
}
async function linkRangerEventEvidence(client, input) {
  return insertEvidenceRecord(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    incidentId: input.incidentId,
    kind: "ranger_event",
    sourceLabel: "RANGER timeline",
    timestampPrecision: input.occurredAt ? "exact" : "unknown",
    collectionTime: input.occurredAt ? new Date(input.occurredAt) : null,
    rangerEventRef: {
      eventId: input.eventId,
      eventKind: input.eventKind,
      summary: input.summary,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null
    },
    parsedSummary: { note: "Source reference only \u2014 original timeline event not copied as editable text" },
    uploadedByStaffUserId: input.uploadedByStaffUserId
  });
}
async function scoreInputForIncident(client, organizationId, companyId, incident) {
  const resources = await listAffectedResources(client, organizationId, companyId, incident.id);
  const evidence = await listEvidence(client, organizationId, companyId, incident.id);
  const errorCodes = [];
  if (incident.provider_error) {
    const match = incident.provider_error.match(/\b([A-Za-z][A-Za-z0-9_]{2,})\b/);
    if (match) errorCodes.push(match[1]);
  }
  for (const item of evidence) {
    const summary = item.parsed_summary;
    for (const code of summary?.extractedErrorCodes ?? []) errorCodes.push(code);
  }
  return {
    errorCode: errorCodes[0] ?? null,
    applicationIds: resources.filter((r) => r.resource_type === "product" || r.resource_type === "subscription").map((r) => r.resource_id),
    deviceIds: resources.filter((r) => r.resource_type === "device").map((r) => r.resource_id),
    tags: incident.tags
  };
}
async function refreshRelatedSuggestions(client, organizationId, companyId, incidentId) {
  const incident = await getIncident(client, organizationId, companyId, incidentId);
  if (!incident) return;
  const others = (await listIncidents(client, organizationId, companyId)).filter((i) => i.id !== incidentId);
  const left = await scoreInputForIncident(client, organizationId, companyId, incident);
  for (const other of others) {
    const right = await scoreInputForIncident(client, organizationId, companyId, other);
    const { score, reasons } = scoreRelatedIncidents(left, right);
    if (!isRelatedSuggestion(score)) continue;
    await client.query(
      `INSERT INTO related_incident_suggestions (
        id, organization_id, company_id, incident_id, suggested_incident_id,
        scoring_version, score, reasons, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'suggested')
      ON CONFLICT (organization_id, company_id, incident_id, suggested_incident_id, scoring_version)
      DO UPDATE SET
        score = EXCLUDED.score,
        reasons = EXCLUDED.reasons,
        updated_at = NOW(),
        status = CASE
          WHEN related_incident_suggestions.status = 'dismissed' THEN 'dismissed'
          WHEN related_incident_suggestions.status = 'linked' THEN 'linked'
          ELSE 'suggested'
        END`,
      [
        randomUUID(),
        organizationId,
        companyId,
        incidentId,
        other.id,
        RELATED_SCORING_VERSION,
        score,
        JSON.stringify(reasons)
      ]
    );
  }
}
async function listRelatedSuggestions(client, organizationId, companyId, incidentId) {
  const result = await client.query(
    `SELECT s.id, s.suggested_incident_id, s.scoring_version, s.score, s.reasons, s.status,
            i.title, i.provider_error
     FROM related_incident_suggestions s
     JOIN incidents i ON i.id = s.suggested_incident_id
     WHERE s.organization_id = $1 AND s.company_id = $2 AND s.incident_id = $3
       AND s.status = 'suggested'
     ORDER BY s.score DESC`,
    [organizationId, companyId, incidentId]
  );
  return result.rows;
}
async function dismissRelatedSuggestion(client, organizationId, companyId, suggestionId) {
  await client.query(
    `UPDATE related_incident_suggestions
     SET status = 'dismissed', updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, suggestionId]
  );
}
async function linkRelatedSuggestion(client, organizationId, companyId, suggestionId) {
  await client.query(
    `UPDATE related_incident_suggestions
     SET status = 'linked', updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, suggestionId]
  );
}
async function createProblem(client, input) {
  const id = randomUUID();
  await client.query(
    `INSERT INTO problems (
      id, organization_id, company_id, title, working_cause, owner_staff_user_id, permanent_fix_work_item_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.title,
      input.workingCause ?? null,
      input.ownerStaffUserId ?? null,
      input.permanentFixWorkItemId ?? null
    ]
  );
  for (const incidentId of input.incidentIds) {
    await client.query(
      `INSERT INTO problem_incidents (organization_id, company_id, problem_id, incident_id)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [input.organizationId, input.companyId, id, incidentId]
    );
  }
  const result = await client.query(
    `SELECT * FROM problems WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [input.organizationId, input.companyId, id]
  );
  return result.rows[0];
}
async function listProblems(client, organizationId, companyId) {
  const result = await client.query(
    `SELECT p.*, COALESCE(array_agg(pi.incident_id) FILTER (WHERE pi.incident_id IS NOT NULL), '{}') AS incident_ids
     FROM problems p
     LEFT JOIN problem_incidents pi
       ON pi.problem_id = p.id AND pi.organization_id = p.organization_id AND pi.company_id = p.company_id
     WHERE p.organization_id = $1 AND p.company_id = $2
     GROUP BY p.id
     ORDER BY p.updated_at DESC`,
    [organizationId, companyId]
  );
  return result.rows;
}
async function insertIncidentExport(client, input) {
  const id = randomUUID();
  const result = await client.query(
    `INSERT INTO incident_exports (
      id, organization_id, company_id, incident_id, created_by_staff_user_id,
      selected_evidence_ids, selected_entry_ids, excluded_fields, report_markdown,
      manifest, storage_key, sha256, byte_size
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.incidentId,
      input.createdByStaffUserId,
      input.selectedEvidenceIds,
      input.selectedEntryIds,
      input.excludedFields,
      input.reportMarkdown,
      JSON.stringify(input.manifest),
      input.storageKey,
      input.sha256,
      input.byteSize
    ]
  );
  return result.rows[0];
}
async function getIncidentExport(client, organizationId, companyId, exportId) {
  const result = await client.query(
    `SELECT * FROM incident_exports
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, exportId]
  );
  return result.rows[0] ?? null;
}
async function listIncidentsForResource(client, organizationId, companyId, resourceType, resourceId) {
  const result = await client.query(
    `SELECT i.* FROM incidents i
     JOIN incident_affected_resources r
       ON r.incident_id = i.id AND r.organization_id = i.organization_id AND r.company_id = i.company_id
     WHERE i.organization_id = $1 AND i.company_id = $2
       AND r.resource_type = $3 AND r.resource_id = $4
     ORDER BY i.updated_at DESC`,
    [organizationId, companyId, resourceType, resourceId]
  );
  return result.rows;
}
async function countOpenIncidents(client, organizationId, companyIds) {
  if (companyIds.length === 0) return 0;
  const result = await client.query(
    `SELECT COUNT(*)::text AS count FROM incidents
     WHERE organization_id = $1 AND company_id = ANY($2::uuid[])
       AND status IN ('open', 'investigating', 'waiting')`,
    [organizationId, companyIds]
  );
  return Number(result.rows[0]?.count ?? 0);
}
var init_incidents = __esm({
  "packages/db/src/incidents.ts"() {
    "use strict";
    init_src2();
  }
});

// packages/db/src/seed-incidents.ts
async function seedIncidents(client, actorStaffUserId) {
  await client.query(`DELETE FROM incident_exports WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM problem_incidents WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM problems WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM related_incident_suggestions WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM investigation_entries WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM incident_evidence WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM incident_affected_resources WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM incidents WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(
    `INSERT INTO incidents (
      id, organization_id, company_id, title, reported_symptom, impact_description,
      severity, status, tags, provider_error, resolution_summary, resolution_kind, resolved_at,
      owner_staff_user_id
    ) VALUES (
      $1,$2,$3,
      'Earlier SketchUp license assign failure',
      'Onboarding could not assign SketchUp after account create',
      'Contractor blocked from design tools for one day',
      'high', 'resolved', ARRAY['onboarding','license'],
      'LicenseAssignmentFailed',
      'SKU pool exhausted; purchased seat then retried assignLicense successfully',
      'confirmed_cause', NOW() - INTERVAL '14 days', $4
    )`,
    [PRIOR_LICENSE_INCIDENT, SEED_ORGANIZATION_ID, SEED_COMPANY_IDS.harbor, actorStaffUserId]
  );
  await client.query(
    `INSERT INTO incident_affected_resources (
      id, organization_id, company_id, incident_id, resource_type, resource_id, label
    ) VALUES
      (gen_random_uuid(), $1, $2, $3, 'person', $4, 'Alex Rivera'),
      (gen_random_uuid(), $1, $2, $3, 'product', $5, 'SketchUp Pro')`,
    [
      SEED_ORGANIZATION_ID,
      SEED_COMPANY_IDS.harbor,
      PRIOR_LICENSE_INCIDENT,
      SEED_PERSON_IDS.alexRiveraHarbor,
      SEED_PRODUCT_IDS.sketchupPro
    ]
  );
  await createInvestigationEntry(client, {
    organizationId: SEED_ORGANIZATION_ID,
    companyId: SEED_COMPANY_IDS.harbor,
    incidentId: PRIOR_LICENSE_INCIDENT,
    entryKind: "result",
    body: "Confirmed cause: purchasedQuantity exhausted. Retry after capacity increase succeeded.",
    authorStaffUserId: actorStaffUserId,
    occurredAt: "2026-09-16T18:00:00.000Z",
    timePrecision: "exact"
  });
  const authIncident = await createIncident(client, {
    organizationId: SEED_ORGANIZATION_ID,
    companyId: SEED_COMPANY_IDS.harbor,
    title: "Demo auth error burst after CA policy change",
    reportedSymptom: "Multiple AuthFailed events after conditional access change",
    impactDescription: "Harbor users briefly unable to sign in to demo auth service",
    severity: "medium",
    ownerStaffUserId: actorStaffUserId,
    tags: ["auth", "demo-service"],
    providerError: "AuthFailed",
    affected: [
      {
        resourceType: "person",
        resourceId: SEED_PERSON_IDS.alexRiveraHarbor,
        label: "Alex Rivera"
      },
      {
        resourceType: "product",
        resourceId: SEED_PRODUCT_IDS.m365,
        label: "Microsoft 365"
      }
    ]
  });
  await createInvestigationEntry(client, {
    organizationId: SEED_ORGANIZATION_ID,
    companyId: SEED_COMPANY_IDS.harbor,
    incidentId: authIncident.id,
    entryKind: "observation",
    body: "Imported samples/demo-auth-events.jsonl. Config change at 15:00:30Z precedes AuthFailed burst. No automatic causation claimed.",
    authorStaffUserId: actorStaffUserId,
    occurredAt: "2026-09-30T15:00:30.000Z",
    timePrecision: "exact"
  });
  await createInvestigationEntry(client, {
    organizationId: SEED_ORGANIZATION_ID,
    companyId: SEED_COMPANY_IDS.harbor,
    incidentId: authIncident.id,
    entryKind: "hypothesis",
    body: "Conditional access misconfiguration may have blocked token exchange.",
    authorStaffUserId: actorStaffUserId
  });
  await refreshRelatedSuggestions(client, SEED_ORGANIZATION_ID, SEED_COMPANY_IDS.harbor, PRIOR_LICENSE_INCIDENT);
  await refreshRelatedSuggestions(client, SEED_ORGANIZATION_ID, SEED_COMPANY_IDS.harbor, authIncident.id);
}
var PRIOR_LICENSE_INCIDENT;
var init_seed_incidents = __esm({
  "packages/db/src/seed-incidents.ts"() {
    "use strict";
    init_src();
    init_incidents();
    PRIOR_LICENSE_INCIDENT = "88888888-8888-4888-8888-888888888881";
  }
});

// packages/db/src/lifecycle.ts
import { randomUUID as randomUUID2 } from "node:crypto";
function parseIntents(value) {
  return Array.isArray(value) ? value : [];
}
async function createRoleTemplate(client, input) {
  const id = input.id ?? randomUUID2();
  const versionId = input.versionId ?? randomUUID2();
  const template = await client.query(
    `INSERT INTO role_templates (id, organization_id, name, description)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, input.organizationId, input.name, input.description ?? null]
  );
  const version = await client.query(
    `INSERT INTO role_template_versions (
      id, organization_id, template_id, version_number, intents, immutable
    ) VALUES ($1,$2,$3,1,$4::jsonb,TRUE) RETURNING *`,
    [versionId, input.organizationId, id, JSON.stringify(input.intents)]
  );
  return { template: template.rows[0], version: mapVersion(version.rows[0]) };
}
function mapVersion(row) {
  return { ...row, intents: parseIntents(row.intents) };
}
async function addTemplateVersion(client, input) {
  const current = await client.query(
    `SELECT COALESCE(MAX(version_number), 0) AS version_number
     FROM role_template_versions WHERE organization_id = $1 AND template_id = $2`,
    [input.organizationId, input.templateId]
  );
  const next = Number(current.rows[0]?.version_number ?? 0) + 1;
  const result = await client.query(
    `INSERT INTO role_template_versions (
      id, organization_id, template_id, version_number, intents, immutable
    ) VALUES ($1,$2,$3,$4,$5::jsonb,TRUE) RETURNING *`,
    [randomUUID2(), input.organizationId, input.templateId, next, JSON.stringify(input.intents)]
  );
  await client.query(
    `UPDATE role_templates SET version = version + 1, updated_at = NOW()
     WHERE organization_id = $1 AND id = $2`,
    [input.organizationId, input.templateId]
  );
  return mapVersion(result.rows[0]);
}
async function listRoleTemplates(client, organizationId) {
  const templates = await client.query(
    `SELECT * FROM role_templates WHERE organization_id = $1 ORDER BY name`,
    [organizationId]
  );
  const out = [];
  for (const template of templates.rows) {
    const version = await client.query(
      `SELECT * FROM role_template_versions
       WHERE organization_id = $1 AND template_id = $2
       ORDER BY version_number DESC LIMIT 1`,
      [organizationId, template.id]
    );
    out.push({
      ...template,
      currentVersion: version.rows[0] ? mapVersion(version.rows[0]) : null
    });
  }
  return out;
}
async function getTemplateVersion(client, organizationId, versionId) {
  const result = await client.query(
    `SELECT * FROM role_template_versions WHERE organization_id = $1 AND id = $2`,
    [organizationId, versionId]
  );
  return result.rows[0] ? mapVersion(result.rows[0]) : null;
}
async function upsertCompanyBinding(client, input) {
  const result = await client.query(
    `INSERT INTO company_template_bindings (
      id, organization_id, company_id, template_id, binding_key, resource_type, resource_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (organization_id, company_id, template_id, binding_key)
    DO UPDATE SET resource_type = EXCLUDED.resource_type, resource_id = EXCLUDED.resource_id, updated_at = NOW()
    RETURNING *`,
    [
      randomUUID2(),
      input.organizationId,
      input.companyId,
      input.templateId,
      input.bindingKey,
      input.resourceType,
      input.resourceId
    ]
  );
  return result.rows[0];
}
async function listCompanyBindings(client, organizationId, companyId, templateId) {
  const result = await client.query(
    `SELECT * FROM company_template_bindings
     WHERE organization_id = $1 AND company_id = $2 AND template_id = $3
     ORDER BY binding_key`,
    [organizationId, companyId, templateId]
  );
  return result.rows;
}
async function insertWorkflowRun(client, input) {
  const id = input.id ?? randomUUID2();
  const result = await client.query(
    `INSERT INTO workflow_runs (
      id, organization_id, company_id, person_id, kind, status, template_id, template_version_id,
      frozen_plan, idempotency_key, actor_staff_user_id, correlation_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.personId,
      input.kind,
      input.status ?? "preview",
      input.templateId ?? null,
      input.templateVersionId ?? null,
      JSON.stringify(input.frozenPlan),
      input.idempotencyKey,
      input.actorStaffUserId,
      input.correlationId ?? null
    ]
  );
  const run = mapRun(result.rows[0]);
  for (const step of input.frozenPlan.steps) {
    await client.query(
      `INSERT INTO workflow_steps (
        id, organization_id, company_id, run_id, step_key, kind, execution_method,
        depends_on, status, params, summary
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)`,
      [
        randomUUID2(),
        input.organizationId,
        input.companyId,
        run.id,
        step.key,
        step.kind,
        step.executionMethod,
        step.dependsOn,
        "pending",
        JSON.stringify(step.params),
        step.summary
      ]
    );
  }
  return run;
}
function mapRun(row) {
  const plan = row.frozen_plan;
  return { ...row, frozen_plan: plan };
}
async function getWorkflowRun(client, organizationId, companyId, runId) {
  const result = await client.query(
    `SELECT * FROM workflow_runs WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, runId]
  );
  return result.rows[0] ? mapRun(result.rows[0]) : null;
}
async function listWorkflowRuns(client, organizationId, companyId, personId) {
  const params = [organizationId, companyId];
  let sql = `SELECT * FROM workflow_runs WHERE organization_id = $1 AND company_id = $2`;
  if (personId) {
    params.push(personId);
    sql += ` AND person_id = $3`;
  }
  sql += ` ORDER BY created_at DESC`;
  const result = await client.query(sql, params);
  return result.rows.map(mapRun);
}
async function listRunnableWorkflows(client) {
  const result = await client.query(
    `SELECT * FROM workflow_runs
     WHERE status IN ('approved', 'running', 'waiting_manual')
     ORDER BY created_at ASC`
  );
  return result.rows.map(mapRun);
}
async function listWorkflowSteps(client, runId) {
  const result = await client.query(
    `SELECT * FROM workflow_steps WHERE run_id = $1 ORDER BY created_at`,
    [runId]
  );
  return result.rows;
}
async function updateRunStatus(client, runId, status, extra) {
  await client.query(
    `UPDATE workflow_runs SET
      status = $2,
      approved_at = CASE WHEN $3 THEN NOW() ELSE approved_at END,
      canceled_at = CASE WHEN $4 THEN NOW() ELSE canceled_at END,
      updated_at = NOW(),
      version = version + 1
     WHERE id = $1`,
    [runId, status, extra?.approvedAt === true, extra?.canceledAt === true]
  );
}
async function updateStepStatus(client, stepId, status, extra) {
  await client.query(
    `UPDATE workflow_steps SET
      status = $2,
      result_evidence = COALESCE($3, result_evidence),
      error_message = $4,
      updated_at = NOW()
     WHERE id = $1`,
    [stepId, status, extra?.evidence ?? null, extra?.error ?? null]
  );
}
async function insertStepAttempt(client, input) {
  const count = await client.query(
    `SELECT COUNT(*)::text AS n FROM workflow_step_attempts WHERE step_id = $1`,
    [input.stepId]
  );
  await client.query(
    `INSERT INTO workflow_step_attempts (
      id, organization_id, company_id, run_id, step_id, attempt_number, status,
      provider_accepted, verified, evidence, error_message, finished_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, CASE WHEN $7 = 'running' THEN NULL ELSE NOW() END)`,
    [
      randomUUID2(),
      input.organizationId,
      input.companyId,
      input.runId,
      input.stepId,
      Number(count.rows[0]?.n ?? 0) + 1,
      input.status,
      input.providerAccepted ?? null,
      input.verified ?? null,
      input.evidence ?? null,
      input.error ?? null
    ]
  );
}
async function insertNotification(client, input) {
  await client.query(
    `INSERT INTO in_app_notifications (
      id, organization_id, staff_user_id, company_id, title, body, run_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      randomUUID2(),
      input.organizationId,
      input.staffUserId,
      input.companyId ?? null,
      input.title,
      input.body,
      input.runId ?? null
    ]
  );
}
async function listNotifications(client, organizationId, staffUserId) {
  const result = await client.query(
    `SELECT id, title, body, run_id, created_at, read_at
     FROM in_app_notifications
     WHERE organization_id = $1 AND staff_user_id = $2
     ORDER BY created_at DESC
     LIMIT 50`,
    [organizationId, staffUserId]
  );
  return result.rows;
}
async function insertWelcomePreview(client, input) {
  const existing = await client.query(
    `SELECT 1 FROM welcome_email_previews WHERE run_id = $1`,
    [input.runId]
  );
  if ((existing.rowCount ?? 0) > 0) return;
  await client.query(
    `INSERT INTO welcome_email_previews (
      id, organization_id, company_id, run_id, person_id, subject, body
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      randomUUID2(),
      input.organizationId,
      input.companyId,
      input.runId,
      input.personId,
      `Welcome to RANGER IT \u2014 ${input.displayName}`,
      `Local preview only. Not sent.

Hello ${input.displayName},
Your account ${input.loginName} is being prepared. This preview is stored on the workflow run and is never sent during retries or demo reset.`
    ]
  );
}
async function countWaitingWorkflowSteps(client, organizationId, companyIds) {
  if (companyIds.length === 0) return 0;
  const result = await client.query(
    `SELECT COUNT(*)::text AS count FROM workflow_steps s
     JOIN workflow_runs r ON r.id = s.run_id
     WHERE r.organization_id = $1 AND r.company_id = ANY($2::uuid[])
       AND s.status IN ('failed', 'awaiting_manual')
       AND r.status NOT IN ('canceled', 'succeeded')`,
    [organizationId, companyIds]
  );
  return Number(result.rows[0]?.count ?? 0);
}
async function countPeopleOffboarding(client, organizationId, companyIds) {
  if (companyIds.length === 0) return 0;
  const result = await client.query(
    `SELECT COUNT(*)::text AS count FROM people
     WHERE organization_id = $1
       AND company_id = ANY($2::uuid[])
       AND archived_at IS NULL
       AND (
         it_status = 'departed'
         OR workflow_badge IN ('offboarding_in_progress', 'offboarding_scheduled')
       )`,
    [organizationId, companyIds]
  );
  return Number(result.rows[0]?.count ?? 0);
}
async function countUpcomingLifecycleReviews(client, organizationId, companyIds, asOf, withinDays = 14) {
  if (companyIds.length === 0) return 0;
  const result = await client.query(
    `SELECT COUNT(*)::text AS count FROM people
     WHERE organization_id = $1
       AND company_id = ANY($2::uuid[])
       AND archived_at IS NULL
       AND (
         (start_date IS NOT NULL AND start_date BETWEEN $3::date AND ($3::date + ($4::int * INTERVAL '1 day')))
         OR (end_date IS NOT NULL AND end_date BETWEEN $3::date AND ($3::date + ($4::int * INTERVAL '1 day')))
       )`,
    [organizationId, companyIds, asOf, withinDays]
  );
  return Number(result.rows[0]?.count ?? 0);
}
function asDateString(value) {
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}
async function listLifecycleBoard(client, organizationId, companyIds, asOf, withinDays = 14) {
  if (companyIds.length === 0) {
    return {
      startsSoon: [],
      leavesSoon: [],
      offboarding: [],
      waitingRuns: [],
      activeAssignments: []
    };
  }
  const people = await client.query(
    `SELECT p.id, p.company_id, c.name AS company_name, p.display_name, p.it_status,
            p.workflow_badge, p.start_date, p.end_date
     FROM people p
     JOIN companies c ON c.organization_id = p.organization_id AND c.id = p.company_id
     WHERE p.organization_id = $1
       AND p.company_id = ANY($2::uuid[])
       AND p.archived_at IS NULL
     ORDER BY p.display_name`,
    [organizationId, companyIds]
  );
  const mapped = people.rows.map((row) => ({
    id: row.id,
    company_id: row.company_id,
    company_name: row.company_name,
    display_name: row.display_name,
    it_status: row.it_status,
    workflow_badge: row.workflow_badge,
    start_date: asDateString(row.start_date),
    end_date: asDateString(row.end_date)
  }));
  const startsSoon = mapped.filter((p) => {
    if (!p.start_date) return false;
    const delta = daysBetweenDates(asOf, p.start_date);
    return delta != null && delta >= 0 && delta <= withinDays;
  });
  const leavesSoon = mapped.filter((p) => {
    if (!p.end_date) return false;
    const delta = daysBetweenDates(asOf, p.end_date);
    return delta != null && delta >= 0 && delta <= withinDays;
  });
  const offboarding = mapped.filter(
    (p) => p.it_status === "departed" || p.workflow_badge === "offboarding_in_progress" || p.workflow_badge === "offboarding_scheduled"
  );
  const runs = await client.query(
    `SELECT r.id, r.company_id, c.name AS company_name, r.person_id, p.display_name AS person_name,
            r.kind, r.status, r.created_at
     FROM workflow_runs r
     JOIN companies c ON c.organization_id = r.organization_id AND c.id = r.company_id
     JOIN people p ON p.organization_id = r.organization_id AND p.company_id = r.company_id AND p.id = r.person_id
     WHERE r.organization_id = $1
       AND r.company_id = ANY($2::uuid[])
       AND r.status IN ('approved', 'running', 'waiting_manual', 'partial', 'failed', 'preview')
     ORDER BY r.created_at DESC
     LIMIT 25`,
    [organizationId, companyIds]
  );
  const assignments = await client.query(
    `SELECT la.id, la.company_id, c.name AS company_name, la.person_id, p.display_name AS person_name,
            pr.name AS product_name, la.start_effective_date, la.end_effective_date, la.status
     FROM license_assignments la
     JOIN companies c ON c.organization_id = la.organization_id AND c.id = la.company_id
     JOIN people p ON p.organization_id = la.organization_id AND p.company_id = la.company_id AND p.id = la.person_id
     LEFT JOIN products pr ON pr.organization_id = la.organization_id AND pr.id = la.product_id
     WHERE la.organization_id = $1
       AND la.company_id = ANY($2::uuid[])
       AND la.status IN ('active', 'removal_pending')
       AND la.person_id IS NOT NULL
     ORDER BY la.start_effective_date NULLS LAST
     LIMIT 40`,
    [organizationId, companyIds]
  );
  return {
    startsSoon,
    leavesSoon,
    offboarding,
    waitingRuns: runs.rows,
    activeAssignments: assignments.rows.map((row) => ({
      id: row.id,
      company_id: row.company_id,
      company_name: row.company_name,
      person_id: row.person_id,
      person_name: row.person_name,
      product_name: row.product_name,
      start_effective_date: asDateString(row.start_effective_date),
      end_effective_date: asDateString(row.end_effective_date),
      status: row.status
    }))
  };
}
function daysBetweenDates(from, to) {
  const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(from);
  const b = /^(\d{4})-(\d{2})-(\d{2})/.exec(to);
  if (!a || !b) return null;
  const start = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const end = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  return Math.round((end - start) / 864e5);
}
var init_lifecycle = __esm({
  "packages/db/src/lifecycle.ts"() {
    "use strict";
  }
});

// packages/db/src/seed-lifecycle.ts
async function seedLifecycle(client) {
  await client.query(`DELETE FROM welcome_email_previews WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM in_app_notifications WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM workflow_step_attempts WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM workflow_steps WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM workflow_runs WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM company_template_bindings WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM role_template_versions WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM role_templates WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await createRoleTemplate(client, {
    organizationId: SEED_ORGANIZATION_ID,
    name: "Project coordinator",
    description: "Harbor onboarding: account, design security group, SketchUp seat, mailbox verification.",
    intents: PROJECT_COORDINATOR_INTENTS,
    id: SEED_TEMPLATE_IDS.projectCoordinator,
    versionId: SEED_TEMPLATE_VERSION_IDS.projectCoordinatorV1
  });
  await upsertCompanyBinding(client, {
    organizationId: SEED_ORGANIZATION_ID,
    companyId: SEED_COMPANY_IDS.harbor,
    templateId: SEED_TEMPLATE_IDS.projectCoordinator,
    bindingKey: "security",
    resourceType: "group",
    resourceId: SEED_GROUP_IDS.harborDesignSecurity
  });
  await upsertCompanyBinding(client, {
    organizationId: SEED_ORGANIZATION_ID,
    companyId: SEED_COMPANY_IDS.harbor,
    templateId: SEED_TEMPLATE_IDS.projectCoordinator,
    bindingKey: "sketchup",
    resourceType: "subscription",
    resourceId: SEED_SUBSCRIPTION_IDS.harborSketchup
  });
}
var PROJECT_COORDINATOR_INTENTS;
var init_seed_lifecycle = __esm({
  "packages/db/src/seed-lifecycle.ts"() {
    "use strict";
    init_src();
    init_lifecycle();
    PROJECT_COORDINATOR_INTENTS = [
      { key: "account", kind: "create_account", usageLocation: "US" },
      { key: "security-group", kind: "group_membership", bindingKey: "security" },
      { key: "sketchup", kind: "license", bindingKey: "sketchup" },
      { key: "mailbox", kind: "manual_mailbox" }
    ];
  }
});

// packages/db/src/seed-demo-clone.ts
import { randomUUID as randomUUID3 } from "node:crypto";
async function seedVisitorDemoStory(client, input) {
  const alexId = randomUUID3();
  const caseyId = randomUUID3();
  const productId = randomUUID3();
  const subscriptionId = randomUUID3();
  const priceId = randomUUID3();
  const assignmentId = randomUUID3();
  await client.query(
    `INSERT INTO products (
      id, organization_id, name, vendor, category, assignment_model, version
    ) VALUES ($1,$2,'SketchUp Pro','Trimble','design','named_user',1)`,
    [productId, input.organizationId]
  );
  await client.query(
    `INSERT INTO people (
      id, organization_id, company_id, display_name, work_email, role_title, department,
      it_status, start_date, end_date, version
    ) VALUES
      ($1,$3,$4,'Alex Rivera','alex.rivera@harbor.example','Contractor','Studio','active','2026-09-03','2026-09-17',1),
      ($2,$3,$4,'Casey Nguyen','casey.nguyen@harbor.example','Designer','Studio','planned','2026-10-06',NULL,1)`,
    [alexId, caseyId, input.organizationId, input.harborCompanyId]
  );
  await client.query(
    `INSERT INTO subscriptions (
      id, organization_id, company_id, product_id, supplier, external_reference,
      purchased_quantity, currency, payer, billing_cadence,
      commitment_start, commitment_end, renewal_date, state
    ) VALUES (
      $1,$2,$3,$4,'MSP reseller','DEMO-SKP-5',5,'USD','msp','annual',
      '2026-01-01','2026-12-31','2027-01-01','active'
    )`,
    [subscriptionId, input.organizationId, input.harborCompanyId, productId]
  );
  await client.query(
    `INSERT INTO subscription_price_versions (
      id, organization_id, company_id, subscription_id, effective_from, effective_to,
      unit_price, price_kind, cadence, source
    ) VALUES ($1,$2,$3,$4,'2026-01-01',NULL,299.00,'unit','annual','demo-clone')`,
    [priceId, input.organizationId, input.harborCompanyId, subscriptionId]
  );
  await client.query(
    `INSERT INTO license_assignments (
      id, organization_id, company_id, person_id, account_id, product_id, subscription_id,
      status, start_effective_date, end_effective_date, date_provenance, source
    ) VALUES (
      $1,$2,$3,$4,NULL,$5,$6,'ended','2026-09-03','2026-09-17','seed','demo-clone'
    )`,
    [assignmentId, input.organizationId, input.harborCompanyId, alexId, productId, subscriptionId]
  );
  const incident = await createIncident(client, {
    organizationId: input.organizationId,
    companyId: input.harborCompanyId,
    title: "Earlier SketchUp license assign failure",
    reportedSymptom: "Onboarding could not assign SketchUp after account create",
    impactDescription: "Contractor blocked from design tools for one day",
    severity: "high",
    ownerStaffUserId: input.actorStaffUserId,
    tags: ["onboarding", "license"],
    providerError: "LicenseAssignmentFailed",
    affected: [
      { resourceType: "person", resourceId: alexId, label: "Alex Rivera" },
      { resourceType: "product", resourceId: productId, label: "SketchUp Pro" }
    ]
  });
  await client.query(
    `UPDATE incidents SET
      status = 'resolved',
      resolution_summary = $2,
      resolution_kind = 'confirmed_cause',
      resolved_at = NOW() - INTERVAL '14 days',
      version = version + 1
     WHERE id = $1`,
    [incident.id, "SKU pool exhausted; purchased seat then retried assignLicense successfully"]
  );
  await createInvestigationEntry(client, {
    organizationId: input.organizationId,
    companyId: input.harborCompanyId,
    incidentId: incident.id,
    entryKind: "result",
    body: "Confirmed cause: purchasedQuantity exhausted. Retry after capacity increase succeeded.",
    authorStaffUserId: input.actorStaffUserId,
    occurredAt: "2026-09-16T18:00:00.000Z",
    timePrecision: "exact"
  });
  return { alexId, caseyId, licenseIncidentId: incident.id };
}
var init_seed_demo_clone = __esm({
  "packages/db/src/seed-demo-clone.ts"() {
    "use strict";
    init_incidents();
  }
});

// packages/db/src/seed-data.ts
import { randomUUID as randomUUID4 } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
async function ensureStaffUser(client, input) {
  const existing = await client.query(`SELECT id FROM "user" WHERE email = $1`, [
    input.email
  ]);
  if (existing.rows[0]) {
    return existing.rows[0].id;
  }
  const userId = randomUUID4();
  const now = /* @__PURE__ */ new Date();
  await client.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,TRUE,$4,$4)`,
    [userId, input.name, input.email, now]
  );
  const password = await hashPassword(input.password);
  await client.query(
    `INSERT INTO account (
      id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
    ) VALUES ($1,$2,'credential',$3,$4,$5,$5)`,
    [randomUUID4(), userId, userId, password, now]
  );
  return userId;
}
async function seedPrivateDevelopment(pool, staffPassword) {
  await withTransaction(pool, async (client) => {
    await client.query(
      `INSERT INTO organizations (id, name, deployment_environment, is_seed_source)
       VALUES ($1, 'Northstar IT \u2014 Demo', 'demo', TRUE)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_seed_source = TRUE`,
      [SEED_ORGANIZATION_ID]
    );
    for (const company of SEED_COMPANIES) {
      await client.query(
        `INSERT INTO companies (
          id, organization_id, name, slug, domains, it_contact_name, it_contact_email, it_notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          domains = EXCLUDED.domains,
          it_contact_name = EXCLUDED.it_contact_name,
          it_contact_email = EXCLUDED.it_contact_email`,
        [
          company.id,
          SEED_ORGANIZATION_ID,
          company.name,
          company.slug,
          company.domains,
          company.itContactName,
          company.itContactEmail,
          company.itNotes
        ]
      );
    }
    const adminId = await ensureStaffUser(client, {
      email: SEED_STAFF.admin.email,
      name: SEED_STAFF.admin.name,
      password: staffPassword
    });
    const technicianId = await ensureStaffUser(client, {
      email: SEED_STAFF.technician.email,
      name: SEED_STAFF.technician.name,
      password: staffPassword
    });
    const viewerId = await ensureStaffUser(client, {
      email: SEED_STAFF.viewer.email,
      name: SEED_STAFF.viewer.name,
      password: staffPassword
    });
    await client.query(
      `INSERT INTO organization_memberships (organization_id, staff_user_id, role, active, automation_execute)
       VALUES ($1,$2,'admin',TRUE,TRUE)
       ON CONFLICT (organization_id, staff_user_id) DO UPDATE SET role = 'admin', active = TRUE, automation_execute = TRUE`,
      [SEED_ORGANIZATION_ID, adminId]
    );
    await client.query(
      `INSERT INTO organization_memberships (organization_id, staff_user_id, role, active, automation_execute)
       VALUES ($1,$2,'technician',TRUE,FALSE)
       ON CONFLICT (organization_id, staff_user_id) DO UPDATE SET role = 'technician', active = TRUE`,
      [SEED_ORGANIZATION_ID, technicianId]
    );
    await client.query(
      `INSERT INTO organization_memberships (organization_id, staff_user_id, role, active, automation_execute)
       VALUES ($1,$2,'viewer',TRUE,FALSE)
       ON CONFLICT (organization_id, staff_user_id) DO UPDATE SET role = 'viewer', active = TRUE`,
      [SEED_ORGANIZATION_ID, viewerId]
    );
    await client.query(`DELETE FROM company_grants WHERE staff_user_id = ANY($1::text[])`, [
      [technicianId, viewerId]
    ]);
    await client.query(
      `INSERT INTO company_grants (organization_id, company_id, staff_user_id)
       VALUES ($1,$2,$3), ($1,$4,$3), ($1,$2,$5)`,
      [
        SEED_ORGANIZATION_ID,
        SEED_COMPANIES[0].id,
        technicianId,
        SEED_COMPANIES[1].id,
        viewerId
      ]
    );
    await client.query(
      `INSERT INTO audit_events (organization_id, actor_staff_user_id, action, target_type, target_id, summary)
       VALUES ($1,$2,'seed.applied','organization',$3,'Applied deterministic Northstar development seed')`,
      [SEED_ORGANIZATION_ID, adminId, SEED_ORGANIZATION_ID]
    );
    await seedInventory(client);
    await seedLifecycle(client);
    await seedIncidents(client, adminId);
  });
}
async function cloneDemoWorkspace(client, input) {
  const organizationId = randomUUID4();
  const visitorId = randomUUID4().slice(0, 8);
  const email = `demo-${visitorId}@visitor.example`;
  const staffUserId = await ensureStaffUser(client, {
    email,
    name: "Demo Technician",
    password: input.staffPassword
  });
  await client.query(
    `INSERT INTO organizations (id, name, deployment_environment, is_seed_source)
     VALUES ($1, 'Northstar IT \u2014 Demo', 'demo', FALSE)`,
    [organizationId]
  );
  const companyIdsBySlug = {};
  for (const company of SEED_COMPANIES) {
    const companyId = randomUUID4();
    companyIdsBySlug[company.slug] = companyId;
    await client.query(
      `INSERT INTO companies (
        id, organization_id, name, slug, domains, it_contact_name, it_contact_email, it_notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        companyId,
        organizationId,
        company.name,
        company.slug,
        company.domains,
        company.itContactName,
        company.itContactEmail,
        company.itNotes
      ]
    );
    if (company.slug !== "summit-systems") {
      await client.query(
        `INSERT INTO company_grants (organization_id, company_id, staff_user_id)
         VALUES ($1,$2,$3)`,
        [organizationId, companyId, staffUserId]
      );
    }
  }
  await client.query(
    `INSERT INTO organization_memberships (organization_id, staff_user_id, role, active, automation_execute)
     VALUES ($1,$2,'technician',TRUE,FALSE)`,
    [organizationId, staffUserId]
  );
  const harborCompanyId = companyIdsBySlug["harbor-architecture"];
  if (harborCompanyId) {
    await seedVisitorDemoStory(client, {
      organizationId,
      harborCompanyId,
      actorStaffUserId: staffUserId
    });
  }
  await client.query(
    `INSERT INTO demo_workspaces (organization_id, source_organization_id, staff_user_id, expires_at)
     VALUES ($1,$2,$3,$4)`,
    [organizationId, SEED_ORGANIZATION_ID, staffUserId, input.expiresAt]
  );
  await client.query(
    `INSERT INTO audit_events (organization_id, actor_staff_user_id, action, target_type, target_id, summary)
     VALUES ($1,$2,'demo.workspace.created','organization',$3,'Created isolated synthetic demo workspace')`,
    [organizationId, staffUserId, organizationId]
  );
  return { organizationId, staffUserId, email };
}
var init_seed_data = __esm({
  "packages/db/src/seed-data.ts"() {
    "use strict";
    init_src();
    init_pool();
    init_seed_inventory();
    init_seed_incidents();
    init_seed_lifecycle();
    init_seed_demo_clone();
  }
});

// packages/db/src/queries.ts
async function getOrganization(client, id) {
  const result = await client.query("SELECT * FROM organizations WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}
async function listCompaniesForOrganization(client, organizationId) {
  const result = await client.query(
    "SELECT * FROM companies WHERE organization_id = $1 ORDER BY name ASC",
    [organizationId]
  );
  return result.rows;
}
async function getCompany(client, organizationId, companyId) {
  const result = await client.query(
    "SELECT * FROM companies WHERE organization_id = $1 AND id = $2",
    [organizationId, companyId]
  );
  return result.rows[0] ?? null;
}
async function updateCompanyNotes(client, input) {
  const result = await client.query(
    `UPDATE companies
     SET it_notes = $1, updated_at = NOW(), version = version + 1
     WHERE organization_id = $2 AND id = $3 AND version = $4
     RETURNING *`,
    [input.itNotes, input.organizationId, input.companyId, input.version]
  );
  return result.rows[0] ?? null;
}
async function getMembership(client, staffUserId) {
  const result = await client.query(
    `SELECT organization_id, staff_user_id, role, active, automation_execute
     FROM organization_memberships
     WHERE staff_user_id = $1 AND active = TRUE
     LIMIT 1`,
    [staffUserId]
  );
  return result.rows[0] ?? null;
}
async function listCompanyGrantIds(client, organizationId, staffUserId) {
  const result = await client.query(
    `SELECT company_id
     FROM company_grants
     WHERE organization_id = $1 AND staff_user_id = $2`,
    [organizationId, staffUserId]
  );
  return result.rows.map((row) => row.company_id);
}
async function insertAuditEvent(client, event) {
  await client.query(
    `INSERT INTO audit_events (
      organization_id, company_id, actor_staff_user_id, action, target_type, target_id,
      summary, before_summary, after_summary, correlation_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      event.organizationId,
      event.companyId ?? null,
      event.actorStaffUserId ?? null,
      event.action,
      event.targetType,
      event.targetId,
      event.summary,
      event.beforeSummary ?? null,
      event.afterSummary ?? null,
      event.correlationId ?? null
    ]
  );
}
async function getFileObject(client, organizationId, fileId) {
  const result = await client.query(
    `SELECT id, organization_id, company_id, original_filename
     FROM file_objects
     WHERE organization_id = $1 AND id = $2`,
    [organizationId, fileId]
  );
  return result.rows[0] ?? null;
}
async function countDemoCreatesSince(client, since) {
  const result = await client.query(
    "SELECT COUNT(*)::text AS count FROM demo_workspaces WHERE created_at >= $1",
    [since]
  );
  return Number(result.rows[0]?.count ?? 0);
}
var init_queries = __esm({
  "packages/db/src/queries.ts"() {
    "use strict";
  }
});

// packages/db/src/inventory.ts
import { randomUUID as randomUUID5 } from "node:crypto";
function asDateString2(value) {
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}
function asIso(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}
function numericToString(value) {
  if (value == null) return null;
  return String(value);
}
async function insertTimelineEvent(client, event) {
  const result = await client.query(
    `INSERT INTO timeline_events (
      organization_id, company_id, entity_type, entity_id, event_kind,
      actor_staff_user_id, effective_at, observed_at, source, summary
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz, NOW()),$9,$10)
    RETURNING *`,
    [
      event.organizationId,
      event.companyId ?? null,
      event.entityType,
      event.entityId,
      event.eventKind,
      event.actorStaffUserId ?? null,
      event.effectiveAt ?? null,
      event.observedAt ?? null,
      event.source,
      event.summary
    ]
  );
  return result.rows[0];
}
async function listTimelineForEntity(client, organizationId, entityType, entityId) {
  const result = await client.query(
    `SELECT * FROM timeline_events
     WHERE organization_id = $1 AND entity_type = $2 AND entity_id = $3
     ORDER BY recorded_at DESC`,
    [organizationId, entityType, entityId]
  );
  return result.rows;
}
async function listPeople(client, input) {
  const params = [input.organizationId, input.companyId];
  const clauses = ["organization_id = $1", "company_id = $2"];
  if (!input.includeArchived) {
    clauses.push("archived_at IS NULL");
  }
  if (input.itStatus) {
    params.push(input.itStatus);
    clauses.push(`it_status = $${params.length}`);
  }
  if (input.q?.trim()) {
    params.push(`%${input.q.trim().toLowerCase()}%`);
    clauses.push(
      `(lower(display_name) LIKE $${params.length} OR lower(work_email) LIKE $${params.length})`
    );
  }
  const result = await client.query(
    `SELECT * FROM people WHERE ${clauses.join(" AND ")} ORDER BY display_name ASC`,
    params
  );
  return result.rows;
}
async function getPerson(client, organizationId, companyId, personId) {
  const result = await client.query(
    `SELECT * FROM people WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, personId]
  );
  return result.rows[0] ?? null;
}
async function createPerson(client, input) {
  const id = input.id ?? randomUUID5();
  const result = await client.query(
    `INSERT INTO people (
      id, organization_id, company_id, display_name, work_email, role_title, department,
      sponsor, it_status, start_date, end_date, workflow_badge
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.displayName,
      input.workEmail,
      input.roleTitle ?? null,
      input.department ?? null,
      input.sponsor ?? null,
      input.itStatus ?? "planned",
      input.startDate ?? null,
      input.endDate ?? null,
      input.workflowBadge ?? null
    ]
  );
  return result.rows[0];
}
async function updatePerson(client, input) {
  const existing = await getPerson(client, input.organizationId, input.companyId, input.personId);
  if (!existing) return null;
  if (existing.version !== input.version) return null;
  const result = await client.query(
    `UPDATE people SET
      display_name = COALESCE($1, display_name),
      work_email = COALESCE($2, work_email),
      role_title = CASE WHEN $3::boolean THEN $4 ELSE role_title END,
      department = CASE WHEN $5::boolean THEN $6 ELSE department END,
      sponsor = CASE WHEN $7::boolean THEN $8 ELSE sponsor END,
      it_status = COALESCE($9, it_status),
      start_date = CASE WHEN $10::boolean THEN $11::date ELSE start_date END,
      end_date = CASE WHEN $12::boolean THEN $13::date ELSE end_date END,
      workflow_badge = CASE WHEN $14::boolean THEN $15 ELSE workflow_badge END,
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $16 AND company_id = $17 AND id = $18 AND version = $19
     RETURNING *`,
    [
      input.displayName ?? null,
      input.workEmail ?? null,
      input.roleTitle !== void 0,
      input.roleTitle ?? null,
      input.department !== void 0,
      input.department ?? null,
      input.sponsor !== void 0,
      input.sponsor ?? null,
      input.itStatus ?? null,
      input.startDate !== void 0,
      input.startDate ?? null,
      input.endDate !== void 0,
      input.endDate ?? null,
      input.workflowBadge !== void 0,
      input.workflowBadge ?? null,
      input.organizationId,
      input.companyId,
      input.personId,
      input.version
    ]
  );
  return result.rows[0] ?? null;
}
async function archivePerson(client, input) {
  const readiness = await getArchiveReadiness(
    client,
    input.organizationId,
    input.companyId,
    input.personId
  );
  if (!readiness.ready) {
    throw new UnprocessableError("Person is not ready to archive", "archive_not_ready");
  }
  const result = await client.query(
    `UPDATE people
     SET archived_at = NOW(), updated_at = NOW(), version = version + 1
     WHERE organization_id = $1 AND company_id = $2 AND id = $3 AND archived_at IS NULL
     RETURNING *`,
    [input.organizationId, input.companyId, input.personId]
  );
  const person = result.rows[0];
  if (!person) {
    throw new ConflictError("Person could not be archived");
  }
  await insertTimelineEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    entityType: "person",
    entityId: person.id,
    eventKind: "person.archived",
    actorStaffUserId: input.actorStaffUserId,
    source: "manual",
    summary: `Archived ${person.display_name}`
  });
  return { person, readiness };
}
async function listAccounts(client, organizationId, companyId, filters) {
  const params = [organizationId, companyId];
  let sql = `SELECT * FROM accounts WHERE organization_id = $1 AND company_id = $2`;
  if (filters?.personId) {
    params.push(filters.personId);
    sql += ` AND person_id = $${params.length}`;
  }
  sql += ` ORDER BY login_name ASC`;
  const result = await client.query(sql, params);
  return result.rows;
}
async function getAccount(client, organizationId, companyId, accountId) {
  const result = await client.query(
    `SELECT * FROM accounts WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, accountId]
  );
  return result.rows[0] ?? null;
}
async function createAccount(client, input) {
  if (input.personId) {
    const person = await getPerson(client, input.organizationId, input.companyId, input.personId);
    if (!person) throw new NotFoundError("Person not found in this company");
  }
  const id = input.id ?? randomUUID5();
  const result = await client.query(
    `INSERT INTO accounts (
      id, organization_id, company_id, person_id, provider_source, external_id,
      login_name, account_kind, enabled_state, freshness_note
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.personId ?? null,
      input.providerSource ?? "manual",
      input.externalId ?? null,
      input.loginName,
      input.accountKind ?? "human",
      input.enabledState ?? "enabled",
      input.freshnessNote ?? null
    ]
  );
  return result.rows[0];
}
async function updateAccount(client, input) {
  const result = await client.query(
    `UPDATE accounts SET
      login_name = COALESCE($1, login_name),
      account_kind = COALESCE($2, account_kind),
      external_id = CASE WHEN $3::boolean THEN $4 ELSE external_id END,
      enabled_state = COALESCE($5, enabled_state),
      freshness_note = CASE WHEN $6::boolean THEN $7 ELSE freshness_note END,
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $8 AND company_id = $9 AND id = $10 AND version = $11
     RETURNING *`,
    [
      input.loginName ?? null,
      input.accountKind ?? null,
      input.externalId !== void 0,
      input.externalId ?? null,
      input.enabledState ?? null,
      input.freshnessNote !== void 0,
      input.freshnessNote ?? null,
      input.organizationId,
      input.companyId,
      input.accountId,
      input.version
    ]
  );
  return result.rows[0] ?? null;
}
async function linkAccountToPerson(client, input) {
  const person = await getPerson(client, input.organizationId, input.companyId, input.personId);
  if (!person) throw new NotFoundError("Person not found in this company");
  const result = await client.query(
    `UPDATE accounts
     SET person_id = $1, updated_at = NOW(), version = version + 1
     WHERE organization_id = $2 AND company_id = $3 AND id = $4 AND version = $5
     RETURNING *`,
    [input.personId, input.organizationId, input.companyId, input.accountId, input.version]
  );
  const account = result.rows[0];
  if (!account) throw new ConflictError("Account changed since you loaded it");
  await insertTimelineEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    entityType: "account",
    entityId: account.id,
    eventKind: "account.linked",
    actorStaffUserId: input.actorStaffUserId,
    source: "manual",
    summary: `Linked account ${account.login_name} to person ${person.display_name}`
  });
  await insertAuditEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    actorStaffUserId: input.actorStaffUserId,
    action: "account.link",
    targetType: "account",
    targetId: account.id,
    summary: `Linked to person ${person.id}`
  });
  return account;
}
async function unlinkAccountFromPerson(client, input) {
  const existing = await getAccount(
    client,
    input.organizationId,
    input.companyId,
    input.accountId
  );
  if (!existing) throw new NotFoundError("Account not found");
  if (existing.version !== input.version) {
    throw new ConflictError("Account changed since you loaded it");
  }
  const personId = existing.person_id;
  let person = null;
  if (personId) {
    person = await getPerson(client, input.organizationId, input.companyId, personId);
  }
  const result = await client.query(
    `UPDATE accounts
     SET person_id = NULL, updated_at = NOW(), version = version + 1
     WHERE organization_id = $1 AND company_id = $2 AND id = $3 AND version = $4
     RETURNING *`,
    [input.organizationId, input.companyId, input.accountId, input.version]
  );
  const account = result.rows[0];
  if (!account) throw new ConflictError("Account changed since you loaded it");
  await insertTimelineEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    entityType: "account",
    entityId: account.id,
    eventKind: "account.unlinked",
    actorStaffUserId: input.actorStaffUserId,
    source: "manual",
    summary: `Unlinked account ${account.login_name}${person ? ` from ${person.display_name}` : ""}`
  });
  await insertAuditEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    actorStaffUserId: input.actorStaffUserId,
    action: "account.unlink",
    targetType: "account",
    targetId: account.id,
    summary: personId ? `Unlinked from person ${personId}` : "Unlinked",
    beforeSummary: personId,
    afterSummary: null
  });
  if (person && (person.it_status === "departed" || person.it_status === "active")) {
    const activeAssignments = await client.query(
      `SELECT id FROM license_assignments
       WHERE organization_id = $1 AND company_id = $2 AND account_id = $3
         AND status IN ('active', 'removal_pending')`,
      [input.organizationId, input.companyId, account.id]
    );
    for (const assignment of activeAssignments.rows) {
      await client.query(
        `INSERT INTO offboarding_obligations (
          id, organization_id, company_id, person_id, obligation_kind,
          target_type, target_id, status
        ) VALUES ($1,$2,$3,$4,'license_assignment','license_assignment',$5,'open')`,
        [randomUUID5(), input.organizationId, input.companyId, person.id, assignment.id]
      );
    }
    if (person.it_status === "departed" || activeAssignments.rows.length > 0) {
      await client.query(
        `INSERT INTO offboarding_obligations (
          id, organization_id, company_id, person_id, obligation_kind,
          target_type, target_id, status
        ) VALUES ($1,$2,$3,$4,'account_unlink','account',$5,'open')`,
        [randomUUID5(), input.organizationId, input.companyId, person.id, account.id]
      );
    }
  }
  return account;
}
async function listProducts(client, organizationId) {
  const result = await client.query(
    `SELECT * FROM products WHERE organization_id = $1 ORDER BY name ASC`,
    [organizationId]
  );
  return result.rows;
}
async function getProduct(client, organizationId, productId) {
  const result = await client.query(
    `SELECT * FROM products WHERE organization_id = $1 AND id = $2`,
    [organizationId, productId]
  );
  return result.rows[0] ?? null;
}
async function createProduct(client, input) {
  const id = input.id ?? randomUUID5();
  const result = await client.query(
    `INSERT INTO products (
      id, organization_id, name, vendor, category, assignment_model, documentation_url
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.name,
      input.vendor,
      input.category,
      input.assignmentModel,
      input.documentationUrl ?? null
    ]
  );
  return result.rows[0];
}
async function updateProduct(client, input) {
  const result = await client.query(
    `UPDATE products SET
      name = COALESCE($1, name),
      vendor = COALESCE($2, vendor),
      category = COALESCE($3, category),
      documentation_url = CASE WHEN $4::boolean THEN $5 ELSE documentation_url END,
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $6 AND id = $7 AND version = $8
     RETURNING *`,
    [
      input.name ?? null,
      input.vendor ?? null,
      input.category ?? null,
      input.documentationUrl !== void 0,
      input.documentationUrl ?? null,
      input.organizationId,
      input.productId,
      input.version
    ]
  );
  return result.rows[0] ?? null;
}
async function retireProduct(client, organizationId, productId, version) {
  const result = await client.query(
    `UPDATE products
     SET retired_at = NOW(), updated_at = NOW(), version = version + 1
     WHERE organization_id = $1 AND id = $2 AND version = $3 AND retired_at IS NULL
     RETURNING *`,
    [organizationId, productId, version]
  );
  return result.rows[0] ?? null;
}
async function listSubscriptions(client, organizationId, companyId) {
  const result = await client.query(
    `SELECT * FROM subscriptions
     WHERE organization_id = $1 AND company_id = $2
     ORDER BY created_at DESC`,
    [organizationId, companyId]
  );
  return result.rows;
}
async function getSubscription(client, organizationId, companyId, subscriptionId) {
  const result = await client.query(
    `SELECT * FROM subscriptions
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, subscriptionId]
  );
  return result.rows[0] ?? null;
}
async function createSubscription(client, input) {
  const product = await getProduct(client, input.organizationId, input.productId);
  if (!product) throw new NotFoundError("Product not found");
  if (product.retired_at) {
    throw new UnprocessableError("Cannot create subscription for retired product", "product_retired");
  }
  const id = input.id ?? randomUUID5();
  const result = await client.query(
    `INSERT INTO subscriptions (
      id, organization_id, company_id, product_id, supplier, external_reference,
      purchased_quantity, currency, payer, billing_cadence,
      commitment_start, commitment_end, renewal_date, state
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.productId,
      input.supplier ?? null,
      input.externalReference ?? null,
      input.purchasedQuantity,
      input.currency,
      input.payer,
      input.billingCadence,
      input.commitmentStart ?? null,
      input.commitmentEnd ?? null,
      input.renewalDate ?? null,
      input.state ?? "active"
    ]
  );
  return result.rows[0];
}
async function updateSubscription(client, input) {
  const result = await client.query(
    `UPDATE subscriptions SET
      supplier = CASE WHEN $1::boolean THEN $2 ELSE supplier END,
      external_reference = CASE WHEN $3::boolean THEN $4 ELSE external_reference END,
      purchased_quantity = COALESCE($5, purchased_quantity),
      payer = COALESCE($6, payer),
      billing_cadence = COALESCE($7, billing_cadence),
      commitment_start = CASE WHEN $8::boolean THEN $9::date ELSE commitment_start END,
      commitment_end = CASE WHEN $10::boolean THEN $11::date ELSE commitment_end END,
      renewal_date = CASE WHEN $12::boolean THEN $13::date ELSE renewal_date END,
      state = COALESCE($14, state),
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $15 AND company_id = $16 AND id = $17 AND version = $18
     RETURNING *`,
    [
      input.supplier !== void 0,
      input.supplier ?? null,
      input.externalReference !== void 0,
      input.externalReference ?? null,
      input.purchasedQuantity ?? null,
      input.payer ?? null,
      input.billingCadence ?? null,
      input.commitmentStart !== void 0,
      input.commitmentStart ?? null,
      input.commitmentEnd !== void 0,
      input.commitmentEnd ?? null,
      input.renewalDate !== void 0,
      input.renewalDate ?? null,
      input.state ?? null,
      input.organizationId,
      input.companyId,
      input.subscriptionId,
      input.version
    ]
  );
  return result.rows[0] ?? null;
}
async function listPriceVersions(client, organizationId, companyId, subscriptionId) {
  const result = await client.query(
    `SELECT * FROM subscription_price_versions
     WHERE organization_id = $1 AND company_id = $2 AND subscription_id = $3
     ORDER BY effective_from DESC, created_at DESC`,
    [organizationId, companyId, subscriptionId]
  );
  return result.rows;
}
async function appendPriceVersion(client, input) {
  const subscription = await getSubscription(
    client,
    input.organizationId,
    input.companyId,
    input.subscriptionId
  );
  if (!subscription) throw new NotFoundError("Subscription not found");
  await client.query(
    `UPDATE subscription_price_versions
     SET effective_to = ($4::date - INTERVAL '1 day')::date
     WHERE organization_id = $1 AND company_id = $2 AND subscription_id = $3
       AND effective_to IS NULL
       AND effective_from < $4::date`,
    [input.organizationId, input.companyId, input.subscriptionId, input.effectiveFrom]
  );
  const id = input.id ?? randomUUID5();
  const result = await client.query(
    `INSERT INTO subscription_price_versions (
      id, organization_id, company_id, subscription_id, effective_from, effective_to,
      unit_price, price_kind, cadence, source
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.subscriptionId,
      input.effectiveFrom,
      input.effectiveTo ?? null,
      input.unitPrice,
      input.priceKind,
      input.cadence,
      input.source
    ]
  );
  return result.rows[0];
}
async function listLicenseAssignments(client, organizationId, companyId, filters) {
  const params = [organizationId, companyId];
  const clauses = ["organization_id = $1", "company_id = $2"];
  if (filters?.personId) {
    params.push(filters.personId);
    clauses.push(`person_id = $${params.length}`);
  }
  if (filters?.subscriptionId) {
    params.push(filters.subscriptionId);
    clauses.push(`subscription_id = $${params.length}`);
  }
  if (filters?.productId) {
    params.push(filters.productId);
    clauses.push(`product_id = $${params.length}`);
  }
  const result = await client.query(
    `SELECT * FROM license_assignments WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC`,
    params
  );
  return result.rows;
}
async function getLicenseAssignment(client, organizationId, companyId, assignmentId) {
  const result = await client.query(
    `SELECT * FROM license_assignments
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, assignmentId]
  );
  return result.rows[0] ?? null;
}
async function assertSameCompanyRefs(client, organizationId, companyId, refs) {
  if (refs.personId) {
    const person = await getPerson(client, organizationId, companyId, refs.personId);
    if (!person) throw new NotFoundError("Person not found in this company");
  }
  if (refs.accountId) {
    const account = await getAccount(client, organizationId, companyId, refs.accountId);
    if (!account) throw new NotFoundError("Account not found in this company");
  }
}
async function assignLicense(client, input) {
  if (!input.personId && !input.accountId) {
    throw new UnprocessableError("personId or accountId is required");
  }
  await assertSameCompanyRefs(client, input.organizationId, input.companyId, input);
  const product = await getProduct(client, input.organizationId, input.productId);
  if (!product) throw new NotFoundError("Product not found");
  if (product.assignment_model !== "named_user") {
    throw new UnprocessableError(
      "Only named_user products create person/account license assignments",
      "assignment_model"
    );
  }
  if (product.retired_at) {
    throw new UnprocessableError("Cannot assign retired product", "product_retired");
  }
  if (input.subscriptionId) {
    const locked = await client.query(
      `SELECT * FROM subscriptions
       WHERE organization_id = $1 AND company_id = $2 AND id = $3
       FOR UPDATE`,
      [input.organizationId, input.companyId, input.subscriptionId]
    );
    const subscription = locked.rows[0];
    if (!subscription) throw new NotFoundError("Subscription not found in this company");
    if (subscription.product_id !== input.productId) {
      throw new UnprocessableError("Subscription product mismatch");
    }
    const countResult = await client.query(
      `SELECT COUNT(*)::text AS count FROM license_assignments
       WHERE organization_id = $1 AND company_id = $2 AND subscription_id = $3
         AND status IN ('active', 'removal_pending')`,
      [input.organizationId, input.companyId, input.subscriptionId]
    );
    const consumed = Number(countResult.rows[0]?.count ?? 0);
    const capacity = checkNamedSeatCapacity({
      purchasedQuantity: subscription.purchased_quantity,
      consumedQuantity: consumed,
      requestedQuantity: 1
    });
    if (!capacity.ok) {
      throw new ConflictError(
        `Insufficient named seats: ${capacity.available} available, ${capacity.requested} requested`
      );
    }
  }
  const id = input.id ?? randomUUID5();
  const result = await client.query(
    `INSERT INTO license_assignments (
      id, organization_id, company_id, person_id, account_id, product_id,
      subscription_id, pool_id, status, start_effective_date, date_provenance, source
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,$11)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.personId ?? null,
      input.accountId ?? null,
      input.productId,
      input.subscriptionId ?? null,
      input.poolId ?? null,
      input.startEffectiveDate ?? null,
      input.dateProvenance ?? null,
      input.source ?? "manual"
    ]
  );
  const assignment = result.rows[0];
  await insertTimelineEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    entityType: "license_assignment",
    entityId: assignment.id,
    eventKind: "license.assigned",
    actorStaffUserId: input.actorStaffUserId,
    effectiveAt: input.startEffectiveDate ?? null,
    source: input.source ?? "manual",
    summary: "License assignment created"
  });
  return assignment;
}
async function endLicenseAssignment(client, input) {
  const result = await client.query(
    `UPDATE license_assignments SET
      status = $1,
      end_effective_date = COALESCE($2::date, end_effective_date, CURRENT_DATE),
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $3 AND company_id = $4 AND id = $5 AND version = $6
       AND status IN ('active', 'removal_pending')
     RETURNING *`,
    [
      input.status ?? "ended",
      input.endEffectiveDate ?? null,
      input.organizationId,
      input.companyId,
      input.assignmentId,
      input.version
    ]
  );
  const assignment = result.rows[0];
  if (!assignment) throw new ConflictError("Assignment could not be ended (version or status)");
  await insertTimelineEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    entityType: "license_assignment",
    entityId: assignment.id,
    eventKind: input.status === "removal_pending" ? "license.removal_pending" : "license.ended",
    actorStaffUserId: input.actorStaffUserId,
    effectiveAt: asDateString2(assignment.end_effective_date),
    source: "manual",
    summary: `License assignment set to ${assignment.status}`
  });
  return assignment;
}
async function reassignLicense(client, input) {
  if (!input.toPersonId && !input.toAccountId) {
    throw new UnprocessableError("toPersonId or toAccountId is required");
  }
  await assertSameCompanyRefs(client, input.organizationId, input.companyId, {
    personId: input.toPersonId,
    accountId: input.toAccountId
  });
  const existing = await getLicenseAssignment(
    client,
    input.organizationId,
    input.companyId,
    input.assignmentId
  );
  if (!existing) throw new NotFoundError("Assignment not found");
  if (existing.version !== input.version) {
    throw new ConflictError("Assignment changed since you loaded it");
  }
  if (existing.status === "ended") {
    throw new UnprocessableError("Cannot reassign an ended assignment");
  }
  if (existing.subscription_id) {
    await client.query(
      `SELECT id FROM subscriptions
       WHERE organization_id = $1 AND company_id = $2 AND id = $3
       FOR UPDATE`,
      [input.organizationId, input.companyId, existing.subscription_id]
    );
  }
  const ended = await endLicenseAssignment(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    assignmentId: input.assignmentId,
    version: input.version,
    endEffectiveDate: input.endEffectiveDate,
    status: "ended",
    actorStaffUserId: input.actorStaffUserId
  });
  const created = await assignLicense(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    personId: input.toPersonId,
    accountId: input.toAccountId,
    productId: existing.product_id,
    subscriptionId: existing.subscription_id,
    poolId: existing.pool_id,
    startEffectiveDate: input.startEffectiveDate,
    dateProvenance: input.dateProvenance ?? "reassignment",
    source: input.source ?? "manual",
    actorStaffUserId: input.actorStaffUserId
  });
  return { ended, created };
}
async function listGroups(client, organizationId, companyId) {
  const result = await client.query(
    `SELECT * FROM groups WHERE organization_id = $1 AND company_id = $2 ORDER BY display_name`,
    [organizationId, companyId]
  );
  return result.rows;
}
async function getGroup(client, organizationId, companyId, groupId) {
  const result = await client.query(
    `SELECT * FROM groups WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, groupId]
  );
  return result.rows[0] ?? null;
}
async function createGroup(client, input) {
  const id = input.id ?? randomUUID5();
  const result = await client.query(
    `INSERT INTO groups (
      id, organization_id, company_id, external_id, display_name, email_address,
      group_type, membership_capability, source
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.externalId ?? null,
      input.displayName,
      input.emailAddress ?? null,
      input.groupType,
      input.membershipCapability ?? "direct",
      input.source ?? "manual"
    ]
  );
  return result.rows[0];
}
async function updateGroup(client, input) {
  const result = await client.query(
    `UPDATE groups SET
      display_name = COALESCE($1, display_name),
      email_address = CASE WHEN $2::boolean THEN $3 ELSE email_address END,
      membership_capability = COALESCE($4, membership_capability),
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $5 AND company_id = $6 AND id = $7 AND version = $8
     RETURNING *`,
    [
      input.displayName ?? null,
      input.emailAddress !== void 0,
      input.emailAddress ?? null,
      input.membershipCapability ?? null,
      input.organizationId,
      input.companyId,
      input.groupId,
      input.version
    ]
  );
  return result.rows[0] ?? null;
}
async function listGroupMemberships(client, organizationId, companyId, groupId) {
  const result = await client.query(
    `SELECT * FROM group_memberships
     WHERE organization_id = $1 AND company_id = $2 AND group_id = $3
     ORDER BY created_at DESC`,
    [organizationId, companyId, groupId]
  );
  return result.rows;
}
async function createGroupMembership(client, input) {
  const group = await getGroup(client, input.organizationId, input.companyId, input.groupId);
  if (!group) throw new NotFoundError("Group not found");
  const account = await getAccount(client, input.organizationId, input.companyId, input.accountId);
  if (!account) throw new NotFoundError("Account not found in this company");
  const id = input.id ?? randomUUID5();
  const result = await client.query(
    `INSERT INTO group_memberships (
      id, organization_id, company_id, group_id, account_id, membership_kind,
      start_date, verification_source, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active')
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.groupId,
      input.accountId,
      input.membershipKind ?? "direct",
      input.startDate ?? null,
      input.verificationSource ?? null
    ]
  );
  return result.rows[0];
}
async function endGroupMembership(client, organizationId, companyId, membershipId, endDate) {
  const result = await client.query(
    `UPDATE group_memberships
     SET status = 'ended', end_date = COALESCE($4::date, CURRENT_DATE), updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND id = $3 AND status = 'active'
     RETURNING *`,
    [organizationId, companyId, membershipId, endDate ?? null]
  );
  return result.rows[0] ?? null;
}
async function listMailboxes(client, organizationId, companyId) {
  const result = await client.query(
    `SELECT * FROM shared_mailboxes
     WHERE organization_id = $1 AND company_id = $2 ORDER BY address`,
    [organizationId, companyId]
  );
  return result.rows;
}
async function getMailbox(client, organizationId, companyId, mailboxId) {
  const result = await client.query(
    `SELECT * FROM shared_mailboxes
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, mailboxId]
  );
  return result.rows[0] ?? null;
}
async function createMailbox(client, input) {
  if (input.ownerPersonId) {
    const person = await getPerson(
      client,
      input.organizationId,
      input.companyId,
      input.ownerPersonId
    );
    if (!person) throw new NotFoundError("Owner person not found in this company");
  }
  const id = input.id ?? randomUUID5();
  const result = await client.query(
    `INSERT INTO shared_mailboxes (
      id, organization_id, company_id, address, source, state, owner_person_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.address,
      input.source ?? "manual",
      input.state ?? "active",
      input.ownerPersonId ?? null
    ]
  );
  return result.rows[0];
}
async function updateMailbox(client, input) {
  if (input.ownerPersonId) {
    const person = await getPerson(
      client,
      input.organizationId,
      input.companyId,
      input.ownerPersonId
    );
    if (!person) throw new NotFoundError("Owner person not found in this company");
  }
  const result = await client.query(
    `UPDATE shared_mailboxes SET
      state = COALESCE($1, state),
      owner_person_id = CASE WHEN $2::boolean THEN $3 ELSE owner_person_id END,
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $4 AND company_id = $5 AND id = $6 AND version = $7
     RETURNING *`,
    [
      input.state ?? null,
      input.ownerPersonId !== void 0,
      input.ownerPersonId ?? null,
      input.organizationId,
      input.companyId,
      input.mailboxId,
      input.version
    ]
  );
  return result.rows[0] ?? null;
}
async function listMailboxAccess(client, organizationId, companyId, mailboxId) {
  const result = await client.query(
    `SELECT * FROM mailbox_access
     WHERE organization_id = $1 AND company_id = $2 AND mailbox_id = $3
     ORDER BY created_at DESC`,
    [organizationId, companyId, mailboxId]
  );
  return result.rows;
}
async function createMailboxAccess(client, input) {
  const mailbox = await getMailbox(client, input.organizationId, input.companyId, input.mailboxId);
  if (!mailbox) throw new NotFoundError("Mailbox not found");
  const account = await getAccount(client, input.organizationId, input.companyId, input.accountId);
  if (!account) throw new NotFoundError("Account not found in this company");
  const id = input.id ?? randomUUID5();
  const result = await client.query(
    `INSERT INTO mailbox_access (
      id, organization_id, company_id, mailbox_id, account_id, permission_kind,
      start_date, source, verification_status, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active')
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.mailboxId,
      input.accountId,
      input.permissionKind,
      input.startDate ?? null,
      input.source ?? "manual",
      input.verificationStatus ?? null
    ]
  );
  return result.rows[0];
}
async function endMailboxAccess(client, organizationId, companyId, accessId, endDate) {
  const result = await client.query(
    `UPDATE mailbox_access
     SET status = 'ended', end_date = COALESCE($4::date, CURRENT_DATE), updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND id = $3 AND status = 'active'
     RETURNING *`,
    [organizationId, companyId, accessId, endDate ?? null]
  );
  return result.rows[0] ?? null;
}
async function listDevices(client, organizationId, companyId) {
  const result = await client.query(
    `SELECT * FROM devices WHERE organization_id = $1 AND company_id = $2 ORDER BY asset_tag NULLS LAST, hostname`,
    [organizationId, companyId]
  );
  return result.rows;
}
async function getDevice(client, organizationId, companyId, deviceId) {
  const result = await client.query(
    `SELECT * FROM devices WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, deviceId]
  );
  return result.rows[0] ?? null;
}
async function createDevice(client, input) {
  const id = input.id ?? randomUUID5();
  const result = await client.query(
    `INSERT INTO devices (
      id, organization_id, company_id, asset_tag, serial, device_type, hostname, model,
      state, source, cost, currency
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.assetTag ?? null,
      input.serial ?? null,
      input.deviceType,
      input.hostname ?? null,
      input.model ?? null,
      input.state ?? "available",
      input.source ?? "manual",
      input.cost ?? null,
      input.currency ?? null
    ]
  );
  return result.rows[0];
}
async function updateDevice(client, input) {
  const result = await client.query(
    `UPDATE devices SET
      asset_tag = CASE WHEN $1::boolean THEN $2 ELSE asset_tag END,
      serial = CASE WHEN $3::boolean THEN $4 ELSE serial END,
      device_type = COALESCE($5, device_type),
      hostname = CASE WHEN $6::boolean THEN $7 ELSE hostname END,
      model = CASE WHEN $8::boolean THEN $9 ELSE model END,
      state = COALESCE($10, state),
      cost = CASE WHEN $11::boolean THEN $12 ELSE cost END,
      currency = CASE WHEN $13::boolean THEN $14 ELSE currency END,
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $15 AND company_id = $16 AND id = $17 AND version = $18
     RETURNING *`,
    [
      input.assetTag !== void 0,
      input.assetTag ?? null,
      input.serial !== void 0,
      input.serial ?? null,
      input.deviceType ?? null,
      input.hostname !== void 0,
      input.hostname ?? null,
      input.model !== void 0,
      input.model ?? null,
      input.state ?? null,
      input.cost !== void 0,
      input.cost ?? null,
      input.currency !== void 0,
      input.currency ?? null,
      input.organizationId,
      input.companyId,
      input.deviceId,
      input.version
    ]
  );
  return result.rows[0] ?? null;
}
async function listDeviceAssignments(client, organizationId, companyId, deviceId) {
  const result = await client.query(
    `SELECT * FROM device_assignments
     WHERE organization_id = $1 AND company_id = $2 AND device_id = $3
     ORDER BY issued_at DESC`,
    [organizationId, companyId, deviceId]
  );
  return result.rows;
}
async function assignDevice(client, input) {
  const device = await getDevice(client, input.organizationId, input.companyId, input.deviceId);
  if (!device) throw new NotFoundError("Device not found");
  const person = await getPerson(client, input.organizationId, input.companyId, input.personId);
  if (!person) throw new NotFoundError("Person not found in this company");
  await client.query(
    `UPDATE device_assignments
     SET status = 'historical',
         returned_at = COALESCE(returned_at, NOW()),
         updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND device_id = $3 AND status = 'current'`,
    [input.organizationId, input.companyId, input.deviceId]
  );
  const id = input.id ?? randomUUID5();
  const result = await client.query(
    `INSERT INTO device_assignments (
      id, organization_id, company_id, device_id, person_id, issued_at,
      custody_disposition, evidence_note, status
    ) VALUES ($1,$2,$3,$4,$5,COALESCE($6::timestamptz, NOW()),$7,$8,'current')
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.deviceId,
      input.personId,
      input.issuedAt ?? null,
      input.custodyDisposition ?? null,
      input.evidenceNote ?? null
    ]
  );
  await client.query(
    `UPDATE devices SET state = 'assigned', updated_at = NOW(), version = version + 1
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [input.organizationId, input.companyId, input.deviceId]
  );
  return result.rows[0];
}
async function returnDeviceAssignment(client, input) {
  const result = await client.query(
    `UPDATE device_assignments SET
      status = 'historical',
      returned_at = NOW(),
      custody_disposition = COALESCE($4, custody_disposition),
      evidence_note = COALESCE($5, evidence_note),
      updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND id = $3 AND status = 'current'
     RETURNING *`,
    [
      input.organizationId,
      input.companyId,
      input.assignmentId,
      input.custodyDisposition ?? null,
      input.evidenceNote ?? null
    ]
  );
  const assignment = result.rows[0];
  if (assignment) {
    await client.query(
      `UPDATE devices SET state = 'available', updated_at = NOW(), version = version + 1
       WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
      [input.organizationId, input.companyId, assignment.device_id]
    );
  }
  return assignment ?? null;
}
async function listWorkItems(client, organizationId, companyId) {
  const result = await client.query(
    `SELECT * FROM work_items
     WHERE organization_id = $1 AND company_id = $2
     ORDER BY created_at DESC`,
    [organizationId, companyId]
  );
  return result.rows;
}
async function getWorkItem(client, organizationId, companyId, workItemId) {
  const result = await client.query(
    `SELECT * FROM work_items WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, workItemId]
  );
  return result.rows[0] ?? null;
}
async function createWorkItem(client, input) {
  if (input.targetPersonId) {
    const person = await getPerson(
      client,
      input.organizationId,
      input.companyId,
      input.targetPersonId
    );
    if (!person) throw new NotFoundError("Target person not found in this company");
  }
  const id = input.id ?? randomUUID5();
  const result = await client.query(
    `INSERT INTO work_items (
      id, organization_id, company_id, type, target_person_id, owner_staff_user_id,
      status, due_date, title, description
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.type,
      input.targetPersonId ?? null,
      input.ownerStaffUserId ?? null,
      input.status ?? "open",
      input.dueDate ?? null,
      input.title,
      input.description ?? null
    ]
  );
  return result.rows[0];
}
async function updateWorkItem(client, input) {
  const result = await client.query(
    `UPDATE work_items SET
      title = COALESCE($1, title),
      description = CASE WHEN $2::boolean THEN $3 ELSE description END,
      status = COALESCE($4, status),
      due_date = CASE WHEN $5::boolean THEN $6::date ELSE due_date END,
      owner_staff_user_id = CASE WHEN $7::boolean THEN $8 ELSE owner_staff_user_id END,
      completion_evidence = CASE WHEN $9::boolean THEN $10 ELSE completion_evidence END,
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $11 AND company_id = $12 AND id = $13 AND version = $14
     RETURNING *`,
    [
      input.title ?? null,
      input.description !== void 0,
      input.description ?? null,
      input.status ?? null,
      input.dueDate !== void 0,
      input.dueDate ?? null,
      input.ownerStaffUserId !== void 0,
      input.ownerStaffUserId ?? null,
      input.completionEvidence !== void 0,
      input.completionEvidence ?? null,
      input.organizationId,
      input.companyId,
      input.workItemId,
      input.version
    ]
  );
  return result.rows[0] ?? null;
}
async function loadArchiveSnapshot(client, personId, organizationId, companyId) {
  const personResult = organizationId && companyId ? await client.query(
    `SELECT * FROM people WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, personId]
  ) : await client.query(`SELECT * FROM people WHERE id = $1`, [personId]);
  const person = personResult.rows[0];
  if (!person) return null;
  const orgId = person.organization_id;
  const coId = person.company_id;
  const [assignments, accounts, obligations, devices] = await Promise.all([
    client.query(
      `SELECT id, status FROM license_assignments
       WHERE organization_id = $1 AND company_id = $2 AND person_id = $3`,
      [orgId, coId, personId]
    ),
    client.query(
      `SELECT id, account_kind, enabled_state FROM accounts
       WHERE organization_id = $1 AND company_id = $2 AND person_id = $3`,
      [orgId, coId, personId]
    ),
    client.query(
      `SELECT id, obligation_kind, target_type, target_id, status
       FROM offboarding_obligations
       WHERE organization_id = $1 AND company_id = $2 AND person_id = $3`,
      [orgId, coId, personId]
    ),
    client.query(
      `SELECT id, status, custody_disposition FROM device_assignments
       WHERE organization_id = $1 AND company_id = $2 AND person_id = $3`,
      [orgId, coId, personId]
    )
  ]);
  const accountIds = accounts.rows.map((a) => a.id);
  const mailboxAccess = accountIds.length === 0 ? { rows: [] } : await client.query(
    `SELECT id, status FROM mailbox_access
           WHERE organization_id = $1 AND company_id = $2
             AND account_id = ANY($3::uuid[])`,
    [orgId, coId, accountIds]
  );
  return {
    person: {
      itStatus: person.it_status,
      archivedAt: person.archived_at
    },
    licenseAssignments: assignments.rows.map((row) => ({
      id: row.id,
      status: row.status
    })),
    mailboxAccess: mailboxAccess.rows.map((row) => ({
      id: row.id,
      status: row.status
    })),
    obligations: obligations.rows.map((row) => ({
      id: row.id,
      obligationKind: row.obligation_kind,
      targetType: row.target_type,
      targetId: row.target_id,
      status: row.status
    })),
    linkedAccounts: accounts.rows.map((row) => ({
      id: row.id,
      accountKind: row.account_kind,
      enabledState: row.enabled_state
    })),
    deviceAssignments: devices.rows.map((row) => ({
      id: row.id,
      status: row.status,
      custodyDisposition: row.custody_disposition
    }))
  };
}
async function getArchiveReadiness(client, organizationId, companyId, personId) {
  const snapshot = await loadArchiveSnapshot(client, personId, organizationId, companyId);
  if (!snapshot) throw new NotFoundError("Person not found");
  return evaluateArchiveReadiness(snapshot);
}
async function loadPersonProfile(client, organizationId, companyId, personId) {
  const person = await getPerson(client, organizationId, companyId, personId);
  if (!person) return null;
  const accounts = await listAccounts(client, organizationId, companyId, { personId });
  const assignmentResult = await client.query(
    `SELECT la.*, p.name AS product_name
     FROM license_assignments la
     LEFT JOIN products p ON p.organization_id = la.organization_id AND p.id = la.product_id
     WHERE la.organization_id = $1 AND la.company_id = $2 AND la.person_id = $3
     ORDER BY la.created_at DESC`,
    [organizationId, companyId, personId]
  );
  const groupResult = await client.query(
    `SELECT gm.*, g.display_name AS group_name, g.group_type
     FROM group_memberships gm
     JOIN groups g
       ON g.organization_id = gm.organization_id
      AND g.company_id = gm.company_id
      AND g.id = gm.group_id
     JOIN accounts a
       ON a.organization_id = gm.organization_id
      AND a.company_id = gm.company_id
      AND a.id = gm.account_id
     WHERE gm.organization_id = $1 AND gm.company_id = $2 AND a.person_id = $3
     ORDER BY gm.created_at DESC`,
    [organizationId, companyId, personId]
  );
  const mailboxResult = await client.query(
    `SELECT ma.*, sm.address AS mailbox_address
     FROM mailbox_access ma
     JOIN shared_mailboxes sm
       ON sm.organization_id = ma.organization_id
      AND sm.company_id = ma.company_id
      AND sm.id = ma.mailbox_id
     JOIN accounts a
       ON a.organization_id = ma.organization_id
      AND a.company_id = ma.company_id
      AND a.id = ma.account_id
     WHERE ma.organization_id = $1 AND ma.company_id = $2 AND a.person_id = $3
     ORDER BY ma.created_at DESC`,
    [organizationId, companyId, personId]
  );
  const deviceResult = await client.query(
    `SELECT * FROM device_assignments
     WHERE organization_id = $1 AND company_id = $2 AND person_id = $3
     ORDER BY issued_at DESC`,
    [organizationId, companyId, personId]
  );
  const workResult = await client.query(
    `SELECT * FROM work_items
     WHERE organization_id = $1 AND company_id = $2 AND target_person_id = $3
     ORDER BY created_at DESC`,
    [organizationId, companyId, personId]
  );
  const timeline = await listTimelineForEntity(client, organizationId, "person", personId);
  const costs = await personCostSummary(client, organizationId, companyId, personId);
  const devices = [];
  for (const row of deviceResult.rows) {
    const device = await getDevice(client, organizationId, companyId, row.device_id);
    devices.push({ ...row, device });
  }
  return {
    person,
    accounts,
    assignments: assignmentResult.rows,
    groupMemberships: groupResult.rows,
    mailboxAccess: mailboxResult.rows,
    devices,
    workItems: workResult.rows,
    timeline,
    costs
  };
}
async function companyCostSummary(client, organizationId, companyId) {
  const result = await client.query(
    `SELECT s.currency, pv.unit_price, s.purchased_quantity
     FROM subscriptions s
     LEFT JOIN LATERAL (
       SELECT unit_price
       FROM subscription_price_versions
       WHERE organization_id = s.organization_id
         AND company_id = s.company_id
         AND subscription_id = s.id
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
       ORDER BY effective_from DESC
       LIMIT 1
     ) pv ON TRUE
     WHERE s.organization_id = $1 AND s.company_id = $2 AND s.state = 'active'`,
    [organizationId, companyId]
  );
  const amounts = result.rows.map((row) => ({
    amount: row.unit_price == null ? null : Number(row.unit_price) * row.purchased_quantity,
    currency: row.currency
  }));
  const partitioned = partitionByCurrency(amounts);
  return {
    byCurrency: [...partitioned.byCurrency.entries()].map(([currency2, total]) => ({
      currency: currency2,
      total: String(total)
    })),
    unknownCount: partitioned.unknownCount
  };
}
async function personCostSummary(client, organizationId, companyId, personId) {
  const result = await client.query(
    `SELECT s.currency, pv.unit_price
     FROM license_assignments la
     JOIN subscriptions s
       ON s.organization_id = la.organization_id
      AND s.company_id = la.company_id
      AND s.id = la.subscription_id
     LEFT JOIN LATERAL (
       SELECT unit_price
       FROM subscription_price_versions
       WHERE organization_id = s.organization_id
         AND company_id = s.company_id
         AND subscription_id = s.id
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
       ORDER BY effective_from DESC
       LIMIT 1
     ) pv ON TRUE
     WHERE la.organization_id = $1 AND la.company_id = $2 AND la.person_id = $3
       AND la.status IN ('active', 'removal_pending')`,
    [organizationId, companyId, personId]
  );
  const amounts = result.rows.map((row) => ({
    amount: row.unit_price == null ? null : Number(row.unit_price),
    currency: row.currency
  }));
  const partitioned = partitionByCurrency(amounts);
  return {
    byCurrency: [...partitioned.byCurrency.entries()].map(([currency2, total]) => ({
      currency: currency2,
      total: String(total)
    })),
    unknownCount: partitioned.unknownCount
  };
}
async function createImportBatch(client, input) {
  const id = input.id ?? randomUUID5();
  const result = await client.query(
    `INSERT INTO import_batches (
      id, organization_id, company_id, resource_kind, original_filename, status,
      schema_mapping, created_by_staff_user_id
    ) VALUES ($1,$2,$3,$4,$5,'preview',$6::jsonb,$7)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.resourceKind,
      input.originalFilename,
      JSON.stringify(input.schemaMapping ?? {}),
      input.createdByStaffUserId ?? null
    ]
  );
  return result.rows[0];
}
async function insertImportRows(client, rows) {
  const inserted = [];
  for (const row of rows) {
    const result = await client.query(
      `INSERT INTO import_rows (
        id, organization_id, company_id, batch_id, row_number, raw_data,
        validation_status, validation_errors, dedupe_key, apply_status
      ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9,$10)
      RETURNING *`,
      [
        row.id ?? randomUUID5(),
        row.organizationId,
        row.companyId,
        row.batchId,
        row.rowNumber,
        JSON.stringify(row.rawData),
        row.validationStatus,
        JSON.stringify(row.validationErrors ?? []),
        row.dedupeKey ?? null,
        row.applyStatus ?? "pending"
      ]
    );
    inserted.push(result.rows[0]);
  }
  return inserted;
}
async function getImportBatch(client, organizationId, companyId, batchId) {
  const result = await client.query(
    `SELECT * FROM import_batches
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, batchId]
  );
  return result.rows[0] ?? null;
}
async function listImportRows(client, organizationId, companyId, batchId) {
  const result = await client.query(
    `SELECT * FROM import_rows
     WHERE organization_id = $1 AND company_id = $2 AND batch_id = $3
     ORDER BY row_number ASC`,
    [organizationId, companyId, batchId]
  );
  return result.rows;
}
function parsePeopleCsv(csv) {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const fields = {};
    headers.forEach((header, index) => {
      fields[header] = (values[index] ?? "").trim();
    });
    rows.push({ rowNumber: i + 1, fields });
  }
  return rows;
}
function splitCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}
async function previewPeopleImport(client, input) {
  const parsed = parsePeopleCsv(input.csv);
  const batch = await createImportBatch(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    resourceKind: "people",
    originalFilename: input.filename,
    createdByStaffUserId: input.createdByStaffUserId,
    schemaMapping: {
      display_name: "display_name|name|display name",
      work_email: "work_email|email|work email",
      it_status: "it_status|status"
    }
  });
  const rowInputs = parsed.map(({ rowNumber, fields }) => {
    const displayName = fields.display_name || fields.name || fields["display name"] || "";
    const workEmail = fields.work_email || fields.email || fields["work email"] || "";
    const itStatus = (fields.it_status || fields.status || "planned").toLowerCase();
    const errors = [];
    if (!displayName) errors.push("display_name is required");
    if (!workEmail || !workEmail.includes("@")) errors.push("work_email is required");
    if (!["planned", "active", "on_leave", "departed"].includes(itStatus)) {
      errors.push("invalid it_status");
    }
    const dedupeKey = workEmail ? workEmail.toLowerCase() : null;
    return {
      organizationId: input.organizationId,
      companyId: input.companyId,
      batchId: batch.id,
      rowNumber,
      rawData: fields,
      validationStatus: errors.length ? "invalid" : "valid",
      validationErrors: errors,
      dedupeKey,
      applyStatus: "pending"
    };
  });
  const rows = await insertImportRows(client, rowInputs);
  return { batch, rows };
}
async function applyPeopleImport(client, input) {
  const batch = await getImportBatch(
    client,
    input.organizationId,
    input.companyId,
    input.batchId
  );
  if (!batch) throw new NotFoundError("Import batch not found");
  if (batch.status === "applied") {
    throw new ConflictError("Import batch already applied");
  }
  const rows = await listImportRows(client, input.organizationId, input.companyId, input.batchId);
  let applied = 0;
  let noop = 0;
  let failed = 0;
  let skipped = 0;
  const updatedRows = [];
  for (const row of rows) {
    if (row.validation_status !== "valid") {
      skipped += 1;
      const result = await client.query(
        `UPDATE import_rows SET apply_status = 'skipped', apply_result = $4::jsonb
         WHERE organization_id = $1 AND company_id = $2 AND id = $3
         RETURNING *`,
        [
          input.organizationId,
          input.companyId,
          row.id,
          JSON.stringify({ reason: "invalid_row" })
        ]
      );
      updatedRows.push(result.rows[0]);
      continue;
    }
    const fields = row.raw_data;
    const displayName = fields.display_name || fields.name || fields["display name"] || "";
    const workEmail = (fields.work_email || fields.email || fields["work email"] || "").toLowerCase();
    const itStatus = (fields.it_status || fields.status || "planned").toLowerCase();
    const roleTitle = fields.role_title || fields.role || null;
    const department = fields.department || null;
    try {
      const existing = await client.query(
        `SELECT * FROM people
         WHERE organization_id = $1 AND company_id = $2 AND lower(work_email) = lower($3)
         LIMIT 1`,
        [input.organizationId, input.companyId, workEmail]
      );
      const person = existing.rows[0];
      if (person) {
        const unchanged = person.display_name === displayName && person.it_status === itStatus && (person.role_title ?? null) === (roleTitle || null) && (person.department ?? null) === (department || null);
        if (unchanged) {
          noop += 1;
          const result2 = await client.query(
            `UPDATE import_rows SET apply_status = 'noop', apply_result = $4::jsonb
             WHERE organization_id = $1 AND company_id = $2 AND id = $3
             RETURNING *`,
            [
              input.organizationId,
              input.companyId,
              row.id,
              JSON.stringify({ personId: person.id, action: "noop" })
            ]
          );
          updatedRows.push(result2.rows[0]);
          continue;
        }
        const updated = await updatePerson(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          personId: person.id,
          version: person.version,
          displayName,
          itStatus,
          roleTitle: roleTitle || null,
          department: department || null
        });
        applied += 1;
        const result = await client.query(
          `UPDATE import_rows SET apply_status = 'applied', apply_result = $4::jsonb
           WHERE organization_id = $1 AND company_id = $2 AND id = $3
           RETURNING *`,
          [
            input.organizationId,
            input.companyId,
            row.id,
            JSON.stringify({ personId: updated?.id ?? person.id, action: "update" })
          ]
        );
        updatedRows.push(result.rows[0]);
      } else {
        const created = await createPerson(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          displayName,
          workEmail,
          itStatus,
          roleTitle: roleTitle || null,
          department: department || null
        });
        applied += 1;
        const result = await client.query(
          `UPDATE import_rows SET apply_status = 'applied', apply_result = $4::jsonb
           WHERE organization_id = $1 AND company_id = $2 AND id = $3
           RETURNING *`,
          [
            input.organizationId,
            input.companyId,
            row.id,
            JSON.stringify({ personId: created.id, action: "create" })
          ]
        );
        updatedRows.push(result.rows[0]);
      }
    } catch (error) {
      failed += 1;
      const result = await client.query(
        `UPDATE import_rows SET apply_status = 'failed', apply_result = $4::jsonb
         WHERE organization_id = $1 AND company_id = $2 AND id = $3
         RETURNING *`,
        [
          input.organizationId,
          input.companyId,
          row.id,
          JSON.stringify({
            error: error instanceof Error ? error.message : "apply_failed"
          })
        ]
      );
      updatedRows.push(result.rows[0]);
    }
  }
  const batchResult = await client.query(
    `UPDATE import_batches
     SET status = 'applied', applied_at = NOW(), updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND id = $3
     RETURNING *`,
    [input.organizationId, input.companyId, input.batchId]
  );
  await insertAuditEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    actorStaffUserId: input.actorStaffUserId,
    action: "import.people.apply",
    targetType: "import_batch",
    targetId: input.batchId,
    summary: `Applied people import: ${applied} applied, ${noop} noop`
  });
  return {
    batch: batchResult.rows[0],
    rows: updatedRows,
    applied,
    noop,
    failed,
    skipped
  };
}
var init_inventory = __esm({
  "packages/db/src/inventory.ts"() {
    "use strict";
    init_src2();
    init_queries();
  }
});

// packages/db/src/provider-sync.ts
import { randomUUID as randomUUID6 } from "node:crypto";
function timelineSource(source) {
  return source;
}
async function createConnection(client, input) {
  if (input.providerKind === "microsoft" && input.credentialRef && /secret|password|token=/i.test(input.credentialRef)) {
    throw new Error("credential_ref must be a reference name only \u2014 never a raw secret");
  }
  const id = input.id ?? randomUUID6();
  const tenantId = input.providerKind === "demo" ? null : input.tenantId ?? null;
  const result = await client.query(
    `INSERT INTO provider_connections (
      id, organization_id, company_id, provider_kind, tenant_id, display_name,
      status, credential_ref, failure_mode
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.providerKind,
      tenantId,
      input.displayName,
      input.status ?? "draft",
      input.credentialRef ?? null,
      input.failureMode ?? null
    ]
  );
  return result.rows[0];
}
async function listConnections(client, organizationId, companyId) {
  const result = await client.query(
    `SELECT * FROM provider_connections
     WHERE organization_id = $1 AND company_id = $2
     ORDER BY created_at DESC`,
    [organizationId, companyId]
  );
  return result.rows;
}
async function listConnectionsForScheduledSync(client) {
  const result = await client.query(
    `SELECT * FROM provider_connections
     WHERE status = 'connected'
     ORDER BY company_id, created_at`
  );
  return result.rows;
}
async function countStaleConnections(client, organizationId, companyIds, maxAgeHours = 24) {
  if (companyIds.length === 0) return 0;
  const result = await client.query(
    `SELECT COUNT(DISTINCT c.id)::text AS count
     FROM provider_connections c
     LEFT JOIN sync_collection_state s ON s.connection_id = c.id
     WHERE c.organization_id = $1
       AND c.company_id = ANY($2::uuid[])
       AND c.status <> 'disabled'
       AND c.status <> 'draft'
       AND (
         c.status = 'error'
         OR c.last_success_at IS NULL
         OR c.last_success_at < NOW() - ($3::int * INTERVAL '1 hour')
         OR COALESCE(s.consecutive_failures, 0) > 0
       )`,
    [organizationId, companyIds, maxAgeHours]
  );
  return Number(result.rows[0]?.count ?? 0);
}
async function getConnection(client, organizationId, companyId, connectionId) {
  const result = await client.query(
    `SELECT * FROM provider_connections
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, connectionId]
  );
  return result.rows[0] ?? null;
}
async function updateConnectionStatus(client, input) {
  if (input.credentialRef && /secret|password|token=/i.test(input.credentialRef)) {
    throw new Error("credential_ref must be a reference name only \u2014 never a raw secret");
  }
  const result = await client.query(
    `UPDATE provider_connections SET
      status = $1,
      last_success_at = CASE WHEN $2::boolean THEN $3::timestamptz ELSE last_success_at END,
      last_error = CASE WHEN $4::boolean THEN $5 ELSE last_error END,
      failure_mode = CASE WHEN $6::boolean THEN $7 ELSE failure_mode END,
      credential_ref = CASE WHEN $8::boolean THEN $9 ELSE credential_ref END,
      display_name = COALESCE($10, display_name),
      tenant_id = CASE WHEN $11::boolean THEN $12 ELSE tenant_id END,
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $13 AND company_id = $14 AND id = $15 AND version = $16
     RETURNING *`,
    [
      input.status,
      input.lastSuccessAt !== void 0,
      input.lastSuccessAt ?? null,
      input.lastError !== void 0,
      input.lastError ?? null,
      input.failureMode !== void 0,
      input.failureMode ?? null,
      input.credentialRef !== void 0,
      input.credentialRef ?? null,
      input.displayName ?? null,
      input.tenantId !== void 0,
      input.tenantId ?? null,
      input.organizationId,
      input.companyId,
      input.connectionId,
      input.version
    ]
  );
  return result.rows[0] ?? null;
}
async function createSyncRun(client, input) {
  const id = input.id ?? randomUUID6();
  const status = input.status ?? "queued";
  const result = await client.query(
    `INSERT INTO sync_runs (
      id, organization_id, company_id, connection_id, collection, status,
      started_at, correlation_id
    ) VALUES (
      $1,$2,$3,$4,$5,$6,
      CASE WHEN $6 IN ('running') THEN NOW() ELSE NULL END,
      $7
    )
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.connectionId,
      input.collection,
      status,
      input.correlationId ?? null
    ]
  );
  return result.rows[0];
}
async function finishSyncRun(client, input) {
  const result = await client.query(
    `UPDATE sync_runs SET
      status = $1,
      finished_at = NOW(),
      started_at = COALESCE(started_at, NOW()),
      item_count = COALESCE($2, item_count),
      page_count = COALESCE($3, page_count),
      error_code = $4,
      error_message = $5
     WHERE organization_id = $6 AND company_id = $7 AND id = $8
     RETURNING *`,
    [
      input.status,
      input.itemCount ?? null,
      input.pageCount ?? null,
      input.errorCode ?? null,
      input.errorMessage ?? null,
      input.organizationId,
      input.companyId,
      input.syncRunId
    ]
  );
  return result.rows[0] ?? null;
}
async function listSyncRuns(client, input) {
  const params = [input.organizationId, input.companyId];
  const clauses = ["organization_id = $1", "company_id = $2"];
  if (input.connectionId) {
    params.push(input.connectionId);
    clauses.push(`connection_id = $${params.length}`);
  }
  if (input.collection) {
    params.push(input.collection);
    clauses.push(`collection = $${params.length}`);
  }
  params.push(input.limit ?? 50);
  const result = await client.query(
    `SELECT * FROM sync_runs
     WHERE ${clauses.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return result.rows;
}
async function upsertCollectionState(client, input) {
  const attemptAt = input.lastAttemptAt ?? /* @__PURE__ */ new Date();
  let consecutiveFailures = input.consecutiveFailures;
  let lastSuccessAt = input.lastSuccessAt;
  let lastError = input.lastError;
  if (input.succeeded === true) {
    consecutiveFailures = 0;
    lastSuccessAt = lastSuccessAt ?? attemptAt;
    lastError = null;
  } else if (input.succeeded === false) {
    if (consecutiveFailures === void 0) {
      const existing = await client.query(
        `SELECT consecutive_failures FROM sync_collection_state
         WHERE connection_id = $1 AND collection = $2`,
        [input.connectionId, input.collection]
      );
      consecutiveFailures = (existing.rows[0]?.consecutive_failures ?? 0) + 1;
    }
  }
  const result = await client.query(
    `INSERT INTO sync_collection_state (
      connection_id, collection, last_success_at, last_attempt_at, last_error, consecutive_failures
    ) VALUES ($1,$2,$3,$4,$5,COALESCE($6, 0))
    ON CONFLICT (connection_id, collection) DO UPDATE SET
      last_attempt_at = EXCLUDED.last_attempt_at,
      last_success_at = COALESCE(EXCLUDED.last_success_at, sync_collection_state.last_success_at),
      last_error = EXCLUDED.last_error,
      consecutive_failures = COALESCE(EXCLUDED.consecutive_failures, sync_collection_state.consecutive_failures)
    RETURNING *`,
    [
      input.connectionId,
      input.collection,
      lastSuccessAt ?? null,
      attemptAt,
      lastError ?? null,
      consecutiveFailures ?? null
    ]
  );
  return result.rows[0];
}
async function applyAccountObservations(client, input) {
  const applied = [];
  for (const obs of input.observations) {
    const existing = await client.query(
      `SELECT id, login_name, account_kind, enabled_state FROM accounts
       WHERE organization_id = $1 AND company_id = $2
         AND provider_source = $3 AND external_id = $4`,
      [input.organizationId, input.companyId, input.providerSource, obs.externalId]
    );
    const observedAt = obs.observedAt ?? /* @__PURE__ */ new Date();
    const accountKind = obs.accountKind ?? "human";
    const enabledState = obs.enabledState ?? "unknown";
    const freshnessNote = obs.freshnessNote ?? `Last ${input.providerSource} observation (implemented; not live-verified)`;
    if (existing.rows[0]) {
      const row = existing.rows[0];
      await client.query(
        `UPDATE accounts SET
          login_name = $1,
          account_kind = $2,
          enabled_state = $3,
          last_observed_at = $4::timestamptz,
          freshness_note = $5,
          updated_at = NOW(),
          version = version + 1
         WHERE id = $6`,
        [obs.loginName, accountKind, enabledState, observedAt, freshnessNote, row.id]
      );
      const changed = row.login_name !== obs.loginName || row.account_kind !== accountKind || row.enabled_state !== enabledState;
      if (changed) {
        await insertTimelineEvent(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          entityType: "account",
          entityId: row.id,
          eventKind: "account.observed_updated",
          observedAt,
          source: timelineSource(input.providerSource),
          summary: `Updated account ${obs.loginName} from ${input.providerSource} sync`
        });
      }
      applied.push({ id: row.id, created: false, externalId: obs.externalId });
    } else {
      const id = randomUUID6();
      await client.query(
        `INSERT INTO accounts (
          id, organization_id, company_id, person_id, provider_source, external_id,
          login_name, account_kind, enabled_state, last_observed_at, freshness_note
        ) VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,$8,$9::timestamptz,$10)`,
        [
          id,
          input.organizationId,
          input.companyId,
          input.providerSource,
          obs.externalId,
          obs.loginName,
          accountKind,
          enabledState,
          observedAt,
          freshnessNote
        ]
      );
      await insertTimelineEvent(client, {
        organizationId: input.organizationId,
        companyId: input.companyId,
        entityType: "account",
        entityId: id,
        eventKind: "account.observed_created",
        observedAt,
        source: timelineSource(input.providerSource),
        summary: `Observed new account ${obs.loginName} from ${input.providerSource} sync`
      });
      applied.push({ id, created: true, externalId: obs.externalId });
    }
  }
  return applied;
}
async function applyGroupObservations(client, input) {
  const applied = [];
  for (const obs of input.observations) {
    const existing = await client.query(
      `SELECT id, display_name FROM groups
       WHERE organization_id = $1 AND company_id = $2 AND external_id = $3`,
      [input.organizationId, input.companyId, obs.externalId]
    );
    const capability = obs.membershipCapability ?? "direct";
    if (existing.rows[0]) {
      const row = existing.rows[0];
      await client.query(
        `UPDATE groups SET
          display_name = $1,
          email_address = $2,
          group_type = $3,
          membership_capability = $4,
          source = $5,
          updated_at = NOW(),
          version = version + 1
         WHERE id = $6`,
        [
          obs.displayName,
          obs.emailAddress ?? null,
          obs.groupType,
          capability,
          input.source,
          row.id
        ]
      );
      if (row.display_name !== obs.displayName) {
        await insertTimelineEvent(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          entityType: "group",
          entityId: row.id,
          eventKind: "group.observed_updated",
          source: timelineSource(input.source),
          summary: `Updated group ${obs.displayName} from ${input.source} sync`
        });
      }
      applied.push({ id: row.id, created: false, externalId: obs.externalId });
    } else {
      const id = randomUUID6();
      await client.query(
        `INSERT INTO groups (
          id, organization_id, company_id, external_id, display_name, email_address,
          group_type, membership_capability, source
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          id,
          input.organizationId,
          input.companyId,
          obs.externalId,
          obs.displayName,
          obs.emailAddress ?? null,
          obs.groupType,
          capability,
          input.source
        ]
      );
      await insertTimelineEvent(client, {
        organizationId: input.organizationId,
        companyId: input.companyId,
        entityType: "group",
        entityId: id,
        eventKind: "group.observed_created",
        source: timelineSource(input.source),
        summary: `Observed new group ${obs.displayName} from ${input.source} sync`
      });
      applied.push({ id, created: true, externalId: obs.externalId });
    }
  }
  return applied;
}
async function applyMembershipObservations(client, input) {
  void input.partial;
  const applied = [];
  for (const obs of input.observations) {
    const group = await client.query(
      `SELECT id FROM groups
       WHERE organization_id = $1 AND company_id = $2 AND external_id = $3`,
      [input.organizationId, input.companyId, obs.groupExternalId]
    );
    const account = await client.query(
      `SELECT id FROM accounts
       WHERE organization_id = $1 AND company_id = $2
         AND provider_source = $3 AND external_id = $4`,
      [
        input.organizationId,
        input.companyId,
        input.providerSource,
        obs.accountExternalId
      ]
    );
    if (!group.rows[0] || !account.rows[0]) {
      continue;
    }
    const groupId = group.rows[0].id;
    const accountId = account.rows[0].id;
    const kind = obs.membershipKind ?? "direct";
    const verification = obs.verificationSource ?? `${input.providerSource}_sync`;
    const existing = await client.query(
      `SELECT id, status FROM group_memberships
       WHERE organization_id = $1 AND company_id = $2
         AND group_id = $3 AND account_id = $4
       ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC
       LIMIT 1`,
      [input.organizationId, input.companyId, groupId, accountId]
    );
    if (existing.rows[0]) {
      const row = existing.rows[0];
      await client.query(
        `UPDATE group_memberships SET
          membership_kind = $1,
          verification_source = $2,
          status = 'active',
          end_date = NULL,
          updated_at = NOW()
         WHERE id = $3`,
        [kind, verification, row.id]
      );
      applied.push({ id: row.id, created: false, groupId, accountId });
    } else {
      const id = randomUUID6();
      await client.query(
        `INSERT INTO group_memberships (
          id, organization_id, company_id, group_id, account_id, membership_kind,
          verification_source, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'active')`,
        [
          id,
          input.organizationId,
          input.companyId,
          groupId,
          accountId,
          kind,
          verification
        ]
      );
      await insertTimelineEvent(client, {
        organizationId: input.organizationId,
        companyId: input.companyId,
        entityType: "group",
        entityId: groupId,
        eventKind: "group.membership_observed",
        source: timelineSource(input.providerSource),
        summary: `Observed membership for account ${obs.accountExternalId}`
      });
      applied.push({ id, created: true, groupId, accountId });
    }
  }
  return applied;
}
async function applySkuObservations(client, input) {
  const applied = [];
  for (const obs of input.observations) {
    const freshnessNote = obs.freshnessNote ?? `Observed ${input.source} SKU pool (implemented; not live-verified)`;
    const observedAt = obs.observedAt ?? /* @__PURE__ */ new Date();
    const existing = await client.query(
      `SELECT id FROM license_pools
       WHERE organization_id = $1 AND company_id = $2
         AND provider_sku = $3 AND source = $4`,
      [input.organizationId, input.companyId, obs.providerSku, input.source]
    );
    if (existing.rows[0]) {
      const id = existing.rows[0].id;
      await client.query(
        `UPDATE license_pools SET
          product_id = $1,
          purchased_quantity = $2,
          consumed_quantity = $3,
          last_observed_at = $4::timestamptz,
          freshness_note = $5,
          updated_at = NOW(),
          version = version + 1
         WHERE id = $6`,
        [
          obs.productId,
          obs.purchasedQuantity,
          obs.consumedQuantity ?? null,
          observedAt,
          freshnessNote,
          id
        ]
      );
      await insertTimelineEvent(client, {
        organizationId: input.organizationId,
        companyId: input.companyId,
        entityType: "license_pool",
        entityId: id,
        eventKind: "license_pool.observed_updated",
        observedAt,
        source: timelineSource(input.source),
        summary: `Updated observed SKU ${obs.providerSku} from ${input.source} sync`
      });
      applied.push({ id, created: false, providerSku: obs.providerSku });
    } else {
      const id = randomUUID6();
      await client.query(
        `INSERT INTO license_pools (
          id, organization_id, company_id, product_id, provider_sku,
          purchased_quantity, consumed_quantity, source, last_observed_at, freshness_note
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz,$10)`,
        [
          id,
          input.organizationId,
          input.companyId,
          obs.productId,
          obs.providerSku,
          obs.purchasedQuantity,
          obs.consumedQuantity ?? null,
          input.source,
          observedAt,
          freshnessNote
        ]
      );
      await insertTimelineEvent(client, {
        organizationId: input.organizationId,
        companyId: input.companyId,
        entityType: "license_pool",
        entityId: id,
        eventKind: "license_pool.observed_created",
        observedAt,
        source: timelineSource(input.source),
        summary: `Observed SKU ${obs.providerSku} from ${input.source} sync`
      });
      applied.push({ id, created: true, providerSku: obs.providerSku });
    }
  }
  return applied;
}
async function createPersonLinkProposals(client, input) {
  const created = [];
  for (const account of input.accounts) {
    const email = (account.mail ?? account.loginName ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) continue;
    const people = await client.query(
      `SELECT id FROM people
       WHERE organization_id = $1 AND company_id = $2
         AND lower(work_email) = $3
         AND archived_at IS NULL`,
      [input.organizationId, input.companyId, email]
    );
    if (people.rows.length !== 1) {
      continue;
    }
    const personId = people.rows[0].id;
    const linked = await client.query(
      `SELECT 1 FROM accounts
       WHERE id = $1 AND person_id = $2`,
      [account.accountId, personId]
    );
    if ((linked.rowCount ?? 0) > 0) continue;
    const result = await client.query(
      `INSERT INTO person_link_proposals (
        id, organization_id, company_id, account_id, person_id,
        proposed_by, confidence, status
      ) VALUES ($1,$2,$3,$4,$5,'email_match','exact_email','open')
      ON CONFLICT (organization_id, company_id, account_id, person_id)
        WHERE status = 'open' AND person_id IS NOT NULL
      DO NOTHING
      RETURNING *`,
      [
        randomUUID6(),
        input.organizationId,
        input.companyId,
        account.accountId,
        personId
      ]
    );
    if (result.rows[0]) {
      created.push(result.rows[0]);
    }
  }
  return created;
}
async function listPersonLinkProposals(client, organizationId, companyId, status = "open") {
  const result = await client.query(
    `SELECT * FROM person_link_proposals
     WHERE organization_id = $1 AND company_id = $2 AND status = $3
     ORDER BY created_at DESC`,
    [organizationId, companyId, status]
  );
  return result.rows;
}
var init_provider_sync = __esm({
  "packages/db/src/provider-sync.ts"() {
    "use strict";
    init_inventory();
  }
});

// packages/integrations/src/types.ts
var CAPABILITY_IDS;
var init_types = __esm({
  "packages/integrations/src/types.ts"() {
    "use strict";
    CAPABILITY_IDS = {
      usersRead: "microsoft.users.read",
      groupsRead: "microsoft.groups.read",
      groupMembersRead: "microsoft.groups.members.read",
      skusRead: "microsoft.skus.read"
    };
  }
});

// packages/integrations/src/errors.ts
var ProviderError, UnauthorizedCollection, Throttled, TokenExpired, ConnectionFailed;
var init_errors2 = __esm({
  "packages/integrations/src/errors.ts"() {
    "use strict";
    ProviderError = class extends Error {
      constructor(message) {
        super(message);
        this.name = new.target.name;
      }
    };
    UnauthorizedCollection = class extends ProviderError {
      constructor(message, collection) {
        super(message);
        this.collection = collection;
      }
      collection;
      code = "unauthorized_collection";
    };
    Throttled = class extends ProviderError {
      constructor(message, retryAfterSeconds = null) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
      }
      retryAfterSeconds;
      code = "throttled";
    };
    TokenExpired = class extends ProviderError {
      code = "token_expired";
      constructor(message = "Microsoft access token expired or was rejected") {
        super(message);
      }
    };
    ConnectionFailed = class extends ProviderError {
      code = "connection_failed";
      constructor(message) {
        super(message);
      }
    };
  }
});

// packages/integrations/src/observations.ts
var init_observations = __esm({
  "packages/integrations/src/observations.ts"() {
    "use strict";
  }
});

// packages/integrations/src/capabilities.ts
function buildInventoryCapabilities(input) {
  const base = {
    implemented: true,
    granted: input.granted,
    availableInTenant: input.availableInTenant,
    lastTestedAt: input.lastTestedAt ?? null,
    ...READ_GRAPH
  };
  const caps = [
    { id: CAPABILITY_IDS.usersRead, ...base },
    { id: CAPABILITY_IDS.groupsRead, ...base },
    { id: CAPABILITY_IDS.groupMembersRead, ...base },
    { id: CAPABILITY_IDS.skusRead, ...base }
  ];
  if (!input.overrides) return caps;
  return caps.map((cap) => {
    const patch = input.overrides?.[cap.id];
    return patch ? { ...cap, ...patch } : cap;
  });
}
var READ_GRAPH;
var init_capabilities = __esm({
  "packages/integrations/src/capabilities.ts"() {
    "use strict";
    init_types();
    READ_GRAPH = {
      access: "read",
      executionMethod: "graph"
    };
  }
});

// packages/integrations/fixtures/group-members.json
var group_members_default;
var init_group_members = __esm({
  "packages/integrations/fixtures/group-members.json"() {
    group_members_default = {
      "bbbbbbbb-0002-4000-8000-000000000001": {
        value: [
          {
            "@odata.type": "#microsoft.graph.user",
            id: "aaaaaaaa-0001-4000-8000-000000000001"
          },
          {
            "@odata.type": "#microsoft.graph.user",
            id: "aaaaaaaa-0001-4000-8000-000000000005"
          }
        ]
      },
      "bbbbbbbb-0002-4000-8000-000000000002": {
        value: [
          {
            "@odata.type": "#microsoft.graph.user",
            id: "aaaaaaaa-0001-4000-8000-000000000005"
          },
          {
            "@odata.type": "#microsoft.graph.user",
            id: "aaaaaaaa-0001-4000-8000-000000000006"
          },
          {
            "@odata.type": "#microsoft.graph.user",
            id: "aaaaaaaa-0001-4000-8000-000000000007"
          }
        ]
      },
      "bbbbbbbb-0002-4000-8000-000000000003": {
        value: [
          {
            "@odata.type": "#microsoft.graph.user",
            id: "aaaaaaaa-0001-4000-8000-000000000001"
          },
          {
            "@odata.type": "#microsoft.graph.user",
            id: "aaaaaaaa-0001-4000-8000-000000000005"
          },
          {
            "@odata.type": "#microsoft.graph.user",
            id: "aaaaaaaa-0001-4000-8000-000000000006"
          },
          {
            "@odata.type": "#microsoft.graph.user",
            id: "aaaaaaaa-0001-4000-8000-000000000007"
          }
        ]
      },
      "bbbbbbbb-0002-4000-8000-000000000004": {
        value: [
          {
            "@odata.type": "#microsoft.graph.user",
            id: "aaaaaaaa-0001-4000-8000-000000000003"
          }
        ]
      },
      "bbbbbbbb-0002-4000-8000-000000000005": {
        value: [
          {
            "@odata.type": "#microsoft.graph.user",
            id: "aaaaaaaa-0001-4000-8000-000000000001"
          }
        ]
      }
    };
  }
});

// packages/integrations/fixtures/groups.json
var groups_default;
var init_groups = __esm({
  "packages/integrations/fixtures/groups.json"() {
    groups_default = {
      "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#groups",
      value: [
        {
          id: "bbbbbbbb-0002-4000-8000-000000000001",
          displayName: "Harbor Design Security",
          mail: null,
          groupTypes: [],
          securityEnabled: true,
          mailEnabled: false
        },
        {
          id: "bbbbbbbb-0002-4000-8000-000000000002",
          displayName: "Harbor Studio M365",
          mail: "studio@harbor.example",
          groupTypes: ["Unified"],
          securityEnabled: false,
          mailEnabled: true
        },
        {
          id: "bbbbbbbb-0002-4000-8000-000000000003",
          displayName: "Harbor All Staff",
          mail: "all@harbor.example",
          groupTypes: [],
          securityEnabled: false,
          mailEnabled: true
        },
        {
          id: "bbbbbbbb-0002-4000-8000-000000000004",
          displayName: "Harbor Ops MES",
          mail: "ops-sec@harbor.example",
          groupTypes: [],
          securityEnabled: true,
          mailEnabled: true
        },
        {
          id: "bbbbbbbb-0002-4000-8000-000000000005",
          displayName: "Harbor Contractors (dynamic)",
          mail: null,
          groupTypes: ["DynamicMembership"],
          securityEnabled: true,
          mailEnabled: false,
          membershipRule: '(user.department -eq "Design")'
        }
      ]
    };
  }
});

// packages/integrations/fixtures/skus.json
var skus_default;
var init_skus = __esm({
  "packages/integrations/fixtures/skus.json"() {
    skus_default = {
      "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#subscribedSkus",
      value: [
        {
          capabilityStatus: "Enabled",
          consumedUnits: 18,
          skuId: "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46",
          skuPartNumber: "O365_BUSINESS_PREMIUM",
          prepaidUnits: {
            enabled: 25,
            suspended: 0,
            warning: 0,
            lockedOut: 0
          }
        },
        {
          capabilityStatus: "Enabled",
          consumedUnits: 2,
          skuId: "f245ecc8-75af-4f8e-9386-94009130390d",
          skuPartNumber: "O365_BUSINESS_ESSENTIALS",
          prepaidUnits: {
            enabled: 5,
            suspended: 0,
            warning: 0
          }
        }
      ]
    };
  }
});

// packages/integrations/fixtures/throttle-429.json
var throttle_429_default;
var init_throttle_429 = __esm({
  "packages/integrations/fixtures/throttle-429.json"() {
    throttle_429_default = {
      error: {
        code: "TooManyRequests",
        message: "Demo fixture: Graph throttling (429). Retry after the indicated delay.",
        innerError: {
          "request-id": "demo-throttle-0001",
          date: "2026-09-30T12:00:00"
        }
      },
      retryAfterSeconds: 12
    };
  }
});

// packages/integrations/fixtures/unauthorized-403.json
var unauthorized_403_default;
var init_unauthorized_403 = __esm({
  "packages/integrations/fixtures/unauthorized-403.json"() {
    unauthorized_403_default = {
      error: {
        code: "Authorization_RequestDenied",
        message: "Demo fixture: Insufficient privileges to complete the operation on this collection.",
        innerError: {
          "request-id": "demo-unauthorized-0001",
          date: "2026-09-30T12:00:00"
        }
      }
    };
  }
});

// packages/integrations/fixtures/users-page1.json
var users_page1_default;
var init_users_page1 = __esm({
  "packages/integrations/fixtures/users-page1.json"() {
    users_page1_default = {
      "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users",
      "@odata.nextLink": "https://graph.microsoft.com/v1.0/users?$skiptoken=demo-page-2",
      value: [
        {
          id: "aaaaaaaa-0001-4000-8000-000000000001",
          userPrincipalName: "alex.rivera@harbor.example",
          mail: "alex.rivera@harbor.example",
          displayName: "Alex Rivera",
          accountEnabled: true,
          usageLocation: "US",
          assignedLicenses: [
            {
              skuId: "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46",
              disabledPlans: []
            }
          ],
          licenseAssignmentStates: [
            {
              skuId: "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46",
              state: "Active",
              assignedByGroup: null,
              error: null
            }
          ]
        },
        {
          id: "aaaaaaaa-0001-4000-8000-000000000002",
          userPrincipalName: "casey.nguyen@harbor.example",
          mail: "casey.nguyen@harbor.example",
          displayName: "Casey Nguyen",
          accountEnabled: false,
          usageLocation: "US",
          assignedLicenses: [],
          licenseAssignmentStates: []
        },
        {
          id: "aaaaaaaa-0001-4000-8000-000000000003",
          userPrincipalName: "morgan.ellis@harbor.example",
          mail: "morgan.ellis@harbor.example",
          displayName: "Morgan Ellis",
          accountEnabled: false,
          usageLocation: "US",
          assignedLicenses: [],
          licenseAssignmentStates: []
        },
        {
          id: "aaaaaaaa-0001-4000-8000-000000000004",
          userPrincipalName: "priya.shah@harbor.example",
          mail: null,
          displayName: "Priya Shah",
          accountEnabled: false,
          assignedLicenses: []
        },
        {
          id: "aaaaaaaa-0001-4000-8000-000000000005",
          userPrincipalName: "jordan.blake@harbor.example",
          mail: "jordan.blake@harbor.example",
          displayName: "Jordan Blake",
          accountEnabled: true,
          usageLocation: "US",
          assignedLicenses: [
            {
              skuId: "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46",
              disabledPlans: []
            }
          ],
          licenseAssignmentStates: [
            {
              skuId: "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46",
              state: "Active",
              assignedByGroup: "bbbbbbbb-0002-4000-8000-000000000002",
              error: null
            }
          ]
        }
      ]
    };
  }
});

// packages/integrations/fixtures/users-page2.json
var users_page2_default;
var init_users_page2 = __esm({
  "packages/integrations/fixtures/users-page2.json"() {
    users_page2_default = {
      "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users",
      value: [
        {
          id: "aaaaaaaa-0001-4000-8000-000000000006",
          userPrincipalName: "riley.quinn@harbor.example",
          mail: "riley.quinn@harbor.example",
          displayName: "Riley Quinn",
          accountEnabled: true,
          usageLocation: "US",
          assignedLicenses: [
            {
              skuId: "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46",
              disabledPlans: []
            }
          ],
          licenseAssignmentStates: [
            {
              skuId: "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46",
              state: "Active",
              assignedByGroup: null,
              error: null
            }
          ]
        },
        {
          id: "aaaaaaaa-0001-4000-8000-000000000007",
          userPrincipalName: "taylor.brooks@harbor.example",
          mail: "taylor.brooks@harbor.example",
          displayName: "Taylor Brooks",
          accountEnabled: true,
          usageLocation: "CA",
          assignedLicenses: [
            {
              skuId: "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46",
              disabledPlans: ["efb87545-963c-4e0d-99df-69c6916d9eb0"]
            }
          ],
          licenseAssignmentStates: [
            {
              skuId: "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46",
              state: "Active",
              assignedByGroup: null,
              error: null
            }
          ]
        },
        {
          id: "aaaaaaaa-0001-4000-8000-000000000008",
          userPrincipalName: "svc-backup@harbor.example",
          mail: null,
          displayName: "Harbor Backup Service",
          accountEnabled: true,
          assignedLicenses: []
        },
        {
          id: "aaaaaaaa-0001-4000-8000-000000000009",
          userPrincipalName: "guest.collaborator_external#EXT#@harbor.example",
          mail: "guest.collaborator@partner.example",
          displayName: "Guest Collaborator",
          accountEnabled: true,
          usageLocation: null,
          assignedLicenses: [],
          licenseAssignmentStates: []
        }
      ]
    };
  }
});

// packages/integrations/src/fixtures.ts
function loadFixtureJson(name) {
  return FIXTURES[name];
}
var FIXTURES;
var init_fixtures = __esm({
  "packages/integrations/src/fixtures.ts"() {
    "use strict";
    init_group_members();
    init_groups();
    init_skus();
    init_throttle_429();
    init_unauthorized_403();
    init_users_page1();
    init_users_page2();
    FIXTURES = {
      "users-page1": users_page1_default,
      "users-page2": users_page2_default,
      groups: groups_default,
      skus: skus_default,
      "group-members": group_members_default,
      "throttle-429": throttle_429_default,
      "unauthorized-403": unauthorized_403_default
    };
  }
});

// packages/integrations/src/parse.ts
function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function asString(value) {
  return typeof value === "string" ? value : null;
}
function asBoolean(value) {
  return typeof value === "boolean" ? value : null;
}
function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string");
}
function parseAssignedLicense(raw) {
  const row = asRecord(raw);
  const skuId = asString(row?.skuId);
  if (!skuId) return null;
  return {
    skuId,
    disabledPlans: asStringArray(row?.disabledPlans)
  };
}
function parseLicenseAssignmentState(raw) {
  const row = asRecord(raw);
  const skuId = asString(row?.skuId);
  const state = asString(row?.state);
  if (!skuId || !state) return null;
  return {
    skuId,
    state,
    assignedByGroup: asString(row?.assignedByGroup) ?? null,
    error: asString(row?.error) ?? null
  };
}
function parseObservedUser(raw) {
  const row = asRecord(raw);
  const id = asString(row?.id);
  const userPrincipalName = asString(row?.userPrincipalName);
  if (!id || !userPrincipalName) return null;
  const assignedLicenses = Array.isArray(row?.assignedLicenses) ? row.assignedLicenses.map(parseAssignedLicense).filter((x) => x !== null) : [];
  const licenseAssignmentStates = Array.isArray(row?.licenseAssignmentStates) ? row.licenseAssignmentStates.map(parseLicenseAssignmentState).filter((x) => x !== null) : void 0;
  return {
    id,
    userPrincipalName,
    mail: asString(row?.mail),
    displayName: asString(row?.displayName),
    accountEnabled: asBoolean(row?.accountEnabled),
    assignedLicenses,
    ...licenseAssignmentStates !== void 0 ? { licenseAssignmentStates } : {},
    usageLocation: row && "usageLocation" in row ? asString(row.usageLocation) : void 0
  };
}
function parseObservedGroup(raw) {
  const row = asRecord(raw);
  const id = asString(row?.id);
  if (!id) return null;
  return {
    id,
    displayName: asString(row?.displayName),
    mail: asString(row?.mail),
    groupTypes: asStringArray(row?.groupTypes),
    securityEnabled: asBoolean(row?.securityEnabled),
    mailEnabled: asBoolean(row?.mailEnabled),
    membershipRule: row && "membershipRule" in row ? asString(row.membershipRule) ?? null : void 0
  };
}
function parseObservedGroupMember(raw) {
  const row = asRecord(raw);
  if (!row) return null;
  const odataType = asString(row["@odata.type"]);
  if (odataType && !odataType.toLowerCase().includes("user")) {
    return null;
  }
  const id = asString(row.id);
  if (!id) return null;
  return { userId: id };
}
function parseObservedSku(raw) {
  const row = asRecord(raw);
  const skuId = asString(row?.skuId);
  const skuPartNumber = asString(row?.skuPartNumber);
  if (!skuId || !skuPartNumber) return null;
  const prepaid = asRecord(row?.prepaidUnits) ?? {};
  return {
    skuId,
    skuPartNumber,
    prepaidUnits: {
      enabled: asNumber(prepaid.enabled),
      suspended: asNumber(prepaid.suspended),
      warning: asNumber(prepaid.warning),
      lockedOut: asNumber(prepaid.lockedOut) ?? void 0
    },
    consumedUnits: asNumber(row?.consumedUnits),
    capabilityStatus: asString(row?.capabilityStatus)
  };
}
function parseCollection(body, parseItem) {
  const row = asRecord(body);
  const items = Array.isArray(row?.value) ? row.value.map(parseItem).filter((x) => x !== null) : [];
  const nextLink = asString(row?.["@odata.nextLink"] ?? null);
  return { items, nextLink };
}
function parseUserPage(body) {
  return parseCollection(body, parseObservedUser);
}
function parseGroupPage(body) {
  return parseCollection(body, parseObservedGroup);
}
function parseGroupMemberPage(body) {
  return parseCollection(body, parseObservedGroupMember);
}
function parseSkuPage(body) {
  return parseCollection(body, parseObservedSku);
}
var USER_SELECT_FIELDS, GROUP_SELECT_FIELDS;
var init_parse = __esm({
  "packages/integrations/src/parse.ts"() {
    "use strict";
    USER_SELECT_FIELDS = [
      "id",
      "userPrincipalName",
      "mail",
      "displayName",
      "accountEnabled",
      "assignedLicenses",
      "licenseAssignmentStates",
      "usageLocation"
    ];
    GROUP_SELECT_FIELDS = [
      "id",
      "displayName",
      "mail",
      "groupTypes",
      "securityEnabled",
      "mailEnabled",
      "membershipRule"
    ];
  }
});

// packages/integrations/src/demo-provider.ts
var DEMO_USERS_PAGE2_TOKEN, DemoInventoryProvider;
var init_demo_provider = __esm({
  "packages/integrations/src/demo-provider.ts"() {
    "use strict";
    init_capabilities();
    init_errors2();
    init_fixtures();
    init_parse();
    init_types();
    DEMO_USERS_PAGE2_TOKEN = "demo://users?page=2";
    DemoInventoryProvider = class {
      kind = "demo";
      label = "Demo inventory (synthetic Harbor fixtures \u2014 not live Microsoft)";
      connectionFailed;
      groupsUnauthorized;
      memberSyncGroupIds;
      lastTestedAt;
      constructor(options = {}) {
        this.connectionFailed = options.connectionFailed ?? false;
        this.groupsUnauthorized = options.groupsUnauthorized ?? false;
        this.memberSyncGroupIds = options.memberSyncGroupIds ?? "all";
        this.lastTestedAt = options.lastTestedAt ?? "2026-09-30T12:00:00.000Z";
      }
      /** Toggle connection failure without rebuilding fixtures (spec §M2.3 recover path). */
      setConnectionFailed(value) {
        this.connectionFailed = value;
      }
      setGroupsUnauthorized(value) {
        this.groupsUnauthorized = value;
      }
      setMemberSyncGroupIds(value) {
        this.memberSyncGroupIds = value;
      }
      async listCapabilities() {
        return buildInventoryCapabilities({
          granted: !this.connectionFailed,
          availableInTenant: !this.connectionFailed,
          lastTestedAt: this.lastTestedAt,
          overrides: this.groupsUnauthorized ? {
            [CAPABILITY_IDS.groupsRead]: { granted: false },
            [CAPABILITY_IDS.groupMembersRead]: { granted: false }
          } : void 0
        });
      }
      async listUsers(options) {
        this.assertConnected("users");
        if (!options?.nextLink) {
          const page = parseUserPage(loadFixtureJson("users-page1"));
          return { items: page.items, nextLink: DEMO_USERS_PAGE2_TOKEN };
        }
        if (options.nextLink === DEMO_USERS_PAGE2_TOKEN || options.nextLink.includes("demo-page-2")) {
          return parseUserPage(loadFixtureJson("users-page2"));
        }
        throw new ConnectionFailed(`Demo provider: unrecognized users nextLink ${options.nextLink}`);
      }
      async listGroups(options) {
        this.assertConnected("groups");
        this.assertGroupsAuthorized("groups");
        if (options?.nextLink) {
          throw new ConnectionFailed(`Demo provider: groups pagination not used (${options.nextLink})`);
        }
        return parseGroupPage(loadFixtureJson("groups"));
      }
      async listGroupMembers(groupId, options) {
        this.assertConnected("group_members");
        this.assertGroupsAuthorized("group_members");
        if (options?.nextLink) {
          throw new ConnectionFailed(
            `Demo provider: group member pagination not used (${options.nextLink})`
          );
        }
        if (!this.shouldSyncMembersFor(groupId)) {
          return { items: [], nextLink: null };
        }
        const all = loadFixtureJson("group-members");
        const page = all[groupId];
        if (!page) {
          return { items: [], nextLink: null };
        }
        return parseGroupMemberPage(page);
      }
      async listSubscribedSkus(options) {
        this.assertConnected("subscribed_skus");
        if (options?.nextLink) {
          throw new ConnectionFailed(`Demo provider: SKU pagination not used (${options.nextLink})`);
        }
        return parseSkuPage(loadFixtureJson("skus"));
      }
      shouldSyncMembersFor(groupId) {
        if (this.memberSyncGroupIds === "all") return true;
        if (this.memberSyncGroupIds === "none") return false;
        return this.memberSyncGroupIds.includes(groupId);
      }
      assertConnected(collection) {
        if (this.connectionFailed) {
          throw new ConnectionFailed(
            `Demo provider: connection failure simulated for ${collection}. Toggle setConnectionFailed(false) to recover.`
          );
        }
      }
      assertGroupsAuthorized(collection) {
        if (this.groupsUnauthorized) {
          throw new UnauthorizedCollection(
            `Demo provider: ${collection} inaccessible \u2014 capability denied (synthetic UnauthorizedCollection mode).`,
            collection
          );
        }
      }
    };
  }
});

// packages/integrations/src/microsoft-provider.ts
async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
function truncate(text, max = 400) {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}\u2026`;
}
function parseRetryAfter(header) {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    return Math.max(0, Math.ceil((date - Date.now()) / 1e3));
  }
  return null;
}
function looksLikeTokenExpiry(body, response) {
  const www = response.headers.get("WWW-Authenticate") ?? "";
  const haystack = `${body} ${www}`.toLowerCase();
  return haystack.includes("invalid_token") || haystack.includes("expired") || haystack.includes("lifetimevalidationfailed");
}
var MicrosoftInventoryProvider;
var init_microsoft_provider = __esm({
  "packages/integrations/src/microsoft-provider.ts"() {
    "use strict";
    init_capabilities();
    init_errors2();
    init_parse();
    MicrosoftInventoryProvider = class {
      kind = "microsoft";
      label = "Microsoft Graph inventory (app-only; live only with credentials)";
      credentials;
      fetchImpl;
      graphBaseUrl;
      loginBaseUrl;
      getAccessTokenOverride;
      grantedWhenConnected;
      lastTestedAt;
      tokenCache = null;
      constructor(options = {}) {
        this.credentials = options.credentials ?? null;
        this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
        this.graphBaseUrl = (options.graphBaseUrl ?? "https://graph.microsoft.com/v1.0").replace(
          /\/$/,
          ""
        );
        this.loginBaseUrl = (options.loginBaseUrl ?? "https://login.microsoftonline.com").replace(
          /\/$/,
          ""
        );
        this.getAccessTokenOverride = options.getAccessToken;
        this.grantedWhenConnected = options.grantedCapabilities ?? true;
        this.lastTestedAt = options.lastTestedAt ?? null;
      }
      hasCredentials() {
        return Boolean(
          this.credentials?.tenantId && this.credentials.clientId && this.credentials.clientSecret
        );
      }
      async listCapabilities() {
        const connected = this.hasCredentials();
        return buildInventoryCapabilities({
          granted: connected && this.grantedWhenConnected,
          availableInTenant: connected && this.grantedWhenConnected,
          lastTestedAt: this.lastTestedAt
        });
      }
      async listUsers(options) {
        const url = options?.nextLink ?? `${this.graphBaseUrl}/users?$select=${USER_SELECT_FIELDS.join(",")}`;
        return parseUserPage(await this.graphGetJson(url, "users"));
      }
      async listGroups(options) {
        const url = options?.nextLink ?? `${this.graphBaseUrl}/groups?$select=${GROUP_SELECT_FIELDS.join(",")}`;
        return parseGroupPage(await this.graphGetJson(url, "groups"));
      }
      async listGroupMembers(groupId, options) {
        const url = options?.nextLink ?? `${this.graphBaseUrl}/groups/${encodeURIComponent(groupId)}/members`;
        return parseGroupMemberPage(await this.graphGetJson(url, "group_members"));
      }
      async listSubscribedSkus(options) {
        const url = options?.nextLink ?? `${this.graphBaseUrl}/subscribedSkus`;
        return parseSkuPage(await this.graphGetJson(url, "subscribed_skus"));
      }
      /** Clear cached token (e.g. after TokenExpired so the next call re-acquires). */
      clearTokenCache() {
        this.tokenCache = null;
      }
      assertCredentials() {
        if (!this.hasCredentials() || !this.credentials) {
          throw new ConnectionFailed(
            "MicrosoftInventoryProvider: no client credentials configured. Refusing live Graph calls. Supply tenantId/clientId/clientSecret via secure config, or use DemoInventoryProvider / an injectable fetch for fixture tests. Live tenant verification remains blocked until an authorized test tenant is provided."
          );
        }
        return this.credentials;
      }
      async graphGetJson(url, collection) {
        this.assertCredentials();
        const token = await this.acquireAccessToken();
        let response;
        try {
          response = await this.fetchImpl(url, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json"
            }
          });
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          throw new ConnectionFailed(
            `Microsoft Graph request failed for ${collection}: ${detail}`
          );
        }
        return this.handleGraphResponse(response, collection);
      }
      async handleGraphResponse(response, collection) {
        if (response.status === 401) {
          this.tokenCache = null;
          const body = await safeReadText(response);
          if (looksLikeTokenExpiry(body, response)) {
            throw new TokenExpired(
              `Microsoft Graph token expired or invalid for ${collection}: ${truncate(body)}`
            );
          }
          throw new TokenExpired(
            `Microsoft Graph returned 401 for ${collection}: ${truncate(body)}`
          );
        }
        if (response.status === 403) {
          const body = await safeReadText(response);
          throw new UnauthorizedCollection(
            `Microsoft Graph denied ${collection}: ${truncate(body)}`,
            collection
          );
        }
        if (response.status === 429) {
          const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
          const body = await safeReadText(response);
          throw new Throttled(
            `Microsoft Graph throttled ${collection}: ${truncate(body)}`,
            retryAfter
          );
        }
        if (!response.ok) {
          const body = await safeReadText(response);
          throw new ConnectionFailed(
            `Microsoft Graph ${response.status} for ${collection}: ${truncate(body)}`
          );
        }
        return response.json();
      }
      async acquireAccessToken() {
        if (this.getAccessTokenOverride) {
          return this.getAccessTokenOverride();
        }
        const creds = this.assertCredentials();
        const now = Date.now();
        if (this.tokenCache && this.tokenCache.expiresAtMs > now + 6e4) {
          return this.tokenCache.accessToken;
        }
        const tokenUrl = `${this.loginBaseUrl}/${encodeURIComponent(creds.tenantId)}/oauth2/v2.0/token`;
        const body = new URLSearchParams({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials"
        });
        let response;
        try {
          response = await this.fetchImpl(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body
          });
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          throw new ConnectionFailed(`Microsoft token request failed: ${detail}`);
        }
        if (!response.ok) {
          const text = await safeReadText(response);
          if (response.status === 401 || response.status === 400) {
            throw new TokenExpired(`Microsoft token endpoint rejected credentials: ${truncate(text)}`);
          }
          throw new ConnectionFailed(
            `Microsoft token endpoint ${response.status}: ${truncate(text)}`
          );
        }
        const json = await response.json();
        if (!json.access_token) {
          throw new ConnectionFailed("Microsoft token endpoint returned no access_token");
        }
        const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
        this.tokenCache = {
          accessToken: json.access_token,
          expiresAtMs: now + expiresIn * 1e3
        };
        return json.access_token;
      }
    };
  }
});

// packages/integrations/src/lifecycle.ts
function graphGroupMemberRefUrl(graphBaseUrl, groupId, userId) {
  const base = graphBaseUrl.replace(/\/$/, "");
  return `${base}/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/$ref`;
}
function assertLifecycleCredentials(hasCredentials, action) {
  if (!hasCredentials) {
    throw new ConnectionFailed(
      `Refusing live Graph ${action}: Microsoft inventory/action credentials are not configured`
    );
  }
}
var init_lifecycle2 = __esm({
  "packages/integrations/src/lifecycle.ts"() {
    "use strict";
    init_errors2();
  }
});

// packages/integrations/src/demo-lifecycle.ts
var DemoLifecycleProvider;
var init_demo_lifecycle = __esm({
  "packages/integrations/src/demo-lifecycle.ts"() {
    "use strict";
    DemoLifecycleProvider = class {
      kind = "demo";
      label = "Demo Microsoft lifecycle (synthetic; not live Graph)";
      users = /* @__PURE__ */ new Map();
      members = /* @__PURE__ */ new Map();
      licenses = /* @__PURE__ */ new Map();
      failOn;
      constructor(options = {}) {
        this.failOn = options.failOn ?? null;
      }
      setFailOn(failOn) {
        this.failOn = failOn;
      }
      ok(externalId, evidence, verified = false) {
        return { accepted: true, verified, externalId, evidence };
      }
      async createUser(input) {
        if (this.failOn === "createUser") {
          throw new Error("Demo provider refused createUser");
        }
        const existing = [...this.users.values()].find((u) => u.userPrincipalName === input.userPrincipalName);
        if (existing) {
          return this.ok(existing.id, `Reconciled existing demo user ${existing.userPrincipalName}`, true);
        }
        const id = `demo-user-${this.users.size + 1}`;
        this.users.set(id, {
          id,
          userPrincipalName: input.userPrincipalName,
          enabled: input.accountEnabled !== false
        });
        return this.ok(id, `Demo accepted createUser ${input.userPrincipalName} usageLocation=${input.usageLocation ?? "unset"}`);
      }
      async findUserByUpn(upn) {
        return [...this.users.values()].find((u) => u.userPrincipalName.toLowerCase() === upn.toLowerCase()) ?? null;
      }
      async addGroupMember(groupId, userId) {
        if (this.failOn === "addGroupMember") {
          throw new Error("Demo provider refused addGroupMember");
        }
        const set = this.members.get(groupId) ?? /* @__PURE__ */ new Set();
        set.add(userId);
        this.members.set(groupId, set);
        return this.ok(userId, `Demo accepted add member ${userId} \u2192 ${groupId}`);
      }
      async removeGroupMember(groupId, userId) {
        this.members.get(groupId)?.delete(userId);
        return this.ok(userId, `Demo accepted DELETE members/$ref for ${userId} in ${groupId}`);
      }
      async assignLicense(userId, skuId) {
        if (this.failOn === "assignLicense") {
          throw new Error("Demo provider refused assignLicense (capacity or SKU)");
        }
        const set = this.licenses.get(userId) ?? /* @__PURE__ */ new Set();
        set.add(skuId);
        this.licenses.set(userId, set);
        return this.ok(skuId, `Demo accepted license ${skuId} for ${userId}`);
      }
      async removeLicense(userId, skuId) {
        this.licenses.get(userId)?.delete(skuId);
        return this.ok(skuId, `Demo accepted license removal ${skuId} for ${userId}`);
      }
      async disableAccount(userId) {
        const user = this.users.get(userId);
        if (user) user.enabled = false;
        return this.ok(userId, `Demo accepted disable ${userId}`);
      }
      async revokeSessions(userId) {
        return this.ok(
          userId,
          "Demo accepted revokeSignInSessions; this records provider acceptance, not instant end of every session"
        );
      }
    };
  }
});

// packages/integrations/src/microsoft-lifecycle.ts
var MicrosoftLifecycleProvider;
var init_microsoft_lifecycle = __esm({
  "packages/integrations/src/microsoft-lifecycle.ts"() {
    "use strict";
    init_errors2();
    init_lifecycle2();
    MicrosoftLifecycleProvider = class {
      kind = "microsoft";
      label = "Microsoft Graph lifecycle (live only with authorized credentials)";
      credentials;
      fetchImpl;
      graphBaseUrl;
      getAccessToken;
      constructor(options = {}) {
        this.credentials = options.credentials ?? null;
        this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
        this.graphBaseUrl = (options.graphBaseUrl ?? "https://graph.microsoft.com/v1.0").replace(/\/$/, "");
        this.getAccessToken = options.getAccessToken;
      }
      ensureLive(action) {
        assertLifecycleCredentials(Boolean(this.credentials) || Boolean(this.getAccessToken), action);
      }
      async token() {
        if (this.getAccessToken) return this.getAccessToken();
        throw new ConnectionFailed("Token acquisition is not configured for Microsoft lifecycle writes");
      }
      async graph(path3, init) {
        this.ensureLive(path3);
        const token = await this.token();
        return this.fetchImpl(`${this.graphBaseUrl}${path3}`, {
          ...init,
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
            ...init.headers ?? {}
          }
        });
      }
      memberRefUrl(groupId, userId) {
        return graphGroupMemberRefUrl(this.graphBaseUrl, groupId, userId);
      }
      async createUser(input) {
        const response = await this.graph("/users", {
          method: "POST",
          body: JSON.stringify({
            accountEnabled: input.accountEnabled !== false,
            displayName: input.displayName,
            mailNickname: input.mailNickname,
            userPrincipalName: input.userPrincipalName,
            usageLocation: input.usageLocation,
            passwordProfile: { forceChangePasswordNextSignIn: true, password: crypto.randomUUID() }
          })
        });
        if (!response.ok) {
          throw new ConnectionFailed(`Graph createUser failed (${response.status})`);
        }
        const body = await response.json();
        return {
          accepted: true,
          verified: false,
          externalId: body.id ?? null,
          evidence: "Graph accepted POST /users (verification is a later observation)"
        };
      }
      async findUserByUpn(upn) {
        this.ensureLive("findUserByUpn");
        const filter = encodeURIComponent(`userPrincipalName eq '${upn.replaceAll("'", "''")}'`);
        const response = await this.graph(`/users?$filter=${filter}&$select=id,userPrincipalName`, { method: "GET" });
        if (!response.ok) return null;
        const body = await response.json();
        return body.value?.[0] ?? null;
      }
      async addGroupMember(groupId, userId) {
        const response = await this.graph(`/groups/${encodeURIComponent(groupId)}/members/$ref`, {
          method: "POST",
          body: JSON.stringify({
            "@odata.id": `${this.graphBaseUrl}/directoryObjects/${userId}`
          })
        });
        if (!response.ok) throw new ConnectionFailed(`Graph add member failed (${response.status})`);
        return { accepted: true, verified: false, externalId: userId, evidence: "Graph accepted POST members/$ref" };
      }
      async removeGroupMember(groupId, userId) {
        const url = this.memberRefUrl(groupId, userId);
        this.ensureLive("removeGroupMember");
        const token = await this.token();
        const response = await this.fetchImpl(url, {
          method: "DELETE",
          headers: { authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new ConnectionFailed(`Graph remove member failed (${response.status})`);
        return {
          accepted: true,
          verified: false,
          externalId: userId,
          evidence: `Graph accepted DELETE ${url}`
        };
      }
      async assignLicense(userId, skuId) {
        const response = await this.graph(`/users/${encodeURIComponent(userId)}/assignLicense`, {
          method: "POST",
          body: JSON.stringify({ addLicenses: [{ skuId, disabledPlans: [] }], removeLicenses: [] })
        });
        if (!response.ok) throw new ConnectionFailed(`Graph assignLicense failed (${response.status})`);
        return { accepted: true, verified: false, externalId: skuId, evidence: "Graph accepted assignLicense add" };
      }
      async removeLicense(userId, skuId) {
        const response = await this.graph(`/users/${encodeURIComponent(userId)}/assignLicense`, {
          method: "POST",
          body: JSON.stringify({ addLicenses: [], removeLicenses: [skuId] })
        });
        if (!response.ok) throw new ConnectionFailed(`Graph assignLicense remove failed (${response.status})`);
        return { accepted: true, verified: false, externalId: skuId, evidence: "Graph accepted assignLicense remove" };
      }
      async disableAccount(userId) {
        const response = await this.graph(`/users/${encodeURIComponent(userId)}`, {
          method: "PATCH",
          body: JSON.stringify({ accountEnabled: false })
        });
        if (!response.ok) throw new ConnectionFailed(`Graph disable failed (${response.status})`);
        return { accepted: true, verified: false, externalId: userId, evidence: "Graph accepted PATCH accountEnabled=false" };
      }
      async revokeSessions(userId) {
        const response = await this.graph(`/users/${encodeURIComponent(userId)}/revokeSignInSessions`, {
          method: "POST",
          body: "{}"
        });
        if (!response.ok) throw new ConnectionFailed(`Graph revokeSignInSessions failed (${response.status})`);
        return {
          accepted: true,
          verified: false,
          externalId: userId,
          evidence: "Graph accepted revokeSignInSessions; this is not proof every session everywhere ended instantly"
        };
      }
    };
  }
});

// packages/integrations/src/index.ts
var init_src3 = __esm({
  "packages/integrations/src/index.ts"() {
    "use strict";
    init_types();
    init_errors2();
    init_observations();
    init_capabilities();
    init_demo_provider();
    init_microsoft_provider();
    init_parse();
    init_fixtures();
    init_lifecycle2();
    init_demo_lifecycle();
    init_microsoft_lifecycle();
  }
});

// packages/db/src/run-sync.ts
import { randomUUID as randomUUID7 } from "node:crypto";
function classifyGroup(group) {
  if (group.membershipRule || group.groupTypes.includes("DynamicMembership")) {
    return { groupType: "manual", membershipCapability: "dynamic" };
  }
  if (group.groupTypes.includes("Unified")) {
    return { groupType: "microsoft_365", membershipCapability: "direct" };
  }
  if (group.securityEnabled && group.mailEnabled) {
    return { groupType: "mail_enabled_security", membershipCapability: "direct" };
  }
  if (group.securityEnabled) {
    return { groupType: "security", membershipCapability: "direct" };
  }
  if (group.mailEnabled) {
    return { groupType: "distribution", membershipCapability: "direct" };
  }
  return { groupType: "manual", membershipCapability: "direct" };
}
async function ensureObservedProduct(client, organizationId, skuPartNumber) {
  const existing = await client.query(
    `SELECT id FROM products
     WHERE organization_id = $1 AND name ILIKE $2
     LIMIT 1`,
    [organizationId, `%${skuPartNumber}%`]
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const m365 = await client.query(
    `SELECT id FROM products
     WHERE organization_id = $1 AND (name ILIKE '%Microsoft 365%' OR name ILIKE '%M365%')
     LIMIT 1`,
    [organizationId]
  );
  if (m365.rows[0]) return m365.rows[0].id;
  const id = randomUUID7();
  await client.query(
    `INSERT INTO products (
      id, organization_id, name, vendor, category, assignment_model, documentation_url
    ) VALUES ($1,$2,$3,'Microsoft','productivity','named_user',NULL)`,
    [id, organizationId, `Observed SKU ${skuPartNumber}`]
  );
  return id;
}
function providerForConnection(connection) {
  if (connection.provider_kind === "demo") {
    return new DemoInventoryProvider({
      connectionFailed: connection.failure_mode === "connection_failed",
      groupsUnauthorized: connection.failure_mode === "deny_groups",
      memberSyncGroupIds: connection.failure_mode === "partial_memberships" ? ["bbbbbbbb-0002-4000-8000-000000000001"] : "all"
    });
  }
  const clientId = process.env.MICROSOFT_INVENTORY_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_INVENTORY_CLIENT_SECRET;
  const tenantId = connection.tenant_id ?? process.env.MICROSOFT_TENANT_ID;
  return new MicrosoftInventoryProvider({
    credentials: tenantId && clientId && clientSecret ? { tenantId, clientId, clientSecret } : null
  });
}
async function paginateUsers(provider) {
  const items = [];
  let page = 0;
  let nextLink;
  do {
    const result = await provider.listUsers(nextLink ? { nextLink } : void 0);
    items.push(...result.items);
    page += 1;
    nextLink = result.nextLink;
  } while (nextLink && page < 50);
  return { items, pageCount: page };
}
async function runConnectionSync(client, input) {
  const connection = await getConnection(
    client,
    input.organizationId,
    input.companyId,
    input.connectionId
  );
  if (!connection) {
    throw new Error("Connection not found");
  }
  const collections = input.collections ?? [
    "capabilities",
    "users",
    "groups",
    "group_memberships",
    "subscribed_skus"
  ];
  const provider = providerForConnection(connection);
  const source = connection.provider_kind;
  const results = [];
  for (const collection of collections) {
    const run = await createSyncRun(client, {
      organizationId: input.organizationId,
      companyId: input.companyId,
      connectionId: connection.id,
      collection,
      status: "running",
      correlationId: input.correlationId
    });
    try {
      if (collection === "capabilities") {
        const caps = await provider.listCapabilities();
        await finishSyncRun(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          syncRunId: run.id,
          status: "succeeded",
          itemCount: caps.length,
          pageCount: 1
        });
        await upsertCollectionState(client, {
          connectionId: connection.id,
          collection,
          succeeded: true
        });
        results.push({ collection, status: "succeeded", itemCount: caps.length });
        continue;
      }
      if (collection === "users") {
        const { items, pageCount } = await paginateUsers(provider);
        const applied = await applyAccountObservations(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          providerSource: source,
          observations: items.map((user) => ({
            externalId: user.id,
            loginName: user.userPrincipalName || user.mail || user.id,
            enabledState: user.accountEnabled === false ? "disabled" : user.accountEnabled === true ? "enabled" : "unknown",
            freshnessNote: `Last ${source} observation via connection ${connection.id}`
          }))
        });
        await createPersonLinkProposals(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          accounts: items.flatMap((user) => {
            const account = applied.find((row) => row.externalId === user.id);
            if (!account) return [];
            return [
              {
                accountId: account.id,
                mail: user.mail,
                loginName: user.userPrincipalName
              }
            ];
          })
        });
        await finishSyncRun(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          syncRunId: run.id,
          status: "succeeded",
          itemCount: items.length,
          pageCount
        });
        await upsertCollectionState(client, {
          connectionId: connection.id,
          collection,
          succeeded: true
        });
        results.push({ collection, status: "succeeded", itemCount: items.length });
        continue;
      }
      if (collection === "groups") {
        const page = await provider.listGroups();
        await applyGroupObservations(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          source,
          observations: page.items.map((group) => {
            const classified = classifyGroup(group);
            return {
              externalId: group.id,
              displayName: group.displayName ?? group.id,
              emailAddress: group.mail,
              groupType: classified.groupType,
              membershipCapability: classified.membershipCapability
            };
          })
        });
        await finishSyncRun(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          syncRunId: run.id,
          status: "succeeded",
          itemCount: page.items.length,
          pageCount: 1
        });
        await upsertCollectionState(client, {
          connectionId: connection.id,
          collection,
          succeeded: true
        });
        results.push({ collection, status: "succeeded", itemCount: page.items.length });
        continue;
      }
      if (collection === "group_memberships") {
        const page = await provider.listGroups();
        await applyGroupObservations(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          source,
          observations: page.items.map((group) => {
            const classified = classifyGroup(group);
            return {
              externalId: group.id,
              displayName: group.displayName ?? group.id,
              emailAddress: group.mail,
              groupType: classified.groupType,
              membershipCapability: classified.membershipCapability
            };
          })
        });
        const membershipObs = [];
        for (const group of page.items) {
          const members = await provider.listGroupMembers(group.id);
          for (const member of members.items) {
            membershipObs.push({
              groupExternalId: group.id,
              accountExternalId: member.userId,
              membershipKind: "direct",
              verificationSource: `${source}_sync`
            });
          }
        }
        const applied = await applyMembershipObservations(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          providerSource: source,
          observations: membershipObs,
          partial: true
        });
        await finishSyncRun(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          syncRunId: run.id,
          status: "succeeded",
          itemCount: applied.length,
          pageCount: 1
        });
        await upsertCollectionState(client, {
          connectionId: connection.id,
          collection,
          succeeded: true
        });
        results.push({ collection, status: "succeeded", itemCount: applied.length });
        continue;
      }
      if (collection === "subscribed_skus") {
        const page = await provider.listSubscribedSkus();
        const observations = [];
        for (const sku of page.items) {
          const productId = await ensureObservedProduct(
            client,
            input.organizationId,
            sku.skuPartNumber || sku.skuId
          );
          observations.push({
            productId,
            providerSku: sku.skuPartNumber || sku.skuId,
            purchasedQuantity: sku.prepaidUnits.enabled ?? 0,
            consumedQuantity: sku.consumedUnits ?? 0,
            freshnessNote: `Observed ${sku.skuPartNumber} via ${source} (not a purchase price)`
          });
        }
        await applySkuObservations(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          source,
          observations
        });
        await finishSyncRun(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          syncRunId: run.id,
          status: "succeeded",
          itemCount: page.items.length,
          pageCount: 1
        });
        await upsertCollectionState(client, {
          connectionId: connection.id,
          collection,
          succeeded: true
        });
        results.push({ collection, status: "succeeded", itemCount: page.items.length });
      }
    } catch (error) {
      const code = error instanceof ProviderError ? error.code : "sync_failed";
      const message = error instanceof Error ? error.message : "Sync failed";
      await finishSyncRun(client, {
        organizationId: input.organizationId,
        companyId: input.companyId,
        syncRunId: run.id,
        status: "failed",
        errorCode: code,
        errorMessage: message
      });
      await upsertCollectionState(client, {
        connectionId: connection.id,
        collection,
        succeeded: false,
        lastError: message
      });
      results.push({ collection, status: "failed", itemCount: 0, error: message });
    }
  }
  const anySuccess = results.some((row) => row.status === "succeeded");
  const anyFail = results.some((row) => row.status === "failed");
  await updateConnectionStatus(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    connectionId: connection.id,
    status: anyFail && !anySuccess ? "error" : "connected",
    lastError: anyFail ? results.find((r) => r.error)?.error ?? "partial sync errors" : null,
    lastSuccessAt: anySuccess ? /* @__PURE__ */ new Date() : null,
    version: connection.version
  });
  return { runs: results };
}
var init_run_sync = __esm({
  "packages/db/src/run-sync.ts"() {
    "use strict";
    init_src3();
    init_provider_sync();
  }
});

// packages/db/src/run-workflow.ts
function demoLifecycleFor(organizationId) {
  const existing = demoByOrg.get(organizationId);
  if (existing) return existing;
  const created = new DemoLifecycleProvider();
  demoByOrg.set(organizationId, created);
  return created;
}
function resetDemoLifecycle(organizationId) {
  if (organizationId) demoByOrg.delete(organizationId);
  else demoByOrg.clear();
}
function lifecycleProviderFor(kind) {
  if (kind === "microsoft") {
    const tenantId = process.env.MICROSOFT_TENANT_ID;
    const clientId = process.env.MICROSOFT_INVENTORY_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_INVENTORY_CLIENT_SECRET;
    if (tenantId && clientId && clientSecret) {
      return new MicrosoftLifecycleProvider({
        credentials: { tenantId, clientId, clientSecret }
      });
    }
    return new MicrosoftLifecycleProvider();
  }
  return demoLifecycleFor("default");
}
async function subscriptionCapacity(client, organizationId, companyId) {
  const result = await client.query(
    `SELECT s.id, s.product_id, p.name AS product_name, s.purchased_quantity,
            (SELECT COUNT(*)::text FROM license_assignments la
             WHERE la.subscription_id = s.id AND la.status IN ('active', 'removal_pending')) AS consumed
     FROM subscriptions s
     JOIN products p ON p.id = s.product_id
     WHERE s.organization_id = $1 AND s.company_id = $2 AND s.state = 'active'`,
    [organizationId, companyId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    purchasedQuantity: row.purchased_quantity,
    consumedQuantity: Number(row.consumed)
  }));
}
async function previewOnboarding(client, input) {
  const person = await getPerson(client, input.organizationId, input.companyId, input.personId);
  if (!person) throw new NotFoundError("Person not found");
  const version = await getTemplateVersion(client, input.organizationId, input.templateVersionId);
  if (!version || version.template_id !== input.templateId) {
    throw new NotFoundError("Template version not found");
  }
  const bindings = await listCompanyBindings(
    client,
    input.organizationId,
    input.companyId,
    input.templateId
  );
  const groups = await listGroups(client, input.organizationId, input.companyId);
  const plan = buildOnboardingPlan({
    companyId: input.companyId,
    personId: input.personId,
    personEmail: person.work_email,
    personDisplayName: person.display_name,
    templateId: input.templateId,
    templateVersionId: version.id,
    templateVersionNumber: version.version_number,
    intents: version.intents,
    bindings: bindings.map((b) => ({
      bindingKey: b.binding_key,
      resourceType: b.resource_type,
      resourceId: b.resource_id
    })),
    groups: groups.map((g) => ({
      id: g.id,
      displayName: g.display_name,
      groupType: g.group_type,
      membershipCapability: g.membership_capability,
      externalId: g.external_id
    })),
    subscriptions: await subscriptionCapacity(client, input.organizationId, input.companyId),
    usageLocation: input.usageLocation ?? "US"
  });
  const run = await insertWorkflowRun(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    personId: input.personId,
    kind: "onboarding",
    templateId: input.templateId,
    templateVersionId: version.id,
    frozenPlan: plan,
    idempotencyKey: input.idempotencyKey,
    actorStaffUserId: input.actorStaffUserId,
    correlationId: input.correlationId
  });
  return { run, plan };
}
async function previewOffboarding(client, input) {
  const profile = await loadPersonProfile(client, input.organizationId, input.companyId, input.personId);
  if (!profile) throw new NotFoundError("Person not found");
  const groups = await listGroups(client, input.organizationId, input.companyId);
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const plan = buildOffboardingPlan({
    companyId: input.companyId,
    personId: input.personId,
    accounts: profile.accounts.map((a) => ({
      id: a.id,
      loginName: a.login_name,
      accountKind: a.account_kind,
      enabledState: a.enabled_state,
      externalId: a.external_id
    })),
    memberships: profile.groupMemberships.filter((m) => m.status === "active").map((m) => ({
      id: m.id,
      groupId: m.group_id,
      groupName: m.group_name,
      groupType: m.group_type,
      membershipCapability: groupById.get(m.group_id)?.membership_capability ?? "direct",
      membershipKind: m.membership_kind,
      accountId: m.account_id
    })),
    assignments: profile.assignments.map((a) => ({
      id: a.id,
      productName: a.product_name,
      assignedByGroup: false,
      status: a.status
    })),
    mailboxAccess: profile.mailboxAccess.filter((m) => m.status === "active").map((m) => ({ id: m.id, mailboxAddress: m.mailbox_address }))
  });
  const run = await insertWorkflowRun(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    personId: input.personId,
    kind: "offboarding",
    frozenPlan: plan,
    idempotencyKey: input.idempotencyKey,
    actorStaffUserId: input.actorStaffUserId,
    correlationId: input.correlationId
  });
  return { run, plan };
}
async function previewStatusChange(client, input) {
  const person = await getPerson(client, input.organizationId, input.companyId, input.personId);
  if (!person) throw new NotFoundError("Person not found");
  const plan = buildStatusChangePlan({
    companyId: input.companyId,
    personId: input.personId,
    fromStatus: person.it_status,
    toStatus: input.toStatus,
    departureDate: input.departureDate
  });
  const run = await insertWorkflowRun(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    personId: input.personId,
    kind: "status_change",
    frozenPlan: plan,
    idempotencyKey: input.idempotencyKey,
    actorStaffUserId: input.actorStaffUserId
  });
  return { run, plan };
}
async function approveWorkflowRun(client, input) {
  const run = await getWorkflowRun(client, input.organizationId, input.companyId, input.runId);
  if (!run) throw new NotFoundError("Workflow run not found");
  if (run.status !== "preview") throw new UnprocessableError("Only a previewed run can be approved");
  if (!planIsApprovable(run.frozen_plan)) {
    throw new UnprocessableError("Plan has blocking issues and cannot be approved");
  }
  await updateRunStatus(client, run.id, "approved", { approvedAt: true });
  const person = await getPerson(client, input.organizationId, input.companyId, run.person_id);
  if (person && (run.kind === "offboarding" || run.kind === "onboarding")) {
    const badge = run.kind === "offboarding" ? "offboarding_in_progress" : "onboarding_in_progress";
    const itStatus = run.kind === "offboarding" ? "departed" : person.it_status;
    await updatePerson(client, {
      organizationId: input.organizationId,
      companyId: input.companyId,
      personId: person.id,
      version: person.version,
      itStatus,
      workflowBadge: badge
    });
  }
  await insertTimelineEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    entityType: "workflow_run",
    entityId: run.id,
    eventKind: "workflow.approved",
    actorStaffUserId: run.actor_staff_user_id,
    source: "workflow",
    summary: `Approved ${run.kind} plan (template version ${run.frozen_plan.templateVersionNumber ?? "none"} frozen)`
  });
  const updated = await getWorkflowRun(client, input.organizationId, input.companyId, run.id);
  return updated;
}
async function cancelWorkflowRun(client, input) {
  const run = await getWorkflowRun(client, input.organizationId, input.companyId, input.runId);
  if (!run) throw new NotFoundError("Workflow run not found");
  const steps = await listWorkflowSteps(client, run.id);
  for (const step of steps) {
    if (step.status === "succeeded" || step.status === "skipped") continue;
    await updateStepStatus(client, step.id, "canceled", {
      error: "Canceled; completed work was not rolled back"
    });
  }
  await updateRunStatus(client, run.id, "canceled", { canceledAt: true });
}
async function assertExecutePermission(client, staffUserId) {
  const membership = await getMembership(client, staffUserId);
  if (!membership?.active) throw new ForbiddenError("Staff membership is inactive");
  if (membership.role !== "admin" && !membership.automation_execute) {
    throw new ForbiddenError("Automation execute permission is not granted");
  }
}
async function refreshRunStatus(client, run) {
  const steps = await listWorkflowSteps(client, run.id);
  const status = deriveRunStatus(steps.map((s) => s.status));
  await updateRunStatus(client, run.id, status);
}
async function fulfillManualStep(client, input) {
  const run = await getWorkflowRun(client, input.organizationId, input.companyId, input.runId);
  if (!run) throw new NotFoundError("Workflow run not found");
  const steps = await listWorkflowSteps(client, run.id);
  const step = steps.find((s) => s.id === input.stepId);
  if (!step) throw new NotFoundError("Step not found");
  if (step.execution_method !== "manual") {
    throw new UnprocessableError("Only manual steps can be fulfilled with evidence");
  }
  const evidence = `${input.evidence} \xB7 actor=${input.actorStaffUserId} \xB7 at=${(/* @__PURE__ */ new Date()).toISOString()} \xB7 method=operator_attestation`;
  await updateStepStatus(client, step.id, "succeeded", { evidence });
  await insertStepAttempt(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    runId: run.id,
    stepId: step.id,
    status: "succeeded",
    providerAccepted: false,
    verified: false,
    evidence
  });
  await refreshRunStatus(client, run);
}
async function executeWorkflowRun(client, input) {
  const run = await getWorkflowRun(client, input.organizationId, input.companyId, input.runId);
  if (!run) throw new NotFoundError("Workflow run not found");
  if (run.status === "canceled" || run.status === "preview") {
    throw new UnprocessableError("Run is not executable in its current status");
  }
  try {
    await assertExecutePermission(client, run.actor_staff_user_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execute permission denied";
    await insertNotification(client, {
      organizationId: input.organizationId,
      staffUserId: run.actor_staff_user_id,
      companyId: input.companyId,
      title: "Workflow blocked",
      body: message,
      runId: run.id
    });
    throw error;
  }
  const provider = input.provider ?? demoLifecycleFor(input.organizationId);
  const plan = run.frozen_plan;
  let guard = 0;
  while (guard < 20) {
    guard += 1;
    const steps = await listWorkflowSteps(client, run.id);
    const statusMap = {};
    for (const step of steps) statusMap[step.step_key] = step.status;
    const readyKeys = executableStepKeys(plan.steps, statusMap);
    const readyAuto = steps.filter((s) => readyKeys.includes(s.step_key) && s.execution_method !== "manual");
    const readyManual = steps.filter((s) => readyKeys.includes(s.step_key) && s.execution_method === "manual");
    for (const step of readyManual) {
      await updateStepStatus(client, step.id, "awaiting_manual");
    }
    if (readyAuto.length === 0) break;
    await updateRunStatus(client, run.id, "running");
    for (const step of readyAuto) {
      await executeOneStep(client, { run, step, provider, plan });
    }
  }
  await refreshRunStatus(client, run);
  const updated = await getWorkflowRun(client, input.organizationId, input.companyId, run.id);
  return updated;
}
async function executeOneStep(client, input) {
  const { run, step, provider } = input;
  if (step.status === "succeeded" || step.status === "skipped") return;
  await updateStepStatus(client, step.id, "running");
  await insertStepAttempt(client, {
    organizationId: run.organization_id,
    companyId: run.company_id,
    runId: run.id,
    stepId: step.id,
    status: "running"
  });
  try {
    const evidence = await applyStep(client, provider, run, step);
    await updateStepStatus(client, step.id, "succeeded", { evidence });
    await insertStepAttempt(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      runId: run.id,
      stepId: step.id,
      status: "succeeded",
      providerAccepted: true,
      verified: evidence.includes("verified") || evidence.includes("Reconciled"),
      evidence
    });
    await insertTimelineEvent(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      entityType: "workflow_step",
      entityId: step.id,
      eventKind: `workflow.${step.kind}`,
      actorStaffUserId: run.actor_staff_user_id,
      source: "workflow",
      summary: step.summary
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateStepStatus(client, step.id, "failed", { error: message });
    await insertStepAttempt(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      runId: run.id,
      stepId: step.id,
      status: "failed",
      error: message
    });
    await insertNotification(client, {
      organizationId: run.organization_id,
      staffUserId: run.actor_staff_user_id,
      companyId: run.company_id,
      title: "Workflow step failed",
      body: `${step.summary}: ${message}`,
      runId: run.id
    });
  }
}
async function linkedAccount(client, run) {
  const accounts = await listAccounts(client, run.organization_id, run.company_id, {
    personId: run.person_id
  });
  return accounts[0] ?? null;
}
async function applyStep(client, provider, run, step) {
  const person = await getPerson(client, run.organization_id, run.company_id, run.person_id);
  if (!person) throw new NotFoundError("Person not found");
  const params = step.params;
  if (step.kind === "create_account") {
    const loginName = String(params.loginName ?? person.work_email);
    const existing = (await listAccounts(client, run.organization_id, run.company_id, { personId: person.id })).find(
      (a) => a.login_name.toLowerCase() === loginName.toLowerCase()
    );
    if (existing) {
      return `Reconciled existing account ${existing.id}; createUser not repeated`;
    }
    const found = await provider.findUserByUpn(loginName);
    const created = found ? { accepted: true, verified: true, externalId: found.id, evidence: `Reconciled provider user ${found.id}` } : await provider.createUser({
      userPrincipalName: loginName,
      displayName: String(params.displayName ?? person.display_name),
      mailNickname: loginName.split("@")[0] ?? "user",
      usageLocation: params.usageLocation ? String(params.usageLocation) : "US"
    });
    await createAccount(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      personId: person.id,
      loginName,
      accountKind: "human",
      providerSource: "workflow",
      externalId: created.externalId ?? null,
      enabledState: "enabled",
      freshnessNote: created.evidence
    });
    await insertWelcomePreview(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      runId: run.id,
      personId: person.id,
      displayName: person.display_name,
      loginName
    });
    return created.evidence;
  }
  if (step.kind === "add_group_membership") {
    const account = await linkedAccount(client, run);
    if (!account) throw new UnprocessableError("Account does not exist yet");
    const groupId = String(params.groupId);
    const group = await getGroup(client, run.organization_id, run.company_id, groupId);
    if (!group) throw new NotFoundError("Group not found");
    if (group.membership_capability !== "direct" || group.group_type === "distribution") {
      throw new UnprocessableError("Unsupported group mutation");
    }
    const already = await client.query(
      `SELECT id FROM group_memberships
       WHERE organization_id = $1 AND company_id = $2 AND group_id = $3 AND account_id = $4 AND status = 'active'`,
      [run.organization_id, run.company_id, groupId, account.id]
    );
    if (already.rows[0]) {
      return `Membership already present (${already.rows[0].id}); addGroupMember not repeated`;
    }
    const userId = account.external_id ?? account.id;
    const result = await provider.addGroupMember(group.external_id ?? group.id, userId);
    await createGroupMembership(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      groupId,
      accountId: account.id,
      membershipKind: "direct",
      verificationSource: "workflow"
    });
    return result.evidence;
  }
  if (step.kind === "assign_license") {
    const account = await linkedAccount(client, run);
    const subscriptionId = params.subscriptionId ? String(params.subscriptionId) : null;
    const existing = await client.query(
      `SELECT id FROM license_assignments
       WHERE organization_id = $1 AND company_id = $2 AND person_id = $3
         AND product_id = $4 AND status IN ('active', 'removal_pending')
         AND ($5::uuid IS NULL OR subscription_id = $5)
       LIMIT 1`,
      [run.organization_id, run.company_id, run.person_id, String(params.productId), subscriptionId]
    );
    if (existing.rows[0]) {
      return `Assignment ${existing.rows[0].id} already active; assignLicense not repeated`;
    }
    const result = await provider.assignLicense(
      account?.external_id ?? account?.id ?? "unknown",
      String(params.productId)
    );
    await assignLicense(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      personId: run.person_id,
      accountId: account?.id ?? null,
      productId: String(params.productId),
      subscriptionId: params.subscriptionId ? String(params.subscriptionId) : null,
      source: "workflow",
      actorStaffUserId: run.actor_staff_user_id
    });
    return result.evidence;
  }
  if (step.kind === "disable_account") {
    const accountId = String(params.accountId);
    const account = (await listAccounts(client, run.organization_id, run.company_id)).find((a) => a.id === accountId);
    if (!account) throw new NotFoundError("Account not found");
    const result = await provider.disableAccount(account.external_id ?? account.id);
    await updateAccount(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      accountId: account.id,
      version: account.version,
      enabledState: "disabled",
      freshnessNote: result.evidence
    });
    return result.evidence;
  }
  if (step.kind === "revoke_sessions") {
    const accountId = String(params.accountId);
    const account = (await listAccounts(client, run.organization_id, run.company_id)).find((a) => a.id === accountId);
    const result = await provider.revokeSessions(account?.external_id ?? accountId);
    return result.evidence;
  }
  if (step.kind === "remove_group_membership") {
    const membershipId = String(params.membershipId);
    const groupId = String(params.groupId);
    const accountId = String(params.accountId);
    const account = (await listAccounts(client, run.organization_id, run.company_id)).find((a) => a.id === accountId);
    const group = await getGroup(client, run.organization_id, run.company_id, groupId);
    const result = await provider.removeGroupMember(
      group?.external_id ?? groupId,
      account?.external_id ?? accountId
    );
    await endGroupMembership(client, run.organization_id, run.company_id, membershipId);
    return result.evidence;
  }
  if (step.kind === "remove_license") {
    const assignmentId = String(params.assignmentId);
    const assignment = await client.query(
      `SELECT version FROM license_assignments WHERE id = $1`,
      [assignmentId]
    );
    const version = assignment.rows[0]?.version;
    if (version == null) throw new NotFoundError("Assignment not found");
    const account = await linkedAccount(client, run);
    const result = await provider.removeLicense(account?.external_id ?? account?.id ?? "unknown", assignmentId);
    await endLicenseAssignment(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      assignmentId,
      version,
      status: "ended",
      actorStaffUserId: run.actor_staff_user_id
    });
    return result.evidence;
  }
  if (step.kind === "set_it_status") {
    const toStatus = String(params.toStatus);
    const badge = toStatus === "departed" ? "offboarding_in_progress" : toStatus === "active" ? null : person.workflow_badge;
    await updatePerson(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      personId: person.id,
      version: person.version,
      itStatus: toStatus,
      endDate: params.departureDate ? String(params.departureDate) : void 0,
      workflowBadge: badge
    });
    return `IT status set to ${toStatus}`;
  }
  throw new UnprocessableError(`Unsupported automated step ${step.kind}`);
}
async function retryFailedSteps(client, input) {
  const steps = await listWorkflowSteps(client, input.runId);
  for (const step of steps) {
    if (step.status === "failed") {
      await updateStepStatus(client, step.id, "pending", { error: null });
    }
  }
  return executeWorkflowRun(client, input);
}
var demoByOrg;
var init_run_workflow = __esm({
  "packages/db/src/run-workflow.ts"() {
    "use strict";
    init_src2();
    init_src3();
    init_inventory();
    init_lifecycle();
    init_queries();
    demoByOrg = /* @__PURE__ */ new Map();
  }
});

// packages/db/src/index.ts
var src_exports = {};
__export(src_exports, {
  addAffectedResource: () => addAffectedResource,
  addTemplateVersion: () => addTemplateVersion,
  appendPriceVersion: () => appendPriceVersion,
  applyAccountObservations: () => applyAccountObservations,
  applyGroupObservations: () => applyGroupObservations,
  applyMembershipObservations: () => applyMembershipObservations,
  applyMigrations: () => applyMigrations,
  applyPeopleImport: () => applyPeopleImport,
  applySkuObservations: () => applySkuObservations,
  approveWorkflowRun: () => approveWorkflowRun,
  archivePerson: () => archivePerson,
  asDateString: () => asDateString2,
  asIso: () => asIso,
  assertUploadAllowed: () => assertUploadAllowed,
  assignDevice: () => assignDevice,
  assignLicense: () => assignLicense,
  buildParsedSummary: () => buildParsedSummary,
  cancelWorkflowRun: () => cancelWorkflowRun,
  cloneDemoWorkspace: () => cloneDemoWorkspace,
  companyCostSummary: () => companyCostSummary,
  countDemoCreatesSince: () => countDemoCreatesSince,
  countOpenIncidents: () => countOpenIncidents,
  countPeopleOffboarding: () => countPeopleOffboarding,
  countStaleConnections: () => countStaleConnections,
  countUpcomingLifecycleReviews: () => countUpcomingLifecycleReviews,
  countWaitingWorkflowSteps: () => countWaitingWorkflowSteps,
  createAccount: () => createAccount,
  createConnection: () => createConnection,
  createDevice: () => createDevice,
  createGroup: () => createGroup,
  createGroupMembership: () => createGroupMembership,
  createImportBatch: () => createImportBatch,
  createIncident: () => createIncident,
  createInvestigationEntry: () => createInvestigationEntry,
  createMailbox: () => createMailbox,
  createMailboxAccess: () => createMailboxAccess,
  createPerson: () => createPerson,
  createPersonLinkProposals: () => createPersonLinkProposals,
  createPool: () => createPool,
  createProblem: () => createProblem,
  createProduct: () => createProduct,
  createRoleTemplate: () => createRoleTemplate,
  createSubscription: () => createSubscription,
  createSyncRun: () => createSyncRun,
  createWorkItem: () => createWorkItem,
  demoLifecycleFor: () => demoLifecycleFor,
  dismissRelatedSuggestion: () => dismissRelatedSuggestion,
  endGroupMembership: () => endGroupMembership,
  endLicenseAssignment: () => endLicenseAssignment,
  endMailboxAccess: () => endMailboxAccess,
  ensureStaffUser: () => ensureStaffUser,
  evidenceTotals: () => evidenceTotals,
  executeWorkflowRun: () => executeWorkflowRun,
  finishSyncRun: () => finishSyncRun,
  fulfillManualStep: () => fulfillManualStep,
  getAccount: () => getAccount,
  getArchiveReadiness: () => getArchiveReadiness,
  getCompany: () => getCompany,
  getConnection: () => getConnection,
  getDevice: () => getDevice,
  getEvidence: () => getEvidence,
  getFileObject: () => getFileObject,
  getGroup: () => getGroup,
  getImportBatch: () => getImportBatch,
  getIncident: () => getIncident,
  getIncidentExport: () => getIncidentExport,
  getLicenseAssignment: () => getLicenseAssignment,
  getMailbox: () => getMailbox,
  getMembership: () => getMembership,
  getOrganization: () => getOrganization,
  getPerson: () => getPerson,
  getProduct: () => getProduct,
  getSubscription: () => getSubscription,
  getTemplateVersion: () => getTemplateVersion,
  getWorkItem: () => getWorkItem,
  getWorkflowRun: () => getWorkflowRun,
  insertAuditEvent: () => insertAuditEvent,
  insertEvidenceRecord: () => insertEvidenceRecord,
  insertFileObject: () => insertFileObject,
  insertImportRows: () => insertImportRows,
  insertIncidentExport: () => insertIncidentExport,
  insertNotification: () => insertNotification,
  insertStepAttempt: () => insertStepAttempt,
  insertTimelineEvent: () => insertTimelineEvent,
  insertWelcomePreview: () => insertWelcomePreview,
  insertWorkflowRun: () => insertWorkflowRun,
  lifecycleProviderFor: () => lifecycleProviderFor,
  linkAccountToPerson: () => linkAccountToPerson,
  linkRangerEventEvidence: () => linkRangerEventEvidence,
  linkRelatedSuggestion: () => linkRelatedSuggestion,
  listAccounts: () => listAccounts,
  listAffectedResources: () => listAffectedResources,
  listCompaniesForOrganization: () => listCompaniesForOrganization,
  listCompanyBindings: () => listCompanyBindings,
  listCompanyGrantIds: () => listCompanyGrantIds,
  listConnections: () => listConnections,
  listConnectionsForScheduledSync: () => listConnectionsForScheduledSync,
  listDeviceAssignments: () => listDeviceAssignments,
  listDevices: () => listDevices,
  listEvidence: () => listEvidence,
  listGroupMemberships: () => listGroupMemberships,
  listGroups: () => listGroups,
  listImportRows: () => listImportRows,
  listIncidents: () => listIncidents,
  listIncidentsForResource: () => listIncidentsForResource,
  listInvestigationEntries: () => listInvestigationEntries,
  listLicenseAssignments: () => listLicenseAssignments,
  listLifecycleBoard: () => listLifecycleBoard,
  listMailboxAccess: () => listMailboxAccess,
  listMailboxes: () => listMailboxes,
  listNotifications: () => listNotifications,
  listPeople: () => listPeople,
  listPersonLinkProposals: () => listPersonLinkProposals,
  listPriceVersions: () => listPriceVersions,
  listProblems: () => listProblems,
  listProducts: () => listProducts,
  listRelatedSuggestions: () => listRelatedSuggestions,
  listRoleTemplates: () => listRoleTemplates,
  listRunnableWorkflows: () => listRunnableWorkflows,
  listSubscriptions: () => listSubscriptions,
  listSyncRuns: () => listSyncRuns,
  listTimelineForEntity: () => listTimelineForEntity,
  listWorkItems: () => listWorkItems,
  listWorkflowRuns: () => listWorkflowRuns,
  listWorkflowSteps: () => listWorkflowSteps,
  loadArchiveSnapshot: () => loadArchiveSnapshot,
  loadPersonProfile: () => loadPersonProfile,
  numericToString: () => numericToString,
  parsePeopleCsv: () => parsePeopleCsv,
  personCostSummary: () => personCostSummary,
  previewOffboarding: () => previewOffboarding,
  previewOnboarding: () => previewOnboarding,
  previewPeopleImport: () => previewPeopleImport,
  previewStatusChange: () => previewStatusChange,
  providerForConnection: () => providerForConnection,
  reassignLicense: () => reassignLicense,
  refreshRelatedSuggestions: () => refreshRelatedSuggestions,
  resetDemoLifecycle: () => resetDemoLifecycle,
  retireProduct: () => retireProduct,
  retryFailedSteps: () => retryFailedSteps,
  returnDeviceAssignment: () => returnDeviceAssignment,
  runConnectionSync: () => runConnectionSync,
  seedPrivateDevelopment: () => seedPrivateDevelopment,
  unlinkAccountFromPerson: () => unlinkAccountFromPerson,
  updateAccount: () => updateAccount,
  updateCompanyNotes: () => updateCompanyNotes,
  updateConnectionStatus: () => updateConnectionStatus,
  updateDevice: () => updateDevice,
  updateGroup: () => updateGroup,
  updateIncident: () => updateIncident,
  updateMailbox: () => updateMailbox,
  updatePerson: () => updatePerson,
  updateProduct: () => updateProduct,
  updateRunStatus: () => updateRunStatus,
  updateStepStatus: () => updateStepStatus,
  updateSubscription: () => updateSubscription,
  updateWorkItem: () => updateWorkItem,
  upsertCollectionState: () => upsertCollectionState,
  upsertCompanyBinding: () => upsertCompanyBinding,
  withTransaction: () => withTransaction
});
var init_src4 = __esm({
  "packages/db/src/index.ts"() {
    "use strict";
    init_pool();
    init_migrations();
    init_seed_data();
    init_queries();
    init_inventory();
    init_provider_sync();
    init_run_sync();
    init_lifecycle();
    init_run_workflow();
    init_incidents();
  }
});

// apps/api/src/vercel-handler.ts
init_src4();

// apps/api/src/app.ts
init_src4();
import cors from "@fastify/cors";
import Fastify from "fastify";

// apps/api/src/auth.ts
import { betterAuth } from "better-auth";

// apps/api/src/origins.ts
function localDevOrigins(primary) {
  const origins = /* @__PURE__ */ new Set([primary]);
  try {
    const url = new URL(primary);
    if (url.hostname === "127.0.0.1") {
      url.hostname = "localhost";
      origins.add(url.origin);
    } else if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
      origins.add(url.origin);
    }
  } catch {
  }
  for (const key of ["VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"]) {
    const value = process.env[key];
    if (!value) continue;
    origins.add(value.startsWith("http") ? new URL(value).origin : `https://${value}`);
  }
  return [...origins];
}
function isAllowedWebOrigin(origin, referer, primary) {
  const allowed = localDevOrigins(primary);
  if (origin && allowed.includes(origin)) return true;
  if (typeof referer === "string") {
    return allowed.some((base) => referer === base || referer.startsWith(`${base}/`));
  }
  return false;
}

// apps/api/src/auth.ts
function createAuth(pool, env) {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    database: pool,
    trustedOrigins: localDevOrigins(env.WEB_ORIGIN),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8
    },
    session: {
      expiresIn: 60 * 60 * 8,
      updateAge: 60 * 60
    },
    advanced: {
      database: {
        generateId: () => crypto.randomUUID()
      },
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: env.WEB_ORIGIN.startsWith("https://"),
        path: "/"
      }
    },
    rateLimit: {
      enabled: false
    }
  });
}

// apps/api/src/authz.ts
init_src2();
init_src4();
import { fromNodeHeaders } from "better-auth/node";

// apps/api/src/http.ts
import { randomUUID as randomUUID8 } from "node:crypto";
function correlationIdFrom(request) {
  const incoming = request.headers["x-request-id"];
  if (typeof incoming === "string" && incoming.length > 0 && incoming.length < 128) {
    return incoming;
  }
  return randomUUID8();
}
async function sendError(reply, status, code, message, correlationId) {
  return reply.status(status).send({
    error: { code, message, correlationId }
  });
}

// apps/api/src/authz.ts
async function loadActor(request) {
  const session = await request.server.auth.api.getSession({
    headers: fromNodeHeaders(request.headers)
  });
  if (!session?.user) {
    return null;
  }
  const membership = await getMembership(request.server.db, session.user.id);
  if (!membership) {
    return null;
  }
  const companyIds = membership.role === "admin" ? (await listCompaniesForOrganization(request.server.db, membership.organization_id)).map(
    (company) => company.id
  ) : await listCompanyGrantIds(
    request.server.db,
    membership.organization_id,
    membership.staff_user_id
  );
  return {
    staffUserId: membership.staff_user_id,
    organizationId: membership.organization_id,
    role: membership.role,
    companyIds,
    automationExecute: membership.automation_execute
  };
}
async function requireActor(request, reply) {
  const actor = request.actor ?? await loadActor(request);
  request.actor = actor;
  if (!actor) {
    await sendError(reply, 401, "unauthenticated", "Sign in required", request.correlationId);
    return null;
  }
  return actor;
}
async function authorizeCompanyRead(request, companyId) {
  const actor = request.actor;
  if (!actor) {
    throw new DomainError("Sign in required", "unauthenticated", 401);
  }
  const company = await getCompany(request.server.db, actor.organizationId, companyId);
  if (!company) {
    throw new DomainError("Not found", "not_found", 404);
  }
  if (actor.role !== "admin" && !actor.companyIds.includes(companyId)) {
    throw new DomainError("Not found", "not_found", 404);
  }
  return { actor, company };
}
async function authorizePrivateDownload(request, fileId) {
  const actor = request.actor;
  if (!actor) {
    throw new DomainError("Sign in required", "unauthenticated", 401);
  }
  const file = await getFileObject(request.server.db, actor.organizationId, fileId);
  if (!file) {
    throw new DomainError("Not found", "not_found", 404);
  }
  if (actor.role !== "admin" && !actor.companyIds.includes(file.company_id)) {
    throw new DomainError("Not found", "not_found", 404);
  }
  return file;
}

// apps/api/src/app.ts
import { fromNodeHeaders as fromNodeHeaders3 } from "better-auth/node";

// packages/contracts/src/index.ts
import { z as z3 } from "zod";

// packages/contracts/src/inventory.ts
import { z } from "zod";
var isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
var isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime());
var uuid2 = z.string().uuid();
var currency = z.string().length(3).regex(/^[A-Z]{3}$/);
var personItStatusSchema = z.enum(["planned", "active", "on_leave", "departed"]);
var accountKindSchema = z.enum(["human", "guest", "service", "shared_mailbox_ref"]);
var enabledStateSchema = z.enum(["enabled", "disabled", "unknown"]);
var providerSourceSchema = z.enum(["manual", "microsoft", "import", "workflow"]);
var assignmentModelSchema = z.enum(["named_user", "shared_device", "organization_wide"]);
var subscriptionStateSchema = z.enum(["active", "canceled", "expired"]);
var payerSchema = z.enum(["msp", "company"]);
var priceKindSchema = z.enum(["unit", "flat"]);
var licenseAssignmentStatusSchema = z.enum(["active", "removal_pending", "ended"]);
var groupTypeSchema = z.enum([
  "security",
  "microsoft_365",
  "distribution",
  "mail_enabled_security",
  "manual"
]);
var membershipCapabilitySchema = z.enum(["direct", "dynamic", "unsupported"]);
var membershipKindSchema = z.enum(["direct", "inherited", "dynamic"]);
var membershipStatusSchema = z.enum(["active", "ended"]);
var mailboxPermissionSchema = z.enum(["full_access", "send_as", "send_on_behalf"]);
var mailboxAccessStatusSchema = z.enum(["active", "ended"]);
var deviceStateSchema = z.enum(["assigned", "available", "repair", "returned", "retired"]);
var deviceAssignmentStatusSchema = z.enum(["current", "historical"]);
var importBatchStatusSchema = z.enum(["preview", "applied", "failed", "canceled"]);
var importRowValidationSchema = z.enum(["valid", "invalid", "duplicate", "skipped"]);
var importRowApplySchema = z.enum(["pending", "applied", "noop", "failed", "skipped"]);
var personSchema = z.object({
  id: uuid2,
  organizationId: uuid2,
  companyId: uuid2,
  displayName: z.string().min(1),
  workEmail: z.string().email(),
  roleTitle: z.string().nullable(),
  department: z.string().nullable(),
  sponsor: z.string().nullable(),
  itStatus: personItStatusSchema,
  archivedAt: z.string().nullable(),
  startDate: isoDate.nullable(),
  endDate: isoDate.nullable(),
  workflowBadge: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int()
});
var personCreateSchema = z.object({
  displayName: z.string().min(1).max(200),
  workEmail: z.string().email().max(320),
  roleTitle: z.string().max(200).nullable().optional(),
  department: z.string().max(200).nullable().optional(),
  sponsor: z.string().max(200).nullable().optional(),
  itStatus: personItStatusSchema.default("planned"),
  startDate: isoDate.nullable().optional(),
  endDate: isoDate.nullable().optional(),
  workflowBadge: z.string().max(100).nullable().optional()
});
var personPatchSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  workEmail: z.string().email().max(320).optional(),
  roleTitle: z.string().max(200).nullable().optional(),
  department: z.string().max(200).nullable().optional(),
  sponsor: z.string().max(200).nullable().optional(),
  itStatus: personItStatusSchema.optional(),
  startDate: isoDate.nullable().optional(),
  endDate: isoDate.nullable().optional(),
  workflowBadge: z.string().max(100).nullable().optional(),
  version: z.number().int()
});
var accountSchema = z.object({
  id: uuid2,
  organizationId: uuid2,
  companyId: uuid2,
  personId: uuid2.nullable(),
  providerSource: providerSourceSchema,
  externalId: z.string().nullable(),
  loginName: z.string(),
  accountKind: accountKindSchema,
  enabledState: enabledStateSchema,
  lastObservedAt: z.string().nullable(),
  freshnessNote: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int()
});
var accountCreateSchema = z.object({
  loginName: z.string().min(1).max(320),
  accountKind: accountKindSchema.default("human"),
  providerSource: providerSourceSchema.default("manual"),
  externalId: z.string().max(320).nullable().optional(),
  enabledState: enabledStateSchema.default("enabled"),
  personId: uuid2.nullable().optional(),
  freshnessNote: z.string().max(1e3).nullable().optional()
});
var accountPatchSchema = z.object({
  loginName: z.string().min(1).max(320).optional(),
  accountKind: accountKindSchema.optional(),
  externalId: z.string().max(320).nullable().optional(),
  enabledState: enabledStateSchema.optional(),
  freshnessNote: z.string().max(1e3).nullable().optional(),
  version: z.number().int()
});
var accountLinkSchema = z.object({
  personId: uuid2,
  version: z.number().int()
});
var productSchema = z.object({
  id: uuid2,
  organizationId: uuid2,
  name: z.string(),
  vendor: z.string(),
  category: z.string(),
  assignmentModel: assignmentModelSchema,
  documentationUrl: z.string().nullable(),
  retiredAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int()
});
var productCreateSchema = z.object({
  name: z.string().min(1).max(200),
  vendor: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  assignmentModel: assignmentModelSchema,
  documentationUrl: z.string().url().nullable().optional()
});
var productPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  vendor: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  documentationUrl: z.string().url().nullable().optional(),
  version: z.number().int()
});
var subscriptionSchema = z.object({
  id: uuid2,
  organizationId: uuid2,
  companyId: uuid2,
  productId: uuid2,
  supplier: z.string().nullable(),
  externalReference: z.string().nullable(),
  purchasedQuantity: z.number().int().nonnegative(),
  currency,
  payer: payerSchema,
  billingCadence: z.string(),
  commitmentStart: isoDate.nullable(),
  commitmentEnd: isoDate.nullable(),
  renewalDate: isoDate.nullable(),
  state: subscriptionStateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int()
});
var subscriptionCreateSchema = z.object({
  productId: uuid2,
  supplier: z.string().max(200).nullable().optional(),
  externalReference: z.string().max(200).nullable().optional(),
  purchasedQuantity: z.number().int().nonnegative(),
  currency,
  payer: payerSchema,
  billingCadence: z.string().min(1).max(50),
  commitmentStart: isoDate.nullable().optional(),
  commitmentEnd: isoDate.nullable().optional(),
  renewalDate: isoDate.nullable().optional(),
  state: subscriptionStateSchema.default("active")
});
var subscriptionPatchSchema = z.object({
  supplier: z.string().max(200).nullable().optional(),
  externalReference: z.string().max(200).nullable().optional(),
  purchasedQuantity: z.number().int().nonnegative().optional(),
  payer: payerSchema.optional(),
  billingCadence: z.string().min(1).max(50).optional(),
  commitmentStart: isoDate.nullable().optional(),
  commitmentEnd: isoDate.nullable().optional(),
  renewalDate: isoDate.nullable().optional(),
  state: subscriptionStateSchema.optional(),
  version: z.number().int()
});
var subscriptionPriceVersionSchema = z.object({
  id: uuid2,
  organizationId: uuid2,
  companyId: uuid2,
  subscriptionId: uuid2,
  effectiveFrom: isoDate,
  effectiveTo: isoDate.nullable(),
  unitPrice: z.string().nullable(),
  priceKind: priceKindSchema,
  cadence: z.string(),
  source: z.string(),
  createdAt: z.string()
});
var subscriptionPriceVersionCreateSchema = z.object({
  effectiveFrom: isoDate,
  effectiveTo: isoDate.nullable().optional(),
  unitPrice: z.union([z.number(), z.string()]).nullable(),
  priceKind: priceKindSchema,
  cadence: z.string().min(1).max(50),
  source: z.string().min(1).max(100)
});
var licenseAssignmentSchema = z.object({
  id: uuid2,
  organizationId: uuid2,
  companyId: uuid2,
  personId: uuid2.nullable(),
  accountId: uuid2.nullable(),
  productId: uuid2,
  subscriptionId: uuid2.nullable(),
  poolId: uuid2.nullable(),
  status: licenseAssignmentStatusSchema,
  startEffectiveDate: isoDate.nullable(),
  endEffectiveDate: isoDate.nullable(),
  dateProvenance: z.string().nullable(),
  source: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int()
});
var licenseAssignSchema = z.object({
  personId: uuid2.nullable().optional(),
  accountId: uuid2.nullable().optional(),
  productId: uuid2,
  subscriptionId: uuid2.optional(),
  poolId: uuid2.nullable().optional(),
  startEffectiveDate: isoDate.nullable().optional(),
  dateProvenance: z.string().max(200).nullable().optional(),
  source: z.string().min(1).max(100).default("manual")
});
var licenseEndSchema = z.object({
  endEffectiveDate: isoDate.nullable().optional(),
  status: z.enum(["removal_pending", "ended"]).default("ended"),
  version: z.number().int()
});
var licenseReassignSchema = z.object({
  toPersonId: uuid2.nullable().optional(),
  toAccountId: uuid2.nullable().optional(),
  endEffectiveDate: isoDate.nullable().optional(),
  startEffectiveDate: isoDate.nullable().optional(),
  dateProvenance: z.string().max(200).nullable().optional(),
  source: z.string().min(1).max(100).default("manual"),
  version: z.number().int()
});
var groupSchema = z.object({
  id: uuid2,
  organizationId: uuid2,
  companyId: uuid2,
  externalId: z.string().nullable(),
  displayName: z.string(),
  emailAddress: z.string().nullable(),
  groupType: groupTypeSchema,
  membershipCapability: membershipCapabilitySchema,
  source: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int()
});
var groupCreateSchema = z.object({
  displayName: z.string().min(1).max(200),
  emailAddress: z.string().email().nullable().optional(),
  groupType: groupTypeSchema,
  membershipCapability: membershipCapabilitySchema.default("direct"),
  externalId: z.string().max(320).nullable().optional(),
  source: z.string().min(1).max(100).default("manual")
});
var groupPatchSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  emailAddress: z.string().email().nullable().optional(),
  membershipCapability: membershipCapabilitySchema.optional(),
  version: z.number().int()
});
var groupMembershipSchema = z.object({
  id: uuid2,
  organizationId: uuid2,
  companyId: uuid2,
  groupId: uuid2,
  accountId: uuid2,
  membershipKind: membershipKindSchema,
  startDate: isoDate.nullable(),
  endDate: isoDate.nullable(),
  verificationSource: z.string().nullable(),
  status: membershipStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});
var groupMembershipCreateSchema = z.object({
  accountId: uuid2,
  membershipKind: membershipKindSchema.default("direct"),
  startDate: isoDate.nullable().optional(),
  verificationSource: z.string().max(200).nullable().optional()
});
var mailboxSchema = z.object({
  id: uuid2,
  organizationId: uuid2,
  companyId: uuid2,
  address: z.string(),
  source: z.string(),
  state: z.string(),
  ownerPersonId: uuid2.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int()
});
var mailboxCreateSchema = z.object({
  address: z.string().email().max(320),
  source: z.string().min(1).max(100).default("manual"),
  state: z.string().min(1).max(50).default("active"),
  ownerPersonId: uuid2.nullable().optional()
});
var mailboxPatchSchema = z.object({
  state: z.string().min(1).max(50).optional(),
  ownerPersonId: uuid2.nullable().optional(),
  version: z.number().int()
});
var mailboxAccessSchema = z.object({
  id: uuid2,
  organizationId: uuid2,
  companyId: uuid2,
  mailboxId: uuid2,
  accountId: uuid2,
  permissionKind: mailboxPermissionSchema,
  startDate: isoDate.nullable(),
  endDate: isoDate.nullable(),
  source: z.string(),
  verificationStatus: z.string().nullable(),
  status: mailboxAccessStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});
var mailboxAccessCreateSchema = z.object({
  accountId: uuid2,
  permissionKind: mailboxPermissionSchema,
  startDate: isoDate.nullable().optional(),
  source: z.string().min(1).max(100).default("manual"),
  verificationStatus: z.string().max(100).nullable().optional()
});
var deviceSchema = z.object({
  id: uuid2,
  organizationId: uuid2,
  companyId: uuid2,
  assetTag: z.string().nullable(),
  serial: z.string().nullable(),
  deviceType: z.string(),
  hostname: z.string().nullable(),
  model: z.string().nullable(),
  state: deviceStateSchema,
  source: z.string(),
  cost: z.string().nullable(),
  currency: currency.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int()
});
var deviceCreateSchema = z.object({
  assetTag: z.string().max(100).nullable().optional(),
  serial: z.string().max(100).nullable().optional(),
  deviceType: z.string().min(1).max(100),
  hostname: z.string().max(200).nullable().optional(),
  model: z.string().max(200).nullable().optional(),
  state: deviceStateSchema.default("available"),
  source: z.string().min(1).max(100).default("manual"),
  cost: z.union([z.number(), z.string()]).nullable().optional(),
  currency: currency.nullable().optional()
});
var devicePatchSchema = z.object({
  assetTag: z.string().max(100).nullable().optional(),
  serial: z.string().max(100).nullable().optional(),
  deviceType: z.string().min(1).max(100).optional(),
  hostname: z.string().max(200).nullable().optional(),
  model: z.string().max(200).nullable().optional(),
  state: deviceStateSchema.optional(),
  cost: z.union([z.number(), z.string()]).nullable().optional(),
  currency: currency.nullable().optional(),
  version: z.number().int()
});
var deviceAssignmentSchema = z.object({
  id: uuid2,
  organizationId: uuid2,
  companyId: uuid2,
  deviceId: uuid2,
  personId: uuid2,
  issuedAt: z.string(),
  returnedAt: z.string().nullable(),
  custodyDisposition: z.string().nullable(),
  evidenceNote: z.string().nullable(),
  status: deviceAssignmentStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});
var deviceAssignSchema = z.object({
  personId: uuid2,
  issuedAt: isoDateTime.optional(),
  custodyDisposition: z.string().max(200).nullable().optional(),
  evidenceNote: z.string().max(2e3).nullable().optional()
});
var workItemSchema = z.object({
  id: uuid2,
  organizationId: uuid2,
  companyId: uuid2,
  type: z.string(),
  targetPersonId: uuid2.nullable(),
  ownerStaffUserId: z.string().nullable(),
  status: z.string(),
  dueDate: isoDate.nullable(),
  title: z.string(),
  description: z.string().nullable(),
  completionEvidence: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int()
});
var workItemCreateSchema = z.object({
  type: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  description: z.string().max(4e3).nullable().optional(),
  targetPersonId: uuid2.nullable().optional(),
  ownerStaffUserId: z.string().nullable().optional(),
  status: z.string().min(1).max(50).default("open"),
  dueDate: isoDate.nullable().optional()
});
var workItemPatchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(4e3).nullable().optional(),
  status: z.string().min(1).max(50).optional(),
  dueDate: isoDate.nullable().optional(),
  ownerStaffUserId: z.string().nullable().optional(),
  completionEvidence: z.string().max(4e3).nullable().optional(),
  version: z.number().int()
});
var timelineEventSchema = z.object({
  id: uuid2,
  organizationId: uuid2,
  companyId: uuid2.nullable(),
  entityType: z.string(),
  entityId: uuid2,
  eventKind: z.string(),
  actorStaffUserId: z.string().nullable(),
  effectiveAt: z.string().nullable(),
  observedAt: z.string(),
  recordedAt: z.string(),
  source: z.string(),
  summary: z.string()
});
var archiveBlockerSchema = z.object({
  code: z.string(),
  message: z.string(),
  targetType: z.string().optional(),
  targetId: z.string().optional()
});
var archiveReadinessResultSchema = z.object({
  ready: z.boolean(),
  blockers: z.array(archiveBlockerSchema)
});
var importPreviewRequestSchema = z.object({
  resourceKind: z.literal("people").default("people"),
  filename: z.string().min(1).max(300),
  csv: z.string().min(1).max(2e6)
});
var importRowResultSchema = z.object({
  rowNumber: z.number().int(),
  validationStatus: importRowValidationSchema,
  validationErrors: z.array(z.string()),
  dedupeKey: z.string().nullable(),
  applyStatus: importRowApplySchema.nullable(),
  applyResult: z.record(z.string(), z.unknown()).nullable().optional(),
  raw: z.record(z.string(), z.string()).optional()
});
var importPreviewResultSchema = z.object({
  batchId: uuid2,
  status: importBatchStatusSchema,
  rows: z.array(importRowResultSchema),
  validCount: z.number().int(),
  invalidCount: z.number().int()
});
var importApplyRequestSchema = z.object({
  batchId: uuid2
});
var importApplyResultSchema = z.object({
  batchId: uuid2,
  status: importBatchStatusSchema,
  applied: z.number().int(),
  noop: z.number().int(),
  failed: z.number().int(),
  skipped: z.number().int(),
  rows: z.array(importRowResultSchema)
});
var costCurrencyBucketSchema = z.object({
  currency,
  total: z.string()
});
var costSummarySchema = z.object({
  byCurrency: z.array(costCurrencyBucketSchema),
  unknownCount: z.number().int()
});

// packages/contracts/src/provider-sync.ts
import { z as z2 } from "zod";
var uuid3 = z2.string().uuid();
var providerKindSchema = z2.enum(["demo", "microsoft"]);
var connectionStatusSchema = z2.enum(["draft", "connected", "error", "disabled"]);
var syncCollectionSchema = z2.enum([
  "users",
  "groups",
  "group_memberships",
  "subscribed_skus",
  "capabilities"
]);
var syncRunStatusSchema = z2.enum([
  "queued",
  "running",
  "succeeded",
  "partial",
  "failed"
]);
var providerConnectionSchema = z2.object({
  id: uuid3,
  organizationId: uuid3,
  companyId: uuid3,
  providerKind: providerKindSchema,
  tenantId: z2.string().nullable(),
  displayName: z2.string(),
  status: connectionStatusSchema,
  credentialRef: z2.string().nullable(),
  failureMode: z2.string().nullable(),
  lastSuccessAt: z2.string().nullable(),
  lastError: z2.string().nullable(),
  createdAt: z2.string(),
  updatedAt: z2.string(),
  version: z2.number().int()
});
var syncRunSchema = z2.object({
  id: uuid3,
  organizationId: uuid3,
  companyId: uuid3,
  connectionId: uuid3,
  collection: syncCollectionSchema,
  status: syncRunStatusSchema,
  startedAt: z2.string().nullable(),
  finishedAt: z2.string().nullable(),
  itemCount: z2.number().int(),
  pageCount: z2.number().int(),
  errorCode: z2.string().nullable(),
  errorMessage: z2.string().nullable(),
  correlationId: z2.string().nullable(),
  createdAt: z2.string()
});
var connectionCreateSchema = z2.object({
  providerKind: providerKindSchema,
  displayName: z2.string().min(1).max(200),
  tenantId: z2.string().min(1).max(100).nullable().optional(),
  credentialRef: z2.string().min(1).max(200).nullable().optional(),
  failureMode: z2.string().max(100).nullable().optional()
});
var syncNowSchema = z2.object({
  collections: z2.array(syncCollectionSchema).min(1).optional()
});

// packages/contracts/src/index.ts
var staffRoleSchema = z3.enum(["admin", "technician", "viewer"]);
var deploymentEnvironmentSchema = z3.enum(["demo", "private", "live"]);
var errorSchema = z3.object({
  error: z3.object({
    code: z3.string(),
    message: z3.string(),
    correlationId: z3.string()
  })
});
var sessionUserSchema = z3.object({
  id: z3.string(),
  email: z3.string(),
  name: z3.string(),
  role: staffRoleSchema,
  organizationId: z3.string(),
  organizationName: z3.string(),
  environment: deploymentEnvironmentSchema,
  companyIds: z3.array(z3.string()),
  automationExecute: z3.boolean()
});
var companySchema = z3.object({
  id: z3.string(),
  organizationId: z3.string(),
  name: z3.string(),
  slug: z3.string(),
  domains: z3.array(z3.string()),
  itContactName: z3.string().nullable(),
  itContactEmail: z3.string().nullable(),
  itNotes: z3.string().nullable(),
  environment: deploymentEnvironmentSchema,
  createdAt: z3.string(),
  updatedAt: z3.string(),
  version: z3.number().int()
});
var companyPatchSchema = z3.object({
  itNotes: z3.string().max(4e3).nullable(),
  version: z3.number().int()
});
var overviewSchema = z3.object({
  organization: z3.object({
    id: z3.string(),
    name: z3.string(),
    environment: deploymentEnvironmentSchema
  }),
  companyScope: z3.string().nullable(),
  companies: z3.array(companySchema),
  asOf: z3.string().optional(),
  queues: z3.object({
    failedWorkflowSteps: z3.number().int(),
    peopleOffboarding: z3.number().int(),
    upcomingContractorReviews: z3.number().int(),
    staleConnections: z3.number().int(),
    openIncidents: z3.number().int()
  }),
  lifecycle: z3.object({
    startsSoon: z3.array(z3.record(z3.string(), z3.unknown())),
    leavesSoon: z3.array(z3.record(z3.string(), z3.unknown())),
    offboarding: z3.array(z3.record(z3.string(), z3.unknown())),
    waitingRuns: z3.array(z3.record(z3.string(), z3.unknown())),
    activeSeats: z3.array(z3.record(z3.string(), z3.unknown()))
  }).optional(),
  laterMilestones: z3.array(
    z3.object({
      section: z3.string(),
      status: z3.enum(["not_implemented", "partial"]),
      message: z3.string()
    })
  )
});

// apps/api/src/routes/accounts.ts
init_src4();
init_src2();

// apps/api/src/serialize-inventory.ts
init_src4();
function toPerson(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    displayName: row.display_name,
    workEmail: row.work_email,
    roleTitle: row.role_title,
    department: row.department,
    sponsor: row.sponsor,
    itStatus: row.it_status,
    archivedAt: asIso(row.archived_at),
    startDate: asDateString2(row.start_date),
    endDate: asDateString2(row.end_date),
    workflowBadge: row.workflow_badge,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version
  };
}
function toAccount(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    personId: row.person_id,
    providerSource: row.provider_source,
    externalId: row.external_id,
    loginName: row.login_name,
    accountKind: row.account_kind,
    enabledState: row.enabled_state,
    lastObservedAt: asIso(row.last_observed_at),
    freshnessNote: row.freshness_note,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version
  };
}
function toProduct(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    vendor: row.vendor,
    category: row.category,
    assignmentModel: row.assignment_model,
    documentationUrl: row.documentation_url,
    retiredAt: asIso(row.retired_at),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version
  };
}
function toSubscription(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    productId: row.product_id,
    supplier: row.supplier,
    externalReference: row.external_reference,
    purchasedQuantity: row.purchased_quantity,
    currency: row.currency,
    payer: row.payer,
    billingCadence: row.billing_cadence,
    commitmentStart: asDateString2(row.commitment_start),
    commitmentEnd: asDateString2(row.commitment_end),
    renewalDate: asDateString2(row.renewal_date),
    state: row.state,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version
  };
}
function toPriceVersion(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    subscriptionId: row.subscription_id,
    effectiveFrom: asDateString2(row.effective_from),
    effectiveTo: asDateString2(row.effective_to),
    unitPrice: numericToString(row.unit_price),
    priceKind: row.price_kind,
    cadence: row.cadence,
    source: row.source,
    createdAt: row.created_at.toISOString()
  };
}
function toLicenseAssignment(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    personId: row.person_id,
    accountId: row.account_id,
    productId: row.product_id,
    productName: row.product_name ?? void 0,
    subscriptionId: row.subscription_id,
    poolId: row.pool_id,
    status: row.status,
    startEffectiveDate: asDateString2(row.start_effective_date),
    endEffectiveDate: asDateString2(row.end_effective_date),
    dateProvenance: row.date_provenance,
    source: row.source,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version
  };
}
function toGroup(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    externalId: row.external_id,
    displayName: row.display_name,
    emailAddress: row.email_address,
    groupType: row.group_type,
    membershipCapability: row.membership_capability,
    source: row.source,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version
  };
}
function toGroupMembership(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    groupId: row.group_id,
    accountId: row.account_id,
    membershipKind: row.membership_kind,
    startDate: asDateString2(row.start_date),
    endDate: asDateString2(row.end_date),
    verificationSource: row.verification_source,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}
function toMailbox(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    address: row.address,
    source: row.source,
    state: row.state,
    ownerPersonId: row.owner_person_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version
  };
}
function toMailboxAccess(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    mailboxId: row.mailbox_id,
    accountId: row.account_id,
    permissionKind: row.permission_kind,
    startDate: asDateString2(row.start_date),
    endDate: asDateString2(row.end_date),
    source: row.source,
    verificationStatus: row.verification_status,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}
function toDevice(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    assetTag: row.asset_tag,
    serial: row.serial,
    deviceType: row.device_type,
    hostname: row.hostname,
    model: row.model,
    state: row.state,
    source: row.source,
    cost: numericToString(row.cost),
    currency: row.currency,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version
  };
}
function toDeviceAssignment(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    deviceId: row.device_id,
    personId: row.person_id,
    issuedAt: row.issued_at.toISOString(),
    returnedAt: asIso(row.returned_at),
    custodyDisposition: row.custody_disposition,
    evidenceNote: row.evidence_note,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}
function toWorkItem(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    type: row.type,
    targetPersonId: row.target_person_id,
    ownerStaffUserId: row.owner_staff_user_id,
    status: row.status,
    dueDate: asDateString2(row.due_date),
    title: row.title,
    description: row.description,
    completionEvidence: row.completion_evidence,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version
  };
}
function toTimelineEvent(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    eventKind: row.event_kind,
    actorStaffUserId: row.actor_staff_user_id,
    effectiveAt: asIso(row.effective_at),
    observedAt: row.observed_at.toISOString(),
    recordedAt: row.recorded_at.toISOString(),
    source: row.source,
    summary: row.summary
  };
}

// apps/api/src/routes/accounts.ts
async function registerAccountRoutes(app) {
  app.get("/api/v1/companies/:companyId/accounts", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const accounts = await listAccounts(request.server.db, actor.organizationId, company.id);
      return { accounts: accounts.map(toAccount) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post("/api/v1/companies/:companyId/accounts", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create accounts", request.correlationId);
    }
    const parsed = accountCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid account", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const account = await createAccount(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        ...parsed.data
      });
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "account.create",
        targetType: "account",
        targetId: account.id,
        summary: `Created account ${account.login_name}`,
        correlationId: request.correlationId
      });
      return reply.status(201).send({ account: toAccount(account) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.get("/api/v1/companies/:companyId/accounts/:accountId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const account = await getAccount(
        request.server.db,
        actor.organizationId,
        company.id,
        params.accountId
      );
      if (!account) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      return { account: toAccount(account) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.patch("/api/v1/companies/:companyId/accounts/:accountId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update accounts", request.correlationId);
    }
    const parsed = accountPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid account update", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const updated = await updateAccount(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        accountId: params.accountId,
        ...parsed.data
      });
      if (!updated) {
        const existing = await getAccount(
          request.server.db,
          actor.organizationId,
          company.id,
          params.accountId
        );
        if (!existing) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        return sendError(reply, 409, "conflict", "Account changed since you loaded it", request.correlationId);
      }
      return { account: toAccount(updated) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post(
    "/api/v1/companies/:companyId/accounts/:accountId/unlink",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot unlink", request.correlationId);
      }
      const body = request.body;
      if (typeof body?.version !== "number") {
        return sendError(reply, 400, "validation_error", "version is required", request.correlationId);
      }
      try {
        const params = request.params;
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const account = await withTransaction(
          request.server.db,
          async (client) => unlinkAccountFromPerson(client, {
            organizationId: actor.organizationId,
            companyId: company.id,
            accountId: params.accountId,
            version: body.version,
            actorStaffUserId: actor.staffUserId
          })
        );
        return { account: toAccount(account) };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    }
  );
}

// apps/api/src/routes/companies.ts
init_src4();
init_src2();

// apps/api/src/serialize.ts
function toCompany(row, environment) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    slug: row.slug,
    domains: row.domains,
    itContactName: row.it_contact_name,
    itContactEmail: row.it_contact_email,
    itNotes: row.it_notes,
    environment,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version
  };
}

// apps/api/src/routes/companies.ts
async function registerCompanyRoutes(app) {
  app.get("/api/v1/companies", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) {
      return;
    }
    const organization = await getOrganization(request.server.db, actor.organizationId);
    if (!organization) {
      return sendError(reply, 404, "not_found", "Not found", request.correlationId);
    }
    const companies = await listCompaniesForOrganization(request.server.db, actor.organizationId);
    const visible = actor.role === "admin" ? companies : companies.filter((company) => actor.companyIds.includes(company.id));
    return { companies: visible.map((company) => toCompany(company, organization.deployment_environment)) };
  });
  app.get("/api/v1/companies/:companyId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) {
      return;
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const organization = await getOrganization(request.server.db, actor.organizationId);
      if (!organization) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      return { company: toCompany(company, organization.deployment_environment) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.patch("/api/v1/companies/:companyId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) {
      return;
    }
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot change company records", request.correlationId);
    }
    const parsed = companyPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid company update", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const updated = await updateCompanyNotes(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        itNotes: parsed.data.itNotes,
        version: parsed.data.version
      });
      if (!updated) {
        return sendError(
          reply,
          409,
          "conflict",
          "This company changed since you loaded it. Refresh and try again.",
          request.correlationId
        );
      }
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "company.notes.update",
        targetType: "company",
        targetId: company.id,
        summary: "Updated IT notes",
        beforeSummary: company.it_notes,
        afterSummary: updated.it_notes,
        correlationId: request.correlationId
      });
      const organization = await getOrganization(request.server.db, actor.organizationId);
      return { company: toCompany(updated, organization?.deployment_environment ?? "demo") };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
}

// apps/api/src/routes/demo.ts
init_src4();
import { randomBytes } from "node:crypto";
var DEMO_TTL_MS = 8 * 60 * 60 * 1e3;
async function copyAuthCookies(from, reply) {
  const getSetCookie = from.headers.getSetCookie?.bind(from.headers);
  const cookies = getSetCookie ? getSetCookie() : [];
  if (cookies.length > 0) {
    reply.header("set-cookie", cookies.join(", "));
    for (const cookie of cookies) {
      reply.header("set-cookie", cookie);
    }
  } else {
    const single = from.headers.get("set-cookie");
    if (single) {
      reply.header("set-cookie", single);
    }
  }
}
async function registerDemoRoutes(app) {
  app.post("/api/v1/demo/sessions", async (request, reply) => {
    const recent = await countDemoCreatesSince(request.server.db, new Date(Date.now() - 60 * 60 * 1e3));
    if (recent >= 20) {
      return sendError(
        reply,
        429,
        "rate_limited",
        "Demo creation is temporarily limited. Try again later.",
        request.correlationId
      );
    }
    const staffPassword = `demo-${randomBytes(18).toString("hex")}`;
    const created = await withTransaction(
      request.server.db,
      (client) => cloneDemoWorkspace(client, {
        staffPassword,
        expiresAt: new Date(Date.now() + DEMO_TTL_MS)
      })
    );
    const signIn = new Request(`${request.server.env.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: request.server.env.WEB_ORIGIN,
        cookie: ""
      },
      body: JSON.stringify({ email: created.email, password: staffPassword })
    });
    const authResponse = await request.server.auth.handler(signIn);
    await copyAuthCookies(authResponse, reply);
    return {
      environment: "demo",
      organizationId: created.organizationId,
      email: created.email,
      expiresInHours: 8
    };
  });
  app.get("/api/v1/search", async (request, reply) => {
    const actor = request.actor;
    if (!actor) {
      return sendError(reply, 401, "unauthenticated", "Sign in required", request.correlationId);
    }
    const q = String(request.query.q ?? "").trim().toLowerCase();
    if (!q) {
      return { results: [] };
    }
    const { listCompaniesForOrganization: listCompaniesForOrganization2, getOrganization: getOrganization2 } = await Promise.resolve().then(() => (init_src4(), src_exports));
    const organization = await getOrganization2(request.server.db, actor.organizationId);
    const companies = await listCompaniesForOrganization2(request.server.db, actor.organizationId);
    const visible = actor.role === "admin" ? companies : companies.filter((company) => actor.companyIds.includes(company.id));
    return {
      results: visible.filter((company) => company.name.toLowerCase().includes(q) || company.slug.includes(q)).map((company) => ({
        type: "company",
        id: company.id,
        title: company.name,
        company: company.name,
        environment: organization?.deployment_environment ?? "demo"
      }))
    };
  });
}

// apps/api/src/routes/devices.ts
init_src4();
init_src2();
import { z as z4 } from "zod";
var returnSchema = z4.object({
  custodyDisposition: z4.string().max(200).nullable().optional(),
  evidenceNote: z4.string().max(4e3).nullable().optional()
});
async function registerDeviceRoutes(app) {
  app.get("/api/v1/companies/:companyId/devices", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const devices = await listDevices(request.server.db, actor.organizationId, company.id);
      return { devices: devices.map(toDevice) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post("/api/v1/companies/:companyId/devices", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create devices", request.correlationId);
    }
    const parsed = deviceCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid device", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const device = await createDevice(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        ...parsed.data
      });
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "device.create",
        targetType: "device",
        targetId: device.id,
        summary: `Created device ${device.asset_tag ?? device.serial ?? device.id}`,
        correlationId: request.correlationId
      });
      return reply.status(201).send({ device: toDevice(device) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.get("/api/v1/companies/:companyId/devices/:deviceId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const device = await getDevice(
        request.server.db,
        actor.organizationId,
        company.id,
        params.deviceId
      );
      if (!device) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      const assignments = await listDeviceAssignments(
        request.server.db,
        actor.organizationId,
        company.id,
        params.deviceId
      );
      return { device: toDevice(device), assignments: assignments.map(toDeviceAssignment) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.patch("/api/v1/companies/:companyId/devices/:deviceId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update devices", request.correlationId);
    }
    const parsed = devicePatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid device update", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const updated = await updateDevice(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        deviceId: params.deviceId,
        ...parsed.data
      });
      if (!updated) {
        return sendError(reply, 409, "conflict", "Device changed or not found", request.correlationId);
      }
      return { device: toDevice(updated) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post("/api/v1/companies/:companyId/devices/:deviceId/assignments", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot assign devices", request.correlationId);
    }
    const parsed = deviceAssignSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid device assignment", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const assignment = await assignDevice(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        deviceId: params.deviceId,
        ...parsed.data
      });
      return reply.status(201).send({ assignment: toDeviceAssignment(assignment) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post(
    "/api/v1/companies/:companyId/devices/:deviceId/assignments/:assignmentId/return",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot return devices", request.correlationId);
      }
      const parsed = returnSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid return", request.correlationId);
      }
      try {
        const params = request.params;
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const assignment = await returnDeviceAssignment(request.server.db, {
          organizationId: actor.organizationId,
          companyId: company.id,
          assignmentId: params.assignmentId,
          ...parsed.data
        });
        if (!assignment) {
          return sendError(reply, 404, "not_found", "Assignment not found", request.correlationId);
        }
        return { assignment: toDeviceAssignment(assignment) };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    }
  );
}

// apps/api/src/routes/files.ts
init_src2();
async function registerFileRoutes(app) {
  app.get("/api/v1/files/:fileId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) {
      return;
    }
    try {
      await authorizePrivateDownload(request, request.params.fileId);
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
    return sendError(
      reply,
      404,
      "not_found",
      "No stored file exists for this identifier",
      request.correlationId
    );
  });
}

// apps/api/src/routes/groups.ts
init_src4();
init_src2();
async function registerGroupRoutes(app) {
  app.get("/api/v1/companies/:companyId/groups", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const groups = await listGroups(request.server.db, actor.organizationId, company.id);
      return { groups: groups.map(toGroup) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post("/api/v1/companies/:companyId/groups", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create groups", request.correlationId);
    }
    const parsed = groupCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid group", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const group = await createGroup(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        ...parsed.data
      });
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "group.create",
        targetType: "group",
        targetId: group.id,
        summary: `Created group ${group.display_name}`,
        correlationId: request.correlationId
      });
      return reply.status(201).send({ group: toGroup(group) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.get("/api/v1/companies/:companyId/groups/:groupId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const group = await getGroup(
        request.server.db,
        actor.organizationId,
        company.id,
        params.groupId
      );
      if (!group) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      const memberships = await listGroupMemberships(
        request.server.db,
        actor.organizationId,
        company.id,
        params.groupId
      );
      return { group: toGroup(group), memberships: memberships.map(toGroupMembership) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.patch("/api/v1/companies/:companyId/groups/:groupId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update groups", request.correlationId);
    }
    const parsed = groupPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid group update", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const updated = await updateGroup(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        groupId: params.groupId,
        ...parsed.data
      });
      if (!updated) {
        return sendError(reply, 409, "conflict", "Group changed or not found", request.correlationId);
      }
      return { group: toGroup(updated) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post("/api/v1/companies/:companyId/groups/:groupId/memberships", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot change memberships", request.correlationId);
    }
    const parsed = groupMembershipCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid membership", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const membership = await createGroupMembership(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        groupId: params.groupId,
        ...parsed.data
      });
      return reply.status(201).send({ membership: toGroupMembership(membership) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
}

// apps/api/src/routes/imports.ts
init_src4();
init_src2();
import { z as z5 } from "zod";
var uiPreviewSchema = z5.object({
  resourceKind: z5.string().default("people"),
  filename: z5.string().min(1),
  csvText: z5.string().min(1).optional(),
  csv: z5.string().min(1).optional()
});
function toBatch(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    resourceKind: row.resource_kind,
    filename: row.original_filename,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    appliedAt: row.applied_at?.toISOString() ?? null
  };
}
async function registerImportRoutes(app) {
  app.post("/api/v1/companies/:companyId/imports/preview", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot import", request.correlationId);
    }
    const ui = uiPreviewSchema.safeParse(request.body);
    if (!ui.success) {
      return sendError(reply, 400, "validation_error", "Invalid import preview", request.correlationId);
    }
    const csv = ui.data.csv ?? ui.data.csvText;
    if (!csv) {
      return sendError(reply, 400, "validation_error", "csv or csvText is required", request.correlationId);
    }
    const parsed = importPreviewRequestSchema.safeParse({
      resourceKind: "people",
      filename: ui.data.filename,
      csv
    });
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid import preview", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      if (ui.data.resourceKind !== "people") {
        return sendError(
          reply,
          422,
          "unprocessable",
          "Only people CSV import is implemented in M1",
          request.correlationId
        );
      }
      const result = await previewPeopleImport(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        filename: parsed.data.filename,
        csv: parsed.data.csv,
        createdByStaffUserId: actor.staffUserId
      });
      return {
        batch: toBatch(result.batch),
        rows: result.rows.map((row) => ({
          rowNumber: row.row_number,
          validationStatus: row.validation_status,
          validationErrors: row.validation_errors,
          dedupeKey: row.dedupe_key,
          applyStatus: row.apply_status,
          raw: row.raw_data
        }))
      };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post("/api/v1/companies/:companyId/imports/:batchId/apply", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot import", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const result = await applyPeopleImport(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        batchId: params.batchId,
        actorStaffUserId: actor.staffUserId
      });
      return {
        batch: toBatch(result.batch),
        applied: result.applied,
        noop: result.noop,
        failed: result.failed
      };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.get("/api/v1/companies/:companyId/imports/:batchId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const batch = await getImportBatch(
        request.server.db,
        actor.organizationId,
        company.id,
        params.batchId
      );
      if (!batch) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      const rows = await listImportRows(
        request.server.db,
        actor.organizationId,
        company.id,
        params.batchId
      );
      return {
        batch: toBatch(batch),
        rows: rows.map((row) => ({
          rowNumber: row.row_number,
          validationStatus: row.validation_status,
          validationErrors: row.validation_errors,
          dedupeKey: row.dedupe_key,
          applyStatus: row.apply_status,
          raw: row.raw_data
        }))
      };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
}

// apps/api/src/routes/incidents.ts
init_src4();
init_src2();
import { randomUUID as randomUUID9 } from "node:crypto";
import multipart from "@fastify/multipart";
import JSZip from "jszip";

// apps/api/src/evidence-storage.ts
import { createHash } from "node:crypto";
import { mkdir, readFile as readFile2, writeFile } from "node:fs/promises";
import path2 from "node:path";
function evidenceRoot(envDir) {
  if (envDir && envDir.length > 0) {
    return envDir;
  }
  if (process.env.VERCEL) {
    return "/tmp/ranger-evidence";
  }
  return path2.join(process.cwd(), "data", "evidence");
}
async function storeEvidenceBytes(root, organizationId, companyId, fileId, bytes) {
  const storageKey = path2.posix.join(organizationId, companyId, fileId);
  const dir = path2.join(root, organizationId, companyId);
  await mkdir(dir, { recursive: true });
  await writeFile(path2.join(root, ...storageKey.split("/")), bytes);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return { storageKey, sha256 };
}
async function readEvidenceBytes(root, storageKey) {
  return readFile2(path2.join(root, ...storageKey.split("/")));
}
function redactTextAssistance(text) {
  const redacted = text.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]").replace(/password["\s:=]+[^\s"',}]+/gi, "password=[REDACTED]").replace(/client_secret["\s:=]+[^\s"',}]+/gi, "client_secret=[REDACTED]");
  return {
    text: redacted,
    note: "Redaction helpers are assistance, not a guarantee that all secrets were removed."
  };
}

// apps/api/src/routes/incidents.ts
async function handleDomain(reply, correlationId, error) {
  if (error instanceof DomainError) {
    return sendError(reply, error.statusCode, error.code, error.message, correlationId);
  }
  throw error;
}
function toIncident(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    title: row.title,
    reportedSymptom: row.reported_symptom,
    impactDescription: row.impact_description,
    severity: row.severity,
    status: row.status,
    ownerStaffUserId: row.owner_staff_user_id,
    onsetAt: row.onset_at?.toISOString() ?? null,
    externalTicketRef: row.external_ticket_ref,
    tags: row.tags,
    resolutionSummary: row.resolution_summary,
    resolutionKind: row.resolution_kind,
    resolvedAt: row.resolved_at?.toISOString() ?? null,
    closedAt: row.closed_at?.toISOString() ?? null,
    workflowRunId: row.workflow_run_id,
    workflowStepKey: row.workflow_step_key,
    correlationId: row.correlation_id,
    providerError: row.provider_error,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}
function toEvidence(row) {
  return {
    id: row.id,
    kind: row.kind,
    sourceLabel: row.source_label,
    originalFilename: row.original_filename,
    contentType: row.content_type,
    byteSize: row.byte_size,
    sha256: row.sha256,
    collectionTime: row.collection_time?.toISOString() ?? null,
    timestampPrecision: row.timestamp_precision,
    parserVersion: row.parser_version,
    parseWarnings: row.parse_warnings,
    parsedSummary: row.parsed_summary,
    isRedacted: row.is_redacted,
    redactedFromEvidenceId: row.redacted_from_evidence_id,
    rangerEventRef: row.ranger_event_ref,
    createdAt: row.created_at.toISOString()
  };
}
function toEntry(row) {
  return {
    id: row.id,
    entryKind: row.entry_kind,
    body: row.body,
    occurredAt: row.occurred_at?.toISOString() ?? null,
    timePrecision: row.time_precision,
    authorStaffUserId: row.author_staff_user_id,
    linkedEvidenceIds: row.linked_evidence_ids,
    createdAt: row.created_at.toISOString()
  };
}
function buildReportMarkdown(input) {
  const lines = [
    `# Escalation: ${input.incident.title}`,
    "",
    `- Company: ${input.incident.companyId}`,
    `- Status: ${input.incident.status}`,
    `- Severity: ${input.incident.severity}`,
    `- Generated for handoff (private package)`,
    "",
    "## Reported symptom",
    input.excludedFields.includes("reportedSymptom") ? "_[excluded]_" : input.incident.reportedSymptom,
    "",
    "## Impact",
    input.excludedFields.includes("impactDescription") ? "_[excluded]_" : input.incident.impactDescription ?? "\u2014",
    "",
    "## Affected resources",
    ...input.resources.map((r) => `- ${r.resource_type} ${r.label ?? r.resource_id}`),
    "",
    "## Investigation timeline"
  ];
  for (const entry of input.entries) {
    lines.push(
      `### ${entry.entryKind} (${entry.timePrecision}${entry.occurredAt ? ` \xB7 ${entry.occurredAt}` : " \xB7 unknown time"})`
    );
    lines.push(entry.body);
    lines.push("");
  }
  lines.push("## Selected evidence");
  for (const item of input.evidence) {
    lines.push(
      `- ${item.sourceLabel}${item.originalFilename ? ` \xB7 ${item.originalFilename}` : ""}${item.isRedacted ? " \xB7 redacted derivative" : ""} \xB7 sha256=${item.sha256 ?? "n/a"}`
    );
  }
  lines.push("");
  lines.push("## Confirmed findings / hypotheses");
  const findings = input.entries.filter((e) => e.entryKind === "result" || e.entryKind === "hypothesis");
  if (findings.length === 0) lines.push("_None recorded._");
  for (const f of findings) lines.push(`- (${f.entryKind}) ${f.body}`);
  lines.push("");
  lines.push("## Known data limitations");
  lines.push("- Temporal correlation alone is not root cause.");
  lines.push("- Unknown log timezones remain labeled; do not assume local time.");
  if (input.incident.providerError) {
    lines.push(`- Provider error attached: ${input.incident.providerError}`);
  }
  lines.push("");
  return lines.join("\n");
}
async function registerIncidentRoutes(app) {
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 }
  });
  app.get("/api/v1/companies/:companyId/incidents", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params;
      const query = request.query;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const incidents = await listIncidents(request.server.db, actor.organizationId, company.id, {
        status: query.status,
        personId: query.personId
      });
      return { incidents: incidents.map(toIncident) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.get("/api/v1/companies/:companyId/incidents/:incidentId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const incident = await getIncident(request.server.db, actor.organizationId, company.id, params.incidentId);
      if (!incident) return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      const [resources, evidence, entries, related, problems] = await Promise.all([
        listAffectedResources(request.server.db, actor.organizationId, company.id, incident.id),
        listEvidence(request.server.db, actor.organizationId, company.id, incident.id),
        listInvestigationEntries(request.server.db, actor.organizationId, company.id, incident.id),
        listRelatedSuggestions(request.server.db, actor.organizationId, company.id, incident.id),
        listProblems(request.server.db, actor.organizationId, company.id)
      ]);
      return {
        incident: toIncident(incident),
        affectedResources: resources.map((r) => ({
          id: r.id,
          resourceType: r.resource_type,
          resourceId: r.resource_id,
          label: r.label
        })),
        evidence: evidence.map(toEvidence),
        entries: entries.map(toEntry),
        related: related.map((r) => ({
          id: r.id,
          suggestedIncidentId: r.suggested_incident_id,
          scoringVersion: r.scoring_version,
          score: r.score,
          reasons: r.reasons,
          status: r.status,
          title: r.title,
          providerError: r.provider_error
        })),
        problems: problems.filter((p) => (p.incident_ids ?? []).includes(incident.id)).map((p) => ({
          id: p.id,
          title: p.title,
          workingCause: p.working_cause,
          status: p.status,
          incidentIds: p.incident_ids
        }))
      };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.post("/api/v1/companies/:companyId/incidents", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create incidents", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body;
      const incident = await withTransaction(
        request.server.db,
        (client) => createIncident(client, {
          organizationId: actor.organizationId,
          companyId: company.id,
          title: body.title,
          reportedSymptom: body.reportedSymptom,
          impactDescription: body.impactDescription,
          severity: body.severity ?? "medium",
          ownerStaffUserId: actor.staffUserId,
          tags: body.tags ?? [],
          workflowRunId: body.workflowRunId,
          workflowStepKey: body.workflowStepKey,
          correlationId: body.correlationId ?? request.correlationId,
          providerError: body.providerError,
          affected: body.affected
        })
      );
      return { incident: toIncident(incident) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.patch("/api/v1/companies/:companyId/incidents/:incidentId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update incidents", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body;
      const incident = await updateIncident(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        incidentId: params.incidentId,
        version: Number(body.version),
        title: body.title,
        reportedSymptom: body.reportedSymptom,
        impactDescription: body.impactDescription,
        severity: body.severity,
        status: body.status,
        tags: body.tags,
        resolutionSummary: body.resolutionSummary,
        resolutionKind: body.resolutionKind
      });
      return { incident: toIncident(incident) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.post("/api/v1/companies/:companyId/incidents/:incidentId/resources", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body;
      await addAffectedResource(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        incidentId: params.incidentId,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        label: body.label
      });
      return { ok: true };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.post("/api/v1/companies/:companyId/incidents/:incidentId/entries", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body;
      const entry = await createInvestigationEntry(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        incidentId: params.incidentId,
        entryKind: body.entryKind,
        body: body.body,
        occurredAt: body.occurredAt,
        timePrecision: body.timePrecision,
        authorStaffUserId: actor.staffUserId,
        linkedEvidenceIds: body.linkedEvidenceIds
      });
      return { entry: toEntry(entry) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.post("/api/v1/companies/:companyId/incidents/:incidentId/evidence/upload", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const incident = await getIncident(request.server.db, actor.organizationId, company.id, params.incidentId);
      if (!incident) return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      const file = await request.file();
      if (!file) return sendError(reply, 400, "validation_error", "File required", request.correlationId);
      const buffer = await file.toBuffer();
      const totals = await evidenceTotals(request.server.db, actor.organizationId, company.id, incident.id);
      assertUploadAllowed({
        filename: file.filename,
        contentType: file.mimetype,
        byteSize: buffer.byteLength,
        existingFileCount: totals.count,
        existingTotalBytes: totals.bytes
      });
      const root = evidenceRoot(process.env.EVIDENCE_STORAGE_DIR);
      const fileId = randomUUID9();
      const { storageKey, sha256 } = await storeEvidenceBytes(
        root,
        actor.organizationId,
        company.id,
        fileId,
        buffer
      );
      const textLike = /\.(txt|log|csv|json|jsonl)$/i.test(file.filename);
      const parsed = textLike ? buildParsedSummary(file.filename, buffer.toString("utf8")) : null;
      const evidence = await withTransaction(request.server.db, async (client) => {
        const fileObjectId = await insertFileObject(client, {
          organizationId: actor.organizationId,
          companyId: company.id,
          storageKey,
          originalFilename: file.filename,
          contentType: file.mimetype,
          byteSize: buffer.byteLength,
          sha256,
          createdByStaffUserId: actor.staffUserId
        });
        const row = await insertEvidenceRecord(client, {
          organizationId: actor.organizationId,
          companyId: company.id,
          incidentId: incident.id,
          fileObjectId,
          kind: "upload",
          sourceLabel: "Uploaded evidence",
          originalFilename: file.filename,
          contentType: file.mimetype,
          byteSize: buffer.byteLength,
          sha256,
          storageKey,
          parserVersion: parsed?.parserVersion ?? null,
          parseWarnings: parsed?.warnings ?? [],
          parsedSummary: parsed,
          uploadedByStaffUserId: actor.staffUserId
        });
        await refreshRelatedSuggestions(client, actor.organizationId, company.id, incident.id);
        return row;
      });
      return { evidence: toEvidence(evidence) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.post("/api/v1/companies/:companyId/incidents/:incidentId/evidence/:evidenceId/redact", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const source = await getEvidence(request.server.db, actor.organizationId, company.id, params.evidenceId);
      if (!source?.storage_key) {
        return sendError(reply, 404, "not_found", "Evidence file not found", request.correlationId);
      }
      const root = evidenceRoot(process.env.EVIDENCE_STORAGE_DIR);
      const original = await readEvidenceBytes(root, source.storage_key);
      const { text, note } = redactTextAssistance(original.toString("utf8"));
      const bytes = Buffer.from(text, "utf8");
      const fileId = randomUUID9();
      const { storageKey, sha256 } = await storeEvidenceBytes(
        root,
        actor.organizationId,
        company.id,
        fileId,
        bytes
      );
      const evidence = await withTransaction(request.server.db, async (client) => {
        const fileObjectId = await insertFileObject(client, {
          organizationId: actor.organizationId,
          companyId: company.id,
          storageKey,
          originalFilename: `redacted-${source.original_filename ?? "evidence.txt"}`,
          contentType: "text/plain",
          byteSize: bytes.byteLength,
          sha256,
          createdByStaffUserId: actor.staffUserId
        });
        return insertEvidenceRecord(client, {
          organizationId: actor.organizationId,
          companyId: company.id,
          incidentId: params.incidentId,
          fileObjectId,
          kind: "redacted_derivative",
          sourceLabel: "Redacted derivative",
          originalFilename: `redacted-${source.original_filename ?? "evidence.txt"}`,
          contentType: "text/plain",
          byteSize: bytes.byteLength,
          sha256,
          storageKey,
          redactedFromEvidenceId: source.id,
          isRedacted: true,
          parseWarnings: [note],
          parsedSummary: buildParsedSummary("redacted.txt", text),
          uploadedByStaffUserId: actor.staffUserId
        });
      });
      return { evidence: toEvidence(evidence) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.get("/api/v1/companies/:companyId/incidents/:incidentId/evidence/:evidenceId/download", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const evidence = await getEvidence(request.server.db, actor.organizationId, company.id, params.evidenceId);
      if (!evidence || evidence.incident_id !== params.incidentId || !evidence.storage_key) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      const bytes = await readEvidenceBytes(evidenceRoot(process.env.EVIDENCE_STORAGE_DIR), evidence.storage_key);
      reply.header("Content-Type", evidence.content_type ?? "application/octet-stream");
      reply.header(
        "Content-Disposition",
        `attachment; filename="${(evidence.original_filename ?? "evidence").replace(/"/g, "")}"`
      );
      reply.header("X-Content-Type-Options", "nosniff");
      return reply.send(bytes);
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.post("/api/v1/companies/:companyId/incidents/:incidentId/evidence/ranger-events", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body;
      const events = await listTimelineForEntity(
        request.server.db,
        actor.organizationId,
        body.entityType,
        body.entityId
      );
      const selected = body.eventIds?.length ? events.filter((e) => body.eventIds.includes(e.id)) : events.slice(0, 20);
      const created = [];
      for (const event of selected) {
        created.push(
          await linkRangerEventEvidence(request.server.db, {
            organizationId: actor.organizationId,
            companyId: company.id,
            incidentId: params.incidentId,
            eventId: event.id,
            eventKind: event.event_kind,
            summary: event.summary,
            occurredAt: event.effective_at?.toISOString?.() ?? event.recorded_at?.toISOString?.() ?? null,
            entityType: body.entityType,
            entityId: body.entityId,
            uploadedByStaffUserId: actor.staffUserId
          })
        );
      }
      return { evidence: created.map(toEvidence) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.post("/api/v1/companies/:companyId/incidents/:incidentId/related/:suggestionId/dismiss", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      await dismissRelatedSuggestion(request.server.db, actor.organizationId, company.id, params.suggestionId);
      return { ok: true };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.post("/api/v1/companies/:companyId/incidents/:incidentId/related/:suggestionId/link", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      await linkRelatedSuggestion(request.server.db, actor.organizationId, company.id, params.suggestionId);
      return { ok: true };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.get("/api/v1/companies/:companyId/problems", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const problems = await listProblems(request.server.db, actor.organizationId, company.id);
      return {
        problems: problems.map((p) => ({
          id: p.id,
          title: p.title,
          workingCause: p.working_cause,
          resolution: p.resolution,
          status: p.status,
          incidentIds: p.incident_ids
        }))
      };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.post("/api/v1/companies/:companyId/problems", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body;
      const problem = await createProblem(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        title: body.title,
        workingCause: body.workingCause,
        ownerStaffUserId: actor.staffUserId,
        permanentFixWorkItemId: body.permanentFixWorkItemId,
        incidentIds: body.incidentIds ?? []
      });
      return { problem };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.post("/api/v1/companies/:companyId/incidents/:incidentId/exports", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "download")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot export evidence packages", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body;
      const incident = await getIncident(request.server.db, actor.organizationId, company.id, params.incidentId);
      if (!incident) return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      const [resources, allEvidence, allEntries] = await Promise.all([
        listAffectedResources(request.server.db, actor.organizationId, company.id, incident.id),
        listEvidence(request.server.db, actor.organizationId, company.id, incident.id),
        listInvestigationEntries(request.server.db, actor.organizationId, company.id, incident.id)
      ]);
      const evidence = allEvidence.filter((e) => body.evidenceIds.includes(e.id));
      const selectedEvidence = evidence.filter((e) => {
        if (!e.is_redacted) {
          const hasRedactedTwin = evidence.some(
            (other) => other.is_redacted && other.redacted_from_evidence_id === e.id
          );
          return !hasRedactedTwin;
        }
        return true;
      });
      const entries = allEntries.filter((e) => !body.entryIds?.length || body.entryIds.includes(e.id));
      const excludedFields = body.excludedFields ?? [];
      const report = buildReportMarkdown({
        incident: toIncident(incident),
        resources,
        entries: entries.map(toEntry),
        evidence: selectedEvidence.map(toEvidence),
        excludedFields
      });
      const zip = new JSZip();
      zip.file("report.md", report);
      const manifest = {
        incidentId: incident.id,
        companyId: company.id,
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        createdByStaffUserId: actor.staffUserId,
        selectedEvidence: selectedEvidence.map((e) => ({
          id: e.id,
          sha256: e.sha256,
          isRedacted: e.is_redacted,
          filename: e.original_filename
        })),
        selectedEntries: entries.map((e) => e.id),
        excludedFields
      };
      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      const root = evidenceRoot(process.env.EVIDENCE_STORAGE_DIR);
      for (const item of selectedEvidence) {
        if (!item.storage_key) continue;
        const bytes = await readEvidenceBytes(root, item.storage_key);
        zip.file(`attachments/${item.original_filename ?? item.id}`, bytes);
      }
      const zipBytes = Buffer.from(await zip.generateAsync({ type: "uint8array" }));
      const exportId = randomUUID9();
      const { storageKey, sha256 } = await storeEvidenceBytes(
        root,
        actor.organizationId,
        company.id,
        `export-${exportId}`,
        zipBytes
      );
      const record = await insertIncidentExport(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        incidentId: incident.id,
        createdByStaffUserId: actor.staffUserId,
        selectedEvidenceIds: selectedEvidence.map((e) => e.id),
        selectedEntryIds: entries.map((e) => e.id),
        excludedFields,
        reportMarkdown: report,
        manifest,
        storageKey,
        sha256,
        byteSize: zipBytes.byteLength
      });
      return {
        export: {
          id: record.id,
          sha256: record.sha256,
          byteSize: record.byte_size,
          createdAt: record.created_at.toISOString(),
          downloadPath: `/api/v1/companies/${company.id}/incident-exports/${record.id}/download`
        },
        reportMarkdown: report
      };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.get("/api/v1/companies/:companyId/incident-exports/:exportId/download", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "download")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot download export packages", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const record = await getIncidentExport(request.server.db, actor.organizationId, company.id, params.exportId);
      if (!record) return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      const bytes = await readEvidenceBytes(
        evidenceRoot(process.env.EVIDENCE_STORAGE_DIR),
        record.storage_key
      );
      reply.header("Content-Type", "application/zip");
      reply.header("Content-Disposition", `attachment; filename="incident-export-${record.id}.zip"`);
      reply.header("X-Content-Type-Options", "nosniff");
      return reply.send(bytes);
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
  app.get("/api/v1/companies/:companyId/resources/:resourceType/:resourceId/incidents", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const incidents = await listIncidentsForResource(
        request.server.db,
        actor.organizationId,
        company.id,
        params.resourceType,
        params.resourceId
      );
      return { incidents: incidents.map(toIncident) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
}

// apps/api/src/routes/integrations.ts
init_src4();
init_src3();
init_src2();
function toConnection(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    providerKind: row.provider_kind,
    tenantId: row.tenant_id,
    displayName: row.display_name,
    status: row.status,
    credentialRef: row.credential_ref,
    failureMode: row.failure_mode,
    lastSuccessAt: row.last_success_at?.toISOString() ?? null,
    lastError: row.last_error,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version
  };
}
function toSyncRun(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    connectionId: row.connection_id,
    collection: row.collection,
    status: row.status,
    startedAt: row.started_at?.toISOString() ?? null,
    finishedAt: row.finished_at?.toISOString() ?? null,
    itemCount: row.item_count,
    pageCount: row.page_count,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    correlationId: row.correlation_id,
    createdAt: row.created_at.toISOString()
  };
}
async function registerIntegrationRoutes(app) {
  app.get("/api/v1/companies/:companyId/connections", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const connections = await listConnections(
        request.server.db,
        actor.organizationId,
        company.id
      );
      return { connections: connections.map(toConnection) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post("/api/v1/companies/:companyId/connections", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (actor.role !== "admin") {
      return sendError(
        reply,
        403,
        "forbidden",
        "Only admins can create provider connections",
        request.correlationId
      );
    }
    const parsed = connectionCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid connection", request.correlationId);
    }
    if (parsed.data.providerKind === "microsoft" && !parsed.data.tenantId) {
      return sendError(
        reply,
        400,
        "validation_error",
        "Microsoft connections require tenantId",
        request.correlationId
      );
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const connection = await createConnection(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        providerKind: parsed.data.providerKind,
        displayName: parsed.data.displayName,
        tenantId: parsed.data.tenantId,
        credentialRef: parsed.data.credentialRef,
        failureMode: parsed.data.failureMode,
        status: parsed.data.providerKind === "demo" ? "connected" : "draft"
      });
      return reply.status(201).send({ connection: toConnection(connection) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.get(
    "/api/v1/companies/:companyId/connections/:connectionId/capabilities",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      try {
        const params = request.params;
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const connection = await getConnection(
          request.server.db,
          actor.organizationId,
          company.id,
          params.connectionId
        );
        if (!connection) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        const provider = providerForConnection(connection);
        const capabilities = await provider.listCapabilities();
        return {
          connection: toConnection(connection),
          capabilities,
          liveVerified: false,
          note: connection.provider_kind === "demo" ? "Demo adapter \u2014 simulated observations only" : "Live Graph requires authorized tenant credentials (currently blocked if unset)"
        };
      } catch (error) {
        if (error instanceof ProviderError) {
          return sendError(reply, 422, error.code, error.message, request.correlationId);
        }
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    }
  );
  app.post(
    "/api/v1/companies/:companyId/connections/:connectionId/sync",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot sync", request.correlationId);
      }
      const parsed = syncNowSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid sync request", request.correlationId);
      }
      try {
        const params = request.params;
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const result = await runConnectionSync(request.server.db, {
          organizationId: actor.organizationId,
          companyId: company.id,
          connectionId: params.connectionId,
          collections: parsed.data.collections,
          correlationId: request.correlationId
        });
        return { sync: result };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    }
  );
  app.get(
    "/api/v1/companies/:companyId/connections/:connectionId/sync-runs",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      try {
        const params = request.params;
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const runs = await listSyncRuns(request.server.db, {
          organizationId: actor.organizationId,
          companyId: company.id,
          connectionId: params.connectionId
        });
        return { syncRuns: runs.map(toSyncRun) };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    }
  );
  app.get("/api/v1/companies/:companyId/sync-runs", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const runs = await listSyncRuns(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id
      });
      return { syncRuns: runs.map(toSyncRun) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
}

// apps/api/src/routes/mailboxes.ts
init_src4();
init_src2();
async function registerMailboxRoutes(app) {
  app.get("/api/v1/companies/:companyId/mailboxes", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const mailboxes = await listMailboxes(request.server.db, actor.organizationId, company.id);
      return { mailboxes: mailboxes.map(toMailbox) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post("/api/v1/companies/:companyId/mailboxes", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create mailboxes", request.correlationId);
    }
    const parsed = mailboxCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid mailbox", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const mailbox = await createMailbox(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        ...parsed.data
      });
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "mailbox.create",
        targetType: "shared_mailbox",
        targetId: mailbox.id,
        summary: `Created shared mailbox ${mailbox.address}`,
        correlationId: request.correlationId
      });
      return reply.status(201).send({ mailbox: toMailbox(mailbox) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.get("/api/v1/companies/:companyId/mailboxes/:mailboxId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const mailbox = await getMailbox(
        request.server.db,
        actor.organizationId,
        company.id,
        params.mailboxId
      );
      if (!mailbox) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      const access = await listMailboxAccess(
        request.server.db,
        actor.organizationId,
        company.id,
        params.mailboxId
      );
      return { mailbox: toMailbox(mailbox), access: access.map(toMailboxAccess) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.patch("/api/v1/companies/:companyId/mailboxes/:mailboxId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update mailboxes", request.correlationId);
    }
    const parsed = mailboxPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid mailbox update", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const updated = await updateMailbox(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        mailboxId: params.mailboxId,
        ...parsed.data
      });
      if (!updated) {
        return sendError(reply, 409, "conflict", "Mailbox changed or not found", request.correlationId);
      }
      return { mailbox: toMailbox(updated) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post("/api/v1/companies/:companyId/mailboxes/:mailboxId/access", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot grant mailbox access", request.correlationId);
    }
    const parsed = mailboxAccessCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid mailbox access", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const access = await createMailboxAccess(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        mailboxId: params.mailboxId,
        ...parsed.data
      });
      return reply.status(201).send({ access: toMailboxAccess(access) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
}

// apps/api/src/routes/overview.ts
init_src4();
init_src2();
var AS_OF = "2026-09-30";
async function registerOverviewRoutes(app) {
  app.get("/api/v1/overview", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) {
      return;
    }
    const organization = await getOrganization(request.server.db, actor.organizationId);
    if (!organization) {
      return sendError(reply, 404, "not_found", "Not found", request.correlationId);
    }
    const query = request.query;
    if (query.companyId && actor.role !== "admin" && !actor.companyIds.includes(query.companyId)) {
      return sendError(reply, 404, "not_found", "Not found", request.correlationId);
    }
    const companies = await listCompaniesForOrganization(request.server.db, actor.organizationId);
    const visible = actor.role === "admin" ? companies : companies.filter((company) => actor.companyIds.includes(company.id));
    const scoped = query.companyId ? visible.filter((company) => company.id === query.companyId) : visible;
    if (query.companyId && scoped.length === 0) {
      return sendError(reply, 404, "not_found", "Not found", request.correlationId);
    }
    const companyIds = scoped.map((company) => company.id);
    const [staleConnections, failedWorkflowSteps, peopleOffboarding, upcomingReviews, board, openIncidents] = await Promise.all([
      countStaleConnections(request.server.db, actor.organizationId, companyIds),
      countWaitingWorkflowSteps(request.server.db, actor.organizationId, companyIds),
      countPeopleOffboarding(request.server.db, actor.organizationId, companyIds),
      countUpcomingLifecycleReviews(request.server.db, actor.organizationId, companyIds, AS_OF),
      listLifecycleBoard(request.server.db, actor.organizationId, companyIds, AS_OF),
      countOpenIncidents(request.server.db, actor.organizationId, companyIds)
    ]);
    return {
      organization: {
        id: organization.id,
        name: organization.name,
        environment: organization.deployment_environment
      },
      companyScope: query.companyId ?? null,
      companies: scoped.map((company) => toCompany(company, organization.deployment_environment)),
      asOf: AS_OF,
      queues: {
        failedWorkflowSteps,
        peopleOffboarding,
        upcomingContractorReviews: upcomingReviews,
        staleConnections,
        openIncidents
      },
      lifecycle: {
        startsSoon: board.startsSoon.map((p) => ({
          id: p.id,
          companyId: p.company_id,
          companyName: p.company_name,
          displayName: p.display_name,
          itStatus: p.it_status,
          workflowBadge: p.workflow_badge,
          startDate: p.start_date,
          endDate: p.end_date,
          timing: intervalProgress({ start: p.start_date, end: p.end_date, asOf: AS_OF }).summary
        })),
        leavesSoon: board.leavesSoon.map((p) => ({
          id: p.id,
          companyId: p.company_id,
          companyName: p.company_name,
          displayName: p.display_name,
          itStatus: p.it_status,
          workflowBadge: p.workflow_badge,
          startDate: p.start_date,
          endDate: p.end_date,
          timing: intervalProgress({ start: p.start_date, end: p.end_date, asOf: AS_OF }).summary
        })),
        offboarding: board.offboarding.map((p) => ({
          id: p.id,
          companyId: p.company_id,
          companyName: p.company_name,
          displayName: p.display_name,
          itStatus: p.it_status,
          workflowBadge: p.workflow_badge,
          startDate: p.start_date,
          endDate: p.end_date,
          timing: intervalProgress({ start: p.start_date, end: p.end_date, asOf: AS_OF }).summary
        })),
        waitingRuns: board.waitingRuns.map((r) => ({
          id: r.id,
          companyId: r.company_id,
          companyName: r.company_name,
          personId: r.person_id,
          personName: r.person_name,
          kind: r.kind,
          status: r.status,
          createdAt: r.created_at.toISOString()
        })),
        activeSeats: board.activeAssignments.map((a) => ({
          id: a.id,
          companyId: a.company_id,
          companyName: a.company_name,
          personId: a.person_id,
          personName: a.person_name,
          productName: a.product_name,
          status: a.status,
          startDate: a.start_effective_date,
          endDate: a.end_effective_date,
          timing: intervalProgress({
            start: a.start_effective_date,
            end: a.end_effective_date,
            asOf: AS_OF
          }).summary
        }))
      },
      laterMilestones: [
        {
          section: "Incidents",
          status: "not_implemented",
          message: "Investigations stay out of this joiner/leaver board until reviewed."
        }
      ]
    };
  });
}

// apps/api/src/routes/people.ts
init_src4();
init_src2();
async function handleDomain2(reply, correlationId, error) {
  if (error instanceof DomainError) {
    return sendError(reply, error.statusCode, error.code, error.message, correlationId);
  }
  throw error;
}
async function registerPeopleRoutes(app) {
  app.get("/api/v1/companies/:companyId/people", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const query = request.query;
      const people = await listPeople(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        q: query.q,
        itStatus: query.itStatus,
        includeArchived: query.includeArchived === "true" || query.includeArchived === "1"
      });
      return { people: people.map(toPerson) };
    } catch (error) {
      return handleDomain2(reply, request.correlationId, error);
    }
  });
  app.post("/api/v1/companies/:companyId/people", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create people", request.correlationId);
    }
    const parsed = personCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid person", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const person = await createPerson(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        ...parsed.data
      });
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "person.create",
        targetType: "person",
        targetId: person.id,
        summary: `Created person ${person.display_name}`,
        correlationId: request.correlationId
      });
      return reply.status(201).send({ person: toPerson(person) });
    } catch (error) {
      return handleDomain2(reply, request.correlationId, error);
    }
  });
  app.get("/api/v1/companies/:companyId/people/:personId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const profile = await loadPersonProfile(
        request.server.db,
        actor.organizationId,
        company.id,
        params.personId
      );
      if (!profile) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      return {
        person: toPerson(profile.person),
        accounts: profile.accounts.map(toAccount),
        groupMemberships: profile.groupMemberships.map((row) => ({
          ...toGroupMembership(row),
          groupName: row.group_name,
          groupType: row.group_type
        })),
        mailboxAccess: profile.mailboxAccess.map((row) => ({
          ...toMailboxAccess(row),
          mailboxAddress: row.mailbox_address
        })),
        assignments: profile.assignments.map(toLicenseAssignment),
        licenseAssignments: profile.assignments.map(toLicenseAssignment),
        devices: profile.devices.map((row) => ({
          ...toDeviceAssignment(row),
          device: row.device ? toDevice(row.device) : void 0
        })),
        workItems: profile.workItems.map(toWorkItem),
        timeline: profile.timeline.map(toTimelineEvent),
        costs: profile.costs,
        costSummary: profile.costs.byCurrency.map((bucket) => ({
          currency: bucket.currency,
          assignedShare: bucket.total,
          unknownPrices: profile.costs.unknownCount > 0
        }))
      };
    } catch (error) {
      return handleDomain2(reply, request.correlationId, error);
    }
  });
  app.patch("/api/v1/companies/:companyId/people/:personId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update people", request.correlationId);
    }
    const parsed = personPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid person update", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const updated = await updatePerson(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        personId: params.personId,
        ...parsed.data
      });
      if (!updated) {
        const existing = await getPerson(
          request.server.db,
          actor.organizationId,
          company.id,
          params.personId
        );
        if (!existing) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        return sendError(
          reply,
          409,
          "conflict",
          "This person changed since you loaded it. Refresh and try again.",
          request.correlationId
        );
      }
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "person.update",
        targetType: "person",
        targetId: updated.id,
        summary: `Updated person ${updated.display_name}`,
        correlationId: request.correlationId
      });
      return { person: toPerson(updated) };
    } catch (error) {
      return handleDomain2(reply, request.correlationId, error);
    }
  });
  app.get(
    "/api/v1/companies/:companyId/people/:personId/archive-readiness",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      try {
        const params = request.params;
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const person = await getPerson(
          request.server.db,
          actor.organizationId,
          company.id,
          params.personId
        );
        if (!person) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        const readiness = await getArchiveReadiness(
          request.server.db,
          actor.organizationId,
          company.id,
          params.personId
        );
        return readiness;
      } catch (error) {
        return handleDomain2(reply, request.correlationId, error);
      }
    }
  );
  app.post("/api/v1/companies/:companyId/people/:personId/archive", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot archive", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const result = await withTransaction(
        request.server.db,
        async (client) => archivePerson(client, {
          organizationId: actor.organizationId,
          companyId: company.id,
          personId: params.personId,
          actorStaffUserId: actor.staffUserId
        })
      );
      return { person: toPerson(result.person), readiness: result.readiness };
    } catch (error) {
      return handleDomain2(reply, request.correlationId, error);
    }
  });
  app.post(
    "/api/v1/companies/:companyId/people/:personId/accounts/:accountId/link",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot link accounts", request.correlationId);
      }
      const parsed = accountLinkSchema.safeParse({
        ...request.body,
        personId: request.params.personId
      });
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid link request", request.correlationId);
      }
      try {
        const params = request.params;
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const account = await withTransaction(
          request.server.db,
          async (client) => linkAccountToPerson(client, {
            organizationId: actor.organizationId,
            companyId: company.id,
            accountId: params.accountId,
            personId: params.personId,
            version: parsed.data.version,
            actorStaffUserId: actor.staffUserId
          })
        );
        return { account: toAccount(account) };
      } catch (error) {
        return handleDomain2(reply, request.correlationId, error);
      }
    }
  );
  app.get("/api/v1/companies/:companyId/costs", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const costs = await companyCostSummary(
        request.server.db,
        actor.organizationId,
        company.id
      );
      return { costs };
    } catch (error) {
      return handleDomain2(reply, request.correlationId, error);
    }
  });
}

// apps/api/src/routes/products.ts
init_src4();
init_src2();
async function registerProductRoutes(app) {
  app.get("/api/v1/products", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    const products = await listProducts(request.server.db, actor.organizationId);
    return { products: products.map(toProduct) };
  });
  app.post("/api/v1/products", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (actor.role !== "admin") {
      return sendError(reply, 403, "forbidden", "Only admins can edit the product catalog", request.correlationId);
    }
    const parsed = productCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid product", request.correlationId);
    }
    const product = await createProduct(request.server.db, {
      organizationId: actor.organizationId,
      ...parsed.data
    });
    await insertAuditEvent(request.server.db, {
      organizationId: actor.organizationId,
      actorStaffUserId: actor.staffUserId,
      action: "product.create",
      targetType: "product",
      targetId: product.id,
      summary: `Created product ${product.name}`,
      correlationId: request.correlationId
    });
    return reply.status(201).send({ product: toProduct(product) });
  });
  app.get("/api/v1/products/:productId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    const product = await getProduct(
      request.server.db,
      actor.organizationId,
      request.params.productId
    );
    if (!product) {
      return sendError(reply, 404, "not_found", "Not found", request.correlationId);
    }
    return { product: toProduct(product) };
  });
  app.patch("/api/v1/products/:productId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (actor.role !== "admin") {
      return sendError(reply, 403, "forbidden", "Only admins can edit the product catalog", request.correlationId);
    }
    const parsed = productPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid product update", request.correlationId);
    }
    const productId = request.params.productId;
    const updated = await updateProduct(request.server.db, {
      organizationId: actor.organizationId,
      productId,
      ...parsed.data
    });
    if (!updated) {
      const existing = await getProduct(request.server.db, actor.organizationId, productId);
      if (!existing) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      return sendError(reply, 409, "conflict", "Product changed since you loaded it", request.correlationId);
    }
    return { product: toProduct(updated) };
  });
  app.post("/api/v1/products/:productId/retire", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (actor.role !== "admin") {
      return sendError(reply, 403, "forbidden", "Only admins can retire products", request.correlationId);
    }
    const body = request.body;
    if (typeof body?.version !== "number") {
      return sendError(reply, 400, "validation_error", "version is required", request.correlationId);
    }
    try {
      const productId = request.params.productId;
      const retired = await retireProduct(
        request.server.db,
        actor.organizationId,
        productId,
        body.version
      );
      if (!retired) {
        const existing = await getProduct(request.server.db, actor.organizationId, productId);
        if (!existing) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        return sendError(reply, 409, "conflict", "Product could not be retired", request.correlationId);
      }
      return { product: toProduct(retired) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
}

// apps/api/src/routes/session.ts
init_src4();
import { fromNodeHeaders as fromNodeHeaders2 } from "better-auth/node";
async function registerSessionRoutes(app) {
  app.get("/api/v1/session", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) {
      return;
    }
    const session = await request.server.auth.api.getSession({
      headers: fromNodeHeaders2(request.headers)
    });
    const organization = await getOrganization(request.server.db, actor.organizationId);
    if (!session?.user || !organization) {
      return sendError(reply, 401, "unauthenticated", "Sign in required", request.correlationId);
    }
    return {
      user: {
        id: actor.staffUserId,
        email: session.user.email,
        name: session.user.name,
        role: actor.role,
        organizationId: actor.organizationId,
        organizationName: organization.name,
        environment: organization.deployment_environment,
        companyIds: actor.companyIds,
        automationExecute: actor.automationExecute
      }
    };
  });
}

// apps/api/src/routes/subscriptions.ts
init_src4();
init_src2();
import { z as z6 } from "zod";
var nestedAssignSchema = z6.object({
  personId: z6.string().uuid().optional().nullable(),
  accountId: z6.string().uuid().optional().nullable(),
  startEffectiveDate: z6.string().optional().nullable(),
  dateProvenance: z6.string().max(200).optional().nullable(),
  source: z6.string().min(1).max(100).optional()
});
async function registerSubscriptionRoutes(app) {
  app.get("/api/v1/companies/:companyId/subscriptions", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const subscriptions = await listSubscriptions(
        request.server.db,
        actor.organizationId,
        company.id
      );
      return { subscriptions: subscriptions.map(toSubscription) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post("/api/v1/companies/:companyId/subscriptions", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create subscriptions", request.correlationId);
    }
    const parsed = subscriptionCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid subscription", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const subscription = await createSubscription(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        ...parsed.data
      });
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "subscription.create",
        targetType: "subscription",
        targetId: subscription.id,
        summary: "Created subscription",
        correlationId: request.correlationId
      });
      return reply.status(201).send({ subscription: toSubscription(subscription) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.get("/api/v1/companies/:companyId/subscriptions/:subscriptionId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const subscription = await getSubscription(
        request.server.db,
        actor.organizationId,
        company.id,
        params.subscriptionId
      );
      if (!subscription) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      const priceVersions = await listPriceVersions(
        request.server.db,
        actor.organizationId,
        company.id,
        subscription.id
      );
      const assignments = await listLicenseAssignments(
        request.server.db,
        actor.organizationId,
        company.id,
        { subscriptionId: subscription.id }
      );
      const product = await getProduct(
        request.server.db,
        actor.organizationId,
        subscription.product_id
      );
      const mappedAssignments = assignments.map(toLicenseAssignment);
      const currentPrice = priceVersions[0] ? toPriceVersion(priceVersions[0]) : null;
      return {
        subscription: {
          ...toSubscription(subscription),
          productName: product?.name ?? null,
          assignments: mappedAssignments,
          assignedQuantity: mappedAssignments.filter(
            (row) => row.status === "active" || row.status === "removal_pending"
          ).length,
          currentUnitPrice: currentPrice?.unitPrice ?? null
        },
        priceVersions: priceVersions.map(toPriceVersion),
        licenseAssignments: mappedAssignments
      };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.patch("/api/v1/companies/:companyId/subscriptions/:subscriptionId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update subscriptions", request.correlationId);
    }
    const parsed = subscriptionPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid subscription update", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const updated = await updateSubscription(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        subscriptionId: params.subscriptionId,
        ...parsed.data
      });
      if (!updated) {
        const existing = await getSubscription(
          request.server.db,
          actor.organizationId,
          company.id,
          params.subscriptionId
        );
        if (!existing) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        return sendError(reply, 409, "conflict", "Subscription changed since you loaded it", request.correlationId);
      }
      return { subscription: toSubscription(updated) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post(
    "/api/v1/companies/:companyId/subscriptions/:subscriptionId/price-versions",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot add price versions", request.correlationId);
      }
      const parsed = subscriptionPriceVersionCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid price version", request.correlationId);
      }
      try {
        const params = request.params;
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const version = await withTransaction(
          request.server.db,
          async (client) => appendPriceVersion(client, {
            organizationId: actor.organizationId,
            companyId: company.id,
            subscriptionId: params.subscriptionId,
            ...parsed.data
          })
        );
        return reply.status(201).send({ priceVersion: toPriceVersion(version) });
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    }
  );
  app.post(
    "/api/v1/companies/:companyId/subscriptions/:subscriptionId/assignments",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot assign licenses", request.correlationId);
      }
      const parsed = nestedAssignSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid assignment", request.correlationId);
      }
      try {
        const params = request.params;
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const subscription = await getSubscription(
          request.server.db,
          actor.organizationId,
          company.id,
          params.subscriptionId
        );
        if (!subscription) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        const assignment = await withTransaction(
          request.server.db,
          async (client) => assignLicense(client, {
            organizationId: actor.organizationId,
            companyId: company.id,
            personId: parsed.data.personId,
            accountId: parsed.data.accountId,
            productId: subscription.product_id,
            subscriptionId: subscription.id,
            startEffectiveDate: parsed.data.startEffectiveDate,
            dateProvenance: parsed.data.dateProvenance,
            source: parsed.data.source ?? "manual",
            actorStaffUserId: actor.staffUserId
          })
        );
        const mapped = toLicenseAssignment(assignment);
        return reply.status(201).send({ assignment: mapped, licenseAssignment: mapped });
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    }
  );
  app.post(
    "/api/v1/companies/:companyId/subscriptions/:subscriptionId/assignments/:assignmentId/end",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot end assignments", request.correlationId);
      }
      const parsed = licenseEndSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid end request", request.correlationId);
      }
      try {
        const params = request.params;
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const existing = await getLicenseAssignment(
          request.server.db,
          actor.organizationId,
          company.id,
          params.assignmentId
        );
        if (!existing || existing.subscription_id !== params.subscriptionId) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        const assignment = await withTransaction(
          request.server.db,
          async (client) => endLicenseAssignment(client, {
            organizationId: actor.organizationId,
            companyId: company.id,
            assignmentId: params.assignmentId,
            ...parsed.data,
            actorStaffUserId: actor.staffUserId
          })
        );
        const mapped = toLicenseAssignment(assignment);
        return { assignment: mapped, licenseAssignment: mapped };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    }
  );
  app.get("/api/v1/companies/:companyId/license-assignments", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const query = request.query;
      const assignments = await listLicenseAssignments(
        request.server.db,
        actor.organizationId,
        company.id,
        query
      );
      return { licenseAssignments: assignments.map(toLicenseAssignment) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post("/api/v1/companies/:companyId/license-assignments", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot assign licenses", request.correlationId);
    }
    const parsed = licenseAssignSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid assignment", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const assignment = await withTransaction(
        request.server.db,
        async (client) => assignLicense(client, {
          organizationId: actor.organizationId,
          companyId: company.id,
          ...parsed.data,
          actorStaffUserId: actor.staffUserId
        })
      );
      return reply.status(201).send({ licenseAssignment: toLicenseAssignment(assignment) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post(
    "/api/v1/companies/:companyId/license-assignments/:assignmentId/end",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot end assignments", request.correlationId);
      }
      const parsed = licenseEndSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid end request", request.correlationId);
      }
      try {
        const params = request.params;
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const assignment = await withTransaction(
          request.server.db,
          async (client) => endLicenseAssignment(client, {
            organizationId: actor.organizationId,
            companyId: company.id,
            assignmentId: params.assignmentId,
            ...parsed.data,
            actorStaffUserId: actor.staffUserId
          })
        );
        return { licenseAssignment: toLicenseAssignment(assignment) };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    }
  );
  app.post(
    "/api/v1/companies/:companyId/license-assignments/:assignmentId/reassign",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot reassign", request.correlationId);
      }
      const parsed = licenseReassignSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid reassign request", request.correlationId);
      }
      try {
        const params = request.params;
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const result = await withTransaction(
          request.server.db,
          async (client) => reassignLicense(client, {
            organizationId: actor.organizationId,
            companyId: company.id,
            assignmentId: params.assignmentId,
            ...parsed.data,
            actorStaffUserId: actor.staffUserId
          })
        );
        return {
          ended: toLicenseAssignment(result.ended),
          created: toLicenseAssignment(result.created)
        };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    }
  );
  app.get(
    "/api/v1/companies/:companyId/license-assignments/:assignmentId",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      try {
        const params = request.params;
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const assignment = await getLicenseAssignment(
          request.server.db,
          actor.organizationId,
          company.id,
          params.assignmentId
        );
        if (!assignment) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        return { licenseAssignment: toLicenseAssignment(assignment) };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    }
  );
}

// apps/api/src/routes/work-items.ts
init_src4();
init_src2();
async function registerWorkItemRoutes(app) {
  app.get("/api/v1/companies/:companyId/work-items", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const query = request.query;
      let workItems = await listWorkItems(
        request.server.db,
        actor.organizationId,
        company.id
      );
      if (query.status) {
        workItems = workItems.filter((item) => item.status === query.status);
      }
      return { workItems: workItems.map(toWorkItem) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.post("/api/v1/companies/:companyId/work-items", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create work items", request.correlationId);
    }
    const parsed = workItemCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid work item", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        request.params.companyId
      );
      const workItem = await createWorkItem(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        ownerStaffUserId: actor.staffUserId,
        ...parsed.data
      });
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "work_item.create",
        targetType: "work_item",
        targetId: workItem.id,
        summary: `Created work item ${workItem.title}`,
        correlationId: request.correlationId
      });
      return reply.status(201).send({ workItem: toWorkItem(workItem) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.get("/api/v1/companies/:companyId/work-items/:workItemId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const workItem = await getWorkItem(
        request.server.db,
        actor.organizationId,
        company.id,
        params.workItemId
      );
      if (!workItem) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      return { workItem: toWorkItem(workItem) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
  app.patch("/api/v1/companies/:companyId/work-items/:workItemId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update work items", request.correlationId);
    }
    const parsed = workItemPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid work item update", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const updated = await updateWorkItem(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        workItemId: params.workItemId,
        ...parsed.data
      });
      if (!updated) {
        return sendError(reply, 409, "conflict", "Work item changed or not found", request.correlationId);
      }
      return { workItem: toWorkItem(updated) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
}

// apps/api/src/routes/workflows.ts
init_src4();
init_src2();
import { randomUUID as randomUUID10 } from "node:crypto";
async function handleDomain3(reply, correlationId, error) {
  if (error instanceof DomainError) {
    return sendError(reply, error.statusCode, error.code, error.message, correlationId);
  }
  throw error;
}
function toRun(row) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    personId: row.person_id,
    kind: row.kind,
    status: row.status,
    templateId: row.template_id,
    templateVersionId: row.template_version_id,
    frozenPlan: row.frozen_plan,
    actorStaffUserId: row.actor_staff_user_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    approvedAt: row.approved_at?.toISOString() ?? null,
    canceledAt: row.canceled_at?.toISOString() ?? null
  };
}
function toStep(row) {
  return {
    id: row.id,
    key: row.step_key,
    kind: row.kind,
    executionMethod: row.execution_method,
    dependsOn: row.depends_on,
    status: row.status,
    summary: row.summary,
    params: row.params,
    evidence: row.result_evidence,
    error: row.error_message
  };
}
async function registerWorkflowRoutes(app) {
  app.get("/api/v1/role-templates", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    const templates = await listRoleTemplates(request.server.db, actor.organizationId);
    return {
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        currentVersion: t.currentVersion ? {
          id: t.currentVersion.id,
          versionNumber: t.currentVersion.version_number,
          intents: t.currentVersion.intents
        } : null
      }))
    };
  });
  app.get("/api/v1/notifications", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    const items = await listNotifications(request.server.db, actor.organizationId, actor.staffUserId);
    return {
      notifications: items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        runId: n.run_id,
        createdAt: n.created_at.toISOString(),
        readAt: n.read_at?.toISOString() ?? null
      }))
    };
  });
  app.get("/api/v1/companies/:companyId/template-bindings", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(request, request.params.companyId);
      const templateId = request.query.templateId;
      if (!templateId) {
        return sendError(reply, 400, "invalid_request", "templateId is required", request.correlationId);
      }
      const bindings = await listCompanyBindings(request.server.db, actor.organizationId, company.id, templateId);
      return {
        bindings: bindings.map((b) => ({
          id: b.id,
          bindingKey: b.binding_key,
          resourceType: b.resource_type,
          resourceId: b.resource_id
        }))
      };
    } catch (error) {
      return handleDomain3(reply, request.correlationId, error);
    }
  });
  app.put("/api/v1/companies/:companyId/template-bindings", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "admin") && actor.role !== "technician") {
      return sendError(reply, 403, "forbidden", "Cannot edit bindings", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(request, request.params.companyId);
      const body = request.body;
      const binding = await upsertCompanyBinding(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        templateId: body.templateId,
        bindingKey: body.bindingKey,
        resourceType: body.resourceType,
        resourceId: body.resourceId
      });
      return { binding };
    } catch (error) {
      return handleDomain3(reply, request.correlationId, error);
    }
  });
  app.get("/api/v1/companies/:companyId/workflows", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(request, request.params.companyId);
      const personId = request.query.personId;
      const runs = await listWorkflowRuns(request.server.db, actor.organizationId, company.id, personId);
      return { runs: runs.map((r) => toRun(r)) };
    } catch (error) {
      return handleDomain3(reply, request.correlationId, error);
    }
  });
  app.get("/api/v1/companies/:companyId/workflows/:runId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const run = await getWorkflowRun(request.server.db, actor.organizationId, company.id, params.runId);
      if (!run) return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      const steps = await listWorkflowSteps(request.server.db, run.id);
      return { run: toRun(run), steps: steps.map(toStep) };
    } catch (error) {
      return handleDomain3(reply, request.correlationId, error);
    }
  });
  app.post("/api/v1/companies/:companyId/people/:personId/workflows", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot start workflows", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body;
      const key = body.idempotencyKey ?? randomUUID10();
      const args = {
        organizationId: actor.organizationId,
        companyId: company.id,
        personId: params.personId,
        actorStaffUserId: actor.staffUserId,
        idempotencyKey: key,
        correlationId: request.correlationId
      };
      const result = body.kind === "onboarding" ? await previewOnboarding(request.server.db, {
        ...args,
        templateId: body.templateId,
        templateVersionId: body.templateVersionId,
        usageLocation: body.usageLocation
      }) : body.kind === "offboarding" ? await previewOffboarding(request.server.db, args) : await previewStatusChange(request.server.db, {
        ...args,
        toStatus: body.toStatus ?? "active",
        departureDate: body.departureDate
      });
      const steps = await listWorkflowSteps(request.server.db, result.run.id);
      return { run: toRun(result.run), plan: result.plan, steps: steps.map(toStep) };
    } catch (error) {
      return handleDomain3(reply, request.correlationId, error);
    }
  });
  async function mutateRun(request, reply, action) {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    const needsExecute = action === "execute" || action === "retry";
    if (!canMutate(actor, needsExecute ? "automation" : "manual")) {
      return sendError(
        reply,
        403,
        "forbidden",
        needsExecute ? "Automation execute permission required" : "Cannot mutate workflow",
        request.correlationId
      );
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const ids = { organizationId: actor.organizationId, companyId: company.id, runId: params.runId };
      if (action === "approve") await approveWorkflowRun(request.server.db, ids);
      else if (action === "execute") await executeWorkflowRun(request.server.db, ids);
      else if (action === "retry") await retryFailedSteps(request.server.db, ids);
      else await cancelWorkflowRun(request.server.db, ids);
      const run = await getWorkflowRun(request.server.db, actor.organizationId, company.id, params.runId);
      const steps = run ? await listWorkflowSteps(request.server.db, run.id) : [];
      return { run: toRun(run), steps: steps.map(toStep) };
    } catch (error) {
      return handleDomain3(reply, request.correlationId, error);
    }
  }
  app.post(
    "/api/v1/companies/:companyId/workflows/:runId/approve",
    (request, reply) => mutateRun(request, reply, "approve")
  );
  app.post(
    "/api/v1/companies/:companyId/workflows/:runId/execute",
    (request, reply) => mutateRun(request, reply, "execute")
  );
  app.post(
    "/api/v1/companies/:companyId/workflows/:runId/retry",
    (request, reply) => mutateRun(request, reply, "retry")
  );
  app.post(
    "/api/v1/companies/:companyId/workflows/:runId/cancel",
    (request, reply) => mutateRun(request, reply, "cancel")
  );
  app.post("/api/v1/companies/:companyId/workflows/:runId/steps/:stepId/fulfill", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Cannot fulfill steps", request.correlationId);
    }
    try {
      const params = request.params;
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body;
      if (!body.evidence?.trim()) {
        return sendError(reply, 400, "invalid_request", "Evidence is required", request.correlationId);
      }
      await fulfillManualStep(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        runId: params.runId,
        stepId: params.stepId,
        actorStaffUserId: actor.staffUserId,
        evidence: body.evidence.trim()
      });
      const run = await getWorkflowRun(request.server.db, actor.organizationId, company.id, params.runId);
      const steps = run ? await listWorkflowSteps(request.server.db, run.id) : [];
      return { run: toRun(run), steps: steps.map(toStep) };
    } catch (error) {
      return handleDomain3(reply, request.correlationId, error);
    }
  });
}

// apps/api/src/app.ts
async function buildApp(env, pool) {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL }
  });
  const auth = createAuth(pool, env);
  app.decorate("db", pool);
  app.decorate("auth", auth);
  app.decorate("env", env);
  await app.register(cors, {
    origin: localDevOrigins(env.WEB_ORIGIN),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Request-Id"]
  });
  app.addHook("onRequest", async (request, reply) => {
    request.correlationId = correlationIdFrom(request);
    request.actor = null;
    reply.header("x-request-id", request.correlationId);
  });
  app.addHook("preHandler", async (request, reply) => {
    const mutating = ["POST", "PATCH", "PUT", "DELETE"].includes(request.method);
    if (!mutating) {
      return;
    }
    if (request.url.startsWith("/api/auth")) {
      return;
    }
    const ok = isAllowedWebOrigin(
      typeof request.headers.origin === "string" ? request.headers.origin : void 0,
      typeof request.headers.referer === "string" ? request.headers.referer : void 0,
      env.WEB_ORIGIN
    );
    if (!ok) {
      return sendError(reply, 403, "origin_forbidden", "Origin check failed", request.correlationId);
    }
  });
  app.setErrorHandler(async (error, request, reply) => {
    request.log.error({ err: error, correlationId: request.correlationId }, "unhandled");
    if (reply.sent) {
      return;
    }
    return sendError(reply, 500, "internal_error", "Unexpected server error", request.correlationId);
  });
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      const url = new URL(request.url, env.BETTER_AUTH_URL);
      const headers = fromNodeHeaders3(request.headers);
      const init = {
        method: request.method,
        headers
      };
      if (request.method !== "GET" && request.method !== "HEAD" && request.body) {
        init.body = JSON.stringify(request.body);
      }
      const response = await auth.handler(new Request(url.toString(), init));
      reply.status(response.status);
      const cookies = response.headers.getSetCookie?.() ?? [];
      if (cookies.length > 0) {
        reply.header("set-cookie", cookies);
      }
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
          return;
        }
        reply.header(key, value);
      });
      const text = await response.text();
      if (!text) {
        return reply.send(null);
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        return reply.send(JSON.parse(text));
      }
      return reply.type(contentType || "text/plain").send(text);
    }
  });
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/ready", async (_request, reply) => {
    await pool.query("SELECT 1");
    return reply.send({ status: "ready", database: "ok" });
  });
  app.addHook("preHandler", async (request) => {
    if (request.url.startsWith("/api/v1")) {
      request.actor = await loadActor(request);
    }
  });
  await registerSessionRoutes(app);
  await registerCompanyRoutes(app);
  await registerOverviewRoutes(app);
  await registerFileRoutes(app);
  await registerDemoRoutes(app);
  await registerPeopleRoutes(app);
  await registerAccountRoutes(app);
  await registerProductRoutes(app);
  await registerSubscriptionRoutes(app);
  await registerGroupRoutes(app);
  await registerMailboxRoutes(app);
  await registerDeviceRoutes(app);
  await registerWorkItemRoutes(app);
  await registerWorkflowRoutes(app);
  await registerIncidentRoutes(app);
  await registerImportRoutes(app);
  await registerIntegrationRoutes(app);
  app.get("/api/v1/organization", async (request, reply) => {
    if (!request.actor) {
      return sendError(reply, 401, "unauthenticated", "Sign in required", request.correlationId);
    }
    const organization = await getOrganization(pool, request.actor.organizationId);
    if (!organization) {
      return sendError(reply, 404, "not_found", "Not found", request.correlationId);
    }
    return {
      organization: {
        id: organization.id,
        name: organization.name,
        environment: organization.deployment_environment
      }
    };
  });
  return app;
}

// apps/api/src/env.ts
import { z as z7 } from "zod";
var schema = z7.object({
  DATABASE_URL: z7.string().min(1),
  BETTER_AUTH_SECRET: z7.string().min(32),
  BETTER_AUTH_URL: z7.string().url(),
  WEB_ORIGIN: z7.string().url(),
  API_HOST: z7.string().default("127.0.0.1"),
  API_PORT: z7.coerce.number().default(4e3),
  RANGER_MODE: z7.enum(["private", "demo"]).default("private"),
  /** Required for local seed scripts; unused by the HTTP server at runtime. */
  SEED_STAFF_PASSWORD: z7.string().min(8).default("unused-at-runtime"),
  LOG_LEVEL: z7.string().default("info")
});
function withPlatformDefaults(source) {
  const next = { ...source };
  const onVercel = next.VERCEL === "1" || next.VERCEL === "true";
  if (!onVercel) {
    return next;
  }
  const host = next.VERCEL_PROJECT_PRODUCTION_URL || next.VERCEL_URL;
  if (host) {
    const origin = host.startsWith("http") ? host : `https://${host}`;
    next.WEB_ORIGIN ??= origin;
    next.BETTER_AUTH_URL ??= origin;
  }
  next.RANGER_MODE ??= "demo";
  next.EVIDENCE_STORAGE_DIR ??= "/tmp/ranger-evidence";
  return next;
}
function loadEnv(source = process.env) {
  return schema.parse(withPlatformDefaults(source));
}

// apps/api/src/vercel-handler.ts
var appPromise = null;
async function getApp() {
  if (!appPromise) {
    const env = loadEnv();
    const pool = createPool(env.DATABASE_URL);
    appPromise = buildApp(env, pool);
  }
  return appPromise;
}
var handler = async (req, res) => {
  const app = await getApp();
  await app.ready();
  app.server.emit("request", req, res);
};
var vercel_handler_default = handler;
export {
  vercel_handler_default as default
};
