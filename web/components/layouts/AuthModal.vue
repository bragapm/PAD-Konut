<script setup lang="ts">
import IcAction from "~/assets/icons/ic-action.svg";
import IcEye from "~/assets/icons/ic-eye.svg";
import IcEyeCrossed from "~/assets/icons/ic-eye-crossed.svg";
import IcLogoGeodashboardFull from "~/assets/icons/ic-logo-geodashboard-full.svg";
import IcSpinner from "~/assets/icons/ic-spinner.svg";
import type { FormError, FormSubmitEvent } from "#ui/types";

defineProps<{
  isExpand: boolean;
}>();

type SigninData = {
  email: string;
  password: string;
};

const authStore = useAuth();
const { data: mapData } = await useMapData();
const { data: generalSettingsData } = await useGeneralSettings();
const signinData = reactive<SigninData>({ email: "", password: "" });
const generalErrorMessage = ref("");
const showPassword = ref(false);
const isLoading = ref(false);

const validateSigninData = (
  state: SigninData
): FormError<keyof SigninData>[] => {
  const errors: FormError<keyof SigninData>[] = [];
  if (!state.email) errors.push({ name: "email", message: "Required" });
  if (!state.password) errors.push({ name: "password", message: "Required" });
  return errors;
};

const img = useImage();
const bgImgUrl = computed(() =>
  generalSettingsData.value?.data.public_background
    ? `url('${img(generalSettingsData.value.data.public_background, undefined, {
        provider: "directus",
      })}')`
    : null
);

const { signin, tryRefresh } = useAuth();
const handleSignin = async (event: FormSubmitEvent<SigninData>) => {
  generalErrorMessage.value = "";
  isLoading.value = true;

  try {
    const { data } = await $fetch<{ data: AuthPayload }>("/panel/auth/login", {
      method: "POST",
      body: {
        email: event.data.email,
        password: event.data.password,
        mode: "cookie",
      },
    });
    signin(data.access_token);
    setTimeout(tryRefresh, data.expires - 1000);
    authStore.mutateAuthModal(false);
  } catch {
    generalErrorMessage.value =
      "Signin information is incorrect. Make sure the email and password is correct and try again.";
  } finally {
    isLoading.value = false;
  }
};

const currentYear = new Date().getFullYear();
const googleIconUrl =
  "https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-jiKhxDx1FrYbtRHKJ9z_hELisAlapwE9LUPh6fcXIfb5vwpbMl4xl9H9TRFPc5NOO8Sb3VSgIBrfRYvW6cUA";
</script>

<template>
  <UModal
    v-model:open="authStore.authModal"
    :ui="{ content: 'bg-transparent' }"
    fullscreen
  >
    <template #content>
      <div class="flex min-h-full items-center justify-center text-center">
        <div @click="authStore.authModal = false" class="absolute inset-0" />
        <div
          :class="[
            'z-10 transform overflow-hidden rounded-xl shadow-xl transition-all mx-6 w-full',
            isExpand ? 'mt-24' : 'mt-12',
          ]"
        >
          <div
            :class="[
              'flex justify-end w-full rounded-[20px] h-[calc(100vh-9rem)]',
              bgImgUrl ? 'bg-cover bg-center' : 'bg-grey-900',
            ]"
            :style="bgImgUrl ? `background-image: ${bgImgUrl}` : undefined"
          >
            <div class="w-1/2 p-8">
              <div
                class="bg-grey-800 rounded-[20px] h-full px-16 overflow-y-auto"
              >
                <div class="flex flex-col text-center space-y-3 mb-16 mt-8">
                  <NuxtImg
                    v-if="generalSettingsData?.data?.project_logo_horizontal"
                    provider="directus"
                    :src="generalSettingsData?.data?.project_logo_horizontal"
                    class="h-10 object-contain object-center"
                  />
                  <p
                    v-if="mapData?.data?.expand_title"
                    class="whitespace-nowrap text-sm font-medium text-white"
                  >
                    {{ mapData?.data.expand_title }}
                  </p>
                  <h1 class="text-4xl font-medium text-grey-50">
                    Welcome to {{ mapData?.data.title || "GeoDashboard" }}
                  </h1>
                  <p class="text-grey-500 text-sm">
                    Sign In to manage and visualize regional assets seamlessly!
                  </p>
                </div>
                <UForm
                  ref="formRef"
                  :validate="validateSigninData"
                  :state="signinData"
                  class="flex flex-col space-y-3 mb-7"
                  @submit="handleSignin"
                >
                  <UFormField name="email">
                    <UInput
                      v-model="signinData.email"
                      type="email"
                      class="w-full rounded-xl"
                      color="gray"
                      size="xl"
                      placeholder="Email"
                      :disabled="isLoading"
                    />
                  </UFormField>
                  <UFormField name="password">
                    <UInput
                      v-model="signinData.password"
                      :type="showPassword ? 'text' : 'password'"
                      class="w-full"
                      color="gray"
                      size="xl"
                      placeholder="Password"
                      :disabled="isLoading"
                    >
                      <template #trailing>
                        <button
                          type="button"
                          @click="showPassword = !showPassword"
                        >
                          <IcEye v-if="showPassword" class="text-grey-400" />
                          <IcEyeCrossed v-else class="text-grey-400" />
                        </button>
                      </template>
                    </UInput>
                  </UFormField>
                  <div
                    v-if="generalErrorMessage"
                    class="flex space-x-2 items-center"
                  >
                    <IcAction class="text-red-500 h-full" />
                    <p class="grow text-xs text-red-500">
                      {{ generalErrorMessage }}
                    </p>
                  </div>
                  <UButton
                    block
                    size="xl"
                    type="submit"
                    label="Sign In"
                    class="rounded-sm"
                  >
                    <IcSpinner
                      class="text-white animate-spin h-6 w-6 p-1"
                      :fontControlled="false"
                      v-if="isLoading"
                    />
                  </UButton>
                </UForm>
                <div class="w-full border border-grey-600 mb-7" />
                <UButton
                  block
                  variant="outline"
                  size="xl"
                  class="mb-7 rounded-sm"
                  label="Sign In with Google"
                  :disabled="isLoading"
                >
                  <template #leading>
                    <img :src="googleIconUrl" alt="Google" class="h-5" />
                  </template>
                </UButton>
                <p class="text-center text-grey-500 text-sm mb-8">
                  ©{{ currentYear }} Pemerintah Daerah Konawe Utara
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
