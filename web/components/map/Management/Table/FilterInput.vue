<script lang="ts" setup>
import { inject } from "vue";
import IcCross from "~/assets/icons/ic-cross.svg";

const stringOperatorLists = [
  { key: "_eq", label: "Equals" },
  { key: "_neq", label: "Doesn't equal" },
  { key: "_icontains", label: "Contains" },
  { key: "_ncontains", label: "Doesn't contain" },
  { key: "_istarts_with", label: "Starts with" },
  { key: "_nistarts_with", label: "Doesn't start with" },
  { key: "_iends_with", label: "End with" },
  { key: "_niends_with", label: "Doesn't end with" },
  { key: "_in", label: "Is one of" },
  { key: "_nin", label: "Is not one of" },
  { key: "_null", label: "Is null" },
  { key: "_nnull", label: "Isn't null" },
  { key: "_empty", label: "Is empty" },
  { key: "_nempty", label: "Isn't empty" },
];

const numberOperatorLists = [
  { key: "_eq", label: "Equals" },
  { key: "_neq", label: "Doesn't equal" },
  { key: "_lt", label: "Less than" },
  { key: "_lte", label: "Less than or equal to" },
  { key: "_gt", label: "Greater than" },
  { key: "_gte", label: "Greater than or equal to" },
  { key: "_in", label: "Is one of" },
  { key: "_nin", label: "Is not one of" },
  { key: "_null", label: "Is null" },
  { key: "_nnull", label: "Isn't null" },
];

const booleanOperatorLists = [
  { key: "_eq", label: "Equals" },
  { key: "_neq", label: "Doesn't equal" },
  { key: "_null", label: "Is null" },
  { key: "_nnull", label: "Isn't null" },
];

const otherOperatorLists = [
  { key: "_null", label: "Is null" },
  { key: "_nnull", label: "Isn't null" },
];

const props = withDefaults(
  defineProps<{
    fieldOptions: TableColumn[];
    inputData: FilterItem;
    id: string;
    level?: number;
  }>(),
  {
    level: 0,
  }
);

const filterProps = inject<{
  deleteById: Function;
  updateFilter: Function;
}>("filterPropsProvider");
if (!filterProps) {
  throw new Error("filterProps not provided");
}

const field = ref(props.inputData.field);
const operator = ref(props.inputData.operator);
const value = ref(props.inputData.value);

const operatorOptions = ref<{ key: string; label: string }[] | null>(null);

watchEffect(() => {
  if (field.value) {
    const fieldObj = props.fieldOptions.find((el) => el.key === field.value);
    if (fieldObj) {
      if (["string", "text"].includes(fieldObj.type)) {
        operatorOptions.value = stringOperatorLists;
      } else if (
        [
          "float",
          "integer",
          "bigInteger",
          "decimal",
          "date",
          "time",
          "dateTime",
          "timestamp",
        ].includes(fieldObj.type)
      ) {
        operatorOptions.value = numberOperatorLists;
      } else if (["boolean"].includes(fieldObj.type)) {
        operatorOptions.value = booleanOperatorLists;
      } else {
        operatorOptions.value = otherOperatorLists;
      }
    }
  }
});

watch(
  [() => field.value, () => operator.value, () => value.value],
  ([newFieldValue, newOperatorValue, newInputValue]) => {
    filterProps.updateFilter(props.id, {
      id: props.id,
      field: newFieldValue,
      operator: newOperatorValue,
      value: newInputValue,
    });
  },
  { immediate: false }
);
</script>

<template>
  <div
    class="flex gap-2 items-center"
    :style="{ marginLeft: level * 20 + 'px' }"
  >
    <USelectMenu
      v-model="field"
      placeholder="Select Column"
      :items="fieldOptions"
      value-key="key"
      :content="{
        side: 'bottom',
        align: 'start',
      }"
      class="w-20"
      size="sm"
    />
    <USelectMenu
      v-model="operator"
      placeholder="Select Operation"
      :items="operatorOptions || stringOperatorLists"
      value-key="key"
      :content="{
        side: 'bottom',
        align: 'start',
      }"
      class="w-32"
      size="sm"
    />
    <UInput v-model="value" color="gray" placeholder="Input Value" size="xs">
    </UInput>
    <UButton
      @click="() => filterProps.deleteById(id)"
      size="xs"
      color="brand"
      variant="outline"
      class="rounded-sm w-6 h-6 justify-center"
    >
      <template #leading>
        <IcCross class="w-2 h-2 text-brand-500" :fontControlled="false" />
      </template>
    </UButton>
  </div>
</template>
