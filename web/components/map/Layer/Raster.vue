<script setup lang="ts">
import bbox from "@turf/bbox";
import type { ExternalTiles, LayerLists, RasterTiles } from "~/utils/types";

const store = useMapRef();
const { map } = storeToRefs(store);

const props = defineProps<{
  renderedLayers: LayerLists[];
  item: RasterTiles | ExternalTiles;
  order: number;
}>();

watchEffect(async () => {
  if (map?.value) {
    if (!map.value.getSource(props.item.layer_id)) {
      let tileUrl = `${window.location.origin}/panel/raster-tiles/${props.item.layer_id}?z={z}&x={x}&y={y}`;
      if ("protocol" in props.item && props.item.protocol === "greyscale") {
        tileUrl =
          `greyscale://value_steps=${JSON.stringify(
            props.item.color_steps?.map(({ pixel_value }) => pixel_value)
          )}&color_steps=${JSON.stringify(
            props.item.color_steps?.map(({ color }) => color)
          )}[|]` + tileUrl;
      }
      map.value.addSource(props.item.layer_id, {
        type: "raster",
        tiles: "tile_url" in props.item ? props.item.tile_url : [tileUrl],
        tileSize:
          "tile_size" in props.item && props.item.tile_size
            ? props.item.tile_size
            : 512,
        bounds: props.item.bounds
          ? (bbox(props.item.bounds) as [number, number, number, number])
          : undefined,
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
          type: "raster",
          source: props.item.layer_id,
          layout: {
            visibility: props.item.layer_style.layout_visibility as
              | "visible"
              | "none"
              | undefined,
          },
          paint: { "raster-opacity": 1 },
        },
        beforeId || undefined
      );
    }
  }
});
</script>

<template></template>
