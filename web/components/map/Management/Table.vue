<script setup lang="ts">
import { useQuery, useInfiniteQuery } from "@tanstack/vue-query";
import type { GeoJSONSource, LngLatBoundsLike } from "maplibre-gl";
import IcCross from "~/assets/icons/ic-cross.svg";
import IcDownload from "~/assets/icons/ic-download.svg";
import IcExpand from "~/assets/icons/ic-expand.svg";
import IcFilter from "~/assets/icons/ic-filter.svg";
import IcShrink from "~/assets/icons/ic-shrink.svg";
import IcSort from "~/assets/icons/ic-sort.svg";
import bbox from "@turf/bbox";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/vue";
import { capitalizeEachWords } from "~/utils";

export type HeaderData = {
  field: string;
  type: string;
};

type Columns = { key: string; label: string; type: string };

const store = useTableData();
const { toggleTable, toggleFullscreen } = store;

const selectedIds = ref<string[]>([]);
const highlightedIds = ref<string[]>([]);

const {
  data: headerData,
  error: headerError,
  isFetching: isHeaderFetching,
  isError: isHeaderError,
} = useQuery({
  queryKey: [
    `/panel/vector-tiles-attribute-table-header/`,
    store.activeCollection,
  ],
  queryFn: ({ queryKey }) =>
    $fetch<{
      data: HeaderData[];
    }>(queryKey[0] + queryKey[1]!).then((r) => r.data),
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
const filterStore = useFilter();
const { filterParams } = storeToRefs(filterStore);

const {
  data: countData,
  error: countError,
  isFetching: isCountFetching,
  isError: isCountError,
} = useQuery({
  queryKey: ["count_table_data_query_key"],
  queryFn: async ({ queryKey }) => {
    const queryParams: Record<string, string> = {
      filter: JSON.stringify({
        _and: filterParams.value || [],
      }),
    };
    const r = await $fetch<{ data: { count: number }[] }>(
      `/panel/items/${store.activeCollection}?aggregate[count]=*&` +
        new URLSearchParams(queryParams)
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
  queryKey: ["table_data_query_key"],
  queryFn: async ({ pageParam = 1, queryKey }) => {
    const queryParams: Record<string, string> = {
      limit: "25",
      page: pageParam.toString(),
      ...(headerData.value && {
        fields: headerData.value
          .filter((el: HeaderData) => el.type !== "geometry")
          .map((el: HeaderData) => el.field)
          .concat("ogc_fid")
          .join(","),
      }),
      ...(filterParams.value && {
        filter: JSON.stringify({
          _and: filterParams.value,
        }),
      }),
      sort: sortBy.value,
    };
    const r = await $fetch<{ data: any[] }>(
      `/panel/items/${store.activeCollection}?` +
        new URLSearchParams(queryParams)
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

const isAllChecked = ref(false);

const onRowClick = (fid: string) => {
  if (highlightedIds.value.includes(fid as string))
    highlightedIds.value = highlightedIds.value.filter((e) => e !== fid);
  else highlightedIds.value = [...highlightedIds.value, fid as string];
};

const onRowSelect = (fid: string) => {
  if (selectedIds.value.includes(fid as string))
    selectedIds.value = selectedIds.value.filter((e) => e !== fid);
  else {
    selectedIds.value = [...selectedIds.value, fid as string];
    if (!isAllChecked.value && !highlightedIds.value.includes(fid as string))
      highlightedIds.value = [...highlightedIds.value, fid as string];
  }
};

const mapRefStore = useMapRef();
const debouncedMapHighlight = debounce(async (newValue: string[]) => {
  if (!newValue.length) {
    if (mapRefStore.map?.getSource("highlight")) {
      (mapRefStore.map.getSource("highlight") as GeoJSONSource).setData(
        emptyFeatureCollection
      );
      pauseAllAnimation();
    }
  } else {
    const queryParams: Record<string, string> = {
      fields: "geom",
      "filter[ogc_fid][_in]": newValue.join(","),
    };
    const { data } = await $fetch<{ data: any }>(
      `/panel/items/${store.activeCollection}?` +
        new URLSearchParams(queryParams)
    );
    showHighlightLayer(mapRefStore.map!, data, store.activeCollection!, true);
    mapRefStore.map!.fitBounds(
      bbox({
        type: "FeatureCollection",
        features: data.map(({ geom }: { geom: GeoJSON.Geometry }) => ({
          type: "Feature",
          geometry: geom,
        })),
      } as GeoJSON.FeatureCollection) as LngLatBoundsLike,
      {
        padding: {
          top: 80,
          bottom: 20,
          left: window.innerWidth * 0.49,
          right: 20,
        },
      }
    );
  }
}, 2000);
watch(highlightedIds, debouncedMapHighlight, {
  immediate: true,
});

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
    ...(selectedIds.value.length > 0 && {
      filter: JSON.stringify({
        ogc_fid: { [!isAllChecked.value ? "_in" : "_nin"]: selectedIds.value },
      }),
    }),
    export: "csv",
  });

  try {
    const response = await fetch(
      `/panel/items/${store.activeCollection}?${queryString}`,
      {
        method: "GET",
      }
    );
    const resData = await response.blob();
    let anchor = document.createElement("a");
    const href = window.URL.createObjectURL(resData);
    anchor.download = store.activeCollection!;
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

const isOpen = ref(false);

function closeModal() {
  isOpen.value = false;
}
function openModal() {
  isOpen.value = true;
}
</script>

<template>
  <div class="flex flex-col gap-3 p-6 h-full max-h-full relative">
    <div class="flex justify-between">
      <h1 class="text-grey-400">Data Table</h1>
      <button
        @click="
          () => {
            toggleTable();
            store.fullscreen && toggleFullscreen();
            highlightedIds = [];
            selectedIds = [];
          }
        "
      >
        <IcCross class="w-4 h-4 text-grey-400" :fontControlled="false" />
      </button>
    </div>
    <hr class="border-b border-grey-700" />
    <div class="flex justify-between items-center gap-3">
      <div class="flex items-center gap-3">
        <button
          class="flex items-center gap-3 p-2 border border-grey-600 rounded-xxs bg-grey-800 text-xs text-grey-200"
        >
          <IcShrink
            class="w-[14px] h-[14px] text-grey-400"
            :fontControlled="false"
          />
          {{
            store.activeCollection &&
            capitalizeEachWords(store.activeCollection)
          }}
        </button>
        <div class="border-l border-grey-700 h-8"></div>

        <Menu as="div" class="relative z-10">
          <MenuButton
            class="flex items-center gap-3 p-2 border border-grey-600 rounded-xxs bg-grey-800 text-xs text-grey-200"
          >
            <IcSort
              class="w-[14px] h-[14px] text-grey-400"
              :fontControlled="false"
            />
            Show All Field
          </MenuButton>
          <transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
          >
            <MenuItems
              class="absolute left-0 mt-2 w-52 max-h-52 overflow-y-scroll origin-top-left rounded-xxs bg-grey-800 shadow-lg ring-1 ring-black/5 focus:outline-none overflow-x-hidden"
            >
              <MenuItem v-for="column in columns" :key="column.key">
                <div
                  class="text-grey-50 flex w-full items-center p-2 gap-x-2 text-xs first:rounded-t-xxs last:rounded-b-xxs"
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
              </MenuItem>
            </MenuItems>
          </transition>
        </Menu>

        <button
          class="flex items-center gap-3 p-2 border border-grey-600 rounded-xxs bg-grey-800 text-xs text-grey-200"
          @click="
            () => {
              openModal();
            }
          "
        >
          <IcFilter
            class="w-[14px] h-[14px] text-grey-400"
            :fontControlled="false"
          />
          Filter
        </button>
        <UModal
          v-model="isOpen"
          :ui="{
            background: 'bg-grey-900',
            height: 'h-[50vh]',
            rounded: 'rounded-xxs',
          }"
        >
          <MapManagementTableFilter
            :columns="columns"
            @close-modal="closeModal"
          />
        </UModal>
        <button
          @click="downloadData"
          class="flex items-center gap-3 p-2 border border-grey-600 rounded-xxs bg-grey-800 text-xs text-grey-200"
        >
          <IcDownload
            class="w-[14px] h-[14px] text-grey-400"
            :fontControlled="false"
          />
          Download {{ selectedIds.length ? "Selected" : "All" }}
        </button>
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="toggleFullscreen"
          class="p-2 border border-grey-600 rounded-xxs bg-grey-800"
        >
          <IcExpand
            class="w-[14px] h-[14px] text-grey-400"
            :fontControlled="false"
          />
        </button>
      </div>
    </div>
    <!-- New Table -->
    <section
      class="h-[calc(100%-5.5rem)] flex flex-col rounded-xxs border border-grey-700 w-full overflow-auto pb-12 relative"
      @scroll="handleScroll"
    >
      <header class="flex w-full sticky top-0">
        <div class="bg-grey-800 h-14 w-14 flex items-center justify-center">
          <CoreCheckbox
            id="all-checkbox"
            :index="0"
            :is-checked="isAllChecked"
            :forHeader="true"
            @click="
              () => {
                isAllChecked = !isAllChecked;
                selectedIds = [];
              }
            "
          />
        </div>
        <Menu
          as="div"
          class="relative"
          v-for="column in columns.filter((c) => !hiddenFields.includes(c.key))"
          :key="column.key"
        >
          <MenuButton
            class="bg-grey-800 hover:bg-grey-700 h-14 flex-1 min-w-[12rem] text-grey-50 flex items-center justify-between text-xs font-medium px-3 py-4 group"
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
          </MenuButton>
          <transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
          >
            <MenuItems
              class="absolute left-0 mt-2 w-full origin-top-left rounded-xxs bg-grey-800 shadow-lg ring-1 ring-black/5 focus:outline-none overflow-hidden"
            >
              <MenuItem>
                <button
                  class="text-grey-50 flex w-full items-center p-3 text-xs hover:bg-grey-700"
                  @click="
                    () => {
                      sortBy = column.key;
                      refetch();
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
              </MenuItem>
              <MenuItem>
                <button
                  class="text-grey-50 flex w-full items-center p-3 text-xs hover:bg-grey-700"
                  @click="
                    () => {
                      sortBy = '-' + column.key;
                      refetch();
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
              </MenuItem>
            </MenuItems>
          </transition>
        </Menu>
      </header>

      <template v-if="tableData?.pages.length">
        <template v-for="tableRows in tableData.pages">
          <main
            role="button"
            @click="() => onRowClick(rowData.ogc_fid)"
            class="flex w-full group"
            v-for="rowData in tableRows"
            :key="rowData.ogc_fid"
          >
            <div
              :class="
                'h-[4.5rem] w-14 flex items-center justify-center group-hover:bg-grey-700 ' +
                (highlightedIds.includes(rowData.ogc_fid) ? 'bg-red-950 ' : ' ')
              "
            >
              <CoreCheckbox
                id="id-checkbox"
                :index="rowData.ogc_fid"
                :is-checked="
                  isAllChecked || selectedIds.includes(rowData.ogc_fid)
                "
                :forHeader="true"
                @click="
                  (event : Event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onRowSelect(rowData.ogc_fid);
                  }
                "
              />
            </div>
            <div
              v-for="column in columns.filter(
                (c) => !hiddenFields.includes(c.key)
              )"
              :key="column.key"
              :class="
                'first-letter:h-[4.5rem] flex-1 min-w-[12rem] flex items-center text-xs font-normal px-3 py-4 group-hover:bg-grey-700 ' +
                (highlightedIds.includes(rowData.ogc_fid)
                  ? 'text-brand-500 '
                  : 'text-grey-400 ') +
                (highlightedIds.includes(rowData.ogc_fid) ? 'bg-red-950 ' : ' ')
              "
            >
              <p class="line-clamp-2">{{ rowData[column.key] }}</p>
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
        class="absolute bottom-8 right-8 w-1/4 px-3 min-w-fit h-9 rounded-xxs flex justify-center items-center"
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
        class="absolute rounded-xxs border border-grey-600 bottom-8 right-8 w-1/4 px-3 min-w-fit bg-grey-800 h-9 text-grey-200 flex justify-center items-center text-xs"
        :style="{ opacity: floatVisibility }"
        >End of Data</span
      ></template
    >

    <span
      class="absolute rounded-xxs border border-grey-600 bottom-8 left-8 w-1/4 px-3 min-w-fit bg-grey-800 h-9 text-grey-200 flex justify-center items-center text-xs"
      >{{ selectedIds.length }}
      {{ (isAllChecked ? "un" : "") + "selected" }} from
      {{ countData }} rows</span
    >
  </div>
</template>
