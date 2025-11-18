<script setup lang="ts">
import type { AddLayerObject } from "maplibre-gl";
import {
  geomTypeCircle,
  geomTypeLine,
  geomTypePolygon,
  geomTypeSymbol,
} from "~/constants";
import { isString, parseString } from "~/utils";
import { extractAttributeFromExpression } from "~/utils/mapStyling";
import type {
  VectorTiles,
  CircleStyles,
  FillStyles,
  LineStyles,
  LayerLists,
  LoadedGeoJson,
  ExternalVector,
  SymbolStyles,
} from "~/utils/types";

type StyleObject = Record<
  string,
  string | number | boolean | any[] | undefined | Record<string, string>
>;

const store = useMapRef();
const authStore = useAuth();
const { map } = storeToRefs(store);
const mapStore = useMap();
const { cursorMode } = storeToRefs(mapStore);
const { getLoadedGeoJsonData } = useIDB();

const props = defineProps<{
  renderedLayers: LayerLists[];
  item: VectorTiles | LoadedGeoJson | ExternalVector;
  order: number;
}>();

const currentToken = ref(authStore.accessToken);

watchEffect(async () => {
  if (map.value) {
    let expr = null;

    if (props.item.geometry_type === geomTypeCircle) {
      expr = (props.item.layer_style as CircleStyles).paint_circle_color;
    } else if (props.item.geometry_type === geomTypeSymbol) {
      expr = (props.item.layer_style as SymbolStyles).layout_icon_image;
    } else if (props.item.geometry_type === geomTypePolygon) {
      expr = (props.item.layer_style as FillStyles).paint_fill_color;
    } else if (props.item.geometry_type === geomTypeLine) {
      expr = (props.item.layer_style as LineStyles).paint_line_color;
    }
    const attribute = extractAttributeFromExpression(expr);

    if (!map.value.getSource(props.item.layer_id)) {
      if (props.item.source === "vector_tiles") {
        map.value.addSource(props.item.layer_id, {
          type: "vector",
          tiles: [
            window.location.origin +
              "/panel/mvt/" +
              props.item.layer_name +
              "?z={z}&x={x}&y={y}" +
              (attribute ? "&attributes=" + attribute : "") +
              (authStore.accessToken
                ? "&access_token=" + authStore.accessToken
                : ""),
          ],
          minzoom: props.item.minzoom || 5,
          maxzoom: props.item.maxzoom || 15,
        });
      } else if (props.item.source === "loaded_geojson") {
        try {
          const loadedGeoJson = await getLoadedGeoJsonData(props.item.layer_id);
          if (loadedGeoJson) {
            map.value.addSource(props.item.layer_id, {
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
            map.value.addSource(props.item.layer_id, {
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
        (map.value.getSource(props.item.layer_id) as any)!.setTiles([
          window.location.origin +
            "/panel/mvt/" +
            props.item.layer_name +
            "?z={z}&x={x}&y={y}" +
            (attribute ? "&attributes=" + attribute : "") +
            (authStore.accessToken
              ? "&access_token=" + authStore.accessToken
              : ""),
        ]);
        currentToken.value = authStore.accessToken;
      }
    }
    if (!map.value.getLayer(props.item.layer_id)) {
      let beforeId: undefined | string = undefined;
      if (props.order !== 0) {
        let order = props.order;
        let layerId;
        for (let i = order; i !== 0; i--) {
          const layer = props.renderedLayers[i - 1];
          if (layer && map.value.getLayer(layer.layer_id)) {
            layerId = layer.layer_id;
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

      if (props.item.geometry_type === geomTypeCircle) {
        let paint: StyleObject = {},
          layout: StyleObject = {};

        Object.keys(props.item.layer_style).forEach((key) => {
          const [category, ...nameStrings] = key.split("_");
          if (
            category === "paint" &&
            props.item.layer_style?.[key as keyof typeof props.item.layer_style]
          ) {
            paint[nameStrings.join("-")] = isString(
              (props.item.layer_style as CircleStyles)[
                key as keyof CircleStyles
              ]
            )
              ? parseString(
                  (props.item.layer_style as CircleStyles)[
                    key as keyof CircleStyles
                  ] as string
                )
              : (props.item.layer_style as CircleStyles)[
                  key as keyof CircleStyles
                ];
          } else if (
            category === "layout" &&
            (props.item.layer_style as CircleStyles)?.[
              key as keyof CircleStyles
            ]
          ) {
            layout[nameStrings.join("-")] = isString(
              (props.item.layer_style as CircleStyles)[
                key as keyof CircleStyles
              ]
            )
              ? parseString(
                  (props.item.layer_style as CircleStyles)[
                    key as keyof CircleStyles
                  ] as string
                )
              : (props.item.layer_style as CircleStyles)[
                  key as keyof CircleStyles
                ];
          }
        });

        const layer: AddLayerObject = {
          id: props.item.layer_id,
          type: "circle",
          source: props.item.layer_id,
          layout,
          paint,
        };
        if (props.item.source === "vector_tiles") {
          layer["source-layer"] = props.item.layer_name;
        }
        map.value.addLayer(layer, beforeId || undefined);
      } else if (props.item.geometry_type === geomTypeSymbol) {
        let paint: StyleObject = {},
          layout: StyleObject = {};

        Object.keys(props.item.layer_style).forEach((key) => {
          const [category, ...nameStrings] = key.split("_");
          if (
            category === "paint" &&
            props.item.layer_style?.[key as keyof typeof props.item.layer_style]
          ) {
            paint[nameStrings.join("-")] = isString(
              (props.item.layer_style as SymbolStyles)[
                key as keyof SymbolStyles
              ]
            )
              ? parseString(
                  (props.item.layer_style as SymbolStyles)[
                    key as keyof SymbolStyles
                  ] as string
                )
              : (props.item.layer_style as SymbolStyles)[
                  key as keyof SymbolStyles
                ];
          } else if (
            category === "layout" &&
            (props.item.layer_style as SymbolStyles)?.[
              key as keyof SymbolStyles
            ]
          ) {
            layout[nameStrings.join("-")] = isString(
              (props.item.layer_style as SymbolStyles)[
                key as keyof SymbolStyles
              ]
            )
              ? parseString(
                  (props.item.layer_style as SymbolStyles)[
                    key as keyof SymbolStyles
                  ] as string
                )
              : (props.item.layer_style as SymbolStyles)[
                  key as keyof SymbolStyles
                ];
          }
        });

        const layer: AddLayerObject = {
          id: props.item.layer_id,
          type: "symbol",
          source: props.item.layer_id,
          layout,
          paint,
        };
        if (props.item.source === "vector_tiles") {
          layer["source-layer"] = props.item.layer_name;
        }

        map.value.addLayer(layer, beforeId || undefined);
      } else if (props.item.geometry_type === geomTypePolygon) {
        let paint: StyleObject = {},
          layout: StyleObject = {};

        Object.keys(props.item.layer_style as FillStyles).forEach((key) => {
          const [category, ...nameStrings] = key.split("_");
          if (
            category === "paint" &&
            props.item.layer_style?.[key as keyof typeof props.item.layer_style]
          ) {
            paint[nameStrings.join("-")] = isString(
              (props.item.layer_style as FillStyles)[key as keyof FillStyles]
            )
              ? parseString(
                  (props.item.layer_style as FillStyles)[
                    key as keyof FillStyles
                  ] as string
                )
              : (props.item.layer_style as FillStyles)[key as keyof FillStyles];
          } else if (
            category === "layout" &&
            (props.item.layer_style as FillStyles)?.[key as keyof FillStyles]
          ) {
            layout[nameStrings.join("-")] = (
              props.item.layer_style as FillStyles
            )[key as keyof FillStyles];
          }
        });

        const layer: AddLayerObject = {
          id: props.item.layer_id,
          type: "fill",
          source: props.item.layer_id,
          layout,
          paint,
        };
        if (props.item.source === "vector_tiles") {
          layer["source-layer"] = props.item.layer_name;
        }
        map.value.addLayer(layer, beforeId || undefined);
      } else if (props.item.geometry_type === geomTypeLine) {
        let paint: StyleObject = {},
          layout: StyleObject = {};

        Object.keys(props.item.layer_style as LineStyles).forEach((key) => {
          const [category, ...nameStrings] = key.split("_");
          if (
            category === "paint" &&
            props.item.layer_style?.[key as keyof typeof props.item.layer_style]
          ) {
            paint[nameStrings.join("-")] = isString(
              (props.item.layer_style as LineStyles)[key as keyof LineStyles]
            )
              ? parseString(
                  (props.item.layer_style as LineStyles)[
                    key as keyof LineStyles
                  ] as string
                )
              : (props.item.layer_style as LineStyles)[key as keyof LineStyles];
          } else if (
            category === "layout" &&
            (props.item.layer_style as LineStyles)?.[key as keyof LineStyles]
          ) {
            layout[nameStrings.join("-")] = (
              props.item.layer_style as LineStyles
            )[key as keyof LineStyles];
          }
        });

        const layer: AddLayerObject = {
          id: props.item.layer_id,
          type: "line",
          source: props.item.layer_id,
          layout,
          paint,
        };
        if (props.item.source === "vector_tiles") {
          layer["source-layer"] = props.item.layer_name;
        }
        map.value.addLayer(layer, beforeId || undefined);
      }

      // emit("updateBeforeId", props.item.layer_id);
    }
  }
});

//cursor mode
watchEffect((onInvalidate) => {
  const onMouseEnter = () => {
    map.value!.getCanvas().style.cursor = "pointer";
  };
  const onMouseLeave = () => {
    map.value!.getCanvas().style.cursor = "";
  };

  if (
    map.value &&
    cursorMode.value === "default" &&
    (props.item.source === "vector_tiles" ||
      props.item.source === "external_vector") &&
    props.item.click_popup_columns?.length
  ) {
    map.value.on("mouseenter", props.item.layer_id, onMouseEnter);
    map.value.on("mouseleave", props.item.layer_id, onMouseLeave);
  }

  onInvalidate(() => {
    if (map.value) {
      map.value.off("mouseenter", props.item.layer_id, onMouseEnter);
      map.value.off("mouseleave", props.item.layer_id, onMouseLeave);
    }
  });
});
</script>

<template></template>
