type LivePreviewOverrides = {
  vars?: Record<string, string>;
  backgroundColor?: string;
  textColor?: string;
  overlayColor?: string | null;
};

type PreviewBaseline = {
  backgroundColor: string;
  textColor: string;
  overlayColor: string;
};

let previewRoot: HTMLElement | null = null;
let rafId: number | null = null;
let timeoutId: number | null = null;
let activeCount = 0;
let baseline: PreviewBaseline | null = null;
const activeVars = new Set<string>();
const pendingVars = new Map<string, string>();
let pendingBackground: string | undefined;
let pendingText: string | undefined;
let pendingOverlay: string | null | undefined;
let lastApplyTime = 0;
const MIN_APPLY_INTERVAL = 1000 / 30;

const getOverlayNode = (root: HTMLElement | null) =>
  root?.querySelector<HTMLElement>(".ps-player__overlay") ?? null;

const setLiveScrubAttr = (root: HTMLElement | null, enabled: boolean) => {
  if (!root) return;
  if (enabled) {
    root.setAttribute("data-live-scrub", "true");
  } else {
    root.removeAttribute("data-live-scrub");
  }
};

const applyPending = () => {
  const root = previewRoot;
  rafId = null;
  lastApplyTime = performance.now();
  if (!root) {
    pendingVars.clear();
    pendingBackground = undefined;
    pendingText = undefined;
    pendingOverlay = undefined;
    return;
  }
  if (pendingBackground !== undefined) {
    root.style.backgroundColor = pendingBackground;
    pendingBackground = undefined;
  }
  if (pendingText !== undefined) {
    root.style.color = pendingText;
    pendingText = undefined;
  }
  if (pendingVars.size) {
    for (const [key, value] of pendingVars) {
      root.style.setProperty(key, value);
    }
    pendingVars.clear();
  }
  if (pendingOverlay !== undefined) {
    const overlay = getOverlayNode(root);
    if (overlay) {
      overlay.style.background = pendingOverlay ?? "";
    }
    pendingOverlay = undefined;
  }
};

const scheduleApply = () => {
  if (rafId !== null || timeoutId !== null) return;
  const elapsed = performance.now() - lastApplyTime;
  if (elapsed >= MIN_APPLY_INTERVAL) {
    rafId = requestAnimationFrame(applyPending);
    return;
  }
  timeoutId = window.setTimeout(() => {
    timeoutId = null;
    if (rafId !== null) return;
    rafId = requestAnimationFrame(applyPending);
  }, MIN_APPLY_INTERVAL - elapsed);
};

export const setPreviewRoot = (root: HTMLElement | null) => {
  const previousRoot = previewRoot;
  if (previousRoot && previousRoot !== root) {
    setLiveScrubAttr(previousRoot, false);
  }
  previewRoot = root;
  if (previewRoot && activeCount > 0) {
    setLiveScrubAttr(previewRoot, true);
    if (!baseline || previousRoot !== previewRoot) {
      baseline = {
        backgroundColor: previewRoot.style.backgroundColor ?? "",
        textColor: previewRoot.style.color ?? "",
        overlayColor: getOverlayNode(previewRoot)?.style.background ?? "",
      };
    }
  }
};

export const beginPreviewOverride = () => {
  if (!previewRoot) return;
  activeCount += 1;
  if (activeCount > 1) return;
  setLiveScrubAttr(previewRoot, true);
  const overlay = getOverlayNode(previewRoot);
  baseline = {
    backgroundColor: previewRoot.style.backgroundColor ?? "",
    textColor: previewRoot.style.color ?? "",
    overlayColor: overlay?.style.background ?? "",
  };
};

export const applyPreviewOverrides = (overrides: LivePreviewOverrides) => {
  if (!previewRoot) return;
  if (overrides.vars) {
    Object.entries(overrides.vars).forEach(([key, value]) => {
      activeVars.add(key);
      pendingVars.set(key, value);
    });
  }
  if (overrides.backgroundColor !== undefined) {
    pendingBackground = overrides.backgroundColor;
  }
  if (overrides.textColor !== undefined) {
    pendingText = overrides.textColor;
  }
  if (overrides.overlayColor !== undefined) {
    pendingOverlay = overrides.overlayColor;
  }
  scheduleApply();
};

export const endPreviewOverride = ({ restore = true } = {}) => {
  if (activeCount === 0) return;
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount > 0) return;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  pendingVars.clear();
  pendingBackground = undefined;
  pendingText = undefined;
  pendingOverlay = undefined;
  if (!previewRoot) {
    activeVars.clear();
    baseline = null;
    return;
  }
  setLiveScrubAttr(previewRoot, false);
  if (restore && baseline) {
    previewRoot.style.backgroundColor = baseline.backgroundColor;
    previewRoot.style.color = baseline.textColor;
    const overlay = getOverlayNode(previewRoot);
    if (overlay) {
      overlay.style.background = baseline.overlayColor;
    }
  }
  activeVars.forEach((key) => previewRoot?.style.removeProperty(key));
  activeVars.clear();
  baseline = null;
};
