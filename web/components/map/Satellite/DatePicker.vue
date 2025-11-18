<script lang="ts" setup>
const modelValue = defineModel<{
  startDate: any;
  endDate: any;
}>({ required: true });
</script>

<template>
  <div class="grid grid-cols-2 gap-8">
    <div>
      <div class="border border-grey-600 rounded-sm p-2">
        <UCalendar
          v-model="modelValue.startDate"
          :nextYear="{ color: 'gray' }"
          :prevYear="{ color: 'gray' }"
          :nextMonth="{ color: 'gray' }"
          :prevMonth="{ color: 'gray' }"
        />
      </div>
    </div>
    <div>
      <div class="border border-grey-600 rounded-sm p-2">
        <UCalendar
          v-model="modelValue.endDate"
          :nextYear="{ color: 'gray' }"
          :prevYear="{ color: 'gray' }"
          :nextMonth="{ color: 'gray' }"
          :prevMonth="{ color: 'gray' }"
        />
      </div>
    </div>
  </div>
</template>
