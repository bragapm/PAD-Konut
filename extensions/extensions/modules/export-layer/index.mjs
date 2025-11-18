import ModuleComponent from "./module.vue";

export default {
  id: "export-layer",
  name: "Export Layer",
  icon: "publish",
  routes: [
    {
      path: "",
      component: ModuleComponent,
    },
  ],
};
