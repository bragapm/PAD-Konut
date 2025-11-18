<script lang="ts" setup>
import IcArrowReg from "~/assets/icons/ic-arrow-reg.svg";
import IcEye from "~/assets/icons/ic-eye.svg";
import IcEyeCrossed from "~/assets/icons/ic-eye-crossed.svg";

const open = ref(true);
const isVisible = ref(false);
</script>

<template>
  <UCollapsible
    v-model:open="open"
    :class="[
      'flex flex-col w-full border border-grey-700 rounded-sm',
      open && 'bg-grey-800',
    ]"
  >
    <div class="p-2 flex items-center justify-between gap-1">
      <div class="space-y-[2px]">
        <p class="text-m-xxs">03:12 UTC - 24d5</p>
        <p class="text-r-xxs-muted flex items-center gap-1 whitespace-nowrap">
          Select Layer to Add/Download
        </p>
      </div>
      <div class="flex items-center gap-[2px]">
        <div class="flex items-center gap-1 bg-grey-800 rounded-sm p-1">
          <IcEye class="w-2 text-grey-400" :fontControlled="false" />
          <p class="text-r-xxs">1/1</p>
        </div>
        <UButton
          v-if="!isVisible"
          @click.stop="
            () => {
              console.log('test');
            }
          "
          class=""
          variant="ghost"
          color="gray"
          size="icon"
          ><IcEyeCrossed class="size-3 text-grey-400" :fontControlled="false"
        /></UButton>
        <UButton
          v-else
          @click.stop="
            () => {
              console.log('test');
            }
          "
          class=""
          variant="ghost"
          color="gray"
          size="icon"
        >
          <IcEye class="size-3 text-grey-400" :fontControlled="false" />
        </UButton>
        <IcArrowReg
          class="size-3 text-grey-400 rotate-180"
          :fontControlled="false"
        />
      </div>
    </div>
    <template #content>
      <div class="mx-2 py-2 space-y-1 border-t border-grey-700">
        <MapSatelliteSettingsCard />
        <MapSatelliteSettingsCard />
        <MapSatelliteSettingsCard />
        <MapSatelliteSettingsCard />
      </div> </template
  ></UCollapsible>
</template>
