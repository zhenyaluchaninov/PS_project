function Scrollytell() {
  const scrollDelay = 4000;
  this.scrollStartTime;
  const navigationVisibleDelay = 0.8;
  this.verticalPosition;
  this.player = document.getElementById("player");
  this.overlay_menu = document.getElementById("overlay_menu");
  this.navigation_container = document.getElementById("navigation_container");
  this.navigation_container.style.transition = "opacity 0.3s";
  this.overlay_menu.style.transition = "opacity 0.3s";

  // debugShow();

  this.initForNode = (speed, vertPos, bottomNavigation, videoControl, margin, nav_style, subtitles) => {
    this.scrollSpeed = Number(speed);
    this.scrollAcceleration = 0.05;
    this.swipeControl = nav_style == "swipe" || nav_style == "swipeWithButton";
    this.swipeControlWithButton = nav_style == "swipeWithButton";
    this.arrowControl = nav_style == "leftright" || nav_style == "right" || nav_style == "noButtons";
    if (this.swipeControl) {
      this.scrollSpeed = 25.0;
      this.scrollAcceleration = 1.0;
    }

    this.alignCenter = vertPos == "vertical-align-center";
    this.scrollingActive = false;

    this.bottomNavigation = bottomNavigation;
    this.videoControl = videoControl;
    this.subtitles = subtitles;
    this.margin = margin;

    this.scrollStartTime = undefined;
    this.controlsStartTime = undefined;
    this.controlsPlaying = false;
    this.controlsState = "start";
    this.mobileNavigationBar = false;
    this.position = 0.0;
    this.velocity = 0.0;
    this.moveElements(0);

    // if (document.fullscreenEnabled && (screen.width <= 600 || screen.height <= 600)) {
    //   document.documentElement.requestFullscreen().catch((x) => undefined);
    // }

    document.getElementById("navigation_container").style.opacity = "";

    document.fonts.ready.then(() => {
      window.dispatchEvent(new CustomEvent("resize"));
    });
  };

  this.resizeScroll = () => {
    const player_navigation = document.getElementById("playerNavigation");
    const inner_container = document.getElementById("inner_container");
    const body_background = document.getElementById("background");
    const navigation_container = document.getElementById("navigation_container");
    const outer_container = document.getElementById("outer_container");
    const player_container = document.getElementById("player_container");

    const windowHeight = window.innerHeight;

    this.velocity = 0.0;
    this.scroll_height = 0;

    if (!inner_container) return;

    inner_container.style.paddingTop = null;
    navigation_container.hidden = false;

    // If "mobile portrait screen" we will move navigation to scroll with text-block
    if (body_background.clientWidth <= 600 && window.matchMedia("(orientation: portrait)").matches) {
      this.isPortrait = true;
      navigation_container.style.position = "relative";
      navigation_container.style.margin = "0 1em 0 1em";
      inner_container.style.paddingBottom = "";
    } else {
      this.isPortrait = false;
      navigation_container.style.position = "fixed";
      navigation_container.style.margin = "";

      if (this.arrowControl && this.alignCenter) {
        inner_container.style.paddingBottom = "";
      } else {
        var vp = navigation_container.clientHeight;
        inner_container.style.paddingBottom = this.alignBottom && vp == 0 ? "1em" : vp + "px";
      }
    }

    player_container.style.width = "";
    if (this.isPortrait) {
      inner_container.style.margin = "";
    } else if (Array.isArray(this.margin)) {
      inner_container.style.margin = `0 ${this.margin[1]}vw 0 ${this.margin[0]}vw`;
    } else {
      inner_container.style.margin = "";
      inner_container.style.width = this.margin + "vw";
    }

    const image_element = document.getElementById("background_image");
    var overlay_menu = document.getElementById("overlay_menu");
    if (this.videoControl) {
      navigation_container.style.position = "fixed";
      outer_container.style.height = "0px";
      inner_container.style.display = "none";
      navigation_container.style.marginBottom = "60px";
      image_element.hidden = true;
      this.moveElements();
      this.controlsState = "start";
      return;
    } else {
      outer_container.style.height = "auto";
      overlay_menu.style.animation = "";
      inner_container.style.display = "";
      image_element.hidden = false;
    }

    overlay_menu.style.animation = this.videoControl || this.subtitles ? "none" : "";

    const nodeblock_before = document.getElementById("nodeblock_before");
    const nodeblock_after = document.getElementById("nodeblock_after");
    const media_container = document.getElementById("media_container");

    if (this.swipeControl) {
      media_container.style.position = "absolute";
      outer_container.style.height = "100%";
      var back = true;
      this.position = 0;
      if (canPressBack()) {
        back = false;
        this.position = windowHeight;
      }
      nodeblock_before.hidden = back;
      nodeblock_after.hidden = !hasLinks();

      navigation_container.hidden = !this.swipeControlWithButton;
      this.scroll_height = this.player.scrollHeight - windowHeight;
      this.player.style.scrollSnapType = "y mandatory";
      inner_container.style.paddingBottom = this.isPortrait ? "2.5em" : "3em";
    } else {
      nodeblock_before.hidden = true;
      nodeblock_after.hidden = true;
      media_container.style.position = "fixed";
      outer_container.style.height = "";
      navigation_container.hidden = false;
      this.player.style.scrollSnapType = "none";
    }

    const text_block = document.getElementById("text_block");
    text_block.style.paddingBottom = "";
    text_block.style.paddingTop = "";

    if (!this.swipeControl && windowHeight >= outer_container.clientHeight) {
      outer_container.style.height = windowHeight + "px";

      if (this.isPortrait && this.bottomNavigation) {
        const height = windowHeight - navigation_container.clientHeight;
        const padding = "calc(" + (height - text_block.clientHeight) / 2.0 + "px - 2em)";
        text_block.style.paddingBottom = padding;
        text_block.style.paddingTop = padding;
      } else if (!this.bottomNavigation) {
        inner_container.style.paddingBottom = "";
        navigation_container.style.position = "relative";
      }

      this.player.scrollTo(0, 0);
      navigation_container.style.opacity = "";
      this.controlsState = "start";
      return;
    }

    this.scrollingActive = true;

    this.scroll_height = this.player.scrollHeight - windowHeight;
    this.scrollStartTime = undefined;

    this.position = this.Clamp(this.position, 0, this.scroll_height);
    this.moveElements(this.position);
    this.player.scrollTo(0, this.position);

    this.loadNewNode = false;
  };

  this.moveElements = () => {
    const navigation_container = document.getElementById("navigation_container");

    // Fade in buttons
    const scroll_factor = this.player.scrollTop / this.scroll_height;
    var render_intensity = (1.0 / (1 - navigationVisibleDelay)) * Math.max(scroll_factor - navigationVisibleDelay, 0);

    if (this.scroll_height / window.innerHeight < 0.05) render_intensity = 1.0;

    navigation_container.style.opacity = this.isPortrait || this.swipeControlWithButton ? 1.0 : render_intensity;
    navigation_container.style.pointerEvents = this.swipeControlWithButton || !this.scrollingActive || (render_intensity > 0.9) ? "" : "none";
  };

  this.setNavigationOpacity = (opacity) =>
  {
    var o = opacity.toString();
    if (this.videoControl) this.overlay_menu.style.opacity = o;
    this.navigation_container.style.opacity = o;
  }

  this.autoScroll = (time) => {
    if (this.scrollingActive) {
      if (!this.swipeControl && (!this.scrollStartTime || this.screenTouching)) {
        this.scrollStartTime = time;
        this.velocity = 0.0;
      }

      if (time - this.scrollStartTime > scrollDelay) {
        var scrollY = this.player.scrollTop;
        const acceleration = this.scrollAcceleration;
        const endDistance = (this.velocity * this.velocity) / (2 * acceleration);
        const distance = Number(this.scroll_height - scrollY);

        this.velocity += distance >= endDistance ? acceleration : -acceleration;
        this.velocity = this.Clamp(this.velocity, 0, this.scrollSpeed);
        this.position += this.velocity;
        this.position = this.Clamp(this.position, 0, this.scroll_height);

        this.moveElements(this.position);
        this.player.scrollTo(0, Math.trunc(this.position));
      }
    }

    if (this.videoControl || this.subtitles) {
      if (!this.controlsStartTime) {
        if (this.controlsPlaying) this.controlsStartTime = time;
        if (this.controlsState == "ongoing") {
          this.setNavigationOpacity(1.0);
        }
        this.controlsShowing = true;
      }

      var dt = time - this.controlsStartTime;

      if (this.controlsState == "start") {
        this.setNavigationOpacity(0.0);
        this.controlsState = "delaying";
      } else if (this.controlsState == "delaying" && dt > 1000.0) {
        this.controlsState = "ongoing";
      }

      if (this.controlsShowing && this.controlsPlaying && dt > 2500.0) {
        this.setNavigationOpacity(0.0);
        this.controlsShowing = false;
      }
    }

    window.requestAnimationFrame(this.autoScroll);
  };

  window.requestAnimationFrame(this.autoScroll);

  this.player.addEventListener("scroll", (event) => {
    var scrollY = this.player.scrollTop;

    if (this.swipeControl && !this.loadNewNode) {
      if (scrollY >= this.scroll_height && hasLinks()) {
        this.loadNewNode = true;
        setTimeout(() => didPressFirstLink(), 200);
      }
      if (scrollY <= 0 && canPressBack()) {
        this.loadNewNode = true;
        setTimeout(() => didPressBack(), 200);
      }
      return;
    }

    if (!this.scrollingActive) return;
    if (this.velocity == 0.0) {
      this.scrollStartTime = undefined;
      this.position = this.Clamp(scrollY, 0, this.scroll_height);
      this.moveElements(this.position);
    }
  });

  this.ParametricBlend = (t) => {
    var sqt = t * t;
    return sqt / (2.0 * (sqt - t) + 1.0);
  };

  this.Clamp = (x, min, max) => Math.max(min, Math.min(max, x));

  const video_element = document.getElementById("background_video");

  window.addEventListener("resize", (event) => this.resizeScroll());

  window.addEventListener("wheel", (event) => {
    this.scrollStartTime = undefined;
  });

  window.addEventListener("keydown", (event) => {
    if (event.code == "Space") {
      if (video_element.paused) video_element.play();
      else video_element.pause();
    }
    this.scrollStartTime = undefined;
  });

  window.addEventListener("touchstart", (event) => {
    this.controlsStartTime = null;
    this.screenTouching = true;
  });

  window.addEventListener("touchend", (event) => {
    this.screenTouching = false;
  });

  window.addEventListener("mousedown", (event) => {
    this.screenTouching = true;
  });

  window.addEventListener("mouseup", (event) => {
    this.screenTouching = false;
  });

  window.addEventListener("mousemove", (event) => {
    this.controlsStartTime = null;
  });

  video_element.onplay = () => {
    this.controlsStartTime = null;
    this.controlsPlaying = true;
  };
  video_element.onpause = () => {
    this.controlsStartTime = null;
    this.controlsPlaying = false;
  };
}
