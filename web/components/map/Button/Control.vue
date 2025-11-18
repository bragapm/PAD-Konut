<script setup lang="ts">
defineProps<{
  active: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();

const handleClick = () => {
  emit('click');
};
</script>

<template>
  <div class="p-2 rounded-lg bg-black/30">
    <UButton
      @click="handleClick"
      size="sm"
      :class="active ? 'text-brand-500 bg-brand-950' : 'bg-transparent'"
      class="hover:bg-black p-2 rounded-lg"
    >
      <slot></slot>
    </UButton>
  </div>
</template>
