import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { parseJwt, refreshTokenKeycloak } from '../../services/auth';
import { Center, Spinner } from '@chakra-ui/react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('access_token');
            const refreshToken = localStorage.getItem('refresh_token');

            if (!token) {
                setIsAuthorized(false);
                return;
            }

            const payload = parseJwt(token);
            const currentTime = Date.now() / 1000;
 
            if (payload && payload.exp > currentTime) {
                setIsAuthorized(true);
                return;
            }

            if (refreshToken) {
                try {
                    const tokens = await refreshTokenKeycloak(refreshToken);
                    localStorage.setItem('access_token', tokens.access_token);
                    localStorage.setItem('refresh_token', tokens.refresh_token);
                    setIsAuthorized(true);
                } catch  {
                    console.warn("Falha ao renovar token. Sessão encerrada.");
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    setIsAuthorized(false);
                }
            } else {
                localStorage.removeItem('access_token');
                setIsAuthorized(false);
            }
        };

        checkAuth();
    }, []);

    if (isAuthorized === null) {
        return <Center h="100vh"><Spinner /></Center>;
    }

    if (!isAuthorized) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};