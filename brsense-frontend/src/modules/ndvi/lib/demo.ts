import {
  boundsOf,
  hectaresOf,
  pointInGeometry,
  validateGeometry,
} from "../shared/geometry";
import { ALGORITHM, BINS, ndviColor, qualityFor } from "../shared/ndvi";
import type {
  AreaGeometry,
  NdviAnalysis,
  NdviApi,
  NdviArea,
  NdviScene,
} from "../shared/types";

function circle(cx: number, cy: number, rLon: number, rLat: number): AreaGeometry {
  const pts: [number, number][] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rLon, cy + Math.sin(a) * rLat]);
  }
  pts.push(pts[0]);
  return validateGeometry({ type: "Polygon", coordinates: [pts] });
}

export const DEMO_AREAS: NdviArea[] = [
  {
    id: "pivo-01",
    name: "Pivô 01 · Sede",
    farmName: "Fazenda Santa Helena",
    city: "Luís Eduardo Magalhães · BA",
    type: "pivo",
    crop: "Soja · R3",
    hectares: 118.4,
    geometry: circle(-45.822, -12.248, 0.0063, 0.0061),
    source: "demo",
  },
  {
    id: "pivo-02",
    name: "Pivô 02 · Nascente",
    farmName: "Fazenda Santa Helena",
    city: "Luís Eduardo Magalhães · BA",
    type: "pivo",
    crop: "Milho · V8",
    hectares: 94.2,
    geometry: circle(-45.806, -12.249, 0.0056, 0.0055),
    source: "demo",
  },
  {
    id: "pivo-03",
    name: "Pivô 03 · Vereda",
    farmName: "Fazenda Santa Helena",
    city: "Luís Eduardo Magalhães · BA",
    type: "pivo",
    crop: "Algodão · B4",
    hectares: 136.0,
    geometry: circle(-45.814, -12.263, 0.0068, 0.0066),
    source: "demo",
  },
  {
    id: "talhao-04",
    name: "Talhão 04 · Chapada Norte",
    farmName: "Fazenda Santa Helena",
    city: "Luís Eduardo Magalhães · BA",
    type: "talhao",
    crop: "Soja · R5",
    hectares: 162.8,
    geometry: validateGeometry({
      type: "Polygon",
      coordinates: [
        [
          [-45.838, -12.259],
          [-45.826, -12.257],
          [-45.824, -12.268],
          [-45.839, -12.269],
          [-45.838, -12.259],
        ],
      ],
    }),
    source: "demo",
  },
];

for (const a of DEMO_AREAS) {
  a.hectares = hectaresOf(a.geometry);
}

function getRecentDates(count = 7): string[] {
  const dates: string[] = [];
  const now = new Date();
  // Passagem mais recente: 1 dia atrás às 13:24 UTC (horário típico de passagem do Sentinel-2 no Brasil)
  const base = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1);
  base.setUTCHours(13, 24, 0, 0);

  // Ciclo orbital padrão de revisita de 5 dias do Sentinel-2
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getTime() - i * 5 * 24 * 60 * 60 * 1000);
    dates.push(d.toISOString());
  }
  return dates;
}

function seed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return Math.abs(h);
}

function buildScenes(areaId: string): NdviScene[] {
  const s = seed(areaId);
  const dates = getRecentDates(7);
  return dates.map((d, i) => ({
    id: `S2-${areaId}-${d.slice(0, 10)}`,
    acquiredAt: d,
    satellite: i % 2 === 0 ? "Sentinel-2B" : "Sentinel-2A",
    tileCloudPct: [4, 62, 11, 8, 76, 15, 6][(i + (s % 3)) % 7],
  }));
}

function render(area: NdviArea, sceneIndex: number): NdviAnalysis {
  const b = boundsOf(area.geometry);
  const s = seed(area.id) + sceneIndex * 19;
  const scenes = buildScenes(area.id);
  const scene = scenes[sceneIndex] ?? scenes[0];
  const size = 150;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cloudy = (scene.tileCloudPct ?? 0) > 45;
  const seasonal = [0.74, 0.72, 0.7, 0.67, 0.63, 0.59, 0.54][sceneIndex] ?? 0.68;
  let total = 0;
  let valid = 0;
  let sum = 0;
  let min = 1;
  let max = -1;
  const histogram = BINS.map((bin) => ({ ...bin, count: 0 }));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lon = b[0] + ((x + 0.5) / size) * (b[2] - b[0]);
      const lat = b[3] - ((y + 0.5) / size) * (b[3] - b[1]);
      if (!pointInGeometry([lon, lat], area.geometry)) continue;
      total++;
      const nx = x / size - 0.5;
      const ny = y / size - 0.5;
      const radial = Math.hypot(nx, ny);
      const angle = Math.atan2(ny, nx);
      const cloudWave =
        Math.sin(nx * 7 + (s % 7)) + Math.cos(ny * 6 - sceneIndex);
      const isCloud =
        cloudy && cloudWave > -0.15
          ? true
          : !cloudy &&
            (scene.tileCloudPct ?? 0) > 10 &&
            cloudWave > 1.35;
      const o = (y * size + x) * 4;
      if (isCloud) {
        img.data.set([169, 184, 194, 175], o);
        continue;
      }
      const stressSector =
        Math.exp(-((angle - 0.55) ** 2) / 0.16) *
        Math.exp(-((radial - 0.28) ** 2) / 0.025) *
        0.24;
      const ring = Math.sin(radial * 28 + (s % 5)) * 0.035;
      const gradient = (nx * 0.08 - ny * 0.06) * ((s % 2) ? 1 : -1);
      const v = Math.max(
        0.08,
        Math.min(
          0.89,
          seasonal + ring + gradient - stressSector - radial * 0.06,
        ),
      );
      valid++;
      sum += v;
      min = Math.min(min, v);
      max = Math.max(max, v);
      const bin = histogram.find((item) => v >= item.min && v < item.max);
      if (bin) bin.count++;
      const [r, g, bl] = ndviColor(v);
      img.data.set([r, g, bl, 242], o);
    }
  }
  ctx.putImageData(img, 0, 0);
  const validPct = total ? (valid / total) * 100 : 0;
  const quality = qualityFor(validPct);
  const ok = quality !== "insuficiente" && valid > 0;
  return {
    areaId: area.id,
    sceneId: scene.id,
    acquiredAt: scene.acquiredAt,
    processedAt: new Date().toISOString(),
    source: "demo",
    resolutionM: 10,
    validPct,
    quality,
    mean: ok ? sum / valid : null,
    min: ok ? min : null,
    max: ok ? max : null,
    validPixels: valid,
    totalPixels: total,
    histogram,
    bounds: b,
    pngUrl: canvas.toDataURL("image/png"),
    algorithm: ALGORITHM,
  };
}

const cache = new Map<string, NdviAnalysis>();

export const demoApi: NdviApi = {
  async listScenes(area: NdviArea): Promise<NdviScene[]> {
    return buildScenes(area.id);
  },
  async analyzeScene(area: NdviArea, scene: NdviScene): Promise<NdviAnalysis> {
    const scenes = buildScenes(area.id);
    const idx = Math.max(
      0,
      scenes.findIndex((s) => s.id === scene.id),
    );
    const key = `${area.id}:${scene.id}:${area.hectares}`;
    if (!cache.has(key)) {
      cache.set(key, render(area, idx));
    }
    return cache.get(key)!;
  },
};

