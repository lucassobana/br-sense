import type { MultiPolygon, Polygon, Position } from "geojson";
import {
  hectaresOf,
  inferAreaType,
  validateGeometry,
} from "../shared/geometry";
import type { AreaGeometry, NdviArea } from "../shared/types";
import { randomId } from "./id";

function parseCoordinatesText(text: string): Position[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tuple) => {
      const parts = tuple.split(",").map(Number);
      return [parts[0], parts[1]];
    })
    .filter((pt) => Number.isFinite(pt[0]) && Number.isFinite(pt[1]));
}

function parsePolygonElement(polyEl: Element): Position[][] {
  const rings: Position[][] = [];
  const outer = polyEl.getElementsByTagName("outerBoundaryIs")[0];
  if (outer) {
    const coordsEl = outer.getElementsByTagName("coordinates")[0];
    if (coordsEl?.textContent) {
      const parsed = parseCoordinatesText(coordsEl.textContent);
      if (parsed.length >= 3) rings.push(parsed);
    }
  }
  const inners = Array.from(polyEl.getElementsByTagName("innerBoundaryIs"));
  for (const inner of inners) {
    const coordsEl = inner.getElementsByTagName("coordinates")[0];
    if (coordsEl?.textContent) {
      const parsed = parseCoordinatesText(coordsEl.textContent);
      if (parsed.length >= 3) rings.push(parsed);
    }
  }
  if (!rings.length) {
    const fallbackCoords = polyEl.getElementsByTagName("coordinates")[0];
    if (fallbackCoords?.textContent) {
      const parsed = parseCoordinatesText(fallbackCoords.textContent);
      if (parsed.length >= 3) rings.push(parsed);
    }
  }
  return rings;
}

export async function parseKmlFile(
  file: File,
  farmName = "Fazenda selecionada",
  city = "Brasil",
): Promise<NdviArea[]> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("O arquivo KML deve ter no máximo 5 MB.");
  }
  const xmlText = await file.text();
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("O arquivo selecionado não é um KML válido.");
  }

  const placemarks = Array.from(doc.getElementsByTagName("Placemark"));
  const out: NdviArea[] = [];

  const extractFromElement = (el: Element, index: number) => {
    const nameEl = el.getElementsByTagName("name")[0];
    const rawName = nameEl?.textContent?.trim() || "";
    const polyEls = Array.from(el.getElementsByTagName("Polygon"));
    if (!polyEls.length) return;

    const polyRings = polyEls
      .map(parsePolygonElement)
      .filter((rings) => rings.length > 0);
    if (!polyRings.length) return;

    const rawGeom: Polygon | MultiPolygon =
      polyRings.length === 1
        ? { type: "Polygon", coordinates: polyRings[0] }
        : { type: "MultiPolygon", coordinates: polyRings };

    const geometry: AreaGeometry = validateGeometry(rawGeom);
    const name = rawName || `Área importada ${index + 1}`;
    out.push({
      id: `kml-${randomId()}`,
      name,
      farmName,
      city,
      type: inferAreaType(name, geometry),
      crop: "Cultura não informada",
      hectares: hectaresOf(geometry),
      geometry,
      source: "kml",
    });
  };

  if (placemarks.length > 0) {
    placemarks.forEach((pm, idx) => extractFromElement(pm, idx));
  } else {
    extractFromElement(doc.documentElement, 0);
  }

  if (!out.length) {
    throw new Error(
      "Nenhum polígono foi encontrado no KML. Exporte o contorno da área como polígono.",
    );
  }
  return out;
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c] ?? c,
  );

export function exportKml(areas: NdviArea[]): string {
  const placemarks = areas
    .map((a) => {
      const polys =
        a.geometry.type === "Polygon"
          ? [a.geometry.coordinates]
          : a.geometry.coordinates;
      const body = polys
        .map(
          (r) =>
            `<Polygon><outerBoundaryIs><LinearRing><coordinates>${r[0]
              .map((p) => `${p[0]},${p[1]},0`)
              .join(" ")}</coordinates></LinearRing></outerBoundaryIs></Polygon>`,
        )
        .join("");
      return `<Placemark><name>${esc(a.name)}</name>${
        polys.length > 1 ? `<MultiGeometry>${body}</MultiGeometry>` : body
      }</Placemark>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>BR Sense Areas NDVI</name>${placemarks}</Document></kml>`;
}

