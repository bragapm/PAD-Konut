<script lang="ts" setup>
import IcArrowLeft from "~/assets/icons/ic-arrow-left.svg";

const props = defineProps<{
  onClose?: () => void;
}>();
</script>

<template>
  <div
    class="mx-3 mt-3 pb-1 flex items-center justify-between gap-1 border-b border-grey-700"
  >
    <div>
      <p class="text-xs text-grey-50">October 7, 2025</p>
      <p class="text-2xs text-grey-400">Layer Settings Panel</p>
    </div>
    <IcArrowLeft
      role="button"
      @click="onClose"
      :fontControlled="false"
      class="w-3 h-3 rotate-0 text-grey-400 cursor-pointer"
    />
  </div>
  <div
    class="p-3 flex-1 overflow-y-auto transition-all duration-500 ease-in-out space-y-2"
  >
    <MapSatelliteSettingsPanel />
    <MapSatelliteSettingsPanel />
  </div>
</template>
