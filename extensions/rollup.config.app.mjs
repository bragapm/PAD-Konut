import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";
import vue from "@vitejs/plugin-vue";
import styles from "rollup-plugin-styles";

const APP_SHARED_DEPS = [
  "@directus/extensions-sdk",
  "vue",
  "vue-router",
  "vue-i18n",
  "pinia",
];

export default [
  {
    input: "extensions/modules/export-layer",
    external: APP_SHARED_DEPS,
    plugins: [
      vue({ preprocessStyles: true }),
      styles(),
      nodeResolve({ browser: true }),
      commonjs({ esmExternals: true }),
      json(),
      terser(),
    ],
    output: {
      file: "dist/modules/export-layer/index.js",
      format: "es",
      inlineDynamicImports: true,
    },
  },
];
