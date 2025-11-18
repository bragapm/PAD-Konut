<script lang="ts" setup>
import { GeoJSONSource } from "maplibre-gl";
import bbox from "@turf/bbox";
import center from "@turf/center";
import marker from "~/assets/images/marker.png";
import { ref } from "vue";
import {
  ComboboxRoot,
  ComboboxInput,
  ComboboxContent,
  ComboboxItem,
} from "reka-ui";
import { orsApiKey } from "~/constants";
import IcCross from "~/assets/icons/ic-cross.svg";
import { USeparator } from "#components";
import IcMarker from "~/assets/icons/ic-marker-stroked.svg";

type Administration = {
  ogc_fid: number;
  wadmpr: string;
  wadmkk: string;
  wadmkc: string;
  geom: GeoJSON.Geometry;
};

type LatlngInput = { validate: boolean; value: string } | null;

const props = defineProps<{ expandSearch: boolean }>();
const emit = defineEmits<{
  updateExpand: [value: boolean];
}>();

const store = useMapRef();
const { map } = storeToRefs(store);

const toast = useToast();
const isFetching = ref(false);
const isFetchingAdministration = ref(false);
const features = ref<any>([]);
const administrationLists = ref<Administration[]>([]);
const latlng = ref<LatlngInput>(null);

const selected = ref<GeoJSON.Feature | Administration | null>(null);
const activeSearched = ref(false);
const query = ref("");
const open = ref(false);

const handleDebounceQuery = debounce((value: string) => {
  query.value = value;
}, 500);

const getLayer = (feature: GeoJSON.Feature) => {
  const geomType = feature.geometry.type;
  if (geomType === "Point") {
    const [lng, lat] = feature.geometry.coordinates as [number, number];
    map.value?.flyTo({
      center: [lng, lat],
      zoom: 14, // adjust default zoom for points
      speed: 1.2,
    });
  } else if (geomType === "Polygon" || geomType === "LineString") {
    const bounds = bbox(feature); // [minX, minY, maxX, maxY]
    map.value?.fitBounds(bounds as [number, number, number, number], {
      padding: 40,
      duration: 1000,
    });
  } else {
    // fallback: fly to centroid
    const centroid = center(feature);
    map.value?.flyTo({
      center: centroid.geometry.coordinates as [number, number],
      zoom: 10,
      speed: 1.2,
    });
  }
  if (!map.value?.hasImage("destination-marker")) {
    const markerImg = new Image(28, 28);
    markerImg.src = marker;
    markerImg.onload = () => {
      if (map.value && !map.value.hasImage("destination-marker")) {
        map.value.addImage("destination-marker", markerImg);
      }
    };
  }

  if (!map.value?.getSource("search-layer")) {
    map.value?.addSource("search-layer", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [feature] },
    });
    map.value?.addLayer({
      type: "symbol",
      source: "search-layer",
      id: "search-layer-point",
      layout: {
        "icon-image": "destination-marker",
      },
      filter: ["==", "$type", "Point"],
    });
    map.value?.addLayer({
      type: "fill",
      source: "search-layer",
      id: "search-layer-fill",
      paint: {
        "fill-color": getBrandColor("600"),
        "fill-opacity": 0.6,
      } as any,
      filter: ["==", "$type", "Polygon"],
    });

    map.value?.addLayer({
      type: "line",
      source: "search-layer",
      id: "search-layer-outline",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": getBrandColor("300"),
        "line-width": 6,
        "line-opacity": 0.9,
      },
      filter: ["==", "$type", "Polygon"],
    });
  } else {
    (map.value?.getSource("search-layer") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: [feature],
    });
  }
};

const getAdministrationArea = async (val: string) => {
  try {
    isFetchingAdministration.value = true;
    const res = await fetch(
      "/panel/items/kecamatan_indo?" +
        new URLSearchParams({
          filter: JSON.stringify({
            _and: [
              {
                _or: [
                  { wadmpr: { _icontains: val } },
                  { wadmkk: { _icontains: val } },
                  { wadmkc: { _icontains: val } },
                ],
              },
            ],
          }),
          limit: "20",
          fields: "ogc_fid,wadmpr,wadmkk,wadmkc,geom",
        })
    );
    const result = await res.json();
    administrationLists.value = result.data;
  } catch (error) {
    const message = error instanceof Error ? error.message || "Error" : "Error";
    toast.add({
      description: message,
      icon: "i-heroicons-information-circle",
    });
  } finally {
    isFetchingAdministration.value = false;
  }
};

const geocode = async (val: string) => {
  try {
    isFetching.value = true;
    const res = await fetch(
      "https://api.openrouteservice.org/geocode/search?boundary.country=ID&sources=openstreetmap&text=" +
        val,
      {
        headers: {
          Authorization: orsApiKey,
          "Content-Type": "application/json",
        },
      }
    );
    const result = await res.json();
    features.value = result.features;
  } catch (error) {
    const message = error instanceof Error ? error.message || "Error" : "Error";
    toast.add({
      description: message,
      icon: "i-heroicons-information-circle",
    });
  } finally {
    isFetching.value = false;
  }
};

function parseInputString(input: string) {
  // Regex untuk cek format lat,lng
  const regex = /^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/;
  const match = input.match(regex);

  if (match) {
    const lat = parseFloat(match[1] as string);
    const lng = parseFloat(match[3] as string);

    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      latlng.value = { validate: true, value: lat + ", " + lng };
    } else {
      latlng.value = { validate: false, value: lat + ", " + lng };
    }
  } else {
    latlng.value = null;
    geocode(input);
    getAdministrationArea(input);
  }
}

watch(query, (newValue) => {
  if (newValue) {
    parseInputString(newValue);
  }
});

watch(selected, (newValue) => {
  if (newValue) {
    activeSearched.value = true;
    if ((newValue as any)?.validate) {
      getLayer({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: (newValue as any).value
            .split(",")
            .map((s: any) => parseFloat(s.trim()))
            .reverse(),
        },
        properties: {},
      });
    }
    //handle data from ors
    if ((newValue as GeoJSON.Feature).geometry) {
      getLayer(newValue as GeoJSON.Feature);
    }
    if ((newValue as Administration).geom) {
      const { geom, ...properties } = newValue as Administration;
      getLayer({
        type: "Feature",
        geometry: geom,
        properties: properties,
      });
    }
  }
});

const displayValue = (value: any) => {
  if (!value) return "";
  if (value.validate) {
    return value.value;
  }
  if (value.geom) {
    return [value.wadmkc, value.wadmkk, value.wadmpr]
      .filter(Boolean)
      .join(", ");
  }
  return value?.properties?.name ?? "";
};

const handleClose = () => {
  open.value = false;

  if (activeSearched.value) {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    query.value = "";
    selected.value = null;
    activeSearched.value = false;
  }

  if (map.value) {
    if (map.value.getSource("search-layer")) {
      map.value.removeLayer("search-layer-point");
      map.value.removeLayer("search-layer-fill");
      map.value.removeLayer("search-layer-outline");
      map.value.removeSource("search-layer");
    }
    if (map.value.hasImage("destination-marker")) {
      map.value.removeImage("destination-marker");
    }
  }
  emit("updateExpand", false);
};
</script>

<template>
  <div class="flex items-center gap-2">
    <transition
      enter-active-class="transition-all duration-300 ease-in-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
    >
      <div v-if="!expandSearch">
        <UButton
          color="gray"
          variant="outline"
          size="sm"
          @click="emit('updateExpand', true)"
          icon="i-heroicons-magnifying-glass-20-solid"
          :ui="{
            leadingIcon: 'text-grey-400',
          }"
        />
      </div>
    </transition>

    <ComboboxRoot v-model="selected" v-model:open="open">
      <div class="relative">
        <transition
          enter-active-class="transition-all duration-800 ease-in-out"
          leave-active-class="transition-all duration-800 ease-in-out"
          enter-from-class="opacity-0 max-w-0"
          enter-to-class="opacity-100 max-w-[19rem]"
          leave-from-class="opacity-100 max-w-[19rem]"
          leave-to-class="opacity-0 max-w-0"
        >
          <div v-if="expandSearch" class="overflow-hidden">
            <ComboboxInput
              placeholder="Search Location"
              @input="handleDebounceQuery(($event.target as HTMLInputElement).value)"
              :display-value="(value:any) => displayValue(value)"
              :class="'h-8 w-[19rem] rounded-sm border border-grey-500 focus:border-brand-500 bg-grey-700 pr-8 pl-2 text-xs text-grey-50 focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'"
            />
            <button
              @click="
                  (event:any) => {
                    handleClose()
                  }
                "
              class="absolute top-1/2 -translate-y-1/2 right-2"
            >
              <IcCross
                :fontControlled="false"
                class="cursor-pointer w-[9px] h-[9px] text-grey-400"
              />
            </button>
          </div>
        </transition>

        <ComboboxContent
          :class="'absolute top-10 rounded-sm border border-grey-600 bg-grey-800 p-1 w-[19rem] max-w-[19rem] space-y-1 max-h-96 flex flex-col'"
        >
          <div v-if="latlng">
            <ComboboxItem v-if="latlng.validate" :value="latlng">
              <div
                class="flex items-center gap-2 hover:bg-grey-900 cursor-pointer p-2 rounded-sm"
              >
                <IcMarker
                  :class="['text-grey-200 size-4']"
                  :fontControlled="false"
                />
                <p class="text-xs text-grey-200">
                  {{ latlng.value }}
                </p>
              </div>
            </ComboboxItem>
            <p v-else class="text-xs text-grey-200 p-2">
              Maps can't find <span class="italic">{{ latlng.value }}</span>
            </p>
          </div>
          <div v-if="!latlng" class="flex-1 overflow-y-auto">
            <div class="py-2">
              <p class="px-2 text-grey-500 text-2xs pb-1">Locations</p>
              <div v-if="isFetching" class="space-y-2 px-2">
                <div class="space-y-1" v-for="i of [0, 1, 2, 3, 4]">
                  <USkeleton :key="i" class="w-32 h-3 bg-grey-500" />
                  <USkeleton :key="i" class="w-full h-3 bg-grey-500" />
                </div>
              </div>
              <div
                v-if="!isFetching && features && features.length > 0"
                class="flex flex-col"
              >
                <ComboboxItem
                  v-for="feature in features"
                  :key="feature.properties?.id"
                  :value="feature"
                >
                  <div
                    class="text-xs hover:bg-grey-900 rounded-sm cursor-pointer px-2 py-2"
                  >
                    <p class="text-grey-200 font-medium">
                      {{ feature?.properties?.name }}
                    </p>
                    <p class="text-grey-400">
                      {{
                        [
                          feature?.properties?.street,
                          feature?.properties?.county,
                          feature?.properties?.region,
                        ]
                          .filter(Boolean)
                          .join(", ")
                      }}
                    </p>
                  </div>
                </ComboboxItem>
              </div>
              <p
                v-if="!isFetching && features && features.length === 0"
                class="text-xs text-grey-200 text-center"
              >
                No Data
              </p>
            </div>
            <USeparator color="gray" />
            <div class="py-2">
              <p class="px-2 text-grey-500 text-2xs pb-1">
                Administration Area
              </p>
              <div v-if="isFetchingAdministration" class="space-y-2 px-2">
                <div class="space-y-1" v-for="i of [0, 1, 2, 3, 4]">
                  <USkeleton :key="i" class="w-32 h-3 bg-grey-500" />
                  <USkeleton :key="i" class="w-full h-3 bg-grey-500" />
                </div>
              </div>
              <div
                v-if="
                  !isFetchingAdministration &&
                  administrationLists &&
                  administrationLists.length > 0
                "
                class="flex flex-col"
              >
                <ComboboxItem
                  :key="administrationItem.ogc_fid"
                  :value="administrationItem"
                  v-for="administrationItem in administrationLists"
                >
                  <div
                    class="text-xs hover:bg-grey-900 rounded-sm cursor-pointer px-2 py-2"
                  >
                    <p class="font-medium text-grey-200">
                      {{
                        [
                          administrationItem.wadmkc,
                          administrationItem.wadmkk,
                          administrationItem.wadmpr,
                        ]
                          .filter(Boolean)
                          .join(", ")
                      }}
                    </p>

                    <div class="text-brand-500 cursor-pointer w-fit">
                      Add To Map
                    </div>
                  </div>
                </ComboboxItem>
              </div>
              <p
                v-if="
                  !isFetchingAdministration &&
                  administrationLists &&
                  administrationLists.length === 0
                "
                class="text-xs text-grey-200 text-center"
              >
                No Data
              </p>
            </div>
          </div>
          <USeparator color="gray" />
          <div class="px-2 py-1">
            <p class="text-grey-400 text-2xs">
              Advanced Search for Locations, Coordinates, and Administration
              Area on the map.
            </p>
          </div>
        </ComboboxContent>
      </div>
    </ComboboxRoot>
  </div>
</template>
