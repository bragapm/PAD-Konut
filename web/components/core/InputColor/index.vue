<script setup lang="ts">
import IcArrowReg from "~/assets/icons/ic-arrow-reg.svg";

defineProps<{
  modelValue: string;
  updateColor: (color: string) => void;
  simple?: boolean;
}>();
const emit = defineEmits(["update:modelValue"]);

const isOpen = ref(false);
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
      v-if="simple"
      class="size-4 focus:outline-none border border-grey-600 bg-grey-700 rounded-sm"
      :style="{
        backgroundColor: modelValue,
      }"
    ></button>
    <button
      v-else
      class="w-full h-[26px] flex items-center gap-2 focus:outline-none px-2 py-1 border border-grey-600 bg-grey-700 rounded-sm"
    >
      <div
        class="w-full h-3 rounded-sm border border-white/45"
        :style="{
          backgroundColor: modelValue,
        }"
      ></div>
      <IcArrowReg
        :fontControlled="false"
        class="w-4 h-4 rotate-180 text-grey-400"
      />
    </button>

    <template #content>
      <div class="p-2 ring-grey-700 rounded-lg bg-grey-900">
        <CoreInputColorPicker
          :color="modelValue"
          :updateColor="(color:string) => {
          updateColor(color)
          emit('update:modelValue', color);}"
          @close="isOpen = false"
        />
      </div>
    </template>
  </UPopover>
</template>
