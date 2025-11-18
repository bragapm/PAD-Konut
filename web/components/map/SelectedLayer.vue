<script lang="ts" setup>
import type { MapLayerMouseEvent } from "maplibre-gl";
const mapRefStore = useMapRef();
const { map } = storeToRefs(mapRefStore);
const mapStore = useMap();
const { selectedLayerId, cursorMode, highlightedLayers } =
  storeToRefs(mapStore);
const mapLayerStore = useMapLayer();
const { groupedActiveLayers } = storeToRefs(mapLayerStore);

const onMouseEnter = () => {
  map.value!.getCanvas().style.cursor = "pointer";
};
const onMouseLeave = () => {
  map.value!.getCanvas().style.cursor = "";
};

const clickEvent = (e: MapLayerMouseEvent) => {
  if (e.features && e.features.length > 0) {
    const fid = e.features[0].id;
    const layerId = e.features[0].layer.id;
    let currentHighlightedLayers = { ...highlightedLayers.value };
    const activeLayers = groupedActiveLayers.value.flatMap(
      (el) => el.layerLists
    );
    const targetLayer = activeLayers.find(
      (el) => (el as VectorTiles).layer_id === layerId
    );

    if (e.features[0].layer.id in currentHighlightedLayers) {
      const existingIds: number[] = highlightedLayers.value[layerId]?.ids || [];
      const index = existingIds.indexOf(fid as number);
      let updatedIds;
      if (index === -1) {
        updatedIds = [...existingIds, fid];
      } else {
        updatedIds = existingIds.filter((id) => id !== fid);
      }
      highlightedLayers.value[layerId]["ids"] = updatedIds;
    } else {
      highlightedLayers.value[layerId] = {
        ...(targetLayer as VectorTiles),
        ids: [fid],
        highlightedAll: false,
      };
    }
  }
};
watchEffect((onInvalidate) => {
  if (!map.value) return;

  let layerId = selectedLayerId.value;

  if (cursorMode.value === "select" && layerId) {
    map.value.on("mouseenter", layerId, onMouseEnter);
    map.value.on("mouseleave", layerId, onMouseLeave);
    map.value.on("click", layerId, clickEvent);
  }
  onInvalidate(() => {
    if (map.value && layerId) {
      map.value.off("mouseenter", layerId, onMouseEnter);
      map.value.off("mouseleave", layerId, onMouseLeave);
      map.value.off("click", layerId, clickEvent);
    }
  });
});
</script>

<template></template>
