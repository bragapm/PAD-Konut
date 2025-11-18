<script setup lang="ts">
import { SwitchRoot } from "reka-ui";
import IcCheck from "~/assets/icons/ic-check.svg";

const props = defineProps<{
  id: string;
  index: number | string;
  label?: string;
  icon?: string | Component;
  isChecked: boolean;
  forHeader?: boolean;
}>();
const emit = defineEmits<{
  onChange: [index: number | string, value: boolean];
}>();

const enabled = ref(props.isChecked);

watchEffect(() => {
  enabled.value = props.isChecked;
});
</script>

<template>
  <div>
    <SwitchRoot
      v-model="enabled"
      @click="
        () => {
          emit('onChange', index, !isChecked);
        }
      "
      class="w-full"
      :disabled="id === 'all' && isChecked"
      as-child
    >
      <div
        :class="[
          enabled && !forHeader ? 'bg-brand-950' : 'bg-transparent',
          'flex items-center p-2 gap-2 rounded-sm cursor-pointer',
        ]"
      >
        <div
          :class="[
            enabled ? 'border-brand-500' : 'border-grey-600',
            'h-4 w-4 border rounded-sm flex items-center justify-center p-[2px]',
          ]"
        >
          <IcCheck
            :class="[
              'text-2xs text-brand-500',
              enabled ? 'visible' : 'invisible',
            ]"
          />
        </div>
        <component
          v-if="icon"
          :is="icon"
          :class="['w-4 h-4', enabled ? 'text-brand-500' : 'text-grey-400']"
          :fontControlled="false"
        ></component>
        <p
          v-if="label"
          :class="[
            'text-xs select-none whitespace-nowrap',
            enabled ? 'text-grey-50' : 'text-grey-200',
          ]"
        >
          {{ label }}
        </p>
      </div>
    </SwitchRoot>
  </div>
</template>
