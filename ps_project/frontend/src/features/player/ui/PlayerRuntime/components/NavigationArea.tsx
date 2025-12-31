import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  NavPlacement,
  NavStyle,
} from "@/features/player/utils/navigationUtils";
import { cn } from "@/lib/utils";
import type { NavigationButton } from "../navigation/types";

const addPressedClass = (event: ReactPointerEvent<HTMLElement>) => {
  event.currentTarget.classList.add("btn-pressed");
};

const removePressedClass = (event: ReactPointerEvent<HTMLElement>) => {
  event.currentTarget.classList.remove("btn-pressed");
};

export function NavigationArea({
  navStyle,
  navPlacement,
  swipeMode,
  buttons,
  primaryLinkId,
  showLeftArrow,
  showRightArrow,
  showDownArrow,
  interactionDisabled,
  onChooseLink,
  onBack,
  disableBack,
}: {
  navStyle: NavStyle;
  navPlacement: NavPlacement;
  swipeMode: boolean;
  buttons: NavigationButton[];
  primaryLinkId?: number;
  showLeftArrow: boolean;
  showRightArrow: boolean;
  showDownArrow: boolean;
  interactionDisabled?: boolean;
  onChooseLink: (linkId: number) => void;
  onBack: () => void;
  disableBack: boolean;
}) {
  const hasButtons = buttons.length > 0;
  const hasArrows = showLeftArrow || showRightArrow || showDownArrow;
  const shouldShowEmptyState = !hasButtons && navStyle !== "noButtons";
  const interactionsOff = Boolean(interactionDisabled);

  if (navStyle === "swipe") {
    return null;
  }

  if (navStyle === "swipeWithButton") {
    const primaryButton =
      buttons.find((button) => button.linkId === primaryLinkId) ??
      buttons.find((button) => Boolean(button.linkId)) ??
      null;

    if (!primaryButton) {
      return null;
    }

    const isDisabled = interactionsOff || Boolean(primaryButton.disabled);

    return (
      <div
        className="ps-nav"
        data-nav-style={navStyle}
        data-nav-placement={navPlacement}
        data-swipe-mode={swipeMode ? navStyle : undefined}
      >
        <div className="ps-nav__bar ps-nav__bar--center">
          <button
            type="button"
            className={cn(
              "ps-player__choice ps-nav__choice",
              isDisabled ? "cursor-not-allowed opacity-60" : ""
            )}
            data-conditioned={primaryButton.isConditioned ? "true" : undefined}
            style={primaryButton.style}
            onClick={
              isDisabled || !primaryButton.linkId
                ? undefined
                : () => {
                    if (primaryButton.linkId) onChooseLink(primaryButton.linkId);
                  }
            }
            onPointerDown={isDisabled ? undefined : addPressedClass}
            onPointerUp={removePressedClass}
            onPointerLeave={removePressedClass}
            onPointerCancel={removePressedClass}
            disabled={isDisabled}
            aria-disabled={isDisabled}
          >
            <span className="font-semibold">{primaryButton.label}</span>
          </button>
        </div>
      </div>
    );
  }

  if (!hasButtons && !hasArrows && !shouldShowEmptyState) {
    return null;
  }

  return (
    <div
      className="ps-nav"
      data-nav-style={navStyle}
      data-nav-placement={navPlacement}
      data-swipe-mode={swipeMode ? navStyle : undefined}
      data-nav-empty={!hasButtons ? "true" : undefined}
    >
      <div className="ps-nav__bar" data-has-arrows={hasArrows ? "true" : undefined}>
        {showLeftArrow ? (
          <NavArrowButton
            label="Previous"
            icon={<ChevronLeft aria-hidden />}
            onClick={onBack}
            disabled={interactionsOff || disableBack}
          />
        ) : null}

        <div
          className={cn(
            "ps-nav__choices ps-player__choices",
            navStyle === "right" ? "ps-nav__choices--right" : "",
            navStyle === "leftright" ? "ps-nav__choices--compact" : ""
          )}
        >
          {hasButtons ? (
            buttons.map((button) => {
              const isDisabled =
                interactionsOff || Boolean(button.disabled) || Boolean(button.isCurrent);
              return (
                <button
                  key={button.key}
                  type="button"
                  className={cn(
                    "ps-player__choice ps-nav__choice",
                    button.isCurrent ? "ps-nav__choice--current" : "",
                    isDisabled ? "cursor-not-allowed opacity-60" : ""
                  )}
                  data-conditioned={button.isConditioned ? "true" : undefined}
                  style={button.style}
                  onClick={
                    isDisabled || !button.linkId
                      ? undefined
                      : () => {
                          if (button.linkId) onChooseLink(button.linkId);
                        }
                  }
                  onPointerDown={isDisabled ? undefined : addPressedClass}
                  onPointerUp={removePressedClass}
                  onPointerLeave={removePressedClass}
                  onPointerCancel={removePressedClass}
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                >
                  <span className="font-semibold">{button.label}</span>
                </button>
              );
            })
          ) : null}
        </div>

        {showRightArrow ? (
          <NavArrowButton
            label="Next"
            icon={<ChevronRight aria-hidden />}
            disabled={interactionsOff || !primaryLinkId}
            onClick={() => {
              if (primaryLinkId) onChooseLink(primaryLinkId);
            }}
          />
        ) : null}

        {showDownArrow ? (
          <NavArrowButton
            label="Continue"
            className="ps-nav__arrow--down"
            icon={<ChevronDown aria-hidden />}
            disabled={interactionsOff || !primaryLinkId}
            onClick={() => {
              if (primaryLinkId) onChooseLink(primaryLinkId);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function NavArrowButton({
  label,
  icon,
  className,
  onClick,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  className?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn("ps-nav__arrow", className)}
      onClick={disabled ? undefined : onClick}
      onPointerDown={disabled ? undefined : addPressedClass}
      onPointerUp={removePressedClass}
      onPointerLeave={removePressedClass}
      onPointerCancel={removePressedClass}
      disabled={disabled}
      aria-label={label}
    >
      {icon}
    </button>
  );
}
