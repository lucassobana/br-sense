import { useEffect, useMemo, useState } from "react";
import { Box, useToast } from "@chakra-ui/react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  createNdviAreasBatch,
  deleteNdviArea,
  getFarms,
  getMapLayers,
  getNdviAreas,
  getProbes,
  updateNdviArea,
} from "../services/api";
import { isUserAdmin } from "../services/auth";
import { COLORS } from "../colors/colors";
import type { Farm, MapLayer, Probe } from "../types";
import {
  NdviModule,
  createHttpNdviApi,
  demoApi,
  type MapBasemap,
  type NdviArea,
  type NdviProbeOption,
} from "../modules/ndvi";

const GOOGLE_SATELLITE_BASEMAP: MapBasemap = {
  tileUrl: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
  attribution: "&copy; Google Maps",
  maxZoom: 20,
};

export function NdviPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const initialAreaId = searchParams.get("area") ?? undefined;
  const probeParam = searchParams.get("probeId");
  const initialProbeId = probeParam ? Number(probeParam) : undefined;
  const liveMode = import.meta.env.VITE_NDVI_MODE !== "demo";
  const isAdmin = isUserAdmin();

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const [probes, setProbes] = useState<Probe[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [dbAreas, setDbAreas] = useState<NdviArea[]>([]);
  const [mapLayers, setMapLayers] = useState<MapLayer[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getProbes().catch(() => [] as Probe[]),
      getFarms().catch(() => [] as Farm[]),
      getNdviAreas().catch(() => [] as NdviArea[]),
    ]).then(async ([probesData, farmsData, ndviData]) => {
      if (!active) return;
      setProbes(probesData);
      setFarms(farmsData);
      setDbAreas(ndviData);

      if (farmsData.length > 0) {
        const layerLists = await Promise.all(
          farmsData.map((f) => getMapLayers(f.id).catch(() => [] as MapLayer[])),
        );
        if (active) {
          setMapLayers(layerLists.flat());
        }
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const probeOptions = useMemo<NdviProbeOption[]>(() => {
    const farmMap = new Map<number, Farm>(farms.map((f) => [f.id, f]));
    return probes.map((p) => {
      const farm = p.farm_id ? farmMap.get(p.farm_id) : undefined;
      return {
        id: p.id,
        esn: p.esn,
        name: p.name || `Sonda ${p.esn}`,
        farmId: p.farm_id,
        farmName: farm?.name || "Fazenda BR Sense",
        city: farm?.location || p.location || "Brasil",
        crop: p.cultura,
        latitude: p.latitude,
        longitude: p.longitude,
      };
    });
  }, [probes, farms]);

  const api = useMemo(
    () =>
      liveMode
        ? createHttpNdviApi(import.meta.env.VITE_NDVI_API_BASE ?? "/api/ndvi")
        : demoApi,
    [liveMode],
  );

  const handleAreasImported = async (
    imported: NdviArea[],
  ): Promise<NdviArea[]> => {
    if (!isAdmin) {
      throw new Error("Apenas administradores podem desenhar áreas no NDVI.");
    }
    const defaultProbeId = probeOptions[0]?.id;
    const payload = imported.map((item) => {
      const deviceId = item.deviceId ?? defaultProbeId;
      if (!deviceId) {
        throw new Error(
          "Selecione uma sonda válida para vincular a área NDVI.",
        );
      }
      return {
        device_id: deviceId,
        name: item.name,
        type: item.type,
        crop: item.crop,
        hectares: item.hectares,
        geometry: item.geometry,
        source: "desenho" as const,
        circle: item.circle,
      };
    });

    const created = await createNdviAreasBatch(payload);
    setDbAreas((prev) => [...created, ...prev]);
    toast({
      title: "Área NDVI salva no banco!",
      description: `Vinculada à sonda ${created[0]?.deviceName ?? ""}.`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    return created;
  };

  const handleAreaRemoved = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteNdviArea(id);
      setDbAreas((prev) => prev.filter((a) => a.id !== id));
      toast({
        title: "Área NDVI removida",
        status: "info",
        duration: 2500,
        isClosable: true,
      });
    } catch {
      toast({
        title: "Erro ao remover área NDVI",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleAreaUpdated = async (updated: NdviArea): Promise<NdviArea> => {
    if (!isAdmin) {
      throw new Error("Apenas administradores podem editar áreas no NDVI.");
    }
    const saved = await updateNdviArea(updated.id, {
      device_id: updated.deviceId,
      name: updated.name,
      type: updated.type,
      crop: updated.crop,
      hectares: updated.hectares,
      geometry: updated.geometry,
      circle: updated.circle ?? null,
    });
    setDbAreas((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
    toast({
      title: "Área NDVI atualizada!",
      description: `${saved.name} (${saved.deviceName ?? ""})`,
      status: "success",
      duration: 2800,
      isClosable: true,
    });
    return saved;
  };

  return (
    <Box minH="100vh" bg={COLORS.background}>
      <NdviModule
        areas={dbAreas}
        probes={probeOptions}
        mapLayers={mapLayers}
        isAdmin={isAdmin}
        initialAreaId={initialAreaId}
        initialProbeId={
          initialProbeId && Number.isFinite(initialProbeId)
            ? initialProbeId
            : undefined
        }
        mode={liveMode ? "live" : "demo"}
        api={api}
        basemap={GOOGLE_SATELLITE_BASEMAP}
        onAreasImported={isAdmin ? handleAreasImported : undefined}
        onAreaUpdated={isAdmin ? handleAreaUpdated : undefined}
        onAreaRemoved={isAdmin ? handleAreaRemoved : undefined}
        onOpenProbeGraph={(probeId) => navigate(`/dashboard?probeId=${probeId}`)}
      />
    </Box>
  );
}
