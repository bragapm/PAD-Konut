<script setup lang="ts">
import { TransitionRoot } from "@headlessui/vue";
import IcHome from "~/assets/icons/ic-home.svg";
import IcLink from "~/assets/icons/ic-link.svg";
import IcMapFlat from "~/assets/icons/ic-map-flat.svg";
import IcTopnav from "~/assets/icons/ic-topnav.svg";
import IcLogin from "~/assets/icons/ic-login.svg";
import IcLogout from "~/assets/icons/ic-logout.svg";

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
      class="relative bg-grey-900 rounded-xs flex items-center justify-between z-50 min-w-fit transition-all duration-300 ease-in-out"
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
          <TransitionRoot
            :show="isExpand"
            enter="transition-opacity duration-100"
            enter-from="opacity-0"
            enter-to="opacity-1"
            leave="transition-opacity duration-100"
            leave-from="opacity-1"
            leave-to="opacity-0"
            class="absolute right-0 translate-x-full flex gap-4 whitespace-nowrap overflow-hidden opacity-1"
          >
            <NuxtLink to="/" @click="isExpand = !isExpand">
              <UButton
                :color="route.path === '/' ? 'navActive' : 'navMenu'"
                label="Map"
                :ui="{ rounded: 'rounded-full' }"
                class="text-2xs py-2 px-3 ring-0"
              >
                <template #leading>
                  <IcMapFlat class="text-base" />
                </template>
              </UButton>
            </NuxtLink>
            <NuxtLink to="/home">
              <UButton
                :color="route.path === '/home' ? 'navActive' : 'navMenu'"
                label="Home"
                :ui="{ rounded: 'rounded-full' }"
                class="text-2xs py-2 px-3 ring-0"
              >
                <template #leading>
                  <IcHome class="text-base" />
                </template>
              </UButton>
            </NuxtLink>
          </TransitionRoot>
        </div>
      </div>

      <TransitionRoot
        :show="isExpand"
        enter="transition-opacity duration-100"
        enter-from="opacity-0"
        enter-to="opacity-1"
        leave="transition-opacity duration-100"
        leave-from="opacity-1"
        leave-to="opacity-0"
        class="absolute right-0 flex items-center gap-2 px-3"
      >
        <UButton label="Share Map">
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
      </TransitionRoot>
      <!-- Welcome to the interactive digital map of Indonesia, providing a comprehensive overview of the country's civil data. -->
      <TransitionRoot
        v-if="mapData?.data?.title || mapData?.data?.subtitle"
        :show="!isExpand"
        enter="transition-opacity duration-1000"
        enter-from="opacity-0"
        enter-to="opacity-1"
        leave="transition-opacity duration-100"
        leave-from="opacity-1"
        leave-to="opacity-0"
        class="absolute top-0 -right-5 translate-x-full bg-grey-700/30 rounded-xs h-12 p-3 max-w-2xl text-white transition-opacity ease-in-out duration-100"
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
            class="hide-scrollbar whitespace-nowrap text-sm w-64 overflow-auto select-none"
          >
            {{ mapData?.data.subtitle }}
          </p>
        </div>
      </TransitionRoot>
    </div>
    <div
      class="absolute top-6 right-6 z-40 flex items-center gap-2 bg-grey-900 p-[6px] h-12 rounded-xs"
    >
      <LayoutsNavbarSearchLoc />
      <LayoutsNavbarShare />
      <LayoutsNavbarAuth />
    </div>
  </div>
  <LayoutsAuthModal :isExpand="isExpand"> </LayoutsAuthModal>
</template>
