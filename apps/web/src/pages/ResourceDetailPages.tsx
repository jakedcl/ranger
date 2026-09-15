import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useOutletContext, useParams } from "react-router";
import type { SessionUser } from "@ranger/contracts";
import { api, canMutateInventory } from "../lib/api.ts";
import { formatDate, labelStatus } from "../lib/format.ts";
import { EmptyState, ErrorState, LoadingState, SourceFreshness } from "../components/ui.tsx";

export function AccountDetailPage() {
  const { companyId = "", accountId = "" } = useParams();
  const detail = useQuery({
    queryKey: ["account", companyId, accountId],
    queryFn: () => api.getAccount(companyId, accountId),
    enabled: Boolean(companyId && accountId),
  });
  if (detail.isLoading) return <LoadingState />;
  if (detail.isError) return <ErrorState error={detail.error} />;
  const account = detail.data?.account;
  if (!account) return <EmptyState>Account not found.</EmptyState>;
  return (
    <div className="stack">
      <p>
        <Link to={`/companies/${companyId}/resources?tab=accounts`}>← Accounts</Link>
      </p>
      <h1>{account.loginName}</h1>
      <p>
        {labelStatus(account.accountKind)} · {labelStatus(account.enabledState)}
      </p>
      <p>
        <SourceFreshness
          source={account.providerSource}
          lastObservedAt={account.lastObservedAt}
          freshnessNote={account.freshnessNote}
        />
      </p>
      <p>
        Person:{" "}
        {account.personId ? (
          <Link to={`/companies/${companyId}/people/${account.personId}`}>
            {account.personName ?? "Linked person"}
          </Link>
        ) : (
          "Unlinked"
        )}
      </p>
      <p className="empty">External ID: {account.externalId ?? "—"}</p>
    </div>
  );
}

export function GroupDetailPage() {
  const { companyId = "", groupId = "" } = useParams();
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ["group", companyId, groupId],
    queryFn: () => api.getGroup(companyId, groupId),
    enabled: Boolean(companyId && groupId),
  });
  const accounts = useQuery({
    queryKey: ["accounts", companyId],
    queryFn: () => api.listAccounts(companyId),
    enabled: canMutate,
  });
  const add = useMutation({
    mutationFn: (accountId: string) => api.addGroupMember(companyId, groupId, { accountId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["group", companyId, groupId] });
    },
  });

  if (detail.isLoading) return <LoadingState />;
  if (detail.isError) return <ErrorState error={detail.error} />;
  const group = detail.data?.group;
  if (!group) return <EmptyState>Group not found.</EmptyState>;
  const memberships = detail.data?.memberships ?? [];
  const canEditMembers = canMutate && group.membershipCapability === "direct";

  return (
    <div className="stack">
      <p>
        <Link to={`/companies/${companyId}/resources?tab=groups`}>← Groups</Link>
      </p>
      <h1>{group.displayName}</h1>
      <p>
        {labelStatus(group.groupType)} · {group.emailAddress ?? "No email"} · Membership:{" "}
        {labelStatus(group.membershipCapability)}
      </p>
      <p>
        <SourceFreshness source={group.source} />
      </p>
      {!canEditMembers && group.membershipCapability !== "direct" ? (
        <div className="banner warn">
          Dynamic or unsupported membership cannot be edited as direct membership. Create a manual work
          item if a change is needed outside the provider.
        </div>
      ) : null}
      <section className="panel">
        <h2>Members</h2>
        {memberships.length === 0 ? <EmptyState>No memberships recorded.</EmptyState> : null}
        {memberships.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Kind</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((row) => (
                  <tr key={row.id}>
                    <td>{row.accountLogin ?? row.accountId}</td>
                    <td>{labelStatus(row.membershipKind)}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {canEditMembers ? (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              add.mutate(String(data.get("accountId")));
            }}
          >
            <label>
              Add account
              <select name="accountId" required defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                {(accounts.data?.accounts ?? []).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.loginName}
                  </option>
                ))}
              </select>
            </label>
            {add.isError ? <ErrorState error={add.error} /> : null}
            <button className="button" type="submit" disabled={add.isPending}>
              Add member
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

export function MailboxDetailPage() {
  const { companyId = "", mailboxId = "" } = useParams();
  const detail = useQuery({
    queryKey: ["mailbox", companyId, mailboxId],
    queryFn: () => api.getMailbox(companyId, mailboxId),
    enabled: Boolean(companyId && mailboxId),
  });
  if (detail.isLoading) return <LoadingState />;
  if (detail.isError) return <ErrorState error={detail.error} />;
  const mailbox = detail.data?.mailbox;
  if (!mailbox) return <EmptyState>Mailbox not found.</EmptyState>;
  const access = detail.data?.access ?? [];
  return (
    <div className="stack">
      <p>
        <Link to={`/companies/${companyId}/resources?tab=mailboxes`}>← Mailboxes</Link>
      </p>
      <h1>{mailbox.address}</h1>
      <p>
        State: {mailbox.state} · Source: {mailbox.source} · Owner: {mailbox.ownerName ?? "—"}
      </p>
      <section className="panel">
        <h2>Access</h2>
        {access.length === 0 ? <EmptyState>No Full Access / Send As / Send on Behalf records.</EmptyState> : null}
        {access.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Permission</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {access.map((row) => (
                  <tr key={row.id}>
                    <td>{row.accountLogin ?? row.accountId}</td>
                    <td>{labelStatus(row.permissionKind)}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function DeviceDetailPage() {
  const { companyId = "", deviceId = "" } = useParams();
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ["device", companyId, deviceId],
    queryFn: () => api.getDevice(companyId, deviceId),
    enabled: Boolean(companyId && deviceId),
  });
  const people = useQuery({
    queryKey: ["people", companyId],
    queryFn: () => api.listPeople(companyId),
    enabled: canMutate,
  });
  const assign = useMutation({
    mutationFn: (personId: string) => api.assignDevice(companyId, deviceId, { personId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["device", companyId, deviceId] });
      await queryClient.invalidateQueries({ queryKey: ["devices", companyId] });
    },
  });

  if (detail.isLoading) return <LoadingState />;
  if (detail.isError) return <ErrorState error={detail.error} />;
  const device = detail.data?.device;
  if (!device) return <EmptyState>Device not found.</EmptyState>;
  const assignments = detail.data?.assignments ?? [];

  return (
    <div className="stack">
      <p>
        <Link to={`/companies/${companyId}/resources?tab=devices`}>← Devices</Link>
      </p>
      <h1>{device.hostname ?? device.assetTag ?? device.serial ?? "Device"}</h1>
      <p>
        {device.deviceType} · {labelStatus(device.state)} · Model: {device.model ?? "—"}
      </p>
      <section className="panel stack">
        <h2>Assignment history</h2>
        {assignments.length === 0 ? <EmptyState>No assignments yet.</EmptyState> : null}
        {assignments.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Issued</th>
                  <th>Returned</th>
                  <th>Status</th>
                  <th>Custody</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/companies/${companyId}/people/${row.personId}`}>
                        {row.personName ?? row.personId}
                      </Link>
                    </td>
                    <td>{formatDate(row.issuedAt)}</td>
                    <td>{formatDate(row.returnedAt)}</td>
                    <td>{row.status}</td>
                    <td>{row.custodyDisposition ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {canMutate ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              assign.mutate(String(data.get("personId")));
            }}
          >
            <label>
              Assign to person
              <select name="personId" required defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                {(people.data?.people ?? []).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.displayName}
                  </option>
                ))}
              </select>
            </label>
            {assign.isError ? <ErrorState error={assign.error} /> : null}
            <div className="actions">
              <button className="button" type="submit" disabled={assign.isPending}>
                Assign device
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}
