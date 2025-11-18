<script lang="ts" setup>
import {
  useTerraDrawControl,
  type DrawMode,
} from "~/utils/useTerraDrawControl";
import area from "@turf/area";
import { convertArea } from "@turf/helpers";
import IcArrowLeft from "~/assets/icons/ic-arrow-left.svg";
import IcCross from "~/assets/icons/ic-cross.svg";
import IcDraw from "~/assets/icons/ic-draw.svg";
import IcDrawCircle from "~/assets/icons/ic-draw-circle.svg";
import IcDrawFree from "~/assets/icons/ic-draw-free.svg";
import IcDrawSquare from "~/assets/icons/ic-draw-square.svg";
import IcTrash from "~/assets/icons/ic-trash.svg";
import IcDownload from "~/assets/icons/ic-download.svg";
import IcRulerCorner from "~/assets/icons/ic-ruler-corner.svg";
import { useSatellite } from "~/stores/useSatellite";

const toolsStore = useMapTools();
const { handleCloseSatelliteTools } = toolsStore;

const satelliteStore = useSatellite();
const { setSatelliteDataList } = satelliteStore;

const currentMode = ref<DrawMode>("");
const hasDrawnFeature = ref(false);
const areaCount = ref<number | null>(null);

const calculateArea = (feature: any) => {
  if (
    feature &&
    (feature.geometry.type === "Polygon" ||
      feature.geometry.type === "Circle" ||
      feature.geometry.type === "Rectangle")
  ) {
    const calculatedArea = area(feature);
    areaCount.value = parseFloat(
      convertArea(calculatedArea, "meters", "kilometers").toFixed(2)
    );
  }
};

const fetchSatelliteData = async (feature: any) => {
  try {
    const response = await fetch(
      "https://planetarycomputer.microsoft.com/api/stac/v1/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collections: ["sentinel-2-l2a"],
          intersects: feature.geometry,
          datetime: "2025-08-01/2025-10-06",
          query: {
            "eo:cloud_cover": {
              lt: 10,
            },
          },
          limit: 5,
        }),
      }
    );

    const data = await response.json();
    console.log("Satellite data:", data);
    if (data.features && data.features.length > 0) {
      const dataList = data.features.map((el: any) => {
        return {
          id: el.id,
          assets: el["assets"]["rendered_preview"],
          bbox: el.bbox,
          geometry: el.geometry,
          properties: {
            contellation: el.properties.contellation,
            datetime: el.properties.datetime,
            cloud_cover: el.properties["eo:cloud_cover"],
          },
        };
      });
      setSatelliteDataList(dataList);
    }

    return data;
  } catch (error) {
    console.error("Error fetching satellite data:", error);
  }
};

const { initialize, setMode, clear, destroy, getSnapshot, drawInstance } =
  useTerraDrawControl({
    onFinish: async (_id, feature) => {
      calculateArea(feature);
      await fetchSatelliteData(feature);
      currentMode.value = "";
      drawInstance.value.setMode("static");
      hasDrawnFeature.value = true;
    },
  });

onMounted(() => {
  initialize();
});

const toggleDraw = (mode: DrawMode) => {
  if (hasDrawnFeature.value) {
    areaCount.value = null;
    hasDrawnFeature.value = false;
    clear();
  }
  if (currentMode.value === mode) {
    currentMode.value = "";
  } else {
    setMode(mode);
    currentMode.value = mode;
  }
};

const handleClear = () => {
  clear();
  currentMode.value = "";
  hasDrawnFeature.value = false;
  areaCount.value = null;
};

const handleDownload = () => {
  const snapshot = getSnapshot();
};

onUnmounted(() => {
  destroy();
});
</script>

<template>
  <div class="flex gap-1 items-center">
    <UButton
      @click="handleCloseSatelliteTools"
      class="p-2 -rotate-90"
      variant="ghost"
      color="gray"
      size="icon"
    >
      <IcArrowLeft class="size-3" :fontControlled="false" />
    </UButton>
    <div class="border-l border-grey-700 h-7"></div>
    <UButton
      @click="toggleDraw('circle')"
      class="p-2"
      :variant="currentMode === 'circle' ? 'soft' : 'ghost'"
      :color="currentMode === 'circle' ? 'brand' : 'gray'"
      size="icon"
    >
      <IcDrawCircle class="size-4" :fontControlled="false" />
    </UButton>
    <UButton
      @click="toggleDraw('rectangle')"
      class="p-2"
      :variant="currentMode === 'rectangle' ? 'soft' : 'ghost'"
      :color="currentMode === 'rectangle' ? 'brand' : 'gray'"
      size="icon"
    >
      <IcDrawSquare class="size-4" :fontControlled="false" />
    </UButton>
    <UButton
      @click="toggleDraw('polygon')"
      class="p-2"
      :variant="currentMode === 'polygon' ? 'soft' : 'ghost'"
      :color="currentMode === 'polygon' ? 'brand' : 'gray'"
      size="icon"
    >
      <IcDrawFree class="size-4" :fontControlled="false" />
    </UButton>
    <div class="border-l border-grey-700 h-7"></div>
    <UButton
      @click="handleClear"
      class="p-2"
      variant="ghost"
      color="gray"
      size="icon"
    >
      <IcTrash class="size-4" :fontControlled="false" />
    </UButton>
    <UButton
      @click="handleDownload"
      class="p-2"
      variant="ghost"
      color="gray"
      size="icon"
    >
      <IcDownload class="size-4" :fontControlled="false" />
    </UButton>
    <div class="border-l border-grey-700 h-7"></div>
    <UButton
      @click="handleCloseSatelliteTools"
      label="Draw Satellite Area"
      variant="subtle"
      color="brand"
      class="w-full h-[26px]"
      size="2xs"
    >
      <template #leading>
        <IcDraw class="size-3" :fontControlled="false" />
      </template>
      <template #trailing>
        <IcCross class="size-2" :fontControlled="false" />
      </template>
    </UButton>
  </div>
  <Transition
    enter-active-class="transition-all duration-500"
    enter-from-class="-translate-y-5 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-500"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-5 opacity-0"
  >
    <div
      v-if="areaCount"
      class="bg-grey-900 absolute -top-12 flex gap-1 items-center p-3 rounded-lg left-1/2 -translate-x-1/2"
    >
      <IcRulerCorner class="size-4 text-grey-400" :fontControlled="false" />
      <p class="text-m-xs">
        {{ areaCount }} <span class="text-r-xs-muted">km</span>
      </p>
    </div>
  </Transition>
</template>
