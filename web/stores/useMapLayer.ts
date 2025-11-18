import type {
  VectorTiles,
  RasterTiles,
  CircleStyles,
  FillStyles,
  LineStyles,
  LayerGroupedByCategory,
  LayerLists,
  ThreeDTiles,
  ThreeDTilesConfig,
  RasterTilesConfig,
  VectorTilesConfig,
  LoadedGeoJson,
  LayerConfigLists,
  ThreeDLayerCenter,
  SymbolStylesConfig,
  ExternalTilesConfig,
  ExternalTiles,
} from "~/utils/types";
import {
  geomTypeCircle,
  geomTypeLine,
  geomTypePolygon,
  geomTypeRaster,
  geomTypeSymbol,
  geomTypeTerrain,
  geomTypeThreeD,
  uncategorizedAlias,
} from "~/constants";
import { isString, parseString } from "~/utils";

export const useMapLayer = defineStore("maplayer", () => {
  const authStore = useAuth();
  const mapRefStore = useMapRef();
  const mapLayerStore = useMapLayer();
  const groupedActiveLayers = ref<LayerGroupedByCategory[]>([]);

  const handleVisibility = (
    groupIndex: number,
    layerIndex: number,
    visibility: string
  ) => {
    if (groupedActiveLayers.value) {
      const prev = groupedActiveLayers.value;
      const selected = prev[groupIndex].layerLists[layerIndex];
      selected.layer_style.layout_visibility = visibility;
      groupedActiveLayers.value = prev;
    }
  };

  const updateLayerOpacity = (
    groupIndex: number,
    layerIndex: number,
    opacity: number
  ) => {
    if (groupedActiveLayers.value) {
      const prev = groupedActiveLayers.value;
      const selected = prev[groupIndex].layerLists[layerIndex];
      if (selected.source === "vector_tiles") {
        let updatedOpacity = opacity;
        if (selected.geometry_type === geomTypeCircle) {
          (selected.layer_style as CircleStyles).paint_circle_opacity =
            updatedOpacity.toString();
        } else if (selected.geometry_type === geomTypeLine) {
          (selected.layer_style as LineStyles).paint_line_opacity =
            updatedOpacity.toString();
        } else if (selected.geometry_type === geomTypePolygon) {
          (selected.layer_style as FillStyles).paint_fill_opacity =
            updatedOpacity.toString();
        }
      } else if (selected.source === "raster_tiles") {
        (selected as RasterTiles).opacity = opacity;
      } else if (selected.source === "three_d_tiles") {
        (selected as ThreeDTiles).opacity = opacity;
      }

      groupedActiveLayers.value = prev;
    }
  };

  const updateLayerProperty = (
    groupIndex: number,
    layerIndex: number,
    propType: "paint" | "layout" | "3d",
    propName: string,
    propValue: string | number | boolean | null,
    layerId: string
  ) => {
    if (groupedActiveLayers.value) {
      let newValue;

      if (isString(propValue)) {
        newValue = parseString(propValue as string);
      } else {
        newValue = propValue;
      }
      const prev = groupedActiveLayers.value;
      const selected: LayerLists = prev[groupIndex].layerLists[layerIndex];
      if (propType !== "3d") {
        if (propName !== "icon-image") {
          (
            selected.layer_style as Record<
              string,
              string | number | boolean | null
            >
          )[`${propType}_` + propName.replace(/-/g, "_")] = propValue;
        } else {
          (
            selected.layer_style as Record<
              string,
              string | number | boolean | null
            >
          )["icon_image_id"] = propValue;
        }
      } else {
        (selected as Record<string, any>)[propName] = propValue;
      }

      groupedActiveLayers.value = prev;
      if (mapRefStore.map) {
        if (propType === "paint") {
          mapRefStore.map.setPaintProperty(layerId, propName, newValue);
        } else if (propType === "layout") {
          mapRefStore.map.setLayoutProperty(layerId, propName, newValue);
        }
      }
    }
  };

  const sortLayer = (layers: LayerLists[], order: "asc" | "desc" = "asc") => {
    return layers.sort((a, b) => {
      let nameA: string, nameB: string;
      if (a.source === "vector_tiles") {
        nameA = a.layer_alias?.toUpperCase() || a.layer_name.toUpperCase();
      } else {
        nameA = a.layer_alias.toUpperCase();
      }
      if (b.source === "vector_tiles") {
        nameB = b.layer_alias?.toUpperCase() || b.layer_name.toUpperCase();
      } else {
        nameB = b.layer_alias.toUpperCase();
      }
      if (order === "asc") {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
  };

  const getLayersArr = (layers: {
    vectorTiles?: {
      data: LayerConfigLists;
    };
    rasterTiles?: {
      data: LayerConfigLists;
    };
    threeDTiles?: {
      data: LayerConfigLists;
    };
    externalTiles?: {
      data: LayerConfigLists;
    };
  }) => {
    const layersArr: LayerLists[] = [];
    for (const [key, value] of Object.entries(layers)) {
      value.data.forEach((el) => {
        if (key === "vectorTiles") {
          const item = JSON.parse(JSON.stringify(el as VectorTilesConfig));
          delete item.circle_style;
          delete item.symbol_style;
          delete item.line_style;
          delete item.fill_style;
          if ((el as VectorTilesConfig).circle_style) {
            layersArr.push({
              ...item,
              layer_id: item.layer_id + "_circle",
              layer_alias: item.layer_alias || item.layer_name,
              layer_style: (el as VectorTilesConfig)
                .circle_style as CircleStylesConfig,
              source: "vector_tiles",
              geometry_type: geomTypeCircle,
              dimension: "2D",
            });
          }
          if ((el as VectorTilesConfig).symbol_style) {
            layersArr.push({
              ...item,
              layer_id: item.layer_id + "_symbol",
              layer_alias: item.layer_alias || item.layer_name,
              layer_style: {
                ...((el as VectorTilesConfig)
                  .symbol_style as SymbolStylesConfig),
                icon_image_id: (el as VectorTilesConfig)?.symbol_style
                  ?.layout_icon_image?.id,
                icon_image_title: (el as VectorTilesConfig)?.symbol_style
                  ?.layout_icon_image?.title,
              },
              source: "vector_tiles",
              geometry_type: geomTypeSymbol,
              dimension: "2D",
            });
          }
          if ((el as VectorTilesConfig).line_style) {
            layersArr.push({
              ...item,
              layer_id: item.layer_id + "_line",
              layer_alias: item.layer_alias || item.layer_name,
              layer_style: (el as VectorTilesConfig)
                .line_style as LineStylesConfig,
              source: "vector_tiles",
              geometry_type: geomTypeLine,
              dimension: "2D",
            });
          }
          if ((el as VectorTilesConfig).fill_style) {
            layersArr.push({
              ...item,
              layer_id: item.layer_id + "_fill",
              layer_alias: item.layer_alias || item.layer_name,
              layer_style: (el as VectorTilesConfig)
                .fill_style as FillStylesConfig,
              source: "vector_tiles",
              geometry_type: geomTypePolygon,
              dimension: "2D",
            });
          }
        } else if (key === "rasterTiles") {
          const item = el as RasterTilesConfig;
          let RasterTilesItem: RasterTiles;
          RasterTilesItem = {
            layer_alias: item.layer_alias,
            layer_id: item.layer_id,
            bounds: item.bounds,
            minzoom: item.minzoom,
            maxzoom: item.maxzoom,
            terrain_rgb: item.terrain_rgb,
            source: "raster_tiles",
            opacity: 1,
            layer_style: {
              layout_visibility: item.visible ? "visible" : "none",
            },
            geometry_type: item.terrain_rgb ? geomTypeTerrain : geomTypeRaster,
            dimension: "2D",
            category: item.category,
            protocol: item.protocol,
            color_steps: item.color_steps,
            ...(item.terrain_rgb && { category: { category_name: "Terrain" } }),
          };
          layersArr.push(RasterTilesItem);
        } else if (key === "threeDTiles") {
          const item = el as ThreeDTilesConfig;
          let ThreeDTilesItem: ThreeDTiles;
          ThreeDTilesItem = {
            source: "three_d_tiles",
            opacity: item.opacity,
            point_size: item.point_size,
            point_color: item.point_color,
            layer_style: {
              layout_visibility: item.visible ? "visible" : "none",
            },
            geometry_type: geomTypeThreeD,
            layer_alias: item.layer_alias,
            layer_id: item.layer_id,
            category: { category_name: "3D" },
            dimension: "3D",
          };
          layersArr.push(ThreeDTilesItem);
        } else if (key === "externalTiles") {
          const item = el as ExternalTilesConfig;
          let ExternalTilesItem: ExternalTiles;
          ExternalTilesItem = {
            layer_alias: item.layer_alias,
            layer_id: item.layer_id,
            bounds: item.bounds,
            minzoom: item.minzoom,
            maxzoom: item.maxzoom,
            source: "external_tiles",
            opacity: 1,
            layer_style: {
              layout_visibility: item.visible ? "visible" : "none",
            },
            category: item.category,
            geometry_type: geomTypeRaster,
            tile_type: "raster",
            is_tilejson: item.is_tilejson,
            tile_url: item.tile_url,
            tile_size: item.tile_size,
          };
          layersArr.push(ExternalTilesItem);
        }
      });
    }

    //sort by layer_alias in ascending order
    sortLayer(layersArr);

    return layersArr;
  };

  const groupLayerByCategory = (layerLists: LayerLists[]) => {
    const layerGroupedByCategory = layerLists.reduce(
      (group: LayerGroupedByCategory[], item) => {
        const existingCategory = group.find((group: LayerGroupedByCategory) => {
          let categoryName = "";
          if (item.category === null) {
            categoryName = uncategorizedAlias;
          } else if (item.category?.category_name) {
            categoryName = item.category.category_name;
          }
          return group.label === categoryName;
        });

        if (existingCategory) {
          existingCategory.layerLists.push(item);
        } else {
          if (item.category === null) {
            group.push({
              label: uncategorizedAlias,
              layerLists: [item],
              defaultOpen: false,
            });
          } else if (item.category !== null && item.category?.category_name) {
            group.push({
              label: item.category.category_name,
              layerLists: [item],
              defaultOpen: false,
            });
          }
        }

        return group.sort((a, b) => {
          const nameA = a.label.toUpperCase(); // ignore upper and lowercase
          const nameB = b.label.toUpperCase(); // ignore upper and lowercase

          // '3D' group should always come first
          if (nameA === "3D") return -1;
          if (nameB === "3D") return 1;

          // 'Terrain' group should always come last
          if (nameA === "TERRAIN") return 1;
          if (nameB === "TERRAIN") return -1;

          return nameA.localeCompare(nameB);
        });
      },
      []
    );
    return layerGroupedByCategory;
  };

  const fetchActiveLayers = async () => {
    try {
      const { data: layers, pending } = await useAsyncData(
        "map-layer-tiles",
        async () => {
          const [vectorTiles, rasterTiles, threeDTiles, externalTiles] =
            await Promise.all<{
              data: LayerConfigLists;
            }>([
              $fetch(
                "/panel/items/vector_tiles?fields=layer_id,layer_name,geometry_type,bounds,minzoom,maxzoom,layer_alias,hover_popup_columns,click_popup_columns,image_columns,active,description,preview,category.*,fill_style.*,line_style.*,circle_style.*,symbol_style.*.*&filter[active][_eq]=true&sort=layer_name",
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + authStore.accessToken,
                  },
                }
              ),
              $fetch(
                "/panel/items/raster_tiles?fields=layer_id,bounds,minzoom,maxzoom,terrain_rgb,layer_alias,active,visible,protocol,color_steps,category.*,preview,description&filter[active][_eq]=true&sort=layer_alias",
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + authStore.accessToken,
                  },
                }
              ),
              $fetch(
                "/panel/items/three_d_tiles?fields=layer_id,layer_alias,active,visible,opacity,point_color,point_size,category.*,preview,description&filter[active][_eq]=true&sort=layer_alias",
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + authStore.accessToken,
                  },
                }
              ),
              $fetch(
                "/panel/items/external_tiles?fields=visible,layer_id,tile_type,is_tilejson,tile_url,bounds,minzoom,maxzoom,tile_size,layer_alias,category.*,listed,active&filter[active][_eq]=true&sort=layer_alias",
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + authStore.accessToken,
                  },
                }
              ),
            ]);

          return { vectorTiles, rasterTiles, threeDTiles, externalTiles };
        }
      );

      const allLayerData: LayerLists[] = [];

      if (layers.value) {
        allLayerData.push(...getLayersArr(layers.value));
      }

      if (allLayerData) {
        groupedActiveLayers.value = groupLayerByCategory(allLayerData);
      }
    } catch (error) {
      return [];
    }
  };

  const threeDLayerCenter = ref<ThreeDLayerCenter[]>([]);

  //remove item from groupedActiveLayer
  const removeLayer = (layerItem: LayerLists) => {
    let groupName = layerItem.category
      ? layerItem.category.category_name
      : uncategorizedAlias;
    let groupIndex = groupedActiveLayers.value?.findIndex(
      (el) => el.label === groupName
    );
    let layerIndex = groupedActiveLayers.value?.[
      groupIndex as number
    ].layerLists.findIndex((el) => el.layer_id === layerItem.layer_id);

    if (
      groupedActiveLayers.value?.[groupIndex as number].layerLists.length === 1
    ) {
      groupedActiveLayers.value?.splice(groupIndex as number, 1);
    } else {
      groupedActiveLayers.value?.[groupIndex as number]?.layerLists.splice(
        layerIndex as number,
        1
      );
    }

    if (layerItem.source !== "three_d_tiles") {
      mapRefStore.map?.removeLayer(layerItem.layer_id);
    }
  };

  const addLayer = (
    layerItem: VectorTiles | RasterTiles | ThreeDTiles | LoadedGeoJson
  ) => {
    let groupName = layerItem.category?.category_name || uncategorizedAlias;

    let groupIndex = mapLayerStore.groupedActiveLayers.findIndex(
      (el) => el.label === groupName
    );
    if (groupIndex !== -1) {
      mapLayerStore.groupedActiveLayers[groupIndex].layerLists.push(layerItem);
    } else {
      if (
        mapLayerStore.groupedActiveLayers.findIndex(
          (el) => el.label === "Terrain"
        ) !== -1
      ) {
        mapLayerStore.groupedActiveLayers.splice(-1, 0, {
          label: groupName,
          layerLists: [layerItem],
          defaultOpen: false,
        });
        // mapLayerStore.groupedActiveLayers.push({
        //   label: groupName,
        //   layerLists: [layerItem],
        //   defaultOpen: false,
        // });
      } else {
        mapLayerStore.groupedActiveLayers.push({
          label: groupName,
          layerLists: [layerItem],
          defaultOpen: false,
        });
      }
    }
  };

  return {
    fetchActiveLayers,
    handleVisibility,
    groupedActiveLayers,
    updateLayerOpacity,
    groupLayerByCategory,
    threeDLayerCenter,
    removeLayer,
    updateLayerProperty,
    sortLayer,
    addLayer,
    getLayersArr,
  };
});
