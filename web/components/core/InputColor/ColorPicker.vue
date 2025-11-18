<script setup lang="ts">
import {
  parseColor,
  hsvToRgb,
  rgbToHex,
  getSaturationCoordinates,
  getHueCoordinates,
  clamp,
} from "~/utils/colorPicker";
import IcCross from "~/assets/icons/ic-cross.svg";
import IcEyeDropper from "~/assets/icons/ic-eye-dropper.svg";
import IcArrowReg from "~/assets/icons/ic-arrow-reg.svg";

const props = defineProps<{
  color: string;
  updateColor: (color: string) => void;
}>();

const emit = defineEmits(["close"]);

const isSaturationMouseDown = ref(false);
const isHueMouseDown = ref(false);
const isOpacityMouseDown = ref(false);

const selectedColor = ref(props.color);

// Maintain HSV state to avoid precision loss in conversions
const initialParsed = parseColor(props.color);
const hsvState = ref<ColorHSV>({ ...initialParsed.hsv });

const parsedColor = computed(() => {
  const parsed = parseColor(selectedColor.value);
  // Update HSV state when color changes externally
  if (selectedColor.value !== rgbToHex(hsvToRgb(hsvState.value))) {
    hsvState.value = { ...parsed.hsv };
  }
  return {
    hex: selectedColor.value,
    rgb: parsed.rgb,
    hsv: hsvState.value,
  };
});

const satCoords = computed(() => {
  const { s, v } = hsvState.value;
  return [s, 100 - v] as [number, number];
});

const hueCoords = computed(() => {
  const { h } = hsvState.value;
  return (h / 360) * 100;
});

// Recently used colors (stored in localStorage)
const recentColors = ref<string[]>([
  "#ffc1a3",
  "#fcae39",
  "#00000014",
  "#232221",
  "#cd1b1b",
  "#a63626",
  "#353332",
  "#ffffff",
  "#8a8a8a",
  "#3b5c3f",
]);

const saturationAreaRef = ref<HTMLElement | null>(null);

const onSaturationChange = (event: MouseEvent) => {
  if (!saturationAreaRef.value) return;

  const { width, height, left, top } =
    saturationAreaRef.value.getBoundingClientRect();

  const x = clamp(event.clientX - left, 0, width);
  const y = clamp(event.clientY - top, 0, height);

  const s = (x / width) * 100;
  const v = 100 - (y / height) * 100;

  // Update HSV state directly to preserve hue
  hsvState.value = { h: hsvState.value.h, s, v };

  const rgb = hsvToRgb(hsvState.value);
  selectedColor.value = rgbToHex(rgb);
  props.updateColor(selectedColor.value);
};

const startSaturationDrag = (event: MouseEvent) => {
  isSaturationMouseDown.value = true;
  onSaturationChange(event);

  const handleMouseMove = (e: MouseEvent) => {
    if (isSaturationMouseDown.value) {
      onSaturationChange(e);
    }
  };

  const handleMouseUp = () => {
    isSaturationMouseDown.value = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
};

const hueSliderRef = ref<HTMLElement | null>(null);

const onHueChange = (event: MouseEvent) => {
  if (!hueSliderRef.value) return;

  const { width, left } = hueSliderRef.value.getBoundingClientRect();
  const x = clamp(event.clientX - left, 0, width);

  const h = (x / width) * 360;

  // Update HSV state directly
  hsvState.value = { h, s: hsvState.value.s, v: hsvState.value.v };

  const rgb = hsvToRgb(hsvState.value);
  selectedColor.value = rgbToHex(rgb);
  props.updateColor(selectedColor.value);
};

const startHueDrag = (event: MouseEvent) => {
  isHueMouseDown.value = true;
  onHueChange(event);

  const handleMouseMove = (e: MouseEvent) => {
    if (isHueMouseDown.value) {
      onHueChange(e);
    }
  };

  const handleMouseUp = () => {
    isHueMouseDown.value = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
};

const valueSliderRef = ref<HTMLElement | null>(null);

const onValueChange = (event: MouseEvent) => {
  if (!valueSliderRef.value) return;

  const { width, left } = valueSliderRef.value.getBoundingClientRect();
  const x = clamp(event.clientX - left, 0, width);

  const v = (x / width) * 100;

  // Update HSV state with new value
  hsvState.value = { h: hsvState.value.h, s: hsvState.value.s, v };

  const rgb = hsvToRgb(hsvState.value);
  selectedColor.value = rgbToHex(rgb);
  props.updateColor(selectedColor.value);
};

const startValueDrag = (event: MouseEvent) => {
  isOpacityMouseDown.value = true;
  onValueChange(event);

  const handleMouseMove = (e: MouseEvent) => {
    if (isOpacityMouseDown.value) {
      onValueChange(e);
    }
  };

  const handleMouseUp = () => {
    isOpacityMouseDown.value = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
};

const handleEyedropper = () => {
  if (!window.EyeDropper) {
    console.log("browser not supported");
  } else {
    const eyeDropper = new window.EyeDropper();
    eyeDropper
      .open()
      .then((result: { sRGBHex: string }) => {
        const color = result.sRGBHex;
        selectedColor.value = color;
        const parsed = parseColor(color);
        hsvState.value = parsed.hsv;
        props.updateColor(selectedColor.value);
        addToRecentColors(color);
      })
      .catch((e: ErrorEvent) => {
        console.error(e);
      });
  }
};

const inputMode = ref("RGB");
const handleChangeInputMode = () => {
  if (inputMode.value === "RGB") {
    inputMode.value = "HSV";
  } else if (inputMode.value === "HSV") {
    inputMode.value = "HEX";
  } else {
    inputMode.value = "RGB";
  }
};

const handleRgbChange = (component: "r" | "g" | "b", value: number) => {
  if (value !== undefined && value !== null) {
    const { r, g, b } = parsedColor.value.rgb;

    let newRgb: ColorRGB;
    switch (component) {
      case "r":
        newRgb = { r: value ?? 0, g, b };
        break;
      case "g":
        newRgb = { r, g: value ?? 0, b };
        break;
      case "b":
        newRgb = { r, g, b: value ?? 0 };
        break;
      default:
        return;
    }

    selectedColor.value = rgbToHex(newRgb);
    hsvState.value = rgbToHsv(newRgb);
    props.updateColor(selectedColor.value);
  }
};

const handleHsvChange = (component: "h" | "s" | "v", value: number) => {
  if (value !== undefined && value !== null) {
    const { h, s, v } = hsvState.value;

    switch (component) {
      case "h":
        hsvState.value = { h: value ?? 0, s, v };
        break;
      case "s":
        hsvState.value = { h, s: value ?? 0, v };
        break;
      case "v":
        hsvState.value = { h, s, v: value ?? 0 };
        break;
      default:
        return;
    }

    selectedColor.value = rgbToHex(hsvToRgb(hsvState.value));
    props.updateColor(selectedColor.value);
  }
};

const addToRecentColors = (color: string) => {
  if (!recentColors.value.includes(color)) {
    recentColors.value = [color, ...recentColors.value.slice(0, 9)];
  }
};

const selectRecentColor = (color: string) => {
  selectedColor.value = color;
  const parsed = parseColor(color);
  hsvState.value = parsed.hsv;
  props.updateColor(color);
};
</script>

<template>
  <div class="space-y-2">
    <!-- Header -->
    <div
      class="flex gap-3 items-center pb-2 justify-center border-b border-grey-700"
    >
      <p class="flex-1 text-grey-50 text-xs font-medium leading-[18px]">
        Color Picker
      </p>
      <button @click="emit('close')">
        <IcCross class="size-3 text-grey-400" />
      </button>
    </div>

    <!-- Color Selection Area -->
    <div class="relative w-[200px] h-[180px] rounded overflow-clip">
      <div
        class="w-full h-full"
        :style="{
          backgroundImage: `linear-gradient(transparent, black), linear-gradient(to right, white, transparent)`,
          backgroundColor: `hsl(${parsedColor.hsv.h}, 100%, 50%)`,
        }"
      />
      <div
        ref="saturationAreaRef"
        @mousedown="startSaturationDrag"
        class="w-full h-full absolute top-0 left-0 cursor-crosshair"
      >
        <div
          class="absolute w-[14px] h-[14px] -translate-x-1/2 -translate-y-1/2 border-2 border-white rounded-full pointer-events-none"
          :style="{
            backgroundColor: parsedColor.hex,
            left: (satCoords?.[0] ?? 0) + '%',
            top: (satCoords?.[1] ?? 0) + '%',
          }"
        />
      </div>
    </div>

    <!-- Sliders -->
    <div class="flex gap-1 items-center w-full">
      <div class="flex flex-col gap-2 w-full px-1">
        <!-- Hue Slider -->
        <div class="relative w-full h-2">
          <div
            class="w-full h-2 rounded"
            :style="{
              backgroundImage: `linear-gradient(
                to right,
                #ff0000,
                #ffff00,
                #00ff00,
                #00ffff,
                #0000ff,
                #ff00ff,
                #ff0000
              )`,
            }"
          />
          <div
            ref="hueSliderRef"
            @mousedown="startHueDrag"
            class="w-full h-full absolute top-0 left-0 cursor-pointer"
          >
            <div
              id="hue-slider-thumb"
              class="absolute size-[10px] top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-grey-400 pointer-events-none"
              :style="{
                left: (hueCoords ?? 0) + '%',
              }"
            />
          </div>
        </div>

        <!-- Value Slider -->
        <div class="relative w-full h-2">
          <div
            class="w-full h-2 rounded"
            :style="{
              backgroundImage: `linear-gradient(to right, black, hsl(${hsvState.h}, ${hsvState.s}%, 50%))`,
            }"
          />
          <div
            ref="valueSliderRef"
            @mousedown="startValueDrag"
            class="w-full h-full absolute top-0 left-0 cursor-pointer"
          >
            <div
              id="value-slider-thumb"
              class="absolute size-[10px] top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-grey-400 pointer-events-none"
              :style="{
                left: hsvState.v + '%',
              }"
            />
          </div>
        </div>
      </div>

      <!-- Eyedropper Button -->
      <button
        @click="handleEyedropper"
        class="bg-grey-700 border border-grey-600 rounded p-2 h-[26px] flex items-center gap-2"
      >
        <IcEyeDropper class="w-4 h-4 text-grey-400" />
      </button>
    </div>

    <!-- RGB/HSV/HEX Inputs -->
    <div class="flex gap-1 items-center w-full">
      <template v-if="inputMode === 'RGB'">
        <UInput
          :model-value="parsedColor.rgb.r"
          @blur="
            (e: Event) => {
              handleRgbChange('r', parseFloat((e.target as HTMLInputElement).value));
            }
          "
          type="number"
          color="gray"
          size="xs"
          class="w-10"
          :ui="{ base: 'h-7' }"
          :maxlength="3"
        />
        <UInput
          :model-value="parsedColor.rgb.g"
          @blur="
            (e: Event) => {
              handleRgbChange('g', parseFloat((e.target as HTMLInputElement).value));
            }
          "
          type="number"
          color="gray"
          size="xs"
          class="w-10"
          :ui="{ base: 'h-7' }"
          :maxlength="3"
        />
        <UInput
          :model-value="parsedColor.rgb.b"
          @blur="
            (e: Event) => {
              handleRgbChange('b', parseFloat((e.target as HTMLInputElement).value));
            }
          "
          type="number"
          color="gray"
          size="xs"
          class="w-10"
          :ui="{ base: 'h-7' }"
          :maxlength="3"
        />
      </template>
      <template v-else-if="inputMode === 'HSV'">
        <UInput
          :model-value="Math.round(parsedColor.hsv.h)"
          @blur="
            (e: Event) => {
              handleHsvChange('h', parseFloat((e.target as HTMLInputElement).value));
            }
          "
          type="number"
          color="gray"
          size="xs"
          class="w-10"
          :ui="{ base: 'h-7' }"
          :maxlength="3"
        />
        <UInput
          :model-value="Math.round(parsedColor.hsv.s)"
          @blur="
            (e: Event) => {
              handleHsvChange('s', parseFloat((e.target as HTMLInputElement).value));
            }
          "
          type="number"
          color="gray"
          size="xs"
          class="w-10"
          :ui="{ base: 'h-7' }"
          :maxlength="3"
        />
        <UInput
          :model-value="Math.round(parsedColor.hsv.v)"
          @blur="
            (e: Event) => {
              handleHsvChange('v', parseFloat((e.target as HTMLInputElement).value));
            }
          "
          type="number"
          color="gray"
          size="xs"
          class="w-10"
          :ui="{ base: 'h-7' }"
          :maxlength="3"
        />
      </template>
      <template v-else>
        <UInput
          v-model="selectedColor"
          @input="
            (e: Event) => {
              selectedColor = (e.target as HTMLInputElement).value;
              updateColor(selectedColor);
            }
          "
          color="gray"
          size="xs"
          class="w-10"
          :ui="{ base: 'h-7' }"
        />
      </template>

      <!-- Mode Switcher Button -->
      <button
        @click="handleChangeInputMode"
        class="flex-1 bg-grey-700 border border-grey-600 rounded px-2 py-1 h-7 flex items-center justify-between text-grey-200 text-xs leading-[18px]"
      >
        <span>{{ inputMode }}</span>
        <IcArrowReg class="w-4 h-4 rotate-180" />
      </button>
    </div>

    <!-- Divider -->
    <div class="w-full h-0 border-b border-grey-700" />

    <!-- Recently Used Palette -->
    <div class="flex flex-col gap-2">
      <p class="text-grey-400 text-2xs font-normal leading-4">
        Recently Used Palette
      </p>
      <div class="flex items-center justify-between w-full">
        <button
          v-for="(color, index) in recentColors"
          :key="index"
          @click="selectRecentColor(color)"
          class="w-4 h-4 rounded border border-white/45 cursor-pointer hover:scale-110 transition-transform"
          :style="{ backgroundColor: color }"
        />
      </div>
    </div>
  </div>
</template>
