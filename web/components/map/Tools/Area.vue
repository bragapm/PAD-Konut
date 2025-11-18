<script lang="ts" setup>
import { useTerraDrawControl } from "~/utils/useTerraDrawControl";
import area from "@turf/area";
import { convertArea } from "@turf/helpers";

const areaCount = ref<number>(0);
const areaUnit = ref<string>("m");

const calculateArea = (feature: any) => {
  if (feature && feature.geometry.type === "Polygon") {
    const calculatedArea = area(feature);
    areaCount.value =
      areaUnit.value === "m"
        ? parseFloat(calculatedArea.toFixed(2))
        : parseFloat(
            convertArea(calculatedArea, "meters", "kilometers").toFixed(2)
          );
  }
};

const { initialize, clear, destroy } = useTerraDrawControl({
  mode: "polygon",
  onFinish: (_id, feature) => {
    calculateArea(feature);
  },
  onChange: (_ids, features) => {
    if (features.length > 0) {
      calculateArea(features[0]);
    }
  },
});

onMounted(() => {
  initialize();
});

const handleReset = () => {
  areaCount.value = 0;
  clear();
};

onUnmounted(() => {
  destroy();
});
</script>

<template>
  <div class="p-2 flex flex-col gap-2">
    <p class="text-2xs text-grey-400">
      Click on the map to start measuring area and Double click to finish.
    </p>
    <div class="flex gap-1">
      <UInput
        v-model="areaCount"
        readonly
        color="gray"
        placeholder="0"
        class="w-full"
        size="xs"
      >
        <template #trailing>
          <span class="text-grey-500 dark:text-grey-400 text-xs"
            >Area Result ({{ areaUnit }}<span><sup>2</sup></span
            >)</span
          >
        </template>
      </UInput>
      <UButton
        @click="
          () => {
            if (areaUnit === 'km') {
              areaCount = parseFloat((areaCount * 1000000).toFixed(2));
              areaUnit = 'm';
            }
          }
        "
        :color="areaUnit === 'm' ? 'brand' : 'gray'"
        variant="outline"
        class="text-2xs p-1 gap-0 rounded-sm"
      >
        Meter<sup>2</sup>
      </UButton>
      <UButton
        @click="
          () => {
            if (areaUnit === 'm') {
              areaCount = parseFloat((areaCount / 1000000).toFixed(2));
              areaUnit = 'km';
            }
          }
        "
        :color="areaUnit === 'km' ? 'brand' : 'gray'"
        variant="outline"
        class="text-2xs p-1 gap-0 rounded-sm"
        >Kilometer<sup>2</sup></UButton
      >
    </div>
  </div>
  <div class="p-2">
    <UButton
      :disabled="areaCount === 0"
      @click="handleReset"
      color="gray"
      variant="outline"
      class="w-full justify-center text-sm rounded-sm"
      >Reset</UButton
    >
  </div>
</template>
