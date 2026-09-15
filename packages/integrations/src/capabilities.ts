import { CAPABILITY_IDS, type CapabilityState } from "./types.ts";

const READ_GRAPH = {
  access: "read" as const,
  executionMethod: "graph" as const,
};

/** Baseline M2 inventory capabilities (implemented code paths; grant/availability vary). */
export function buildInventoryCapabilities(input: {
  granted: boolean;
  availableInTenant: boolean;
  lastTestedAt?: string | null;
  /** Per-capability grant overrides (e.g. groups denied). */
  overrides?: Partial<
    Record<
      (typeof CAPABILITY_IDS)[keyof typeof CAPABILITY_IDS],
      Partial<Pick<CapabilityState, "granted" | "availableInTenant" | "lastTestedAt">>
    >
  >;
}): CapabilityState[] {
  const base = {
    implemented: true,
    granted: input.granted,
    availableInTenant: input.availableInTenant,
    lastTestedAt: input.lastTestedAt ?? null,
    ...READ_GRAPH,
  };

  const caps: CapabilityState[] = [
    { id: CAPABILITY_IDS.usersRead, ...base },
    { id: CAPABILITY_IDS.groupsRead, ...base },
    { id: CAPABILITY_IDS.groupMembersRead, ...base },
    { id: CAPABILITY_IDS.skusRead, ...base },
  ];

  if (!input.overrides) return caps;

  return caps.map((cap) => {
    const patch = input.overrides?.[cap.id as keyof typeof input.overrides];
    return patch ? { ...cap, ...patch } : cap;
  });
}
