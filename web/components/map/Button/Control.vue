<script setup lang="ts">
const props = defineProps<{
  onClick: () => void;
  active: boolean;
}>();
</script>

<template>
  <div class="p-2 rounded-xs bg-black/30">
    <UButton
      @click="onClick"
      size="sm"
      :class="active ? 'text-brand-500 bg-brand-950' : 'bg-transparent'"
      class="hover:bg-black p-2 rounded-xs"
    >
      <slot></slot>
    </UButton>
  </div>
</template>
