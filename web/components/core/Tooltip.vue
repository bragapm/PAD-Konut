<script lang="ts" setup>

withDefaults(
  defineProps<{
    text: string;
    placement?: "left" | "right" | "top" | "bottom";
  }>(),
  { placement: "right" }
);
</script>

<template>
  <UTooltip
    :ui="{ content: 'bg-grey-800 ring-grey-700 rounded-sm text-grey-50' }"
    :content="{
      align: 'center',
      side: placement,
    }"
  >
    <template #content>
      <span class="text-2xs font-medium">{{ text }}</span>
    </template>
    <slot></slot>
  </UTooltip>
</template>
