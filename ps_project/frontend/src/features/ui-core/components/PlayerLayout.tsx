import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./player-layout.css";

type PlayerLayoutProps = {
  children: ReactNode;
  overlay?: ReactNode;
  backgroundImage?: string | null;
  backgroundVideo?: {
    src: string;
    subtitlesUrl?: string | null;
    onSubtitlesLoad?: () => void;
    onSubtitlesError?: () => void;
    muted?: boolean;
    controls?: boolean;
    loop?: boolean;
    videoRef?: (node: HTMLVideoElement | null) => void;
  };
  hideBackground?: boolean;
  mediaFilter?: string;
  objectFit?: "cover" | "contain";
  backgroundPosition?: string;
  backgroundSize?: string;
  overlayColor?: string | null;
  dataProps?: {
    background?: string;
    backgroundImage?: string;
    player?: string;
    content?: string;
  };
  layout?: {
    verticalAlign?: "top" | "center" | "bottom";
    containerWidthVw?: number;
    containerMarginsVw?: [number, number];
    textAlign?: "left" | "center" | "right";
  };
  className?: string;
  style?: CSSProperties;
};

export function PlayerLayout({
  children,
  overlay,
  backgroundImage,
  backgroundVideo,
  hideBackground = false,
  mediaFilter,
  objectFit,
  backgroundPosition,
  backgroundSize,
  overlayColor,
  dataProps,
  layout,
  className,
  style,
}: PlayerLayoutProps) {
  const containerStyle: CSSProperties = {
    ...(layout?.textAlign ? { textAlign: layout.textAlign } : {}),
  };

  if (layout?.containerWidthVw && Number.isFinite(layout.containerWidthVw)) {
    containerStyle.width = `${layout.containerWidthVw}vw`;
    containerStyle.maxWidth = `${layout.containerWidthVw}vw`;
    containerStyle.marginLeft = "auto";
    containerStyle.marginRight = "auto";
  } else if (
    layout?.containerMarginsVw &&
    (layout.containerMarginsVw[0] > 0 || layout.containerMarginsVw[1] > 0)
  ) {
    containerStyle.marginLeft = `${layout.containerMarginsVw[0]}vw`;
    containerStyle.marginRight = `${layout.containerMarginsVw[1]}vw`;
  }

  const rootStyle: CSSProperties = {
    ...style,
    ...(mediaFilter ? { ["--player-media-filter" as keyof CSSProperties]: mediaFilter } : {}),
    ...(objectFit ? { ["--player-object-fit" as keyof CSSProperties]: objectFit } : {}),
    ...(backgroundPosition
      ? { ["--player-bg-position" as keyof CSSProperties]: backgroundPosition }
      : {}),
    ...(backgroundSize ? { ["--player-bg-size" as keyof CSSProperties]: backgroundSize } : {}),
  };

  return (
    <div
      className={cn("ps-player", className)}
      data-props={dataProps?.player || undefined}
      data-align={layout?.verticalAlign ?? "center"}
      data-hide-bg={hideBackground ? "true" : undefined}
      style={rootStyle}
    >
      <div
        className="ps-player__media"
        data-props={dataProps?.background || undefined}
        data-hidden={hideBackground ? "true" : undefined}
        data-interactive={backgroundVideo?.controls ? "true" : undefined}
      >
        {backgroundVideo ? (
          <video
            key={backgroundVideo.src}
            className="ps-player__video"
            src={backgroundVideo.src}
            muted={backgroundVideo.muted ?? true}
            controls={backgroundVideo.controls ?? false}
            ref={backgroundVideo.videoRef}
            playsInline
            autoPlay
            loop={backgroundVideo.loop ?? true}
            preload="auto"
            aria-hidden={backgroundVideo.controls ? undefined : true}
            data-interactive={backgroundVideo.controls ? "true" : undefined}
          >
            {backgroundVideo.subtitlesUrl ? (
              <track
                key={backgroundVideo.subtitlesUrl}
                label="Subtitles"
                kind="subtitles"
                srcLang="en"
                src={backgroundVideo.subtitlesUrl}
                default
                onError={backgroundVideo.onSubtitlesError}
                onLoad={backgroundVideo.onSubtitlesLoad}
              />
            ) : null}
          </video>
        ) : null}

        {!backgroundVideo && backgroundImage ? (
          <div
            className="ps-player__bg-image"
            data-props={dataProps?.backgroundImage || undefined}
            style={{
              backgroundImage: backgroundImage ? `url(${backgroundImage})` : "none",
            }}
            aria-hidden
          />
        ) : null}

        {!hideBackground && overlayColor ? (
          <div className="ps-player__overlay" style={{ background: overlayColor }} />
        ) : null}
      </div>

      <div className="ps-player__outer">
        <div
          className="ps-player__content"
          data-props={dataProps?.content || undefined}
          style={containerStyle}
        >
          <div className="ps-player__body">{children}</div>
        </div>
      </div>

      {overlay ? <div className="ps-player__floating">{overlay}</div> : null}
    </div>
  );
}
