<script setup lang="ts">
import IcHelp from "~/assets/icons/ic-help.svg";
import IcSettings from "~/assets/icons/ic-settings.svg";
import IcLogin from "~/assets/icons/ic-login.svg";
import IcLogout from "~/assets/icons/ic-logout.svg";
import IcUser from "~/assets/icons/ic-user.svg";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/vue";
import { useQuery } from "@tanstack/vue-query";

type UserMe = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string | null;
  language: null;
  appearance: null;
  role: { name: string };
};

const authStore = useAuth();
const toast = useToast();
const { isSignedIn } = storeToRefs(authStore);

const { isPending, isError, data, error } = useQuery({
  queryKey: ["todos"],
  queryFn: async () => {
    const queryString = new URLSearchParams({
      fields: [
        "id",
        "first_name",
        "last_name",
        "email",
        "avatar",
        "language",
        "appearance",
        "role.name",
      ].join(","),
    });
    const res = await $fetch<{ data: UserMe }>(
      "/panel/users/me?" + queryString,
      {
        headers: { Authorization: "Bearer " + authStore.accessToken },
      }
    );
    return res.data;
  },
  enabled: isSignedIn,
});
</script>

<template>
  <Popover class="relative">
    <PopoverButton :as="!isSignedIn || !data?.avatar ? 'span' : 'button'"
      ><UButton
        v-if="!isSignedIn || !data?.avatar"
        class="h-9 w-9 rounded-full flex items-center justify-center"
      >
        <IcUser />
      </UButton>
      <img
        v-else
        :src="'/panel/assets/' + data.avatar"
        class="h-9 w-9 rounded-full"
      />
    </PopoverButton>
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <PopoverPanel
        class="absolute -right-1 z-10 mt-3 w-screen max-w-sm px-4 sm:px-0 lg:max-w-80"
      >
        <div
          class="relative bg-grey-900 p-2 rounded-xs shadow-lg ring-1 ring-grey-800"
        >
          <div class="flex text-white justify-between w-full p-2">
            <article>
              <h4 class="text-base font-medium text-grey-50">
                {{
                  isSignedIn && data
                    ? data.first_name + " " + data.last_name
                    : "Guest"
                }}
              </h4>
              <h5 class="text-sm font-normal text-grey-400">
                {{ isSignedIn && data ? data.email : "Published Map" }}
              </h5>
              <p class="text-sm font-normal text-grey-500">
                {{ isSignedIn && data ? data.role.name : "Public Access" }}
              </p>
            </article>
            <div
              v-if="!isSignedIn || !data?.avatar"
              class="bg-brand-600 h-9 w-9 rounded-full flex items-center justify-center text-white"
            >
              <IcUser />
            </div>
            <img
              v-else
              :src="'/panel/assets/' + data.avatar"
              class="h-9 w-9 rounded-full"
            />
          </div>
          <div class="border-y w-full border-grey-700 py-2 mb-2">
            <button
              v-if="isSignedIn"
              class="flex items-center space-x-2 px-2 py-2 w-full"
            >
              <IcSettings class="text-grey-400" />
              <p class="text-xs font-medium text-grey-200">
                Account Setting
              </p>
            </button>
            <button class="flex items-center space-x-2 px-2 py-2 w-full">
              <IcHelp class="text-grey-400" />
              <p class="text-xs font-medium text-grey-200">Help</p>
            </button>
          </div>
          <PopoverButton
            v-if="isSignedIn"
            class="flex items-center space-x-2 px-2 py-2 w-full"
            @click="
              async () => {
                toast.add({
                  title: 'Sign Out Successful',
                  description: 'You are now browsing as a guest.',
                  icon: 'i-heroicons-information-circle',
                });
                await authStore.signout();
              }
            "
          >
            <IcLogout class="text-red-500" />
            <p class="text-xs font-medium text-red-500">Sign Out</p>
          </PopoverButton>
          <PopoverButton
            v-else
            class="flex items-center space-x-2 px-2 py-2 w-full"
            @click="() => authStore.mutateAuthModal()"
          >
            <IcLogin class="text-grey-400" />
            <p class="text-xs font-medium text-grey-200">Sign In</p>
          </PopoverButton>
        </div>
      </PopoverPanel>
    </transition>
  </Popover>
</template>
