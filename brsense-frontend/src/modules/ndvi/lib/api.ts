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
  const rawApiHost = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const apiHost = rawApiHost.replace(/\/+$/, "");
  const root = baseUrl.startsWith("http")
    ? baseUrl.replace(/\/+$/, "")
    : `${apiHost}${baseUrl.startsWith("/") ? "" : "/"}${baseUrl}`.replace(/\/+$/, "");

  return {
    async listScenes(area: NdviArea, signal?: AbortSignal): Promise<NdviScene[]> {
      const url = new URL(`${root}/areas/${encodeURIComponent(area.id)}/scenes`, window.location.origin);
      if (area.geometry) {
        url.searchParams.set("geom_json", JSON.stringify(area.geometry));
      }
      const r = await fetch(
        url.toString(),
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
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            geometry: area.geometry,
          }),
          signal,
        },
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

