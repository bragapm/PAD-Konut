<script lang="ts" setup>
import { useQuery } from "@tanstack/vue-query";
import type { HeaderData } from "./Table.vue";

const props = defineProps<{
  layerName: string;
  enabled?: boolean;
}>();

const modelValue = defineModel<string>({ required: true });

const emit = defineEmits<{
  "update:columnList": [value: { field: string; type: string }[]];
}>();

const authStore = useAuth();

// Fetch column headers
const {
  data: headerData,
  error: headerError,
  isFetching: isHeaderFetching,
  isError: isHeaderError,
} = useQuery({
  queryKey: [
    "/panel/vector-tiles-attribute-table-header/",
    () => props.layerName,
  ],
  queryFn: async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (authStore.accessToken) {
      headers["Authorization"] = `Bearer ${authStore.accessToken}`;
    }

    const res = await $fetch<{ data: HeaderData[] }>(
      "/panel/vector-tiles-attribute-table-header/" + props.layerName,
      { headers }
    );
    let filteredResData = res.data.filter(
      (el) => el.type !== "uuid" && el.type !== "geometry"
    );

    emit("update:columnList", filteredResData);
    return filteredResData;
  },
  enabled: computed(() => !!props.layerName && (props.enabled ?? true)),
});

const columnOptions = computed<string[]>(() => {
  if (headerData.value) {
    return headerData.value.map((el: HeaderData) => el.field);
  } else return [];
});
</script>

<template>
  <USelectMenu
    v-model="modelValue"
    :items="columnOptions"
    placeholder="Select Column"
    size="xs"
    color="gray"
    :loading="isHeaderFetching"
    :ui="{ base: 'h-[26px]' }"
  >
    <template #trailing>
      <UIcon
        v-if="isHeaderFetching"
        name="i-heroicons-arrow-path"
        class="w-4 h-4 animate-spin text-grey-400"
      />
    </template>
  </USelectMenu>
</template>
