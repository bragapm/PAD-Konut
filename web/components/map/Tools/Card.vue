<script setup lang="ts">
import IcCross from "~/assets/icons/ic-cross.svg";
import IcDrawSquare from "~/assets/icons/ic-draw-square.svg";

export interface Props {
  active?: boolean;
  label?: string;
  icon?: string | Component;
  onClose?: () => void;
}
const props = withDefaults(defineProps<Props>(), {
  active: false,
  label: "",
  onClose: () => {},
});

const toolsStore = useMapTools();
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300"
    enter-from-class="-translate-y-10 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-300"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-10 opacity-0"
  >
    <div
      v-if="active"
      class="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-grey-800 w-[20rem] divide-y divide-grey-700"
    >
      <div class="flex items-center gap-[6px] p-2">
        <component
          :is="icon"
          class="w-3 h-3 text-grey-400"
          :fontControlled="false"
        ></component>
        <p class="flex-1 text-grey-200 text-2xs">{{ label }}</p>
        <button @click="() => toolsStore.handleCloseToolsCard()">
          <IcCross class="w-2 h-2 text-grey-400 m-2" :fontControlled="false" />
        </button>
      </div>
      <slot />
    </div>
  </Transition>
</template>
