<script lang="ts" setup>
import { useTerraDrawControl } from "~/utils/useTerraDrawControl";
import length from "@turf/length";

const lengthCount = ref<number>(0);
const lengthUnit = ref<string>("m");

const calculateLength = (feature: any) => {
  if (feature && feature.geometry.type === "LineString") {
    lengthCount.value = parseFloat(
      length(feature, {
        units: lengthUnit.value === "m" ? "meters" : "kilometers",
      }).toFixed(2)
    );
  }
};

const { initialize, clear, destroy } = useTerraDrawControl({
  mode: "linestring",
  onFinish: (_id, feature) => {
    calculateLength(feature);
  },
  onChange: (_ids, features) => {
    if (features.length > 0) {
      calculateLength(features[0]);
    }
  },
});

onMounted(() => {
  initialize();
});

const handleReset = () => {
  lengthCount.value = 0;
  clear();
};

onUnmounted(() => {
  destroy();
});
</script>

<template>
  <div class="p-2 flex flex-col gap-2">
    <p class="text-2xs text-grey-400">
      Click on the map to start measuring length and Double click to finish.
    </p>
    <div class="flex gap-1">
      <UInput
        v-model="lengthCount"
        readonly
        color="gray"
        placeholder="0"
        class="w-full"
        size="xs"
      >
        <template #trailing>
          <span class="text-grey-500 dark:text-grey-400 text-xs"
            >Distance Result ({{ lengthUnit }})</span
          >
        </template>
      </UInput>
      <UButton
        @click="
          () => {
            if (lengthUnit === 'km') {
              lengthCount = parseFloat((lengthCount * 1000).toFixed(2));
              lengthUnit = 'm';
            }
          }
        "
        :color="lengthUnit === 'm' ? 'brand' : 'gray'"
        variant="outline"
        class="text-2xs p-1 gap-0 rounded-sm"
      >
        Meter
      </UButton>
      <UButton
        @click="
          () => {
            if (lengthUnit === 'm') {
              lengthCount = parseFloat((lengthCount / 1000).toFixed(2));
              lengthUnit = 'km';
            }
          }
        "
        :color="lengthUnit === 'km' ? 'brand' : 'gray'"
        variant="outline"
        class="text-2xs p-1 gap-0 rounded-sm"
        >Kilometer</UButton
      >
    </div>
  </div>
  <div class="p-2">
    <UButton
      :disabled="lengthCount === 0"
      @click="handleReset"
      color="gray"
      variant="outline"
      class="w-full justify-center text-sm rounded-sm"
      >Reset</UButton
    >
  </div>
</template>
