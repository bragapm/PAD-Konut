<script lang="ts" setup>
import IcArrowReg from "~/assets/icons/ic-arrow-reg.svg";
import IcCheck from "~/assets/icons/ic-check.svg";
import IcEye from "~/assets/icons/ic-eye.svg";
import IcEyeCrossed from "~/assets/icons/ic-eye-crossed.svg";
import IcWeather from "~/assets/icons/ic-weather.svg";
import DummyImage from "@/assets/images/catalogue-item.jpeg";

interface Props {
  id: string;
  data: any;
}

const props = defineProps<Props>();

// const emit = defineEmits<{
//   openSettings: [index: number];
// }>();

// const active = computed(() => props.activeId === props.id);
const isVisible = ref(false);
</script>

<template>
  <div
    :class="[
      'p-2 flex items-center justify-between rounded-sm',
      // active && 'bg-[#3C221D]',
    ]"
  >
    <div class="flex items-center gap-2">
      <div
        :class="[
          'relative size-10 rounded-sm overflow-hidden',
          isVisible && 'border border-brand-500',
        ]"
      >
        <img
          :src="DummyImage"
          alt="catalogue-item"
          class="size-full object-cover object-center rounded-sm"
        />
        <div
          v-if="isVisible"
          class="bg-brand-950/75 absolute top-0 w-full h-full flex items-center justify-center"
        >
          <IcCheck :class="['text-md text-brand-500']" />
        </div>
      </div>
      <div class="space-y-[2px]">
        <p class="text-m-xxs">
          {{ data.properties.datetime && formatDate(data.properties.datetime) }}
        </p>
        <p class="text-m-xxs w-44 truncate">{{ data.id }}</p>
        <p class="text-r-xxs-muted flex items-center gap-1">
          <IcWeather class="size-3" :fontControlled="false" />
          {{ data.properties.cloud_cover }}%
        </p>
      </div>
    </div>
    <div class="flex items-center gap-1">
      <UButton
        v-if="!isVisible"
        class=""
        variant="ghost"
        color="gray"
        size="icon"
        ><IcEyeCrossed class="size-3 text-grey-400" :fontControlled="false"
      /></UButton>
      <UButton v-else class="" variant="ghost" size="icon"
        ><IcEye class="size-3" :fontControlled="false"
      /></UButton>
      <!-- <UButton
        @click="emit('openSettings', index)"
        class="rotate-90"
        variant="ghost"
        :color="active ? 'brand' : 'gray'"
        size="icon"
        ><IcArrowReg
          :class="['size-3 ', active ? 'text-brand-500' : 'text-grey-400']"
          :fontControlled="false"
      /></UButton> -->
    </div>
  </div>
</template>
