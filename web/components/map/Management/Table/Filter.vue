<script lang="ts" setup>
import { useQueryClient } from "@tanstack/vue-query";
import { transformToFilterParams } from "~/utils/filter";
import IcCross from "~/assets/icons/ic-cross.svg";

const props = defineProps<{
  columns: TableColumn[];
}>();

const emit = defineEmits<{
  (e: "closeModal"): void;
}>();

const filterStore = useFilter();
const { addFilter, addGroup, setFilterParams, resetFilter } = filterStore;
const { filterArray } = storeToRefs(filterStore);

const addFilterMenu = [
  [
    {
      label: "New Filter",
      click: () => {
        addFilter();
      },
    },
    {
      label: "AND Group",
      click: () => addGroup("_and"),
    },
    {
      label: "OR Group",
      click: () => addGroup("_or"),
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
      <UDropdown
        :items="addFilterMenu"
        :popper="{ placement: 'bottom-start' }"
        :ui="{
          wrapper: 'w-full',
          rounded: 'rounded-xxs',
          background: 'bg-grey-700',
          ring: 'ring-1 ring-grey-600',
          item: {
            base: 'cursor-pointer hover:text-grey-700',
            padding: 'px-1.5 py-1',
            selected: 'bg-grey-200 text-grey-700',
            color: 'text-grey-200',
            rounded: 'rounded-xxs',
            active: 'bg-grey-200 text-grey-700',
            inactive: 'text-grey-200',
            size: 'text-xs',
          },
        }"
      >
        <UButton
          color="brand"
          variant="outline"
          label="Add Filter"
          :ui="{
            rounded: 'rounded-xxs',
            base: 'w-full justify-between items-center',
          }"
          trailing-icon="i-heroicons-chevron-down-20-solid"
        />
      </UDropdown>
    </div>
    <div class="grid grid-cols-2 gap-x-3">
      <UButton
        @click="
          () => {
            resetFilter();
            queryClient.refetchQueries({
              queryKey: ['table_data_query_key'],
              type: 'active',
              exact: true,
            });
            queryClient.refetchQueries({
              queryKey: ['count_table_data_query_key'],
              type: 'active',
              exact: true,
            });
          }
        "
        color="brand"
        variant="outline"
        :ui="{ rounded: 'rounded-[4px]' }"
        class="w-full justify-center text-sm"
        >Reset Filter</UButton
      >
      <UButton
        @click="
          () => {
            setFilterParams(transformToFilterParams(filterArray));
            queryClient.refetchQueries({
              queryKey: ['table_data_query_key'],
              type: 'active',
              exact: true,
            });
            queryClient.refetchQueries({
              queryKey: ['count_table_data_query_key'],
              type: 'active',
              exact: true,
            });
          }
        "
        color="brand"
        :ui="{ rounded: 'rounded-[4px]' }"
        class="w-full justify-center text-sm"
        :loading="false"
        >Apply Filter</UButton
      >
    </div>
  </div>
</template>
