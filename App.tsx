import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ClientsPage from './pages/DashboardPage';
import ClientDetailPage from './pages/ClientDetailPage';
import PropertyPage from './pages/ClientPortalPage';
import AppShell from './components/ClientMap';
import ScoutPortalPage from './pages/ScoutPortalPage';
import RsaPresentationPage from './pages/RsaPresentationPage';
import AccountSettingsPage from './pages/AccountSettingsPage';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/clients" replace />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:clientId" element={<ClientDetailPage />} />
          <Route path="properties/:propertyId" element={<PropertyPage />} />
          <Route path="properties/:propertyId/:tab" element={<PropertyPage />} />
          <Route path="scout-portal/:reportId" element={<ScoutPortalPage />} />
          <Route path="rsa-presentation/:propertyId/:planId" element={<RsaPresentationPage />} />
          <Route path="settings" element={<AccountSettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;