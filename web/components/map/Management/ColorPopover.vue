<script lang="ts" setup>
import { generateColorPresets } from "~/utils/mapStyling";

const props = defineProps<{
  colorLists: [string, string][];
}>();

const emit = defineEmits<{
  updateCategoricalColor: [value: [string, string][]];
}>();

const open = ref(false);
const localColorLists = ref<[string, string][]>(
  props.colorLists.map((item) => [...item] as [string, string])
);

const colorPresets = computed(() =>
  generateColorPresets(props.colorLists.length)
);

watch(
  () => props.colorLists,
  (newColorLists: [string, string][]) => {
    localColorLists.value = newColorLists.map(
      (item) => [...item] as [string, string]
    );
  },
  { deep: true }
);

const handleColorUpdate = (index: number, newColor: string) => {
  if (localColorLists.value[index]) {
    localColorLists.value[index][1] = newColor;
    emit("updateCategoricalColor", localColorLists.value);
  }
};

const applyPreset = (preset: string[]) => {
  const updatedColors: [string, string][] = localColorLists.value.map(
    (item, index) => [item[0], preset[index] || item[1]]
  );
  localColorLists.value = updatedColors;
  emit("updateCategoricalColor", updatedColors);
};
</script>

<template>
  <UPopover
    v-model:open="open"
    :dismissible="false"
    :ui="{ content: 'bg-grey-900 rounded-lg ring-grey-700' }"
  >
    <UButton
      label="Color Rule"
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
          <p class="text-grey-50 text-xs font-medium">Set Color</p>
          <button
            @click="open = false"
            class="text-grey-400 hover:text-grey-50 transition-colors"
          >
            <UIcon name="i-heroicons-x-mark-20-solid" class="w-4 h-4" />
          </button>
        </div>
        <div class="max-h-96 overflow-y-auto p-3">
          <!-- Individual Color Pickers -->
          <div class="flex flex-col gap-2 mb-3 pb-3 border-b border-grey-700">
            <div
              v-for="(item, index) in localColorLists"
              :key="item[0]"
              class="flex items-center justify-between gap-2"
            >
              <p class="text-grey-200 text-xs flex-shrink-0">{{ item[0] }}</p>
              <CoreInputColor
                :model-value="item[1]"
                :update-color="(color: string) => handleColorUpdate(index, color)"
                :simple="true"
              />
            </div>
          </div>

          <!-- Color Presets Section -->
          <div class="flex flex-col gap-2">
            <p class="text-grey-400 text-2xs font-normal">Color Palettes</p>
            <div class="flex flex-col gap-2">
              <button
                v-for="(preset, presetIndex) in colorPresets"
                :key="presetIndex"
                @click="applyPreset(preset)"
                class="border border-grey-600 rounded overflow-hidden h-3 flex hover:border-grey-400 transition-colors"
              >
                <div
                  v-for="(color, colorIndex) in preset"
                  :key="colorIndex"
                  :style="{ backgroundColor: color }"
                  class="flex-1 h-full"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
