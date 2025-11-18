<script setup lang="ts">
import { useQuery, useInfiniteQuery } from "@tanstack/vue-query";
import { onRowClick } from "~/utils/table";
import IcCross from "~/assets/icons/ic-cross.svg";
import IcDownload from "~/assets/icons/ic-download.svg";
import IcExpand from "~/assets/icons/ic-expand.svg";
import IcFilter from "~/assets/icons/ic-filter.svg";
import IcSort from "~/assets/icons/ic-sort.svg";
import IcArrowReg from "~/assets/icons/ic-arrow-reg.svg";
import { capitalizeEachWords } from "~/utils";
import { provide } from "vue";

const props = defineProps<{
  activeCollection: string;
  layerId: string;
}>();

export type HeaderData = {
  field: string;
  type: string;
};

type Columns = { key: string; label: string; type: string };

const store = useTableData();
const { closeTable, toggleFullscreen, setActiveTable, removeActiveTableByKey } =
  store;
const { activeTableList, activeTable } = storeToRefs(store);

const mapStore = useMap();
const { removeHighlightedLayer, removeAllHighlightedLayer } = mapStore;
const { highlightedLayers } = storeToRefs(mapStore);

const mapRefStore = useMapRef();

const mapLayerStore = useMapLayer();
const { groupedActiveLayers } = storeToRefs(mapLayerStore);

const authStore = useAuth();

//  {
//     headers: { Authorization: "Bearer " + authStore.accessToken },
//   }
const {
  data: headerData,
  error: headerError,
  isFetching: isHeaderFetching,
  isError: isHeaderError,
} = useQuery({
  queryKey: [props.activeCollection],
  queryFn: async ({ queryKey }) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (authStore.accessToken) {
      headers["Authorization"] = `Bearer ${authStore.accessToken}`;
    }

    const res = await $fetch<{ data: HeaderData[] }>(
      `/panel/vector-tiles-attribute-table-header/${props.activeCollection}`,
      { headers }
    );

    return res.data;
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
    return headerData.value
      .map((el: HeaderData) => ({
        key: el.field,
        label: capitalizeEachWords(el.field),
        type: el.type,
      }))
      .filter((el: Columns) => el.type !== "geometry");
  } else return [];
});

const sortBy = ref("");

const {
  data: countData,
  error: countError,
  isFetching: isCountFetching,
  isError: isCountError,
} = useQuery({
  queryKey: ["count_table_data_query_key", props.layerId],
  queryFn: async ({ queryKey }) => {
    const queryParams: Record<string, string> = {
      filter: JSON.stringify({
        _and: filterParams.value || [],
      }),
    };
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (authStore.accessToken) {
      headers["Authorization"] = `Bearer ${authStore.accessToken}`;
    }
    const r = await $fetch<{ data: { count: number }[] }>(
      `/panel/items/${props.activeCollection}?aggregate[count]=*&` +
        new URLSearchParams(queryParams),
      { headers }
    ).then((r) => r.data[0].count);

    return r;
  },
});

const {
  data: tableData,
  error: tableError,
  fetchNextPage,
  hasNextPage,
  isError: isTableError,
  isFetching: isTableFetching,
  refetch,
} = useInfiniteQuery({
  queryKey: ["table_data_query_key", props.layerId],
  queryFn: async ({ pageParam = 1, queryKey }) => {
    const queryParams: Record<string, string> = {
      limit: "25",
      page: pageParam.toString(),
      ...(headerData.value && {
        fields: headerData.value
          .filter((el: HeaderData) => el.type !== "geometry")
          .map((el: HeaderData) => el.field)
          .concat("ogc_fid,geom")
          .join(","),
      }),
      ...(filterParams.value && {
        filter: JSON.stringify({
          _and: filterParams.value,
        }),
      }),
      sort: sortBy.value,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (authStore.accessToken) {
      headers["Authorization"] = `Bearer ${authStore.accessToken}`;
    }

    const r = await $fetch<{ data: any[] }>(
      `/panel/items/${props.activeCollection}?` +
        new URLSearchParams(queryParams),
      { headers }
    );
    return r.data;
  },
  initialPageParam: 1,
  getNextPageParam: (_, allPages, lastPageParam) => {
    if (allPages.length * 25 >= countData.value!) {
      return undefined;
    }
    return lastPageParam + 1;
  },
});

const isAllChecked = ref(
  highlightedLayers.value[props.layerId]
    ? highlightedLayers.value[props.layerId]["highlightedAll"]
    : false
);

const toast = useToast();
watchEffect(() => {
  if (isHeaderError.value || isCountError.value || isTableError.value) {
    toast.add({
      title: "Error on fetching table data",
      description: "Something went wrong, please contact data administrator",
      icon: "i-heroicons-information-circle",
    });
  }
});

const floatVisibility = ref(0);
const handleScroll = (event: Event) => {
  const element = event.target as HTMLDivElement;
  // const scrollPercentage =
  //   element.scrollTop / (element.scrollHeight - element.clientHeight);
  const willVisible =
    (24 - (element.scrollHeight - element.clientHeight - element.scrollTop)) /
    24;

  if (willVisible) floatVisibility.value = willVisible;
  else floatVisibility.value = willVisible;
};

const downloadData = async () => {
  const queryString = new URLSearchParams({
    ...(highlightedLayers.value?.[props.layerId]?.["ids"]?.length > 0 && {
      filter: JSON.stringify({
        ogc_fid: {
          [!isAllChecked.value ? "_in" : "_nin"]:
            highlightedLayers.value[props.layerId]["ids"],
        },
      }),
    }),
    export: "csv",
  });
  try {
    const response = await fetch(
      `/panel/items/${props.activeCollection}?${queryString}`,
      {
        method: "GET",
      }
    );
    const resData = await response.blob();
    let anchor = document.createElement("a");
    const href = window.URL.createObjectURL(resData);
    anchor.download = props.activeCollection!;
    anchor.href = href;
    anchor.click();
    window.URL.revokeObjectURL(href);
    anchor.remove();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    toast.add({
      title: "Error on downloading table data",
      description: message,
    });
  }
};

const hiddenFields = ref<string[]>([]);
const showFieldOpen = ref(false);
const columnPopoverOpen = ref<Record<string, boolean>>({});

const isOpen = ref(false);

function closeModal() {
  isOpen.value = false;
}
function openModal() {
  isOpen.value = true;
}

const filterStore = useFilter();
const { removeFilterListByKey, resetFilterList } = filterStore;
const { filterArrayList, filterParamsList } = storeToRefs(filterStore);

const filterArray = ref<(FilterItem | GroupItem)[]>(
  filterArrayList.value[props.layerId] || []
);
const filterParams = ref<FilterParams[] | null>(
  filterParamsList.value[props.layerId] || null
);

function setFilterParams(value: FilterParams[] | null) {
  filterParams.value = value;
}

function resetFilter() {
  filterArray.value = [];
  filterParams.value = null;
}

function addFilter() {
  let current = JSON.parse(JSON.stringify(filterArray.value));
  filterArray.value = [
    ...current,
    { id: crypto.randomUUID(), field: "", operator: "", value: "" },
  ];
}

function addGroup(group: LogicalOperator) {
  let current = JSON.parse(JSON.stringify(filterArray.value));
  filterArray.value = [
    ...current,
    { id: crypto.randomUUID(), group: group, filter: [] },
  ];
}

function updateFilter(id: string, newValue: FilterItem) {
  const current = [...JSON.parse(JSON.stringify(filterArray.value))];
  const path = findPathById(current, id);

  updateByPath(current, path, newValue);
  filterArray.value = current;
}

function updateGroup(id: string, newValue: LogicalOperator) {
  const current = [...JSON.parse(JSON.stringify(filterArray.value))];
  const path = findPathById(current, id);
  updateGroupByPath(current, path, newValue);
  filterArray.value = current;
}

function insertFilter(id: string) {
  let current = JSON.parse(JSON.stringify(filterArray.value));
  const path = findPathById(current, id);
  insertByPath(current, path, {
    id: crypto.randomUUID(),
    field: "",
    operator: "",
    value: "",
  });
  filterArray.value = current;
}

function insertGroup(id: string, group: LogicalOperator) {
  let current = JSON.parse(JSON.stringify(filterArray.value));
  const path = findPathById(current, id);
  insertByPath(current, path, {
    id: crypto.randomUUID(),
    group: group,
    filter: [],
  });
  filterArray.value = current;
}

function deleteById(id: string) {
  const current = [...JSON.parse(JSON.stringify(filterArray.value))];
  const path = findPathById(current, id);
  const deleted = deleteByPath(current, path);
  filterArray.value = deleted;
}

const filterProps = {
  filterArray,
  filterParams,
  setFilterParams,
  resetFilter,
  addFilter,
  addGroup,
  updateGroup,
  updateFilter,
  insertFilter,
  insertGroup,
  deleteById,
};

provide("filterPropsProvider", filterProps);

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
      const index = existingIds.indexOf(rowData.ogc_fid);
      let updatedIds;
      if (index === -1) {
        updatedIds = [...existingIds, rowData.ogc_fid];
      } else {
        updatedIds = existingIds.filter((id) => id !== rowData.ogc_fid);
      }
      highlightedLayers.value[(targetLayer as VectorTiles).layer_id]["ids"] =
        updatedIds;
    } else {
      highlightedLayers.value[(targetLayer as VectorTiles).layer_id] = {
        ...(targetLayer as VectorTiles),
        ids: [rowData.ogc_fid],
        highlightedAll: isAllChecked.value,
      };
    }
  }
  event.preventDefault();
  event.stopPropagation();
  // onRowSelect({ ogc_fid: rowData.ogc_fid, geom: rowData.geom });
};
</script>

<template>
  <div
    class="flex-col p-3 h-full max-h-full relative"
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
              resetFilterList();
              removeAllHighlightedLayer();
            }
          "
        >
          <IcCross class="size-[14px] text-grey-400" :fontControlled="false" />
        </button>
      </div>
    </div>

    <div class="flex justify-between items-center gap-3 my-3">
      <div class="flex items-center gap-3">
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
              'flex items-center gap-1 py-1 px-[6px] border rounded-sm text-2xs text-grey-200',
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

        <button
          class="flex items-center gap-1 py-1 px-[6px] border border-grey-600 rounded-sm bg-transparent text-2xs text-grey-200"
          @click="
            () => {
              openModal();
            }
          "
        >
          <IcFilter class="size-3 text-grey-400" :fontControlled="false" />
          Filter
        </button>
        <UModal
          v-model:open="isOpen"
          :ui="{
            content: 'bg-grey-900 h-[50vh] rounded-sm',
          }"
        >
          <!-- <template #close><div>test</div></template> -->
          <template #content>
            <MapManagementTableFilter
              :layerId="layerId"
              :columns="columns"
              @close-modal="closeModal"
              :filterArray="filterArray"
            />
          </template>
        </UModal>
        <button
          @click="downloadData"
          class="flex items-center gap-1 py-1 px-[6px] border border-grey-600 rounded-sm bg-transparent text-2xs text-grey-200"
        >
          <IcDownload class="size-3 text-grey-400" :fontControlled="false" />
          Download
          {{ highlightedLayers[layerId]?.["ids"]?.length ? "Selected" : "All" }}
        </button>
      </div>
      <div class="flex items-center gap-1">
        <div
          v-if="
            highlightedLayers[layerId] &&
            highlightedLayers[layerId]['ids'].length > 0
          "
          class="rounded-sm border border-grey-800 px-2 py-1 bg-grey-800 text-grey-50 flex justify-center items-center text-2xs"
        >
          {{ highlightedLayers[layerId]["ids"].length }}
          of
          {{ countData }}
          Rows
          {{ isAllChecked ? "Unselected" : "Selected" }}
        </div>
        <MapManagementTableShowFeatures
          :layerId="layerId"
          :filterParams="filterParams"
        />
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
              removeFilterListByKey(item.key);
              removeHighlightedLayer(item.layer_id);
            }
          "
        >
          <IcCross class="size-2 text-grey-400" :fontControlled="false" />
        </button>
      </div>
    </div>
    <!-- New Table -->
    <section
      class="h-[calc(100%-5.5rem)] flex flex-col rounded-sm border border-grey-600 w-full overflow-auto pb-12 relative"
      @scroll="handleScroll"
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
        <UPopover
          v-for="column in columns.filter((c) => !hiddenFields.includes(c.key))"
          :key="column.key"
          v-model:open="columnPopoverOpen[column.key]"
          :content="{ align: 'start' }"
          :ui="{
            content:
              'w-full rounded-sm bg-grey-800 shadow-lg ring-1 ring-black/5 overflow-hidden',
          }"
        >
          <button
            class="bg-grey-800 hover:bg-grey-700 h-8 flex-1 min-w-[12rem] text-grey-50 flex items-center justify-between text-xs font-medium px-3 py-4 group"
          >
            <div class="flex gap-2">
              <p class="line-clamp-2">{{ column.label }}</p>
              <p class="hidden group-hover:block">&#8595;</p>
            </div>
            <UIcon
              v-if="sortBy.includes(column.key)"
              name="i-heroicons-bars-3-bottom-right"
              :class="
                'text-grey-400 h-5 w-5 ' +
                (sortBy[0] === '-' ? 'scale-x-[-1]' : 'rotate-180')
              "
              aria-hidden="true"
            />
          </button>

          <template #content>
            <div class="flex flex-col">
              <button
                class="text-grey-50 flex w-full items-center p-3 text-xs hover:bg-grey-700"
                @click="
                  () => {
                    sortBy = column.key;
                    refetch();
                    columnPopoverOpen[column.key] = false;
                  }
                "
              >
                <UIcon
                  name="i-heroicons-bars-3-bottom-right"
                  class="mr-2 h-4 w-4 rotate-180"
                  aria-hidden="true"
                />
                Sort Ascending
              </button>
              <button
                class="text-grey-50 flex w-full items-center p-3 text-xs hover:bg-grey-700"
                @click="
                  () => {
                    sortBy = '-' + column.key;
                    refetch();
                    columnPopoverOpen[column.key] = false;
                  }
                "
              >
                <UIcon
                  name="i-heroicons-bars-3-bottom-right"
                  class="mr-2 h-4 w-4 scale-x-[-1]"
                  aria-hidden="true"
                />
                Sort Descending
              </button>
            </div>
          </template>
        </UPopover>
      </header>

      <template v-if="tableData?.pages.length">
        <template v-for="tableRows in tableData.pages">
          <main
            role="button"
            @click="() => onRowClick(rowData.geom)"
            class="flex w-full group"
            v-for="rowData in tableRows"
            :key="rowData.ogc_fid"
          >
            <div
              :class="[
                'h-8 w-10 flex items-center justify-center group-hover:bg-grey-700',
                (!isAllChecked &&
                  highlightedLayers[layerId]?.ids.includes(rowData.ogc_fid)) ||
                (isAllChecked &&
                  !highlightedLayers[layerId]?.ids.includes(rowData.ogc_fid))
                  ? 'bg-red-950'
                  : '',
              ]"
            >
              <CoreCheckbox
                id="id-checkbox"
                :index="rowData.ogc_fid"
                :is-checked="
                  isAllChecked ||
                  (highlightedLayers[layerId] && highlightedLayers[layerId]['ids'].some((item: number) => item === rowData.ogc_fid))
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
                'first-letter:h-8 flex-1 min-w-[12rem] overflow-hidden flex items-center text-xs font-normal px-3 group-hover:bg-grey-700',
                highlightedLayers[layerId]?.ids.includes(rowData.ogc_fid)
                  ? isAllChecked
                    ? 'text-grey-400'
                    : 'text-brand-500 bg-red-950'
                  : isAllChecked
                  ? 'text-brand-500 bg-red-950'
                  : 'text-grey-400',
              ]"
            >
              <MapManagementTableTooltip :text="rowData[column.key]">
                <p
                  class="truncate w-[11rem] overflow-hidden whitespace-nowrap text-ellipsis"
                >
                  {{ rowData[column.key] }}
                </p>
              </MapManagementTableTooltip>
            </div>
          </main>
        </template>
      </template>
    </section>

    <template v-if="floatVisibility >= 0">
      <UButton
        v-if="hasNextPage"
        :loading="isCountFetching || isHeaderFetching || isTableFetching"
        @click="() => fetchNextPage()"
        class="absolute bottom-8 right-8 w-1/4 px-3 min-w-fit h-9 rounded-sm flex justify-center items-center"
        :label="
          isCountFetching || isHeaderFetching || isTableFetching
            ? 'Loading'
            : 'Load More'
        "
        :style="{ opacity: floatVisibility }"
      >
      </UButton
      ><span
        v-else
        class="absolute rounded-sm border border-grey-600 bottom-8 right-8 w-1/4 px-3 min-w-fit bg-grey-800 h-9 text-grey-200 flex justify-center items-center text-xs"
        :style="{ opacity: floatVisibility }"
        >End of Data</span
      ></template
    >
  </div>
</template>
