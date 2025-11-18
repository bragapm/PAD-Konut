<script lang="ts" setup>
import type { Category } from "~/utils/types";
import IcArrowReg from "~/assets/icons/ic-arrow-reg.svg";

const props = withDefaults(
  defineProps<{
    item: Category;
    level?: number;
  }>(),
  { level: 0 }
);

const isExpand = ref(false);
const catalogueStore = useCatalogue();
const { setCategory } = catalogueStore;
const { selectedCategory } = storeToRefs(catalogueStore);

const { data: subcategoriesData, status } = useFetch<{
  data: Category;
}>(`/panel/items/categories/${props.item.category_id}`, {
  query: {
    filter: {},
    fields: "category_id,category_name,description,subcategories.*",
    sort: "category_name",
    deep: { subcategories: { _sort: "category_name" } },
  },
});
</script>

<template>
  <UButton
    :label="item.category_name"
    :variant="selectedCategory === item.category_id ? 'solid' : 'ghost'"
    color="gray"
    @click="
      () => {
        if (item.subcategories.length > 0) {
          isExpand = !isExpand;
        } else {
          setCategory(item.category_id);
        }
      }
    "
    class="text-xs flex justify-between rounded-xl"
    :class="{}"
    :style="{
      marginLeft: `${level * 10 + 10}px`,
      width: `calc(100% - ${level * 10 + 10}px)`,
    }"
  >
    <template #trailing v-if="item.subcategories.length > 0">
      <div
        :class="[
          isExpand ? 'rotate-0' : 'rotate-180',
          'transition-all duration-200 ease-in',
        ]"
      >
        <IcArrowReg :fontControlled="false" class="w-4 h-4 text-right" />
      </div>
    </template>
  </UButton>
  <Transition
    enter-active-class="transition-all ease-in duration-300"
    enter-from-class="max-h-0"
    enter-to-class="max-h-[100rem]"
    leave-active-class="transition-all ease-out duration-300"
    leave-from-class="max-h-[100rem]"
    leave-to-class="max-h-0"
  >
    <div
      v-if="
        subcategoriesData?.data?.subcategories &&
        subcategoriesData.data.subcategories.length > 0 &&
        isExpand
      "
      class="overflow-auto flex flex-col gap-2"
    >
      <MapManagementCatalogueSubcategory
        v-for="subcategory of subcategoriesData.data.subcategories"
        :key="subcategory.category_id"
        :item="subcategory"
        :level="level + 1"
      />
    </div>
  </Transition>
</template>
