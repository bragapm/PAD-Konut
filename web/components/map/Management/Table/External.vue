<script lang="ts" setup>
import { useQuery } from "@tanstack/vue-query";
import { onRowClick } from "~/utils/table";
import IcCross from "~/assets/icons/ic-cross.svg";
import IcExpand from "~/assets/icons/ic-expand.svg";
import IcSort from "~/assets/icons/ic-sort.svg";

const props = defineProps<{
  selectedLayerId: string;
  layerId: string;
}>();

const authStore = useAuth();
const store = useTableData();
const { closeTable, toggleFullscreen, setActiveTable, removeActiveTableByKey } =
  store;
const { activeTableList, activeTable } = storeToRefs(store);

const mapStore = useMap();
const { highlightedLayers } = storeToRefs(mapStore);
const mapRefStore = useMapRef();
const mapLayerStore = useMapLayer();
const { groupedActiveLayers } = storeToRefs(mapLayerStore);

// const selectedIds = ref<string[]>([]);
// const highlightedIds = ref<string[]>([]);

const isAllChecked = ref(
  highlightedLayers.value[props.layerId]
    ? highlightedLayers.value[props.layerId]["highlightedAll"]
    : false
);
const hiddenFields = ref<string[]>([]);
const showFieldOpen = ref(false);

const headerData = ref<any>([]);

const { data, error, isFetching, isError } = useQuery({
  queryKey: ["table_external_vector", props.selectedLayerId],
  queryFn: async ({ queryKey }) => {
    const parsedLayerId = props.selectedLayerId!.split("_")[0];
    const queryParams: Record<string, string> = {
      limit: "25",
    };
    const r = await $fetch<GeoJSON.FeatureCollection>(
      `/panel/external-vector/${parsedLayerId}?` +
        new URLSearchParams(queryParams)
    );
    return r;
  },
});

const { data: layerData } = useQuery({
  queryKey: ["table_external_json_name", props.selectedLayerId],
  queryFn: async ({ queryKey }) => {
    const parsedLayerId = props.selectedLayerId!.split("_")[0];
    const r = await $fetch<{ data: { layer_alias: string } }>(
      `/panel/items/external_json/${parsedLayerId}?fields=layer_alias`,
      {
        headers: { Authorization: "Bearer " + authStore.accessToken },
      }
    );

    return r.data;
  },
});

const columns = computed<
  {
    key: string;
    label: string;
    type: string;
  }[]
>(() => {
  if (headerData.value) {
    const header = [];
    for (const [key, value] of Object.entries(headerData.value)) {
      header.push({
        key: key,
        label: capitalizeEachWords(key),
        type: typeof value,
      });
    }
    return header;
  } else return [];
});

watchEffect(() => {
  if (data.value && data.value.features.length > 0) {
    headerData.value = data.value.features[0].properties;
  }
});

const handleClickCheckboxHeader = () => {
  isAllChecked.value = !isAllChecked.value;

  const activeLayers = groupedActiveLayers.value.flatMap((el) => el.layerLists);
  const targetLayer = activeLayers.find(
    (el) => (el as VectorTiles).layer_id === props.layerId
  );

  if (targetLayer) {
    highlightedLayers.value[(targetLayer as VectorTiles).layer_id] = {
      ...(targetLayer as VectorTiles),
      ids: [],
      highlightedAll: isAllChecked.value,
    };
  }
};

const handleClickCheckboxRow = (event: Event, rowData: any) => {
  const activeLayers = groupedActiveLayers.value.flatMap((el) => el.layerLists);
  const targetLayer = activeLayers.find(
    (el) => (el as VectorTiles).layer_id === props.layerId
  );
  if (targetLayer) {
    if ((targetLayer as VectorTiles).layer_id in highlightedLayers.value) {
      const existingIds: number[] =
        highlightedLayers.value[props.layerId]?.ids || [];
      const index = existingIds.indexOf(rowData.id);
      let updatedIds;
      if (index === -1) {
        updatedIds = [...existingIds, rowData.id];
      } else {
        updatedIds = existingIds.filter((id) => id !== rowData.id);
      }
      highlightedLayers.value[(targetLayer as VectorTiles).layer_id]["ids"] =
        updatedIds;
    } else {
      highlightedLayers.value[(targetLayer as VectorTiles).layer_id] = {
        ...(targetLayer as VectorTiles),
        ids: [rowData.id],
        highlightedAll: isAllChecked.value,
      };
    }
  }
  event.preventDefault();
  event.stopPropagation();
};
</script>

<template>
  <div
    class="flex flex-col p-3 h-full max-h-full relative"
    :class="activeTable?.layer_id === layerId ? 'flex' : 'hidden'"
  >
    <div class="flex justify-between border-b border-grey-700 pb-1">
      <div>
        <h1 class="text-grey-50 text-xs font-medium">Data Table</h1>
        <p class="text-grey-500 text-2xs">
          Manage active layer to be displayed on map
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="toggleFullscreen">
          <IcExpand class="size-3 text-grey-400" :fontControlled="false" />
        </button>
        <button
          @click="
            () => {
              closeTable();
            }
          "
        >
          <IcCross class="size-[14px] text-grey-400" :fontControlled="false" />
        </button>
      </div>
    </div>
    <div class="flex justify-between items-center gap-3 my-3">
      <div class="flex items-center gap-3">
        <!-- <button
          class="flex items-center gap-3 p-2 border border-grey-600 rounded-sm bg-grey-800 text-xs text-grey-200 whitespace-nowrap"
        >
          <IcShrink
            class="w-[14px] h-[14px] text-grey-400"
            :fontControlled="false"
          />
          {{ layerData?.layer_alias ?? "-" }}
        </button> -->
        <!-- <div class="border-l border-grey-700 h-8"></div> -->

        <UPopover
          v-model:open="showFieldOpen"
          :content="{ align: 'start' }"
          :ui="{
            content:
              'p-2 w-52 max-h-52 overflow-y-scroll rounded-sm bg-grey-800 shadow-lg ring-1 ring-grey-700 overflow-x-hidden',
          }"
        >
          <UButton
            :color="showFieldOpen ? 'gray' : 'gray'"
            :variant="showFieldOpen ? 'solid' : 'ghost'"
            :class="[
              showFieldOpen
                ? 'border-grey-500 bg-grey-700'
                : 'border-grey-600 bg-transparent',
              'flex items-center gap-1 py-1 px-[6px] border rounded-sm text-2xs text-grey-200 whitespace-nowrap',
            ]"
          >
            <IcSort class="size-3 text-grey-400" :fontControlled="false" />
            Show All Field
          </UButton>

          <template #content>
            <div class="flex flex-col">
              <div
                v-for="column in columns"
                :key="column.key"
                class="text-grey-50 flex w-full items-center p-0 gap-x-2 text-xs first:rounded-t-xxs last:rounded-b-xxs"
              >
                <CoreCheckbox
                  :id="column.key + '-checkbox'"
                  :index="0"
                  :is-checked="!hiddenFields.includes(column.key)"
                  :forHeader="true"
                  @click="
                    (event:Event) => {
                      event.preventDefault();
                      if(hiddenFields.includes(column.key)){
                        hiddenFields = hiddenFields.filter(c => c !== column.key)
                      } else {
                        hiddenFields = [...hiddenFields, column.key]
                      }
                    }
                  "
                />
                {{ column.label }}
              </div>
            </div>
          </template>
        </UPopover>
      </div>
    </div>
    <div
      v-if="activeTableList.length > 0"
      class="flex overflow-x-auto hide-scrollbar"
    >
      <div
        class="flex items-center gap-1 whitespace-nowrap px-[6px] py-1 border border-grey-600 rounded-t-xxs cursor-pointer"
        :class="
          item.layer_id === activeTable?.layer_id && 'bg-grey-800 font-semibold'
        "
        v-for="item in activeTableList"
        @click="
          () => {
            setActiveTable(item);
          }
        "
      >
        <p class="text-2xs text-grey-200">{{ item.label }}</p>
        <button
          @click.stop="
            () => {
              removeActiveTableByKey(item.layer_id);
            }
          "
        >
          <IcCross class="size-2 text-grey-400" :fontControlled="false" />
        </button>
      </div>
    </div>
    <section
      class="h-[calc(100%-5.5rem)] flex flex-col rounded-sm border border-grey-600 w-full overflow-auto pb-12 relative"
    >
      <header class="flex w-full sticky top-0">
        <div class="bg-grey-800 h-8 w-14 flex items-center justify-center">
          <CoreCheckbox
            id="all-checkbox"
            :index="0"
            :is-checked="isAllChecked"
            :forHeader="true"
            @click="handleClickCheckboxHeader"
          />
        </div>
        <div
          v-for="column in columns.filter((c) => !hiddenFields.includes(c.key))"
          class="bg-grey-800 hover:bg-grey-700 h-8 flex-1 min-w-[12rem] text-grey-50 flex items-center justify-between text-xs font-medium px-3 py-0 group"
        >
          {{ column.label }}
        </div>
      </header>
      <template v-if="data?.features.length">
        <main
          role="button"
          @click="() => onRowClick(rowData.geometry)"
          class="flex w-full group"
          v-for="rowData in data.features"
          :key="rowData.id"
        >
          <div
            :class="[
              'h-8 w-10 flex items-center justify-center group-hover:bg-grey-700 ',
              (!isAllChecked &&
                highlightedLayers[layerId]?.ids.includes(rowData.id)) ||
              (isAllChecked &&
                !highlightedLayers[layerId]?.ids.includes(rowData.id))
                ? 'bg-red-950'
                : '',
            ]"
          >
            <CoreCheckbox
              id="id-checkbox"
              :index="rowData.id as string"
              :is-checked="
                isAllChecked ||
                highlightedLayers[layerId]?.ids.includes(rowData.id)
              "
              :forHeader="true"
              @click="(event:Event) => handleClickCheckboxRow(event, rowData)"
            />
          </div>
          <div
            v-for="column in columns.filter(
              (c) => !hiddenFields.includes(c.key)
            )"
            :key="column.key"
            :class="[
              'first-letter:h-8 flex-1 min-w-[12rem] flex items-center text-xs font-normal px-3 py-0 group-hover:bg-grey-700',
              highlightedLayers[layerId]?.ids.includes(rowData.id)
                ? isAllChecked
                  ? 'text-grey-400'
                  : 'text-brand-500 bg-red-950'
                : isAllChecked
                ? 'text-brand-500 bg-red-950'
                : 'text-grey-400',
            ]"
          >
            <MapManagementTableTooltip :text="rowData.properties![column.key]">
              <p
                class="truncate w-[11rem] overflow-hidden whitespace-nowrap text-ellipsis"
              >
                {{ rowData.properties![column.key] }}
              </p>
            </MapManagementTableTooltip>
          </div>
        </main>
      </template>
    </section>
  </div>
</template>
