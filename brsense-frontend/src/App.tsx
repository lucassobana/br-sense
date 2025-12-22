// brsense-frontend/src/App.tsx
import { Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Layout } from './components/Layout/Layout';
import { MyFarms } from './pages/MyFarms';
import { MyProbes } from './pages/MyProbList';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';

export function App() {
  return (
    <Routes>
      {/* Rotas Protegidas */}
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/farms" element={<ProtectedRoute><Layout><MyFarms /></Layout></ProtectedRoute>} />
      <Route path="/probes" element={<ProtectedRoute><Layout><MyProbes /></Layout></ProtectedRoute>} />

      {/* Rota Pública - Login não pode ter ProtectedRoute */}
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}