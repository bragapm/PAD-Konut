<script setup lang="ts">
import type { AddLayerObject } from "maplibre-gl";
import {
  geomTypeCircle,
  geomTypeLine,
  geomTypePolygon,
  geomTypeSymbol,
} from "~/constants";
import { isString, parseString } from "~/utils";
import type {
  VectorTiles,
  CircleStyles,
  FillStyles,
  LineStyles,
  LayerLists,
  LoadedGeoJson,
  SymbolStylesAdjusted,
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
const mapLayerStore = useMapLayer();
const { cursorMode } = storeToRefs(mapStore);
const { getLoadedGeoJsonData } = useIDB();

const props = defineProps<{
  renderedLayers: LayerLists[];
  item: VectorTiles | LoadedGeoJson | ExternalVector;
  order: number;
}>();

const currentToken = ref(authStore.accessToken);

const labelLayer = ref();

const fetchLabelColumn = async () => {
  const id = props.item.layer_id.split("_")[0];
  const req = await fetch<{
    data: {
      label_column: string;
    };
  }>(`/panel/items/vector_tiles/${id}?fields=label_columns`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + authStore.accessToken,
    },
  });
  const res = await req.json();
  if (res.data?.label_columns) {
    return { status: "success", data: res.data.label_columns };
  } else {
    return { data: "no data" };
  }
};

const fetchLabelLayerData = async () => {
  const req = await fetch<{
    data: {
      centroid: string;
    };
  }>(`/panel/items/sp_data_admin_provinsi?fields=centroid,wadmpr,jumlah_sppg`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + authStore.accessToken,
    },
  });
  const res = await req.json();
  if (res.data) {
    const geojson = {
      type: "FeatureCollection",
      features: res.data.map((data) => {
        const { centroid, ...properties } = data;
        return {
          type: "Feature",
          geometry: centroid,
          properties,
        };
      }),
    };
    return { status: "success", data: geojson };
  } else {
    return { data: "no data" };
  }
};

const addLabelLayer = async (
  geojson,
  minzoom = 4,
  maxzoom = 6,
  paint = {
    "text-color": "#ffffff",
    "text-halo-color": "#000000",
    "text-halo-width": 2,
    "text-halo-blur": 0.5,
  },
  layout = {
    visibility: "visible",

    "text-font": ["Noto Sans Regular"],
    "text-size": [
      "interpolate",
      ["linear"],
      ["zoom"],
      2,
      14, // at zoom level 2, size is 14
      10,
      18, // at zoom level 10, size is 18
      16,
      24, // at zoom level 16+, size is 24
    ],

    "text-max-width": 8,
    "text-padding": 50,
    "text-allow-overlap": true,
    "text-ignore-placement": false,
    "text-anchor": "center",
    "symbol-placement": "point", // or "line" for roads
  }
) => {
  const labelColumnRes = await fetchLabelColumn();
  if (labelColumnRes.data === "no data") return; // stop here, it means we dont need to add label layer

  const labelColumnList: string[] = labelColumnRes.data.split(",");

  const layoutCopy = structuredClone(layout);
  const paintCopy = structuredClone(paint);

  // build dynamic text field based on label column res
  const dynamicTextField = [
    "concat",
    ...labelColumnList.flatMap((label, index) => {
      // Add newline between labels except after the last one
      const parts = [["coalesce", ["get", label], `No ${label}`]];
      if (index < labelColumnList.length - 1) parts.push(`\n`);
      return parts;
    }),
  ];

  layoutCopy["text-field"] = ["step", ["zoom"], "", 2, dynamicTextField];

  if (
    !map.value?.getSource(
      `${props.item.layer_name}-${props.item.layer_id}-label`
    )
  ) {
    map.value?.addSource(
      `${props.item.layer_name}-${props.item.layer_id}-label`,
      {
        type: "geojson",
        data: geojson,
      }
    );
  }

  const layer = {
    id: `${props.item.layer_name}-${props.item.layer_id}-label`,
    type: "symbol",
    source: `${props.item.layer_name}-${props.item.layer_id}-label`,
    layout: layoutCopy,
    paint: paintCopy,
    minzoom: minzoom,
    maxzoom: maxzoom,
  };

  map.value?.addLayer(layer);
};

const addMultiBackgroundLabelLayer = (
  source: string,
  properties: string,
  images: any[]
) => {
  if (!map.value) return;

  const iconImageExpression = [
    "match",
    ["get", properties], // property to check
    ...images.flatMap((item) => [item.condition, item.directus_files_id]),
    "a3a85e94-e87d-47f9-a617-ee8db6b94192", // fallback
  ];

  const layer = {
    id: `${props.item.layer_name}-${props.item.layer_id}-label-bg`,
    type: "symbol",
    source: source,
    "source-layer": props.item.layer_name,
    layout: {
      "icon-image": "9db2b8f9-b9ed-4589-a3c3-4b440798678f",
      "icon-size": 0.7,

      "icon-offset": [30, 80],
      "icon-allow-overlap": true,
      visibility: "visible",
    },
    paint: {
      "icon-color": "#ffffff",
      "icon-opacity": [
        "step",
        ["zoom"],
        0, // zoom < 14: invisible
        14,
        0.5, // zoom >= 14: semi-transparent
      ],
    },
  };

  map.value.addLayer(layer);
};

function normalizePaintForCircle(originalPaint: Record<string, any>) {
  const circlePaint: Record<string, any> = {};

  // Convert icon-related properties → circle equivalents
  if (originalPaint["icon-color"]) {
    circlePaint["circle-color"] = originalPaint["icon-color"];
  }

  if (originalPaint["icon-opacity"]) {
    circlePaint["circle-opacity"] = originalPaint["icon-opacity"];
  }

  // Optional halo → stroke
  if (originalPaint["icon-halo-color"]) {
    circlePaint["circle-stroke-color"] = originalPaint["icon-halo-color"];
  }

  if (originalPaint["circle-radius"]) {
    circlePaint["circle-radius"] = originalPaint["circle-radius"];
  }

  // Add any defaults or computed fallbacks
  if (!circlePaint["circle-radius"]) {
    circlePaint["circle-radius"] = 10;
  }

  return circlePaint;
}

watchEffect(async () => {
  if (map.value) {
    if (!map.value.getSource(props.item.layer_id)) {
      if (map.value && props.item.source === "vector_tiles") {
        let endpoint = "/panel/mvt/";
        if (
          (props.item.layer_style as CircleStyles | SymbolStyles).is_clustered
        ) {
          endpoint = "/panel/mvt/cluster/";
        }

        // FOR FILTER LAYER
        // Always ensure _filter source exists
        // const filterSourceId = props.item.layer_name + "_filter";
        // if (
        //   !map.value.getSource(filterSourceId) &&
        //   props.item.layer_name === "perusahaan_simpel"
        // ) {
        //   map.value.addSource(filterSourceId, {
        //     type: "vector",
        //     tiles: [
        //       `${window.location.origin}/panel/mvt/${
        //         props.item.layer_name
        //       }?z={z}&x={x}&y={y}${
        //         authStore.accessToken
        //           ? "&access_token=" + authStore.accessToken
        //           : ""
        //       }`,
        //     ],
        //     minzoom: props.item.minzoom || 5,
        //     maxzoom: props.item.maxzoom || 15,
        //   });
        // }

        // ✅ Ensure main (layer_id) source exists
        if (!map.value.getSource(props.item.layer_id)) {
          map.value.addSource(props.item.layer_id, {
            type: "vector",
            tiles: [
              `${window.location.origin}${endpoint}${
                props.item.layer_name
              }?z={z}&x={x}&y={y}${
                authStore.accessToken
                  ? "&access_token=" + authStore.accessToken
                  : ""
              }`,
            ],
            minzoom: props.item.minzoom || 5,
            maxzoom: props.item.maxzoom || 15,
          });
        }
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
                Authorization: `Bearer ${authStore.accessToken}`,
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
        let endpoint = "/panel/mvt/";
        if (
          (props.item.layer_style as CircleStyles | SymbolStyles)
            .is_clustered === true
        ) {
          endpoint = "/panel/mvt/cluster/";
        }

        (map.value.getSource(props.item.layer_id) as any)!.setTiles([
          window.location.origin +
            endpoint +
            props.item.layer_name +
            "?z={z}&x={x}&y={y}" +
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
          minzoom: props.item.minzoom || 5,
          maxzoom: props.item.maxzoom || 15,
        };
        if ((props.item.layer_style as CircleStyles).is_clustered) {
          const clusterPaint = { ...paint };
          clusterPaint["circle-radius"] = 20;
          map.value.addLayer({
            id: `${props.item.layer_id}-cluster`,
            source: props.item.layer_id,
            "source-layer": props.item.layer_name,
            type: "circle",
            filter: [">", ["get", "count"], 1],
            paint: clusterPaint,
            layout: {
              visibility: "visible",
            },
          });

          map.value.addLayer({
            id: `${props.item.layer_id}-label`,
            source: props.item.layer_id,
            "source-layer": props.item.layer_name,
            type: "symbol",
            filter: [">", ["get", "count"], 1],

            layout: {
              "text-field": ["get", "count"],
              "text-size": 12,
              "text-allow-overlap": true,
              visibility: "visible",
            },
            paint: {
              "text-color": "#ffffff",
            },
          });

          map.value.addLayer({
            id: props.item.layer_id,
            source: props.item.layer_id,
            "source-layer": props.item.layer_name,
            type: "symbol",
            filter: ["==", ["get", "count"], 1],
            layout: {
              "icon-allow-overlap": true,
              "icon-image": props.item.layer_style.layout_icon_images,
              visibility: "visible",
            },
          });
        } else {
          if (layer.id === "reports") {
            layer.paint!["circle-color"] = "#fc2003"; // Simple red color
          }

          if (props.item.source === "vector_tiles") {
            layer["source-layer"] = props.item.layer_name;
          }
          map.value.addLayer(layer, beforeId || undefined);
        }
      } else if (props.item.geometry_type === geomTypeSymbol) {
        let paint: StyleObject = {},
          layout: StyleObject = {};

        Object.keys(props.item.layer_style).forEach((key) => {
          const [category, ...nameStrings] = key.split("_");

          // console.log("LAYER STYLE", props.item.layer_style);

          if (
            category === "paint" &&
            props.item.layer_style?.[key as keyof typeof props.item.layer_style]
          ) {
            paint[nameStrings.join("-")] = isString(
              (props.item.layer_style as SymbolStylesAdjusted)[
                key as keyof SymbolStylesAdjusted
              ]
            )
              ? parseString(
                  (props.item.layer_style as SymbolStylesAdjusted)[
                    key as keyof SymbolStylesAdjusted
                  ] as string
                )
              : (props.item.layer_style as SymbolStylesAdjusted)[
                  key as keyof SymbolStylesAdjusted
                ];
          } else if (
            category === "layout" &&
            key !== "layout_icon_image" &&
            key !== "layout_icon_images" &&
            (props.item.layer_style as SymbolStylesAdjusted)?.[
              key as keyof SymbolStylesAdjusted
            ]
          ) {
            layout[nameStrings.join("-")] = isString(
              (props.item.layer_style as SymbolStylesAdjusted)[
                key as keyof SymbolStylesAdjusted
              ]
            )
              ? parseString(
                  (props.item.layer_style as SymbolStylesAdjusted)[
                    key as keyof SymbolStylesAdjusted
                  ] as string
                )
              : (props.item.layer_style as SymbolStylesAdjusted)[
                  key as keyof SymbolStylesAdjusted
                ];
          } else if (
            category === "icon" &&
            key === "icon_image_id" &&
            (props.item.layer_style as SymbolStylesAdjusted)?.[
              key as keyof SymbolStylesAdjusted
            ]
          ) {
            layout["icon-image"] = (
              props.item.layer_style as SymbolStylesAdjusted
            )[key as keyof SymbolStylesAdjusted];
          } else if (key === "layout_icon_image") {
            const img = (props.item.layer_style as any).layout_icon_image;

            if (img && img.id) {
              layout["icon-image"] = img.id;
            }
          }
        });

        // FOR MULTI SYMBOL
        if ((props.item.layer_style as SymbolStylesAdjusted).is_multi_symbol) {
          const iconImageExpression = [
            "match",
            ["get", props.item.symbol_class_columns], // property to check
            ...(
              props.item.layer_style as SymbolStylesAdjusted
            ).layout_icon_images.flatMap((item) => [
              item.condition,
              item.directus_files_id,
            ]),
            (
              props.item.layer_style.layout_icon_images as SymbolStylesAdjusted
            )?.find((el) => el.condition === "default")?.directus_files_id ??
              "a3a85e94-e87d-47f9-a617-ee8db6b94192", // fallback
          ];
          layout["icon-image"] = iconImageExpression;
        }

        // // ADDING LABEL DYNAMICALLY
        // if (props.item.label_columns) {
        //   layout["text-field"] = [
        //     "coalesce",
        //     ["get", props.item.label_columns],
        //     "No Label",
        //   ];
        //   layout["text-font"] = ["Noto Sans Regular"];
        //   layout["text-size"] = 12;
        //   layout["text-offset"]= [0, 6];

        // }

        // console.log("LAYOUT SYMBOL AT VECTOR", layout);

        const layer: AddLayerObject = {
          id: props.item.layer_id,
          type: "symbol",
          source: props.item.layer_id,
          layout,
          paint,
          minzoom: props.item.minzoom || 5,
          maxzoom: props.item.maxzoom || 15,
        };

        if ((props.item.layer_style as CircleStyles).is_clustered) {
          const clusterPaint = normalizePaintForCircle(paint);
          clusterPaint["circle-radius"] = 20;
          map.value.addLayer({
            id: `${props.item.layer_id}-cluster`,
            source: props.item.layer_id,
            "source-layer": props.item.layer_name,
            type: "circle",
            filter: [">", ["get", "count"], 1],
            paint: clusterPaint,
            layout: {
              visibility: "visible",
            },
          });

          map.value.addLayer({
            id: `${props.item.layer_id}-label`,
            source: props.item.layer_id,
            "source-layer": props.item.layer_name,
            type: "symbol",
            filter: [">", ["get", "count"], 1],

            layout: {
              "text-field": ["get", "count"],
              "text-size": 12,
              "text-allow-overlap": true,
              visibility: "visible",
            },
            paint: {
              "text-color": "#ffffff",
            },
          });

          map.value.addLayer({
            id: props.item.layer_id,
            source: props.item.layer_id,
            "source-layer": props.item.layer_name,
            type: "symbol",
            filter: ["==", ["get", "count"], 1],

            layout: {
              "icon-allow-overlap": true,
              "icon-image": (props.item.layer_style as SymbolStyles)
                .layout_icon_image.id,
              visibility: "visible",
            },
          });

          // Debug: Verify the layer was added
          // setTimeout(() => {
          //   const addedLayer = map.value.getLayer(filterLayerId);
          //   console.log("✅ Filter layer verification:", {
          //     layerId: filterLayerId,
          //     exists: !!addedLayer,
          //     source: addedLayer?.source,
          //     sourceLayer: (addedLayer as any)?.["source-layer"],
          //   });
          // }, 100);
        } else {
          if (layer.id === "reports") {
            layer.paint!["circle-color"] = "#fc2003"; // Simple red color
          }

          if (props.item.source === "vector_tiles") {
            layer["source-layer"] = props.item.layer_name;
          }
          map.value.addLayer(layer, beforeId || undefined);
        }

        // if ((props.item.layer_style as SymbolStylesAdjusted).is_multi_symbol) {
        //   const iconImages = (props.item.layer_style as SymbolStylesAdjusted)
        //     .layout_icon_images;
        //   addMultiBackgroundLabelLayer(
        //     props.item.layer_id,
        //     "status_mutu_air",
        //     iconImages
        //   );
        // }
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
          minzoom: props.item.minzoom || 5,
          maxzoom: props.item.maxzoom || 15,
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
          minzoom: props.item.minzoom || 5,
          maxzoom: props.item.maxzoom || 15,
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
