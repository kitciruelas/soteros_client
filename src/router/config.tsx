
import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import LoginPage from "../pages/auth/login/page";
import SignupPage from "../pages/auth/signup/page";
import ForgotPasswordPage from "../pages/auth/forgot-password/page";
import VerifyOTPPage from "../pages/auth/verify-otp/page";
import ResetPasswordPage from "../pages/auth/reset-password/page";
import IncidentReportPage from "../pages/incident-report/page";
import IncidentEditPage from "../pages/incident-edit/page";
import ProfilePage from "../pages/profile/page";
import EvacuationCenterPage from "../pages/evacuation-center/page";
import SafetyProtocolsPage from "../pages/safety-protocols/page";
import HistoryReportPage from "../pages/history-report/page";
import FeedbackPage from "../pages/feedback/page";
import WelfareCheckPage from "../pages/welfare-check/page";
import NotificationsPage from "../pages/notifications/page";
import StaffFeedbackPage from "../pages/staff/stafffeedback/page";
import SiteMapPage from "../pages/sitemap/page";
import AboutPage from "../pages/about/page";

// Admin Components
import AdminLayout from "../components/AdminLayout";
import AdminLogin from "../pages/admin/login/page";
import AdminSignup from "../pages/admin/signup/page";
import AdminDashboard from "../pages/admin/dashboard/page";
import AlertsManagement from "../pages/admin/alerts/page";
import UserManagement from "../pages/admin/users/page";
import StaffManagement from "../pages/admin/staff/page";
import ViewIncidents from "../pages/admin/incidents/view/page";
import ViewIncidentDetails from "../pages/admin/incidents/view/[id]/page";
import Reports from "../pages/admin/reports/Reports";
import EvacuationCentersManagement from "../pages/admin/evacuation/centers/page";
import EvacuationRoutesManagement from "../pages/admin/evacuation/routes/page";
import EvacuationResourcesManagement from "../pages/admin/evacuation/resources/page";
import SafetyProtocolsManagement from "../pages/admin/safety-protocols/page";
import ActivityLogs from "../pages/admin/activity-logs/page";
import AdminProfilePage from "../pages/admin/profile/page";
import TeamsManagement from "../pages/admin/teams/page";
import AdminFeedbackPage from "../pages/admin/feedback/page";
import AdminWelfarePage from "../pages/admin/welfare/page";
import WelfareReportsPage from "../pages/admin/welfare/reports/page";
import StaffDashboard from "../pages/staff/dashboard/page";
import StaffIncidentsPage from "../pages/staff/incidents/page";
import StaffIncidentsMapPage from "../pages/staff/incidents/map/page";
import StaffIncidentDetails from "../pages/staff/incidents/[id]/page";
import StaffProfilePage from "../pages/staff/profile/page";
import StaffLayout from "../components/StaffLayout";

// Admin Incidents Map
import AdminIncidentsMapPage from "../pages/admin/incidents/map/page";


const routes: RouteObject[] = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/auth/login",
    element: <LoginPage />,
  },
  {
    path: "/auth/signup",
    element: <SignupPage />,
  },
  {
    path: "/auth/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/auth/verify-otp",
    element: <VerifyOTPPage />,
  },
  {
    path: "/auth/reset-password",
    element: <ResetPasswordPage />,
  },
  {
    path: "/incident-report",
    element: <IncidentReportPage />,
  },
  {
    path: "/incident-edit",
    element: <IncidentEditPage />,
  },
  {
    path: "/profile",
    element: <ProfilePage />,
  },
  {
    path: "/evacuation-center",
    element: <EvacuationCenterPage />,
  },
  {
    path: "/safety-protocols",
    element: <SafetyProtocolsPage />,
  },
  {
    path: "/history-report",
    element: <HistoryReportPage />,
  },
  {
    path: "/feedback",
    element: <FeedbackPage />,
  },
  {
    path: "/welfare-check",
    element: <WelfareCheckPage />,
  },
  {
    path: "/notifications",
    element: <NotificationsPage />,
  },
  {
    path: "/sitemap",
    element: <SiteMapPage />,
  },
  {
    path: "/about",
    element: <AboutPage />,
  },
  // Admin Auth Routes (separate from admin layout)
  {
    path: "/admin/login",
    element: <AdminLogin />,
  },
  {
    path: "/admin/signup",
    element: <AdminSignup />,
  },
  // Admin Routes
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      {
        path: "dashboard",
        element: <AdminDashboard />,
      },
      {
        path: "alerts",
        element: <AlertsManagement />,
      },
      {
        path: "users",
        element: <UserManagement />,
      },
      {
        path: "staff",
        element: <StaffManagement />,
      },
      {
        path: "teams",
        element: <TeamsManagement />,
      },
      {
        path: "incidents/view",
        element: <ViewIncidents />,
      },
      {
        path: "incidents/view/:id",
        element: <ViewIncidentDetails />,
      },
      {
        path: "incidents/map",
        element: <AdminIncidentsMapPage />,
      },
      {
        path: "evacuation/centers",
        element: <EvacuationCentersManagement />,
      },
      {
        path: "evacuation/routes",
        element: <EvacuationRoutesManagement />,
      },
      {
        path: "evacuation/resources",
        element: <EvacuationResourcesManagement />,
      },
      {
        path: "safety-protocols",
        element: <SafetyProtocolsManagement />,
      },
      {
        path: "activity-logs",
        element: <ActivityLogs />,
      },
      {
        path: "welfare",
        element: <AdminWelfarePage />,
      },
      {
        path: "welfare/reports",
        element: <WelfareReportsPage />,
      },
      {
        path: "feedback",
        element: <AdminFeedbackPage />,
      },
      {
        path: "reports",
        element: <Reports />,
      },
      {
        path: "profile",
        element: <AdminProfilePage />,
      },
      // Redirect /admin to /admin/dashboard
      {
        path: "",
        element: <AdminDashboard />,
      },
    ],
  },
  // Staff Routes
  {
    path: "/staff",
    element: <StaffLayout />,
      children: [
      {
        path: "",
        element: <StaffDashboard />,
      },
      {
        path: "dashboard",
        element: <StaffDashboard />,
      },
      {
        path: "incidents",
        element: <StaffIncidentsPage />,
      },
      {
        path: "incidents/map",
        element: <StaffIncidentsMapPage />,
      },
      {
        path: "incidents/:id",
        element: <StaffIncidentDetails />,
      },
      {
        path: "feedback",
        element: <StaffFeedbackPage />,
      },
      {
        path: "profile",
        element: <StaffProfilePage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;
