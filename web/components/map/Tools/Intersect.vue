<script lang="ts" setup>
const emit = defineEmits<{
  onClose: [];
}>();
const toast = useToast();
const layerStore = useMapLayer();
const authStore = useAuth();
const queueStore = useGeoprocessingQueue();
const featureStore = useFeature();
const activeLayers = computed(() => {
  return layerStore.groupedActiveLayers
    ?.map(({ layerLists }) => layerLists)
    .flat()
    .filter((el) => el.source === "vector_tiles")
    .map((el: LayerLists) => {
      return {
        label: el.layer_alias || (el as VectorTiles).layer_name,
        layer_name: (el as VectorTiles).layer_name,
      };
    });
});
const selectedLayer = ref<{ layer_name: string; label: string }>();
const overlapLayer = ref<{ layer_name: string; label: string }>();
const outputLayer = ref<string>();

const handleIntersect = async () => {
  const body = {
    input_table: [
      selectedLayer.value?.layer_name,
      overlapLayer.value?.layer_name,
    ],
    output_table: outputLayer.value,
  };
  try {
    const response = await fetch("/panel/geoprocessing/intersect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const result = await response.json();

    if (result.errors?.length) throw new Error(result.errors[0].message);
    setTimeout(() => {
      queueStore.checkQueueState(result.message_id);
    }, 1000);
    featureStore.setRightSidebar("geoprocessing");
    featureStore.setMapInfo("");
    emit("onClose");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to enqueue the intersect task. Please try again.";
    toast.add({
      title: message,
      icon: "i-heroicons-x-mark",
    });
  }
};
</script>

<template>
  <div class="p-2 flex flex-col gap-2">
    <div class="space-y-1">
      <p class="text-2xs text-white">Create new features from</p>
      <USelectMenu
        v-model="selectedLayer"
        :items="activeLayers"
        placeholder="Select layer"
        size="sm"
      />
    </div>
    <div class="space-y-1">
      <p class="text-2xs text-white">Overlaps with</p>
      <USelectMenu
        v-model="overlapLayer"
        :items="activeLayers"
        placeholder="Select layer"
        size="sm"
      />
    </div>
    <div class="space-y-1">
      <p class="text-2xs text-white">Output Feature Class Name</p>
       <UInput v-model="outputLayer" class="w-full" size="sm">
      </UInput>
    </div>
  </div>
  <div class="p-2">
    <UButton
      @click="handleIntersect"
      color="brand"
      class="w-full justify-center text-sm rounded-sm"
      :loading="false"
      >Apply Intersect</UButton
    >
  </div>
</template>
