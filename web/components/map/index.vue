<script setup lang="ts">
import { Map, GeolocateControl } from "maplibre-gl";
import type { LngLatBoundsLike, StyleSpecification } from "maplibre-gl";
import type { Raw } from "vue";
import { shallowRef, onMounted, onUnmounted, markRaw } from "vue";
import { useMapData, useSharedMap } from "~/utils";
import addRasterColorProtocol from "~/utils/addRasterColorProtocol";
import bbox from "@turf/bbox";

const { isLoading, data: mapData } = await useMapData();

const sharedMap = await useSharedMap();

const mapContainer = shallowRef<null | HTMLElement>(null);
const map = shallowRef<null | Raw<Map>>(null);
const geolocate = shallowRef<null | Raw<GeolocateControl>>(null);
const store = useMapRef();
const { setMapLoad, setMapRef, setGeolocateRef } = store;

//map init
onMounted(async () => {
  setMapLoad(false);
  const { data: generalSettings } = await useGeneralSettings();
  const style: StyleSpecification = {
    version: 8,
    sprite: window.location.origin + "/panel/sprites/sprite",
    // glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${mapApiKey}`,
    sources: {
      "basemap-sources": {
        type: "raster",
        tiles: [
          generalSettings.value?.data?.basemaps?.[0]?.url ??
            "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: "basemap-tiles",
        type: "raster",
        source: "basemap-sources",
        minzoom: 0,
        maxzoom: 24,
      },
    ],
  };
  addRasterColorProtocol();
  map.value = markRaw(
    new Map({
      container: mapContainer.value!,
      style,
      bounds:
        sharedMap?.value?.data.map_state.boundArray ||
        (bbox(
          mapData?.value?.data.initial_map_view || [
            [95.01, -11.01], // Southwest coordinates (longitude, latitude)
            [141.02, 6.08], // Northeast coordinates (longitude, latitude)
          ] // Indonesia Bounds
        ) as LngLatBoundsLike),
    })
  );

  geolocate.value = markRaw(
    new GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
    })
  );

  setMapRef(map.value);
  setGeolocateRef(geolocate.value);
  map.value.on("load", () => {
    setMapLoad(true);
    map.value!.addImage(
      "pulsing-dot",
      createPulsingDot({
        map: map.value!,
        size: 90,
        strokeStyle: getBrandColor("200"),
      }),
      {
        pixelRatio: 2,
      }
    );
  });
});
onUnmounted(() => {
  setMapLoad(false);
  setMapRef(null);
  setGeolocateRef(null);
  map.value?.remove();
});

// get active layer list
const layerStore = useMapLayer();
const { fetchActiveLayers } = layerStore;
fetchActiveLayers();

const mapStore = useMap();
const { highlightedLayers, selectedLayerId } = storeToRefs(mapStore);
</script>

<template>
  <div class="map-wrap">
    <!-- <a href="https://www.maptiler.com" class="watermark"
      ><img
        src="https://api.maptiler.com/resources/logo.svg"
        alt="MapTiler logo"
    /></a> -->
    <div class="map" ref="mapContainer"></div>
    <MapLayer v-if="store.mapLoad" />
    <MapHighlightedLayer
      v-if="Object.keys(highlightedLayers).length"
      v-for="item in Object.values(highlightedLayers)"
      :item="item"
    />
    <MapPopup />
    <MapSelectedLayer v-if="map && selectedLayerId" />
  </div>
</template>

<style scoped>
@import "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";

.map-wrap {
  position: relative;
  width: 100%;
  height: calc(100vh); /* calculate height of the screen minus the heading */
}

.map {
  position: absolute;
  width: 100%;
  height: 100%;
}

.watermark {
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 999;
}
</style>
