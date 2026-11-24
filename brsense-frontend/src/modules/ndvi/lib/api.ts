import type {
  NdviAnalysis,
  NdviApi,
  NdviArea,
  NdviScene,
} from "../shared/types";

async function readError(r: Response): Promise<string> {
  try {
    const j = await r.json();
    if (j?.message) return String(j.message);
  } catch {
    // ignore JSON parse failure
  }
  if (r.status === 401 || r.status === 403) {
    return "Sua sessão não tem acesso a esta área.";
  }
  if (r.status === 429) {
    return "A fila de imagens está ocupada. Tente novamente em instantes.";
  }
  return "Não foi possível consultar o serviço de imagens.";
}

export function createHttpNdviApi(baseUrl = "/api/ndvi"): NdviApi {
  const apiHost = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const root = baseUrl.startsWith("http")
    ? baseUrl
    : `${apiHost}${baseUrl.startsWith("/") ? "" : "/"}${baseUrl}`;

  return {
    async listScenes(area: NdviArea, signal?: AbortSignal): Promise<NdviScene[]> {
      const r = await fetch(
        `${root}/areas/${encodeURIComponent(area.id)}/scenes`,
        { signal },
      );
      if (!r.ok) throw new Error(await readError(r));
      return r.json();
    },
    async analyzeScene(
      area: NdviArea,
      scene: NdviScene,
      signal?: AbortSignal,
    ): Promise<NdviAnalysis> {
      const r = await fetch(
        `${root}/areas/${encodeURIComponent(area.id)}/scenes/${encodeURIComponent(scene.id)}/analysis`,
        { method: "POST", signal },
      );
      if (!r.ok) throw new Error(await readError(r));
      const data = await r.json();
      if (data.pngUrl && data.pngUrl.startsWith("/")) {
        data.pngUrl = `${apiHost}${data.pngUrl}`;
      }
      return data;
    },
  };
}

