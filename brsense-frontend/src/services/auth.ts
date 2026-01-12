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