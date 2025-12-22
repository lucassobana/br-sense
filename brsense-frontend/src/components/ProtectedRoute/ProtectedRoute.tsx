// brsense-frontend/src/components/ProtectedRoute/ProtectedRoute.tsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom'; // Use Outlet se usar Layout
import { parseJwt } from '../../services/auth';
import { Center, Spinner } from '@chakra-ui/react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('access_token');

        if (!token) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsAuthorized(false);
            return;
        }

        const payload = parseJwt(token);
        
        // Validação de Expiração
        // JWT 'exp' é em SEGUNDOS. Date.now() é em MILISSEGUNDOS.
        const currentTime = Date.now() / 1000;

        if (payload && payload.exp < currentTime) {
            // Token expirou
            console.warn("Sessão expirada");
            localStorage.clear(); // Limpa tudo para garantir
            setIsAuthorized(false);
        } else {
            setIsAuthorized(true);
        }
    }, []);

    if (isAuthorized === null) {
        // Estado de verificação (evita "flash" de conteúdo ou redirect prematuro)
        return <Center h="100vh"><Spinner /></Center>;
    }

    if (!isAuthorized) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};