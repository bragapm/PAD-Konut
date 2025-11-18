<script lang="ts" setup>
import { distinctHexColors, fetchIconIds } from "~/utils/mapStyling";

const props = defineProps<{
  categories: string[];
  initialData: [string, string][];
  forSymbol?: boolean;
}>();

const emit = defineEmits<{
  updateCategoricalColor: [value: [string, string][]];
}>();

const open = ref(false);
const selectedCategories = ref<string[]>(
  props.initialData.length > 0
    ? props.initialData.map((el) => el[0])
    : props.categories.length > 0
    ? props.categories
    : []
);

const handleCheckboxChange = async (value: any, checked: boolean) => {
  if (checked) {
    if (!selectedCategories.value.includes(value)) {
      selectedCategories.value = [...selectedCategories.value, value];
    }
  } else {
    selectedCategories.value = selectedCategories.value.filter(
      (v) => v !== value
    );
  }

  // Update categorical data after selection changes
  if (selectedCategories.value.length > 0) {
    if (props.forSymbol) {
      const iconIds = await fetchIconIds(selectedCategories.value.length);
      const categoricalSymbolData: [string, string][] =
        selectedCategories.value.map((category, index) => [
          String(category),
          iconIds[index] || "",
        ]);
      emit("updateCategoricalColor", categoricalSymbolData);
    } else {
      const colors = distinctHexColors(selectedCategories.value.length);
      const categoricalColorData: [string, string][] =
        selectedCategories.value.map((category, index) => [
          String(category),
          colors[index]!,
        ]);
      emit("updateCategoricalColor", categoricalColorData);
    }
  } else {
    emit("updateCategoricalColor", []);
  }
};

const isChecked = (value: any) => {
  return selectedCategories.value.includes(value);
};

const isAllSelected = computed(() => {
  return selectedCategories.value.length === props.categories.length;
});

const handleSelectAll = async (_: any, checked: boolean) => {
  if (checked) {
    selectedCategories.value = props.categories;
  } else {
    selectedCategories.value = [];
  }

  // Update categorical data after selection changes
  if (selectedCategories.value.length > 0) {
    if (props.forSymbol) {
      const iconIds = await fetchIconIds(selectedCategories.value.length);
      const categoricalSymbolData: [string, string][] =
        selectedCategories.value.map((category, index) => [
          String(category),
          iconIds[index] || "",
        ]);
      emit("updateCategoricalColor", categoricalSymbolData);
    } else {
      const colors = distinctHexColors(selectedCategories.value.length);
      const categoricalColorData: [string, string][] =
        selectedCategories.value.map((category, index) => [
          String(category),
          colors[index]!,
        ]);
      emit("updateCategoricalColor", categoricalColorData);
    }
  } else {
    emit("updateCategoricalColor", []);
  }
};

watch(
  () => props.initialData,
  async (newInitialData) => {
    if (newInitialData.length > 0) {
      const newData = newInitialData.map((el) => el[0]);
      selectedCategories.value = newData;
    }
  },
  { deep: true }
);
</script>

<template>
  <UPopover
    v-model:open="open"
    :ui="{ content: 'bg-grey-900 rounded-lg ring-grey-700' }"
  >
    <UButton
      label="Category Rule"
      color="gray"
      variant="solid"
      size="xs"
      :ui="{
        base: 'h-[26px] w-full justify-between bg-grey-700 border border-grey-600',
        label: 'text-grey-200 text-xs',
      }"
    />

    <template #content>
      <div class="w-64">
        <div
          class="flex items-center justify-between p-3 border-b border-grey-700"
        >
          <p class="text-grey-50 text-xs font-medium">Set Categories</p>
          <button
            @click="open = false"
            class="text-grey-400 hover:text-grey-50 transition-colors"
          >
            <UIcon name="i-heroicons-x-mark-20-solid" class="w-4 h-4" />
          </button>
        </div>
        <div class="max-h-96 overflow-y-auto p-3">
          <div class="flex flex-col">
            <CoreCheckbox
              id="select-all"
              index="all"
              label="Select All"
              :is-checked="isAllSelected"
              for-header
              @on-change="handleSelectAll"
            />
            <div class="border-t border-grey-700 my-2"></div>
            <div class="space-y-1">
              <CoreCheckbox
                v-for="(category, index) in categories"
                :key="index"
                :id="`category-${index}`"
                :index="category"
                :label="String(category)"
                :is-checked="isChecked(category)"
                @on-change="handleCheckboxChange"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
