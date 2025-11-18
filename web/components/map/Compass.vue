<script setup lang="ts">
import IcCompass from "~/assets/icons/ic-compass.svg";
const store = useMapRef();
const { map } = storeToRefs(store);
const bearing = ref(0);
watchEffect(async () => {
  if (map?.value) {
    map.value.on("rotate", function (e) {
      if (map?.value) {
        bearing.value = -map.value?.getBearing() || 0;
      }
    });
  }
});
</script>

<template>
  <div class="flex gap-2 bg-black/30 rounded-xs p-2">
    <button
      @click="() => map && map.easeTo({ bearing: 0 })"
      class="bg-transparent hover:bg-black p-2 rounded-xs"
    >
      <IcCompass
        class="w-5 h-5 text-white"
        :fontControlled="false"
        :style="{
          transform: 'rotate(' + bearing + 'deg)',
          'transition-property': 'all',
          'transition-duration': '1000ms',
        }"
      />
    </button>
  </div>
</template>