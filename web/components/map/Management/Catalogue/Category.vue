<script lang="ts" setup>
import type { Category } from "~/utils/types";
import IcArrowReg from "~/assets/icons/ic-arrow-reg.svg";

const props = defineProps<{
  item: Category;
}>();

const isExpand = ref(false);
const catalogueStore = useCatalogue();
const { setCategory } = catalogueStore;
const { selectedCategory } = storeToRefs(catalogueStore);
</script>

<template>
  <UButton
    :label="item.category_name"
    variant="ghost"
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
    :class="['text-xs text-left flex justify-between',selectedCategory === item.category_id && 'bg-brand-950']"
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
    <div v-if="item.subcategories.length > 0 && isExpand" class="w-full overflow-auto flex flex-col gap-2">
      <MapManagementCatalogueSubcategory
        v-for="subcategory of item.subcategories"
        :key="subcategory.category_id"
        :item="subcategory"
      />
    </div>
  </Transition>
</template>
