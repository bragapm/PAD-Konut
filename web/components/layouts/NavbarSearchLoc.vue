<script lang="ts" setup>
import { Marker } from "maplibre-gl";
import { ref } from "vue";
import {
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
} from "@headlessui/vue";
import { orsApiKey } from "~/constants";
import IcSearch from "~/assets/icons/ic-search.svg";
import IcCross from "~/assets/icons/ic-cross.svg";

const store = useMapRef();
const { map } = storeToRefs(store);

const toast = useToast();
const isFetching = ref(false);
const features = ref<any>([]);

const selected = ref<GeoJSON.Feature | null>(null);
const activeSearched = ref(false);
const query = ref("");
const markerRef = ref<any>();

const handleDebounceQuery = debounce((value: string) => {
  query.value = value;
}, 500);

const getGeometry = async (val: any) => {
  if (val.geometry) {
    if (markerRef.value) {
      markerRef.value.remove();
    }

    const geometry = val.geometry as {
      type: string;
      coordinates: [number, number];
    };
    if (map.value) {
      map.value.flyTo({
        center: {
          lng: geometry.coordinates[0],
          lat: geometry.coordinates[1],
        },
        zoom: 17,
      });
      markerRef.value = new Marker()
        .setLngLat(geometry.coordinates)
        .addTo(map.value);
    }
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

const onClose = (event: any) => {
  event.preventDefault();
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  if (markerRef.value) {
    markerRef.value.remove();
  }
  query.value = "";
  selected.value = null;
  activeSearched.value = false;
};

watch(query, (newValue) => {
  if (newValue) {
    geocode(newValue);
  }
});

watch(selected, (newValue) => {
  if (newValue) {
    activeSearched.value = true;
    getGeometry(newValue);
  }
});
</script>

<template>
  <Combobox v-model="selected">
    <div className="relative">
      <ComboboxInput
        placeholder="Search Location"
        @change="handleDebounceQuery($event.target.value)"
        :display-value="(value: any)=>  value?.properties?.name"
        :class="'h-8 w-48 rounded-xxs border border-grey-600 bg-grey-700 pr-8 pl-2 text-sm text-grey-200 focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'"
      />
      <button
        @click="
          (event) => {
            if (activeSearched) {
              onClose(event);
            }
          }
        "
        class="absolute top-1/2 -translate-y-1/2 right-2"
      >
        <IcSearch
          v-if="!activeSearched"
          :fontControlled="false"
          class="w-4 h-4 text-grey-500"
        />
        <IcCross v-else :fontControlled="false" class="w-3 h-3 text-grey-500" />
      </button>
    </div>
    <ComboboxOptions
      :class="'absolute top-10 rounded-xxs border border-grey-600 bg-grey-700 p-2 w-52 max-w-52 space-y-1'"
    >
      <USkeleton
        v-if="isFetching"
        v-for="i of [0, 1, 2, 3, 4]"
        :key="i"
        :ui="{ rounded: 'rounded-xxs', background: 'bg-grey-400' }"
        class="w-48 h-5"
      />
      <ComboboxOption
        v-if="!isFetching && features && features.length > 0"
        v-for="feature in features"
        :key="feature.properties?.id"
        :value="feature"
      >
        <div
          class="text-sm text-grey-200 hover:bg-grey-400 hover:text-grey-800 rounded-xxs cursor-pointer px-1"
        >
          {{
            feature?.properties?.name +
            (feature?.properties?.region
              ? ", " + feature?.properties?.region
              : "")
          }}
        </div>
      </ComboboxOption>
      <p
        v-if="!isFetching && features && features.length === 0"
        class="text-sm text-grey-200 text-center"
      >
        No Data
      </p>
    </ComboboxOptions>
  </Combobox>
</template>
