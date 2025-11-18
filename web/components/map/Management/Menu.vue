<script setup lang="ts">
import IcMenuDots from "~/assets/icons/ic-menu-dots.svg";
import type { LngLatBoundsLike } from "maplibre-gl";
import bbox from "@turf/bbox";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { capitalizeEachWords } from "~/utils";

const props = defineProps<{
  disabled: boolean;
  item: LayerLists;
}>();
const open = ref(false);
const queryClient = useQueryClient();
const toast = useToast();
const authStore = useAuth();
const store = useTableData();
const { toggleTable } = store;

const mapStore = useMapRef();
const { map } = storeToRefs(mapStore);

const mapLayerStore = useMapLayer();
const tableDataStore = useTableData();
const { addActiveTableList, setActiveTable } = tableDataStore;

const queueId = ref("");
const exportLoad = ref(false);
const {
  data: exportData,
  // error: detailError,
  // isFetching: isDetailFetching,
  // isError: isDetailError,
} = useQuery({
  queryKey: ["/panel/items/geoprocessing_queue"],
  queryFn: async ({ queryKey }) => {
    const res = await $fetch<any>(`${queryKey[0]}/${queueId.value}`, {
      headers: {
        Authorization: "Bearer " + authStore.accessToken,
        "Cache-Control": "no-store",
      },
    });

    return res;
  },
  enabled: computed(() => (queueId.value ? true : false)),
  refetchInterval: computed(() => (queueId.value ? 3000 : false)),
  refetchOnWindowFocus: false,
});

const downloadFile = async (fileId: string) => {
  try {
    const response = await fetch(`/panel/assets/${fileId}?download`, {
      method: "GET",
    });
    const resData = await response.blob();
    let anchor = document.createElement("a");
    const href = window.URL.createObjectURL(resData);
    anchor.href = href;
    anchor.download =
      (props.item as VectorTiles).layer_alias ||
      (props.item as VectorTiles).layer_name;
    anchor.click();
    window.URL.revokeObjectURL(href);
    anchor.remove();
  } catch (error) {
    toast.add({
      title: "Download failed",
      description: "Something wrong, try again later",
      icon: "i-heroicons-information-circle",
      duration: 1500,
    });
  }
};

watchEffect(() => {
  if (
    queueId.value &&
    exportData.value?.data &&
    exportData.value.data.state === "done"
  ) {
    if (exportData.value.data.status === "success") {
      downloadFile(exportData.value.data.result.file_id);
      queryClient.resetQueries({
        queryKey: ["/panel/items/geoprocessing_queue"],
        exact: true,
      });
      queueId.value = "";
    } else if (exportData.value.data.status === "error") {
      toast.add({
        title: "Export Error",
        description: "Something wrong, try again later",
        icon: "i-heroicons-information-circle",
      });
    }
    queryClient.resetQueries({
      queryKey: ["/panel/items/geoprocessing_queue"],
      exact: true,
    });
    queueId.value = "";
    exportLoad.value = false;
  }
});

const handleExport = async (format: string) => {
  try {
    const result = await $fetch<{ message_id: string }>(
      "/panel/export-layer/" + (props.item as VectorTiles).layer_name,
      {
        method: "POST",
        body: JSON.stringify({
          format: format,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (result.message_id) {
      queueId.value = result.message_id;
      exportLoad.value = true;
    }
  } catch (error) {
    toast.add({
      title: "Export JSON failed",
      description: "Something wrong, try again later",
      icon: "i-heroicons-information-circle",
      duration: 1500,
    });
  }
};
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{
      align: 'start',
      side: 'right',
      sideOffset: 10,
    }"
    :ui="{
      content:
        'w-56 h-fit p-2 flex flex-col gap-2 rounded-sm bg-grey-900 shadow-lg ring-1 ring-grey-700 focus:outline-none',
    }"
  >
    <UButton
      :disabled="disabled"
      color="neutral"
      variant="ghost"
      class="p-0 hover:bg-transparent"
    >
      <IcMenuDots
        :class="['size-3', disabled ? 'text-grey-600' : 'text-grey-400']"
        :fontControlled="false"
      />
    </UButton>

    <template #content>
      <button
        @click="
                () => {
                  if(item.source ==='three_d_tiles'){
                    const data = mapLayerStore.threeDLayerCenter
                    const current = data[data.findIndex((el:any) => el.id === item.layer_id)]
                    if(current) {
                      map?.flyTo({ center : current.center , zoom : current.zoom })
                    }
                  }else{
                    if((item as VectorTiles|RasterTiles).bounds){
                      map?.fitBounds(bbox(item.bounds) as LngLatBoundsLike, { padding: {top: 100, bottom:150, left: 300, right: 50} });
                    }
                  }
                }
              "
        :class="[
          'group flex w-full items-center gap-3 rounded-sm p-2 text-xs text-white hover:bg-grey-700 cursor-pointer',
        ]"
      >
        Zoom To Fit
      </button>
      <hr class="border-t-2 border-grey-800" />
      <button
        v-if="item.source === 'vector_tiles'"
        @click="
          () => {
            handleExport('geojson');
          }
        "
        :class="[
          'group flex w-full items-center gap-3 rounded-sm p-2 text-xs text-white hover:bg-grey-700 cursor-pointer',
        ]"
      >
        Export JSON
      </button>
      <button
        v-if="item.source === 'vector_tiles'"
        @click="
          () => {
            handleExport('gpkg');
          }
        "
        :class="[
          'group flex w-full items-center gap-3 rounded-sm p-2 text-xs text-white hover:bg-grey-700 cursor-pointer',
        ]"
      >
        Export GPKG
      </button>
      <button
        v-if="item.source === 'vector_tiles'"
        @click="
          () => {
            handleExport('kml');
          }
        "
        :class="[
          'group flex w-full items-center gap-3 rounded-sm p-2 text-xs text-white hover:bg-grey-700 cursor-pointer',
        ]"
      >
        Export KML
      </button>
      <button
        @click="() => {}"
        :class="[
          'group flex w-full items-center gap-3 rounded-sm p-2 text-xs text-white hover:bg-grey-700 cursor-pointer',
        ]"
      >
        About Layer
      </button>
      <button
        @click="() => {}"
        :class="[
          'group flex w-full items-center gap-3 rounded-sm p-2 text-xs text-white hover:bg-grey-700 cursor-pointer',
        ]"
      >
        Edit Layer Info
      </button>
      <button
        :disabled="
          item.source !== 'vector_tiles' && item.source !== 'external_vector'
        "
        @click="
                () => {
                  let tableObj = {
                    source: item.source,
                    label:
                      item.source === 'vector_tiles'
                        ? capitalizeEachWords(item.layer_name)
                        : item.layer_alias,
                    layer_id: item.layer_id,
                    key:
                      item.source === 'vector_tiles'
                        ? item.layer_name
                        : item.layer_id.split('_')[0],
                  };
                  addActiveTableList(tableObj as TableItem)
                  setActiveTable(tableObj as TableItem)
                  toggleTable();
                  open = false
                }
              "
        :class="[
          item.source !== 'vector_tiles' && item.source !== 'external_vector'
            ? 'text-grey-500'
            : 'text-white',
          'group flex w-full items-center gap-3 rounded-sm p-2 text-xs hover:bg-grey-700 cursor-pointer',
        ]"
      >
        View Data Table
      </button>
      <hr class="border-t-2 border-grey-800" />
      <button
        @click="
          () => {
            mapLayerStore.removeLayer(item);
          }
        "
        :class="[
          'group flex w-full items-center gap-3 rounded-sm p-2 text-xs text-brand-600 hover:bg-grey-700 cursor-pointer',
        ]"
      >
        Delete Layer
      </button>
    </template>
  </UPopover>
</template>
