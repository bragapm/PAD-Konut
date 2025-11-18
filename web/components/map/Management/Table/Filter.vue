<script lang="ts" setup>
import { inject } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import { transformToFilterParams } from "~/utils/filter";
import IcCross from "~/assets/icons/ic-cross.svg";

const props = defineProps<{
  layerId: string;
  columns: TableColumn[];
  filterArray: (FilterItem | GroupItem)[];
}>();

const filterProps = inject<{
  addFilter: Function;
  addGroup: Function;
  resetFilter: Function;
  setFilterParams: Function;
}>("filterPropsProvider");
if (!filterProps) {
  throw new Error("filterProps not provided");
}

const emit = defineEmits<{
  (e: "closeModal"): void;
}>();

const filterStore = useFilter();
const { addFilterArrayList, addFilterParamsList, resetFilterList } =
  filterStore;

const addFilterMenu = [
  [
    {
      label: "New Filter",
      onSelect: () => {
        filterProps.addFilter();
      },
    },
    {
      label: "AND Group",
      onSelect: () => filterProps.addGroup("_and"),
    },
    {
      label: "OR Group",
      onSelect: () => filterProps.addGroup("_or"),
    },
  ],
];
const queryClient = useQueryClient();
</script>

<template>
  <div class="h-full flex flex-col p-4 gap-2">
    <div class="flex items-center justify-between">
      <p class="text-grey-50 font-medium">Filter</p>
      <button
        @click="
          () => {
            emit('closeModal');
          }
        "
      >
        <IcCross class="w-3 h-3 text-grey-400" :fontControlled="false" />
      </button>
    </div>
    <div class="overflow-auto flex-1 py-2 space-y-4">
      <div class="space-y-2">
        <template
          v-if="filterArray && filterArray.length > 0"
          v-for="item in filterArray"
          :key="item.id"
        >
          <MapManagementTableLogicalInput
            v-if="'group' in item"
            :id="item.id"
            :fieldOptions="columns"
            :group="item.group as LogicalOperator"
            :filter="item.filter"
          />
          <MapManagementTableFilterInput
            v-else
            :id="item.id"
            :inputData="item as FilterItem"
            :fieldOptions="columns"
          />
        </template>
      </div>
      <UDropdownMenu
        :items="addFilterMenu"
        :content="{
          side: 'bottom',
          align: 'start',
        }"
      >
        <UButton
          color="brand"
          variant="outline"
          label="Add Filter"
          class="w-full justify-between items-center"
          trailing-icon="i-heroicons-chevron-down-20-solid"
        />
      </UDropdownMenu>
    </div>
    <div class="grid grid-cols-2 gap-x-3">
      <UButton
        @click="
          () => {
            filterProps.resetFilter();
            resetFilterList();
            queryClient.refetchQueries({
              queryKey: ['table_data_query_key', layerId],
              type: 'active',
              exact: true,
            });
            queryClient.refetchQueries({
              queryKey: ['count_table_data_query_key', layerId],
              type: 'active',
              exact: true,
            });
          }
        "
        color="brand"
        variant="outline"
        class="w-full justify-center text-sm rounded-sm"
        >Reset Filter</UButton
      >
      <UButton
        @click="
          () => {
            const transformesFilterParams =
              transformToFilterParams(filterArray);
            filterProps.setFilterParams(transformesFilterParams);
            addFilterParamsList(layerId, transformesFilterParams);
            addFilterArrayList(layerId, filterArray);
            queryClient.refetchQueries({
              queryKey: ['table_data_query_key', layerId],
              type: 'active',
              exact: true,
            });
            queryClient.refetchQueries({
              queryKey: ['count_table_data_query_key', layerId],
              type: 'active',
              exact: true,
            });
          }
        "
        color="brand"
        class="w-full justify-center text-sm rounded-sm"
        :loading="false"
        >Apply Filter</UButton
      >
    </div>
  </div>
</template>
