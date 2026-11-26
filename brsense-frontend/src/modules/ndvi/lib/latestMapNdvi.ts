import type {
  NdviAnalysis,
  NdviApi,
  NdviArea,
  NdviScene,
} from "../shared/types";

export interface LatestMapNdviResult {
  area: NdviArea;
  scene: NdviScene;
  analysis: NdviAnalysis;
  usedFallbackScene: boolean;
}

export async function loadLatestMapNdvi(
  api: NdviApi,
  area: NdviArea,
  signal?: AbortSignal,
): Promise<LatestMapNdviResult> {
  const scenes = await api.listScenes(area, signal);
  if (!scenes.length) {
    throw new Error(
      "Nenhuma passagem Sentinel-2 foi encontrada para esta área.",
    );
  }
  const ordered = [
    ...scenes.filter((s) => (s.tileCloudPct ?? 0) <= 10),
    ...scenes.filter((s) => (s.tileCloudPct ?? 0) > 10 && (s.tileCloudPct ?? 0) <= 30),
  ];
  let fallback: LatestMapNdviResult | null = null;
  for (let i = 0; i < Math.min(ordered.length, 4); i++) {
    const scene = ordered[i];
    const analysis = await api.analyzeScene(area, scene, signal);
    if (!analysis.pngUrl) continue;
    const candidate: LatestMapNdviResult = {
      area,
      scene,
      analysis,
      usedFallbackScene: scene.id !== scenes[0].id,
    };
    if (analysis.quality !== "insuficiente" && analysis.validPct >= 90) return candidate;
    fallback ??= candidate;
  }
  if (fallback) return fallback;
  throw new Error(
    "As passagens recentes estão encobertas por nuvens nesta área.",
  );
}

