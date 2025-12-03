<script lang="ts" setup>
import type { GeoJSONSource, MapLayerTouchEvent } from "maplibre-gl";
import buffer from "@turf/buffer";
import { convertLength, type Units } from "@turf/helpers";
import { useQuery } from "@tanstack/vue-query";
import type { HeaderData } from "../Management/Table.vue";

const mapStore = useMapRef();
const { map } = mapStore;
const toast = useToast();

const points = ref<[string, number, number][]>([]);
const addLocation = (event: MapLayerTouchEvent) => {
  if (map) {
    const features = points.value.map(
      (item) =>
        ({
          type: "Feature",
          properties: { ogc_fid: item[0] },
          geometry: {
            type: "Point",
            coordinates: [item[1], item[2]],
          },
        } as GeoJSON.Feature)
    );

    const ogc_fid = crypto.randomUUID(),
      coordinates = event.lngLat.toArray();
    features.push({
      type: "Feature",
      properties: { ogc_fid },
      geometry: {
        type: "Point",
        coordinates,
      },
    });
    points.value = [...points.value, [ogc_fid, ...coordinates]];

    (map.getSource("buffer-points") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features,
    });
  } else {
    toast.add({
      title: "Map is not ready",
      description: "Please try again in a while",
      icon: "i-heroicons-information-circle",
      duration: 1500,
    });
  }
};

onMounted(() => {
  if (map) {
    map.on("click", addLocation);
    map.getCanvasContainer().style.cursor = "crosshair";

    map.addSource("buffer-points", {
      type: "geojson",
      data: emptyFeatureCollection,
    });
    map.addLayer({
      type: "circle",
      source: "buffer-points",
      id: "buffer-points",
      paint: { "circle-color": "white", "circle-radius": 5 },
    });

    map.addSource("buffer-polygon", {
      type: "geojson",
      data: emptyFeatureCollection,
    });
    map.addLayer(
      {
        type: "fill",
        source: "buffer-polygon",
        id: "buffer-polygon",
        paint: { "fill-opacity": 0.75 },
      },
      "buffer-points"
    );
  }
});

onUnmounted(() => {
  if (map) {
    map.off("click", addLocation);
    map.getCanvasContainer().style.cursor = "";

    if (map.getSource("buffer-points")) {
      map.removeLayer("buffer-points");
      map.removeSource("buffer-points");
    }
    if (map.getSource("buffer-polygon")) {
      map.removeLayer("buffer-polygon");
      map.removeSource("buffer-polygon");
    }
  }
});

const digit = ref("0");
const units = [
  "kilometers",
  "meters",
  "miles",
  "feet",
  "yards",
  "inches",
  "nauticalmiles",
  "centimeters",
];
const unit = ref(units[0]);
const colour = ref("#ffffff");

const handleBuffer = () => {
  const features = points.value.map(
    (item) =>
      ({
        type: "Feature",
        properties: { ogc_fid: item[0] },
        geometry: {
          type: "Point",
          coordinates: [item[1], item[2]],
        },
      } as GeoJSON.Feature)
  );
  const result = buffer(
    {
      type: "FeatureCollection",
      features,
    },
    +digit.value,
    { units: unit.value as any, steps: 60 }
  );
  map!.setPaintProperty("buffer-polygon", "fill-color", colour.value);
  (map!.getSource("buffer-polygon") as GeoJSONSource).setData(result);
};

const layerStore = useMapLayer();
const activeLayers = computed(() => {
  return (
    layerStore.groupedActiveLayers
      ?.map((group) => group.layerLists)
      .flat()
      .filter((el) => el.source === "vector_tiles")
      .map(({ layer_name, layer_alias }) => ({
        layer_name,
        layer_alias,
      })) || []
  );
});

const selectedLayerName = ref<string | null>(null);

const selectedLayerAlias = computed(
  () =>
    activeLayers.value.find((l) => l.layer_name === selectedLayerName.value)
      ?.layer_alias ?? ""
);

const enabled = computed(() => !!selectedLayerName.value);
const {
  data: headerData,
  error: headerError,
  isFetching: isHeaderFetching,
  isError: isHeaderError,
} = useQuery({
  queryKey: ["/panel/vector-tiles-attribute-table-header/", selectedLayerName],
  queryFn: async ({ queryKey }) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (authStore.accessToken) {
      headers["Authorization"] = `Bearer ${authStore.accessToken}`;
    }

    const cleanLayerName = selectedLayerName.value?.split("?")[0];

    const res = await $fetch<{ data: HeaderData[] }>(
      queryKey[0] + cleanLayerName,
      { headers }
    );

    return res.data;
  },
  enabled,
});
const columns = computed<
  {
    value: string;
    name: string;
  }[]
>(() => {
  if (headerData.value) {
    console.log("HEADER DATA", headerData.value);
    return headerData.value
      .filter((el) => el.type !== "geometry")
      .map((el: HeaderData) => ({
        value: el.field,
        name: capitalizeEachWords(el.field),
      }));
  } else return [];
});
const selectedType = ref("simple");
const selectedColumn = ref<{
  value: string;
  name: string;
}>();

watch(selectedLayerName, (newLayer) => {
  console.log("NEW LAYER", newLayer);
  selectedColumn.value = undefined;
});

const authStore = useAuth();
const featureStore = useFeature();
const analysisStore = useAnalysisResult();
const isAnalyze = ref(false);
const handleIntersect = async () => {
  const cleanLayerName = selectedLayerName.value?.split("?")[0];

  const payload = {
    points: points.value.map(([_, lng, lat]) => [lng, lat]),
    radius: convertLength(+digit.value, unit.value as Units, "meters"),
    layer: cleanLayerName,
    type: selectedType.value,
    column: selectedColumn.value,
  };

  try {
    isAnalyze.value = true;
    const result = await $fetch<{ category: string; count: string }[]>(
      "/panel/buffer",
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + authStore.accessToken,
        },
      }
    );
    analysisStore.addResult({
      date: new Date().toLocaleString(),
      description: `${digit.value} ${unit.value} from ${points.value.length} points`,
      layer: selectedLayerName.value,

      result,
    });
    featureStore.setMapInfo("analytic");
  } catch (error) {
    toast.add({
      title: "Buffer analysis failed",
      description: "Something wrong, try again later",
      icon: "i-heroicons-information-circle",
      duration: 1500,
    });
  } finally {
    isAnalyze.value = false;
  }
};
</script>

<template>
  <div class="p-2 flex flex-col gap-2">
    <p class="text-2xs text-grey-400">
      <span class="font-bold">Click on the map</span>
      to add a location to points to be buffered.
    </p>
    <div class="text-xs text-grey-400">{{ points.length }} points targeted</div>
    <USeparator
      color="gray"
      label="Buffer"
      size="xs"
      :ui="{ container: 'text-grey-400', label: 'text-xs' }"
    />
    <div class="grid grid-cols-3 gap-1 items-center">
      <UInput v-model="digit" color="gray" size="xs" type="number"> </UInput>
      <USelect
        v-model="unit"
        :items="units"
        variant="subtle"
        color="primary"
        size="xs"
        class="h-6"
      />
      <UInput v-model="colour" color="gray" size="xs" type="color"> </UInput>
    </div>
    <USeparator
      color="gray"
      label="Intersection"
      size="xs"
      :ui="{ container: 'text-grey-400', label: 'text-xs' }"
    />
    <div class="grid grid-cols-3 gap-1">
      <USelect
        v-model="selectedLayerName"
        :items="activeLayers"
        labelKey="layer_alias"
        valueKey="layer_name"
        color="primary"
        size="xs"
        variant="subtle"
        class="h-6"
      />

      <USelect
        v-model="selectedType"
        :items="['simple', 'categorical']"
        color="primary"
        size="xs"
        variant="subtle"
        class="h-6"
      /><USelect
        :disabled="selectedType === 'simple'"
        v-model="selectedColumn"
        :items="columns"
        labelKey="name"
        color="primary"
        size="xs"
        variant="subtle"
        class="h-6"
      />
    </div>
  </div>
  <div class="p-2 grid grid-cols-2 gap-x-3">
    <UButton
      @click="handleBuffer"
      color="brand"
      variant="outline"
      class="w-full justify-center text-sm rounded-sm"
      >Show Buffer</UButton
    >
    <UButton
      @click="handleIntersect"
      :disabled="!selectedLayerName"
      color="brand"
      class="w-full justify-center text-sm rounded-sm"
      :loading="isAnalyze"
      >Do Intersect</UButton
    >
  </div>
</template>
