<script lang="ts" setup>
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

const logicalOperatorOptions = [
  { key: "_and", label: "AND" },
  { key: "_or", label: "OR" },
];

const filterStore = useFilter();
const { updateGroup, insertFilter, insertGroup, deleteById } = filterStore;

const addFilterMenu = [
  [
    {
      label: "New Filter",
      click: () => {
        insertFilter(props.id);
      },
    },
    {
      label: "AND Group",
      click: () => {
        insertGroup(props.id, "_and");
      },
    },
    {
      label: "OR Group",
      click: () => {
        insertGroup(props.id, "_or");
      },
    },
  ],
];

const operator = ref<"_and" | "_or">(props.group || "_and");

watch(
  () => operator.value,
  (newOperatorValue) => {
    updateGroup(props.id, newOperatorValue);
  },
  { immediate: false }
);
</script>

<template>
  <div class="flex gap-2" :style="{ marginLeft: level * 20 + 'px' }">
    <USelectMenu
      searchable-placeholder="Search"
      v-model="operator"
      placeholder="Select Column"
      :options="logicalOperatorOptions"
      option-attribute="label"
      value-attribute="key"
      color="gray"
      :popper="{ placement: 'bottom-end' }"
      :ui="{ base: 'w-20', rounded: 'rounded-xxs' }"
      :uiMenu="{
        width: 'w-20',
        height: 'max-h-40',
        base: 'space-y-1',
        rounded: 'rounded-xxs',
        background: 'bg-grey-700',
        ring: 'ring-1 ring-grey-600',
        option: {
          base: 'cursor-pointer hover:text-grey-700',
          padding: 'px-1.5 py-1',
          selected: 'bg-grey-200 text-grey-700',
          color: 'text-grey-200',
          rounded: 'rounded-xxs',
          active: 'bg-grey-200 text-grey-700',
          size: 'text-xs',
        },
      }"
      size="2xs"
    />
    <UDropdown
      :items="addFilterMenu"
      :popper="{ placement: 'bottom-start' }"
      :ui="{
        wrapper: 'w-24',
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
        size="xxs"
        color="grey"
        variant="solid"
        label="Add Filter"
        :ui="{
          rounded: 'rounded-xxs',
          base: 'w-full justify-between items-center text-xs px-2 bg-red-50',
          variant: {
            solid:
              'shadow-sm text-grey-200 bg-grey-700 font-normal hover:bg-{color}-700 ring-grey-600',
          },
        }"
        trailing-icon="i-heroicons-chevron-down-20-solid"
      />
    </UDropdown>
    <UButton
      @click="() => deleteById(id)"
      size="2xs"
      color="brand"
      variant="outline"
      :ui="{ rounded: 'rounded-xxs', base: 'w-6 h-6 justify-center' }"
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
