class Viewer {
  constructor() {
    this.viewer = {};
    this.viewer.data = {};
    this.props = new Props();
    this.init();
  }

  init() {
    // playerContent
    this.player = document.getElementById("player");
    this.container = document.getElementById("player_container");
    this.contentBackground = document.getElementById("background");
    this.backgroundImage = document.getElementById("background_image");
    this.video = document.getElementById("background_video");
    this.media_container = document.getElementById("media_container");
    this.player_navigation = document.getElementById("playerNavigation");
    this.navigation_container = document.getElementById("navigation_container");
    this.inner_container = document.getElementById("inner_container");
    this.text_block = document.getElementById("text_block");
    this.audio_player = document.getElementById("audio_player");
    this.subtitles = document.getElementById("video_subtitles");

    this.overlay_menu = document.getElementById("overlay_menu");
    this.back_button = document.getElementById("back_button");
    this.home_button = document.getElementById("home_button");
    this.menu_button = document.getElementById("menu_button");
    this.sound_button = document.getElementById("sound_button");
    this.popdown_menu = document.getElementById("popdown_menu");
    this.back_button.addEventListener("click", () => this.onClickBackButton());
    this.home_button.addEventListener("click", () => this.onClickHomeButton());
    this.menu_button.addEventListener("click", () => this.togglePopdownMenu());
    this.sound_button.addEventListener("click", (e) => this.toggleSoundButton(e));

    this.progressBar = document.getElementById("progressBarBar");

    this.navigation_arrows = document.getElementById("navigation_arrows");
    document.getElementById("right_button").onclick = () => this.onClickNextButton();
    document.getElementById("left_button").onclick = () => this.onClickBackButton();
    document.getElementById("down_button").onclick = () => this.onClickNextButton();
    document.getElementById("up_button").onclick = () => this.onClickBackButton();

    this.previousAudioObjs = {};
    this.currentAudioAlt = null;
    this.audioAltPlayed = {};
    this.visitedNodes = {};
    this.buttonNodeIds = [];

    this.firstInteraction = true;

    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent)) {
      this.isMobile = true;
    }

    this.isRecordingStatistics = !standAlonePlayer && !window.location.pathname.startsWith("/testa/");
  }

  onClickNextButton() {
    didPressFirstLink();
  }

  onClickBackButton() {
    this.fadeOutOff = true;
    didPressBack();
  }

  onClickHomeButton() {
    this.fadeOutOff = true;
    didPressLink(this.homeNodeId);
  }

  onClickShortCut(e) {
    this.fadeOutOff = true;
    didPressLink(e.target.dataset.nodeId);
  }

  togglePopdownMenu(state) {
    if (state == undefined) state = this.popdown_menu.hidden;
    this.popdown_menu.hidden = !state;
    this.showHideSvg(this.menu_button.children[0], !state);
    this.showHideSvg(this.menu_button.children[1], state);
  }

  toggleSoundButton(event) {
    var svgs = this.sound_button.children;
    var state = this.sound_button_state;
    this.sound_button_state = !state;
    this.showHideSvg(svgs[0], state);
    this.showHideSvg(svgs[1], !state);
    if (event) subsound_button.onclick(null);
  }

  setAdventureContent(propsJson) {
    this.menu_settings = {
      sound: true,
      high_contrast: true,
      background: true,
    };

    if (!propsJson) return;
    var props = JSON.parse(propsJson);

    // Previous version fix
    if (!props.menu_shortcuts) {
      this.back_button_on = props.menu_option == "all" || props.menu_option == "back";
      return;
    }

    var menu_option = props.menu_option;
    this.back_button_on = menu_option.includes("back");
    if (menu_option.includes("home")) this.home_button.hidden = false;
    if (menu_option.includes("menu")) this.menu_button.hidden = false;
    if (menu_option.includes("sound")) this.sound_button.hidden = false;

    this.menu_on = menu_option.length > 0;

    this.menuSoundOverride = props.menu_sound_override == undefined ? true : props.menu_sound_override;

    if (!props.menu_shortcuts || props.menu_shortcuts.length == 0) return;

    loadFileFonts(document, props.font_list);

    this.homeNodeId = props.menu_shortcuts[0].nodeId;
    this.home_button.title = props.menu_shortcuts[0].text;

    var menu_links = document.getElementById("popdown_links");

    var shortcuts = props.menu_shortcuts.splice(1);
    for (let sc of shortcuts) {
      if (isNaN(sc.nodeId) || !sc.nodeId) continue;
      var line = document.createElement("div");
      line.innerHTML = sc.text;
      line.className = "click_div";
      line.dataset.nodeId = sc.nodeId;
      menu_links.appendChild(line);
      menu_links.innerHTML += "<hr>";
    }

    for (var div of menu_links.getElementsByClassName("click_div")) {
      div.onclick = (e) => this.onClickShortCut(e);
    }

    var subsound_button = document.getElementById("subsound_button");
    var letters_button = document.getElementById("letters_button");
    var image_button = document.getElementById("image_button");

    var setMuteAudio = (mute) => {
      if (this.currentAudioAlt) this.currentAudioAlt.muted = mute;
      if (!this.videoAudioMuted) this.video.muted = mute;
      this.audio_player.muted = mute;
      for (let url in this.previousAudioObjs) {
        var item = this.previousAudioObjs[url];
        item.audioObj.muted = mute;
      }
    };

    var buttonToggle = (flag, element) => {
      var color = flag ? "" : "rgba(185,185,185)";
      element.children[0].style.fill = color;
    };
    subsound_button.onclick = (e) => {
      this.menu_settings.sound = !this.menu_settings.sound;
      buttonToggle(this.menu_settings.sound, subsound_button);
      setMuteAudio(!this.menu_settings.sound);
      if (e) this.toggleSoundButton(null);
    };
    letters_button.onclick = (e) => {
      if (!this.menu_settings.background) return;
      this.menu_settings.high_contrast = !this.menu_settings.high_contrast;
      buttonToggle(this.menu_settings.high_contrast, letters_button);
      this.props.manage({ ...this.currentNodeProps }, !this.menu_settings.high_contrast, null, this.isMobile);
    };
    image_button.onclick = (e) => {
      this.media_container.hidden = this.menu_settings.background;
      buttonToggle(!this.menu_settings.background, image_button);
      if (this.menu_settings.background) {
        this.menu_settings.high_contrast && letters_button.click();
        this.menu_settings.background = false;
      } else {
        this.menu_settings.background = true;
        this.menu_settings.high_contrast && letters_button.click();
      }
    };

    document.onvisibilitychange = () => {
      var mute = document.visibilityState != "visible" ? true : !this.menu_settings.sound;
      setMuteAudio(mute);
    };
  }

  formatUrl(url) {
    if (!url || !standAlonePlayer) return url;
    return url.substring(1);
  }

  errorMessage(message) {
    this.container.innerHTML = `<div style="margin: 10%;"><span style="color: #FF0000;background: #00FF00;font-size: 3vw;">${message}</span></div>`;
  }

  projektPScontent(node, content) {
    this.props.clear();
    this.togglePopdownMenu(false);

    if (!node.props) {
      this.errorMessage("!! Redigera nod. Inga egenskaper !!");
      return;
    }

    const chapterType = node.props.settings_chapterType[0];
    // Background image or video
    const imageUrl = node.image_url == undefined ? "" : this.formatUrl(node.image_url);

    if (chapterType == "videoplayer-node" && !imageUrl.endsWith(".mp4")) {
      this.errorMessage("!!Videospelare satt som Nodtyp men ingen film vald!!");
      return;
    }

    this.currentNodeProps = node.props;

    if (this.back_button_on && canPressBack()) this.back_button.classList.remove("hidden");
    else this.back_button.classList.add("hidden");

    if (this.menu_on) {
      node.props["player_container.menu"] = ["menu_on"];
    }

    if (chapterType == "start-node") {
      content = '<h1 class="title">' + node.title + "</h1>";
    } else if (chapterType == "chapter-node") {
      content = '<h1 class="title">' + node.title + "</h1>" + content;
    } else if (chapterType == "chapter-node-plain") {
      content = '<h1 class="title" style="border-bottom: none;">' + node.title + "</h1>" + content;
    }

    this.text_block.innerHTML = content;

    // Audio
    const volume = node.props.audio_volume ? node.props.audio_volume / 100.0 : 1.0;
    this.video.volume = volume;

    const audioUrl = this.formatUrl(node.props.audio_url);
    let fadeInDuration = node.props.settings_audioFadeIn ? node.props.settings_audioFadeIn[0] : "";
    let fadeOutDuration = node.props.settings_audioFadeOut ? node.props.settings_audioFadeOut[0] : "";
    if (this.isMobile) {
      if (fadeInDuration != "") fadeInDuration = "0.0";
      if (fadeOutDuration != "") fadeOutDuration = "0.0";
    }
    const navigationSound = this.fadeOutOff && this.menuSoundOverride;

    if (fadeOutDuration != "" || navigationSound) {
      const override = this.fadeOutOff ? 0.0 : 1.0;
      for (const [url, item] of Object.entries(this.previousAudioObjs)) {
        delete this.previousAudioObjs[url];
        this.fadeAudio(fadeOutDuration, item.audioObj, override * item.originalVolume, 0);
      }
      this.fadeOutOff = false;
    }

    var doPlayNewSounds = this.menu_settings.sound && !navigationSound && !this.firstInteraction;

    if (chapterType == "podplayer-node") {
      this.audio_player.hidden = false;
      this.audio_player.src = audioUrl;
    } else {
      this.audio_player.hidden = true;
      this.audio_player.src = "";

      if (audioUrl && !this.previousAudioObjs[audioUrl] && doPlayNewSounds) {
        const audioObj = new Audio(audioUrl);
        audioObj.load();
        this.previousAudioObjs[audioUrl] = { audioObj: audioObj, originalVolume: volume };
        audioObj.loop = node.props.settings_audioLoop ? node.props.settings_audioLoop[0] == "true" : false;
        const that = this;

        audioObj.addEventListener("ended", () => {
          delete that.previousAudioObjs[audioUrl];
        });

        setTimeout(() => {
          audioObj.play();
          if (fadeInDuration == "") audioObj.volume = volume;
          else that.fadeAudio(fadeInDuration, audioObj, 0, volume);
        }, Number(fadeOutDuration) * 1000);
      }
    }

    if (this.currentAudioAlt) {
      this.currentAudioAlt.pause();
      this.currentAudioAlt.remove();
    }

    const audioUrlAlt = this.formatUrl(node.props.audio_url_alt);
    if (audioUrlAlt && !this.audioAltPlayed[node.node_id] && doPlayNewSounds) {
      this.currentAudioAlt = new Audio(audioUrlAlt);
      this.currentAudioAlt.play();
      if (node.props.settings_extraAudio == "play_once") this.audioAltPlayed[node.node_id] = true;
    }

    const new_image = imageUrl !== this.previousImageUrl;
    if (new_image) {
      this.previousImageUrl = imageUrl;
      this.setVideo(imageUrl, node, chapterType)
    }

    this.props.manage({ ...node.props }, !this.menu_settings.high_contrast, new_image, this.isMobile);
  }

  setVideo(imageUrl, node, chapterType)
  {
    const fileExtension = imageUrl.split(".").pop();
    const track = this.video.textTracks[0];

    if (fileExtension != "mp4") {
      this.video.controls = false;
      this.video.src = "";
      this.subtitles.src = "";
      track.mode = "hidden";
      if (imageUrl != "") this.backgroundImage.style.backgroundImage = "url('" + imageUrl + "')";
      else this.backgroundImage.style.backgroundImage = "none";

      return;
    }

    this.video.loop = node.props.settings_videoLoop ? node.props.settings_videoLoop[0] == "true" : true;
    this.backgroundImage.style.backgroundImage = "none";
    this.video.controls = chapterType == "videoplayer-node";
    this.video.src = imageUrl;
    var muted = false;
    if (node.props.settings_videoAudio) {
      var val = node.props.settings_videoAudio[0];
      muted = val == "off" || (val == "off_mobile" && this.isMobile);
    }
    this.video.muted = muted || !this.menu_settings.sound;
    this.videoAudioMuted = muted;
    if (node.props.subtitles_url) {
      // addendum to prevent cache issue in iOS
      this.subtitles.src = node.props.subtitles_url + '?t=' + new Date().getTime();
      track.mode = "showing";
      track.oncuechange = () => {
        // again some workaround. vtt must have line defined. I am using the first to set the rest.
        var cues = track.cues;
        for (var i = 1; i < cues.length; i++) {
          cues[i].line = cues[0].line;
          cues[i].snapToLines = cues[0].snapToLines;
        }
        track.oncuechange = null;
      }
    } else {
      this.subtitles.src = "";
      track.mode = "hidden";
    }

    this.video.play();
  }


  onEndAudio(audioUrl) {
    this.previousAudioUrls = this.previousAudioUrls.filter((x) => !audioUrl.includes(x));
  }

  // Duration in seconds, volume 0.0 to 1.0
  fadeAudio(duration, audioObj, startVolume, endVolume) {
    const removeFunc = (v) => {
      if (v == 0.0) {
        audioObj.pause();
        audioObj.remove();
      }
    };

    duration = Number(duration);
    if (duration == 0.0) {
      audioObj.volume = endVolume;
      removeFunc(endVolume);
      return;
    }

    audioObj.volume = startVolume;
    const fadeInterval = 20;
    const fadeCount = (1000 * duration) / fadeInterval;
    let fadeTick = fadeCount;

    const fadeAudioInterval = setInterval(function () {
      const val = fadeTick / fadeCount;
      const eased = 0.5 + 0.5 * Math.cos(val * Math.PI);
      const volume = startVolume + eased * (endVolume - startVolume);
      audioObj.volume = volume;
      if (fadeTick == 0) {
        clearInterval(fadeAudioInterval);
        removeFunc(volume);
      }
      fadeTick--;
    }, fadeInterval);
  }

  getProp(node, prop, defaultValue) {
    return node.props && node.props[prop] ? node.props[prop] : defaultValue;
  }

  selectRandomNode(node, links, previousNode) {
    if (links.length <= 1) {
      this.errorMessage("!!Slumpnod har inga kopplade noder!!");
      return true;
    }

    if (previousNode && previousNode.props.settings_chapterType[0] === "random-node") {
      this.errorMessage("!!Slumpnod ska inte ha kopplade slumpnoder!!");
      return true;
    }

    let randomIndex;
    const relevantLinks = links.filter((link) => link.target != node.node_id);
    const unvisitedLinks = relevantLinks.filter((link) => !this.visitedNodes[link.target]);

    if (unvisitedLinks.length === 0) {
      randomIndex = Math.floor(Math.random() * relevantLinks.length);
      didPressLink(relevantLinks[randomIndex].target);
    } else {
      randomIndex = Math.floor(Math.random() * unvisitedLinks.length);
      didPressLink(unvisitedLinks[randomIndex].target);
    }

    return true;
  }

  setNodeContent(node, links) {
    if (typeof node.props === "string") {
      node.props = JSON.parse(node.props);
    }

    if (!node.props)
    {
      this.errorMessage("!! Inga egenskaper på noden. Antagligen för ny nod eller nytt PS. Du behöver redigera noden för att det ska visas korrekt. !!");
      return;      
    }

    const nodeType = node.props ? node.props.settings_chapterType[0] : "";

    var previousNode = this.previousNode;
    this.previousNode = node;

    if (nodeType === "random-node" && this.selectRandomNode(node, links, previousNode)) {
      return;
    }

    this.visitedNodes[node.node_id] = true;

    var statistics = node.props && this.props.getProp(node.props, "node_statistics") == "on";
    if (statistics && this.isRecordingStatistics) {
      didStatisticsNode(node.node_id);
    }

    if (nodeType.startsWith("ref-node")) {
      let target = "_self";
      if (nodeType.endsWith("-tab")) target = "_blank";

      // Find first URL (HTTP or HTTPS)
      const urlRegex = /https?:\/\/[^\s<>"]+/;
      const match = node.text.match(urlRegex);
      if (match) {
        window.open(match[0], target);
        return;
      }
    }

    // Prepare content
    var content = node.text;
    var title = "";
    // only show title if no content or image exists
    if (content.length == 0 && !node.image_url) {
      title = node.title || "Här finns inget innehåll";
    }

    if (content.length == 0 && title.length > 0) {
      content = title;
    }

    // Process markdown if not HTML text
    if (content.length > 0 && !node.props.editorVersion) {
      content = markDownTextForView(content);
    } else {
      content = content.replace(/font-size:\s*(\d+)pt/g, (_, num) => {
        let newSize = (parseInt(num) / 10.0).toFixed(3) + "em";
        return `font-size: ${newSize}`;
      });
    }

    var nav_style = node.props && node.props["background.navigation_style"] ? node.props["background.navigation_style"] : "";
    var skipCount = nav_style == "" || nav_style == "swipeWithButton" ? 0 : 1;

    var showCurrentNodeButton = this.getProp(node, "playerNavigation.settings").includes("show-current-node");

    this.populateNavigationArea(links, node, skipCount, showCurrentNodeButton);

    this.overlay_menu.style.display = "none";
    setTimeout(() => (this.overlay_menu.style.display = "block"), 1);

    this.projektPScontent(node, content);

    if (!node.props) return;

    this.updateProgressBar();

    const vposString = node.props["player.verticalPosition"][0];

    var nav_style = this.props.getProp(node.props, "background.navigation_style");

    var margins = [node.props.player_container_marginleft ?? 18, node.props.player_container_marginright ?? 18];
    if (node.props.player_container_width) margins = node.props.player_container_width;

    // Must do this after all elements have been modified
    app.scrollytell.initForNode(
      node.props["settings_scrollSpeed"][0],
      vposString,
      node.props["playerNavigation.settings"].indexOf("navigation-opaque") >= 0,
      nodeType == "videoplayer-node",
      margins,
      nav_style,
      node.props.subtitles_url != undefined
    );

    this.firstInteraction = false;
  }

  updateProgressBar() {
    var nodes = getProgressionNodes();
    var percent = 100.0 * (Object.keys(this.visitedNodes).length - 1) / (nodes.length - 1);
    this.progressBar.style.width = percent + '%';
  }

  populateNavigationArea(links, node, skipCount, showCurrent) {
    this.clearNavigation();
    var navButtonCount = 0;
    this.buttonNodeIds = [];

    var ordered_links = links;
    if (showCurrent) ordered_links.push({ link_id: -1 });
    var ordered_link_ids = node.props ? node.props.ordered_link_ids : null;

    if (ordered_link_ids) {
      ordered_links = ordered_link_ids
        .map((x) => links.find((y) => y.link_id == Number(x)))
        .filter((x) => x)
        .concat(links.filter((x) => ordered_link_ids.every((y) => Number(y) != x.link_id)));
    }

    this.targetNodeIds = [];

    for (var link of ordered_links) {
      if (link.source == node.node_id) {
        this.targetNodeIds.push(link.target);
        if (skipCount-- > 0) continue;
        var showButton = !this.navigationShowLogic(link.props);
        this.addNavigation(link.target, link.target_title, showButton);
        navButtonCount++;
      } else if (link.type == "bidirectional") {
        this.targetNodeIds.push(link.source);
        if (skipCount-- > 0) continue;
        this.addNavigation(link.source, link.source_title);
        navButtonCount++;
      } else if (link.link_id == -1) {
        this.addNavigation(node.node_id, node.title, true, true);
      }
    }

    this.setIsNavigationVisible(navButtonCount != 0);
  }

  navigationShowLogic(props) {
    if (!props) return true;

    props = JSON.parse(props);
    if (props.positiveNodeList.some((x) => !this.visitedNodes[x])) return false;
    if (props.negativeNodeList.length > 0 && props.negativeNodeList.every((x) => this.visitedNodes[x])) return false;

    return true;
  }

  setIsNavigationVisible(isVisible) {
    this.player_navigation.style.display = isVisible ? "" : "none";
  }

  clearNavigation() {
    while (this.player_navigation.firstChild) {
      this.player_navigation.removeChild(this.player_navigation.firstChild);
    }
  }

  addNavigation(targetId, title, show, isCurrent) {
    var targetNode = this.getNodeByID(targetId);

    if (targetNode && targetNode.props) {
      var props = targetNode.props;
      props = typeof props == "string" ? JSON.parse(props) : props;
      if (props.node_conditions) {
        var cond = props.node_conditions[0];
        if (cond == "hide_visited") show = this.visitedNodes[targetId];
      }
    }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-nav";
    btn.id = targetId;
    btn.target = targetId;
    if (isCurrent) btn.dataset.conditions = "current";
    else if (show) btn.dataset.conditions = true;

    if (title.length == 0 && targetNode) {
      title = targetNode.title;
    }

    var t = document.createTextNode(title);
    btn.appendChild(t);
    if (!isCurrent) {
      btn.onclick = (e) => {
        e.target.classList.add("btn-pressed");
        setTimeout(() => didPressLink(targetId), 450);
      };
    }
    this.player_navigation.appendChild(btn);

    var s = document.createTextNode(" ");
    this.player_navigation.appendChild(s);

    this.buttonNodeIds.push(targetId);
  }

  preLoadMedia(url, mediaObj) {
    var xhrReq = new XMLHttpRequest();
    xhrReq.open("GET", url, true);
    xhrReq.responseType = "blob";

    xhrReq.onload = function () {
      if (this.status === 200) {
        var vid = URL.createObjectURL(this.response);
        mediaObj.src = vid;
      }
    };
    xhrReq.onerror = function () {
      console.log("err", arguments);
    };
    // xhrReq.onprogress = function (e) {
    //   if (e.lengthComputable) {
    //     var percentComplete = (((e.loaded / e.total) * 100) | 0) + "%";
    //     console.log("progress: ", percentComplete);
    //   }
    // };
    xhrReq.send();
  }

  // Only way to hide/show svg elements afaik
  showHideSvg(e, state) {
    e.style.display = state ? "" : "none";
  }
}
