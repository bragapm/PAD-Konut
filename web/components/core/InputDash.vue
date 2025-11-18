<script lang="ts" setup>
import IcArrowReg from "~/assets/icons/ic-arrow-reg.svg";

defineProps<{
  modelValue: string | null;
  updateLineDash: (value: null | number[]) => void;
  disabled?: boolean;
}>();
const emit = defineEmits(["update:modelValue"]);

const open = ref(false);
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'start' }"
    :ui="{
      content:
        'p-2 ring ring-grey-500 rounded-sm bg-grey-900 flex flex-col gap-2 w-48',
    }"
  >
    <button
      :disabled="disabled"
      class="w-full h-[26px] flex items-center gap-2 focus:outline-none p-2 border border-grey-600 bg-grey-700 rounded-sm"
    >
      <div class="w-full h-3 rounded-sm flex gap-2 items-center">
        <div
          :class="[
            modelValue ? 'border-dashed' : 'border-solid',
            'w-full border-t border-white',
          ]"
        ></div>
        <p class="text-grey-400 text-2xs">
          {{ modelValue ? "Dashed" : "Solid" }}
        </p>
      </div>
      <IcArrowReg
        :fontControlled="false"
        class="w-4 h-4 rotate-180 text-grey-400"
      />
    </button>

    <template #content>
      <UButton
        :disabled="modelValue === null"
        @click="
          () => {
            updateLineDash(null);
            emit('update:modelValue', null);
            open = false;
          }
        "
        size="xs"
        color="brand"
        variant="ghost"
        :class="[modelValue === null && 'bg-brand-950', 'rounded-sm']"
        >Solid</UButton
      >
      <UButton
        :disabled="modelValue !== null"
        @click="
          () => {
            updateLineDash([5, 1]);
            emit('update:modelValue', [5, 1]);
            open = false;
          }
        "
        size="xs"
        color="brand"
        variant="ghost"
        :class="[modelValue !== null && 'bg-brand-950', 'rounded-sm']"
        >Dash</UButton
      >
    </template>
  </UPopover>
</template>
