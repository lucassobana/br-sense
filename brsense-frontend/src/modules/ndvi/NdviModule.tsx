import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  CloseButton,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Heading,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  Compass,
  ExternalLink,
  Eye,
  FolderPlus,
  GitCompare,
  History,
  Layers,
  MapPin,
  Pencil,
  Pentagon,
  Plus,
  Radio,
  RefreshCw,
  Satellite,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AreaDialog } from "./components/AreaDialog";
import { AreaMap, type MapBasemap } from "./components/AreaMap";
import { DistributionBars, EvolutionChart } from "./components/Charts";
import { ContourEditor } from "./components/ContourEditor";
import type { DrawMode } from "./components/NdviContourTools";
import { createHttpNdviApi } from "./lib/api";
import { demoApi } from "./lib/demo";
import type { ContourBuildResult } from "./shared/contours";
import type { MapLayer } from "../../types";
import type {
  AreaType,
  NdviAnalysis,
  NdviApi,
  NdviArea,
  NdviProbeOption,
  NdviScene,
} from "./shared/types";

export interface NdviModuleProps {
  areas: NdviArea[];
  initialAreaId?: string;
  initialProbeId?: number;
  probes?: NdviProbeOption[];
  mapLayers?: MapLayer[];
  isAdmin?: boolean;
  api?: NdviApi;
  apiBase?: string;
  demoMode?: boolean;
  mode?: "demo" | "live";
  basemap?: MapBasemap;
  onAreasImported?: (areas: NdviArea[]) => Promise<NdviArea[] | void> | void;
  onAreaUpdated?: (area: NdviArea) => Promise<NdviArea | void> | void;
  onAreaRemoved?: (id: string) => Promise<void> | void;
  onOpenProbeGraph?: (probeId: number) => void;
}

type ViewTab = "visao" | "comparar" | "historico" | "areas";
type TypeFilter = "todas" | AreaType;

const dShort = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const dLong = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const vFmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const pFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : vFmt.format(n);
const shortDate = (iso: string) => dShort.format(new Date(iso)).replace(".", "");

export function NdviModule({
  areas,
  initialAreaId,
  initialProbeId,
  probes = [],
  mapLayers = [],
  isAdmin = false,
  api,
  apiBase = "/api/ndvi",
  demoMode = false,
  mode,
  basemap,
  onAreasImported,
  onAreaUpdated,
  onAreaRemoved,
  onOpenProbeGraph,
}: NdviModuleProps) {
  const effectiveMode = mode ?? (demoMode ? "demo" : "live");
  const canMutateAreas = Boolean(isAdmin && onAreasImported);
  const client = useMemo(
    () =>
      api ?? (effectiveMode === "demo" ? demoApi : createHttpNdviApi(apiBase)),
    [api, apiBase, effectiveMode],
  );
  const [selectedId, setSelectedId] = useState(
    initialAreaId ?? areas[0]?.id ?? "",
  );
  const [probeFilterId, setProbeFilterId] = useState<number | "todas">(
    initialProbeId ?? "todas",
  );
  const [selectedProbeId, setSelectedProbeId] = useState<number | undefined>(
    initialProbeId ?? probes[0]?.id,
  );
  const [tab, setTab] = useState<ViewTab>("visao");
  const [filter, setFilter] = useState<TypeFilter>("todas");
  const [query, setQuery] = useState("");
  const [scenes, setScenes] = useState<NdviScene[]>([]);
  const [sceneId, setSceneId] = useState("");
  const [compareId, setCompareId] = useState("");
  const [analyses, setAnalyses] = useState<Record<string, NdviAnalysis>>({});
  const analysesRef = useRef<Record<string, NdviAnalysis>>({});
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<DrawMode>("pivo");
  const [drawnContour, setDrawnContour] = useState<ContourBuildResult | null>(
    null,
  );
  const [refreshTick, setRefreshTick] = useState(0);
  const [editingArea, setEditingArea] = useState<NdviArea | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<AreaType>("pivo");
  const [editCrop, setEditCrop] = useState("");
  const [editDeviceId, setEditDeviceId] = useState<number | undefined>(
    undefined,
  );
  const [editContour, setEditContour] = useState<ContourBuildResult | null>(
    null,
  );
  const [savingEdit, setSavingEdit] = useState(false);
  const [redrawingEdit, setRedrawingEdit] = useState(false);

  useEffect(() => {
    analysesRef.current = analyses;
  }, [analyses]);

  const probesWithDrawnNdvi = useMemo(() => {
    const drawnDeviceIds = new Set(
      areas
        .filter((a) => a.deviceId != null && a.source === "desenho")
        .map((a) => a.deviceId as number),
    );
    return probes.filter((p) => drawnDeviceIds.has(p.id));
  }, [areas, probes]);

  const filtered = useMemo(
    () =>
      areas.filter(
        (a) =>
          (filter === "todas" || a.type === filter) &&
          (probeFilterId === "todas" || a.deviceId === probeFilterId) &&
          `${a.name} ${a.crop} ${a.deviceName ?? ""} ${a.deviceEsn ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [areas, filter, probeFilterId, query],
  );
  const selected =
    filtered.find((a) => a.id === selectedId) ??
    areas.find((a) => a.id === selectedId) ??
    filtered[0] ??
    areas[0];

  const effectiveSelectedProbeId =
    selectedProbeId ?? selected?.deviceId ?? probes[0]?.id;

  useEffect(() => {
    if (!selected) return;
    const ac = new AbortController();
    (async () => {
      await Promise.resolve();
      if (ac.signal.aborted) return;
      setLoadingScenes(true);
      setError("");
      setScenes([]);
      setAnalyses({});
      try {
        const list = await client.listScenes(selected, ac.signal);
        if (ac.signal.aborted) return;
        setScenes(list);
        const firstClean =
          list.find((s) => (s.tileCloudPct ?? 0) <= 35) ?? list[0];
        const secondClean =
          list.find(
            (s) => s.id !== firstClean?.id && (s.tileCloudPct ?? 0) <= 45,
          ) ??
          list[1] ??
          firstClean;
        setSceneId(firstClean?.id ?? "");
        setCompareId(secondClean?.id ?? "");
        setLoadingScenes(false);
        const targets = list.slice(0, 7);
        for (const s of targets) {
          if (ac.signal.aborted) return;
          try {
            const a = await client.analyzeScene(selected, s, ac.signal);
            if (!ac.signal.aborted) {
              setAnalyses((prev) => ({ ...prev, [s.id]: a }));
            }
          } catch {
            // falhas pontuais são tratadas na seleção ativa
          }
        }
      } catch (e: unknown) {
        if (!ac.signal.aborted) {
          setError(
            e instanceof Error
              ? e.message
              : "Não foi possível consultar as passagens.",
          );
          setLoadingScenes(false);
        }
      }
    })();
    return () => ac.abort();
  }, [client, selected, refreshTick]);

  const scene = scenes.find((s) => s.id === sceneId) ?? scenes[0];
  const compareScene =
    scenes.find((s) => s.id === compareId) ?? scenes[1] ?? scene;
  const active = scene ? analyses[scene.id] : undefined;
  const compareAnalysis = compareScene ? analyses[compareScene.id] : undefined;

  useEffect(() => {
    if (!selected) return;
    const ac = new AbortController();
    const needed = [scene, compareScene].filter(
      (s): s is NdviScene => Boolean(s && !analysesRef.current[s.id]),
    );
    if (!needed.length) return;
    Promise.resolve().then(() => {
      if (!ac.signal.aborted) setBusy(true);
    });
    Promise.all(
      needed.map((s) =>
        client
          .analyzeScene(selected, s, ac.signal)
          .then((a) => [s.id, a] as const),
      ),
    )
      .then((entries) => {
        if (!ac.signal.aborted) {
          setAnalyses((prev) => ({
            ...prev,
            ...Object.fromEntries(entries),
          }));
        }
      })
      .catch((e: unknown) => {
        if (!ac.signal.aborted) {
          setError(
            e instanceof Error ? e.message : "Erro ao processar a cena.",
          );
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setBusy(false);
      });
    return () => ac.abort();
  }, [client, compareScene, scene, selected]);

  const series = useMemo(
    () =>
      scenes
        .map((s) => analyses[s.id])
        .filter((a): a is NdviAnalysis => Boolean(a)),
    [analyses, scenes],
  );
  const cleanSeries = useMemo(
    () => series.filter((a) => a.mean !== null),
    [series],
  );
  const previousClean = cleanSeries.find((a) => a.sceneId !== active?.sceneId);
  const delta =
    active?.mean !== null &&
      active?.mean !== undefined &&
      previousClean?.mean !== null &&
      previousClean?.mean !== undefined
      ? active.mean - previousClean.mean
      : null;

  async function handleImport(imported: NdviArea[]) {
    if (!canMutateAreas || !onAreasImported) return;
    const saved = await onAreasImported(imported);
    const first = Array.isArray(saved) && saved[0] ? saved[0] : imported[0];
    if (first) {
      setSelectedId(first.id);
      setTab("visao");
      setNotice(
        `${imported.length === 1 ? "Área salva no banco e vinculada à sonda" : `${imported.length} áreas salvas no banco`} com sucesso.`,
      );
    }
  }

  const startDrawing = (nextMode: DrawMode = "pivo") => {
    if (!canMutateAreas) return;
    setRedrawingEdit(false);
    setDrawMode(nextMode);
    setDrawing(true);
  };

  const openEditArea = (area: NdviArea) => {
    setEditingArea(area);
    setEditName(area.name);
    setEditType(area.type);
    setEditCrop(area.crop);
    setEditDeviceId(area.deviceId ?? probes[0]?.id);
    setEditContour(null);
  };

  async function handleSaveEdit() {
    if (!editingArea || !onAreaUpdated) return;
    if (!editName.trim()) {
      setError("Informe um nome válido para a área NDVI.");
      return;
    }
    setSavingEdit(true);
    try {
      const targetProbe = probes.find((p) => p.id === editDeviceId);
      const updatedPayload: NdviArea = {
        ...editingArea,
        name: editName.trim(),
        type: editContour ? editContour.type : editType,
        crop: editCrop.trim() || "Monitoramento Satelital",
        deviceId: editDeviceId,
        deviceName: targetProbe?.name ?? editingArea.deviceName,
        deviceEsn: targetProbe?.esn ?? editingArea.deviceEsn,
        hectares: editContour ? editContour.hectares : editingArea.hectares,
        geometry: editContour ? editContour.geometry : editingArea.geometry,
        circle: editContour
          ? editContour.center && editContour.edge && editContour.radiusM
            ? {
                center: editContour.center,
                edge: editContour.edge,
                radiusM: editContour.radiusM,
              }
            : undefined
          : editingArea.circle,
      };
      await onAreaUpdated(updatedPayload);
      setEditingArea(null);
      setEditContour(null);
      setNotice("Área NDVI atualizada com sucesso.");
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar as alterações da área.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <Box
      as="section"
      aria-label="Módulo Imagens NDVI"
      bg="#081927"
      color="#e7f1f7"
      minH="100vh"
      px={{ base: 3, sm: 4, md: 6, xl: 8 }}
      pt={{ base: 4, md: 7 }}
      pb={{ base: 6, md: 8 }}
    >
      <Flex
        justify="space-between"
        align={{ base: "stretch", lg: "center" }}
        direction={{ base: "column", lg: "row" }}
        gap={{ base: 3, lg: 4 }}
        mb={{ base: 4, md: 6 }}
      >
        <Box>
          <HStack spacing={1.5} color="#6d9aba" fontSize="10px" fontWeight="600" letterSpacing="1.7px">
            <Satellite size={13} />
            <Text as="span">MONITORAMENTO DE VIGOR VEGETATIVO</Text>
          </HStack>
          <Heading as="h1" size={{ base: "md", md: "lg" }} color="#fff">
            <Text as="span" color="#279ff7" fontWeight="bold">
              ·
            </Text>{" "}
            Imagens NDVI
          </Heading>
        </Box>
        <HStack
          spacing={2}
          flexWrap="wrap"
          w={{ base: "100%", lg: "auto" }}
        >
          {areas.length > 0 && (
            <Button
              variant={tab === "areas" ? "solid" : "outline"}
              colorScheme={tab === "areas" ? "blue" : undefined}
              size={{ base: "xs", sm: "sm" }}
              h={{ base: "32px", sm: "34px" }}
              flex={{ base: "1 1 auto", sm: "0 0 auto" }}
              borderRadius="lg"
              borderColor="#2d5a7b"
              color={tab === "areas" ? "#fff" : "#cbe3f3"}
              bg={tab === "areas" ? "#2b6cb0" : "#102737"}
              _hover={{ bg: tab === "areas" ? "#2c5282" : "#16354d" }}
              leftIcon={<Layers size={14} />}
              onClick={() => setTab(tab === "areas" ? "visao" : "areas")}
            >
              <HStack spacing={2} align="center">
                <Text as="span">
                  {canMutateAreas ? "Gerenciar NDVI" : "Áreas vinculadas"}
                </Text>
                <Badge
                  colorScheme="blue"
                  variant="solid"
                  borderRadius="full"
                  px={2}
                  fontSize="10px"
                >
                  {areas.length}
                </Badge>
              </HStack>
            </Button>
          )}
          {canMutateAreas && (
            <Button
              variant="outline"
              size={{ base: "xs", sm: "sm" }}
              h={{ base: "32px", sm: "34px" }}
              flex={{ base: "1 1 auto", sm: "0 0 auto" }}
              borderRadius="lg"
              leftIcon={<Compass size={14} />}
              onClick={() => startDrawing("pivo")}
            >
              Desenhar área
            </Button>
          )}
          <Button
            colorScheme="blue"
            size={{ base: "xs", sm: "sm" }}
            h={{ base: "32px", sm: "34px" }}
            flex={{ base: "1 1 auto", sm: "0 0 auto" }}
            borderRadius="lg"
            isLoading={busy || loadingScenes}
            leftIcon={<RefreshCw size={14} />}
            onClick={() => setRefreshTick((v) => v + 1)}
          >
            Atualizar imagens
          </Button>
        </HStack>
      </Flex>

      {notice && (
        <Alert
          status="success"
          className="inline-alert"
          role="status"
          bg="rgba(46, 168, 75, 0.14)"
          color="#b7f5c8"
          borderRadius="lg"
          mb={3}
          py={2}
          px={3}
        >
          <HStack spacing={2} flex="1">
            <Check size={15} />
            <Text fontSize="sm">{notice}</Text>
          </HStack>
          <CloseButton
            size="sm"
            aria-label="Fechar aviso"
            onClick={() => setNotice("")}
          />
        </Alert>
      )}
      {error && (
        <Alert
          status="error"
          className="inline-alert error"
          role="alert"
          bg="rgba(229, 62, 62, 0.16)"
          color="#feb2b2"
          borderRadius="lg"
          mb={3}
          py={2}
          px={3}
        >
          <HStack spacing={2} flex="1">
            <AlertTriangle size={15} />
            <Text fontSize="sm">{error}</Text>
          </HStack>
          <CloseButton
            size="sm"
            aria-label="Fechar erro"
            onClick={() => setError("")}
          />
        </Alert>
      )}

      <Grid
        className="module-layout"
        gridTemplateColumns={{
          base: "minmax(0, 1fr)",
          lg: "220px minmax(0, 1fr)",
          xl: "240px minmax(0, 1fr)",
        }}
        gap={{ base: 4, lg: 6 }}
        alignItems="start"
      >
        <Box
          as="aside"
          aria-label="Seleção de áreas"
          display="flex"
          flexDirection="column"
          w="100%"
          p={{ base: 3, md: 4 }}
          bg="#0e2333"
          border="1px solid"
          borderColor="#203a4c"
          borderRadius="xl"
        >
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 1 }} spacing={3}>
            <Box>
              <Text fontSize="10px" letterSpacing="1.5px" color="#69899f" fontWeight="600" mb={1.5} display="block">
                PROPRIEDADE
              </Text>
              <Flex
                align="center"
                gap={2.5}
                pb={{ base: 2, lg: 3 }}
                borderBottom="1px solid"
                borderColor="#233b4b"
              >
                <Flex
                  as="span"
                  w="33px"
                  h="33px"
                  borderRadius="md"
                  bg="#173a3a"
                  color="#8fc3b0"
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <MapPin size={15} />
                </Flex>
                <Box flex="1" minW={0}>
                  <Text as="strong" display="block" fontSize="12px" fontWeight="600" color="#fff" noOfLines={1}>
                    {selected?.farmName ?? "Fazenda BR Sense"}
                  </Text>
                  <Text as="span" display="block" fontSize="11px" color="#809cab" noOfLines={1}>
                    {selected?.city ?? "Brasil"}
                  </Text>
                </Box>
                <ChevronDown size={15} color="#647f91" />
              </Flex>
            </Box>

            <Box my={{ base: 0, lg: 1 }}>
              <Text fontSize="10px" letterSpacing="1.5px" color="#69899f" fontWeight="600" mb={1.5} display="block">
                FILTRAR POR SONDA
              </Text>
              <Select
                size="sm"
                bg="#0b1f30"
                borderColor="#234057"
                borderRadius="md"
                color="#dcecf7"
                value={
                  probeFilterId === "todas" ? "todas" : String(probeFilterId)
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "todas") {
                    setProbeFilterId("todas");
                  } else {
                    const num = Number(val);
                    setProbeFilterId(num);
                    setSelectedProbeId(num);
                    const match = areas.find((a) => a.deviceId === num);
                    if (match) setSelectedId(match.id);
                  }
                }}
              >
                <option value="todas">
                  Todas as sondas ({probesWithDrawnNdvi.length})
                </option>
                {probesWithDrawnNdvi.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.esn})
                  </option>
                ))}
              </Select>
            </Box>
          </SimpleGrid>

          <InputGroup size="sm" mt={3}>
            <InputLeftElement
              pointerEvents="none"
              h="34px"
              w="34px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="#789bb3"
            >
              <Search size={14} />
            </InputLeftElement>
            <Input
              pl="34px"
              pr={3}
              h="34px"
              bg="#0c1528"
              border="1px solid"
              borderColor="#2c3b54"
              borderRadius="6px"
              color="#eef6fb"
              fontSize="xs"
              _placeholder={{ color: "#8fa5b8" }}
              _focus={{ borderColor: "#4fb8ff", boxShadow: "none" }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pivô, talhão ou sonda…"
              aria-label="Buscar pivô, talhão ou sonda"
            />
          </InputGroup>

          <SimpleGrid
            columns={3}
            spacing={1}
            className="type-filters"
            role="tablist"
            aria-label="Filtrar tipo de área"
          >
            {(
              [
                ["todas", "Todas"],
                ["pivo", "Pivôs"],
                ["talhao", "Talhões"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                size="xs"
                variant="unstyled"
                display="flex"
                alignItems="center"
                justifyContent="center"
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label}
              </Button>
            ))}
          </SimpleGrid>

          <Flex
            className="area-list"
            role="listbox"
            aria-label="Áreas monitoradas"
            direction={{ base: "row", lg: "column" }}
            align="stretch"
            gap={2}
            overflowX={{ base: "auto", lg: "visible" }}
            pb={{ base: 1, lg: 0 }}
            sx={{
              "&::-webkit-scrollbar": { height: "4px" },
              "&::-webkit-scrollbar-thumb": {
                background: "#2d4a63",
                borderRadius: "4px",
              },
            }}
          >
            {filtered.map((a) => {
              const isSelected = a.id === selected?.id;
              const current =
                isSelected && active
                  ? active.mean
                  : analyses[scenes[0]?.id]?.mean;
              return (
                <Box
                  as="button"
                  key={a.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  textAlign="left"
                  minW={{ base: "210px", lg: "0" }}
                  w="100%"
                  flexShrink={0}
                  display="flex"
                  alignItems="center"
                  gap={2.5}
                  p={2.5}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={isSelected ? "#2a6796" : "transparent"}
                  bg={isSelected ? "#14354e" : "transparent"}
                  _hover={{ bg: isSelected ? "#14354e" : "#132e42" }}
                  transition="all 0.15s ease"
                  onClick={() => {
                    setSelectedId(a.id);
                    if (a.deviceId) setSelectedProbeId(a.deviceId);
                    setDrawing(false);
                  }}
                >
                  <Flex
                    w="35px"
                    h="35px"
                    flexShrink={0}
                    align="center"
                    justify="center"
                    borderRadius={a.type === "pivo" ? "full" : "md"}
                    border="1px solid"
                    borderColor={a.type === "pivo" ? "#3a7586" : "#315c61"}
                    bg={
                      a.type === "pivo"
                        ? "radial-gradient(circle, #8ba944 1%, #719f3d 35%, #4a7a38 65%, #294b3e 100%)"
                        : "#183a34"
                    }
                    boxShadow={a.type === "pivo" ? "inset 0 0 0 4px #254a37" : "none"}
                    color={a.type === "pivo" ? "#5d9fce" : "#72b5a2"}
                  >
                    {a.type === "pivo" ? (
                      <Box as="span" w="14px" h="1px" bg="#a0b7aa" transform="rotate(-40deg)" />
                    ) : (
                      <Pentagon size={15} />
                    )}
                  </Flex>
                  <Box flex="1" minW="0">
                    <Text as="strong" display="block" fontSize="xs" fontWeight="600" color="#d9e9f3" noOfLines={1}>
                      {a.name}
                    </Text>
                    <Text as="span" display="block" fontSize="11px" color="#97adbb" noOfLines={1}>
                      {a.hectares.toFixed(1).replace(".", ",")} ha · {a.crop}
                    </Text>
                    <Text as="small" display="block !important" fontSize="10px" color={isSelected ? "#6ab8f0" : "#668da7"} noOfLines={1}>
                      {a.deviceName
                        ? `Sonda: ${a.deviceName}${isSelected && active ? ` · NDVI ${fmt(current)}` : ""}`
                        : isSelected && active
                          ? `NDVI ${fmt(current)}`
                          : a.source === "desenho"
                            ? "Desenhado no mapa"
                            : "Monitorado"}
                    </Text>
                  </Box>
                  {isSelected && (
                    <Box as="span" flexShrink={0} color="#58aff3">
                      <Check size={14} />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Flex>

          {canMutateAreas && (
            <Button
              type="button"
              size="sm"
              w="100%"
              mt={3}
              h="36px"
              px={3}
              variant="outline"
              borderStyle="dashed"
              borderColor="#406080"
              color="#cde6ff"
              bg="transparent"
              fontSize="xs"
              fontWeight="medium"
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              _hover={{ bg: "whiteAlpha.100", borderColor: "#63b3ed" }}
              onClick={() => startDrawing("pivo")}
            >
              <HStack spacing={2} align="center">
                <FolderPlus size={15} />
                <Text as="span" lineHeight="1">
                  Desenhar nova área
                </Text>
              </HStack>
              <Plus size={14} />
            </Button>
          )}
        </Box>

        <Box className="workspace" minW={0} w="100%">
          {selected ? (
            <>
              <Flex
                className="workspace-heading"
                justify="space-between"
                align={{ base: "stretch", md: "center" }}
                direction={{ base: "column", md: "row" }}
                gap={3}
              >
                <Box>
                  <HStack className="breadcrumb" spacing={1.5} flexWrap="wrap">
                    <Text as="span">{selected.farmName}</Text>
                    <Text as="span">/</Text>
                    <Text as="span">{selected.name}</Text>
                    {selected.deviceName && (
                      <>
                        <Text as="span">·</Text>
                        <Text as="strong" color="#63b3ed">
                          Sonda: {selected.deviceName}
                          {selected.deviceEsn ? ` (${selected.deviceEsn})` : ""}
                        </Text>
                      </>
                    )}
                  </HStack>
                  <Heading as="h2" size={{ base: "sm", md: "md" }} flexWrap="wrap">
                    {selected.name}{" "}
                    <Text as="span">
                      {selected.type === "pivo" ? "Pivô Central" : "Talhão"}
                    </Text>
                  </Heading>
                </Box>
                <HStack spacing={2} flexWrap="wrap">
                  {selected.deviceId && onOpenProbeGraph && (
                    <Button
                      variant="outline"
                      size="xs"
                      h="30px"
                      px={3}
                      flex={{ base: "1 1 auto", sm: "0 0 auto" }}
                      borderRadius="lg"
                      borderColor="#2d5a7b"
                      color="#90cdf4"
                      _hover={{ bg: "whiteAlpha.100" }}
                      leftIcon={<Radio size={13} />}
                      onClick={() => onOpenProbeGraph(selected.deviceId!)}
                    >
                      Ver gráfico da sonda
                    </Button>
                  )}
                  {canMutateAreas && onAreaUpdated && (
                    <Button
                      variant="outline"
                      size="xs"
                      h="30px"
                      px={3}
                      flex={{ base: "1 1 auto", sm: "0 0 auto" }}
                      borderRadius="lg"
                      borderColor="#2d5a7b"
                      color="#cbe3f3"
                      _hover={{ bg: "whiteAlpha.100" }}
                      leftIcon={<Pencil size={13} />}
                      onClick={() => openEditArea(selected)}
                    >
                      Editar área
                    </Button>
                  )}
                  <Button
                    variant={tab === "areas" ? "solid" : "outline"}
                    colorScheme={tab === "areas" ? "blue" : undefined}
                    size="xs"
                    h="30px"
                    px={3}
                    flex={{ base: "1 1 auto", sm: "0 0 auto" }}
                    borderRadius="lg"
                    borderColor="#2d5a7b"
                    color={tab === "areas" ? "#fff" : "#90cdf4"}
                    _hover={{
                      bg: tab === "areas" ? "#2b6cb0" : "whiteAlpha.100",
                    }}
                    leftIcon={
                      tab === "areas" ? (
                        <ArrowLeft size={13} />
                      ) : (
                        <Layers size={13} />
                      )
                    }
                    onClick={() => setTab(tab === "areas" ? "visao" : "areas")}
                  >
                    {tab === "areas"
                      ? "Voltar ao mapa"
                      : canMutateAreas
                        ? "Gerenciar áreas"
                        : "Ver áreas vinculadas"}
                  </Button>
                </HStack>
              </Flex>

              <HStack
                className="view-tabs"
                role="tablist"
                aria-label="Visualizações do NDVI"
                spacing={{ base: 4, sm: 6, md: 8 }}
                mb={{ base: 4, md: 6 }}
                overflowX="auto"
                flexWrap="nowrap"
                sx={{
                  "&::-webkit-scrollbar": { height: "2px" },
                }}
              >
                {(
                  [
                    ["visao", "Visão da área", Eye],
                    ["comparar", "Comparar datas", GitCompare],
                    ["historico", "Histórico", History],
                  ] as const
                ).map(([id, label, IconComp]) => (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant="unstyled"
                    display="inline-flex"
                    alignItems="center"
                    flexShrink={0}
                    gap={2}
                    px={1}
                    pb={3}
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                  >
                    <IconComp size={15} />
                    <Text as="span">{label}</Text>
                  </Button>
                ))}
              </HStack>

              {tab === "visao" && (
                <>
                  <SimpleGrid
                    columns={{ base: 2, lg: 4 }}
                    spacing={{ base: 2.5, md: 3 }}
                  >
                    <Box
                      as="article"
                      bg="#0e2536"
                      border="1px solid"
                      borderColor="#233e50"
                      borderRadius="lg"
                      p={{ base: 2.5, md: 3.5 }}
                    >
                      <HStack as="span" spacing={1.5} color="#88a4b8" fontSize="11px">
                        <Sparkles size={14} color="#5e91b7" />
                        <Text as="span">NDVI médio da área</Text>
                      </HStack>
                      <Text
                        as="strong"
                        display="block"
                        color="#eff8fe"
                        fontWeight="600"
                        fontSize={{ base: "22px", sm: "26px", md: "30px" }}
                        lineHeight="1.5"
                      >
                        {fmt(active?.mean)}{" "}
                        <Text as="em" fontStyle="normal" color="#789aae" fontSize={{ base: "12px", md: "15px" }}>
                          {active?.mean && active.mean >= 0.65
                            ? "Vigor alto"
                            : active?.mean && active.mean >= 0.45
                              ? "Moderado"
                              : "Em atenção"}
                        </Text>
                      </Text>
                      <Text as="small" color="#79b89e" fontSize="10px">
                        {delta !== null
                          ? `${delta >= 0 ? "+" : ""}${vFmt.format(delta)} vs. última leitura`
                          : "Selecione passagens para comparar"}
                      </Text>
                    </Box>

                    <Box
                      as="article"
                      bg="#0e2536"
                      border="1px solid"
                      borderColor="#233e50"
                      borderRadius="lg"
                      p={{ base: 2.5, md: 3.5 }}
                    >
                      <HStack as="span" spacing={1.5} color="#88a4b8" fontSize="11px">
                        <Cloud size={14} color="#5e91b7" />
                        <Text as="span">Área útil sem nuvens</Text>
                      </HStack>
                      <Text
                        as="strong"
                        display="block"
                        color="#eff8fe"
                        fontWeight="600"
                        fontSize={{ base: "22px", sm: "26px", md: "30px" }}
                        lineHeight="1.5"
                      >
                        {active ? `${pFmt.format(active.validPct)}%` : "—"}{" "}
                        <Text as="em" fontStyle="normal" color="#789aae" fontSize={{ base: "12px", md: "15px" }}>
                          {active
                            ? `${pFmt.format(100 - active.validPct)}% nuvens`
                            : ""}
                        </Text>
                      </Text>
                      <Text
                        as="small"
                        fontSize="10px"
                        color={
                          active?.quality === "utilizavel"
                            ? "#79b89e"
                            : "#d1b77a"
                        }
                      >
                        <Box as="span" w="6px" h="6px" borderRadius="full" bg="#68b9a4" display="inline-block" mr={1.5} />
                        {active?.quality === "utilizavel"
                          ? "Cena utilizável para decisão"
                          : active?.quality === "parcial"
                            ? "Leitura parcial — atenção"
                            : "Cobertura insuficiente"}
                      </Text>
                    </Box>

                    <Box
                      as="article"
                      bg="#0e2536"
                      border="1px solid"
                      borderColor="#233e50"
                      borderRadius="lg"
                      p={{ base: 2.5, md: 3.5 }}
                    >
                      <HStack as="span" spacing={1.5} color="#88a4b8" fontSize="11px">
                        <Calendar size={14} color="#5e91b7" />
                        <Text as="span">Data da imagem</Text>
                      </HStack>
                      <Text
                        as="strong"
                        display="block"
                        color="#eff8fe"
                        fontWeight="600"
                        fontSize={{ base: "20px", sm: "24px", md: "27px" }}
                        lineHeight="1.5"
                      >
                        {scene ? shortDate(scene.acquiredAt) : "—"}{" "}
                        <Text as="em" fontStyle="normal" color="#789aae">{scene?.acquiredAt.slice(0, 4)}</Text>
                      </Text>
                      <Text as="small" fontSize="10px" color="#7896a9">
                        <Box as="span" w="6px" h="6px" borderRadius="full" bg="#60c48a" display="inline-block" mr={1.5} />
                        Passagem 10:24 BRT
                      </Text>
                    </Box>

                    <Box
                      as="article"
                      bg="#0e2536"
                      border="1px solid"
                      borderColor="#233e50"
                      borderRadius="lg"
                      display="block !important"
                      p={{ base: 2.5, md: 3.5 }}
                    >
                      <HStack as="span" spacing={1.5} color="#88a4b8" fontSize="11px">
                        <Layers size={14} color="#5e91b7" />
                        <Text as="span">Área monitorada</Text>
                      </HStack>
                      <Text
                        as="strong"
                        display="block"
                        color="#eff8fe"
                        fontWeight="600"
                        fontSize={{ base: "22px", sm: "26px", md: "30px" }}
                        lineHeight="1.5"
                      >
                        {selected.hectares.toFixed(1).replace(".", ",")}{" "}
                        <Text as="em" fontStyle="normal" color="#789aae" fontSize={{ base: "12px", md: "15px" }}>
                          ha
                        </Text>
                      </Text>
                      <Text as="small" fontSize="10px" color="#7896a9">
                        Resolução 10 m ·{" "}
                        {active
                          ? `${active.validPixels.toLocaleString("pt-BR")} px`
                          : "recorte pelo polígono"}
                      </Text>
                    </Box>
                  </SimpleGrid>

                  <Grid
                    className="map-content-grid"
                    gridTemplateColumns={{
                      base: "minmax(0, 1fr)",
                      xl: "minmax(0, 1fr) 235px",
                    }}
                    gap={{ base: 4, md: 5 }}
                  >
                    <Box minW={0}>
                      <Box position="relative" border="1px solid" borderColor="#294556" borderRadius="lg" overflow="hidden">
                        <AreaMap
                          areas={areas}
                          selected={selected}
                          analysis={active}
                          probes={probes}
                          mapLayers={mapLayers}
                          activeProbeId={selected.deviceId}
                          onSelect={setSelectedId}
                          basemap={basemap}
                        />
                        {busy && (
                          <HStack
                            position="absolute"
                            left="15px"
                            bottom="32px"
                            zIndex={600}
                            bg="rgba(16, 45, 66, 0.9)"
                            border="1px solid #30546b"
                            borderRadius="md"
                            py={2}
                            px={3}
                            spacing={2}
                            color="#a2cee8"
                            fontSize="xs"
                          >
                            <Spinner size="xs" />
                            <Text as="span">
                              Processando recorte em 10 metros…
                            </Text>
                          </HStack>
                        )}
                      </Box>

                      <Flex
                        aria-label="Legenda de vigor NDVI"
                        align="center"
                        flexWrap="wrap"
                        gap={2}
                        py={3}
                        px={1}
                        color="#90a8b8"
                        fontSize="xs"
                      >
                        <Text as="span">Solo exposto / falha</Text>
                        <Box flex="1" minW="120px">
                          <Box
                            h="6px"
                            borderRadius="full"
                            bg="linear-gradient(to right, #436784 0%, #b85b3f 50%, #db944a 60%, #e7d067 70%, #a2c847 80%, #42a336 90%, #187037 100%)"
                          />
                          <Flex justify="space-between" fontSize="10px" color="#90a8b8" mt={1}>
                            <Text as="span">0,10</Text>
                            <Text as="span">0,30</Text>
                            <Text as="span">0,50</Text>
                            <Text as="span">0,70</Text>
                            <Text as="span">0,85+</Text>
                          </Flex>
                        </Box>
                        <Text as="span">Vigor vegetativo alto</Text>
                        <HStack as="span" spacing={1.5} color="#6e8c9e" fontSize="10px" ml={{ base: 0, sm: "auto" }}>
                          <Box as="i" w="8px" h="8px" bg="#a9b8c0" borderRadius="sm" display="inline-block" />
                          <Text as="span">Máscara de nuvem</Text>
                        </HStack>
                      </Flex>

                      <Flex
                        justify="space-between"
                        align={{ base: "flex-start", sm: "center" }}
                        direction={{ base: "column", sm: "row" }}
                        gap={1}
                        flexWrap="wrap"
                        my={2}
                        color="#a2bdcf"
                        fontSize="xs"
                      >
                        <HStack as="span" spacing={1.5}>
                          <Calendar size={14} />
                          <Text as="span">
                            Passagens disponíveis{" "}
                            <Text as="strong">({scenes.length})</Text>
                          </Text>
                        </HStack>
                        <Text as="span">
                          Toque em uma data para atualizar o mapa
                        </Text>
                      </Flex>

                      <Box
                        role="listbox"
                        aria-label="Datas das imagens"
                        display={{ base: "flex", md: "grid" }}
                        gridTemplateColumns={{
                          md: "repeat(7, minmax(0, 1fr))",
                        }}
                        gap={2}
                        overflowX={{ base: "auto", md: "visible" }}
                        pb={{ base: 1, md: 0 }}
                        sx={{
                          "&::-webkit-scrollbar": { height: "4px" },
                          "&::-webkit-scrollbar-thumb": {
                            background: "#2d4a63",
                            borderRadius: "4px",
                          },
                        }}
                      >
                        {scenes.slice(0, 7).map((s) => {
                          const a = analyses[s.id];
                          const isSelected = s.id === scene?.id;
                          const cloudy =
                            (a ? 100 - a.validPct : (s.tileCloudPct ?? 0)) > 45;
                          return (
                            <Box
                              as="button"
                              key={s.id}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              minW={{ base: "105px", md: "0" }}
                              flexShrink={0}
                              textAlign="left"
                              p={1.5}
                              bg={isSelected ? "#153c56" : "#102939"}
                              border="1px solid"
                              borderColor={isSelected ? "#2b9fff" : "#213f50"}
                              borderRadius="md"
                              _hover={{ bg: isSelected ? "#194665" : "#143347" }}
                              onClick={() => setSceneId(s.id)}
                            >
                              <Box
                                h="50px"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                bg="#213d2b"
                                position="relative"
                                borderRadius="sm"
                                overflow="hidden"
                              >
                                {a?.pngUrl && (
                                  <Image
                                    src={a.pngUrl}
                                    alt=""
                                    w="100%"
                                    h="100%"
                                    objectFit="contain"
                                    opacity={cloudy ? 0.45 : 1}
                                    filter={cloudy ? "saturate(0.3)" : "none"}
                                  />
                                )}
                                <Box
                                  as="span"
                                  position="absolute"
                                  bottom="3px"
                                  right="3px"
                                  bg={cloudy ? "rgba(36, 52, 62, 0.8)" : "rgba(20, 49, 36, 0.75)"}
                                  borderRadius="full"
                                  w="14px"
                                  h="14px"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  color={cloudy ? "#c0c8ca" : "#aff0bd"}
                                >
                                  {cloudy ? (
                                    <Cloud size={10} />
                                  ) : (
                                    <Check size={10} />
                                  )}
                                </Box>
                              </Box>
                              <Text as="strong" display="block" fontSize="11px" color="#c3d9e7" mt={1} fontWeight="600">
                                {shortDate(s.acquiredAt)}
                              </Text>
                              <Text as="small" display="block" fontSize="10px" color={isSelected ? "#77c0f5" : "#6f95ae"} mt={0.5}>
                                {a?.mean !== null && a?.mean !== undefined
                                  ? `NDVI ${fmt(a.mean)}`
                                  : cloudy
                                    ? "Nuvens"
                                    : "Carregar"}
                              </Text>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>

                    <Box
                      as="aside"
                      aria-label="Distribuição do vigor"
                      display="flex !important"
                      flexDirection="column"
                      p={{ base: 3.5, md: 4 }}
                      bg="#0e2536"
                      border="1px solid"
                      borderColor="#223e50"
                      borderRadius="xl"
                    >
                      <Flex align="center" gap={2} mb={2}>
                        <Box as="span" w="3px" h="12px" borderRadius="sm" bg="#2b9ff9" />
                        <Heading as="h3" size="sm" flex="1" color="#fff">
                          Distribuição na área
                        </Heading>
                        <Badge variant="subtle" colorScheme="blue" borderRadius="md" px={2} py={0.5} fontSize="10px">
                          {scene ? shortDate(scene.acquiredAt) : "—"}
                        </Badge>
                      </Flex>
                      <DistributionBars bins={active?.histogram ?? []} />
                      <Divider
                        className="analysis-divider"
                        display="block !important"
                        borderColor="#1d3548"
                        my={3.5}
                      />
                      <VStack className="area-meta" align="stretch" spacing={2} mt={0}>
                        <Flex justify="space-between" gap={2}>
                          <Text as="span">Sonda vinculada</Text>
                          <Text as="strong" textAlign="right">
                            {selected.deviceName
                              ? `${selected.deviceName}${selected.deviceEsn ? ` (${selected.deviceEsn})` : ""}`
                              : "Não vinculada"}
                          </Text>
                        </Flex>
                        <Flex justify="space-between" gap={2}>
                          <Text as="span">Cultura / estádio</Text>
                          <Text as="strong" textAlign="right">
                            {selected.crop}
                          </Text>
                        </Flex>
                        <Flex justify="space-between" gap={2}>
                          <Text as="span">Mín / Máx na área</Text>
                          <Text as="strong" textAlign="right">
                            {fmt(active?.min)} – {fmt(active?.max)}
                          </Text>
                        </Flex>
                        <Flex justify="space-between" gap={2}>
                          <Text as="span">Contorno</Text>
                          <Text as="strong" textAlign="right">
                            {selected.circle
                              ? `Círculo · raio ${selected.circle.radiusM} m`
                              : selected.source === "desenho"
                                ? "Polígono desenhado"
                                : "Cadastro BR Sense"}
                          </Text>
                        </Flex>
                      </VStack>
                      <Button
                        variant="outline"
                        size="xs"
                        mt={4}
                        h="32px"
                        className="comparison-button"
                        rightIcon={<ChevronRight size={14} />}
                        onClick={() => setTab("comparar")}
                      >
                        Comparar com outra passagem
                      </Button>
                    </Box>
                  </Grid>

                  <Box
                    className="evolution-panel"
                    p={{ base: 3.5, md: 5 }}
                    bg="#111e35"
                    border="1px solid"
                    borderColor="#2b3c57"
                    borderRadius="2xl"
                  >
                    <Flex
                      className="section-title"
                      justify="space-between"
                      align={{ base: "flex-start", sm: "center" }}
                      direction={{ base: "column", sm: "row" }}
                      gap={2}
                    >
                      <Box>
                        <Heading as="h3" size="sm">
                          Evolução do NDVI médio · últimas passagens
                        </Heading>
                        <Text>
                          Série temporal calculada apenas com pixels válidos
                          dentro do polígono da área.
                        </Text>
                      </Box>
                      <Button
                        variant="link"
                        size="xs"
                        color="#7cc4fa"
                        rightIcon={<ExternalLink size={13} />}
                        onClick={() => setTab("historico")}
                      >
                        Ver tabela completa
                      </Button>
                    </Flex>
                    <EvolutionChart
                      series={series}
                      selectedSceneId={scene?.id}
                      onSelect={setSceneId}
                    />
                  </Box>
                </>
              )}

              {tab === "comparar" && (
                <Box className="compare-view">
                  <Flex
                    className="section-title"
                    justify="space-between"
                    align="center"
                  >
                    <Box>
                      <Heading as="h3" size="sm">
                        Comparar duas passagens
                      </Heading>
                      <Text>
                        Visualize a evolução do vigor ou a recuperação após
                        ajuste de lâmina no pivô.
                      </Text>
                    </Box>
                  </Flex>
                  <SimpleGrid
                    className="compare-grid"
                    columns={{ base: 1, lg: 2 }}
                    spacing={{ base: 3.5, md: 5 }}
                  >
                    {(
                      [
                        [scene, active, setSceneId, "Passagem principal"],
                        [
                          compareScene,
                          compareAnalysis,
                          setCompareId,
                          "Passagem de referência",
                        ],
                      ] as const
                    ).map(([sc, an, setter, label], idx) => (
                      <VStack
                        key={idx}
                        className="compare-column"
                        align="stretch"
                        spacing={3}
                        p={{ base: 3, md: 4 }}
                        bg="#111e35"
                        border="1px solid"
                        borderColor="#2b3c57"
                        borderRadius="2xl"
                      >
                        <Text
                          as="label"
                          fontSize="xs"
                          fontWeight="semibold"
                          color="#a8c7df"
                        >
                          {label}
                        </Text>
                        <Select
                          size="sm"
                          bg="#0c1829"
                          borderColor="#2c4e66"
                          borderRadius="lg"
                          color="#cbe3f3"
                          value={sc?.id ?? ""}
                          onChange={(e) => setter(e.target.value)}
                        >
                          {scenes.map((s) => (
                            <option key={s.id} value={s.id}>
                              {dLong.format(new Date(s.acquiredAt))}
                            </option>
                          ))}
                        </Select>
                        <Box
                          borderRadius="xl"
                          overflow="hidden"
                          border="1px solid"
                          borderColor="#284554"
                        >
                          <AreaMap
                            areas={[selected]}
                            selected={selected}
                            analysis={an}
                            onSelect={() => {}}
                            basemap={basemap}
                            compact
                          />
                        </Box>
                        <SimpleGrid
                          className="compare-values"
                          columns={3}
                          spacing={2}
                          pt={1}
                        >
                          <Box>
                            <Text as="span" fontSize="11px" color="#88a6bd">
                              NDVI médio
                            </Text>
                            <Text
                              as="strong"
                              display="block"
                              fontSize={{ base: "lg", md: "xl" }}
                              color="#e5f3fb"
                            >
                              {fmt(an?.mean)}
                            </Text>
                          </Box>
                          <Box>
                            <Text as="span" fontSize="11px" color="#88a6bd">
                              Área útil
                            </Text>
                            <Text
                              as="strong"
                              display="block"
                              fontSize={{ base: "lg", md: "xl" }}
                              color="#e5f3fb"
                            >
                              {an ? `${pFmt.format(an.validPct)}%` : "—"}
                            </Text>
                          </Box>
                          <Box>
                            <Text as="span" fontSize="11px" color="#88a6bd">
                              Faixa
                            </Text>
                            <Text
                              as="strong"
                              display="block"
                              fontSize={{ base: "sm", md: "lg" }}
                              color="#e5f3fb"
                            >
                              {fmt(an?.min)} – {fmt(an?.max)}
                            </Text>
                          </Box>
                        </SimpleGrid>
                      </VStack>
                    ))}
                  </SimpleGrid>
                  <HStack
                    className="comparison-insight"
                    spacing={3}
                    align="start"
                    borderRadius="xl"
                    p={{ base: 3.5, md: 4 }}
                  >
                    <GitCompare size={18} />
                    <Box>
                      <Text as="strong" display="block">
                        Diferença entre as passagens selecionadas
                      </Text>
                      <Text>
                        {active?.mean != null && compareAnalysis?.mean != null
                          ? `Variação de ${active.mean - compareAnalysis.mean >= 0 ? "+" : ""}${vFmt.format(active.mean - compareAnalysis.mean)} no NDVI médio de ${selected.name}.`
                          : "Escolha duas cenas com área útil suficiente para calcular a variação."}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
              )}

              {tab === "historico" && (
                <Box
                  className="history-view"
                  p={{ base: 3, md: 5 }}
                  bg="#111e35"
                  border="1px solid"
                  borderColor="#2b3c57"
                  borderRadius="2xl"
                >
                  <Flex
                    className="section-title"
                    justify="space-between"
                    align="center"
                  >
                    <Box>
                      <Heading as="h3" size="sm">
                        Histórico de passagens · {selected.name}
                      </Heading>
                    </Box>
                  </Flex>
                  <Box
                    p={{ base: 2, md: 3 }}
                    mb={4}
                    bg="#0c1829"
                    border="1px solid"
                    borderColor="#1f384b"
                    borderRadius="xl"
                  >
                    <EvolutionChart
                      series={series}
                      selectedSceneId={scene?.id}
                      onSelect={(id) => {
                        setSceneId(id);
                        setTab("visao");
                      }}
                    />
                  </Box>
                  <TableContainer
                    className="data-table-wrap"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="#1e374a"
                    bg="#0c1829"
                    px={{ base: 1, md: 2 }}
                  >
                    <Table size="sm" variant="unstyled" className="data-table">
                      <Thead>
                        <Tr>
                          <Th>Data</Th>
                          <Th>NDVI médio</Th>
                          <Th>Mín – Máx</Th>
                          <Th>Área útil</Th>
                          <Th>Situação</Th>
                          <Th />
                        </Tr>
                      </Thead>
                      <Tbody>
                        {scenes.map((s) => {
                          const a = analyses[s.id];
                          return (
                            <Tr key={s.id}>
                              <Td whiteSpace="nowrap">
                                <Text as="strong">
                                  {dLong.format(new Date(s.acquiredAt))}
                                </Text>
                              </Td>
                              <Td whiteSpace="nowrap">
                                <Text as="strong">{fmt(a?.mean)}</Text>
                              </Td>
                              <Td whiteSpace="nowrap">
                                {a ? `${fmt(a.min)} – ${fmt(a.max)}` : "—"}
                              </Td>
                              <Td whiteSpace="nowrap">
                                {a ? `${pFmt.format(a.validPct)}%` : "—"}
                              </Td>
                              <Td whiteSpace="nowrap">
                                <Badge
                                  borderRadius="md"
                                  className={`quality-badge ${a?.quality ?? ""}`}
                                >
                                  {a?.quality === "utilizavel"
                                    ? "Utilizável"
                                    : a?.quality === "parcial"
                                      ? "Parcial"
                                      : a?.quality === "insuficiente"
                                        ? "Nuvens"
                                        : "Não carregada"}
                                </Badge>
                              </Td>
                              <Td whiteSpace="nowrap">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  borderRadius="lg"
                                  borderColor="#2d5470"
                                  color="#cbe3f3"
                                  _hover={{ bg: "whiteAlpha.100" }}
                                  onClick={() => {
                                    setSceneId(s.id);
                                    setTab("visao");
                                  }}
                                >
                                  Abrir no mapa
                                </Button>
                              </Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {tab === "areas" && (
                <Box
                  className="areas-view"
                  p={{ base: 3.5, md: 5 }}
                  bg="#111e35"
                  border="1px solid"
                  borderColor="#2b3c57"
                  borderRadius="2xl"
                >
                  <Flex
                    justify="space-between"
                    align={{ base: "stretch", lg: "center" }}
                    direction={{ base: "column", lg: "row" }}
                    gap={3.5}
                    mb={4}
                  >
                    <Box>
                      <Heading as="h3" size="sm" color="#fff" mb={1}>
                        Gerenciamento de áreas NDVI ({areas.length})
                      </Heading>
                      <Text fontSize="xs" color="#9dafc7">
                        Edite o nome, a sonda vinculada, a cultura ou o contorno
                        das áreas monitoradas por satélite.
                      </Text>
                    </Box>
                    {canMutateAreas && (
                      <HStack spacing={2} flexWrap="wrap">
                        <Button
                          variant="outline"
                          size="xs"
                          h="32px"
                          px={3}
                          flex={{ base: "1 1 auto", sm: "0 0 auto" }}
                          borderRadius="lg"
                          borderColor="#32536c"
                          color="#cfe3f1"
                          _hover={{ bg: "whiteAlpha.100" }}
                          leftIcon={<Compass size={14} />}
                          onClick={() => startDrawing("pivo")}
                        >
                          Novo pivô (centro + borda)
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          h="32px"
                          px={3}
                          flex={{ base: "1 1 auto", sm: "0 0 auto" }}
                          borderRadius="lg"
                          borderColor="#32536c"
                          color="#cfe3f1"
                          _hover={{ bg: "whiteAlpha.100" }}
                          leftIcon={<Pentagon size={14} />}
                          onClick={() => startDrawing("talhao")}
                        >
                          Novo talhão (polígono)
                        </Button>
                      </HStack>
                    )}
                  </Flex>

                  {/* Visualização Mobile em Cards (Telas pequenas) */}
                  <VStack
                    display={{ base: "flex", md: "none" }}
                    spacing={3}
                    align="stretch"
                  >
                    {areas.map((a) => (
                      <Box
                        key={a.id}
                        p={3.5}
                        bg="#0c1829"
                        border="1px solid"
                        borderColor="#1e374a"
                        borderRadius="xl"
                      >
                        <Flex justify="space-between" align="flex-start" gap={2}>
                          <Box minW={0}>
                            <Text
                              as="strong"
                              display="block"
                              color="#eef6fb"
                              fontSize="sm"
                              noOfLines={1}
                            >
                              {a.name}
                            </Text>
                            <Text fontSize="11px" color="#789bb3" mt={0.5}>
                              {a.farmName} · {a.crop}
                            </Text>
                          </Box>
                          <Badge
                            colorScheme={a.type === "pivo" ? "teal" : "purple"}
                            variant="subtle"
                            borderRadius="md"
                            px={2}
                            py={0.5}
                            fontSize="10px"
                            flexShrink={0}
                          >
                            {a.type === "pivo" ? "Pivô Central" : "Talhão"}
                          </Badge>
                        </Flex>

                        <SimpleGrid
                          columns={2}
                          spacing={2}
                          mt={3}
                          pt={2.5}
                          borderTop="1px solid"
                          borderColor="#162a3a"
                        >
                          <Box>
                            <Text fontSize="10px" color="#789bb3">
                              SONDA VINCULADA
                            </Text>
                            <Text
                              fontSize="xs"
                              fontWeight="semibold"
                              color="#d6e8f5"
                              noOfLines={1}
                            >
                              {a.deviceName || "—"}
                            </Text>
                            {a.deviceEsn && (
                              <Text fontSize="10px" color="#63b3ed">
                                ESN: {a.deviceEsn}
                              </Text>
                            )}
                          </Box>
                          <Box>
                            <Text fontSize="10px" color="#789bb3">
                              ÁREA / CONTORNO
                            </Text>
                            <Text
                              fontSize="xs"
                              fontWeight="semibold"
                              color="#e2f0fa"
                            >
                              {a.hectares.toFixed(1).replace(".", ",")} ha
                            </Text>
                            <Text fontSize="10px" color="#88a6bd" noOfLines={1}>
                              {a.circle
                                ? `Círculo (${a.circle.radiusM} m)`
                                : "Polígono no mapa"}
                            </Text>
                          </Box>
                        </SimpleGrid>

                        <HStack
                          spacing={2}
                          mt={3}
                          pt={2.5}
                          borderTop="1px solid"
                          borderColor="#162a3a"
                        >
                          <Button
                            size="xs"
                            h="30px"
                            flex="1"
                            borderRadius="md"
                            variant="outline"
                            borderColor="#2d5470"
                            color="#cbe3f3"
                            _hover={{ bg: "whiteAlpha.100" }}
                            leftIcon={<Eye size={12} />}
                            onClick={() => {
                              setSelectedId(a.id);
                              setTab("visao");
                            }}
                          >
                            Ver NDVI
                          </Button>
                          {canMutateAreas &&
                            onAreaUpdated &&
                            a.source !== "demo" && (
                              <Button
                                size="xs"
                                h="30px"
                                flex="1"
                                borderRadius="md"
                                variant="outline"
                                borderColor="#3182ce"
                                color="#90cdf4"
                                _hover={{ bg: "rgba(49, 130, 206, 0.16)" }}
                                leftIcon={<Pencil size={12} />}
                                onClick={() => openEditArea(a)}
                              >
                                Editar
                              </Button>
                            )}
                          {canMutateAreas &&
                            onAreaRemoved &&
                            a.source !== "demo" &&
                            a.source !== "sistema" && (
                              <IconButton
                                size="xs"
                                h="30px"
                                minW="32px"
                                borderRadius="md"
                                variant="outline"
                                colorScheme="red"
                                aria-label={`Remover ${a.name}`}
                                icon={<Trash2 size={13} />}
                                onClick={() => onAreaRemoved(a.id)}
                              />
                            )}
                        </HStack>
                      </Box>
                    ))}
                  </VStack>

                  {/* Visualização Desktop/Tablet em Tabela */}
                  <TableContainer
                    display={{ base: "none", md: "block" }}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="#1e374a"
                    bg="#0c1829"
                  >
                    <Table size="sm" variant="unstyled">
                      <Thead bg="#091322">
                        <Tr borderBottom="1px solid" borderColor="#1e374a">
                          <Th
                            py={3.5}
                            px={4}
                            color="#789bb3"
                            fontSize="10px"
                            letterSpacing="0.8px"
                          >
                            ÁREA
                          </Th>
                          <Th
                            py={3.5}
                            px={4}
                            color="#789bb3"
                            fontSize="10px"
                            letterSpacing="0.8px"
                          >
                            SONDA VINCULADA
                          </Th>
                          <Th
                            py={3.5}
                            px={4}
                            color="#789bb3"
                            fontSize="10px"
                            letterSpacing="0.8px"
                          >
                            TIPO
                          </Th>
                          <Th
                            py={3.5}
                            px={4}
                            color="#789bb3"
                            fontSize="10px"
                            letterSpacing="0.8px"
                          >
                            CULTURA
                          </Th>
                          <Th
                            py={3.5}
                            px={4}
                            color="#789bb3"
                            fontSize="10px"
                            letterSpacing="0.8px"
                          >
                            HECTARES
                          </Th>
                          <Th
                            py={3.5}
                            px={4}
                            color="#789bb3"
                            fontSize="10px"
                            letterSpacing="0.8px"
                          >
                            CONTORNO
                          </Th>
                          <Th
                            py={3.5}
                            px={4}
                            color="#789bb3"
                            fontSize="10px"
                            letterSpacing="0.8px"
                            textAlign="right"
                          >
                            AÇÕES
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {areas.map((a) => (
                          <Tr
                            key={a.id}
                            borderBottom="1px solid"
                            borderColor="#162a3a"
                            _hover={{ bg: "whiteAlpha.50" }}
                          >
                            <Td py={3.5} px={4} verticalAlign="middle">
                              <Text
                                as="strong"
                                display="block"
                                color="#eef6fb"
                                fontSize="xs"
                              >
                                {a.name}
                              </Text>
                              <Text fontSize="11px" color="#789bb3" mt={0.5}>
                                {a.farmName}
                              </Text>
                            </Td>
                            <Td py={3.5} px={4} verticalAlign="middle">
                              {a.deviceName ? (
                                <Box>
                                  <Text
                                    as="strong"
                                    display="block"
                                    color="#d6e8f5"
                                    fontSize="xs"
                                  >
                                    {a.deviceName}
                                  </Text>
                                  {a.deviceEsn && (
                                    <Text
                                      fontSize="11px"
                                      color="#63b3ed"
                                      mt={0.5}
                                    >
                                      ESN: {a.deviceEsn}
                                    </Text>
                                  )}
                                </Box>
                              ) : (
                                <Text fontSize="xs" color="#6c8aa0">
                                  —
                                </Text>
                              )}
                            </Td>
                            <Td py={3.5} px={4} verticalAlign="middle">
                              <Badge
                                colorScheme={
                                  a.type === "pivo" ? "teal" : "purple"
                                }
                                variant="subtle"
                                borderRadius="md"
                                px={2}
                                py={0.5}
                                fontSize="10px"
                              >
                                {a.type === "pivo" ? "Pivô Central" : "Talhão"}
                              </Badge>
                            </Td>
                            <Td
                              py={3.5}
                              px={4}
                              verticalAlign="middle"
                              fontSize="xs"
                              color="#cbe3f3"
                            >
                              {a.crop}
                            </Td>
                            <Td
                              py={3.5}
                              px={4}
                              verticalAlign="middle"
                              fontSize="xs"
                              fontWeight="semibold"
                              color="#e2f0fa"
                              whiteSpace="nowrap"
                            >
                              {a.hectares.toFixed(1).replace(".", ",")} ha
                            </Td>
                            <Td py={3.5} px={4} verticalAlign="middle">
                              <Badge
                                variant="outline"
                                colorScheme="blue"
                                borderRadius="md"
                                px={2}
                                py={0.5}
                                fontSize="10px"
                              >
                                {a.circle
                                  ? `Círculo (${a.circle.radiusM} m)`
                                  : a.source === "desenho"
                                    ? "Polígono no mapa"
                                    : "Cadastro BR Sense"}
                              </Badge>
                            </Td>
                            <Td
                              py={3.5}
                              px={4}
                              verticalAlign="middle"
                              textAlign="right"
                            >
                              <HStack spacing={2} justify="flex-end">
                                <Button
                                  size="xs"
                                  h="28px"
                                  px={2.5}
                                  borderRadius="md"
                                  variant="outline"
                                  borderColor="#2d5470"
                                  color="#cbe3f3"
                                  _hover={{ bg: "whiteAlpha.100" }}
                                  leftIcon={<Eye size={12} />}
                                  onClick={() => {
                                    setSelectedId(a.id);
                                    setTab("visao");
                                  }}
                                >
                                  Ver NDVI
                                </Button>
                                {canMutateAreas &&
                                  onAreaUpdated &&
                                  a.source !== "demo" && (
                                    <Button
                                      size="xs"
                                      h="28px"
                                      px={2.5}
                                      borderRadius="md"
                                      variant="outline"
                                      borderColor="#3182ce"
                                      color="#90cdf4"
                                      _hover={{ bg: "rgba(49, 130, 206, 0.16)" }}
                                      leftIcon={<Pencil size={12} />}
                                      onClick={() => openEditArea(a)}
                                    >
                                      Editar
                                    </Button>
                                  )}
                                {canMutateAreas &&
                                  onAreaRemoved &&
                                  a.source !== "demo" &&
                                  a.source !== "sistema" && (
                                    <IconButton
                                      size="xs"
                                      h="28px"
                                      minW="28px"
                                      borderRadius="md"
                                      variant="outline"
                                      colorScheme="red"
                                      aria-label={`Remover ${a.name}`}
                                      icon={<Trash2 size={13} />}
                                      onClick={() => onAreaRemoved(a.id)}
                                    />
                                  )}
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              <Flex
                as="footer"
                className="workspace-footer"
                justify="space-between"
                align="center"
                flexWrap="wrap"
              >
              </Flex>
            </>
          ) : (
            <VStack spacing={4} align="stretch">
              <Flex
                justify="space-between"
                align={{ base: "flex-start", md: "center" }}
                direction={{ base: "column", md: "row" }}
                gap={3}
                p={4}
                bg="#111e35"
                border="1px solid"
                borderColor="#2b3c57"
                borderRadius="lg"
              >
                <HStack spacing={3}>
                  <Satellite size={22} color="#63b3ed" />
                  <Box>
                    <Heading as="h3" size="sm" color="#fff">
                      Nenhuma área NDVI desenhada
                    </Heading>
                    <Text fontSize="xs" color="#9dafc7">
                      Visualize abaixo o mapa com o KML e as sondas da fazenda.
                      Desenhe o contorno de um pivô ou talhão vinculado a uma
                      sonda para monitorar o NDVI.
                    </Text>
                  </Box>
                </HStack>
                {canMutateAreas && (
                  <Button
                    size="sm"
                    w={{ base: "100%", md: "auto" }}
                    colorScheme="blue"
                    leftIcon={<Compass size={15} />}
                    onClick={() => startDrawing("pivo")}
                  >
                    Desenhar primeira área
                  </Button>
                )}
              </Flex>

              <Box className="map-wrap" borderRadius="xl" overflow="hidden">
                <AreaMap
                  areas={areas}
                  probes={probes}
                  mapLayers={mapLayers}
                  activeProbeId={effectiveSelectedProbeId}
                  onSelect={setSelectedId}
                  basemap={basemap}
                />
              </Box>
            </VStack>
          )}
        </Box>
      </Grid>

      {canMutateAreas && (
        <>
          <AreaDialog
            open={dialogOpen}
            farmName={selected?.farmName ?? "Fazenda BR Sense"}
            city={selected?.city ?? "Brasil"}
            probes={probes}
            selectedProbeId={effectiveSelectedProbeId}
            onSelectProbeId={setSelectedProbeId}
            drawnContour={drawnContour}
            onClose={() => setDialogOpen(false)}
            onImport={handleImport}
            onStartDrawing={startDrawing}
          />
          <ContourEditor
            open={drawing}
            areas={areas}
            selected={editingArea ?? selected}
            probes={probes}
            mapLayers={mapLayers}
            selectedProbeId={
              redrawingEdit ? editDeviceId : effectiveSelectedProbeId
            }
            onSelectProbeId={(id) => {
              if (redrawingEdit) {
                setEditDeviceId(id);
              } else {
                setSelectedProbeId(id);
              }
            }}
            initialMode={drawMode}
            basemap={basemap}
            onClose={() => {
              setDrawing(false);
              setRedrawingEdit(false);
            }}
            onComplete={(contour) => {
              setDrawing(false);
              if (redrawingEdit) {
                setRedrawingEdit(false);
                setEditContour(contour);
                setEditType(contour.type);
              } else {
                setDrawnContour(contour);
                setDialogOpen(true);
              }
            }}
          />
          <Modal
            isOpen={Boolean(editingArea) && !drawing}
            onClose={() => {
              if (!savingEdit) {
                setEditingArea(null);
                setEditContour(null);
              }
            }}
            isCentered
            size="lg"
          >
            <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
            <ModalContent
              mx={{ base: 3, md: "auto" }}
              bg="#0b1d2c"
              color="#eef6fb"
              border="1px solid"
              borderColor="#234057"
              borderRadius="2xl"
            >
              <ModalHeader
                py={4}
                px={{ base: 4, md: 6 }}
                borderBottom="1px solid"
                borderColor="#1c3548"
              >
                <HStack spacing={3}>
                  <Flex
                    w="36px"
                    h="36px"
                    borderRadius="lg"
                    bg="rgba(43, 149, 234, 0.16)"
                    color="#6bc2ff"
                    align="center"
                    justify="center"
                    flexShrink={0}
                  >
                    <Pencil size={17} />
                  </Flex>
                  <Box pr={6}>
                    <Heading size="sm" color="#f3f9fd">
                      Editar área NDVI
                    </Heading>
                    <Text fontSize="xs" color="#8fb0c7" fontWeight="normal">
                      Atualize os dados cadastrais, sonda vinculada ou redesenhe
                      o contorno.
                    </Text>
                  </Box>
                </HStack>
              </ModalHeader>
              <ModalCloseButton color="#9ec6de" top={4} right={4} />

              <ModalBody py={4} px={{ base: 4, md: 6 }}>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel fontSize="xs" color="#9ec6de" mb={1.5}>
                      Nome da área
                    </FormLabel>
                    <Input
                      size="sm"
                      borderRadius="lg"
                      bg="#091825"
                      borderColor="#29465b"
                      color="#eef6fb"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Ex.: Pivô 01 · Sede"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="xs" color="#9ec6de" mb={1.5}>
                      Sonda vinculada
                    </FormLabel>
                    <Select
                      size="sm"
                      borderRadius="lg"
                      bg="#091825"
                      borderColor="#29465b"
                      color="#eef6fb"
                      value={editDeviceId ?? ""}
                      onChange={(e) => setEditDeviceId(Number(e.target.value))}
                    >
                      {probes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.esn})
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                    <FormControl>
                      <FormLabel fontSize="xs" color="#9ec6de" mb={1.5}>
                        Tipo de área
                      </FormLabel>
                      <Select
                        size="sm"
                        borderRadius="lg"
                        bg="#091825"
                        borderColor="#29465b"
                        color="#eef6fb"
                        value={editType}
                        onChange={(e) =>
                          setEditType(e.target.value as AreaType)
                        }
                      >
                        <option value="pivo">Pivô Central</option>
                        <option value="talhao">Talhão</option>
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="xs" color="#9ec6de" mb={1.5}>
                        Cultura / estádio
                      </FormLabel>
                      <Input
                        size="sm"
                        borderRadius="lg"
                        bg="#091825"
                        borderColor="#29465b"
                        color="#eef6fb"
                        value={editCrop}
                        onChange={(e) => setEditCrop(e.target.value)}
                        placeholder="Ex.: Soja · R3"
                      />
                    </FormControl>
                  </SimpleGrid>

                  <Box
                    p={3.5}
                    borderRadius="xl"
                    bg="#091825"
                    border="1px solid"
                    borderColor="#1f384b"
                  >
                    <Flex
                      justify="space-between"
                      align={{ base: "stretch", sm: "center" }}
                      direction={{ base: "column", sm: "row" }}
                      gap={3}
                    >
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="#d8eaf6">
                          Contorno geográfico (
                          {(
                            editContour?.hectares ??
                            editingArea?.hectares ??
                            0
                          )
                            .toFixed(1)
                            .replace(".", ",")}{" "}
                          ha)
                        </Text>
                        <Text fontSize="11px" color="#84a4bc">
                          {editContour
                            ? "Novo contorno redesenhado pronto para salvar"
                            : editingArea?.circle
                              ? `Círculo atual · raio ${editingArea.circle.radiusM} m`
                              : "Polígono atual salvo no banco"}
                        </Text>
                      </Box>
                      <Button
                        size="xs"
                        h="30px"
                        variant="outline"
                        borderRadius="lg"
                        borderColor="#3182ce"
                        color="#90cdf4"
                        _hover={{ bg: "rgba(49, 130, 206, 0.16)" }}
                        leftIcon={<Compass size={13} />}
                        onClick={() => {
                          setRedrawingEdit(true);
                          setDrawMode(editType);
                          setDrawing(true);
                        }}
                      >
                        Redesenhar no mapa
                      </Button>
                    </Flex>
                  </Box>
                </VStack>
              </ModalBody>

              <ModalFooter
                py={3.5}
                px={{ base: 4, md: 6 }}
                borderTop="1px solid"
                borderColor="#1c3548"
                gap={2.5}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  borderRadius="lg"
                  color="#9ec6de"
                  _hover={{ bg: "whiteAlpha.100" }}
                  isDisabled={savingEdit}
                  onClick={() => {
                    setEditingArea(null);
                    setEditContour(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  colorScheme="blue"
                  borderRadius="lg"
                  isLoading={savingEdit}
                  leftIcon={<Check size={14} />}
                  onClick={handleSaveEdit}
                >
                  Salvar alterações
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </>
      )}
    </Box>
  );
}
