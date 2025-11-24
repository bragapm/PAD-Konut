// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  colorMode: {
    preference: "light",
  },

  css: ["~/assets/css/main.css"],
  devtools: { enabled: false },

  modules: [
    "@nuxt/ui",
    "@pinia/nuxt",
    "@nuxt/image",
    "nuxt-svgo",
    "@nuxtjs/google-fonts",
  ],

  googleFonts: {
    families: {
      Inter: [100, 200, 300, 400, 500, 600, 700, 800],
    },
  },

  pinia: {
    storesDirs: ["./stores/**"],
  },

  image: {
    dir: "assets/images",
    directus: {
      baseURL: "/panel/assets/",
      modifier: {
        withoutEnlargement: true,
      },
    },
  },

  nitro: {
    routeRules: {
      "/panel/**": {
        proxy:
          process.env.NODE_ENV === "production"
            ? "http://directus:8055/**"
            : "https://konawe-utara.geodashboard.io/panel/**",
        // : "http://localhost:8055/**",
      },
    },
  },

  alias: {
    fs: require.resolve("rollup-plugin-node-builtins"),
  },

  routeRules: {
    "/3d": { ssr: false },
    "/3d/**": { ssr: false },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  ui: {
    theme: {
      colors: [
        "primary",
        "secondary",
        "brand",
        "gray",
        "neutral",
        "info",
        "success",
        "warning",
        "error",
      ],
    },
  },

  compatibilityDate: "2025-04-22",
});
