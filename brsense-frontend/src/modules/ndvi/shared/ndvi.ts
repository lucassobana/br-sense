import type { NdviBin, SceneQuality } from "./types";

export const ALGORITHM =
  "S2L2A-B08-B04-SCL456-CLD40-1pxDilate-UTM10m-v1";

export const BINS: Omit<NdviBin, "count">[] = [
  {
    id: "baixo",
    label: "Solo exposto / falha",
    rangeLabel: "< 0,25",
    min: -1,
    max: 0.25,
    color: "#e52700",
  },
  {
    id: "atencao",
    label: "Atenção / estresse",
    rangeLabel: "0,25 – 0,45",
    min: 0.25,
    max: 0.45,
    color: "#ff6e00",
  },
  {
    id: "moderado",
    label: "Desenvolvimento",
    rangeLabel: "0,45 – 0,65",
    min: 0.45,
    max: 0.65,
    color: "#73e60a",
  },
  {
    id: "vigoroso",
    label: "Vigor alto",
    rangeLabel: "≥ 0,65",
    min: 0.65,
    max: 1.01,
    color: "#0fc319",
  },
];

export function qualityFor(validPct: number): SceneQuality {
  if (validPct >= 70) return "utilizavel";
  if (validPct >= 30) return "parcial";
  return "insuficiente";
}

export function ndviColor(v: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0.00, [215, 25, 0]],
    [0.20, [235, 45, 0]],
    [0.32, [255, 110, 0]],
    [0.44, [255, 230, 0]],
    [0.56, [115, 230, 10]],
    [0.68, [15, 195, 25]],
    [0.80, [0, 110, 20]],
  ];
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [a, ca] = stops[i - 1];
    const [b, cb] = stops[i];
    if (v <= b) {
      const t = (v - a) / (b - a);
      return [0, 1, 2].map((k) =>
        Math.round(ca[k] + (cb[k] - ca[k]) * t),
      ) as [number, number, number];
    }
  }
  return stops[stops.length - 1][1];
}

