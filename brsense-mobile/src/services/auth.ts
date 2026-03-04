import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode"; // Usando a biblioteca padrão para RN

// DICA: No emulador Android, 'localhost' não funciona. Use o IP da sua máquina na rede (ex: 192.168.1.X)
const BASE_URL =
  process.env.EXPO_PUBLIC_KEYCLOAK_URL || "http://192.168.1.X:8080";
const REALM = "br-sense";
const KEYCLOAK_URL = `${BASE_URL}/realms/${REALM}/protocol/openid-connect/token`;
const CLIENT_ID = "soil-frontend";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export const loginKeycloak = async (
  username: string,
  password: string,
): Promise<TokenResponse> => {
  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("username", username);
  params.append("password", password);
  params.append("grant_type", "password");

  try {
    const response = await axios.post<TokenResponse>(
      KEYCLOAK_URL,
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Erro no login Keycloak:", error);
    throw new Error("Credenciais inválidas ou erro no servidor.");
  }
};

export const refreshTokenKeycloak = async (
  refreshToken: string,
): Promise<TokenResponse> => {
  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);

  try {
    const response = await axios.post<TokenResponse>(
      KEYCLOAK_URL,
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );
    return response.data;
  } catch {
    throw new Error("Sessão expirada. Faça login novamente.");
  }
};

export const parseJwt = (token: string) => {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};
