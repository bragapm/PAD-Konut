<script setup lang="ts">
const store = useMapRef();
const { map } = storeToRefs(store);
const coordinates = ref<{ lng: string; lat: string }>({
  lng: "0.000000",
  lat: "0.000000",
});

watchEffect(async () => {
  if (map?.value) {
    map.value.on("mousemove", function (e) {
      coordinates.value = {
        lng: e.lngLat.lng.toString(),
        lat: e.lngLat.lat.toString(),
      };
    });
  }
});

function getNiceDistance(distance: number): number {
  const pow10 = Math.pow(10, Math.floor(Math.log10(distance)));
  const d = distance / pow10;
  let nice;
  if (d < 1.5) nice = 1;
  else if (d < 3.5) nice = 2;
  else if (d < 7.5) nice = 5;
  else nice = 10;
  return nice * pow10;
}

function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

const barWidth = ref<any>();
const distance = ref<any>();

function updateScaleBar() {
  const zoom = map.value!.getZoom();
  const bottomLat = map.value!.getBounds().getSouth();
  const earthCircumference = 40075016.686;
  const tileSize = 512;

  // meters per pixel at bottom latitude
  const metersPerPixel =
    (earthCircumference * Math.cos((bottomLat * Math.PI) / 180)) /
    (Math.pow(2, zoom) * tileSize);

  // raw distance for 100px bar
  const rawDistance = metersPerPixel * 100;
  const niceDistance = getNiceDistance(rawDistance);

  // pixels for that nice distance
  const barPixelLength = niceDistance / metersPerPixel;
  barWidth.value = barPixelLength;
  distance.value = formatDistance(niceDistance);
}

watchEffect((onCleanup) => {
  if (!map.value) return;

  const handleLoad = () => {
    updateScaleBar();
  };

  const handleZoom = () => {
    updateScaleBar();
  };

  const handleMove = () => {
    updateScaleBar();
  };

  map.value.on("load", handleLoad);
  map.value.on("zoom", handleZoom);
  map.value.on("move", handleMove);

  onCleanup(() => {
    map.value?.off("load", handleLoad);
    map.value?.off("zoom", handleZoom);
    map.value?.off("move", handleMove);
  });
});
</script>

<template>
  <div
    class="z-10 absolute bottom-0 left-0 bg-black/30 rounded-sm pl-6 pr-2 py-[2px] flex gap-2 text-grey-50 text-2xs"
  >
    <div class="flex gap-2 items-center">
      <p class="whitespace-nowrap">Lat {{ coordinates.lat }}</p>
    </div>
    <div class="flex gap-2 items-center">
      <p class="whitespace-nowrap">Long {{ coordinates.lng }}</p>
    </div>
    <div class="flex gap-1 items-center">
      <p>{{ distance }}</p>
      <div
        :style="{ width: barWidth + 'px', height: '1.5px' }"
        class="relative bg-grey-50 mt-[2px]"
      >
        <div class="absolute w-[1.5px] bg-grey-50 h-[5px] left-0 bottom-0"></div>
        <div class="absolute w-[1.5px] bg-grey-50 h-[5px] right-0 bottom-0"></div>
      </div>
    </div>
  </div>
</template>
