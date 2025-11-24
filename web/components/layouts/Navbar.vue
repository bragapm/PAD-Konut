<script setup lang="ts">
import IcPrint from "~/assets/icons/ic-print.svg";
import IcHome from "~/assets/icons/ic-home.svg";
import IcLink from "~/assets/icons/ic-link.svg";
import IcMapFlat from "~/assets/icons/ic-map-flat.svg";
import IcTopnav from "~/assets/icons/ic-topnav.svg";
import IcLogin from "~/assets/icons/ic-login.svg";
import IcLogout from "~/assets/icons/ic-logout.svg";
import IcPalm from "~/assets/icons/ic-palm.svg";
import IcCursor from "~/assets/icons/ic-cursor.svg";

const route = useRoute();
const toast = useToast();
const colorMode = useColorMode();

// const isExpand = useState('isExpand', () => true)
const isExpand = ref(route.path === "/" ? false : true);

const isDark = computed({
  get() {
    return colorMode.value === "dark";
  },
  set() {
    colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
  },
});

import { useMapData } from "~/utils";
const { isLoading, data: mapData } = await useMapData();
const { data: generalSettingsData } = await useGeneralSettings();

const myInterval = ref<NodeJS.Timeout>();

const startScroll = () => {
  myInterval.value = setInterval(
    () =>
      document.getElementById("auto-scroll")?.scrollBy({
        left: 5,
        behavior: "smooth",
      }),
    100
  );
};
const refreshScroll = () => {
  clearInterval(myInterval.value);
  document.getElementById("auto-scroll")?.scrollTo({
    left: 0,
    behavior: "smooth",
  });
};

const authStore = useAuth();

const handlePrint = () => {
  if (!window.print) {
    console.log("browser not supported");
  } else {
    window.print();
  }
};

//handle change cursor mode
const mapStore = useMap();
const { cursorMode } = storeToRefs(mapStore);
const { changeCursorMode } = mapStore;

const expandSearch = ref(false);
const updateExpand = (value: boolean) => {
  expandSearch.value = value;
};
</script>

<template>
  <div :class="[isExpand && 'sticky top-0', 'z-50 p-6 flex']">
    <!-- <Presence>
      <Motion
        v-show="isExpand && route.path === '/map'"
        :initial="{ opacity: 1 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        :transition="{ duration: 0.5 }"
      >
        <div
          class="bg-black/50 backdrop-blur-sm fixed top-0 left-0 w-screen h-screen z-50"
        ></div>
      </Motion>
    </Presence> -->
    <div
      :class="isExpand ? 'w-full py-3 px-0' : 'w-0 p-0'"
      class="relative bg-grey-900 rounded-lg flex items-center justify-between z-50 min-w-fit transition-all duration-300 ease-in-out"
    >
      <div class="flex items-center gap-2">
        <div class="relative flex items-center p-3 gap-3 h-12">
          <button
            :disabled="route.path === '/home' ? true : false"
            @click="isExpand = !isExpand"
          >
            <IcTopnav class="text-lg" />
          </button>
          <NuxtImg
            v-if="generalSettingsData?.data?.project_logo_horizontal"
            provider="directus"
            :src="generalSettingsData?.data?.project_logo_horizontal"
            class="h-10 max-w-56 object-contain object-center"
          />
          <p
            v-if="mapData?.data?.expand_title"
            class="whitespace-nowrap text-sm font-medium text-white"
          >
            {{ mapData?.data.expand_title }}
          </p>
          <Transition
            enter-active-class="transition-opacity duration-100"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-100"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="isExpand"
              class="absolute right-0 translate-x-full flex gap-4 whitespace-nowrap overflow-hidden"
            >
              <NuxtLink to="/" @click="isExpand = !isExpand">
                <UButton
                  :color="route.path === '/' ? 'primary' : 'gray'"
                  label="Map"
                  class="text-2xs py-2 px-3 ring-0 rounded-full"
                  variant="soft"
                >
                  <template #leading>
                    <IcMapFlat class="text-base" />
                  </template>
                </UButton>
              </NuxtLink>
              <NuxtLink to="/home">
                <UButton
                  :color="route.path === '/home' ? 'primary' : 'gray'"
                  label="Home"
                  class="text-2xs py-2 px-3 ring-0 rounded-full"
                  variant="soft"
                >
                  <template #leading>
                    <IcHome class="text-base" />
                  </template>
                </UButton>
              </NuxtLink>
            </div>
          </Transition>
        </div>
      </div>

      <Transition
        enter-active-class="transition-opacity duration-100"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isExpand"
          class="absolute right-0 flex items-center gap-2 px-3"
        >
          <UButton label="Share Map" color="primary">
            <template #trailing>
              <IcLink class="text-base" />
            </template>
          </UButton>
          <UButton
            @click="
              async () => {
                if (authStore.isSignedIn) {
                  toast.add({
                    title: 'Sign Out Successful',
                    description: 'You are now browsing as a guest.',
                    icon: 'i-heroicons-information-circle',
                  });
                  await authStore.signout();
                } else authStore.mutateAuthModal(true);
              }
            "
            class="h-9 w-9 rounded-full flex items-center justify-center"
          >
            <IcLogout v-if="authStore.isSignedIn" />
            <IcLogin v-else />
          </UButton>
        </div>
      </Transition>
      <!-- Welcome to the interactive digital map of Indonesia, providing a comprehensive overview of the country's civil data. -->
      <Transition
        enter-active-class="transition-opacity duration-1000"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="!isExpand && (mapData?.data?.title || mapData?.data?.subtitle)"
          class="absolute top-0 -right-5 translate-x-full bg-grey-700/30 rounded-lg h-12 p-3 max-w-2xl text-white"
        >
          <div class="flex items-center h-6 gap-3">
            <p v-if="mapData?.data?.title" class="whitespace-nowrap">
              {{ mapData?.data.title }}
            </p>
            <p
              v-if="mapData?.data?.subtitle"
              id="auto-scroll"
              @mouseover="startScroll"
              @mouseout="refreshScroll"
              class="hide-scrollbar whitespace-nowrap text-sm w-64 text-grey-400 overflow-auto select-none"
            >
              {{ mapData?.data.subtitle }}
            </p>
          </div>
        </div>
      </Transition>
    </div>
    <div
      class="absolute top-6 right-6 z-40 flex items-center gap-2 bg-grey-900 py-[6px] pl-3 pr-2 h-12 rounded-lg"
    >
      <transition
        enter-active-class="transition-all duration-300 ease-in-out"
        leave-active-class="transition-all duration-300 ease-in-out"
        enter-from-class="opacity-0 max-w-0"
        enter-to-class="opacity-100 max-w-[8rem]"
        leave-from-class="opacity-100 max-w-[8rem]"
        leave-to-class="opacity-0 max-w-0"
      >
        <div
          v-if="!expandSearch"
          class="flex items-center gap-2 h-full overflow-hidden"
        >
          <CorePopover
            v-if="cursorMode === 'select'"
            title="Select Layer Mode"
            placement="bottom"
          >
            <UButton
              @click="changeCursorMode('default')"
              variant="ghost"
              class="p-1 text-gray-400 hover:text-brand-600"
            >
              <template #trailing>
                <IcCursor class="w-4 h-4" :fontControlled="false" />
              </template>
            </UButton>
            <template #panel>
              <p class="text-grey-400">
                Select layers by clicking or dragging on the map.
              </p>
            </template>
          </CorePopover>
          <CorePopover v-else title="Select Layer Mode" placement="bottom">
            <UButton
              @click="changeCursorMode('select')"
              variant="ghost"
              class="p-1 text-gray-400 hover:text-brand-600"
            >
              <template #trailing>
                <IcPalm class="w-4 h-4" :fontControlled="false" />
              </template>
            </UButton>
            <template #panel>
              <p class="text-grey-400">
                Select layers by clicking or dragging on the map.
              </p>
            </template>
          </CorePopover>
          <div
            class="flex gap-3 items-center border-x border-grey-800 h-full p-2"
          >
            <CoreTooltip text="Print Map" placement="bottom">
              <UButton
                @click="handlePrint"
                variant="ghost"
                class="p-1 text-gray-400 hover:text-brand-600"
              >
                <template #trailing>
                  <IcPrint class="w-4 h-4" :fontControlled="false" />
                </template>
              </UButton>
            </CoreTooltip>
            <LayoutsNavbarShare />
          </div>
        </div>
      </transition>
      <LayoutsNavbarSearchLoc
        :expandSearch="expandSearch"
        @update-expand="updateExpand"
      />
      <LayoutsNavbarAuth />
    </div>
  </div>
  <LayoutsAuthModal :isExpand="isExpand"> </LayoutsAuthModal>
</template>
