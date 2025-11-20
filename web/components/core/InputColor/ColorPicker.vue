<script setup lang="ts">
import {
  parseColor,
  hsvToRgb,
  rgbToHex,
  getSaturationCoordinates,
  getHueCoordinates,
  clamp,
} from "~/utils/colorPicker";
import IcEyeDropper from "~/assets/icons/ic-eye-dropper.svg";
import IcArrowSquare from "~/assets/icons/ic-arrow-square.svg";

const props = defineProps<{
  color: string;
  updateColor: (color: string) => void;
}>();

const isSaturationMouseDown = ref(false);

const selectedColor = ref(props.color);
const parsedColor = computed(() => parseColor(selectedColor.value));
const satCoords = computed(() => getSaturationCoordinates(parsedColor.value));
const hueCoords = computed(() => getHueCoordinates(parsedColor.value));

const onSaturationChange = (event: MouseEvent) => {
  const { width, height, left, top } = (
    event.target as HTMLInputElement
  ).getBoundingClientRect();
  const x = clamp(event.clientX - left, 0, width);
  const y = clamp(event.clientY - top, 0, height);

  const s = (x / width) * 100;
  const v = 100 - (y / height) * 100;

  const rgb = hsvToRgb({ h: parsedColor.value?.hsv.h, s, v });
  selectedColor.value = rgbToHex(rgb);
  props.updateColor(selectedColor.value);
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
        props.updateColor(selectedColor.value);
      })
      .catch((e: ErrorEvent) => {
        console.error(e);
      });
  }
};

const inputMode = ref(0);
const handleChangeInputMode = () => {
  if (inputMode.value === 2) {
    inputMode.value = 0;
  } else {
    inputMode.value++;
  }
};

const handleRgbChange = (component: "r" | "g" | "b", value: number) => {
  if (value) {
    const { r, g, b } = parsedColor.value.rgb;

    switch (component) {
      case "r":
        selectedColor.value = rgbToHex({ r: value ?? 0, g, b });
        props.updateColor(selectedColor.value);
        return;
      case "g":
        selectedColor.value = rgbToHex({ r, g: value ?? 0, b });
        props.updateColor(selectedColor.value);
        return;
      case "b":
        selectedColor.value = rgbToHex({ r, g, b: value ?? 0 });
        props.updateColor(selectedColor.value);
        return;
      default:
        return;
    }
  }
};

const handleHsvChange = (component: "h" | "s" | "v", value: number) => {
  if (value) {
    const { h, s, v } = parsedColor.value.hsv;

    switch (component) {
      case "h":
        selectedColor.value = rgbToHex(hsvToRgb({ h: value ?? 0, s, v }));
        props.updateColor(selectedColor.value);
        return;
      case "s":
        selectedColor.value = rgbToHex(hsvToRgb({ h: value ?? 0, s, v }));
        props.updateColor(selectedColor.value);
        return;
      case "v":
        selectedColor.value = rgbToHex(hsvToRgb({ h: value ?? 0, s, v }));
        props.updateColor(selectedColor.value);
        return;
      default:
        return;
    }
  }
};

const thumbSlide = (e: MouseEvent) => {
  e.preventDefault();

  let shiftX =
    e.clientX - document.getElementById("thumb")?.getBoundingClientRect().left!;

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);

  function onMouseMove(event: MouseEvent) {
    let newLeft =
      event.clientX -
      shiftX -
      document.getElementById("slider")?.getBoundingClientRect().left!;
    let rightEdge =
      document.getElementById("slider")?.offsetWidth! -
      document.getElementById("thumb")?.offsetWidth!;

    // the pointer is out of slider => lock the thumb within the bounaries
    if (newLeft < 0) {
      newLeft = 0;
    } else if (newLeft > rightEdge) {
      newLeft = rightEdge;
    }

    // document.getElementById("thumb")!.style.left = newLeft + "px";

    const x = clamp(newLeft, 0, rightEdge);

    const h = Math.round((x / rightEdge) * 360);

    if (h !== 360) {
      const hsv = {
        h,
        s: parsedColor.value?.hsv.s,
        v: parsedColor.value?.hsv.v,
      };
      const rgb = hsvToRgb(hsv);
      selectedColor.value = rgbToHex(rgb);
      props.updateColor(selectedColor.value);
    }
  }

  function onMouseUp() {
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("mousemove", onMouseMove);
  }
};
</script>

<template>
  <div class="w-72 grid gap-3 p-1">
    <div class="relative">
      <div
        class="relative w-full h-36 rounded-sm"
        :style="{
          backgroundImage: `linear-gradient(transparent, black), linear-gradient(to right, white, transparent)`,
          backgroundColor: `hsl(${parsedColor.hsv.h}, 100%, 50%) `,
        }"
      >
        <div
          class="absolute w-4 h-4 -translate-x-2 -translate-y-2 border-2 border-white rounded-full"
          :style="{
            backgroundColor: parsedColor.hex,
            left: (satCoords?.[0] ?? 0) + '%',
            top: (satCoords?.[1] ?? 0) + '%',
          }"
        />
      </div>
      <div
        @mousedown="
          (e : MouseEvent) => {
            isSaturationMouseDown = true;
            onSaturationChange(e);
          }
        "
        @mousemove="
          (e: MouseEvent) => {
            if (isSaturationMouseDown) {
              onSaturationChange(e);
            }
          }
        "
        @mouseup="
          (e: MouseEvent) => {
            isSaturationMouseDown = false;
            onSaturationChange(e);
          }
        "
        class="w-full h-full absolute top-0 left-0"
      />
    </div>
    <div class="grid gap-2">
      <p class="text-grey-700 text-2xs">Color</p>
      <div class="flex items-center gap-2">
        <div class="relative w-full">
          <div
            id="slider"
            class="relative rounded-full w-full h-1"
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
          >
            <div
              @mousedown="
                (event:MouseEvent) => {
                  thumbSlide(event)
           
                }
              "
              @dragstart="
                () => {
                  return false;
                }
              "
              id="thumb"
              class="absolute w-3 h-3 -translate-y-[4px] rounded-full bg-grey-400"
              :style="{
                left: (hueCoords ?? 0) + '%',
              }"
            />
          </div>
          <!-- <div
            @mousedown="
              (e) => {
                thumbSlide(e);
              }
            "
            class="w-full h-full absolute top-0 left-0"
          ></div> -->
        </div>
        <button
          class="flex gap-2 items-center bg-grey-200 p-2 border rounded-sm border-grey-600"
          @click="handleEyedropper"
        >
          <div
            class="w-8 h-3 rounded-sm"
            :style="{
              backgroundColor: parsedColor.hex,
            }"
          />
          <IcEyeDropper :fontControlled="false" class="w-4 h-4 text-grey-700" />
        </button>
      </div>
    </div>
    <div class="grid grid-cols-4 gap-2">
      <UInput
        v-if="inputMode === 2"
        v-model="parsedColor.hex"
        color="gray"
        placeholder="Filter"
        @input="
          (e:Event) => {
            selectedColor = (e.target as HTMLInputElement).value;
            updateColor(selectedColor);
          }
        "
        class="col-span-3 rounded-xl"
      >
      </UInput>
      <template v-else-if="inputMode === 0">
        <UInput
          v-model="parsedColor.rgb.r"
          color="gray"
          placeholder="Filter"
          @blur="
            (e:Event) => {
              handleRgbChange('r',parseFloat((e.target as HTMLInputElement).value))
            }
          "
          :maxlength="3"
        >
        </UInput>
        <UInput
          v-model="parsedColor.rgb.g"
          color="gray"
          placeholder="Filter"
          @blur="
            (e:Event) => {
              handleRgbChange('g',parseFloat((e.target as HTMLInputElement).value))
            }
          "
          :maxlength="3"
        >
        </UInput>
        <UInput
          v-model="parsedColor.rgb.b"
          color="gray"
          placeholder="Filter"
          @blur="
            (e:Event) => {
              handleRgbChange('b',parseFloat((e.target as HTMLInputElement).value))
            }
          "
          :maxlength="3"
        >
        </UInput>
      </template>
      <template v-else-if="inputMode === 1">
        <UInput
          v-model="parsedColor.hsv.h"
          color="gray"
          placeholder="Filter"
          @input="
            (e:Event) => {
              handleHsvChange('h',parseFloat((e.target as HTMLInputElement).value))
            }
          "
          :maxlength="3"
        >
        </UInput>
        <UInput
          v-model="parsedColor.hsv.s"
          color="gray"
          placeholder="Filter"
          @input="
            (e:Event) => {
              handleHsvChange('s',parseFloat((e.target as HTMLInputElement).value))
            }
          "
          :maxlength="3"
        >
        </UInput>
        <UInput
          v-model="parsedColor.hsv.v"
          color="gray"
          placeholder="Filter"
          @input="
            (e:Event) => {
              handleHsvChange('v',parseInt((e.target as HTMLInputElement).value))
            }
          "
          :maxlength="3"
        >
        </UInput>
      </template>
      <UButton
        @click="handleChangeInputMode"
        size="xs"
        color="gray"
        variant="solid"
        class="bg-grey-200 justify-between"
        :label="inputMode === 0 ? 'RGB' : inputMode === 1 ? 'HSV' : 'HEX'"
      >
        <template #trailing>
          <IcArrowSquare
            :fontControlled="false"
            class="w-4 h-4 rotate-180 text-grey-900"
        /></template>
      </UButton>
    </div>
  </div>
</template>
