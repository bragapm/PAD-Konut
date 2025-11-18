<script setup lang="ts">
import bbox from "@turf/bbox";
import type { LayerLists, RasterTiles } from "~/utils/types";

const store = useMapRef();
const { map } = storeToRefs(store);

const props = defineProps<{
  renderedLayers: LayerLists[];
  item: RasterTiles;
  order: number;
}>();

watchEffect(async () => {
  if (map?.value) {
    if (
      !map.value.getSource(props.item.layer_id + "_terrain") &&
      !map.value.getSource(props.item.layer_id + "_hillshade")
    ) {
      map.value.addSource(props.item.layer_id + "_terrain", {
        type: "raster-dem",
        tiles: [
          `${window.location.origin}/panel/raster-tiles/${props.item.layer_id}?z={z}&x={x}&y={y}`,
        ],
        tileSize: 256,
        bounds: bbox(props.item.bounds) as [number, number, number, number],
        minzoom: props.item.minzoom || 5,
        maxzoom: props.item.maxzoom || 15,
      });
      map.value.addSource(props.item.layer_id + "_hillshade", {
        type: "raster-dem",
        tiles: [
          `${window.location.origin}/panel/raster-tiles/${props.item.layer_id}?z={z}&x={x}&y={y}`,
        ],
        tileSize: 256,
        bounds: bbox(props.item.bounds) as [number, number, number, number],
        minzoom: props.item.minzoom || 5,
        maxzoom: props.item.maxzoom || 15,
      });
    }
    if (!map.value.getLayer(props.item.layer_id)) {
      let beforeId: undefined | string = undefined;
      if (props.order !== 0) {
        let order = props.order;
        let layerId;
        for (let i = order; i !== 0; i--) {
          if (map.value.getLayer(props.renderedLayers[i - 1].layer_id)) {
            layerId = props.renderedLayers[i - 1].layer_id;
            break;
          } else {
            if (i === 1) {
              layerId = undefined;
            }
          }
        }
        beforeId = layerId;
        // beforeId = props.renderedLayers[props.order - 1].layer_id;
      }
      map.value.addLayer(
        {
          id: props.item.layer_id,
          type: "hillshade",
          source: props.item.layer_id + "_hillshade",
          layout: {
            visibility: props.item.layer_style.layout_visibility as
              | "visible"
              | "none"
              | undefined,
          },
          paint: { "hillshade-shadow-color": "#473B24" },
        },
        beforeId || undefined
      );
    }
  }
});
</script>

<template></template>
