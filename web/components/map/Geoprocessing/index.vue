<script lang="ts" setup>
import IcCross from "~/assets/icons/ic-cross.svg";
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from "reka-ui";

const featureStore = useFeature();
const tabItems = [
  {
    key: "onprocess",
    label: "On Process",
  },
  {
    key: "completed",
    label: "Completed",
  },
];
</script>

<template>
  <div class="flex justify-between items-center m-3">
    <h2 class="text-white">Geoprocessing Queue</h2>
    <IcCross
      role="button"
      @click="featureStore.setRightSidebar('')"
      :fontControlled="false"
      class="w-3 h-3 rotate-180 text-grey-50"
    />
  </div>
  <hr class="mx-3" />

  <div class="grow overflow-hidden px-3 my-3 flex flex-col">
    <TabsRoot default-value="onprocess" class="flex flex-col h-full">
      <TabsList
        class="grid grid-cols-2 gap-2 text-center cursor-pointer divide-x-2 text-xs"
      >
        <TabsTrigger
          v-for="item in tabItems"
          :key="item.key"
          :value="item.key"
          as-child
        >
          <p class="data-[state=active]:text-grey-200 data-[state=inactive]:text-grey-500">
            {{ item.label }}
          </p>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="onprocess" class="mt-3 overflow-y-auto flex-1 pb-10">
        <MapGeoprocessingQueue />
      </TabsContent>
      <TabsContent value="completed" class="mt-3 overflow-y-auto flex-1 pb-10">
        <MapGeoprocessingHistory />
      </TabsContent>
    </TabsRoot>
  </div>
</template>
