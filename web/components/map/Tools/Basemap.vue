<script setup lang="ts">
import type { RasterTileSource, StyleSpecification } from "maplibre-gl";

type Basemap = {
  name: string;
  url: string;
  thumbnailUrl: string;
  type: string;
};

const store = useMapRef();
const { data: generalSettingsData } = await useGeneralSettings();
const { setCurrentBaseMap, map, mapLoad } = store;
const mapLayerStore = useMapLayer();
const basemapList = ref<null | Basemap[]>(null);
function isImgUrl(url: string) {
  const img = new Image();
  img.src = url;
  return new Promise((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
  });
}

watchEffect(async () => {
  const basemaps = [];
  if (Array.isArray(generalSettingsData.value?.data.basemaps)) {
    for (const basemap of generalSettingsData.value.data.basemaps) {
      let item: Record<string, string> = {
        name: basemap.name,
        url: basemap.url,
        type: basemap.type,
      };
      if (basemap.type === "raster") {
        item["thumbnailUrl"] = basemap.url
          .replace("{z}", "0")
          .replace("{x}", "0")
          .replace("{y}", "0");
      } else if (basemap.type === "tile") {
        const check = await isImgUrl(
          basemap.url.replace("tiles.json", "0/0/0.png")
        );
        if (check) {
          item["thumbnailUrl"] = basemap.url.replace("tiles.json", "0/0/0.png");
        } else {
          item["thumbnailUrl"] = basemap.url.replace("tiles.json", "0/0/0.jpg");
        }
      } else {
        const check = await isImgUrl(
          basemap.url.replace("style.json", "0/0/0.png")
        );
        if (check) {
          item["thumbnailUrl"] = basemap.url.replace("style.json", "0/0/0.png");
        } else {
          item["thumbnailUrl"] = basemap.url.replace("style.json", "0/0/0.jpg");
        }
      }
      basemaps.push(item as Basemap);
    }
  }
  basemaps.push({
    name: "World Imagery",
    url: `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    thumbnailUrl: `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/0/0/0`,
    type: "raster",
  });
  basemapList.value = basemaps;
});

const refreshActiveLayer = () => {
  setTimeout(() => {
    let current = JSON.parse(JSON.stringify(mapLayerStore.groupedActiveLayers));
    mapLayerStore.groupedActiveLayers = [...current];
  }, 500);
};

const activeTiles = ref<string>("");

onMounted(() => {
  const source = store.map?.getSource("basemap-sources");
  const basemapSource = source as maplibregl.RasterSourceSpecification;

  if (basemapSource.tiles?.[0]) {
    activeTiles.value = basemapSource.tiles[0];
  }
});

const handleChangeBasemap = async (name: string, url: string, type: string) => {
  activeTiles.value = url;
  if (map && mapLoad) {
    if (type === "raster") {
      map.setStyle({
        version: 8,
        sprite: window.location.origin + "/panel/sprites/sprite",
        // glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${mapApiKey}`,
        sources: {
          "basemap-sources": {
            type: "raster",
            tiles: [url],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: "basemap-tiles",
            type: "raster",
            source: "basemap-sources",
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      });
      refreshActiveLayer();
    } else if (type === "tile") {
      const tile: RasterTileSource = await $fetch(url);
      const style: StyleSpecification = {
        version: 8,
        sprite: window.location.origin + "/panel/sprites/sprite",
        // glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${mapApiKey}`,
        sources: {
          "basemap-sources": {
            type: "raster",
            tiles: tile.tiles,
            tileSize: 256,
          },
        },
        layers: [
          {
            id: "basemap-tiles",
            type: "raster",
            source: "basemap-sources",
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      };
      map.setStyle(style);
      refreshActiveLayer();
    } else {
      map.setStyle(url);
      refreshActiveLayer();
    }
    setCurrentBaseMap(name);
  }
};
</script>

<template>
  <div v-for="basemap in basemapList" :key="basemap.name">
    <button
      @click="handleChangeBasemap(basemap.name, basemap.url, basemap.type)"
      :class="[
        activeTiles === basemap.url && 'bg-grey-700',
        'group flex w-full items-center gap-3 rounded-sm p-2 text-xs text-grey-200 hover:bg-grey-700 cursor-pointer',
      ]"
    >
      <NuxtImg
        width="64px"
        height="64px"
        class="rounded-sm"
        :src="basemap.thumbnailUrl"
      />
      {{ basemap.name }}
    </button>
  </div>
</template>
