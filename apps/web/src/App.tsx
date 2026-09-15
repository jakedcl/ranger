import { useParams } from "react-router";
import { CompanyPage } from "./pages/CompanyPage.tsx";
import { CompaniesPage } from "./pages/CompaniesPage.tsx";
import { DemoPage } from "./pages/DemoPage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { OverviewPage } from "./pages/OverviewPage.tsx";
import { PeoplePage } from "./pages/PeoplePage.tsx";
import { PersonPage } from "./pages/PersonPage.tsx";
import { ProductCatalogPage, ProductDetailPage, SubscriptionDetailPage } from "./pages/ProductPages.tsx";
import {
  AccountDetailPage,
  DeviceDetailPage,
  GroupDetailPage,
  MailboxDetailPage,
} from "./pages/ResourceDetailPages.tsx";
import { ResourcesPage } from "./pages/ResourcesPage.tsx";
import { WorkDetailPage, WorkPage } from "./pages/WorkPage.tsx";
import { IntegrationsPage } from "./pages/IntegrationsPage.tsx";
import { AutomationsPage, WorkflowRunPage } from "./pages/AutomationsPage.tsx";
import { IncidentDetailPage, IncidentsPage } from "./pages/IncidentsPage.tsx";
import { PlaceholderPage, SearchPage } from "./pages/PlaceholderPage.tsx";
import { AppShell } from "./shell/AppShell.tsx";
import { ErrorBoundary } from "./shell/ErrorBoundary.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { DemoTourProvider } from "./tour/DemoTour.tsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

function CompanySection() {
  const { section } = useParams();
  if (section === "people") return <PeoplePage />;
  if (section === "resources") return <ResourcesPage />;
  if (section === "work") return <WorkPage />;
  if (section === "incidents") return <IncidentsPage />;
  if (section === "import") return <ResourcesPage initialTab="import" />;
  if (section === "accounts") return <ResourcesPage initialTab="accounts" />;
  if (section === "groups") return <ResourcesPage initialTab="groups" />;
  if (section === "mailboxes") return <ResourcesPage initialTab="mailboxes" />;
  if (section === "devices") return <ResourcesPage initialTab="devices" />;
  if (section === "subscriptions") return <ResourcesPage initialTab="subscriptions" />;
  if (section === "integrations") return <IntegrationsPage />;
  if (section === "automations") return <AutomationsPage />;
  return <PlaceholderPage section={section ?? "people"} />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <DemoTourProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/companies/:companyId" element={<CompanyPage />} />
              <Route path="/companies/:companyId/people/:personId" element={<PersonPage />} />
              <Route path="/companies/:companyId/accounts/:accountId" element={<AccountDetailPage />} />
              <Route path="/companies/:companyId/groups/:groupId" element={<GroupDetailPage />} />
              <Route path="/companies/:companyId/mailboxes/:mailboxId" element={<MailboxDetailPage />} />
              <Route path="/companies/:companyId/devices/:deviceId" element={<DeviceDetailPage />} />
              <Route
                path="/companies/:companyId/subscriptions/:subscriptionId"
                element={<SubscriptionDetailPage />}
              />
              <Route path="/companies/:companyId/work/:workItemId" element={<WorkDetailPage />} />
              <Route path="/companies/:companyId/incidents/:incidentId" element={<IncidentDetailPage />} />
              <Route path="/companies/:companyId/workflows/:runId" element={<WorkflowRunPage />} />
              <Route path="/companies/:companyId/:section" element={<CompanySection />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/products" element={<ProductCatalogPage />} />
              <Route path="/products/:productId" element={<ProductDetailPage />} />
              <Route path="/work" element={<WorkPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/automations" element={<AutomationsPage />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/settings" element={<PlaceholderPage section="settings" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          </DemoTourProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
