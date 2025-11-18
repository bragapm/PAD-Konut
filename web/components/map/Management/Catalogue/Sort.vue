<script setup lang="ts">
type SortItem = { id: "asc" | "desc"; name: string };

const props = defineProps<{
  sortOrder: { id: "asc" | "desc"; name: string };
  disabled: boolean;
}>();
const emit = defineEmits<{
  updateSortOrder: [order: { id: "asc" | "desc"; name: string }];
}>();

const sortOption: SortItem[] = [
  { id: "asc", name: "Sort - Alphabetical (A-Z)" },
  { id: "desc", name: "Sort - Alphabetical (Z-A)" },
];

const selectedSort = ref(props.sortOrder.id);

const open = ref(false);
</script>

<template>
  <USelect
    v-model="selectedSort"
    v-model:open="open"
    :items="sortOption"
    @update:modelValue="
      (newValue) => {
        emit(
          'updateSortOrder',
          sortOption.find((el) => el.id === newValue) as SortItem
        );
      }
    "
    value-key="id"
    label-key="name"
    :disabled="disabled"
    class="text-xs text-grey-200 h-[34px]"
    color="gray"
    variant="outline"
    :ui="{
      base: ['hover:bg-grey-800', open && 'bg-grey-700 ring-grey-500'],
      content: 'bg-grey-800 ring-grey-700',
      itemTrailingIcon: 'text-brand-500',
      item: ['text-xs'],
    }"
  >
    <template #item-label="{ item }">
      {{ item.name }}
    </template></USelect
  >
</template>
