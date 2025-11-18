import { defineStore } from "pinia";

export const useAuth = defineStore("authData", () => {
  const appLoad = ref<boolean>(true);
  const isSignedIn = ref<boolean>(false);
  const accessToken = ref<string>("");
  function signin(newToken: string) {
    isSignedIn.value = true;
    accessToken.value = newToken;
    appLoad.value = false;
  }
  async function signout() {
    isSignedIn.value = false;
    accessToken.value = "";
    await fetch("/panel/auth/logout", {
      method: "POST",
      body: JSON.stringify({
        mode: "cookie",
      }),
    });
  }
  const authModal = ref<boolean>(false);
  function mutateAuthModal(newState?: boolean) {
    if (typeof newState === "undefined") {
      authModal.value = !authModal.value;
    } else {
      authModal.value = newState;
    }
  }

  const tryRefresh = async () => {
    try {
      const { data } = await $fetch<{ data: AuthPayload }>(
        "/panel/auth/refresh",
        {
          method: "POST",
          body: JSON.stringify({
            mode: "cookie",
          }),
        }
      );
      signin(data.access_token);
      setTimeout(() => {
        tryRefresh();
      }, data.expires - 1000);
    } catch (error) {
      isSignedIn.value = false;
      accessToken.value = "";
    } finally {
      appLoad.value = false;
    }
  };

  return {
    isSignedIn,
    accessToken,
    signin,
    signout,
    authModal,
    mutateAuthModal,
    appLoad,
    tryRefresh,
  };
});
