import { randomUUID } from "node:crypto";
import {
  DemoInventoryProvider,
  MicrosoftInventoryProvider,
  ProviderError,
  type InventoryProvider,
  type ObservedGroup,
} from "@ranger/integrations";
import type { DbClient } from "./pool.ts";
import {
  applyAccountObservations,
  applyGroupObservations,
  applyMembershipObservations,
  applySkuObservations,
  createPersonLinkProposals,
  createSyncRun,
  finishSyncRun,
  getConnection,
  updateConnectionStatus,
  upsertCollectionState,
  type SyncCollection,
} from "./provider-sync.ts";

function classifyGroup(group: ObservedGroup): {
  groupType: "security" | "microsoft_365" | "distribution" | "mail_enabled_security" | "manual";
  membershipCapability: "direct" | "dynamic" | "unsupported";
} {
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

async function ensureObservedProduct(
  client: DbClient,
  organizationId: string,
  skuPartNumber: string,
): Promise<string> {
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM products
     WHERE organization_id = $1 AND name ILIKE $2
     LIMIT 1`,
    [organizationId, `%${skuPartNumber}%`],
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const m365 = await client.query<{ id: string }>(
    `SELECT id FROM products
     WHERE organization_id = $1 AND (name ILIKE '%Microsoft 365%' OR name ILIKE '%M365%')
     LIMIT 1`,
    [organizationId],
  );
  if (m365.rows[0]) return m365.rows[0].id;

  const id = randomUUID();
  await client.query(
    `INSERT INTO products (
      id, organization_id, name, vendor, category, assignment_model, documentation_url
    ) VALUES ($1,$2,$3,'Microsoft','productivity','named_user',NULL)`,
    [id, organizationId, `Observed SKU ${skuPartNumber}`],
  );
  return id;
}

export function providerForConnection(connection: {
  provider_kind: "demo" | "microsoft";
  failure_mode: string | null;
  tenant_id: string | null;
}): InventoryProvider {
  if (connection.provider_kind === "demo") {
    return new DemoInventoryProvider({
      connectionFailed: connection.failure_mode === "connection_failed",
      groupsUnauthorized: connection.failure_mode === "deny_groups",
      memberSyncGroupIds:
        connection.failure_mode === "partial_memberships"
          ? ["bbbbbbbb-0002-4000-8000-000000000001"]
          : "all",
    });
  }
  const clientId = process.env.MICROSOFT_INVENTORY_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_INVENTORY_CLIENT_SECRET;
  const tenantId = connection.tenant_id ?? process.env.MICROSOFT_TENANT_ID;
  return new MicrosoftInventoryProvider({
    credentials:
      tenantId && clientId && clientSecret ? { tenantId, clientId, clientSecret } : null,
  });
}

async function paginateUsers(provider: InventoryProvider) {
  const items = [];
  let page = 0;
  let nextLink: string | null | undefined;
  do {
    const result = await provider.listUsers(nextLink ? { nextLink } : undefined);
    items.push(...result.items);
    page += 1;
    nextLink = result.nextLink;
  } while (nextLink && page < 50);
  return { items, pageCount: page };
}

export async function runConnectionSync(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    connectionId: string;
    collections?: SyncCollection[];
    correlationId?: string;
  },
): Promise<{
  runs: Array<{ collection: string; status: string; itemCount: number; error?: string }>;
}> {
  const connection = await getConnection(
    client,
    input.organizationId,
    input.companyId,
    input.connectionId,
  );
  if (!connection) {
    throw new Error("Connection not found");
  }

  const collections: SyncCollection[] =
    input.collections ?? [
      "capabilities",
      "users",
      "groups",
      "group_memberships",
      "subscribed_skus",
    ];
  const provider = providerForConnection(connection);
  const source = connection.provider_kind;
  const results: Array<{
    collection: string;
    status: string;
    itemCount: number;
    error?: string;
  }> = [];

  for (const collection of collections) {
    const run = await createSyncRun(client, {
      organizationId: input.organizationId,
      companyId: input.companyId,
      connectionId: connection.id,
      collection,
      status: "running",
      correlationId: input.correlationId,
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
          pageCount: 1,
        });
        await upsertCollectionState(client, {
          connectionId: connection.id,
          collection,
          succeeded: true,
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
            enabledState:
              user.accountEnabled === false
                ? ("disabled" as const)
                : user.accountEnabled === true
                  ? ("enabled" as const)
                  : ("unknown" as const),
            freshnessNote: `Last ${source} observation via connection ${connection.id}`,
          })),
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
                loginName: user.userPrincipalName,
              },
            ];
          }),
        });
        await finishSyncRun(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          syncRunId: run.id,
          status: "succeeded",
          itemCount: items.length,
          pageCount,
        });
        await upsertCollectionState(client, {
          connectionId: connection.id,
          collection,
          succeeded: true,
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
              membershipCapability: classified.membershipCapability,
            };
          }),
        });
        await finishSyncRun(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          syncRunId: run.id,
          status: "succeeded",
          itemCount: page.items.length,
          pageCount: 1,
        });
        await upsertCollectionState(client, {
          connectionId: connection.id,
          collection,
          succeeded: true,
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
              membershipCapability: classified.membershipCapability,
            };
          }),
        });
        const membershipObs = [];
        for (const group of page.items) {
          const members = await provider.listGroupMembers(group.id);
          for (const member of members.items) {
            membershipObs.push({
              groupExternalId: group.id,
              accountExternalId: member.userId,
              membershipKind: "direct" as const,
              verificationSource: `${source}_sync`,
            });
          }
        }
        const applied = await applyMembershipObservations(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          providerSource: source,
          observations: membershipObs,
          partial: true,
        });
        await finishSyncRun(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          syncRunId: run.id,
          status: "succeeded",
          itemCount: applied.length,
          pageCount: 1,
        });
        await upsertCollectionState(client, {
          connectionId: connection.id,
          collection,
          succeeded: true,
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
            sku.skuPartNumber || sku.skuId,
          );
          observations.push({
            productId,
            providerSku: sku.skuPartNumber || sku.skuId,
            purchasedQuantity: sku.prepaidUnits.enabled ?? 0,
            consumedQuantity: sku.consumedUnits ?? 0,
            freshnessNote: `Observed ${sku.skuPartNumber} via ${source} (not a purchase price)`,
          });
        }
        await applySkuObservations(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          source,
          observations,
        });
        await finishSyncRun(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          syncRunId: run.id,
          status: "succeeded",
          itemCount: page.items.length,
          pageCount: 1,
        });
        await upsertCollectionState(client, {
          connectionId: connection.id,
          collection,
          succeeded: true,
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
        errorMessage: message,
      });
      await upsertCollectionState(client, {
        connectionId: connection.id,
        collection,
        succeeded: false,
        lastError: message,
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
    lastError: anyFail ? (results.find((r) => r.error)?.error ?? "partial sync errors") : null,
    lastSuccessAt: anySuccess ? new Date() : null,
    version: connection.version,
  });

  return { runs: results };
}
