import { z } from "zod";

const uuid = z.string().uuid();

export const providerKindSchema = z.enum(["demo", "microsoft"]);
export const connectionStatusSchema = z.enum(["draft", "connected", "error", "disabled"]);
export const syncCollectionSchema = z.enum([
  "users",
  "groups",
  "group_memberships",
  "subscribed_skus",
  "capabilities",
]);
export const syncRunStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "partial",
  "failed",
]);

export const providerConnectionSchema = z.object({
  id: uuid,
  organizationId: uuid,
  companyId: uuid,
  providerKind: providerKindSchema,
  tenantId: z.string().nullable(),
  displayName: z.string(),
  status: connectionStatusSchema,
  credentialRef: z.string().nullable(),
  failureMode: z.string().nullable(),
  lastSuccessAt: z.string().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
});

export const syncRunSchema = z.object({
  id: uuid,
  organizationId: uuid,
  companyId: uuid,
  connectionId: uuid,
  collection: syncCollectionSchema,
  status: syncRunStatusSchema,
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  itemCount: z.number().int(),
  pageCount: z.number().int(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  correlationId: z.string().nullable(),
  createdAt: z.string(),
});

export const connectionCreateSchema = z.object({
  providerKind: providerKindSchema,
  displayName: z.string().min(1).max(200),
  tenantId: z.string().min(1).max(100).nullable().optional(),
  credentialRef: z.string().min(1).max(200).nullable().optional(),
  failureMode: z.string().max(100).nullable().optional(),
});

export const syncNowSchema = z.object({
  collections: z.array(syncCollectionSchema).min(1).optional(),
});

export type ProviderConnection = z.infer<typeof providerConnectionSchema>;
export type SyncRun = z.infer<typeof syncRunSchema>;
