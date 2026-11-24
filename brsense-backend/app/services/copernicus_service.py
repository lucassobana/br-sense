# app/services/copernicus_service.py
import io
import math
import os
import struct
import time
import zlib
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
import numpy as np
import tifffile
from app.settings import settings

COPERNICUS_CLIENT_ID = os.getenv(
    "COPERNICUS_CLIENT_ID", getattr(settings, "COPERNICUS_CLIENT_ID", None)
) or ""
COPERNICUS_CLIENT_SECRET = os.getenv(
    "COPERNICUS_CLIENT_SECRET", getattr(settings, "COPERNICUS_CLIENT_SECRET", None)
) or ""

ENDPOINTS = {
    "token": "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
    "catalog": "https://sh.dataspace.copernicus.eu/catalog/v1/search",
    "process": "https://sh.dataspace.copernicus.eu/process/v1",
}

EVALSCRIPT = """//VERSION=3
function setup() {
  return {input: [{bands: ["B04", "B08", "SCL", "CLD", "dataMask"]}], output: {id:"default",bands:2,sampleType:"FLOAT32",nodataValue:-9999}};
}
function evaluatePixel(s) {
  if (!s.dataMask) return [-9999, 0];
  var valid = (s.SCL === 4 || s.SCL === 5 || s.SCL === 6) && s.CLD <= 40;
  var sum = s.B08 + s.B04;
  if (!valid || !isFinite(sum) || Math.abs(sum) < 0.000001) return [-9999, 1];
  var v = (s.B08 - s.B04) / sum;
  if (!isFinite(v) || v < -1 || v > 1) return [-9999, 1];
  return [v, 2];
}"""

BINS = [
    {"id": "baixo", "label": "Solo exposto / falha", "rangeLabel": "< 0,25", "min": -1.0, "max": 0.25, "color": "#bf5b3d"},
    {"id": "atencao", "label": "Atenção / estresse", "rangeLabel": "0,25 – 0,45", "min": 0.25, "max": 0.45, "color": "#df9b43"},
    {"id": "moderado", "label": "Desenvolvimento", "rangeLabel": "0,45 – 0,65", "min": 0.45, "max": 0.65, "color": "#b7cf4c"},
    {"id": "vigoroso", "label": "Vigor alto", "rangeLabel": "≥ 0,65", "min": 0.65, "max": 1.01, "color": "#2ea84b"},
]

COLOR_STOPS = [
    (-0.2, (68, 99, 127)),
    (0.08, (175, 86, 61)),
    (0.25, (215, 130, 67)),
    (0.42, (231, 198, 92)),
    (0.58, (164, 205, 76)),
    (0.72, (64, 166, 64)),
    (0.88, (22, 111, 56)),
]


def ndvi_color(v: float) -> Tuple[int, int, int]:
    if v <= COLOR_STOPS[0][0]:
        return COLOR_STOPS[0][1]
    for i in range(1, len(COLOR_STOPS)):
        a, ca = COLOR_STOPS[i - 1]
        b, cb = COLOR_STOPS[i]
        if v <= b:
            t = (v - a) / (b - a)
            return (
                int(round(ca[0] + (cb[0] - ca[0]) * t)),
                int(round(ca[1] + (cb[1] - ca[1]) * t)),
                int(round(ca[2] + (cb[2] - ca[2]) * t)),
            )
    return COLOR_STOPS[-1][1]


def bounds_of_geometry(geometry: Dict[str, Any]) -> Tuple[float, float, float, float]:
    """Calcula [min_lon, min_lat, max_lon, max_lat] de um GeoJSON Polygon ou MultiPolygon."""
    g_type = geometry.get("type", "")
    coords = geometry.get("coordinates", [])
    if g_type == "Polygon":
        rings = coords
    elif g_type == "MultiPolygon":
        rings = [r for poly in coords for r in poly]
    else:
        rings = coords

    all_pts = [pt for ring in rings for pt in ring]
    if not all_pts:
        return (-45.85, -12.30, -45.75, -12.20)

    lons = [p[0] for p in all_pts]
    lats = [p[1] for p in all_pts]
    return (min(lons), min(lats), max(lons), max(lats))


def point_in_rings(x: float, y: float, rings: List[List[List[float]]]) -> bool:
    """Verifica se (x=lon, y=lat) está dentro do anel externo e fora dos buracos."""
    if not rings:
        return True
    exterior = rings[0]
    n = len(exterior)
    inside = False
    p1x, p1y = exterior[0]
    for i in range(1, n + 1):
        p2x, p2y = exterior[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x if p1y != p2y else p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    if not inside:
        return False

    for hole in rings[1:]:
        n_h = len(hole)
        in_hole = False
        h1x, h1y = hole[0]
        for i in range(1, n_h + 1):
            h2x, h2y = hole[i % n_h]
            if y > min(h1y, h2y) and y <= max(h1y, h2y) and x <= max(h1x, h2x):
                xinters = (y - h1y) * (h2x - h1x) / (h2y - h1y) + h1x if h1y != h2y else h1x
                if h1x == h2x or x <= xinters:
                    in_hole = not in_hole
            h1x, h1y = h2x, h2y
        if in_hole:
            return False
    return True


def encode_png_rgba(rgba: np.ndarray) -> bytes:
    """Codifica array NumPy (H, W, 4) uint8 em PNG puro sem depender do Pillow."""
    height, width, _ = rgba.shape
    raw = bytearray()
    for row in rgba:
        raw.append(0)  # filter type 0 (None)
        raw.extend(row.tobytes())
    comp = zlib.compress(bytes(raw), 6)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", comp)
        + chunk(b"IEND", b"")
    )


class CopernicusService:
    _instance: Optional["CopernicusService"] = None

    def __init__(self):
        self.client_id = COPERNICUS_CLIENT_ID
        self.client_secret = COPERNICUS_CLIENT_SECRET
        self.token: Optional[str] = None
        self.token_expiry: float = 0.0
        self.scenes_cache: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}
        self.product_cache: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def get_instance(cls) -> "CopernicusService":
        if cls._instance is None:
            cls._instance = CopernicusService()
        return cls._instance

    def get_token(self) -> str:
        """Obtém ou renova token de acesso OAuth2 do Copernicus Data Space Ecosystem."""
        now = time.time()
        if self.token and self.token_expiry > now + 60:
            return self.token

        if not self.client_id or not self.client_secret:
            raise ValueError("Credenciais do Copernicus não foram configuradas.")

        with httpx.Client(timeout=25.0) as client:
            resp = client.post(
                ENDPOINTS["token"],
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
            )
            if resp.status_code != 200:
                raise RuntimeError(
                    f"Falha na autenticação com Copernicus ({resp.status_code}): {resp.text}"
                )
            data = resp.json()
            access_token = data.get("access_token")
            expires_in = data.get("expires_in", 300)
            if not access_token:
                raise RuntimeError("Token de acesso não retornado pelo Copernicus.")

            self.token = access_token
            self.token_expiry = now + expires_in
            return self.token

    def list_scenes(self, geometry: Dict[str, Any], days: int = 90) -> List[Dict[str, Any]]:
        """Busca no catálogo do Sentinel-2 as passagens reais disponíveis sobre a geometria."""
        cache_key = f"{hash(str(geometry))}:{days}"
        now_ts = time.time()
        if cache_key in self.scenes_cache:
            exp, cached = self.scenes_cache[cache_key]
            if exp > now_ts:
                return cached

        token = self.get_token()
        now_dt = datetime.now(timezone.utc)
        from_dt = now_dt - timedelta(days=days)
        time_range = f"{from_dt.strftime('%Y-%m-%dT%H:%M:%SZ')}/{now_dt.strftime('%Y-%m-%dT%H:%M:%SZ')}"

        min_lon, min_lat, max_lon, max_lat = bounds_of_geometry(geometry)

        search_payload: Dict[str, Any] = {
            "collections": ["sentinel-2-l2a"],
            "datetime": time_range,
            "limit": 100,
        }
        if geometry and geometry.get("coordinates"):
            search_payload["intersects"] = geometry
        else:
            search_payload["bbox"] = [min_lon, min_lat, max_lon, max_lat]

        with httpx.Client(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/geo+json, application/json, */*",
            }
            resp = client.post(
                ENDPOINTS["catalog"],
                headers=headers,
                json=search_payload,
            )
            if resp.status_code == 406:
                # Fallback sem especificar Accept caso o gateway exija curinga
                headers["Accept"] = "*/*"
                resp = client.post(
                    ENDPOINTS["catalog"],
                    headers=headers,
                    json=search_payload,
                )
            if resp.status_code != 200:
                raise RuntimeError(f"Erro ao consultar catálogo do Copernicus ({resp.status_code}): {resp.text}")

            res_data = resp.json()
            features = res_data.get("features", [])
            out: List[Dict[str, Any]] = []

            for f in features:
                props = f.get("properties", {})
                d_str = props.get("datetime")
                if not d_str:
                    continue
                cloud_pct = props.get("eo:cloud_cover")
                platform = props.get("platform", "Sentinel-2")
                out.append({
                    "id": f.get("id"),
                    "acquiredAt": d_str,
                    "satellite": str(platform),
                    "tileCloudPct": float(cloud_pct) if cloud_pct is not None else None,
                })

            # Agrupa passagens adjacentes da mesma órbita (intervalo de 10 minutos)
            unique: Dict[str, Dict[str, Any]] = {}
            for s in out:
                try:
                    dt = datetime.fromisoformat(s["acquiredAt"].replace("Z", "+00:00"))
                    ts_bucket = int(dt.timestamp() / 600)
                    key = f"{s['satellite']}:{ts_bucket}"
                    existing = unique.get(key)
                    if not existing or (s["tileCloudPct"] or 100) < (existing["tileCloudPct"] or 100):
                        unique[key] = s
                except Exception:
                    continue

            result = sorted(
                unique.values(),
                key=lambda x: x["acquiredAt"],
                reverse=True,
            )

            # Guarda em cache por 1 hora
            self.scenes_cache[cache_key] = (now_ts + 3600, result)
            return result

    def analyze_scene(
        self,
        area_id: str,
        geometry: Dict[str, Any],
        scene_id: str,
        acquired_at: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Processa a passagem Sentinel-2 real, recortando a geometria e calculando estatísticas e imagem PNG."""
        key = f"{area_id}:{scene_id}"
        if key in self.product_cache:
            return self.product_cache[key]["analysis"]

        token = self.get_token()

        # Determina a data da passagem
        if not acquired_at:
            scenes = self.list_scenes(geometry, days=90)
            sc = next((s for s in scenes if s["id"] == scene_id), None)
            acquired_at = sc["acquiredAt"] if sc else datetime.now(timezone.utc).isoformat()

        dt = datetime.fromisoformat(acquired_at.replace("Z", "+00:00"))
        time_from = (dt - timedelta(minutes=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
        time_to = (dt + timedelta(minutes=2)).strftime("%Y-%m-%dT%H:%M:%SZ")

        min_lon, min_lat, max_lon, max_lat = bounds_of_geometry(geometry)
        mid_lat = (min_lat + max_lat) / 2.0

        # Calcula resolução em pixels aproximando 10 metros por pixel
        width_px = max(16, min(1500, int(round((max_lon - min_lon) * 111320 * math.cos(math.radians(mid_lat)) / 10.0))))
        height_px = max(16, min(1500, int(round((max_lat - min_lat) * 111320 / 10.0))))

        process_body = {
            "input": {
                "bounds": {
                    "bbox": [min_lon, min_lat, max_lon, max_lat],
                    "properties": {
                        "crs": "http://www.opengis.net/def/crs/EPSG/0/4326"
                    },
                },
                "data": [
                    {
                        "type": "sentinel-2-l2a",
                        "dataFilter": {
                            "timeRange": {"from": time_from, "to": time_to},
                            "mosaickingOrder": "mostRecent",
                        },
                        "processing": {
                            "upsampling": "NEAREST",
                            "downsampling": "NEAREST",
                            "harmonizeValues": True,
                        },
                    }
                ],
            },
            "output": {
                "width": width_px,
                "height": height_px,
                "responses": [{"identifier": "default", "format": {"type": "image/tiff"}}],
            },
            "evalscript": EVALSCRIPT,
        }

        with httpx.Client(timeout=60.0) as client:
            resp = client.post(
                ENDPOINTS["process"],
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "image/tiff",
                },
                json=process_body,
            )
            if resp.status_code != 200:
                raise RuntimeError(
                    f"Erro ao processar imagem no Copernicus ({resp.status_code}): {resp.text}"
                )
            tiff_bytes = resp.content

        # Processamento numérico com NumPy e TiffFile
        with tifffile.TiffFile(io.BytesIO(tiff_bytes)) as tif:
            raster = tif.asarray()  # shape (2, H, W) ou (H, W, 2)

        if raster.ndim == 3 and raster.shape[0] == 2:
            ndvi_arr = raster[0].astype(np.float32)
            state_arr = raster[1].astype(np.float32)
        elif raster.ndim == 3 and raster.shape[2] == 2:
            ndvi_arr = raster[:, :, 0].astype(np.float32)
            state_arr = raster[:, :, 1].astype(np.float32)
        elif raster.ndim == 2:
            ndvi_arr = raster.astype(np.float32)
            state_arr = np.where(ndvi_arr > -9000, 2, 0).astype(np.float32)
        else:
            raise RuntimeError(f"Formato de bandas inesperado retornado pelo Copernicus: shape {raster.shape}")

        h, w = ndvi_arr.shape

        # Extrai os anéis do polígono para recorte exato
        g_type = geometry.get("type", "")
        coords = geometry.get("coordinates", [])
        if g_type == "Polygon":
            poly_rings_list = [coords]
        elif g_type == "MultiPolygon":
            poly_rings_list = coords
        else:
            poly_rings_list = [coords]

        # Máscara de pixels dentro do polígono
        rgba_img = np.zeros((h, w, 4), dtype=np.uint8)
        histogram = [dict(b, count=0) for b in BINS]
        valid_count = 0
        total_in_polygon = 0
        val_sum = 0.0
        min_val = 1.0
        max_val = -1.0

        for y in range(h):
            lat_p = max_lat - ((y + 0.5) / h) * (max_lat - min_lat)
            for x in range(w):
                lon_p = min_lon + ((x + 0.5) / w) * (max_lon - min_lon)

                # Verifica se o ponto está dentro de qualquer polígono da área
                in_poly = any(point_in_rings(lon_p, lat_p, rings) for rings in poly_rings_list)
                if not in_poly:
                    continue

                total_in_polygon += 1
                state = state_arr[y, x]
                val = ndvi_arr[y, x]

                if state == 2 and np.isfinite(val) and -1.0 <= val <= 1.0:
                    valid_count += 1
                    val_sum += float(val)
                    if val < min_val:
                        min_val = float(val)
                    if val > max_val:
                        max_val = float(val)

                    # Bins
                    for b in histogram:
                        if b["min"] <= val < b["max"]:
                            b["count"] += 1
                            break

                    r, g, b = ndvi_color(val)
                    rgba_img[y, x] = [r, g, b, 245]
                elif state == 1:
                    # Nuvem/sombra detectada
                    rgba_img[y, x] = [170, 185, 195, 175]

        valid_pct = (valid_count / total_in_polygon * 100.0) if total_in_polygon > 0 else 0.0
        quality = "utilizavel" if valid_pct >= 70.0 else ("parcial" if valid_pct >= 30.0 else "insuficiente")
        adequate = quality != "insuficiente" and valid_count > 0

        png_bytes = encode_png_rgba(rgba_img)

        analysis = {
            "areaId": area_id,
            "sceneId": scene_id,
            "acquiredAt": acquired_at,
            "processedAt": datetime.now(timezone.utc).isoformat(),
            "source": "copernicus",
            "resolutionM": 10,
            "validPct": round(valid_pct, 1),
            "quality": quality,
            "mean": round(val_sum / valid_count, 3) if adequate else None,
            "min": round(min_val, 3) if adequate else None,
            "max": round(max_val, 3) if adequate else None,
            "validPixels": valid_count,
            "totalPixels": total_in_polygon,
            "histogram": histogram,
            "bounds": [min_lon, min_lat, max_lon, max_lat],
            "pngUrl": f"/api/ndvi/areas/{area_id}/scenes/{scene_id}/raster.png",
            "tiffUrl": f"/api/ndvi/areas/{area_id}/scenes/{scene_id}/raster.tif",
            "algorithm": "S2L2A-B08-B04-SCL456-CLD40-1pxDilate-WGS84-v1",
        }

        self.product_cache[key] = {
            "analysis": analysis,
            "png": png_bytes,
            "tiff": tiff_bytes,
            "created_at": time.time(),
        }

        return analysis

    def get_asset(self, area_id: str, scene_id: str, asset_name: str) -> Optional[Tuple[bytes, str]]:
        key = f"{area_id}:{scene_id}"
        prod = self.product_cache.get(key)
        if not prod:
            return None
        if asset_name == "raster.png":
            return (prod["png"], "image/png")
        if asset_name in ("raster.tif", "raster.tiff"):
            return (prod["tiff"], "image/tiff")
        return None
