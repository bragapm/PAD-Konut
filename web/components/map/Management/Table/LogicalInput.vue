<script lang="ts" setup>
import { inject } from "vue";
import IcCross from "~/assets/icons/ic-cross.svg";

const props = withDefaults(
  defineProps<{
    id: string;
    fieldOptions: TableColumn[];
    group: LogicalOperator;
    filter: (FilterItem | GroupItem)[];
    level?: number;
  }>(),
  {
    level: 0,
  }
);

const filterProps = inject<{
  updateGroup: Function;
  insertFilter: Function;
  insertGroup: Function;
  deleteById: Function;
}>("filterPropsProvider");
if (!filterProps) {
  throw new Error("filterProps not provided");
}

const logicalOperatorOptions = [
  { key: "_and", label: "AND" },
  { key: "_or", label: "OR" },
];

const addFilterMenu = [
  [
    {
      label: "New Filter",
      onSelect: () => {
        filterProps.insertFilter(props.id);
      },
    },
    {
      label: "AND Group",
      onSelect: () => {
        filterProps.insertGroup(props.id, "_and");
      },
    },
    {
      label: "OR Group",
      onSelect: () => {
        filterProps.insertGroup(props.id, "_or");
      },
    },
  ],
];

const operator = ref<"_and" | "_or">(props.group || "_and");

watch(
  () => operator.value,
  (newOperatorValue) => {
    console.log("operator", operator.value);
    filterProps.updateGroup(props.id, newOperatorValue);
  },
  { immediate: false }
);
</script>

<template>
  <div
    class="flex gap-2 items-center"
    :style="{ marginLeft: level * 20 + 'px' }"
  >
    <USelectMenu
      v-model="operator"
      placeholder="Select Column"
      :items="logicalOperatorOptions"
      value-key="key"
      :content="{
        side: 'bottom',
        align: 'start',
      }"
      class="w-20"
      size="sm"
    />
    <UDropdownMenu
      :items="addFilterMenu"
      :content="{
        align: 'start',
        side: 'bottom',
      }"
      color="gray"
    >
      <UButton
        size="xs"
        color="gray"
        variant="subtle"
        label="Add Filter"
        trailing-icon="i-heroicons-chevron-down-20-solid"
      />
    </UDropdownMenu>
    <UButton
      @click="() => filterProps.deleteById(id)"
      size="xs"
      color="brand"
      variant="outline"
      class="rounded-sm w-6 h-6 justify-center"
    >
      <template #leading>
        <IcCross class="w-2 h-2 text-brand-500" :fontControlled="false" />
      </template>
    </UButton>
  </div>
  <template
    v-if="filter && filter.length > 0"
    v-for="item in filter"
    :key="item.id"
  >
    <MapManagementTableLogicalInput
      v-if="'group' in item"
      :id="item.id"
      :group="item.group as LogicalOperator"
      :filter="item.filter"
      :fieldOptions="fieldOptions"
      :level="level + 1"
    />
    <MapManagementTableFilterInput
      v-else
      :id="item.id"
      :inputData="item as FilterItem"
      :fieldOptions="fieldOptions"
      :level="level + 1"
    />
  </template>
</template>
