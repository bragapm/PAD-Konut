<script setup lang="ts">
import { useFloating, offset, flip } from "@floating-ui/vue";
import IcArrowReg from "~/assets/icons/ic-arrow-reg.svg";

defineProps<{
  modelValue: string;
  updateColor: (color: string) => void;
}>();
const emit = defineEmits(["update:modelValue"]);

const reference = ref(null);
const floating = ref(null);
const { floatingStyles } = useFloating(reference, floating, {
  placement: "right-start",
  middleware: [offset(0), flip()],
});
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
      class="w-full h-[26px] flex items-center gap-2 focus:outline-none px-2 py-1 border border-grey-600 bg-grey-700 rounded-sm"
    >
      <div
        class="w-full h-3 rounded-sm"
        :style="{
          backgroundColor: modelValue,
        }"
      ></div>
      <IcArrowReg
        :fontControlled="false"
        class="w-4 h-4 rotate-180 text-grey-900"
      />
    </button>

    <template #content>
      <div class="p-2 ring-grey-700 rounded-lg bg-grey-900">
        <CoreInputColorPicker
          :color="modelValue"
          :updateColor="(color:string) => {
          updateColor(color)
          emit('update:modelValue', color);}"
        />
      </div>
    </template>
  </UPopover>
</template>
