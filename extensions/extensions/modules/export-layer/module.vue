<script setup>
import { computed, reactive, ref } from "vue";
import { useApi, useItems } from "@directus/extensions-sdk";

const collectionRef = ref("vector_tiles");
const query = {
  fields: ref(["layer_name"]),
  sort: ref("layer_name"),
  limit: ref(-1),
};

const api = useApi();
const { getItems, items } = useItems(collectionRef, query);
getItems();

const layerNameSelect = ref(null);
const layerNameItems = computed(() => {
  return items.value.map((el) => {
    return { text: el.layer_name, value: el.layer_name };
  });
});
const outputFormat = ref(null);
const isProcessing = ref(false);
const dialog = reactive({
  active: false,
  content: null,
  anchorHref: null,
  anchorContent: null,
});

const processBtnHandler = async () => {
  isProcessing.value = true;
  dialog.anchorHref = null;
  dialog.anchorContent = null;

  try {
    const res = await api.post(`/export-layer/${layerNameSelect.value}`, {
      format: outputFormat.value,
    });
    dialog.content = "Process queued with message ID:";
    dialog.anchorHref = `${api.defaults.baseURL}admin/content/geoprocessing_queue/${res.data.message_id}`;
    dialog.anchorContent = res.data.message_id;
  } catch (error) {
    if (error.response) {
      dialog.content = error.response.data.errors[0].message;
    } else if (error.request) {
      console.error(error.request);
      dialog.content =
        "Something went wrong. The request was made but no response was received";
    } else {
      console.error(error.message);
      dialog.content = "Something went wrong when setting up the request";
    }
  }

  dialog.active = true;
  isProcessing.value = false;
};
</script>

<template>
  <private-view title="Export Layer">
    <template #title-outer:prepend>
      <v-button class="header-icon" rounded disabled icon secondary>
        <v-icon name="publish" />
      </v-button>
    </template>
    <div style="padding: 0 var(--content-padding)">
      <div style="margin-bottom: 1rem">
        <label for="layer-name-select">Select layer</label>
        <VSelect
          id="layer-name-select"
          v-model="layerNameSelect"
          :items="layerNameItems"
          :disabled="isProcessing"
        />
      </div>
      <div style="margin-bottom: 1rem">
        <label for="format-select">Select output format</label>
        <VSelect
          id="spatial-data-type-input"
          v-model="outputFormat"
          :items="[
            { text: 'GeoPackage', value: 'gpkg' },
            { text: 'KML', value: 'kml' },
            { text: 'GeoJSON', value: 'geojson' },
          ]"
          :disabled="isProcessing"
        />
      </div>
      <VButton
        v-if="layerNameSelect && outputFormat"
        :loading="isProcessing"
        @click="processBtnHandler"
        >Process</VButton
      >
    </div>
    <VDialog v-model="dialog.active">
      <VSheet>
        <h2>{{ dialog.content }}</h2>
        <a
          v-if="dialog.anchorHref && dialog.anchorContent"
          :href="dialog.anchorHref"
          ><code>{{ dialog.anchorContent }}</code></a
        >
      </VSheet>
    </VDialog>
  </private-view>
</template>
