<script lang="ts" setup>
const props = defineProps<{
  text: string | null | undefined;
  openDelay?: number;
  closeDelay?: number;
}>();

const open = ref(false);
let openTimeout: ReturnType<typeof setTimeout>;
let closeTimeout: ReturnType<typeof setTimeout>;

const onMouseEnter = () => {
  clearTimeout(closeTimeout);
  openTimeout = setTimeout(() => {
    open.value = true;
  }, props.openDelay ?? 1000);
};

const onMouseLeave = () => {
  clearTimeout(openTimeout);
  closeTimeout = setTimeout(() => {
    open.value = false;
  }, props.closeDelay ?? 0);
};
</script>

<template>
  <UTooltip
    v-if="open && text"
    :text="text.toString()"
    :ui="{
      content: 'bg-grey-800 ring-grey-700 rounded-sm text-grey-50 max-w-2xl',
    }"
  >
    <div @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
      <slot />
    </div>
  </UTooltip>
  <div v-else @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
    <slot />
  </div>
</template>
