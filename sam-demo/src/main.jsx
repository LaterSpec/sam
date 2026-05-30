import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import SamDemoDB from './demo-db.js';
import { portfolioValue, computeInefficiencies } from './invest-cash.js';
import * as SamUI from './interactive/sam-ui.jsx';
import { registerExtraSheets } from './interactive/sheets.jsx';
import './interactive/screens/register.js';
import SamOnboarding from './onboarding/SamOnboarding.jsx';
import SamApp from './interactive/SamApp.jsx';

Object.assign(window, SamUI, { portfolioValue, computeInefficiencies });
window.SamDB = SamDemoDB;
registerExtraSheets();

function AppRoutes() {
  const navigate = useNavigate();
  React.useEffect(() => {
    SamDemoDB.setNavigate(navigate);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<SamOnboarding />} />
      <Route path="/app" element={<SamApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </React.StrictMode>,
);
