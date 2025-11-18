<script lang="ts" setup>
withDefaults(
  defineProps<{
    title?: string;
    placement?: "left" | "right" | "top" | "bottom";
  }>(),
  { placement: "right" }
);
</script>

<template>
  <UPopover
    mode="hover"
    :ui="{ content: 'bg-grey-800 ring-grey-700 rounded-sm text-grey-50' }"
    :content="{
      align: 'center',
      side: placement,
    }"
  >
    <slot />

    <template #content>
      <div class="py-1 px-2 text-2xs text-grey-50 max-w-36">
        <p class="font-medium">{{ title }}</p>
        <slot name="panel" />
      </div>
    </template>
  </UPopover>
</template>
