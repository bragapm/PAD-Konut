<script setup lang="ts">
import { staticKey } from "~/constants";
import type { Category } from "~/utils/types";

defineProps<{
  disabled: boolean;
}>();

const catalogueStore = useCatalogue();
const { setCategory } = catalogueStore;
const { selectedCategory } = storeToRefs(catalogueStore);

const { data: categoriesData, status } = useFetch<{
  data: Category[];
}>(`/panel/items/categories`, {
  query: {
    filter: { parent: { _null: true } },
    fields: "category_id,category_name,description,subcategories.*",
    sort: "category_name",
    deep: { subcategories: { _sort: "category_name" } },
  },
});

watchEffect(() => {
  const list = categoriesData.value?.data;
  if (!selectedCategory.value && list?.length) {
    if (list[0]) setCategory(list[0].category_id);
  }
});
</script>

<template>
  <div class="flex-1 overflow-y-scroll">
    <div class="flex flex-col gap-2 p-2">
      <span>
        <h2 class="text-xs text-grey-400">Default Catalogue</h2>
        <p class="text-2xs text-grey-500">
          Dataset Folder/Project Provided by Default
        </p>
      </span>
      <div v-if="!categoriesData && status === 'pending'" class="space-y-2">
        <USkeleton v-for="i of [0, 1, 2, 3, 4]" :key="i" class="w-full h-6" />
      </div>
      <MapManagementCatalogueCategory
        v-if="categoriesData?.data && categoriesData.data.length > 0"
        v-for="category of categoriesData.data"
        :key="category.category_id"
        :item="category"
      />
      <UButton
        label="Other"
        :variant="selectedCategory === staticKey.other ? 'solid' : 'ghost'"
        color="gray"
        @click="
          () => {
            setCategory(staticKey.other);
          }
        "
        class="text-xs text-left flex justify-between"
      />
    </div>
    <div class="border-t border-grey-700 mx-2" />
    <div class="flex flex-col gap-2 p-2">
      <span>
        <h2 class="text-xs text-grey-400">User’s Catalogue</h2>
        <p class="text-2xs text-grey-500">
          Dataset Folder/Project Uploaded by User
        </p>
      </span>
      <UButton
        label="Loaded Data"
        variant="ghost"
        color="gray"
        @click="
          () => {
            setCategory(staticKey.loadedData);
          }
        "
        :class="[
          'w-full text-xs text-left flex justify-between rounded-sm',
          selectedCategory === staticKey.loadedData && 'bg-brand-950',
        ]"
      />
    </div>
  </div>
</template>
