import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router";
import type { SessionUser } from "@ranger/contracts";
import { api, canMutateInventory } from "../lib/api.ts";
import { formatMoney, labelStatus } from "../lib/format.ts";
import type { AccountKind, DeviceState, GroupType } from "../lib/inventory-types.ts";
import { CompanyScopeGate, useCompanyId } from "../lib/scope.tsx";
import { EmptyState, ErrorState, LoadingState, SourceFreshness, Tabs } from "../components/ui.tsx";

const RESOURCE_TABS = [
  { id: "accounts", label: "Accounts" },
  { id: "groups", label: "Groups" },
  { id: "mailboxes", label: "Mailboxes" },
  { id: "devices", label: "Devices" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "products", label: "Products" },
  { id: "import", label: "Import" },
] as const;

export function ResourcesPage({ initialTab }: { initialTab?: string } = {}) {
  const companyId = useCompanyId();
  const [params, setParams] = useSearchParams();
  const active = params.get("tab") ?? initialTab ?? "accounts";

  return (
    <div className="stack">
      <h1>Resources</h1>
      <p>Accounts, groups, mailboxes, devices, products, and subscriptions. Source and freshness stay separate.</p>
      <CompanyScopeGate companyId={companyId} action="view company resources">
        {companyId ? (
          <>
            <Tabs
              tabs={[...RESOURCE_TABS]}
              active={active}
              onChange={(id) => {
                const next = new URLSearchParams(params);
                next.set("tab", id);
                setParams(next);
              }}
            />
            {active === "accounts" ? <AccountsPanel companyId={companyId} /> : null}
            {active === "groups" ? <GroupsPanel companyId={companyId} /> : null}
            {active === "mailboxes" ? <MailboxesPanel companyId={companyId} /> : null}
            {active === "devices" ? <DevicesPanel companyId={companyId} /> : null}
            {active === "subscriptions" ? <SubscriptionsPanel companyId={companyId} /> : null}
            {active === "products" ? (
              <p>
                Organization catalog: <Link to="/products">Open product catalog</Link>
              </p>
            ) : null}
            {active === "import" ? <ImportPanel companyId={companyId} /> : null}
          </>
        ) : null}
      </CompanyScopeGate>
    </div>
  );
}

function AccountsPanel({ companyId }: { companyId: string }) {
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const accounts = useQuery({
    queryKey: ["accounts", companyId],
    queryFn: () => api.listAccounts(companyId),
  });
  const create = useMutation({
    mutationFn: (body: { loginName: string; accountKind: AccountKind }) =>
      api.createAccount(companyId, body),
    onSuccess: async () => {
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: ["accounts", companyId] });
    },
  });

  return (
    <section className="stack">
      {canMutate ? (
        <div className="actions">
          <button className="button" type="button" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Cancel" : "Add account"}
          </button>
        </div>
      ) : null}
      {showCreate && canMutate ? (
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            create.mutate({
              loginName: String(data.get("loginName")),
              accountKind: String(data.get("accountKind")) as AccountKind,
            });
          }}
        >
          <label className="required">
            Login name
            <input name="loginName" required />
          </label>
          <label>
            Kind
            <select name="accountKind" defaultValue="human">
              <option value="human">Human</option>
              <option value="guest">Guest</option>
              <option value="service">Service</option>
            </select>
          </label>
          {create.isError ? <ErrorState error={create.error} /> : null}
          <button className="button" type="submit" disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Create"}
          </button>
        </form>
      ) : null}
      {accounts.isLoading ? <LoadingState /> : null}
      {accounts.isError ? <ErrorState error={accounts.error} /> : null}
      {accounts.data?.accounts.length === 0 ? (
        <EmptyState>No accounts yet. Add a manual account or import CSV.</EmptyState>
      ) : null}
      {accounts.data && accounts.data.accounts.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Login</th>
                <th>Kind</th>
                <th>State</th>
                <th>Person</th>
                <th>Source / freshness</th>
              </tr>
            </thead>
            <tbody>
              {accounts.data.accounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    <Link to={`/companies/${companyId}/accounts/${account.id}`}>{account.loginName}</Link>
                  </td>
                  <td>{labelStatus(account.accountKind)}</td>
                  <td>{labelStatus(account.enabledState)}</td>
                  <td>
                    {account.personId ? (
                      <Link to={`/companies/${companyId}/people/${account.personId}`}>
                        {account.personName ?? "Linked"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <SourceFreshness
                      source={account.providerSource}
                      lastObservedAt={account.lastObservedAt}
                      freshnessNote={account.freshnessNote}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function GroupsPanel({ companyId }: { companyId: string }) {
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const groups = useQuery({
    queryKey: ["groups", companyId],
    queryFn: () => api.listGroups(companyId),
  });
  const create = useMutation({
    mutationFn: (body: { displayName: string; groupType: GroupType; emailAddress?: string }) =>
      api.createGroup(companyId, body),
    onSuccess: async () => {
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: ["groups", companyId] });
    },
  });

  return (
    <section className="stack">
      {canMutate ? (
        <button className="button" type="button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "Add group"}
        </button>
      ) : null}
      {showCreate && canMutate ? (
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            create.mutate({
              displayName: String(data.get("displayName")),
              groupType: String(data.get("groupType")) as GroupType,
              emailAddress: String(data.get("emailAddress") || "") || undefined,
            });
          }}
        >
          <label className="required">
            Name
            <input name="displayName" required />
          </label>
          <label>
            Type
            <select name="groupType" defaultValue="security">
              <option value="security">Security</option>
              <option value="microsoft_365">Microsoft 365</option>
              <option value="distribution">Distribution</option>
              <option value="mail_enabled_security">Mail-enabled security</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label>
            Email
            <input name="emailAddress" type="email" />
          </label>
          {create.isError ? <ErrorState error={create.error} /> : null}
          <button className="button" type="submit" disabled={create.isPending}>
            Create
          </button>
        </form>
      ) : null}
      {groups.isLoading ? <LoadingState /> : null}
      {groups.isError ? <ErrorState error={groups.error} /> : null}
      {groups.data?.groups.length === 0 ? <EmptyState>No groups yet.</EmptyState> : null}
      {groups.data && groups.data.groups.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Email</th>
                <th>Capability</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {groups.data.groups.map((group) => (
                <tr key={group.id}>
                  <td>
                    <Link to={`/companies/${companyId}/groups/${group.id}`}>{group.displayName}</Link>
                  </td>
                  <td>{labelStatus(group.groupType)}</td>
                  <td>{group.emailAddress ?? "—"}</td>
                  <td>{labelStatus(group.membershipCapability)}</td>
                  <td>
                    <SourceFreshness source={group.source} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function MailboxesPanel({ companyId }: { companyId: string }) {
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const mailboxes = useQuery({
    queryKey: ["mailboxes", companyId],
    queryFn: () => api.listMailboxes(companyId),
  });
  const create = useMutation({
    mutationFn: (body: { address: string }) => api.createMailbox(companyId, body),
    onSuccess: async () => {
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: ["mailboxes", companyId] });
    },
  });

  return (
    <section className="stack">
      {canMutate ? (
        <button className="button" type="button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "Add mailbox"}
        </button>
      ) : null}
      {showCreate && canMutate ? (
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            create.mutate({ address: String(data.get("address")) });
          }}
        >
          <label className="required">
            Address
            <input name="address" type="email" required />
          </label>
          {create.isError ? <ErrorState error={create.error} /> : null}
          <button className="button" type="submit" disabled={create.isPending}>
            Create
          </button>
        </form>
      ) : null}
      {mailboxes.isLoading ? <LoadingState /> : null}
      {mailboxes.isError ? <ErrorState error={mailboxes.error} /> : null}
      {mailboxes.data?.mailboxes.length === 0 ? <EmptyState>No shared mailboxes yet.</EmptyState> : null}
      {mailboxes.data && mailboxes.data.mailboxes.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Address</th>
                <th>State</th>
                <th>Owner</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {mailboxes.data.mailboxes.map((mailbox) => (
                <tr key={mailbox.id}>
                  <td>
                    <Link to={`/companies/${companyId}/mailboxes/${mailbox.id}`}>{mailbox.address}</Link>
                  </td>
                  <td>{mailbox.state}</td>
                  <td>{mailbox.ownerName ?? "—"}</td>
                  <td>
                    <SourceFreshness source={mailbox.source} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function DevicesPanel({ companyId }: { companyId: string }) {
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const devices = useQuery({
    queryKey: ["devices", companyId],
    queryFn: () => api.listDevices(companyId),
  });
  const create = useMutation({
    mutationFn: (body: { deviceType: string; hostname?: string; assetTag?: string; serial?: string }) =>
      api.createDevice(companyId, body),
    onSuccess: async () => {
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: ["devices", companyId] });
    },
  });

  return (
    <section className="stack">
      {canMutate ? (
        <button className="button" type="button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "Add device"}
        </button>
      ) : null}
      {showCreate && canMutate ? (
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            create.mutate({
              deviceType: String(data.get("deviceType")),
              hostname: String(data.get("hostname") || "") || undefined,
              assetTag: String(data.get("assetTag") || "") || undefined,
              serial: String(data.get("serial") || "") || undefined,
            });
          }}
        >
          <label className="required">
            Type
            <input name="deviceType" required placeholder="laptop" />
          </label>
          <label>
            Hostname
            <input name="hostname" />
          </label>
          <label>
            Asset tag
            <input name="assetTag" />
          </label>
          <label>
            Serial
            <input name="serial" />
          </label>
          {create.isError ? <ErrorState error={create.error} /> : null}
          <button className="button" type="submit" disabled={create.isPending}>
            Create
          </button>
        </form>
      ) : null}
      {devices.isLoading ? <LoadingState /> : null}
      {devices.isError ? <ErrorState error={devices.error} /> : null}
      {devices.data?.devices.length === 0 ? <EmptyState>No devices yet.</EmptyState> : null}
      {devices.data && devices.data.devices.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Device</th>
                <th>Type</th>
                <th>State</th>
                <th>Assigned to</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {devices.data.devices.map((device) => (
                <tr key={device.id}>
                  <td>
                    <Link to={`/companies/${companyId}/devices/${device.id}`}>
                      {device.hostname ?? device.assetTag ?? device.serial ?? device.id}
                    </Link>
                  </td>
                  <td>{device.deviceType}</td>
                  <td>{labelStatus(device.state as DeviceState)}</td>
                  <td>
                    {device.currentPersonId ? (
                      <Link to={`/companies/${companyId}/people/${device.currentPersonId}`}>
                        {device.currentPersonName ?? "Person"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{formatMoney(device.cost, device.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function SubscriptionsPanel({ companyId }: { companyId: string }) {
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const subscriptions = useQuery({
    queryKey: ["subscriptions", companyId],
    queryFn: () => api.listSubscriptions(companyId),
  });
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => api.listProducts({ includeRetired: false }),
    enabled: showCreate && canMutate,
  });
  const create = useMutation({
    mutationFn: (body: {
      productId: string;
      purchasedQuantity: number;
      currency: string;
      payer: "msp" | "company";
      billingCadence: string;
      unitPrice?: string;
    }) => api.createSubscription(companyId, body),
    onSuccess: async () => {
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: ["subscriptions", companyId] });
    },
  });

  return (
    <section className="stack">
      {canMutate ? (
        <button className="button" type="button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "Add subscription"}
        </button>
      ) : null}
      {showCreate && canMutate ? (
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            create.mutate({
              productId: String(data.get("productId")),
              purchasedQuantity: Number(data.get("purchasedQuantity")),
              currency: String(data.get("currency") || "USD"),
              payer: String(data.get("payer")) as "msp" | "company",
              billingCadence: String(data.get("billingCadence") || "annual"),
              unitPrice: String(data.get("unitPrice") || "") || undefined,
            });
          }}
        >
          <label className="required">
            Product
            <select name="productId" required defaultValue="">
              <option value="" disabled>
                Select catalog product…
              </option>
              {(products.data?.products ?? [])
                .filter((p) => !p.retiredAt)
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.vendor})
                  </option>
                ))}
            </select>
          </label>
          <label className="required">
            Purchased quantity
            <input name="purchasedQuantity" type="number" min={0} defaultValue={1} required />
          </label>
          <label>
            Currency
            <input name="currency" defaultValue="USD" maxLength={3} />
          </label>
          <label>
            Payer
            <select name="payer" defaultValue="company">
              <option value="company">Company</option>
              <option value="msp">MSP</option>
            </select>
          </label>
          <label>
            Billing cadence
            <input name="billingCadence" defaultValue="annual" />
          </label>
          <label>
            Unit price (blank = Unknown)
            <input name="unitPrice" />
          </label>
          {create.isError ? <ErrorState error={create.error} /> : null}
          <button className="button" type="submit" disabled={create.isPending}>
            Create
          </button>
        </form>
      ) : null}
      {subscriptions.isLoading ? <LoadingState /> : null}
      {subscriptions.isError ? <ErrorState error={subscriptions.error} /> : null}
      {subscriptions.data?.subscriptions.length === 0 ? (
        <EmptyState>No subscriptions. Add a catalog product first, then a company purchase.</EmptyState>
      ) : null}
      {subscriptions.data && subscriptions.data.subscriptions.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Seats</th>
                <th>Assigned</th>
                <th>State</th>
                <th>Payer</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.data.subscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <Link to={`/companies/${companyId}/subscriptions/${sub.id}`}>
                      {sub.productName ?? sub.productId}
                    </Link>
                  </td>
                  <td>{sub.purchasedQuantity}</td>
                  <td>{sub.assignedQuantity ?? "—"}</td>
                  <td>{labelStatus(sub.state)}</td>
                  <td>{sub.payer}</td>
                  <td>{formatMoney(sub.currentUnitPrice, sub.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function ImportPanel({ companyId }: { companyId: string }) {
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const [batch, setBatch] = useState<Awaited<ReturnType<typeof api.previewImport>>["batch"] | null>(
    null,
  );
  const preview = useMutation({
    mutationFn: (body: { resourceKind: string; filename: string; csvText: string }) =>
      api.previewImport(companyId, body),
    onSuccess: (res) => setBatch(res.batch),
  });
  const apply = useMutation({
    mutationFn: () => api.applyImport(companyId, batch!.id),
    onSuccess: (res) => setBatch(res.batch),
  });

  if (!canMutate) {
    return <EmptyState>Viewers cannot run imports.</EmptyState>;
  }

  return (
    <section className="stack">
      <p className="empty">
        CSV preview validates and deduplicates. Omitted rows do not delete existing access. Duplicate
        current assignments are no-ops.
      </p>
      <form
        className="panel stack"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          preview.mutate({
            resourceKind: String(data.get("resourceKind")),
            filename: String(data.get("filename") || "import.csv"),
            csvText: String(data.get("csvText")),
          });
        }}
      >
        <label>
          Resource kind
          <select name="resourceKind" defaultValue="people">
            <option value="people">People</option>
            <option value="accounts">Accounts</option>
            <option value="assignments">Assignments</option>
          </select>
        </label>
        <label>
          Filename
          <input name="filename" defaultValue="import.csv" />
        </label>
        <label className="required">
          CSV text
          <textarea name="csvText" rows={8} required placeholder="displayName,workEmail,itStatus" />
        </label>
        {preview.isError ? <ErrorState error={preview.error} /> : null}
        <button className="button" type="submit" disabled={preview.isPending}>
          {preview.isPending ? "Previewing…" : "Preview import"}
        </button>
      </form>
      {batch ? (
        <div className="panel stack">
          <h2>
            Preview · {batch.originalFilename} · {batch.status}
          </h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Validation</th>
                  <th>Errors</th>
                  <th>Apply</th>
                </tr>
              </thead>
              <tbody>
                {batch.rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.rowNumber}</td>
                    <td>{row.validationStatus}</td>
                    <td>{row.validationErrors.join("; ") || "—"}</td>
                    <td>{row.applyStatus ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {batch.status === "preview" ? (
            <button
              className="button"
              type="button"
              disabled={apply.isPending}
              onClick={() => apply.mutate()}
            >
              {apply.isPending ? "Applying…" : "Apply import"}
            </button>
          ) : null}
          {apply.isError ? <ErrorState error={apply.error} /> : null}
        </div>
      ) : null}
    </section>
  );
}
