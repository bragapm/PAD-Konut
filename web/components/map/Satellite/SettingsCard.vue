<script lang="ts" setup>
import IcCheck from "~/assets/icons/ic-check.svg";
import IcEye from "~/assets/icons/ic-eye.svg";
import IcEyeCrossed from "~/assets/icons/ic-eye-crossed.svg";
import IcWeather from "~/assets/icons/ic-weather.svg";
import DummyImage from "@/assets/images/catalogue-item.jpeg";

const isVisible = ref(false);
</script>

<template>
  <div :class="['flex items-center justify-between rounded-sm', ,]">
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
        <p class="text-m-xxs">03:11 UTC - 2547</p>
        <p class="text-r-xxs-muted flex items-center gap-1">
          20251002_030728_18_252b
        </p>
        <p class="text-r-xxs-muted flex items-center gap-1">
          <IcWeather class="size-3" :fontControlled="false" />
          12%
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
    </div>
  </div>
</template>
