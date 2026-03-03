import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { UserRole } from '@rfm/shared';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/stores/uiStore';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/components/auth/LoginPage';
import { RegisterPage } from '@/components/auth/RegisterPage';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { FloorPlanPage } from '@/pages/FloorPlanPage';
import { ServiceViewPage } from '@/pages/ServiceViewPage';
import { ShiftManagementPage } from '@/pages/ShiftManagementPage';
import { StaffManagementPage } from '@/pages/StaffManagementPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';

export function App() {
  const { loadUser } = useAuth();
  const darkMode = useUiStore((s) => s.darkMode);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes inside AppShell */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />

          <Route
            path="floor-plan"
            element={
              <ProtectedRoute roles={[UserRole.ADMIN, UserRole.MANAGER]}>
                <FloorPlanPage />
              </ProtectedRoute>
            }
          />

          <Route path="service" element={<ServiceViewPage />} />

          <Route
            path="shifts"
            element={
              <ProtectedRoute roles={[UserRole.ADMIN, UserRole.MANAGER]}>
                <ShiftManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="staff"
            element={
              <ProtectedRoute roles={[UserRole.ADMIN]}>
                <StaffManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="analytics"
            element={
              <ProtectedRoute roles={[UserRole.ADMIN, UserRole.MANAGER]}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: darkMode ? '#1f2937' : '#ffffff',
            color: darkMode ? '#f3f4f6' : '#111827',
            border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: darkMode ? '#1f2937' : '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: darkMode ? '#1f2937' : '#ffffff',
            },
          },
        }}
      />
    </>
  );
}
