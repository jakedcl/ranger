import { api } from "../lib/api.ts";

export type DemoTourStep = {
  id: string;
  title: string;
  body: string;
  /** CSS selector for spotlight; may include placeholders filled after resolve */
  selector?: string;
  /** Navigate before highlighting — may be async after resolving Harbor ids */
  resolvePath?: () => Promise<string | null>;
  path?: string;
  placement?: "auto" | "bottom" | "top" | "left" | "right";
  /** Optional: resolve dynamic selector (e.g. person id) */
  resolveSelector?: () => Promise<string | undefined>;
};

type DemoIds = {
  harborId: string;
  alexId: string;
  caseyId: string;
  licenseIncidentId: string | null;
};

let cachedIds: DemoIds | null = null;

export async function resolveDemoIds(): Promise<DemoIds> {
  if (cachedIds) return cachedIds;
  const { companies } = await api.companies();
  const harbor =
    companies.find((c) => c.slug === "harbor-architecture") ??
    companies.find((c) => /harbor/i.test(c.name));
  if (!harbor) throw new Error("Harbor Architecture not found in this workspace");

  const { people } = await api.listPeople(harbor.id);
  const alex =
    people.find((p) => p.workEmail.toLowerCase() === "alex.rivera@harbor.example") ??
    people.find((p) => /alex rivera/i.test(p.displayName));
  const casey =
    people.find((p) => p.workEmail.toLowerCase() === "casey.nguyen@harbor.example") ??
    people.find((p) => /casey nguyen/i.test(p.displayName));
  if (!alex || !casey) throw new Error("Alex/Casey seed people missing — reset or re-enter demo");

  const { incidents } = await api.listIncidents(harbor.id);
  const license =
    incidents.find((i) => /sketchup license/i.test(i.title)) ??
    incidents.find((i) => /LicenseAssignmentFailed/i.test(i.providerError ?? "")) ??
    null;

  cachedIds = {
    harborId: harbor.id,
    alexId: alex.id,
    caseyId: casey.id,
    licenseIncidentId: license?.id ?? null,
  };
  return cachedIds;
}

export function clearDemoIdCache(): void {
  cachedIds = null;
}

export const DEMO_TOUR_STEPS: DemoTourStep[] = [
  {
    id: "welcome",
    title: "Synthetic guided demo",
    body: "You’re in an isolated Demo workspace (or the local Northstar seed). Scenario date 2026-09-30. No live Microsoft credentials — badge stays Demo.",
    path: "/",
    selector: "[data-tour='demo-badge']",
  },
  {
    id: "scope",
    title: "Company scope",
    body: "Technicians pick a client company. Harbor Architecture holds the joiner/leaver story.",
    path: "/",
    selector: "[data-tour='company-scope']",
  },
  {
    id: "board",
    title: "Joiner / leaver board",
    body: "Overview shows starts, ends, offboarding, open checklists, and seat timing. Days first; after 30 days ~month reading aids.",
    path: "/",
    selector: "[data-tour='lifecycle-board']",
  },
  {
    id: "queues",
    title: "Open work counts",
    body: "Waiting steps, offboarding people, upcoming dates, stale connections, open incidents.",
    path: "/",
    selector: "[data-tour='overview-queues']",
  },
  {
    id: "people-nav",
    title: "People",
    body: "Inventory starts with people. Same records appear under Resources — one domain model.",
    resolvePath: async () => {
      const ids = await resolveDemoIds();
      return `/companies/${ids.harborId}/people`;
    },
    selector: "[data-tour='nav-people']",
  },
  {
    id: "alex",
    title: "Alex Rivera — contractor history",
    body: "Alex had SketchUp seats for Sep 3–17. On the scenario date those assignments are Ended. No automatic “savings” claim.",
    resolvePath: async () => {
      const ids = await resolveDemoIds();
      return `/companies/${ids.harborId}/people`;
    },
    resolveSelector: async () => {
      const ids = await resolveDemoIds();
      return `[data-tour='person-${ids.alexId}']`;
    },
  },
  {
    id: "alex-profile",
    title: "Timing on the person",
    body: "Profile shows IT status, dates, and duration. Assignments keep the same history.",
    resolvePath: async () => {
      const ids = await resolveDemoIds();
      return `/companies/${ids.harborId}/people/${ids.alexId}`;
    },
    selector: "[data-tour='person-timing']",
  },
  {
    id: "casey",
    title: "Casey — planned starter",
    body: "Casey is the onboarding story. Start onboarding with a role template when you’re ready to click for real.",
    resolvePath: async () => {
      const ids = await resolveDemoIds();
      return `/companies/${ids.harborId}/people/${ids.caseyId}`;
    },
    selector: "[data-tour='start-onboarding']",
  },
  {
    id: "status",
    title: "Change status → checklist",
    body: "Status changes open a frozen checklist. Departed steers into full offboarding while status stays visible.",
    resolvePath: async () => {
      const ids = await resolveDemoIds();
      return `/companies/${ids.harborId}/people/${ids.caseyId}`;
    },
    selector: "[data-tour='change-status']",
  },
  {
    id: "automations",
    title: "Automations",
    body: "Workflow runs: preview → approve → execute. Failed steps can Create incident with context attached.",
    resolvePath: async () => {
      const ids = await resolveDemoIds();
      return `/companies/${ids.harborId}/automations`;
    },
    selector: "[data-tour='nav-automations']",
  },
  {
    id: "incidents",
    title: "Incidents",
    body: "Investigations with private evidence. This workspace includes a SketchUp license failure for related-suggestion demos.",
    resolvePath: async () => {
      const ids = await resolveDemoIds();
      return `/companies/${ids.harborId}/incidents`;
    },
    selector: "[data-tour='nav-incidents']",
  },
  {
    id: "license-incident",
    title: "Seeded license incident",
    body: "Open the earlier SketchUp license assign failure — resolved with a confirmed cause.",
    resolvePath: async () => {
      const ids = await resolveDemoIds();
      return `/companies/${ids.harborId}/incidents`;
    },
    resolveSelector: async () => {
      const ids = await resolveDemoIds();
      if (!ids.licenseIncidentId) return "[data-tour='nav-incidents']";
      return `[data-tour='incident-${ids.licenseIncidentId}']`;
    },
  },
  {
    id: "related",
    title: "Related + export",
    body: "Related suggestions show score reasons. Export builds a private ZIP — viewers cannot export.",
    resolvePath: async () => {
      const ids = await resolveDemoIds();
      if (!ids.licenseIncidentId) return `/companies/${ids.harborId}/incidents`;
      return `/companies/${ids.harborId}/incidents/${ids.licenseIncidentId}`;
    },
    selector: "[data-tour='incident-related']",
  },
  {
    id: "done",
    title: "You’re set",
    body: "Try Start onboarding on Casey, or Change status → Departed. Staff login uses the full Northstar seed; /demo creates a fresh isolated copy. Restart from Guided demo anytime.",
    path: "/",
    selector: "[data-tour='start-demo-tour']",
  },
];
