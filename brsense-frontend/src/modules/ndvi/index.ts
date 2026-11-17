export { NdviModule, type NdviModuleProps } from "./NdviModule";
export { AreaMap, type MapBasemap } from "./components/AreaMap";
export {
  NdviMapOverlay,
  NdviMapToggle,
} from "./components/NdviMapOverlay";
export {
  NdviContourTools,
  type ContourDrawState,
  type DrawMode,
} from "./components/NdviContourTools";
export { useContourDrawing } from "./lib/useContourDrawing";
export { createHttpNdviApi } from "./lib/api";
export { demoApi, DEMO_AREAS } from "./lib/demo";
export {
  loadSavedCustomNdviAreas,
  saveCustomNdviAreas,
  mapLayersToNdviAreas,
} from "./lib/mapLayersBridge";
export type {
  AreaGeometry,
  AreaType,
  NdviAnalysis,
  NdviApi,
  NdviArea,
  NdviBin,
  NdviProbeOption,
  NdviScene,
  SceneQuality,
} from "./shared/types";

