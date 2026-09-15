export const SEED_ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";

export const SEED_COMPANY_IDS = {
  harbor: "22222222-2222-4222-8222-222222222221",
  cedar: "22222222-2222-4222-8222-222222222222",
  summit: "22222222-2222-4222-8222-222222222223",
} as const;

export const SEED_STAFF = {
  admin: {
    email: "admin@northstar.example",
    name: "Northstar Admin",
    role: "admin",
  },
  technician: {
    email: "technician@northstar.example",
    name: "Taylor Chen",
    role: "technician",
  },
  viewer: {
    email: "viewer@northstar.example",
    name: "Riley Patel",
    role: "viewer",
  },
} as const;

export const SEED_COMPANIES = [
  {
    id: SEED_COMPANY_IDS.harbor,
    name: "Harbor Architecture",
    slug: "harbor-architecture",
    domains: ["harbor.example"],
    itContactName: "Alex Rivera",
    itContactEmail: "it@harbor.example",
    itNotes: "Primary contractor onboarding and design subscriptions.",
  },
  {
    id: SEED_COMPANY_IDS.cedar,
    name: "Cedar Studio",
    slug: "cedar-studio",
    domains: ["cedar.example"],
    itContactName: "Jordan Blake",
    itContactEmail: "it@cedar.example",
    itNotes: "Separate company with similar product names.",
  },
  {
    id: SEED_COMPANY_IDS.summit,
    name: "Summit Systems",
    slug: "summit-systems",
    domains: ["summit.example"],
    itContactName: "Sam Okonkwo",
    itContactEmail: "it@summit.example",
    itNotes: "Smaller internal-style IT environment.",
  },
] as const;

/** Fixed scenario clock for synthetic IT lifecycle demos (not wall-clock). */
export const SCENARIO_DATE = "2026-09-30";

export const SEED_PRODUCT_IDS = {
  sketchupPro: "33333333-3333-4333-8333-333333333331",
  adobeCc: "33333333-3333-4333-8333-333333333332",
  m365: "33333333-3333-4333-8333-333333333333",
  orgWideBackup: "33333333-3333-4333-8333-333333333334",
} as const;

export const SEED_PERSON_IDS = {
  alexRiveraHarbor: "44444444-4444-4444-8444-444444444441",
  plannedStarterHarbor: "44444444-4444-4444-8444-444444444442",
  departedMailboxHarbor: "44444444-4444-4444-8444-444444444443",
  archivedCleanHarbor: "44444444-4444-4444-8444-444444444444",
  sameNameHarbor: "44444444-4444-4444-8444-444444444445",
  sameNameCedar: "44444444-4444-4444-8444-444444444446",
} as const;

export const SEED_SUBSCRIPTION_IDS = {
  harborSketchup: "55555555-5555-4555-8555-555555555551",
} as const;

/** Matches packages/db seed-inventory uuid(700..702). */
export const SEED_GROUP_IDS = {
  harborDesignSecurity: "66666666-6666-4666-8666-000000000700",
  harborStudioM365: "66666666-6666-4666-8666-000000000701",
  harborAllStaff: "66666666-6666-4666-8666-000000000702",
} as const;

export const SEED_TEMPLATE_IDS = {
  projectCoordinator: "77777777-7777-4777-8777-777777777771",
} as const;

export const SEED_TEMPLATE_VERSION_IDS = {
  projectCoordinatorV1: "77777777-7777-4777-8777-777777777772",
} as const;

