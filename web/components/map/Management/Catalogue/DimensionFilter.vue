<script setup lang="ts">
import IcMapLayerA from "~/assets/icons/ic-map-layer-a.svg";

type LayerTypeFilterOptions = {
  type: string;
  label: string;
  checked: boolean;
  icon: string;
};

const props = defineProps<{
  list: LayerTypeFilterOptions[];
  handleChange: (index: string | number, value: boolean) => void;
  disabled: boolean;
}>();
const activeFilter = computed(() =>
  props.list
    .filter((el: LayerTypeFilterOptions) => el.checked === true)
    .map((item: LayerTypeFilterOptions) => item.type)
);

const open = ref(false);
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'start' }"
    :ui="{
      content:
        'p-2 mt-1 max-h-60 min-w-full overflow-auto rounded-sm ring ring-grey-700 bg-grey-800 space-y-2',
    }"
  >
    <UButton
      :disabled="disabled"
      :color="open ? 'gray' : 'gray'"
      :variant="open ? 'solid' : 'ghost'"
      :class="[
        'p-2 text-xs border rounded-sm flex gap-2 items-center',
        disabled && 'text-grey-500 cursor-not-allowed',
        open
          ? 'bg-grey-700 text-grey-50 border-grey-500'
          : 'bg-transparent text-grey-200 border-grey-600',
      ]"
    >
      <IcMapLayerA
        :class="[
          'text-grey-200 w-4 h-4',
          disabled && 'text-grey-500',
        ]"
        :fontControlled="false"
      />
      {{
        activeFilter.length === 1 && activeFilter[0] === "all"
          ? "All Dimension"
          : activeFilter.length + " selected"
      }}
    </UButton>

    <template #content>
      <div
        v-for="(item, index) in list"
        :key="item.type"
        class="flex flex-col"
      >
        <CoreCheckbox
          :id="item.type"
          :index="index"
          :label="item.label"
          :icon="item.icon"
          :isChecked="item.checked"
          @on-change="handleChange"
        />
      </div>
    </template>
  </UPopover>
</template>
