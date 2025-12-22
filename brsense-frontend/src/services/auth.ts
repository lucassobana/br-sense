// brsense-frontend/src/services/auth.ts
import axios from 'axios';

const KEYCLOAK_URL = "http://localhost:8080/realms/br-sense/protocol/openid-connect/token";
const CLIENT_ID = "brsense-frontend";

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