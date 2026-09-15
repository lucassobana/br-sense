# app/services/kml_parser.py
"""
KML/KMZ to GeoJSON parser using only Python stdlib (no lxml, no extra deps).
Supports Placemarks with Point, LineString, Polygon, and MultiGeometry.
"""
import io
import json
import zipfile
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional


# KML XML namespace
KML_NS = "http://www.opengis.net/kml/2.2"


def _ns(tag: str) -> str:
    """Return tag with KML namespace."""
    return f"{{{KML_NS}}}{tag}"


def _parse_coordinates(coord_text: str) -> List[List[float]]:
    """Parse KML coordinates string into list of [lon, lat, ?alt] arrays."""
    coords = []
    for part in coord_text.strip().split():
        vals = part.strip().split(",")
        if len(vals) >= 2:
            try:
                lon = float(vals[0])
                lat = float(vals[1])
                coords.append([lon, lat])
            except ValueError:
                continue
    return coords


def _geometry_from_element(geom_el: ET.Element) -> Optional[Dict[str, Any]]:
    """Convert a KML geometry element to a GeoJSON geometry dict."""
    tag = geom_el.tag

    if tag == _ns("Point"):
        coord_el = geom_el.find(_ns("coordinates"))
        if coord_el is None or not coord_el.text:
            return None
        coords = _parse_coordinates(coord_el.text)
        if not coords:
            return None
        return {"type": "Point", "coordinates": coords[0]}

    elif tag == _ns("LineString"):
        coord_el = geom_el.find(_ns("coordinates"))
        if coord_el is None or not coord_el.text:
            return None
        coords = _parse_coordinates(coord_el.text)
        return {"type": "LineString", "coordinates": coords}

    elif tag == _ns("Polygon"):
        outer = geom_el.find(f".//{_ns('outerBoundaryIs')}/{_ns('LinearRing')}/{_ns('coordinates')}")
        if outer is None or not outer.text:
            return None
        outer_coords = _parse_coordinates(outer.text)
        rings = [outer_coords]

        # Inner rings (holes)
        for inner in geom_el.findall(f".//{_ns('innerBoundaryIs')}/{_ns('LinearRing')}/{_ns('coordinates')}"):
            if inner.text:
                rings.append(_parse_coordinates(inner.text))

        return {"type": "Polygon", "coordinates": rings}

    elif tag == _ns("MultiGeometry"):
        geometries = []
        for child in geom_el:
            geom = _geometry_from_element(child)
            if geom:
                geometries.append(geom)
        if not geometries:
            return None
        return {"type": "GeometryCollection", "geometries": geometries}

    return None


def _placemark_to_feature(placemark: ET.Element) -> Optional[Dict[str, Any]]:
    """Convert a KML Placemark element to a GeoJSON Feature."""
    # Properties
    props: Dict[str, Any] = {}
    name_el = placemark.find(_ns("name"))
    if name_el is not None and name_el.text:
        props["name"] = name_el.text.strip()

    desc_el = placemark.find(_ns("description"))
    if desc_el is not None and desc_el.text:
        props["description"] = desc_el.text.strip()

    # Geometry - try each supported type in order
    geometry = None
    for geo_tag in ("Point", "LineString", "Polygon", "MultiGeometry"):
        geo_el = placemark.find(_ns(geo_tag))
        if geo_el is not None:
            geometry = _geometry_from_element(geo_el)
            break

    if geometry is None:
        return None

    return {
        "type": "Feature",
        "geometry": geometry,
        "properties": props,
    }


def _kml_bytes_to_geojson(kml_bytes: bytes) -> Dict[str, Any]:
    """Parse raw KML bytes and return a GeoJSON FeatureCollection dict."""
    try:
        root = ET.fromstring(kml_bytes)
    except ET.ParseError as e:
        raise ValueError(f"Arquivo KML inválido: {e}")

    # Find all Placemark elements regardless of nesting depth
    placemarks = root.findall(f".//{_ns('Placemark')}")

    features = []
    for pm in placemarks:
        feature = _placemark_to_feature(pm)
        if feature:
            features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features,
    }


def parse_kml_or_kmz(filename: str, file_bytes: bytes) -> str:
    """
    Main entry point. Accepts either a .kml or .kmz file.
    Returns the GeoJSON FeatureCollection as a JSON string.
    """
    lower = filename.lower()

    if lower.endswith(".kmz"):
        # KMZ is a ZIP containing a .kml file (usually doc.kml)
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
                # Find the first .kml file inside
                kml_name = next((n for n in zf.namelist() if n.lower().endswith(".kml")), None)
                if kml_name is None:
                    raise ValueError("Arquivo KMZ não contém nenhum arquivo .kml interno.")
                kml_bytes = zf.read(kml_name)
        except zipfile.BadZipFile:
            raise ValueError("Arquivo KMZ inválido ou corrompido.")
    elif lower.endswith(".kml"):
        kml_bytes = file_bytes
    else:
        raise ValueError("Formato não suportado. Envie um arquivo .kml ou .kmz.")

    geojson_dict = _kml_bytes_to_geojson(kml_bytes)
    return json.dumps(geojson_dict, ensure_ascii=False)
