import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { AppLayout } from "./components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Manuals from "./pages/documents/Manuals";
import Forms from "./pages/documents/Forms";
import Submissions from "./pages/documents/Submissions";
import Documents from "./pages/Documents";
import { PMS } from "./pages/PMS";
import { CrewLogs } from "./pages/CrewLogs";
import { Emergency } from "./pages/Emergency";
import { Incidents } from "./pages/Incidents";
import { Audits } from "./pages/Audits";
import { Cargo } from "./pages/Cargo";
import { Bunkering } from "./pages/Bunkering";
import { Invoices } from "./pages/Invoices";
import { AccessControl } from "./pages/AccessControl";
import { Masters } from "./pages/Masters";
import { Clients } from "./pages/Clients";
import { Vessels } from "./pages/Vessels";
import { VesselDetail } from "./pages/VesselDetail";
import { Crew } from "./pages/Crew";
import { Staff } from "./pages/Staff";
import { Recruitment } from "./pages/Recruitment";
import { OnboardingManagement } from "./pages/Recruitment/OnboardingManagement";
import { CrewApplication } from "./pages/Onboarding/CrewApplication";

import { DGCommunication } from "./pages/DGCommunication";
import { Finance } from "./pages/Finance";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Toaster } from "./components/ui/sonner";
import { useTranslation } from "react-i18next";

// Loading screen with logo and effects
const LoadingScreen = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center space-y-6">

        {/* Animated logo container */}
        <div className="relative">
          {/* Pulsing ring effect */}
          <div
            className="absolute inset-0 rounded-full bg-[#1ABC9C]/20 animate-ping"
            style={{ animationDuration: '2s' }}
          ></div>
          <div className="absolute inset-[-8px] rounded-full border-2 border-[#1ABC9C]/30 animate-pulse"></div>

          {/* Logo (no background) */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <img
              src="/nmg-logo.jpeg"
              alt="NMG Marine"
              className="w-16 h-16 object-contain"
            />
          </div>
        </div>

        {/* Company name */}
        <div className="text-center animate-pulse" style={{ animationDuration: '2s' }}>
          <h1 className="text-2xl font-bold text-[#0A2540] tracking-wide">
            NMG Marine Service
          </h1>
          <p className="text-[#123A63] text-sm mt-1">
            Pvt. Ltd
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center gap-2 mt-4">
          <div className="w-2 h-2 bg-[#1ABC9C] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-[#1ABC9C] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-[#1ABC9C] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>

        <p className="text-[#0A2540] text-sm">
          {t('loading_system')}
        </p>
      </div>
    </div>
  );
};


// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user } = useAuth();

  if (!allowedRoles || allowedRoles.includes(user?.role || 'crew')) {
    return <>{children}</>;
  }

  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  // Show loading spinner while authentication is being checked
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <div className="App">
        <Toaster />
        {!user ? (
          <Routes>
            <Route path="*" element={<Login />} />
          </Routes>
        ) : !user.active ? (
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="mt-2 text-lg font-medium text-gray-900">{t('account_inactive')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('account_deactivated_msg')}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
                >
                  {t('refresh')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <AppLayout>
            <Routes>
              {/* Default route */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Public routes available to all authenticated users */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pms" element={<PMS />} />
              <Route path="/crew-logs" element={<CrewLogs />} />
              <Route path="/documents" element={<Navigate to="/documents/manuals" replace />} />
              <Route path="/documents/manuals" element={<Manuals />} />
              <Route path="/documents/submissions" element={<Submissions />} />
              <Route path="/documents/templates" element={
                <ProtectedRoute allowedRoles={['master', 'staff']}>
                  <Forms />
                </ProtectedRoute>
              } />

              <Route path="/settings" element={<Settings />} />
              <Route path="/dg-communication" element={<DGCommunication />} />

              {/* Legacy pages - available to all roles */}
              <Route path="/manuals" element={<Manuals />} />
              <Route path="/emergency" element={<Emergency />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/audits" element={<Audits />} />
              <Route path="/cargo" element={<Cargo />} />
              <Route path="/bunkering" element={<Bunkering />} />

              {/* Master-only routes */}
              <Route path="/access-control" element={
                <ProtectedRoute allowedRoles={['master']}>
                  <AccessControl />
                </ProtectedRoute>
              } />

              {/* Staff/Master routes */}
              <Route path="/masters" element={
                <ProtectedRoute allowedRoles={['master', 'staff']}>
                  <Masters />
                </ProtectedRoute>
              } />
              <Route path="/clients" element={
                <ProtectedRoute allowedRoles={['master', 'staff']}>
                  <Clients />
                </ProtectedRoute>
              } />
              <Route path="/vessels" element={
                <ProtectedRoute allowedRoles={['master', 'staff']}>
                  <Vessels />
                </ProtectedRoute>
              } />
              <Route path="/vessels/:id" element={
                <ProtectedRoute allowedRoles={['master', 'staff']}>
                  <VesselDetail />
                </ProtectedRoute>
              } />
              <Route path="/crew" element={
                <ProtectedRoute allowedRoles={['master', 'staff']}>
                  <Crew />
                </ProtectedRoute>
              } />
              <Route path="/staff" element={
                <ProtectedRoute allowedRoles={['master']}>
                  <Staff />
                </ProtectedRoute>
              } />
              <Route path="/recruitment" element={
                <ProtectedRoute allowedRoles={['master', 'staff']}>
                  <Recruitment />
                </ProtectedRoute>
              } />
              <Route path="/recruitment/onboarding-management" element={
                <ProtectedRoute allowedRoles={['master', 'staff']}>
                  <OnboardingManagement />
                </ProtectedRoute>
              } />
              <Route path="/onboarding" element={
                <ProtectedRoute allowedRoles={['crew', 'master', 'staff']}>
                  <CrewApplication />
                </ProtectedRoute>
              } />
              <Route path="/invoices" element={
                <ProtectedRoute allowedRoles={['master', 'staff']}>
                  <Invoices />
                </ProtectedRoute>
              } />
              <Route path="/finance" element={
                <ProtectedRoute allowedRoles={['master', 'staff']}>
                  <Finance />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute allowedRoles={['master', 'staff']}>
                  <Reports />
                </ProtectedRoute>
              } />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AppLayout>
        )}
      </div>
    </Router>
  );
}
