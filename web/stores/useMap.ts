import type { GeoJSONSource } from "maplibre-gl";
import { defineStore } from "pinia";

type cursorMode = "default" | "select";

export const useMap = defineStore("mapStore", () => {
  const mapRefStore = useMapRef();
  const cursorMode = ref<cursorMode>("default");

  const selectedLayerId = ref<string | null>(null);
  const selectedLayerName = ref<string | null>(null);

  const highlightedLayers = ref<{ [key: string]: any }>({});

  function changeCursorMode(value: cursorMode) {
    cursorMode.value = value;
    if (value === "default") {
      //still need selectedLayerId to clear map click so need to delayed reseting selectedLayerId
      setTimeout(() => {
        selectedLayerId.value = null;
        selectedLayerName.value = null;
      }, 800);
      if (mapRefStore.map?.getSource("highlight")) {
        (mapRefStore.map.getSource("highlight") as GeoJSONSource).setData(
          emptyFeatureCollection
        );
        pauseAllAnimation();
      }
    }
  }

  function selectLayerId(value: string | null) {
    selectedLayerId.value = value;
  }

  function selectLayerName(value: string | null) {
    selectedLayerName.value = value;
  }

  function removeHighlightedLayer(layerId: string) {
    delete highlightedLayers.value[layerId];
    const highlightLayerId = layerId + "_highlight";
    if (mapRefStore.map?.getSource(highlightLayerId)) {
      mapRefStore.map.removeLayer(highlightLayerId);
      mapRefStore.map.removeSource(highlightLayerId);
    }
  }
  function removeAllHighlightedLayer() {
    const keys = Object.keys(highlightedLayers.value);

    if (keys.length === 0) return;

    for (const key of keys) {
      const highlightLayerId = key + "_highlight";

      if (mapRefStore.map?.getLayer(highlightLayerId)) {
        mapRefStore.map.removeLayer(highlightLayerId);
      }

      if (mapRefStore.map?.getSource(highlightLayerId)) {
        mapRefStore.map.removeSource(highlightLayerId);
      }
    }

    highlightedLayers.value = {};
  }

  return {
    cursorMode,
    changeCursorMode,
    selectLayerId,
    selectedLayerId,
    selectLayerName,
    selectedLayerName,
    highlightedLayers,
    removeHighlightedLayer,
    removeAllHighlightedLayer,
  };
});
