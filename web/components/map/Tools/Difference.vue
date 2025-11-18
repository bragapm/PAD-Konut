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

const handleDifference = async () => {
  const body = {
    input_table: [
      selectedLayer.value?.layer_name,
      overlapLayer.value?.layer_name,
    ],
    output_table: outputLayer.value,
  };
  try {
    const response = await fetch("/panel/geoprocessing/difference", {
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
    toast.add({
      title: "Success",
      description:
        "Your difference task has been successfully added to the queue! You'll be notified once processing is complete.",
      icon: "i-heroicons-check-circle",
    });
    featureStore.setRightSidebar("geoprocessing");
    featureStore.setMapInfo("");
    emit("onClose");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to enqueue the difference task. Please try again.";
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
        searchable
        searchable-placeholder="Search Layer"
        v-model="selectedLayer"
        :options="activeLayers"
        :search-attributes="['layer_name', 'label']"
        option-attribute="label"
        placeholder="Select layer"
        color="gray"
        :ui="{
          rounded: 'rounded-xxs',
        }"
        :uiMenu="{
          base: 'space-y-1',
          rounded: 'rounded-xxs',
          background: 'bg-grey-700',
          ring: 'ring-1 ring-grey-600',
          option: {
            base: 'cursor-pointer hover:text-grey-700',
            padding: 'px-1.5 py-1',
            selected: 'bg-grey-200 text-grey-700',
            color: 'text-grey-200',
            rounded: 'rounded-xxs',
            active: 'bg-grey-200 text-grey-700',
            size: 'text-xs',
          },
          input: 'bg-grey-700 text-grey-200 text-xs',
        }"
        size="2xs"
      />
    </div>
    <div class="space-y-1">
      <p class="text-2xs text-white">Overlaps with</p>
      <USelectMenu
        searchable
        searchable-placeholder="Search Layer"
        v-model="overlapLayer"
        :options="activeLayers"
        :search-attributes="['layer_name', 'label']"
        option-attribute="label"
        placeholder="Select layer"
        color="gray"
        :ui="{
          rounded: 'rounded-xxs',
        }"
        :uiMenu="{
          base: 'space-y-1',
          rounded: 'rounded-xxs',
          background: 'bg-grey-700',
          ring: 'ring-1 ring-grey-600',
          option: {
            base: 'cursor-pointer hover:text-grey-700',
            padding: 'px-1.5 py-1',
            selected: 'bg-grey-200 text-grey-700',
            color: 'text-grey-200',
            rounded: 'rounded-xxs',
            active: 'bg-grey-200 text-grey-700',
            size: 'text-xs',
          },
          input: 'bg-grey-700 text-grey-200 text-xs',
        }"
        size="2xs"
      />
    </div>
    <div class="space-y-1">
      <p class="text-2xs text-white">Output Feature Class Name</p>
      <UInput
        v-model="outputLayer"
        color="gray"
        :ui="{ rounded: 'rounded-xxs' }"
        size="2xs"
      >
      </UInput>
    </div>
  </div>
  <div class="p-2">
    <UButton
      @click="handleDifference"
      color="brand"
      :ui="{ rounded: 'rounded-[4px]' }"
      class="w-full justify-center text-sm"
      :loading="false"
      >Apply Difference</UButton
    >
  </div>
</template>
