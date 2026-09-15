export const PERSON_IT_STATUSES = ["planned", "active", "on_leave", "departed"] as const;

export type PersonItStatus = (typeof PERSON_IT_STATUSES)[number];

export const WORKFLOW_BADGES = [
  "onboarding_in_progress",
  "offboarding_scheduled",
  "offboarding_in_progress",
  "needs_attention",
] as const;

export type WorkflowBadge = (typeof WORKFLOW_BADGES)[number];

export function isPersonItStatus(value: string): value is PersonItStatus {
  return (PERSON_IT_STATUSES as readonly string[]).includes(value);
}

export function isWorkflowBadge(value: string): value is WorkflowBadge {
  return (WORKFLOW_BADGES as readonly string[]).includes(value);
}

/** Archived is display/gate state via archived_at, not an it_status value. */
export function isArchivedPerson(archivedAt: Date | string | null | undefined): boolean {
  return archivedAt != null;
}

export function displayPersonStatusLabel(input: {
  itStatus: PersonItStatus;
  archivedAt?: Date | string | null;
  workflowBadge?: WorkflowBadge | string | null;
}): string {
  if (isArchivedPerson(input.archivedAt)) {
    return "Archived";
  }
  const statusLabel =
    input.itStatus === "on_leave"
      ? "On leave"
      : input.itStatus.charAt(0).toUpperCase() + input.itStatus.slice(1);

  if (!input.workflowBadge) {
    return statusLabel;
  }

  const badge =
    input.workflowBadge === "onboarding_in_progress"
      ? "Onboarding in progress"
      : input.workflowBadge === "offboarding_scheduled"
        ? "Offboarding scheduled"
        : input.workflowBadge === "offboarding_in_progress"
          ? "Offboarding in progress"
          : input.workflowBadge === "needs_attention"
            ? "Needs attention"
            : String(input.workflowBadge);

  return `${statusLabel} · ${badge}`;
}

export function canReceiveNewAssignments(input: {
  itStatus: PersonItStatus;
  archivedAt?: Date | string | null;
  offboardingExecuting?: boolean;
}): boolean {
  if (isArchivedPerson(input.archivedAt)) {
    return false;
  }
  if (input.itStatus === "departed") {
    return false;
  }
  if (input.offboardingExecuting) {
    return false;
  }
  return true;
}
