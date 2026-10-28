import io
import time
import asyncio
import logging
from typing import Dict, Any, Optional, List, Tuple
import httpx
import tifffile

logger = logging.getLogger(__name__)

STANDARD_DEPTHS = [
    {"id": "0-5cm", "topCm": 0, "bottomCm": 5},
    {"id": "5-15cm", "topCm": 5, "bottomCm": 15},
    {"id": "15-30cm", "topCm": 15, "bottomCm": 30},
    {"id": "30-60cm", "topCm": 30, "bottomCm": 60},
    {"id": "60-100cm", "topCm": 60, "bottomCm": 100},
    {"id": "100-200cm", "topCm": 100, "bottomCm": 200},
]

class SoilServiceError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 502):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code

def validate_query(lat: float, lon: float, depth_cm: int):
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
        raise SoilServiceError("INVALID_COORDINATES", "Latitude ou longitude inválida.", 400)
    if not (0 < depth_cm <= 200):
        raise SoilServiceError("INVALID_DEPTH", "Profundidade de consulta deve estar entre 0 e 200 cm.", 400)

def coverage_url(lat: float, lon: float, prop: str, depth: str, prediction: str) -> str:
    lon_min = max(-180.0, lon - 0.003)
    lon_max = min(180.0, lon + 0.003)
    lat_min = max(-90.0, lat - 0.003)
    lat_max = min(90.0, lat + 0.003)
    
    params = {
        "map": f"/map/{prop}.map",
        "SERVICE": "WCS",
        "VERSION": "2.0.1",
        "REQUEST": "GetCoverage",
        "COVERAGEID": f"{prop}_{depth}_{prediction}",
        "FORMAT": "GEOTIFF_INT16",
        "SUBSET": [f"X({lon_min},{lon_max})", f"Y({lat_min},{lat_max})"],
        "SUBSETTINGCRS": "http://www.opengis.net/def/crs/EPSG/0/4326",
        "OUTPUTCRS": "http://www.opengis.net/def/crs/EPSG/0/4326",
    }
    query_parts = []
    for k, v in params.items():
        if isinstance(v, list):
            for item in v:
                query_parts.append(f"{k}={item}")
        else:
            query_parts.append(f"{k}={v}")
    return f"https://maps.isric.org/mapserv?{'&'.join(query_parts)}"

def extract_pixel(data: bytes, lat: float, lon: float) -> Optional[float]:
    try:
        with tifffile.TiffFile(io.BytesIO(data)) as tif:
            page = tif.pages[0]
            arr = page.asarray()
            tiepoint = page.tags["ModelTiepointTag"].value
            scale = page.tags["ModelPixelScaleTag"].value
            
            h, w = arr.shape
            min_lon = tiepoint[3]
            max_lat = tiepoint[4]
            scale_x, scale_y = scale[0], scale[1]
            
            if scale_x <= 0 or scale_y <= 0:
                return None
                
            col = min(w - 1, max(0, int((lon - min_lon) / scale_x)))
            row = min(h - 1, max(0, int((max_lat - lat) / scale_y)))
            
            raw_val = int(arr[row, col])
            if raw_val < 0 or raw_val == -32768 or raw_val > 1000:
                return None
            return float(raw_val)
    except Exception as e:
        logger.warning(f"Erro ao extrair pixel do GeoTIFF: {e}")
        return None

def convert_value(prop: str, raw: Optional[float]) -> Optional[float]:
    if raw is None or raw < 0 or raw > 1000:
        return None
    if prop.startswith("wv"):
        return None if raw == 0 else raw / 1000.0
    return raw / 1000.0 if prop == "cfvo" else raw / 10.0

class SoilGridsProvider:
    def __init__(self, ttl_seconds: int = 7 * 24 * 3600):
        self._cache: Dict[str, Tuple[float, Optional[float]]] = {}
        self._ttl = ttl_seconds
        self._sem: Optional[asyncio.Semaphore] = None

    def _get_semaphore(self) -> asyncio.Semaphore:
        if self._sem is None:
            self._sem = asyncio.Semaphore(6)
        return self._sem
        
    async def _fetch_property(
        self, client: httpx.AsyncClient, lat: float, lon: float, prop: str, depth: str, prediction: str
    ) -> Optional[float]:
        key = f"{lat:.4f},{lon:.4f}|{prop}|{depth}|{prediction}"
        now = time.time()
        if key in self._cache:
            expires, cached_val = self._cache[key]
            if expires > now:
                return cached_val

        url = coverage_url(lat, lon, prop, depth, prediction)
        async with self._get_semaphore():
            try:
                resp = await client.get(url, timeout=20.0, headers={"Accept": "image/tiff"})
                if resp.status_code != 200:
                    logger.warning(f"SoilGrids retornou status {resp.status_code} para {prop} {depth}")
                    return None
                data = resp.content
                if len(data) > 2_000_000:
                    return None
                raw_pixel = extract_pixel(data, lat, lon)
                val = convert_value(prop, raw_pixel)
                # Salva em cache
                cache_ttl = 60.0 if val is None else self._ttl
                self._cache[key] = (now + cache_ttl, val)
                return val
            except Exception as e:
                logger.error(f"Falha ao consultar SoilGrids WCS ({prop}_{depth}_{prediction}): {e}")
                return None

    async def get_profile(self, lat: float, lon: float, depth_cm: int = 60, uncertainty: bool = False) -> Dict[str, Any]:
        validate_query(lat, lon, depth_cm)
        warnings: List[str] = []
        
        target_depths = [d for d in STANDARD_DEPTHS if d["topCm"] < depth_cm]
        
        async with httpx.AsyncClient() as client:
            async def get_layer_data(depth_info: Dict[str, Any]) -> Dict[str, Any]:
                d_id = depth_info["id"]
                
                tasks = [
                    self._fetch_property(client, lat, lon, "wv0010", d_id, "mean"),
                    self._fetch_property(client, lat, lon, "wv0033", d_id, "mean"),
                    self._fetch_property(client, lat, lon, "wv1500", d_id, "mean"),
                    self._fetch_property(client, lat, lon, "cfvo", d_id, "mean"),
                    self._fetch_property(client, lat, lon, "sand", d_id, "mean"),
                    self._fetch_property(client, lat, lon, "silt", d_id, "mean"),
                    self._fetch_property(client, lat, lon, "clay", d_id, "mean"),
                ]
                
                # Se pedir incerteza, buscamos Q0.05 e Q0.95 também
                if uncertainty:
                    tasks.extend([
                        self._fetch_property(client, lat, lon, "wv0010", d_id, "Q0.05"),
                        self._fetch_property(client, lat, lon, "wv0010", d_id, "Q0.95"),
                        self._fetch_property(client, lat, lon, "wv0033", d_id, "Q0.05"),
                        self._fetch_property(client, lat, lon, "wv0033", d_id, "Q0.95"),
                        self._fetch_property(client, lat, lon, "wv1500", d_id, "Q0.05"),
                        self._fetch_property(client, lat, lon, "wv1500", d_id, "Q0.95"),
                    ])
                    results = await asyncio.gather(*tasks)
                    w10_m, w33_m, w1500_m, cfvo, sand, silt, clay = results[:7]
                    w10_q05, w10_q95, w33_q05, w33_q95, w1500_q05, w1500_q95 = results[7:]
                else:
                    results = await asyncio.gather(*tasks)
                    w10_m, w33_m, w1500_m, cfvo, sand, silt, clay = results
                    w10_q05 = w10_q95 = w33_q05 = w33_q95 = w1500_q05 = w1500_q95 = None

                if None in (w10_m, w33_m, w1500_m, cfvo):
                    warnings.append(f"Dados incompletos na camada {d_id}.")

                return {
                    "id": d_id,
                    "topCm": depth_info["topCm"],
                    "bottomCm": depth_info["bottomCm"],
                    "theta10": {"mean": w10_m, "q05": w10_q05, "q95": w10_q95},
                    "theta33": {"mean": w33_m, "q05": w33_q05, "q95": w33_q95},
                    "theta1500": {"mean": w1500_m, "q05": w1500_q05, "q95": w1500_q95},
                    "coarseFragments": cfvo,
                    "sandPercent": sand,
                    "siltPercent": silt,
                    "clayPercent": clay,
                }

            layers = await asyncio.gather(*[get_layer_data(d) for d in target_depths])

        if not uncertainty:
            warnings.append("Intervalos de incerteza não consultados nesta busca; disponíveis com uncertainty=true.")

        return {
            "coordinates": {"latitude": lat, "longitude": lon},
            "requestedDepthCm": depth_cm,
            "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "source": {
                "provider": "SoilGrids",
                "method": "WCS",
                "resolutionM": 250,
                "url": "https://isric.org/explore/soilgrids",
                "license": "CC BY 4.0",
                "estimated": True,
                "prediction": "mean",
            },
            "layers": layers,
            "warnings": list(set(warnings)),
        }

soil_grids_provider = SoilGridsProvider()
