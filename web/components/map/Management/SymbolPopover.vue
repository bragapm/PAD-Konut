<script lang="ts" setup>
const props = defineProps<{
  symbolLists: [string, string][];
}>();

const emit = defineEmits<{
  updateCategoricalSymbol: [value: [string, string][]];
}>();

const open = ref(false);
const localSymbolLists = ref<[string, string][]>(
  props.symbolLists.map((item) => [...item])
);

watch(
  () => props.symbolLists,
  (newSymbolLists: [string, string][]) => {
    localSymbolLists.value = newSymbolLists.map(
      (item) => [...item] as [string, string]
    );
  },
  { deep: true }
);

const handleSymbolUpdate = (index: number, newIconImageId: string) => {
  if (localSymbolLists.value[index]) {
    localSymbolLists.value[index][1] = newIconImageId;
    emit("updateCategoricalSymbol", localSymbolLists.value);
  }
};
</script>

<template>
  <UPopover
    v-model:open="open"
    :dismissible="false"
    :ui="{ content: 'bg-grey-900 rounded-lg ring-grey-700' }"
  >
    <UButton
      label="Symbol Rule"
      color="gray"
      variant="solid"
      size="xs"
      :ui="{
        base: 'h-[26px] w-full justify-between bg-grey-700 border border-grey-600',
        label: 'text-grey-200 text-xs',
      }"
    />

    <template #content>
      <div class="w-60">
        <div
          class="flex items-center justify-between p-3 border-b border-grey-700"
        >
          <p class="text-grey-50 text-xs font-medium">Set Symbol</p>
          <button
            @click="open = false"
            class="text-grey-400 hover:text-grey-50 transition-colors"
          >
            <UIcon name="i-heroicons-x-mark-20-solid" class="w-4 h-4" />
          </button>
        </div>
        <div class="max-h-96 overflow-y-auto p-3 overflow-x-hidden">
          <div class="flex flex-col gap-2">
            <div
              v-for="(item, index) in localSymbolLists"
              :key="item[0]"
              class="flex items-center gap-2 min-w-0"
            >
              <p class="text-grey-200 text-xs truncate min-w-0 flex-1">
                {{ item[0] }}
              </p>
              <div class="shrink-0">
                <CoreIconPicker
                  :model-value="item[1]"
                  :update-icon-image="
                    (iconImageId: string) =>
                      handleSymbolUpdate(index, iconImageId)
                  "
                  :simple="true"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
