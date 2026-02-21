import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import Register from "./pages/Register";
import OurTeam from "./pages/OurTeam";
import NotFound from "./pages/NotFound";
import Achievements from "./pages/Achievements";
import Login from "./pages/admin/Login";
import ForgotPassword from "./pages/admin/ForgotPassword";import ResetPassword from './pages/admin/ResetPassword';import Dashboard from "./pages/admin/Dashboard";
import MembersPage from "./pages/admin/Members";
import SubmissionsPage from "./pages/admin/Submissions";
import AuditLogsPage from "./pages/admin/AuditLogs";
import CareerHistoryPage from "./pages/admin/CareerHistory";
import BlogsPage from "./pages/admin/Blogs";
import MyImpactPage from "./pages/admin/MyImpact";
import ProfilePage from "./pages/admin/Profile";
import SettingsPage from "./pages/admin/Settings";
import FooterSettingsPage from "./pages/admin/FooterSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/register" element={<Register />} />
            <Route path="/our-team" element={<OurTeam />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin routes (protected) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="submissions" element={<SubmissionsPage />} />
              <Route path="career-history" element={<CareerHistoryPage />} />
              <Route path="blogs" element={<BlogsPage />} />
              <Route path="my-impact" element={<MyImpactPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={["President", "Technical Head"]}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit-logs"
                element={
                  <ProtectedRoute allowedRoles={["President", "Technical Head"]}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="footer-settings"
                element={
                  <ProtectedRoute allowedRoles={["President", "Technical Head"]}>
                    <FooterSettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
