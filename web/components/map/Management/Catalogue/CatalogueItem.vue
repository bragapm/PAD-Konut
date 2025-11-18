<script setup lang="ts">
import IcHelp from "~/assets/icons/ic-help.svg";
import IcSpinner from "~/assets/icons/ic-spinner.svg";
import IcCheck from "~/assets/icons/ic-check.svg";
import IcMapLayerA from "~/assets/icons/ic-map-layer-a.svg";
import IcCross from "~/assets/icons/ic-cross.svg";
import DummyImage from "@/assets/images/catalogue-item.jpeg";

import type {
  VectorTiles,
  RasterTiles,
  ThreeDTiles,
  LoadedGeoJson,
} from "~/utils/types";

defineProps<{
  item: VectorTiles | RasterTiles | ThreeDTiles | LoadedGeoJson;
  isActive: boolean;
}>();

const emit = defineEmits<{
  removeLoadedLayer: [layerId: string];
}>();

const mapLayerStore = useMapLayer();
const { deleteLoadedGeoJsonData } = useIDB();

const isLoad = ref(false);
const hover = ref(false);

const addLayer = (
  item: VectorTiles | RasterTiles | ThreeDTiles | LoadedGeoJson
) => {
  isLoad.value = true;
  setTimeout(() => {
    isLoad.value = false;
    mapLayerStore.addLayer(item);
  }, 750);
};

const removeLayer = (
  item: VectorTiles | RasterTiles | ThreeDTiles | LoadedGeoJson
) => {
  isLoad.value = true;
  setTimeout(() => {
    isLoad.value = false;
    mapLayerStore.removeLayer(item);
  }, 750);
};

const removeLoadedData = async (item: LoadedGeoJson) => {
  emit("removeLoadedLayer", item.layer_id);
  await deleteLoadedGeoJsonData(item.layer_id);
};

const getImageUrl = (file: File) => {
  return URL.createObjectURL(file);
};
</script>

<template>
  <div
    class="flex flex-col gap-2 border border-grey-700 rounded-lg p-2"
    @mouseover="hover = true"
    @mouseleave="hover = false"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1">
        <!-- <UBadge
          variant="outline"
          class="flex items-center gap-1 bg-grey-800 text-grey-50 mt-[1px] rounded-sm"
          color="gray"
        >
          <IcMapLayerA></IcMapLayerA>
          <p>{{ item.geometry_type }}</p>
        </UBadge> -->

        <span
          class="flex items-center gap-1 bg-grey-800 text-grey-50 mt-[1px] rounded-sm border border-grey-700 px-1 py-0.5 text-2xs"
        >
          <IcMapLayerA />
          <p>{{ item.geometry_type }}</p>
        </span>
        <Transition
          enter-active-class="transition-all duration-1000 ease-in-out"
          enter-from-class="transform opacity-0"
          enter-to-class="transform opacity-100"
          leave-active-class="transition-all duration-1000 ease-in-out"
          leave-from-class="transform opacity-100"
          leave-to-class="transform opacity-0"
        >
          <span
            v-if="isActive"
            class="flex items-center gap-1 bg-grey-800 text-green-600 rounded-sm border border-green-600 px-1 py-0.5 text-2xs"
          >
            <IcCheck />
            <p>In Map</p>
          </span>
        </Transition>
      </div>
      <button v-if="item.source === 'loaded_geojson' && hover">
        <IcCross class="text-grey-50" @click="removeLoadedData(item)" />
      </button>
    </div>
    <NuxtImg
      v-if="item.preview && item.source !== 'loaded_geojson'"
      provider="directus"
      :src="item.preview"
      class="h-24 w-full object-cover object-center rounded-sm"
    />
    <NuxtImg
      v-else-if="item.preview && item.source === 'loaded_geojson'"
      :src="getImageUrl(item.preview)"
      class="h-24 w-full object-cover object-center rounded-sm"
    />
    <img
      v-else
      :src="DummyImage"
      alt="catalogue-item"
      class="h-24 w-full object-cover object-center rounded-sm"
    />
    <article>
      <div class="flex items-center justify-between gap-2">
        <h5 class="text-xs text-grey-50 truncate">
          {{
            item.source === "vector_tiles"
              ? item.layer_alias ?? item.layer_name
              : item.layer_alias
          }}
        </h5>
        <button>
          <IcHelp class="w-3 h-3 text-brand-500" :fontControlled="false" />
        </button>
      </div>
      <p class="line-clamp-3 text-grey-500 text-2xs">Description</p>
    </article>
    <UButton
      :label="isActive ? 'Remove' : 'Add to Map'"
      :class="[
        !isActive ? 'transition-all duration-500 ease-in-out' : '',
        'w-full justify-center h-9',
      ]"
      :variant="isActive ? 'outline' : 'solid'"
      :color="isActive ? 'brand' : 'gray'"
      @click="isActive ? removeLayer(item) : addLayer(item)"
    >
      <IcSpinner
        :class="[
          isActive ? 'text-brand-500' : 'text-white',
          'w-4 h-4 animate-spin',
        ]"
        :fontControlled="false"
        v-if="isLoad"
      />
    </UButton>
  </div>
</template>
