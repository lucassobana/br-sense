import { Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Layout } from "./components/Layout/Layout";
import { MyFarms } from "./pages/MyFarms";
import { MyProbes } from "./pages/MyProbList";
import { ProtectedRoute } from "./components/ProtectedRoute/ProtectedRoute";
import { Settings } from "./pages/Settings";
import { Lading } from "./pages/Lading";

function RootRedirect() {
  const isPWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone;

  if (isPWA) {
    return <Navigate to="/login" replace />;
  } else {
    return <Navigate to="/page" replace />;
  }
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farms"
        element={
          <ProtectedRoute>
            <Layout>
              <MyFarms />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/probes"
        element={
          <ProtectedRoute>
            <Layout>
              <MyProbes />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/login" element={<Login />} />
      <Route path="/page" element={<Lading />} />
    </Routes>
  );
}
