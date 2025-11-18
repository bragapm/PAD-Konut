<script lang="ts" setup>
import IcArrowLeft from "~/assets/icons/ic-arrow-left.svg";

const featureStore = useFeature();

const closeAnalytic = () => {
  featureStore.setMapInfo("");
};

const analysisStore = useAnalysisResult();
</script>

<template>
  <div class="flex justify-between items-center m-3">
    <h2 class="text-white">Analysis Result</h2>
    <IcArrowLeft
      role="button"
      @click="closeAnalytic"
      :fontControlled="false"
      class="w-3 h-3 rotate-180 text-grey-50"
    />
  </div>
  <hr class="mx-3" />
  <div class="flex-1 overflow-y-auto px-3 py-1 my-3 space-y-2">
    <MapAnalysisItem v-for="result in analysisStore.results" :result="result" />
  </div>
</template>
