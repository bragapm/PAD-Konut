<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import IcArrowLeft from "~/assets/icons/ic-arrow-left.svg";
import { Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";

const dashedGridPlugin = {
  id: "dashedGrid",
  afterDatasetsDraw: (chart, args, options) => {
    if (!options.enabled) return;

    const ctx = chart.ctx;
    const yAxis = chart.scales.y;
    const meta = chart.getDatasetMeta(0);
    const points = meta.data;

    const linePoints = points
      .map((p) => ({ x: p.x, y: p.y }))
      .sort((a, b) => a.x - b.x);

    yAxis.ticks.forEach((tick) => {
      const gridY = yAxis.getPixelForValue(tick.value);
      const segmentCount = 50;
      const xStart = chart.chartArea.left;
      const xEnd = chart.chartArea.right;
      const step = (xEnd - xStart) / segmentCount;

      for (let i = 0; i < segmentCount; i++) {
        const x1 = xStart + i * step;
        const x2 = x1 + step;

        // Interpolate lineY at midpoint
        const midX = (x1 + x2) / 2;
        let p1, p2;
        for (let j = 0; j < linePoints.length - 1; j++) {
          if (midX >= linePoints[j].x && midX <= linePoints[j + 1].x) {
            p1 = linePoints[j];
            p2 = linePoints[j + 1];
            break;
          }
        }

        let shouldBlur = false;
        if (p1 && p2) {
          const ratio = (midX - p1.x) / (p2.x - p1.x);
          const lineY = p1.y + ratio * (p2.y - p1.y);
          shouldBlur = gridY > lineY;
        }

        ctx.save();
        ctx.setLineDash([4]);
        ctx.strokeStyle = "#ccc";
        ctx.lineWidth = 1;
        if (shouldBlur) {
          ctx.filter = "blur(2px)";
        }

        ctx.beginPath();
        ctx.moveTo(x1, gridY);
        ctx.lineTo(x2, gridY);
        ctx.stroke();
        ctx.restore();
      }
    });
  },
};

// Register required Chart.js components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  dashedGridPlugin
);

const builtAssetData = ref<any[]>([]);
const naturalAssetData = ref<any[]>([]);
const assetUtilizationData = ref<any>({});

// Define chart data and options
const builtChartData = ref<any>({
  labels: [],
  datasets: [
    {
      label: "Jumlah Aset",
      data: [],
      backgroundColor: "#4DD427", // Bar color
      borderColor: "#4DD427",
      borderWidth: 1,
      borderRadius: 30,
    },
  ],
});

const naturalChartData = ref<any>({
  labels: [],
  datasets: [
    {
      label: "Jumlah Aset",
      data: [],
      backgroundColor: "#4DD427", // Bar color
      borderColor: "#4DD427",
      borderRadius: 30,
      borderWidth: 1,
    },
  ],
});

const defaultChartData = {
  labels: [], // Empty labels
  datasets: [
    {
      label: "No Data",
      data: [], // Empty dataset
      borderColor: "rgba(200, 200, 200, 0.5)",
      borderWidth: 1,
      fill: false,
    },
  ],
};

const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      left: 30,
      right: 10,
      top: 10,
      bottom: 10,
    },
  },

  scales: {
    y: {
      beginAtZero: true,
      grid: {
        display: true, // Hide Y grid lines
        borderDash: [1, 4], // [dash length, space length]
        color: "#ccc", // optional: change grid color
        tickBorderDash: [1, 4],
      },
      ticks: {
        display: true, // hide Y axis
        font: {
          size: 8,
        },
        callback: function (value) {
          return this.getLabelForValue(value);
        },
      },
      border: {
        display: false, // Hide Y axis line
      },
    },
    x: {
      grid: {
        display: false, // Hide X grid lines
      },
      ticks: {
        font: {
          size: 8,
        },
        callback: function (value) {
          return this.getLabelForValue(value);
        },
        display: true,
        maxRotation: 0, // prevent rotation
        minRotation: 90, // force horizontal
        autoSkip: false,
      },
      border: {
        display: true, // Hide X axis line
      },
    },
  },

  elements: {
    point: {
      radius: 1,
      backgroundColor: "#ff0000",
    },
    line: {
      borderWidth: 1,
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    dashedGrid: {
      enabled: true,
    },
  },
});

// Fetch asset distribution data
const fetchAssetDistribution = async (kecamatanId: string) => {
  try {
    const res = await fetch(
      `/panel/analysis/kecamatan-assets-distribution/${kecamatanId}`
    );
    const response = await res.json();

    // Separate the built and natural assets
    builtAssetData.value = response.built;
    naturalAssetData.value = response.natural;

    // Prepare the chart data for built assets
    prepareBuiltChartData();
    // Prepare the chart data for natural assets
    prepareNaturalChartData();
  } catch (error) {
    console.error("Error fetching asset distribution:", error);
  }
};

// Prepare built asset data for the chart
// Prepare built asset data for the chart
const prepareBuiltChartData = () => {
  builtChartData.value = {
    labels: builtAssetData.value.map((item) => item.name), // Categories (unsur)
    datasets: [
      {
        label: "Jumlah Aset - Buatan", // Dataset label for built assets
        data: builtAssetData.value.map((item) => item.count), // Asset counts per category
        backgroundColor: "#4DD427", // Bar color
        borderColor: "#4DD427",
        borderWidth: 1, // Border width
        borderRadius: 30,
      },
    ],
  };
};

// Prepare natural asset data for the chart
const prepareNaturalChartData = () => {
  naturalChartData.value = {
    labels: naturalAssetData.value.map((item) => item.name), // Categories (unsur)
    datasets: [
      {
        label: "Jumlah Aset - Alami", // Dataset label for natural assets
        data: naturalAssetData.value.map((item) => item.count), // Asset counts per category
        backgroundColor: "#4DD427", // Bar color
        borderColor: "#4DD427",
        borderWidth: 1, // Border width
        borderRadius: 30,
      },
    ],
  };
};
const prepareUtilizationChartData = () => {
  naturalChartData.value = {
    labels: naturalAssetData.value.map((item) => item.name), // Categories (unsur)
    datasets: [
      {
        label: "Jumlah Aset - Alami", // Dataset label for natural assets
        data: naturalAssetData.value.map((item) => item.count), // Asset counts per category
        backgroundColor: "#4DD427", // Bar color
        borderColor: "#4DD427",
        borderWidth: 1, // Border width
        borderRadius: 30,
      },
    ],
  };
};

const doughnutChartData = ref<any>({
  labels: ["Termanfaatkan", "Tidak Termanfaatkan"],
  datasets: [
    {
      label: "Status Pemanfaatan Aset",
      data: [
        assetUtilizationData.value?.utilizedPct,
        assetUtilizationData.value?.notUtilizedPct,
      ], // Asset utilization data
      backgroundColor: ["#84cc16", "#1f2937"], // Green for utilized, dark for not utilized
      borderColor: ["#84cc16", "#1f2937"],
      borderWidth: 1,
    },
  ],
});

const doughnutChartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top",
    },
  },
});

// Fetch the asset utilization data
const fetchAssetUtilization = async (kecamatanId: string) => {
  try {
    const res = await fetch(
      `/panel/analysis/kecamatan-assets-utilization/${kecamatanId}`
    );
    const response = await res.json();
    assetUtilizationData.value = response;

    // Update chart data with fetched utilization percentages
    prepareUtilizationChartData();
  } catch (error) {
    console.error("Error fetching asset utilization:", error);
  }
};

const featureStore = useFeature();
const closeAnalytic = () => {
  featureStore.setMapInfo("");
};

const analysisStore = useAnalysisResult();

const selectedKecamatan = computed(() => featureStore.selectedKecamatan);

// Define the structure for the selected analysis
const selected = ref<any>(null);

// Fetch the data from the backend API
const fetchKecamatanStats = async (id: string) => {
  try {
    const res = await fetch(`/panel/analysis/kecamatan-stats/${id}`); // Change this to your API path
    const response = await res.json();
    selected.value = {
      name: response.name, // You can also map this dynamically if it's part of the response
      updatedAt: "10:15", // You can map this from the API response if available
      date: "10/11/2025", // Same as above
      timeLabel: "12:39 WIB", // You can also get this dynamically if available
      areaKm2: response.areaKm2,
      totalAssets: response.totalAssets,
      builtAssets: response.builtAssets,
      naturalAssets: response.naturalAssets,
      utilizedPct: response.utilizedPct,
      notUtilizedPct: response.notUtilizedPct,
      categories: [
        { name: "Permukiman", count: 10 },
        { name: "Pendidikan", count: 5 },
        { name: "Pertanian", count: 3 },
        // You can map these categories dynamically based on your response
      ],
    };
  } catch (error) {
    console.error("Error fetching Kecamatan stats:", error);
  }
};

onMounted(async () => {
  await fetchKecamatanStats(selectedKecamatan.value.rowId);
  await fetchAssetDistribution(selectedKecamatan.value.rowId);
  await fetchAssetUtilization(selectedKecamatan.value.rowId);
  console.log("SELECTED", selected.value);
});

watch(builtAssetData, () => {
  prepareBuiltChartData();
});
watch(naturalAssetData, () => {
  prepareNaturalChartData();
});
watch(assetUtilizationData, () => {
  prepareUtilizationChartData();
});
</script>

<template>
  <div
    class="flex h-full flex-col rounded-2xl text-white border border-neutral-800 shadow-xl overflow-hidden"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-3 border-b border-neutral-800"
    >
      <h2 class="text-sm font-semibold tracking-wide text-neutral-200">
        Analysis Result
      </h2>
      <IcArrowLeft
        role="button"
        @click="closeAnalytic"
        :fontControlled="false"
        class="w-4 h-4 rotate-180 text-neutral-400 hover:text-white cursor-pointer transition-colors"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto px-3 pb-4 pt-3 space-y-3 text-xs">
      <!-- Top green card -->
      <div
        class="rounded-xl bg-gradient-to-br from-gray-900/70 to-[#41B922] p-[1px]"
      >
        <div
          class="rounded-[0.8rem] bg-gradient-to-br from-gray-900/70 to-[#41B922] px-3 py-3 space-y-3"
        >
          <!-- Time & date -->
          <div class="flex items-center justify-between gap-2">
            <div
              class="inline-flex items-center gap-1 rounded-full border border-lime-400/60 px-2 py-0.5 text-[0.65rem] font-medium"
            >
              <span
                class="inline-block h-1.5 w-1.5 rounded-full bg-lime-400"
              ></span>
              <span>{{ selected?.timeLabel ?? "12:39 WIB" }}</span>
            </div>
            <span class="text-[0.65rem] tracking-wider text-lime-100/80">
              {{ selected?.date ?? "10/11/2025" }}
            </span>
          </div>

          <!-- Location & area -->
          <div class="space-y-1">
            <p class="text-[0.75rem] text-lime-100/80">
              {{ selected?.name ?? "Kecamatan Wawolesea" }}
            </p>
            <div
              class="flex items-center gap-3 text-[0.65rem] text-lime-100/70"
            >
              <span class="font-medium">Luas</span>
              <span class="opacity-60">:</span>
              <span class="font-semibold">
                {{ parseFloat(selected?.areaKm2.toFixed(2)) }}
                KM2
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats: total / built / natural -->
      <div class="space-y-2">
        <!-- Total -->
        <div
          class="flex items-center justify-between rounded-xl bg-neutral-850/80 px-3 py-3 border border-neutral-800"
        >
          <div>
            <div class="text-2xl font-semibold leading-none">
              {{ selected?.totalAssets ?? 32 }}
            </div>
            <div class="mt-1 text-[0.7rem] text-neutral-400">Jumlah Aset</div>
            <div class="mt-0.5 text-[0.6rem] text-neutral-500">
              Last update {{ selected?.updatedAt ?? "10:15" }}
            </div>
          </div>
          <div
            class="flex h-10 w-10 items-center justify-center rounded-lg border border-lime-400/60 bg-lime-500/10"
          >
            <!-- simple 'building' icon placeholder -->
            <div class="grid grid-cols-2 gap-0.5 text-[0.25rem]">
              <span
                v-for="n in 4"
                :key="n"
                class="h-3 w-2 rounded-[2px] border border-lime-400/50"
              ></span>
            </div>
          </div>
        </div>

        <!-- Built / natural -->
        <div class="grid grid-cols-2 gap-2">
          <div
            class="rounded-xl bg-neutral-850/80 px-3 py-3 border border-neutral-800"
          >
            <div class="flex items-start justify-between gap-1">
              <div>
                <div class="text-xl font-semibold leading-none">
                  {{ selected?.builtAssets ?? 29 }}
                </div>
                <div class="mt-1 text-[0.7rem] text-neutral-400">
                  Aset Buatan
                </div>
              </div>
              <div
                class="h-7 w-7 rounded-lg border border-lime-400/50 bg-lime-500/10"
              ></div>
            </div>
            <div class="mt-1 text-[0.6rem] text-neutral-500">
              Last update {{ selected?.updatedAt ?? "10:15" }}
            </div>
          </div>

          <div
            class="rounded-xl bg-neutral-850/80 px-3 py-3 border border-neutral-800"
          >
            <div class="flex items-start justify-between gap-1">
              <div>
                <div class="text-xl font-semibold leading-none">
                  {{ selected?.naturalAssets ?? 3 }}
                </div>
                <div class="mt-1 text-[0.7rem] text-neutral-400">
                  Aset Alami
                </div>
              </div>
              <div
                class="h-7 w-7 rounded-lg border border-lime-400/50 bg-lime-500/10"
              ></div>
            </div>
            <div class="mt-1 text-[0.6rem] text-neutral-500">
              Last update {{ selected?.updatedAt ?? "10:15" }}
            </div>
          </div>
        </div>
      </div>

      <!-- Status Pemanfaatan -->
      <div
        class="rounded-xl bg-neutral-850/80 px-3 py-3 border border-neutral-800"
      >
        <div class="mb-2 text-[0.75rem] font-medium">Status Pemanfaatan</div>
        <div class="flex items-center gap-3">
          <!-- Donut chart -->
          <div class="relative h-20 w-20 shrink-0">
            <div
              class="absolute inset-0 rounded-full"
              :style="{
                background: `conic-gradient(#84cc16 ${
                  selected?.utilizedPct ?? 90
                }%, #1f2937 0)`, // Dynamically set the chart colors and data
              }"
            ></div>
            <div
              class="absolute inset-2 rounded-full bg-neutral-900 flex flex-col items-center justify-center"
            >
              <span class="text-[0.6rem] text-neutral-400">Jumlah Aset</span>
              <span class="text-base font-semibold">
                {{ selected?.totalAssets ?? 32 }}
              </span>
            </div>
          </div>

          <!-- Chart Component -->
          <div class="flex-1 space-y-2 text-[0.7rem]">
            <DoughnutChart
              :data="doughnutChartData"
              :options="doughnutChartOptions"
            />
          </div>

          <div class="flex-1 space-y-2 text-[0.7rem]">
            <div class="flex flex-col items-center justify-between gap-2">
              <span class="flex items-center gap-1">
                <span class="inline-block h-2 w-2 rounded-full bg-lime-400" />
                Termanfaatkan
              </span>
              <span class="font-semibold">
                {{ assetUtilizationData?.utilizedPct }} %
              </span>
            </div>
            <div class="flex flex-col items-center justify-between gap-2">
              <span class="flex items-center gap-1">
                <span
                  class="inline-block h-2 w-2 rounded-full bg-neutral-600"
                />
                Tidak Termanfaatkan
              </span>
              <span class="font-semibold">
                {{ assetUtilizationData?.notUtilizedPct }} %
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Distribusi Aset Toponomi - Buatan -->
      <div
        class="rounded-xl bg-neutral-850/80 px-3 py-3 border border-neutral-800"
      >
        <div class="mb-2 text-[0.75rem] font-medium">
          Distribusi Aset Toponomi - Buatan
        </div>

        <!-- Bar chart -->
        <div class="mt-4 h-40">
          <Bar
            :data="builtChartData || defaultChartData"
            :options="chartOptions"
          />
        </div>
      </div>
      <!-- Distribusi Aset Toponomi - Alami -->
      <div
        class="rounded-xl bg-neutral-850/80 px-3 py-3 border border-neutral-800"
      >
        <div class="mb-2 text-[0.75rem] font-medium">
          Distribusi Aset Toponomi - Alami
        </div>

        <!-- Bar chart -->
        <div class="mt-4 h-40">
          <Bar
            :data="naturalChartData || defaultChartData"
            :options="chartOptions"
          />
        </div>
      </div>

      <!-- Optional: detail list using existing MapAnalysisItem -->
      <div
        v-if="analysisStore.results.length > 1"
        class="rounded-xl bg-neutral-850/80 px-3 py-3 border border-neutral-800"
      >
        <div class="mb-2 text-[0.75rem] font-medium">Daftar Aset</div>
        <div class="space-y-2 max-h-40 overflow-y-auto pr-1">
          <MapAnalysisItem
            v-for="(result, idx) in analysisStore.results"
            :key="idx"
            :result="result"
          />
        </div>
      </div>
    </div>
  </div>
</template>
