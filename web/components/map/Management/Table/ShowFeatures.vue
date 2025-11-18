<script lang="ts" setup>
import { inject } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import IcArrowReg from "~/assets/icons/ic-arrow-reg.svg";

const props = defineProps<{
  layerId: string;
  filterParams: FilterParams[] | null;
}>();

const filterProps = inject<{
  setFilterParams: Function;
}>("filterPropsProvider");
if (!filterProps) {
  throw new Error("filterProps not provided");
}

const mapStore = useMap();
const { highlightedLayers } = storeToRefs(mapStore);

const queryClient = useQueryClient();

const open = ref(false);
const isShowAll = ref(true);

const isFilterBySelected = ref(false);
const refreshData = () => {
  queryClient.refetchQueries({
    queryKey: ["table_data_query_key", props.layerId],
    type: "active",
    exact: true,
  });
  queryClient.refetchQueries({
    queryKey: ["count_table_data_query_key", props.layerId],
    type: "active",
    exact: true,
  });
};

function filterBySelected() {
  if (highlightedLayers.value[props.layerId]["ids"].length) {
    const obj = {
      ogc_fid: {
        _in: highlightedLayers.value[props.layerId]["ids"],
      },
    };

    filterProps!.setFilterParams([
      ...(props.filterParams ?? []),
      obj,
    ] as FilterParams[]);
    refreshData();
  }
  isFilterBySelected.value = true;
}

function reset() {
  filterProps!.setFilterParams(
    [...(props.filterParams ?? [])].filter((obj) => !("ogc_fid" in obj))
  );
  refreshData();
  isFilterBySelected.value = false;
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'end' }"
    :ui="{
      content:
        'p-2 w-52 max-h-52 overflow-y-scroll rounded-sm bg-grey-800 shadow-lg ring-1 ring-grey-700 overflow-x-hidden',
    }"
  >
    <UButton
      :disabled="highlightedLayers?.[layerId]?.['ids'].length ? false : true"
      :color="open ? 'gray' : 'gray'"
      :variant="open ? 'solid' : 'ghost'"
      :class="[
        open ? 'border-grey-500 bg-grey-700' : 'border-grey-600 bg-transparent',
        highlightedLayers?.[layerId]?.['ids'].length
          ? 'text-grey-200'
          : 'text-grey-500',
        'flex items-center gap-1 py-1 px-[6px] border rounded-sm text-2xs',
      ]"
    >
      {{ !isShowAll ? "Show Selected Features Only" : "Show All Features" }}
      <template #trailing>
        <IcArrowReg
          class="size-3 text-grey-400 rotate-180"
          :fontControlled="false"
        />
      </template>
    </UButton>

    <template #content>
      <div class="flex flex-col">
        <button
          v-for="item in [
            {
              label: 'Show All Features',
              func: () => {
                reset();
                isShowAll = true;
              },
            },
            {
              label: 'Show Selected Features Only',
              func: () => {
                filterBySelected();
                isShowAll = false;
              },
            },
          ]"
          :key="item.label"
          @click="
            () => {
              item.func();
              open = false;
            }
          "
          class="cursor-pointer text-grey-50 hover:text-brand-500 flex w-full items-center p-2 gap-x-2 text-xs first:rounded-t-xxs last:rounded-b-xxs"
        >
          {{ item.label }}
        </button>
      </div>
    </template>
  </UPopover>
</template>
