<script lang="ts" setup>
import type { AddLayerObject } from "maplibre-gl";
import {
  geomTypeCircle,
  geomTypeLine,
  geomTypePolygon,
  geomTypeSymbol,
} from "~/constants";

type StyleObject = Record<
  string,
  string | number | boolean | any[] | undefined | Record<string, string>
>;

const props = defineProps<{
  item: (VectorTiles | LoadedGeoJson | ExternalVector) & {
    highlightedAll: boolean;
    ids: any[];
  };
}>();

const mapRefStore = useMapRef();
const { map } = storeToRefs(mapRefStore);
const authStore = useAuth();
const currentToken = ref(authStore.accessToken);
const { getLoadedGeoJsonData } = useIDB();

const currentHighlightedItem = computed(() => {
  return props.item;
});

function getHighlightColorExpression(ids: any[], highlightedAll: boolean) {
  return [
    "case",
    ["in", ["id"], ["literal", ids]],
    highlightedAll ? "transparent" : "#ffff00",
    highlightedAll ? "#ffff00" : "transparent",
  ];
}

function extractStyleObjects(layerStyle: Record<string, any>) {
  const paint: StyleObject = {};
  const layout: StyleObject = {};

  Object.entries(layerStyle).forEach(([key, value]) => {
    const [category, ...nameStrings] = key.split("_");
    const name = nameStrings.join("-");

    if (!value) return;

    if (category === "paint") {
      paint[name] = isString(value) ? parseString(value) : value;
    } else if (category === "layout" && key !== "layout_icon_image") {
      layout[name] = isString(value) ? parseString(value) : value;
    }
  });

  console.log("LAYOUT AT HIGHLIHGT", layout);

  return { paint, layout };
}

watch(
  () => currentHighlightedItem.value,
  async (val) => {
    if (map.value) {
      if (!map.value.getSource(props.item.layer_id + "_highlight")) {
        if (props.item.source === "vector_tiles") {
          map.value.addSource(props.item.layer_id + "_highlight", {
            type: "vector",
            tiles: [
              window.location.origin +
                "/panel/mvt/" +
                props.item.layer_name +
                "?z={z}&x={x}&y={y}" +
                (authStore.accessToken
                  ? "&access_token=" + authStore.accessToken
                  : ""),
            ],
            minzoom: props.item.minzoom || 5,
            maxzoom: props.item.maxzoom || 15,
          });
        } else if (props.item.source === "loaded_geojson") {
          try {
            const loadedGeoJson = await getLoadedGeoJsonData(
              props.item.layer_id
            );
            if (loadedGeoJson) {
              map.value.addSource(props.item.layer_id + "_highlight", {
                type: "geojson",
                data: loadedGeoJson.data,
              });
            } else {
              console.error("Layer does not exists in IndexedDB");
            }
          } catch (error) {
            console.error(error);
          }
        } else if (props.item.source === "external_vector") {
          const parsedLayerId = props.item.layer_id.split("_")[0];
          try {
            const response = await fetch(
              `/panel/external-vector/${parsedLayerId}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  // Authorization: `Bearer ${authStore.accessToken}`,
                },
              }
            );
            const result = await response.json();
            if (result) {
              map.value.addSource(props.item.layer_id + "_highlight", {
                type: "geojson",
                data: result,
              });
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "Error";
          }
        }
      } else {
        if (
          authStore.accessToken &&
          authStore.accessToken !== currentToken.value &&
          props.item.source === "vector_tiles"
        ) {
          (map.value.getSource(
            props.item.layer_id + "_highlight"
          ) as any)!.setTiles([
            window.location.origin +
              "/panel/mvt/" +
              props.item.layer_name +
              "?z={z}&x={x}&y={y}" +
              (authStore.accessToken
                ? "&access_token=" + authStore.accessToken
                : ""),
          ]);
          currentToken.value = authStore.accessToken;
        }
      }

      if (props.item.geometry_type === geomTypeCircle) {
        const { paint, layout } = extractStyleObjects(props.item.layer_style);

        paint["circle-color"] = getHighlightColorExpression(
          props.item.ids,
          props.item.highlightedAll
        );

        if (!map.value.getLayer(props.item.layer_id + "_highlight")) {
          const layer: AddLayerObject = {
            id: props.item.layer_id + "_highlight",
            type: "circle",
            source: props.item.layer_id + "_highlight",
            layout: { ...layout, visibility: "visible" },
            paint,
          };
          if (props.item.source === "vector_tiles") {
            layer["source-layer"] = props.item.layer_name;
          }
          map.value.addLayer(layer);
        } else {
          map.value.setPaintProperty(
            props.item.layer_id + "_highlight",
            "circle-color",
            getHighlightColorExpression(
              props.item.ids,
              props.item.highlightedAll
            )
          );
        }
      } else if (props.item.geometry_type === geomTypeSymbol) {
        const { paint, layout } = extractStyleObjects(props.item.layer_style);

        paint["icon-color"] = getHighlightColorExpression(
          props.item.ids,
          props.item.highlightedAll
        );

        if (!map.value.getLayer(props.item.layer_id + "_highlight")) {
          const layer: AddLayerObject = {
            id: props.item.layer_id + "_highlight",
            type: "symbol",
            source: props.item.layer_id + "_highlight",
            layout: { ...layout, visibility: "visible" },
            paint,
          };
          if (props.item.source === "vector_tiles") {
            layer["source-layer"] = props.item.layer_name;
          }
          map.value.addLayer(layer);
        } else {
          map.value.setPaintProperty(
            props.item.layer_id + "_highlight",
            "icon-color",
            getHighlightColorExpression(
              props.item.ids,
              props.item.highlightedAll
            )
          );
        }
      } else if (props.item.geometry_type === geomTypePolygon) {
        const { paint, layout } = extractStyleObjects(props.item.layer_style);

        paint["fill-color"] = getHighlightColorExpression(
          props.item.ids,
          props.item.highlightedAll
        );

        if (!map.value.getLayer(props.item.layer_id + "_highlight")) {
          const layer: AddLayerObject = {
            id: props.item.layer_id + "_highlight",
            type: "fill",
            source: props.item.layer_id + "_highlight",
            layout: { ...layout, visibility: "visible" },
            paint,
          };
          if (props.item.source === "vector_tiles") {
            layer["source-layer"] = props.item.layer_name;
          }
          map.value.addLayer(layer);
        } else {
          map.value.setPaintProperty(
            props.item.layer_id + "_highlight",
            "fill-color",
            getHighlightColorExpression(
              props.item.ids,
              props.item.highlightedAll
            )
          );
        }
      } else if (props.item.geometry_type === geomTypeLine) {
        const { paint, layout } = extractStyleObjects(props.item.layer_style);

        paint["line-color"] = getHighlightColorExpression(
          props.item.ids,
          props.item.highlightedAll
        );

        if (!map.value.getLayer(props.item.layer_id + "_highlight")) {
          const layer: AddLayerObject = {
            id: props.item.layer_id + "_highlight",
            type: "line",
            source: props.item.layer_id + "_highlight",
            layout: { ...layout, visibility: "visible" },
            paint,
          };
          if (props.item.source === "vector_tiles") {
            layer["source-layer"] = props.item.layer_name;
          }
          map.value.addLayer(layer);
        } else {
          map.value.setPaintProperty(
            props.item.layer_id + "_highlight",
            "line-color",
            getHighlightColorExpression(
              props.item.ids,
              props.item.highlightedAll
            )
          );
        }
      }
    }
  },
  { deep: true, immediate: true }
);
</script>

<template></template>
