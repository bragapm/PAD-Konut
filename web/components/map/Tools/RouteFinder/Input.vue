<script setup lang="ts">
import { refDebounced } from "@vueuse/core";
import { useQuery } from "@tanstack/vue-query";
import maplibregl from "maplibre-gl";
import { orsApiKey } from "~/constants";
import type { LngLatBoundsLike, MapMouseEvent } from "maplibre-gl";
import IcTrash from "~/assets/icons/ic-trash.svg";
import IcCircle from "~/assets/icons/ic-circle.svg";
import IcMarker from "~/assets/icons/ic-marker-stroked.svg";

const props = defineProps<{
  item: { id: string; feature: GeoJSON.Feature | null; label?: string };
  endPoint: boolean;
}>();

const directionStore = useDirection();
const { updateLocations, deleteLocationsById } = directionStore;
const { focusedInputId, markerRef } = storeToRefs(directionStore);
const mapStore = useMapRef();
const { map } = mapStore;

const loading = ref(false);
const selected = ref<any>(props.item);
const focused = ref(false);

// async function reverseGeocode(lon: number, lat: number) {
//   const res = await fetch(
//     // boundary.country=ID&sources=openstreetmap&boundary.circle.radius=1&size=1&layers=vanue,address,street&
//     "https://api.openrouteservice.org/geocode/reverse?boundary.country=ID&sources=openstreetmap&boundary.circle.radius=0.1&size=1&point.lon=" +
//       lon +
//       "&point.lat=" +
//       lat +
//       "&api_key=" +
//       orsApiKey
//   );
//   const result = await res.json();
//   if (result.features && result.features.length > 0) {
//     const label =
//       result.features[0]?.properties?.name +
//       (result.features[0]?.properties?.region
//         ? ", " + result.features[0]?.properties?.region
//         : "");
//     selected.value = {
//       id: props.item.id,
//       feature: result.features[0],
//       label: label,
//     };
//     updateLocations(props.item.id, result.features[0], label);
//   }
// }

const searchTerm = ref("");
const searchTermDebounced = refDebounced(searchTerm, 200);

const {
  isPending,
  isError,
  data: geocodeData,
  isFetching: isFetchingGeocode,
  error,
} = useQuery({
  queryKey: computed(() => [props.item.id, searchTermDebounced.value]),
  queryFn: async () => {
    const res = await $fetch<{
      bbox: any;
      features: any;
      geocoding: any;
      type: any;
    }>(
      "https://api.openrouteservice.org/geocode/autocomplete?boundary.country=ID&sources=openstreetmap&text=" +
        searchTermDebounced.value +
        "&api_key=" +
        orsApiKey
    );
    console.log("res", res);
    return res.features?.map((feature: any) => ({
      value: feature.properties.id,
      feature: feature,
      label:
        feature?.properties?.name +
        (feature?.properties?.region ? ", " + feature?.properties?.region : ""),
    }));
  },
  enabled: computed(() => searchTermDebounced.value.length > 0),
});

watchEffect(() => {
  selected.value = props.item;
});

const handleFocused = () => {
  focused.value = true;
  focusedInputId.value = props.item.id;
};

const blurWithDelayed = () => {
  setTimeout(() => {
    focused.value = false;
  }, 100);
};

const handleClickOnMap = (e: MapMouseEvent) => {
  if (markerRef.value) {
    markerRef.value.setLngLat([e.lngLat.lng, e.lngLat.lat]);
  } else {
    markerRef.value = markRaw(
      new maplibregl.Marker()
        .setLngLat([e.lngLat.lng, e.lngLat.lat])
        .addTo(map!)
    );
  }

  const label = `${e.lngLat.lng}, ${e.lngLat.lat}`;
  selected.value = {
    id: props.item.id,
    feature: { geometry: { coordinates: [e.lngLat.lng, e.lngLat.lat] } },
    label: label,
  };
  updateLocations(
    props.item.id,
    {
      type: "Feature",
      geometry: { coordinates: [e.lngLat.lng, e.lngLat.lat] },
    } as GeoJSON.Feature,
    label
  );
  // reverseGeocode(e.lngLat.lng, e.lngLat.lat);

  focusedInputId.value = null;
};

watchEffect((onInvalidate) => {
  if (map && focusedInputId.value === props.item.id) {
    map.on("click", handleClickOnMap);
  }
  onInvalidate(() => {
    if (map && focusedInputId.value !== props.item.id) {
      map.off("click", handleClickOnMap);
    }
  });
});
</script>

<template>
  <div class="flex items-center gap-2">
    <div>
      <IcCircle
        v-if="!endPoint"
        :class="['text-grey-50 w-3 h-2']"
        :fontControlled="false"
      />
      <IcMarker
        v-else
        :class="['text-brand-500 w-3 h-3']"
        :fontControlled="false"
      />
    </div>
    <div class="flex-1 flex gap-2">
      <UInputMenu
        v-model:search-term="searchTerm"
        v-model="selected"
        :items="geocodeData"
        :loading="isFetchingGeocode"
        @focus="handleFocused"
        @blur="blurWithDelayed"
        @update:modelValue=" (el:any) => {
          updateLocations(item.id,el.feature,el.label)
          mapStore.map?.fitBounds(el.feature.bbox as LngLatBoundsLike, { maxZoom:
          17, padding: 100, }); }
        "
        placeholder="Search location or click on map"
        trailing
        :content="{
          side: 'top-start',
        }"
        class="w-full"
        color="gray"
        variant="subtle"
        size="xs"
      />
      <button
        v-if="focused"
        @click="
          () => {
            deleteLocationsById(item.id);
            selected = {};
          }
        "
      >
        <IcTrash :class="['text-brand-500 w-3 h-3']" :fontControlled="false" />
      </button>
    </div>
  </div>
</template>
