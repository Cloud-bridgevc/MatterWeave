import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import SiteLayout from './site/SiteLayout';
import Home from './site/Home';
import Platform from './site/Platform';
import Solutions from './site/Solutions';
import Pricing from './site/Pricing';
import Security from './site/Security';
import Demo from './site/Demo';
import About from './site/About';
import AppLayout from './app/AppLayout';
import Dashboard from './app/Dashboard';
import Matters from './app/Matters';
import MatterDetail from './app/MatterDetail';
import DocumentView from './app/DocumentView';
import SearchAssistant from './app/SearchAssistant';
import CalendarPage from './app/CalendarPage';
import TasksPage from './app/TasksPage';
import AuditPage from './app/AuditPage';
import DocumentLibrary from './app/DocumentLibrary';

function ScrollTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="platform" element={<Platform />} />
          <Route path="solutions/:segment" element={<Solutions />} />
          <Route path="solutions" element={<Navigate to="/solutions/law-firms" replace />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="security" element={<Security />} />
          <Route path="demo" element={<Demo />} />
          <Route path="about" element={<About />} />
        </Route>
        <Route path="app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="matters" element={<Matters />} />
          <Route path="matters/:matterId/:tab?" element={<MatterDetail />} />
          <Route path="documents" element={<DocumentLibrary />} />
          <Route path="documents/:docId" element={<DocumentView />} />
          <Route path="search" element={<SearchAssistant />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
