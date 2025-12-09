import { ChakraProvider } from '@chakra-ui/react';
import { Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Layout } from './components/Layout/Layout';

export function App() {
  return (
    <ChakraProvider>
      <Routes>
        {/* Rotas com Header */}
        <Route
          path="/"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />
        {/* Rota sem Header */}
        <Route path="/login" element={<Login />} />
      </Routes>
    </ChakraProvider>
  );
}
