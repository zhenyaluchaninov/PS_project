class Props {
  constructor() {
    this.lastNodeTimer = null;
    this.editorVersion = "1.0.1";
  }

  manage(props, high_contrast, new_background, isMobile) {
    if (props == undefined) return;

    for (var prop in props) {
      var elementNameMatch = prop.match(/(.*)\./);
      if (elementNameMatch && props[prop][0] != "") {
        var elementName = elementNameMatch[1];
        var element = document.getElementById(elementName);
        if (!element) continue;
        element.dataset.props = (element.dataset.props ? element.dataset.props + " " : "") + props[prop].join(" ");
      }
    }

    if (!props.color_buttontext) this.convertOldProps(props);

    if (high_contrast) {
      props.color_text = "#ffffff";
      props.alpha_text = "100";
      props.color_textbackground = "#000000";
      props.alpha_textbackground = "100";
      props.color_buttontext = "#ffffff";
      props.alpha_buttontext = "100";
      props.color_buttonbackground = "#000000";
      props.alpha_buttonbackground = "100";
    }

    const propsCheck = (elementName, value) => {
      return props[elementName] && props[elementName].includes(value);
    };

    const getProp0 = (elementName, defaultValue) => {
      return this.getProp(props, elementName, defaultValue);
    };

    const defaultContrast = 40;
    props.alpha_textbackground ??= defaultContrast;
    props.alpha_buttonbackground ??= defaultContrast;
    props.alpha_nodeconditions ??= defaultContrast;

    const setColor = (elementRoot, elementTag, styleKey, inColor, alpha) => {
      const root = document.getElementById(elementRoot);

      for (var elmnt of root.getElementsByTagName(elementTag)) {
        elmnt.style[styleKey] = this.hexToRGBA(inColor, alpha);
      }
    };

    document.body.style.backgroundColor = props.color_background ?? "#000000";
    document.getElementById("foreground_color").style.backgroundColor = props.color_foreground
      ? this.hexToRGBA(props.color_foreground, props.alpha_foreground)
      : "transparent";

    const backgroundImage = document.getElementById("background_image");

    if (backgroundImage) {
      const filters = [];

      const grayValue = props.settings_grayscale?.[0] ?? "";
      if (grayValue === "on") {
        filters.push("grayscale(100%)");
      }

      const blurValue = Number(props.color_blur ?? 0);
      if (blurValue > 0) {
        filters.push(`blur(${blurValue}px)`);
      }

      backgroundImage.style.filter = filters.length > 0 ? filters.join(" ") : "none";
    }

    setColor("text_block", "p", "color", props.color_text, props.alpha_text);
    setColor("text_block", "h1", "color", props.color_text, props.alpha_text);
    setColor("text_block", "h1", "borderColor", props.color_text, props.alpha_text);
    setColor("text_block", "a", "color", props.color_text, props.alpha_text);

    setColor("inner_container", "p", "backgroundColor", props.color_textbackground, props.alpha_textbackground);
    setColor("inner_container", "h1", "backgroundColor", props.color_textbackground, props.alpha_textbackground);

    var textColor = this.hexToRGBA(props.color_buttontext, props.alpha_buttontext);
    var backgroundColor = this.hexToRGBA(props.color_buttonbackground, props.alpha_buttonbackground);
    var conditionsColor = this.hexToRGBA(props.color_nodeconditions, props.alpha_buttonbackground);

    for (var buttonElement of document.getElementById("playerNavigation").getElementsByTagName("button")) {
      var style = buttonElement.style;
      if (buttonElement.dataset.conditions == "current") {
        var bg = this.hexToRGBA(props.color_buttonbackground, 255);
        style.color = bg;
        style.backgroundColor = textColor;
        style.borderColor = bg;
        continue;
      }
      if (buttonElement.dataset.conditions) {
        if (!props.type_nodeconditions) props.type_nodeconditions = ["trans"];
        var type_nodeconditions = props.type_nodeconditions[0];

        if (type_nodeconditions == "hide") {
          buttonElement.hidden = true;
          continue;
        }
        style.opacity = type_nodeconditions.includes("trans") ? props.alpha_nodeconditions / 100.0 : undefined;
        style.backgroundColor = type_nodeconditions.includes("color") ? conditionsColor : backgroundColor;
      } else {
        style.opacity = undefined;
        style.backgroundColor = backgroundColor;
      }
      style.color = textColor;
      style.borderColor = textColor;
    }

    var filter = "drop-shadow(0px 0px 0px rgba(0, 0, 0, 0))";
    if (propsCheck("outer_container.textShadow", "text-shadow-black")) {
      filter = "drop-shadow(3px 3px 2px rgba(0, 0, 0, .7))";
    } else if (propsCheck("outer_container.textShadow", "text-shadow-white")) {
      filter = "drop-shadow(3px 3px 2px rgba(255, 255, 255, .7))";
    }

    var overlay_menu = document.getElementById("overlay_menu");
    var overlayColor = this.hexToRGBA(props.color_text, props.alpha_text);
    overlay_menu.style.fill = overlayColor;
    overlay_menu.style.stroke = overlayColor;
    for (var elmnt of overlay_menu.getElementsByTagName("svg")) {
      if (!elmnt.parentElement.classList.contains("submenu_button")) {
        elmnt.style.filter = filter;
      }
    }

    var nav_style = getProp0("background.navigation_style");
    const navigationElement = document.getElementById("playerNavigation");

    if (nav_style == "noButtons") {
      navigationElement.style.display = "none";
    } else {
      navigationElement.style.display = "";
    }

    var nav_fontsize = getProp0("playerNavigation_textSize");
    if (nav_fontsize) {
      navigationElement.style.fontSize = (parseInt(nav_fontsize) / 14.0).toFixed(3) + "em";
    }

    document.getElementById("right_button").hidden = !(nav_style == "leftright" || nav_style == "right");
    document.getElementById("left_button").hidden = !(nav_style == "leftright");
    // document.getElementById("up_button").hidden = updown;
    document.getElementById("down_button").hidden = !(nav_style == "swipe" || nav_style == "down") || nav_style == "swipeWithButton";

    var button_textsize = getProp0("playerNavigation.text");
    if (button_textsize != "") {
      var size = "";
      if (button_textsize == "smaller-text") size = "1.0em";
      else if (button_textsize == "larger-text") size = "1.5em";

      for (var elmnt of overlay_menu.getElementsByClassName("direction_button")) {
        elmnt.style.width = size;
        elmnt.style.height = size;
      }
    }

    var button_class = getProp0("playerNavigation.buttonAnim");
    var button_idle = getProp0("playerNavigation.buttonIdle");
    var delay = 10;
    for (var e of document.getElementsByClassName("btn-nav")) {
      if (button_class && !isMobile) e.classList.add(button_class);
      if (button_idle) e.style.animation = `button_idle_${button_idle} 3.0s infinite ${delay}s ease-in-out`;
      delay += 0.2;
    }

    var progressBar = document.getElementById("progressBar");
    var progressBarBar = document.getElementById("progressBarBar");
    var progressType = getProp0("progress_bar_type");
    if (progressType) {
      progressBar.style.backgroundColor = this.hexToRGBA(props.progress_bar_bgcolor);
      progressBarBar.style.backgroundColor = this.hexToRGBA(props.progress_bar_color);
      progressBar.hidden = false;
      if (progressType == "square") {
        progressBar.style.borderRadius = 0;
        progressBarBar.style.borderRadius = 0;
      } else {
        progressBar.style.borderRadius = "";
        progressBarBar.style.borderRadius = "";
      }

    } else {
      progressBar.hidden = true;
    }

    // Paragraphs and navigation button animations
    if (high_contrast) return;

    var animation_delay = Number(props.animation_delay ?? 0.0);

    var paragraph_animation_type = getProp0("player_container.animation", "").split("-")[1];
    var paragraph_delay = 0.0;
    switch (paragraph_animation_type) {
      case "faster":
        paragraph_delay = 1.0;
        break;
      case "paragraphs":
        paragraph_delay = 2.0;
        break;
      case "slower":
        paragraph_delay = 3.0;
        break;
      case "slowerer":
        paragraph_delay = 4.0;
        break;
      case "slowest":
        paragraph_delay = 5.0;
        break;
    }

    var animspec = [{ opacity: 0 }, { opacity: 1 }];
    var options = { fill: "both", duration: 1000 };
    var textRoot = document.getElementById("text_block");

    for (var e of textRoot.getElementsByTagName("h1")) {
      e.animate(animspec, { ...options, delay: 1000 * animation_delay });
    }

    var paragraph_elements = textRoot.getElementsByTagName("p");
    for (var i = 0; i < paragraph_elements.length; i++) {
      var p = paragraph_elements[i];
      p.animate(animspec, { ...options, delay: 1000 * (animation_delay + i * paragraph_delay) });
    }

    var relative_delay = Number(props.playerNavigation_delay ?? 0.0);
    var navigation_delay = paragraph_elements.length * paragraph_delay + relative_delay + animation_delay;

    // Node timer
    const nodeTimerValue = props.node_timer;

    if (this.lastNodeTimer) {
      clearTimeout(this.lastNodeTimer);
    }

    if (nodeTimerValue > 0) {
      this.lastNodeTimer = setTimeout(() => {
        didPressFirstLink();
      }, navigation_delay * 1000 + 1000 + nodeTimerValue * 1000);
    }

    navigationElement.animate(animspec, { ...options, delay: 1000 * navigation_delay });

    if (new_background) {
      var fade = 1000 * (props.animation_backgroundfade ?? 1.0);
      var media_container = document.getElementById("media_container");
      media_container.animate(animspec, { ...options, duration: fade, delay: 0 });
    }
  }

  getProp(props, elementName, defaultValue) {
    return props[elementName] ? props[elementName][0] : defaultValue;
  }

  clear() {
    var elements = document.querySelectorAll("[data-props]");
    for (var i = 0; i < elements.length; i++) {
      elements[i].dataset.props = "";
    }
  }

  getEditorProps(node, selectedNodeIds) {
    const propElements = document.querySelectorAll(".prop-input");

    let propsObj = {};
    let bulkChangeIds = {};

    for (const e of propElements) {
      let values;
      if (e.tagName == "INPUT") {
        values = e.value;
      } else if (e.tagName == "SELECT") {
        values = [];
        for (const o of e.options) {
          if (o.selected) values.push(o.value);
        }
      } else continue;

      propsObj[e.id] = values;
      if (e.style.backgroundColor != "") {
        bulkChangeIds[e.id] = values;
      }
    }

    if (selectedNodeIds?.length > 1) app.model.bulkUpdateNodes(selectedNodeIds, bulkChangeIds);

    // Special fields
    propsObj.editorVersion = node ? this.editorVersion : undefined;
    propsObj.audio_url = node ? node.audio_url : undefined;
    propsObj.audio_url_alt = node ? node.audio_url_alt : undefined;
    propsObj.audio_volume = document.getElementById("audio_volume").value;
    propsObj.subtitles_url = node ? node.subtitles_url : undefined;
    if (!node) propsObj.settings_chapterType[0] = "";


    var link_list = document.getElementById("link_order_list");
    var link_ids = [];
    for (var target of link_list.children) {
      link_ids.push(target.dataset.link_id);
    }
    propsObj.ordered_link_ids = node ? link_ids : undefined;

    this.showPropChanges(propsObj);

    return JSON.stringify(propsObj);
  }

  setEditorProps(node, defaultProps) {
    if (!node.props) return;

    let propsObj;
    try {
      propsObj = JSON.parse(node.props);
    } catch (error) {
      console.log(error);
      return;
    }

    // Default editor version
    propsObj.editorVersion ??= "1.0.0";

    // To prevent new features to be copied between nodes
    propsObj = { ...defaultProps, ...propsObj };

    if (!propsObj.color_buttontext) this.convertOldProps(propsObj);

    // Special fields
    node.audio_url = propsObj.audio_url;
    node.audio_url_alt = propsObj.audio_url_alt;
    document.getElementById("audio_volume").value = 100;
    node.subtitles_url = propsObj.subtitles_url;

    // Select fields
    for (const prop in propsObj) {
      const e = document.getElementById(prop);
      if (e == null) continue;

      e.style.backgroundColor = "";

      if (e.tagName === "INPUT") {
        e.value = propsObj[prop] ?? "";
        continue;
      }

      for (const option of e.options) {
        let selected = false;
        for (const value of propsObj[prop]) {
          if (value == option.value) {
            selected = true;
            break;
          }
        }
        option.selected = selected;
      }
    }

    this.showPropChanges(propsObj);

    return propsObj;
  }

  showPropChanges(props) {
    const textInputLabel = document.getElementById("node_text_label");
    var chapterType = props.settings_chapterType ?? [""];
    if (chapterType[0].startsWith("ref-node")) {
      textInputLabel.innerHTML = "Hyperlänk (URL)";
    } else {
      textInputLabel.innerHTML = "Brödtext";
    }
  }

  setEditorButtonList(node, ordered_link_ids) {
    const moveButton = (e) => {
      const list = e.target.parentNode;
      const prevItem = e.target.previousSibling;
      if (prevItem) {
        list.insertBefore(e.target, prevItem);
      }
      this.onChangeNode();
    };

    var link_list = document.getElementById("link_order_list");
    while (link_list.firstChild) {
      link_list.firstChild.remove();
    }

    var targets = app.model.getOrderedTargetsByNode(node, ordered_link_ids);
    for (var target of targets) {
      const e = document.createElement("button");
      e.type = "button";
      e.classList = "btn btn-info m-1" + (target.link_id == -1 ? " btn-inverted" : "");
      e.textContent = target.title == "" ? "#" + target.node_target_id : target.title;
      e.dataset.link_id = target.link_id;
      e.onclick = moveButton;
      link_list.appendChild(e);
    }
  }

  convertOldProps(props) {

    const getContrast = (x) => String(props[x] ? Number(props[x][0].match("[0-9]+")[0]) : 40);
    const propIncludes = (x, y, z) => props[x] && (props[x][0].includes(y) || props[x][0].includes(z));

    props.color_text = "#ffffff";
    props.color_textbackground = "#000000";
    if (propIncludes("player_container.color", "black", "light")) {
      props.color_text = "#000000";
      props.color_textbackground = "#ffffff";
    }
    props.color_buttontext = "#ffffff";
    props.color_buttonbackground = "#000000";
    if (propIncludes("playerNavigation.color", "white", "light")) {
      props.color_buttontext = "#000000";
      props.color_buttonbackground = "#ffffff";
    }
    props.alpha_text = "100";
    props.alpha_buttontext = "100";
    props.alpha_textbackground = getContrast("background.contrastLevel");
    props.alpha_buttonbackground = getContrast("playerNavigation.contrastLevelBtn");

    if (propIncludes("playerNavigation.color", "white", "black")) props.alpha_buttonbackground = "100";
  }

  hexToRGBA(hex, alpha) {
    hex = hex ?? "#000000";
    var r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);

    if (alpha != undefined) {
      var a = parseFloat(alpha) / 100.0;
      return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
    } else {
      return "rgb(" + r + ", " + g + ", " + b + ")";
    }
  }

  setupDynamicElements(onChangeAdventure, onChangeLink, onChangeNode) {
    this.elements = {};
    this.elements.menu_options = document.getElementById("menu_options");
    this.elements.menu_shortcut_nodes = document.getElementById("menu_shortcut_nodes").children;
    this.elements.menu_shortcut_texts = document.getElementById("menu_shortcut_texts").children;
    this.elements.menu_shortcut_message = document.getElementById("menu_shortcut_message");
    this.elements.menu_sound_override = document.getElementById("menu_sound_override");
    this.elements.font_list = document.getElementById("font-list");
    this.elements.background_font = document.getElementById("background.font");

    this.elements.menu_options.addEventListener("change", onChangeAdventure);

    // Color edits
    const propElements = document.querySelectorAll(".prop-input");

    for (let el of propElements) {

      // only process <input> elements
      if (el.tagName !== "INPUT") continue;

      if (el.type === "color") {
        el.title = "Klicka för att ändra färg";
      } else if (el.type === "number" && el.id.startsWith("alpha")) {
        el.min = 0;
        el.max = 100;
        el.setAttribute("data-toggle", "tooltip");
        el.title = "Här kan du ändra färgens genomskinlighet/intensitet i procent. Stäng av färgen helt med 0.";

        el.oninput = (event) => {
          const t = event.target;
          t.value = Math.max(0, Math.min(t.value, 100));
        };
      }
    }


    // Menu shortcuts
    var nodeInputs = this.elements.menu_shortcut_nodes;
    var descInputs = this.elements.menu_shortcut_texts;

    for (let i = 0; i < nodeInputs.length; i++) {
      let ni = nodeInputs[i];
      let di = descInputs[i];
      ni.name = i;
      di.name = i;
      ni.onfocus = (e) => {
        this.currentNodeInput = { nodeElement: e.target, descElement: di };
        this.elements.menu_shortcut_message.hidden = false;
      };
      ni.onblur = () => {
        this.elements.menu_shortcut_message.hidden = true;
      };
      ni.onchange = onChangeAdventure;
      di.onchange = onChangeAdventure;
    }

    var bulkChangeEvent = (event) => {
      if (getSelectedNodeIds().length <= 1) return;
      const t = event.target;
      if (t.style.backgroundColor != "") {
        t.style.backgroundColor = "";
      } else {
        t.style.backgroundColor = "#f09020";
      }
    };

    // bulk change properties
    for (let e of propElements) {
      e.onfocus = bulkChangeEvent;
      e.onchange = onChangeNode;
    }

    this.elements.menu_sound_override.onchange = onChangeAdventure;

    this.onChangeNode = onChangeNode;

    this.setupLinkProps(onChangeLink);
  }

  linkAddNodeAction = ([numberInput, numberList, onChangeLink]) => {
    const number = Number(numberInput.value);

    if (!isNaN(number) && !Array.from(numberList.children).some((li) => Number(li.textContent) === number)) {
      const li = document.createElement("li");
      li.classList = "list-group-item list-group-item-action";
      li.textContent = number;
      numberList.appendChild(li);
      numberInput.value = "";
      onChangeLink();
    } else {
      const errorMessage = document.createElement("p");
      errorMessage.textContent = "Nodnummer är redan i listan.";
      errorMessage.classList.add("text-danger", "mt-2");
      numberInput.parentNode.appendChild(errorMessage);
      setTimeout(() => errorMessage.remove(), 3000);
    }

    this.linkNodeInput = null;
  };

  setupLinkProps(onChangeLink) {
    const listAction = (e) => {
      if (e.target.tagName === "LI") {
        e.target.remove();
        onChangeLink();
      }
    };

    const numberList1 = document.getElementById("link-variable-list1");
    const numberInput1 = document.getElementById("link-variable-input1");
    const addButton1 = document.getElementById("link-variable-add-button1");

    addButton1.addEventListener("click", () => this.linkAddNodeAction([numberInput1, numberList1, onChangeLink]));
    numberList1.addEventListener("click", listAction);
    numberInput1.onfocus = () => (this.linkNodeInput = [numberInput1, numberList1, onChangeLink]);

    const numberList2 = document.getElementById("link-variable-list2");
    const numberInput2 = document.getElementById("link-variable-input2");
    const addButton2 = document.getElementById("link-variable-add-button2");

    addButton2.addEventListener("click", () => this.linkAddNodeAction([numberInput2, numberList2, onChangeLink]));
    numberList2.addEventListener("click", listAction);
    numberInput2.onfocus = () => (this.linkNodeInput = [numberInput2, numberList2, onChangeLink]);

    this.elements.link_order_list;
  }

  getLinkProps() {
    const getList = (id) => {
      const numberList = document.getElementById(id);
      var posList = [];
      for (var li of numberList.children) {
        posList.push(li.textContent);
      }
      return posList;
    };

    let linkProps = {};
    linkProps.positiveNodeList = getList("link-variable-list1");
    linkProps.negativeNodeList = getList("link-variable-list2");

    return JSON.stringify(linkProps);
  }

  setLinkProps(linkProps, nodeIds) {
    var props = linkProps ? JSON.parse(linkProps) : {};

    function setNodeList(id, nodeList) {
      const numberList = document.getElementById(id);
      while (numberList.firstChild) {
        numberList.firstChild.remove();
      }
      if (!nodeList) return;
      for (var value of nodeList) {
        const li = document.createElement("li");
        li.classList.add("list-group-item");
        if (nodeIds.includes(Number(value))) li.classList.add("list-group-item-action");
        else li.classList.add("list-group-item-danger");
        li.textContent = value;
        numberList.appendChild(li);
      }
    }

    setNodeList("link-variable-list1", props.positiveNodeList);
    setNodeList("link-variable-list2", props.negativeNodeList);
  }

  selectNode(nodeData) {
    var cni = this.currentNodeInput;
    var lni = this.linkNodeInput;

    if (cni) {
      cni.nodeElement.value = "#" + nodeData.node_id;
      cni.descElement.value = nodeData.title;
      cni.nodeElement.blur();
      this.currentNodeInput = null;
      return true;
    } else if (lni) {
      lni[0].value = nodeData.node_id;
      this.linkAddNodeAction(lni);
      this.linkNodeInput = null;
      return true;
    }
    return false;
  }

  getAdventureProps(adventure) {
    var adventureProps = {};

    adventureProps.menu_option = [];
    for (const option of this.elements.menu_options.options) {
      if (option.selected) adventureProps.menu_option.push(option.value);
    }

    var nodeInputs = this.elements.menu_shortcut_nodes;
    var descInputs = this.elements.menu_shortcut_texts;
    var shortcutDefs = [];
    for (let i = 0; i < nodeInputs.length; i++) {
      const ni = nodeInputs[i];
      const di = descInputs[i];
      shortcutDefs.push({ nodeId: ni.value.substr(1), text: di.value });
    }

    adventureProps.menu_shortcuts = shortcutDefs;

    adventureProps.menu_sound_override = this.elements.menu_sound_override.checked;

    adventure.font_list = adventure.font_list.filter((item, pos, self) => self.indexOf(item) == pos);
    adventureProps.font_list = adventure ? adventure.font_list : [];

    return JSON.stringify(adventureProps);
  }

  setAdventureProps(adventurePropsJson, currentAdventure, deleteCallback) {
    if (!adventurePropsJson) return;
    var adventureProps = JSON.parse(adventurePropsJson);

    adventureProps.editorVersion = this.editorVersion;

    this.menu_option_selects = [];
    for (const option of this.elements.menu_options.options) {
      let selected = false;
      for (const value of adventureProps.menu_option) {
        if (value == option.value) {
          selected = true;
          break;
        }
      }
      option.selected = selected;
      this.menu_option_selects.push(selected);
    }

    var nodeInputs = this.elements.menu_shortcut_nodes;
    var descInputs = this.elements.menu_shortcut_texts;
    for (let i = 0; i < nodeInputs.length; i++) {
      var shortcut = adventureProps.menu_shortcuts[i];
      nodeInputs[i].value = shortcut.nodeId ? "#" + shortcut.nodeId : "";
      nodeInputs[i].dataset.nodeId = shortcut.nodeId;
      descInputs[i].value = shortcut.text;
    }

    this.elements.menu_sound_override.checked = adventureProps.menu_sound_override;

    currentAdventure.font_list = adventureProps.font_list ?? [];

    if (adventureProps.font_list) {
      for (var fontUrl of adventureProps.font_list) {
        const fontName = fontUrl.split('/').pop().replace(/\.[^/.]+$/, '');
        var id = "font-item-" + fontName;
        if (document.getElementById(id))
          continue;
        const li = document.createElement("li");
        li.classList = "list-group-item list-group-item-action";
        li.textContent = fontName;
        li.dataset.url = fontUrl;
        li.id = id;
        li.onclick = (e) => deleteCallback(e.target.dataset.url,
          () => {
            e.target.remove();
            currentAdventure.font_list = currentAdventure.font_list.filter(x => x != e.target.dataset.url);
          }
        );
        this.elements.font_list.appendChild(li);

        var option = document.createElement("option");
        option.value = "xfont-" + fontName;
        option.textContent = fontName;
        this.elements.background_font.prepend(option)
      }
    }
  }

}
