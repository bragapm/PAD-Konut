<script lang="ts" setup>
import IcArrow from "~/assets/icons/ic-arrow-reg.svg";

const props = defineProps<{
  triggerLabel?: string;
  triggerIcon?: string | Component;
  itemLabel?: string;
  itemDescription?: string;
  items?: ToolItem[];
}>();

const open = ref(false);

const toolsStore = useMapTools();
const { expandTools } = storeToRefs(toolsStore);
</script>

<template>
  <UPopover
    v-model:open="open"
    :ui="{
      content: 'p-2 w-56 rounded-sm bg-grey-900 shadow-lg ring-1 ring-grey-800',
    }"
  >
    <CoreTooltip
      :prevent="expandTools && triggerLabel"
      :text="triggerLabel || itemLabel || ''"
      placement="top"
    >
      <UButton
        :color="open ? 'brand' : 'gray'"
        :variant="open ? 'soft' : 'ghost'"
        class="text-xs"
      >
        <template #leading>
          <component :is="triggerIcon" class="w-4 h-4" :fontControlled="false">
          </component>
        </template>
        <div
          :class="[
            expandTools ? 'w-72' : 'w-0',
            'max-w-max transition-all duration-500 ease-in-out whitespace-nowrap overflow-hidden text-xs',
          ]"
        >
          {{ triggerLabel }}
        </div>
        <template #trailing>
          <IcArrow class="w-4 h-4" :fontControlled="false" />
        </template>
      </UButton>
    </CoreTooltip>

    <template #content>
      <div class="flex flex-col gap-2">
        <div v-show="itemLabel || itemDescription" class="text-white">
          <p class="text-xs text-grey-400">{{ itemLabel }}</p>
          <p class="text-2xs text-grey-500">{{ itemDescription }}</p>
        </div>
        <slot name="custom-item" />
        <div v-if="items" v-for="item in items" :key="item.id">
          <button
            @click="
              () => {
                toolsStore.handleOpenToolsCard(item);
                if (item.action) {
                  item.action(item);
                }
              }
            "
            class="bg-transparent group flex w-full items-center gap-3 rounded-sm p-2 text-xs text-white cursor-pointer hover:bg-grey-700"
          >
            <component
              :is="item.icon"
              class="w-[14px] h-[14px]"
              :fontControlled="false"
            ></component>
            {{ item.label }}
          </button>
        </div>
      </div>
    </template>
  </UPopover>
</template>
