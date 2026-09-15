import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useOutletContext, useParams } from "react-router";
import type { SessionUser } from "@ranger/contracts";
import { api, canEditProductCatalog, canMutateInventory } from "../lib/api.ts";
import { formatDate, formatMoney, labelStatus } from "../lib/format.ts";
import type { AssignmentModel } from "../lib/inventory-types.ts";
import { EmptyState, ErrorState, LoadingState } from "../components/ui.tsx";

export function ProductCatalogPage() {
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canEdit = canEditProductCatalog(user.role);
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const products = useQuery({ queryKey: ["products"], queryFn: () => api.listProducts({ includeRetired: true }) });

  const create = useMutation({
    mutationFn: (body: {
      name: string;
      vendor: string;
      category: string;
      assignmentModel: AssignmentModel;
      documentationUrl?: string;
    }) => api.createProduct(body),
    onSuccess: async () => {
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const retire = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => api.retireProduct(id, version),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return (
    <div className="stack">
      <h1>Product catalog</h1>
      <p>Organization-wide catalog. Technicians select products when creating company subscriptions.</p>
      {canEdit ? (
        <div className="actions">
          <button className="button" type="button" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Cancel" : "Add product"}
          </button>
        </div>
      ) : (
        <p className="empty">Only admins can edit the catalog. Technicians can still create subscriptions from active products.</p>
      )}
      {showCreate && canEdit ? (
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            create.mutate({
              name: String(data.get("name")),
              vendor: String(data.get("vendor")),
              category: String(data.get("category")),
              assignmentModel: String(data.get("assignmentModel")) as AssignmentModel,
              documentationUrl: String(data.get("documentationUrl") || "") || undefined,
            });
          }}
        >
          <label className="required">
            Name
            <input name="name" required />
          </label>
          <label className="required">
            Vendor
            <input name="vendor" required />
          </label>
          <label className="required">
            Category
            <input name="category" required />
          </label>
          <label>
            Assignment model
            <select name="assignmentModel" defaultValue="named_user">
              <option value="named_user">Named user</option>
              <option value="shared_device">Shared / device</option>
              <option value="organization_wide">Organization-wide</option>
            </select>
          </label>
          <label>
            Documentation URL
            <input name="documentationUrl" type="url" />
          </label>
          {create.isError ? <ErrorState error={create.error} /> : null}
          <button className="button" type="submit" disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Create"}
          </button>
        </form>
      ) : null}
      {products.isLoading ? <LoadingState label="Loading products…" /> : null}
      {products.isError ? <ErrorState error={products.error} /> : null}
      {products.data?.products.length === 0 ? (
        <EmptyState>No products in the catalog yet.</EmptyState>
      ) : null}
      {products.data && products.data.products.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Vendor</th>
                <th>Category</th>
                <th>Model</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.data.products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <Link to={`/products/${product.id}`}>{product.name}</Link>
                  </td>
                  <td>{product.vendor}</td>
                  <td>{product.category}</td>
                  <td>{labelStatus(product.assignmentModel)}</td>
                  <td>{product.retiredAt ? "Retired" : "Active"}</td>
                  <td>
                    {canEdit && !product.retiredAt ? (
                      <button
                        className="button secondary"
                        type="button"
                        disabled={retire.isPending}
                        onClick={() => {
                          if (window.confirm("Retire this product? Existing history is preserved.")) {
                            retire.mutate({ id: product.id, version: product.version });
                          }
                        }}
                      >
                        Retire
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {retire.isError ? <ErrorState error={retire.error} /> : null}
    </div>
  );
}

export function ProductDetailPage() {
  const { productId = "" } = useParams();
  const product = useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.getProduct(productId),
    enabled: Boolean(productId),
  });
  if (product.isLoading) return <LoadingState />;
  if (product.isError) return <ErrorState error={product.error} />;
  const record = product.data?.product;
  if (!record) return <EmptyState>Product not found.</EmptyState>;
  return (
    <div className="stack">
      <p>
        <Link to="/products">← Catalog</Link>
      </p>
      <h1>{record.name}</h1>
      <p>
        {record.vendor} · {record.category} · {labelStatus(record.assignmentModel)} ·{" "}
        {record.retiredAt ? "Retired" : "Active"}
      </p>
      {record.documentationUrl ? (
        <p>
          <a href={record.documentationUrl} target="_blank" rel="noreferrer">
            Documentation
          </a>
        </p>
      ) : null}
      <p className="empty">Company subscriptions that use this product appear under each company Resources tab.</p>
    </div>
  );
}

export function SubscriptionDetailPage() {
  const { companyId = "", subscriptionId = "" } = useParams();
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ["subscription", companyId, subscriptionId],
    queryFn: () => api.getSubscription(companyId, subscriptionId),
    enabled: Boolean(companyId && subscriptionId),
  });
  const people = useQuery({
    queryKey: ["people", companyId],
    queryFn: () => api.listPeople(companyId),
    enabled: Boolean(companyId) && canMutate,
  });
  const assign = useMutation({
    mutationFn: (personId: string) =>
      api.assignSubscription(companyId, subscriptionId, { personId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["subscription", companyId, subscriptionId] });
    },
  });

  if (detail.isLoading) return <LoadingState label="Loading subscription…" />;
  if (detail.isError) return <ErrorState error={detail.error} />;
  const sub = detail.data?.subscription;
  if (!sub) return <EmptyState>Subscription not found.</EmptyState>;
  const assignments = sub.assignments ?? [];

  return (
    <div className="stack">
      <p>
        <Link to={`/companies/${companyId}/resources?tab=subscriptions`}>← Subscriptions</Link>
      </p>
      <h1>{sub.productName ?? "Subscription"}</h1>
      <p>
        <span className="badge demo">Demo</span> · {labelStatus(sub.state)} · {sub.purchasedQuantity} purchased
        · {sub.assignedQuantity ?? assignments.filter((a) => a.status === "active").length} assigned ·{" "}
        {formatMoney(sub.currentUnitPrice, sub.currency)}
      </p>
      <section className="panel">
        <h2>Purchase</h2>
        <p>
          Payer: {sub.payer} · Cadence: {sub.billingCadence} · Supplier: {sub.supplier ?? "—"}
        </p>
        <p>
          Commitment: {formatDate(sub.commitmentStart)} → {formatDate(sub.commitmentEnd)} · Renewal:{" "}
          {formatDate(sub.renewalDate)}
        </p>
      </section>
      <section className="panel stack">
        <h2>Assigned people</h2>
        {assignments.length === 0 ? <EmptyState>No assignments yet.</EmptyState> : null}
        {assignments.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Status</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      {assignment.personId ? (
                        <Link to={`/companies/${companyId}/people/${assignment.personId}`}>
                          {assignment.personName ?? assignment.personId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{labelStatus(assignment.status)}</td>
                    <td>{formatDate(assignment.startEffectiveDate)}</td>
                    <td>{formatDate(assignment.endEffectiveDate)}</td>
                    <td>{assignment.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {canMutate && sub.state === "active" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              assign.mutate(String(data.get("personId")));
            }}
          >
            <label className="required">
              Assign person
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
                {assign.isPending ? "Assigning…" : "Assign seat"}
              </button>
            </div>
          </form>
        ) : null}
      </section>
      {sub.priceVersions && sub.priceVersions.length > 0 ? (
        <section className="panel">
          <h2>Price history</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Price</th>
                  <th>Kind</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {sub.priceVersions.map((price) => (
                  <tr key={price.id}>
                    <td>{formatDate(price.effectiveFrom)}</td>
                    <td>{formatDate(price.effectiveTo)}</td>
                    <td>{formatMoney(price.unitPrice, sub.currency)}</td>
                    <td>{price.priceKind}</td>
                    <td>{price.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
