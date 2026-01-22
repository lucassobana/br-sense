// brsense-frontend/src/services/auth.ts
import axios from 'axios';

// 1. Pega a URL base do .env (ou usa localhost se não encontrar)
const BASE_URL = import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8080";
const REALM = import.meta.env.VITE_KEYCLOAK_REALM || "br-sense";

// 2. Monta a URL completa (ATENÇÃO: Confirme se o realm é 'br-sense' ou 'soil-realm')
// Se você criou como 'soil-realm' no passo anterior, mude 'br-sense' para 'soil-realm' aqui embaixo:
const KEYCLOAK_URL = `${BASE_URL}/realms/${REALM}/protocol/openid-connect/token`;

const CLIENT_ID = "soil-frontend"; // staging e production
// const CLIENT_ID = "brsense-frontend"; // local

interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export const loginKeycloak = async (username: string, password: string): Promise<TokenResponse> => {
    // O Keycloak exige dados url-encoded (x-www-form-urlencoded)
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('username', username);
    params.append('password', password);
    params.append('grant_type', 'password'); // O segredo do Direct Access Grants

    try {
        const response = await axios.post<TokenResponse>(KEYCLOAK_URL, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data;
    } catch (error) {
        console.error("Erro no login Keycloak:", error);
        throw new Error("Credenciais inválidas ou erro no servidor de autenticação.");
    }
};

// Função auxiliar para decodificar o token e pegar roles/nome (sem lib pesada)
export const parseJwt = (token: string) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
};

// Adicione esta função ao final do arquivo ou dentro da classe de Auth
export const isUserAdmin = (): boolean => {
    const token = localStorage.getItem('access_token'); // Ou o nome da chave que você usa
    if (!token) return false;

    try {
        // Decodifica o payload do JWT (parte do meio)
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);

        // VERIFICAÇÃO DE ROLE (Ajuste conforme seu backend/Keycloak)
        // Exemplo Keycloak: realm_access.roles OU resource_access.roles
        const roles = payload.realm_access?.roles || [];

        // Verifica se a role 'admin' ou 'superuser' existe
        return roles.includes('admin') || roles.includes('administrator');

    } catch {
        return false;
    }
};