<script setup lang="ts">
import IcArrowLeft from "~/assets/icons/ic-arrow-left.svg";
import { useMapData } from "~/utils";

const { isLoading, data: mapData } = await useMapData();
const featureStore = useFeature();

const closeMapInfo = () => {
  featureStore.setMapInfo("");
};
</script>

<template>
  <div class="flex justify-between items-center m-3">
    <h2 class="text-white">Map Information</h2>
    <IcArrowLeft
      role="button"
      @click="closeMapInfo"
      :fontControlled="false"
      class="w-3 h-3 rotate-180 text-grey-50"
    />
  </div>
  <hr class="mx-3" />
  <div class="flex-1 overflow-y-auto px-3 my-3">
    <div v-if="!mapData" class="animate-pulse space-y-3">
      <div class="w-full h-8 bg-grey-700 rounded-xs"></div>
      <div class="w-full h-8 bg-grey-700 rounded-xs"></div>
      <div class="w-full h-44 bg-grey-700 rounded-xs"></div>
      <div class="w-full h-6 bg-grey-700 rounded-xs"></div>
      <div class="w-full h-6 bg-grey-700 rounded-xs"></div>
      <div class="w-full h-6 bg-grey-700 rounded-xs"></div>
      <div class="w-full h-6 bg-grey-700 rounded-xs"></div>
      <div class="w-full h-6 bg-grey-700 rounded-xs"></div>
      <div class="w-full h-6 bg-grey-700 rounded-xs"></div>
      <div class="w-full h-12 bg-grey-700 rounded-xs"></div>
      <div class="w-full h-12 bg-grey-700 rounded-xs"></div>
    </div>
    <template v-else>
      <MapMarkdownRenderer :source="mapData?.data.information" />
      <ul
        class="mt-3 space-y-3"
        v-if="mapData?.data.information_attachments?.length"
      >
        <MapAttachmentLink
          v-for="attachment in mapData?.data.information_attachments"
          :title="attachment.title"
          :description="attachment.description"
          :url="attachment.url"
          :icon="attachment.icon"
        /></ul
    ></template>
  </div>
</template>
