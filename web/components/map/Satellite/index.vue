<script lang="ts" setup>
import { DateFormatter, getLocalTimeZone } from "@internationalized/date";
import IcArrowLeft from "~/assets/icons/ic-arrow-left.svg";
import IcArrowReg from "~/assets/icons/ic-arrow-reg.svg";
import IcCalendar from "~/assets/icons/ic-calendar.svg";
import IcDraw from "~/assets/icons/ic-draw.svg";
import IcPlanetScope from "~/assets/icons/ic-planet-scope.svg";
import IcWeather from "~/assets/icons/ic-weather.svg";
import { useSatellite } from "~/stores/useSatellite";

defineProps<{
  onClose?: () => void;
  satelliteSettingsId: null | number;
}>();

// const emit = defineEmits<{
//   updateLeftDrawerB: [value: "" | "legend" | "satellite-settings"];
//   updateSatelliteSettingsId: [value: null | number];
// }>();

const satelliteStore = useSatellite();
const { satelliteDataList } = storeToRefs(satelliteStore);

const toolsStore = useMapTools();
const { showSatelliteTools } = storeToRefs(toolsStore);
const { handleCloseSatelliteTools, handleOpenSatelliteTools } = toolsStore;

function toggleDraw() {
  if (showSatelliteTools.value) {
    handleCloseSatelliteTools();
  } else {
    handleOpenSatelliteTools();
  }
}

const isData = ref(true);

// function handleOpenSettings(index: number) {
//   emit("updateSatelliteSettingsId", index);
//   emit("updateLeftDrawerB", "satellite-settings");
// }

const dateModel = reactive<any>({
  startDate: null,
  endDate: null,
});

const df = new DateFormatter("en-US", {
  dateStyle: "medium",
});

const dateLabel = computed(() => {
  if (dateModel.startDate) {
    if (dateModel.endDate) {
      return `${df.format(
        dateModel.startDate.toDate(getLocalTimeZone())
      )} - ${df.format(dateModel.endDate.toDate(getLocalTimeZone()))}`;
    }
    return df.format(dateModel.startDate.toDate(getLocalTimeZone()));
  }
  return "Select Date";
});
</script>

<template>
  <div
    class="mx-3 mt-3 pb-1 flex items-center justify-between gap-1 border-b border-grey-700"
  >
    <div>
      <p class="text-xs text-grey-50">Satellite Data</p>
      <p class="text-2xs text-grey-400">
        Browse and download satellite imagery layer
      </p>
    </div>
    <IcArrowLeft
      role="button"
      @click="onClose"
      :fontControlled="false"
      class="w-3 h-3 rotate-0 text-grey-400 cursor-pointer"
    />
  </div>
  <div class="mx-3 my-2 pb-2 border-b border-grey-700 flex gap-1">
    <UModal
      title="Load Data Ranges"
      description="Select date ranges of satellite data to load."
      :ui="{ footer: 'justify-end', content: 'max-w-[50vw] w-[50vw]' }"
    >
      <UButton
        :label="dateLabel"
        variant="outline"
        color="gray"
        class="h-[26px]"
        size="2xs"
        :ui="{ label: 'w-24 whitespace-nowrap truncate' }"
      >
        <template #leading>
          <IcCalendar class="size-3" :fontControlled="false" />
        </template>
      </UButton>

      <template #body>
        <MapSatelliteDatePicker v-model="dateModel" />
      </template>

      <template #footer="{ close }">
        <UButton label="Filter Date" color="brand" />
      </template>
    </UModal>

    <UButton
      label="Planet Scope"
      variant="outline"
      color="gray"
      class="w-full h-[26px]"
      size="2xs"
    >
      <template #leading>
        <IcPlanetScope class="size-3" :fontControlled="false" />
      </template>
    </UButton>
    <UButton
      @click="toggleDraw"
      variant="outline"
      :class="[showSatelliteTools && 'bg-brand-950', 'h-[26px]']"
      size="2xs"
    >
      <IcDraw class="size-3" :fontControlled="false" />
    </UButton>
  </div>
  <div class="mx-3 flex gap-1">
    <UButton
      label="All"
      variant="outline"
      color="gray"
      class="relative w-full h-[26px]"
      size="2xs"
    >
      <template #leading>
        <IcWeather class="size-3" :fontControlled="false" />
      </template>
      <template #trailing>
        <IcArrowReg
          class="absolute right-1 size-3 rotate-180"
          :fontControlled="false"
        />
      </template>
    </UButton>
    <UButton
      label="Mosaicking"
      variant="outline"
      color="gray"
      class="w-full h-[26px]"
      size="2xs"
    >
    </UButton>
    <UButton
      label="Cloud Masking"
      variant="outline"
      color="gray"
      class="w-full h-[26px]"
      size="2xs"
    >
    </UButton>
  </div>
  <div class="mx-2 px-1 my-2 py-1 flex-1 overflow-y-auto">
    <MapSatelliteDataCard
      v-if="satelliteDataList && satelliteDataList.length > 0"
      v-for="(item, index) in satelliteDataList"
      :key="item.id"
      :data="item"
      :id="item.id"
    />
    <div
      v-if="!isData"
      class="h-full flex flex-col items-center justify-center gap-2 text-center"
    >
      <p class="w-2/3 text-sm text-grey-200 font-medium">
        Draw Satellite Location Selection Area
      </p>
      <p class="text-xs text-grey-400">
        Draw area on your desired location to view our catalog of satellite
        imagery for that area.
      </p>
      <UButton
        v-if="!showSatelliteTools"
        @click="toggleDraw"
        label="Draw Area"
        color="brand"
        class="w-2/3 justify-center"
        size="xs"
      >
      </UButton>
      <UButton
        v-if="!showSatelliteTools"
        label="Import Area"
        color="brand"
        variant="outline"
        class="w-2/3 justify-center"
        size="xs"
      >
      </UButton>
    </div>
  </div>
  <!-- <div
    class="mx-3 my-2 py-2 border-t border-grey-700 flex justify-between items-center gap-2"
  >
    <p class="text-xs text-grey-400 whitespace-nowrap">
      <span class="text-grey-50 font-medium">0</span> dataset(s) selected
    </p>
    <UButton
      label="Download Data"
      variant="outline"
      color="gray"
      class="relative h-[26px]"
      size="xs"
    >
    </UButton>
  </div> -->
</template>
