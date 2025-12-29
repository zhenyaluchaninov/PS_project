import { cn } from "@/lib/utils";

export const navigationStyleOptions = [
  { value: "default", label: "Default" },
  { value: "swipe", label: "Swipe" },
  { value: "swipeWithButton", label: "Swipe with button" },
  { value: "leftright", label: "Left/right" },
  { value: "right", label: "Right" },
  { value: "noButtons", label: "No buttons" },
];

export const navigationStyleValues = new Set(
  navigationStyleOptions.map((option) => option.value)
);

export const textShadowOptions = [
  { value: "", label: "None" },
  { value: "text-shadow-black", label: "Black" },
  { value: "text-shadow-white", label: "White" },
];

export const textShadowValues = new Set(
  textShadowOptions.map((option) => option.value)
);

export const animationModeOptions = [
  { value: "", label: "None" },
  { value: "fading-faster", label: "Fast" },
  { value: "fading-paragraphs", label: "Normal" },
  { value: "fading-slower", label: "Slow" },
  { value: "fading-slowerer", label: "Slower" },
  { value: "fading-slowest", label: "Slowest" },
];

export const animationModeValues = new Set(
  animationModeOptions.map((option) => option.value)
);

export const builtInFontOptions: Array<{ value: string; label: string }> = [];

export const NAV_TEXT_SIZE_MIN = 8;
export const NAV_TEXT_SIZE_MAX = 30;
export const NAV_TEXT_SIZE_DEFAULT = 14;

export const verticalPositionOptions = [
  { value: "vertical-align-top", label: "Top" },
  { value: "vertical-align-center", label: "Center" },
  { value: "vertical-align-bottom", label: "Bottom" },
];

export const verticalPositionValues = new Set(
  verticalPositionOptions.map((option) => option.value)
);

export const SCROLL_SPEED_MIN = 0;
export const SCROLL_SPEED_MAX = 1.5;
export const SCROLL_SPEED_DEFAULT = 0.5;
export const BLUR_MIN = 0;
export const BLUR_MAX = 100;
export const ANIMATION_DELAY_DEFAULT = 0;
export const NAVIGATION_DELAY_DEFAULT = 0;
export const BACKGROUND_FADE_DEFAULT = 1;
export const MARGIN_DEFAULT = 0;
export const MARGIN_MIN = 0;
export const MARGIN_MAX = 100;
export const AUDIO_VOLUME_MIN = 0;
export const AUDIO_VOLUME_MAX = 100;
export const CONDITIONS_COLOR_DEFAULT = "#000000";
export const CONDITIONS_ALPHA_DEFAULT = 40;

export const fadeOptions = [
  { value: "", label: "Default" },
  { value: "0.0", label: "0.0s" },
  { value: "1.0", label: "1.0s" },
  { value: "2.0", label: "2.0s" },
  { value: "4.0", label: "4.0s" },
];

export const fadeOptionValues = new Set(
  fadeOptions.map((option) => option.value)
);

export const extraAudioOptions = [
  { value: "", label: "Play always" },
  { value: "play_once", label: "Play once" },
];

export const extraAudioValues = new Set(
  extraAudioOptions.map((option) => option.value)
);

export const videoAudioOptions = [
  { value: "", label: "On" },
  { value: "off", label: "Off" },
  { value: "off_mobile", label: "Off on mobile" },
];

export const videoAudioValues = new Set(
  videoAudioOptions.map((option) => option.value)
);

export const SCENE_COLOR_DEFAULTS = {
  color_background: "#ffffff",
  color_foreground: "#000000",
  alpha_foreground: 0,
  color_text: "#ffffff",
  alpha_text: 100,
  color_textbackground: "#000000",
  alpha_textbackground: 40,
  color_buttontext: "#ffffff",
  alpha_buttontext: 100,
  color_buttonbackground: "#000000",
  alpha_buttonbackground: 40,
};

export const rangeInputClasses = cn(
  "h-1 w-full cursor-pointer appearance-none bg-transparent",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]",
  "[&::-webkit-slider-thumb]:appearance-none",
  "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3",
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)]",
  "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[var(--border)]",
  "[&::-webkit-slider-thumb]:mt-[-0.25rem]",
  "[&::-webkit-slider-runnable-track]:h-1",
  "[&::-webkit-slider-runnable-track]:rounded-full",
  "[&::-webkit-slider-runnable-track]:bg-[var(--border)]",
  "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3",
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--accent)]",
  "[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[var(--border)]",
  "[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full",
  "[&::-moz-range-track]:bg-[var(--border)]"
);
