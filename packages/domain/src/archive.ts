import type { PersonItStatus } from "./person-status.ts";
import { isArchivedPerson } from "./person-status.ts";

export type LicenseAssignmentStatus = "active" | "removal_pending" | "ended";
export type ObligationStatus = "open" | "resolved" | "not_applicable";
export type MailboxAccessStatus = "active" | "ended";
export type DeviceAssignmentStatus = "current" | "historical";
export type AccountEnabledState = "enabled" | "disabled" | "unknown";

export type ArchiveBlockerCode =
  | "already_archived"
  | "not_departed"
  | "active_license_assignment"
  | "removal_pending_license_assignment"
  | "unresolved_mailbox_access"
  | "unresolved_obligation"
  | "account_not_disabled"
  | "unresolved_device_custody"
  | "lifecycle_operation_pending";

export type ArchiveBlocker = {
  code: ArchiveBlockerCode;
  message: string;
  targetType?: string;
  targetId?: string;
};

export type ArchivePersonSnapshot = {
  itStatus: PersonItStatus;
  archivedAt?: Date | string | null;
  lifecycleOperationPending?: boolean;
};

export type ArchiveLicenseAssignmentSnapshot = {
  id: string;
  status: LicenseAssignmentStatus;
};

export type ArchiveMailboxAccessSnapshot = {
  id: string;
  status: MailboxAccessStatus;
};

export type ArchiveObligationSnapshot = {
  id: string;
  obligationKind: string;
  targetType: string;
  targetId: string;
  status: ObligationStatus;
};

export type ArchiveAccountSnapshot = {
  id: string;
  accountKind: "human" | "guest" | "service" | "shared_mailbox_ref";
  enabledState: AccountEnabledState;
};

export type ArchiveDeviceAssignmentSnapshot = {
  id: string;
  status: DeviceAssignmentStatus;
  custodyDisposition?: string | null;
};

export type ArchiveReadinessSnapshot = {
  person: ArchivePersonSnapshot;
  licenseAssignments?: ArchiveLicenseAssignmentSnapshot[];
  mailboxAccess?: ArchiveMailboxAccessSnapshot[];
  obligations?: ArchiveObligationSnapshot[];
  linkedAccounts?: ArchiveAccountSnapshot[];
  deviceAssignments?: ArchiveDeviceAssignmentSnapshot[];
};

export type ArchiveReadinessResult = {
  ready: boolean;
  blockers: ArchiveBlocker[];
};

/**
 * Pure archive-gate evaluator for M1 (manual obligations + current relationships).
 * Server wrappers supply the authorized snapshot; this function stays testable and side-effect free.
 */
export function evaluateArchiveReadiness(snapshot: ArchiveReadinessSnapshot): ArchiveReadinessResult {
  const blockers: ArchiveBlocker[] = [];

  if (isArchivedPerson(snapshot.person.archivedAt)) {
    blockers.push({
      code: "already_archived",
      message: "Person is already archived",
    });
  }

  if (snapshot.person.itStatus !== "departed") {
    blockers.push({
      code: "not_departed",
      message: "Person must be Departed before archiving",
    });
  }

  if (snapshot.person.lifecycleOperationPending) {
    blockers.push({
      code: "lifecycle_operation_pending",
      message: "A lifecycle operation is still running or awaiting verification",
    });
  }

  for (const assignment of snapshot.licenseAssignments ?? []) {
    if (assignment.status === "active") {
      blockers.push({
        code: "active_license_assignment",
        message: "Active personal license assignment remains",
        targetType: "license_assignment",
        targetId: assignment.id,
      });
    } else if (assignment.status === "removal_pending") {
      blockers.push({
        code: "removal_pending_license_assignment",
        message: "Removal-pending license assignment remains a current obligation",
        targetType: "license_assignment",
        targetId: assignment.id,
      });
    }
  }

  for (const access of snapshot.mailboxAccess ?? []) {
    if (access.status === "active") {
      blockers.push({
        code: "unresolved_mailbox_access",
        message: "Unresolved shared mailbox permission remains",
        targetType: "mailbox_access",
        targetId: access.id,
      });
    }
  }

  for (const obligation of snapshot.obligations ?? []) {
    if (obligation.status === "open") {
      blockers.push({
        code: "unresolved_obligation",
        message: `Unresolved offboarding obligation (${obligation.obligationKind})`,
        targetType: obligation.targetType,
        targetId: obligation.targetId,
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
        targetId: account.id,
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
        targetId: device.id,
      });
    }
  }

  return {
    ready: blockers.length === 0,
    blockers,
  };
}
