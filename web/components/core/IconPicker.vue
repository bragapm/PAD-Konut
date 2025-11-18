<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import IcArrowReg from "~/assets/icons/ic-arrow-reg.svg";
import { layerIconsFolderId } from "~/constants";

const props = defineProps<{
  modelValue: string;
  updateIconImage: (iconImageId: string) => void;
  simple?: boolean;
}>();
const emit = defineEmits(["update:modelValue"]);

const filterByTitle = ref("");

const fetcher = async (url: string, searchParams?: URLSearchParams) =>
  await fetch(`${url}${searchParams ? "?" + searchParams : ""}`).then(
    (response) => response.json()
  );

const { data: iconImageData, refetch } = useQuery({
  queryKey: [`/panel/files`],
  queryFn: ({ queryKey }) =>
    fetcher(
      "/panel/files",
      new URLSearchParams({
        filter: JSON.stringify({
          _and: [
            {
              folder: { _eq: layerIconsFolderId },
            },
            { type: { _eq: "image/svg+xml" } },
            filterByTitle.value && {
              title: { _icontains: filterByTitle.value },
            },
          ].filter((el) => el),
        }),
        fields: "*",
      })
    ),
});

const isOpen = ref(false);

const filterRef = ref("");

const handleFilter = (input: string) => {
  if (input) {
    filterByTitle.value = input;
    refetch();
  } else {
    filterByTitle.value = "";
    refetch();
  }
};

watch(filterRef, debounce(handleFilter, 500));
</script>

<template>
  <UPopover
    v-model:open="isOpen"
    :class="[!simple && 'w-full']"
    :content="{ side: 'right' }"
    :ui="{
      content: 'ring ring-grey-700 rounded-lg bg-grey-900',
    }"
  >
    <button
      :class="[
        !simple && 'w-full',
        'flex gap-2 focus:outline-none px-2 py-1 border border-grey-600 bg-grey-700 rounded-sm items-center justify-between',
      ]"
    >
      <div class="flex gap-2 items-center">
        <img
          v-if="modelValue"
          :src="`/panel/assets/${modelValue}`"
          alt="test"
          class="filter-icon size-3 shrink-0"
        />
        <p v-if="!simple" class="text-grey-400 text-2xs">Selected</p>
      </div>
      <IcArrowReg
        v-if="!simple"
        :fontControlled="false"
        class="size-[14px] rotate-180 text-grey-400"
      />
    </button>

    <template #content>
      <div class="w-56 py-2 flex flex-col gap-2">
        <p class="text-grey-400 text-sm px-2">Icon</p>
        <div class="flex flex-col gap-2 px-2">
          <p class="text-grey-400 text-2xs">Find Icons</p>
          <UInput
            v-model="filterRef"
            color="primary"
            placeholder="Filter"
            size="sm"
          >
          </UInput>
          <div class="border-b border-grey-700" />
        </div>
        <div
          v-if="iconImageData?.data"
          class="grid grid-cols-5 gap-[6px] px-2 max-h-64 overflow-y-auto"
        >
          <button
            v-for="item in iconImageData?.data"
            @click="
              () => {
                updateIconImage(item.id);
                emit('update:modelValue', item.id);
                isOpen = false;
              }
            "
            class="bg-grey-800 rounded-sm p-2 flex items-center justify-center"
          >
            <img
              :src="`/panel/assets/${item.id}`"
              alt="test"
              class="filter-icon size-4 fill-red-500 stroke-white"
            />
          </button>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<style>
.filter-icon {
  filter: invert(68%) sepia(38%) saturate(23%) hue-rotate(22deg) brightness(95%)
    contrast(99%);
}
</style>
