import {
  SEED_COMPANY_IDS,
  SEED_GROUP_IDS,
  SEED_ORGANIZATION_ID,
  SEED_SUBSCRIPTION_IDS,
  SEED_TEMPLATE_IDS,
  SEED_TEMPLATE_VERSION_IDS,
} from "@ranger/test-fixtures";
import type { TemplateIntent } from "@ranger/domain";
import type { DbClient } from "./pool.ts";
import { createRoleTemplate, upsertCompanyBinding } from "./lifecycle.ts";

const PROJECT_COORDINATOR_INTENTS: TemplateIntent[] = [
  { key: "account", kind: "create_account", usageLocation: "US" },
  { key: "security-group", kind: "group_membership", bindingKey: "security" },
  { key: "sketchup", kind: "license", bindingKey: "sketchup" },
  { key: "mailbox", kind: "manual_mailbox" },
];

export async function seedLifecycle(client: DbClient): Promise<void> {
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
    versionId: SEED_TEMPLATE_VERSION_IDS.projectCoordinatorV1,
  });

  await upsertCompanyBinding(client, {
    organizationId: SEED_ORGANIZATION_ID,
    companyId: SEED_COMPANY_IDS.harbor,
    templateId: SEED_TEMPLATE_IDS.projectCoordinator,
    bindingKey: "security",
    resourceType: "group",
    resourceId: SEED_GROUP_IDS.harborDesignSecurity,
  });
  await upsertCompanyBinding(client, {
    organizationId: SEED_ORGANIZATION_ID,
    companyId: SEED_COMPANY_IDS.harbor,
    templateId: SEED_TEMPLATE_IDS.projectCoordinator,
    bindingKey: "sketchup",
    resourceType: "subscription",
    resourceId: SEED_SUBSCRIPTION_IDS.harborSketchup,
  });
}
