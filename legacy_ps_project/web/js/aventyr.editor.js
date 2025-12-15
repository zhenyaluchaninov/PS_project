/**
 * Editor - Encapsulates the form/editor that is used to edit data about
 * the node and link editor
 */

class Editor {
  constructor(nodeEditorElement, linkEditorElement, placeholderElement) {
    this.nodeEditorRootElement = document.getElementById(nodeEditorElement);
    this.linkEditorRootElement = document.getElementById(linkEditorElement);
    this.placeholderElement = document.getElementById(placeholderElement);
    this.form = {};
    this.form.editor = {};
    this.form.adventure = {};
    this.form.node = {};
    this.form.link = {};
    this.showNodeFirstTime = true;
    this.Props = new Props();
    this.init();
  }

  init() {
    let that = this;

    // Stores categories
    this.categories = {};

    // Stores reference to the current adventure
    this.currentAdventure = { font_list: [] };

    // Stores reference to the link currently being edited in the link editor
    this.currentLink = null;

    // Stores reference to the node currently being edited in the node editor
    this.currentNode = null;

    // Global elements
    this.form.editor.statuslabel = document.getElementById("lblStatus");

    // Can be either "node" or "adventure", node is for the current node, adventure is the cover image
    this.galleryMode = "node";

    // Adventure elements
    this.form.adventure.adventure_title = document.getElementById("adventure_title");
    this.form.adventure.adventure_title.addEventListener("keyup", this.onChangeAdventure.bind(that));
    this.form.adventure.adventure_description = document.getElementById("adventure_description");
    this.form.adventure.adventure_description.addEventListener("keyup", this.onChangeAdventure.bind(that));

    this.form.adventure.previewCoverImage = document.getElementById("preview_cover_image");
    this.form.adventure.panelReselectImage = document.getElementById("panelReselectCoverImage");
    this.form.adventure.panelSelectImage = document.getElementById("panelSelectCoverImage");
    this.form.adventure.adventure_category = document.getElementById("adventure_category");
    this.form.adventure.adventure_category.addEventListener("change", this.onChangeAdventure.bind(that));

    this.form.adventure.menu_options = document.getElementById("menu_options");
    this.form.adventure.menu_options.addEventListener("change", this.onChangeAdventure.bind(that));
    this.form.adventure.new_adventure = document.getElementById("new_adventure");
    this.form.adventure.new_adventure.onclick = this.onNewAdventure;
    this.form.adventure.admin_link = document.getElementById("admin_link");

    // Link editor elements
    this.form.link.form = document.getElementById("formLink");
    this.form.link.form.addEventListener("submit", this.onSubmitFormLink.bind(that));
    this.form.link.target_link_origin_title = document.getElementById("lblTargetLinkOrigin");
    this.form.link.target_link_title = document.getElementById("lblTargetLink");
    this.form.link.target_title = document.getElementById("target_title");
    this.form.link.target_title.addEventListener("keyup", this.onChangeLink.bind(that));
    this.form.link.source_link_origin_title = document.getElementById("lblSourceLinkOrigin");
    this.form.link.source_link_title = document.getElementById("lblSourceLink");
    this.form.link.source_title = document.getElementById("source_title");
    this.form.link.source_title.addEventListener("keyup", this.onChangeLink.bind(that));
    this.form.link.sourceLinkForm = document.getElementById("sourcelink");
    this.form.link.btnDelete = document.getElementById("btnDeleteLink");
    this.form.link.btnDelete.addEventListener("click", this.onClickDeleteLink.bind(that));
    this.form.link.btnChangeDirection = document.getElementById("btnChangeDirection");
    this.form.link.btnChangeDirection.addEventListener("click", this.onClickChangeDirection.bind(that));
    this.form.link.radioDefault = document.getElementById("radioDefault");
    this.form.link.radioDefault.addEventListener("change", this.onChangeLink.bind(that));
    this.form.link.radioBidirectional = document.getElementById("radioBidirectional");
    this.form.link.radioBidirectional.addEventListener("change", this.onChangeLink.bind(that));

    // Node editor elements
    this.form.node.form = document.getElementById("formNode");
    this.form.node.form.addEventListener("submit", this.onSubmitFormNode.bind(that));
    this.form.node.title = document.getElementById("node_title");
    this.form.node.title.addEventListener("keyup", this.onChangeNode.bind(that));
    this.form.node.textarea = document.getElementById("node_text");
    this.form.node.gallery = document.getElementById("gallery");
    this.form.node.imageCategories = document.getElementById("image_categories");
    this.form.node.imageCategories.addEventListener("change", this.onChangeImageCategory.bind(that));
    this.form.node.imagePreview = document.getElementById("preview_image");
    this.form.node.btnDeleteAudio = document.getElementById("btnDeleteAudio");
    this.form.node.btnDeleteAudio.addEventListener("click", this.onClickDeleteAudio.bind(that));
    this.form.node.btnDeleteAudioAlt = document.getElementById("btnDeleteAudioAlt");
    this.form.node.btnDeleteAudioAlt.addEventListener("click", this.onClickDeleteAudio.bind(that));
    this.form.node.btnDeleteSubtitles = document.getElementById("btnDeleteSubtitles");
    this.form.node.btnDeleteSubtitles.addEventListener("click", this.onClickDeleteSubtitles.bind(that));
    this.form.node.btnCreateNode = document.getElementById("btnCreateNode");
    this.form.node.btnCreateNode.addEventListener("click", this.onClickCreateNode.bind(that));
    this.form.node.btnCreateLink = document.getElementById("btnCreateLink");
    this.form.node.btnPreviewNode = document.getElementById("btnPreviewNode");
    this.form.node.btnPreviewNode.addEventListener("click", this.onClickPreviewNode.bind(that));
    this.form.node.btnDelete = document.getElementById("btnDeleteNode");
    this.form.node.btnDelete.addEventListener("click", this.onClickDeleteNode.bind(that));
    this.form.node.linkList = document.getElementById("linklist");
    this.form.node.subtitlesRow = document.getElementById("subtitles_row");

    // Project PS
    this.form.projectps = document.getElementById("projectps");
    this.form.node.image = document.getElementById("node_image");
    this.form.node.image.addEventListener("change", that.onChangeImagePS.bind(that));
    this.form.node.audio = document.getElementById("node_audio");
    this.form.node.audioLabel = document.getElementById("audio_label");
    this.form.node.audio.addEventListener("change", that.onChangeAudio.bind(that));
    this.form.node.audioAlt = document.getElementById("node_audio_alt");
    this.form.node.audioLabelAlt = document.getElementById("audio_label_alt");
    this.form.node.audioAlt.addEventListener("change", that.onChangeAudio.bind(that));
    this.form.node.previewImage = document.getElementById("preview_image_ps");
    this.form.node.previewVideo = document.getElementById("preview_video");
    this.form.node.imageLoader = document.getElementById("image_loader");
    this.form.node.imageLoaderLabel = document.getElementById("image_loader_label");
    this.form.node.btnDeleteImagePS = document.getElementById("btnDeleteImagePS");
    this.form.node.btnDeleteImagePS.addEventListener("click", that.onClickDeleteImagePS.bind(that));
    this.form.node.subtitles = document.getElementById("node_subtitles");
    this.form.node.subtitlesLabel = document.getElementById("subtitles_label");
    this.form.node.subtitles.addEventListener("change", that.onChangeSubtitles.bind(that));
    this.form.node.btnPlayback = document.getElementById("playback_button");
    this.form.node.btnPlayback.addEventListener("click", that.onClickPlayback.bind(that));
    this.form.node.propsEditorButton = document.getElementById("btnPropsEditor");
    this.form.node.audioVolume = document.getElementById("audio_volume");
    this.form.node.audioVolume.addEventListener("input", () => {
      this.onChangeNode();
    });

    this.form.adventure.coverImage = document.getElementById("changeCoverImage");
    this.form.adventure.coverImage.addEventListener("change", this.onChangeCoverImage.bind(that));
    this.form.adventure.deleteCoverImage = document.getElementById("deleteCoverImage");
    this.form.adventure.deleteCoverImage.addEventListener("click", this.onDeleteCoverImage.bind(that));
    this.form.adventure.fontFileUpload = document.getElementById("font_upload");
    this.form.adventure.fontFileUpload.onchange = (e) => this.onAddFontFile(e);

    document.getElementById("btnChangeNodes").onclick = () => {
      this.acceptedChangeNodes = true;
      $("#modalAlert").modal("hide");
    };

    $("#modalAlert").on("hide.bs.modal", () => {
      this.onChangeNode(null, this.acceptedChangeNodes);
      this.acceptedChangeNodes = false;
    });

    $("#modalAlert").on("show.bs.modal", () => {
      var selectedNodeIds = this.getSelectedNodeIds();
      document.getElementById("alertChangeNodes").innerText = selectedNodeIds.length > 1 ? selectedNodeIds.join(", ") : "";
    });

    // Show Egenskaper. Only for testing.
    // setTimeout(() => $("#modalProps").modal("show"), 500);
    // Config elements
    this.Props.setupDynamicElements(this.onChangeAdventure.bind(that), this.onChangeLink.bind(that), this.onChangeNode.bind(that));

    this.nodeProps_default = JSON.parse(this.Props.getEditorProps());
  }


  initTextEditor(fontList) {
    const googlefonts_href = document.getElementById("googlefontslink").href;

    const editor_styles = `
@import url('${googlefonts_href}');
p > span[style*="font-size"] { display: inline-block; }
body { font-size: 14pt; font-family: EB Garamond; }
`;

    var fontFamilyStr = loadFileFonts(document, fontList);

    const that = this;

    // Wysiwyg editor
    tinymce.init({
      selector: "#node_text",
      font_family_formats: fontFamilyStr + "Roboto=Roboto,sans-serif; " +
        "Roboto Serif=Roboto Serif,serif; " +
        "Cardo=Cardo,serif; " +
        "Shadows Into Light=Shadows Into Light,cursive; " +
        "Amatic SC=Amatic SC,cursive; " +
        "Armata=Armata,sans-serif; " +
        "Cabin=Cabin,sans-serif; " +
        "Cabin Condensed=Cabin Condensed,sans-serif; " +
        "Cormorant=Cormorant,serif; " +
        "EB Garamond=EB Garamond,serif; " +
        "Fira Sans=Fira Sans,sans-serif; " +
        "Gabriela=Gabriela,serif; " +
        "Lato=Lato,sans-serif; " +
        "Libre Baskerville=Libre Baskerville,sans-serif;" +
        "Libre Franklin=Libre Franklin,sans-serif;" +
        "Merriweather=Merriweather,serif; " +
        "Nunito=Nunito,sans-serif; " +
        "Open Sans=Open Sans,sans-serif; " +
        "Open Sans Condensed=Open Sans Condensed,sans-serif; " +
        "Oswald=Oswald,sans-serif; " +
        "Playfair Display=Playfair Display,serif; " +
        "Poppins=Poppins,sans-serif; " +
        "Roboto Condensed=Roboto Condensed,sans-serif; " +
        "Rouge Script=Rouge Script,cursive; " +
        "Saira Condensed=Saira Condensed,sans-serif; " +
        "Sriracha=Sriracha,cursive; " +
        "Ubuntu=Ubuntu,sans-serif; " +
        "Work Sans=Work Sans,sans-serif; " +
        "Zilla Slab=Zilla Slab,serif; " +
        "Barlow=Barlow,sans-serif;",
      plugins: "code",
      toolbar1: "undo redo | blocks | bold italic | fontfamily fontsize",
      toolbar2: "forecolor backcolor | lineheight | alignleft aligncenter alignright alignjustify | paste",
      font_size_formats: "6pt 8pt 10pt 12pt 14pt 16pt 18pt 25pt 36pt 48pt",
      promotion: false,
      branding: false,
      setup: (editor) => {
        editor.on('init', (e) => loadFileFonts(editor.contentWindow.document, fontList));
        editor.on("input", (e) => that.onChangeNode());
        editor.on("change", (e) => that.onChangeNode());
      },
      content_style: editor_styles,
      paste_as_text: true,
    });
  }


  lockEditor(e) {
    $("#lockEdit").modal("show");
  }
  onAlert(e) {
    $("#modalAlert").modal("show");
  }
  onSelectCoverImage(e) {
    $("#modalAlert").modal("show");
  }
  onClickSetLayoutMode(e) {
    let layoutType = e.target.value;

    if (this.currentNode) {
      this.currentNode.image_layout_type = layoutType;
    }

    // If there is an event defined, call it
    if (this.didEditNode) {
      // Pass node object
      this.didEditNode(this.currentNode);
    }
  }
  onNewAdventure(e) {
    e.preventDefault();
    didPressNewAdventure();
  }
  selectLayoutMode(layoutMode) {
    if (layoutMode == "left") this.form.node.layoutLeft.checked = true;
    if (layoutMode == "right") this.form.node.layoutRight.checked = true;
    if (layoutMode == "background") this.form.node.layoutBackground.checked = true;

    this.currentNode.image_layout_type = layoutMode;
  }
  onSubmitFormLink(e) {
    e.preventDefault();
    return false;
  }
  onSubmitFormNode(e) {
    e.preventDefault();
    return false;
  }
  // Update the adventure global fields
  updateAdventure(adventure) {
    this.form.adventure.adventure_title.value = adventure.title;
    this.form.adventure.adventure_description.value = adventure.description;

    if (adventure.category) {
      this.form.adventure.adventure_category.value = adventure.category.id;
      this.form.adventure.adventure_category.title = adventure.category.title;
    }
    if (adventure.image_id && adventure.image_id != 0) {
      this.currentAdventure.image_id = adventure.image_id;

      if (this.didSelectCoverImageInGallery) {
        this.didSelectCoverImageInGallery(adventure.image_id);
        this.form.adventure.panelReselectImage.classList.remove("d-none");
        this.form.adventure.panelSelectImage.classList.add("d-none");
      }
    } else {
      this.form.adventure.panelReselectImage.classList.add("d-none");
      this.form.adventure.deleteCoverImage.classList.remove("d-none");
    }

    if (adventure.cover_url && adventure.cover_url != "") {
      this.currentAdventure.cover_url = adventure.cover_url;
      this.form.adventure.previewCoverImage.src = adventure.cover_url;
      this.form.adventure.panelReselectImage.classList.remove("d-none");
    } else {
      this.form.adventure.panelReselectImage.classList.add("d-none");
    }

    if (this.fontsChanged) {
      this.fontsChanged = false;
      //location.reload();
    }

    this.Props.setAdventureProps(adventure.props, this.currentAdventure,
      (url, callback) => this.deleteMedia(url, () => { callback(); this.onChangeAdventure(); }));

    this.initTextEditor(this.currentAdventure.font_list);

    this.form.projectps.style.display = "";
    this.form.node.propsEditorButton.style.display = "";
    this.form.node.btnPreviewNode.dataset.toggle = "";

    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.role == 1) {
      this.form.adventure.admin_link.innerText = "Admin";
      this.form.adventure.new_adventure.hidden = false;
    } else {
      this.form.adventure.admin_link.innerText = "Mina PS";
      this.form.adventure.new_adventure.hidden = true;
    }

  }

  // Triggered whenever user changes data in adventure-editor
  onChangeAdventure() {
    // Pass values to adventure object
    this.currentAdventure.title = this.form.adventure.adventure_title.value;
    this.currentAdventure.description = this.form.adventure.adventure_description.value;

    for (var i = 0; i < this.categories.length; i++) {
      var category = this.categories[i];
      if (category.id == this.form.adventure.adventure_category.value) {
        this.currentAdventure.category = category;
        continue;
      }
    }

    this.currentAdventure.props = this.Props.getAdventureProps(this.currentAdventure);

    this.didEditAdventure(this.currentAdventure);
  }

  // Triggered whenever user changes data in node-editor
  onChangeNode(_event, acceptedChangeNodes) {
    if (this.currentNode) {
      // Pass values to node object
      this.currentNode.title = this.form.node.title.value;
      this.currentNode.text = tinymce.activeEditor.getContent();

      var selectedNodeIds = acceptedChangeNodes ? this.getSelectedNodeIds() : undefined;
      this.currentNode.props = this.Props.getEditorProps(this.currentNode, selectedNodeIds);

      this.didEditNode(this.currentNode);
    }
  }

  // Triggered whenever user changes data in link-editor
  onChangeLink(e) {
    if (this.currentLink) {
      var type = this.form.link.radioDefault.checked ? "default" : "bidirectional";
      this.showSourceLinkForm(type == "bidirectional");
      this.currentLink.source_title = this.form.link.source_title.value;
      this.currentLink.target_title = this.form.link.target_title.value;
      this.currentLink.type = type;

      this.currentLink.props = this.Props.getLinkProps();

      if (this.didEditLink) {
        this.didEditLink(this.currentLink);
      }
    }
  }
  // Triggered when user clicks delete in link-editor
  onClickDeleteImage(e) {
    e.preventDefault();

    delete this.currentNode.image_id;
    delete this.currentNode.image_layout_type;

    // If there is an event defined, call it
    if (this.didEditNode) {
      // Pass node object
      this.didEditNode(this.currentNode);
    }
  }
  // Triggered when user clicks delete image in adventure-settings
  onClickDeleteCoverImage(e) {
    e.preventDefault();

    // Toggle panels
    this.form.adventure.panelSelectImage.classList.remove("d-none");
    this.form.adventure.panelReselectImage.classList.add("d-none");

    // Remove payload/data
    if (this.currentAdventure.image_id) {
      delete this.currentAdventure.image_id;
      this.onChangeAdventure();
    }
  }
  // Triggered when user clicks delete in node-editor
  onClickDeleteNode(e) {
    e.preventDefault();

    if (this.currentNode) {
      if (this.didPressDeleteNode) {
        this.didPressDeleteNode(this.currentNode);

        // Hide editor
        this.toggle();
      }
    }
  }
  // Triggered when user clicks delete in link-editor
  onClickDeleteLink(e) {
    e.preventDefault();

    if (this.currentLink) {
      if (this.didPressDeleteLink) {
        this.didPressDeleteLink(this.currentLink);

        // Hide editor
        this.toggle();
      }
    }
  }
  onClickPlayback(e) {
    e.preventDefault();
    window.open(this.form.node.btnPlayback.href, "_blank");
  }
  onClickPreviewNode(e) {
    e.preventDefault();
    window.open(this.form.node.btnPreviewNode.href, "_blank");
    return;
  }
  onClickChangeDirection(e) {
    e.preventDefault();

    if (this.currentLink) {
      if (this.didPressChangeDirection) {
        this.didPressChangeDirection(this.currentLink);
      }
    }
  }
  // When user clicks create node
  onClickCreateNode(e) {
    e.preventDefault();

    if (this.currentNode) {
      if (this.didPressAddNode) {
        this.didPressAddNode(this.currentNode);
      }
    }
  }
  // When user clicks create hint
  onClickCreateHint(e) {
    e.preventDefault();

    if (this.currentNode) {
      if (this.didPressAddHint) {
        this.didPressAddHint(this.currentNode);
      }
    }
  }
  // When user clicks create link
  onClickCreateLink(e) {
    // Get target & source node
    var targetNodeID = parseInt(e.target.id);
    var sourceNodeID = this.currentNode.node_id;

    // Pass to delegate
    this.didPressAddLink(sourceNodeID, targetNodeID);

    // Update links
    this.updateLinks();
    this.showNode(this.currentNode);
  }
  toggle(state) {
    if (state == undefined) this.showNodeFirstTime = true;

    if (this.nodeEditorRootElement) {
      this.nodeEditorRootElement.style.display = state == "nodes" ? "" : "none";
    }

    if (this.linkEditorRootElement) {
      this.linkEditorRootElement.style.display = state == "edges" ? "" : "none";
    }

    if (this.placeholderElement) {
      this.placeholderElement.style.display = state == "" || state == null ? "" : "none";
    }
  }
  editNode(nodeData, isRemoveable) {
    const changed = this.Props.selectNode(nodeData);
    if (changed) {
      this.onChangeAdventure();
      return;
    }

    this.showNode(nodeData);
    this.updateLinks();
    this.canDelete(isRemoveable);
    this.toggle("nodes");
  }
  selectNode(nodeData) {
    const changed = this.Props.selectNode(nodeData);
    if (changed) {
      this.onChangeAdventure();
    }
  }
  editLink(linkData, isRemoveable, sourceNode, targetNode) {
    this.showLink(linkData, sourceNode, targetNode);
    this.canDeleteLink(isRemoveable);
    this.toggle("edges");
  }
  clear() {
    var nodeEditor = document.getElementById("node");
    nodeEditor.style.display = "none";
    this.currentNode = null;
  }
  showNode(node) {
    this.currentNode = node;
    this.form.node.title.value = node.title;

    var ordered_link_ids = null;
    var propsObj = null;
    if (node.props) {
      propsObj = this.Props.setEditorProps(node, this.nodeProps_default);
      ordered_link_ids = propsObj.ordered_link_ids;
    } else {
      // New node, get current settings
      node.props = this.Props.getEditorProps();
      ordered_link_ids = undefined;
    }

    this.Props.setEditorButtonList(node, ordered_link_ids);

    this.form.node.subtitlesRow.hidden = true;

    this.resetAudio();
    if (this.currentNode.audio_url) this.form.node.audioLabel.innerHTML = this.getFilePart(this.currentNode.audio_url);
    this.resetAudioAlt();
    if (this.currentNode.audio_url_alt) this.form.node.audioLabelAlt.innerHTML = this.getFilePart(this.currentNode.audio_url_alt);
    this.resetSubtitles();
    if (this.currentNode.subtitles_url) this.form.node.subtitlesLabel.innerHTML = this.getFilePart(this.currentNode.subtitles_url);

    this.resetImage();
    var image_url = this.currentNode.image_url;
    if (image_url) {
      this.form.node.previewImage.src = image_url;
      this.form.node.previewImage.classList = "";
      this.form.node.imageLoaderLabel.innerHTML = this.getFilePart(image_url);
      this.form.node.previewVideo.src = image_url;

      if (image_url.includes(".mp4"))
        this.form.node.subtitlesRow.hidden = false;
    }

    const url = new URL(this.form.node.btnPreviewNode.href);
    url.search = "nodeId=" + node.node_id;
    this.form.node.btnPreviewNode.href = url.href;

    var nodetext = propsObj?.editorVersion > "1.0.0" ? node.text : markDownText(node.text);
    tinymce.activeEditor.setContent(nodetext);
  }
  showLink(link, sourceNode, targetNode) {
    this.currentLink = link;
    var type = this.currentLink.type;
    this.form.link.radioDefault.checked = type == "default";
    this.form.link.radioBidirectional.checked = type == "bidirectional";
    this.showSourceLinkForm(type == "bidirectional");

    // Source link
    this.form.link.source_link_origin_title.textContent = targetNode.title;
    this.form.link.source_link_title.textContent = sourceNode.title;
    this.form.link.source_title.value = this.currentLink.source_title;
    this.form.link.source_title.placeholder = sourceNode.title;

    // Target link
    this.form.link.target_link_origin_title.textContent = sourceNode.title;
    this.form.link.target_link_title.textContent = targetNode.title;
    this.form.link.target_title.value = this.currentLink.target_title;
    this.form.link.target_title.placeholder = targetNode.title;

    this.Props.setLinkProps(link.props, this.getAllNodeIds());
  }
  showSourceLinkForm(isVisible) {
    this.form.link.sourceLinkForm.style.display = isVisible ? "" : "none";
    this.form.link.btnChangeDirection.style.display = isVisible ? "none" : "";
  }
  canDelete(canDelete) {
    if (this.form.node.btnDelete) {
      this.form.node.btnDelete.disabled = !canDelete;
      this.form.node.btnDelete.style.display = canDelete ? "" : "none";
    }
  }
  canDeleteLink(canDelete) {
    if (this.form.link.btnDeleteLink) {
      this.form.link.btnDeleteLink.disabled = !canDelete;
      this.form.link.btnDeleteLink.style.display = canDelete ? "" : "none";
    }
  }
  updateLinks() {
    // Remove all existing links
    while (this.form.node.linkList.firstChild) {
      this.form.node.linkList.removeChild(this.form.node.linkList.firstChild);
    }

    var targets = [];
    if (this.getTargetsByNode) {
      targets = this.getTargetsByNode(this.currentNode);
    }

    let that = this;

    // Create new links
    for (var i = 0; i < targets.length; i++) {
      var target = targets[i];
      var btn = document.createElement("a");
      btn.className = "dropdown-item";
      btn.id = target.node_id;
      btn.node = target.node_id;
      var t = document.createTextNode("#" + target.node_id + " - " + target.title);
      btn.appendChild(t);
      btn.addEventListener("click", that.onClickCreateLink.bind(that));
      this.form.node.linkList.appendChild(btn);
    }
  }
  updateImageCategories(categories) {
    // Remove existing categories
    while (this.form.node.imageCategories.firstChild) {
      this.form.node.imageCategories.removeChild(this.form.node.imageCategories.firstChild);
    }

    if (categories == null) return;

    var defaultOption = document.createElement("option");
    defaultOption.appendChild(document.createTextNode("- Välj kategori -"));
    defaultOption.selected = true;
    this.form.node.imageCategories.appendChild(defaultOption);

    for (var i = 0; i < categories.length; i++) {
      var category = categories[i];
      var opt = document.createElement("option");
      opt.appendChild(document.createTextNode(category.title));
      opt.value = category.id;
      this.form.node.imageCategories.appendChild(opt);
    }
  }
  onChangeImageCategory(e) {
    // Tell model to load images in category
    if (this.didChangeImageCategory) {
      this.didChangeImageCategory(e.target.value);
    }
  }
  updateImages(images) {
    // Remove existing images from gallery
    while (this.form.node.gallery.firstChild) {
      this.form.node.gallery.removeChild(this.form.node.gallery.firstChild);
    }

    if (images == null) return;

    for (var i = 0; i < images.length; i++) {
      var image = images[i];
      var card = document.createElement("div");
      var link = document.createElement("a");
      var img = document.createElement("img");

      img.className = "img-fluid img-thumbnail";
      img.src = image.thumb_url;
      img.id = image.id;

      link.className = "d-block mb-2 h-50";
      link.href = "#";
      link.appendChild(img);
      let that = this;
      link.addEventListener("click", this.didSelectImage.bind(that));

      card.className = "col-lg-3 col-md-4 col-6";
      card.appendChild(link);

      this.form.node.gallery.appendChild(card);
    }
  }
  // User has selected an image in the gallery
  didSelectImage(e) {
    $("#modalImageBank").modal("hide");

    let imageID = parseInt(e.target.id);

    // The galleryMode-property denotes if the image selected was for the current node
    // or for the current adventure
    if (this.galleryMode === "adventure") {
      this.didSelectCoverImage(imageID);
    }

    if (this.galleryMode === "node") {
      this.didSelectNodeImage(imageID);
    }
  }
  // Invoked when user selects an image in the node-editor
  didSelectNodeImage(imageID) {
    if (this.didSelectImageInGallery) {
      this.didSelectImageInGallery(imageID);
    }

    if (this.currentNode) {
      this.currentNode.image_id = imageID;
      if (!this.currentNode.image_layout_type) {
        this.currentNode.image_layout_type = "left";
      }
    }

    this.selectLayoutMode(this.currentNode.image_layout_type);

    // If there is an event defined, call it
    if (this.didEditNode) {
      if (this.currentNode) {
        // Pass node object
        this.didEditNode(this.currentNode);
      }
    }
  }
  // Invoked when user selects an image in the adventure-settings
  didSelectCoverImage(imageID) {
    if (this.didSelectCoverImageInGallery) {
      this.didSelectCoverImageInGallery(imageID);
    }

    // Pass image_id to adventure object property
    if (this.currentAdventure) {
      this.currentAdventure.image_id = imageID;
    }

    // If there is an adventure-update callback defined, call it
    this.onChangeAdventure();

    this.form.adventure.panelSelectImage.classList.add("d-none");
    this.form.adventure.panelReselectImage.classList.remove("d-none");
  }
  setSelectedImage(image) {
    this.form.node.previewImage.src = image.thumb_url;
    if (image.author && image.author.length > 0) {
      this.form.node.previewImage.alt = "Foto av " + image.author;
    } else {
      this.form.node.previewImage.alt = "";
    }
  }
  setSelectedCoverImage(image) {
    this.form.adventure.previewCoverImage.src = image.thumb_url;
    if (image.author && image.author.length > 0) {
      this.form.adventure.previewCoverImage.alt = "Foto av " + image.author;
    } else {
      this.form.adventure.previewCoverImage.alt = "";
    }
  }
  updateCategories(categories) {
    if (categories == null) return;
    this.categories = categories;

    // Remove existing categories
    while (this.form.adventure.adventure_category.firstChild) {
      this.form.adventure.adventure_category.removeChild(this.form.adventure.adventure_category.firstChild);
    }

    // Create new select options
    for (var i = 0; i < categories.length; i++) {
      var category = categories[i];
      var option = document.createElement("option");
      option.value = category.id;
      option.innerHTML = category.title;
      this.form.adventure.adventure_category.appendChild(option);
    }
  }
  // Triggered whenever user uploads a audiofile
  onChangeAudio(e) {
    if (!e.target.files) return;

    var file = e.target.files[0];
    if (!file) return;

    // Allowed types
    var mime_types = ["audio/mpeg", "audio/mp4", "audio/aac", "audio/aacp", "audio/wav", "audio/x-m4a"];

    // Validate MIME type
    if (mime_types.indexOf(file.type) == -1) {
      e.target.value = "";
      alert("Felaktig filtyp. Välj en fil som är MP3, MP4, M4A, AAC, AACP istället.");
      return;
    }

    // Max 2 Mb allowed
    if (file.size > 20 * 1024 * 1024) {
      e.target.value = "";
      window.alert("Filen får inte överstiga 20 MB.");
      return;
    }

    var that = this;
    if (this.didEditAudio) {
      var data = new FormData();
      data.append("media", file);

      this.didEditAudio(data, function (data) {
        if (data.url) {
          let prevUrl;
          if (e.target.id == "node_audio_alt") {
            prevUrl = that.currentNode.audio_url_alt;
            that.currentNode.audio_url_alt = data.url;
          } else {
            prevUrl = that.currentNode.audio_url;
            that.currentNode.audio_url = data.url;
          }

          that.currentNode.props = that.Props.getEditorProps(that.currentNode);
          that.onChangeNode();
          that.showNode(that.currentNode);
          that.deleteMedia(prevUrl);
        } else {
          window.alert("Något gick fel i uppladningen, försök igen.");
        }
      });
    }
  }
  onChangeCoverImage(e) {
    if (this.form.adventure.coverImage.files && this.form.adventure.coverImage.files[0]) {
      var file = this.form.adventure.coverImage.files[0];

      // Allowed types
      var mime_types = ["image/jpeg", "image/png", "image/gif"];

      // Validate MIME type
      if (mime_types.indexOf(file.type) == -1) {
        this.form.adventure.coverImage.value = "";
        alert("Felaktig filtyp. Välj en fil som är JPEG, PNG, GIF istället.");
        return;
      }

      // Max 1 Mb allowed
      if (file.size > 1 * 1024 * 1024) {
        this.form.adventure.coverImage.value = "";
        window.alert("Bilden får inte överstiga 1 MB.");
        return;
      }

      var that = this;
      if (this.didEditImage) {
        var data = new FormData();
        data.append("media", file);

        this.didEditImage(data, function (response) {
          if (response.url) {
            const previousUrl = that.currentAdventure.cover_url;
            that.currentAdventure.cover_url = response.url;
            that.onChangeAdventure();

            that.form.adventure.previewCoverImage.src = response.url;
            that.form.adventure.previewCoverImage.classList = "";

            // Delete old image
            that.deleteMedia(previousUrl);
          } else {
            window.alert("Något gick fel i uppladningen, försök igen.");
          }
        });
      }
    }
  }

  // Triggered whenever user uploads an image
  onChangeImagePS(e) {
    if (this.form.node.image.files && this.form.node.image.files[0]) {
      var file = this.form.node.image.files[0];

      // Allowed types
      var mime_types = ["image/jpeg", "image/png", "image/gif", "video/mp4"];

      // Validate MIME type
      if (mime_types.indexOf(file.type) == -1) {
        this.form.node.image.value = "";
        alert("Felaktig filtyp. Välj en fil som är JPEG, PNG, GIF eller MP4 istället.");
        return;
      }

      // Max 100 Mb allowed
      if (file.size > 100 * 1024 * 1024) {
        this.form.node.image.value = "";
        window.alert("Bilden får inte överstiga 100 MB.");
        return;
      }

      // show throbber
      this.form.node.imageLoader.classList = "";

      var that = this;
      if (this.didEditImage) {
        var data = new FormData();
        data.append("media", file);

        this.didEditImage(data, function (response) {
          if (response.url) {
            const previousUrl = that.currentNode.image_url;
            that.currentNode.image_url = response.url;
            that.onChangeNode();
            that.showNode(that.currentNode);

            that.form.node.previewImage.src = response.url;
            that.form.node.previewVideo.src = response.url;
            that.form.node.previewImage.classList = "";

            // hide throbber
            that.form.node.imageLoader.classList = "hidden";

            // Delete old image
            that.deleteMedia(previousUrl);
          } else {
            window.alert("Något gick fel i uppladningen, försök igen.");
          }
        });
      }
    }
  }

  handleFileUpload(target, mime_types, type_err_msg, max_size, size_err_msg, uploadFinished) {
    if (!target.files || !target.files[0])
      return;

    var file = target.files[0];

    if (mime_types.length > 0 && mime_types.indexOf(file.type) == -1) {
      target.value = "";
      alert(type_err_msg);
      return;
    }

    if (file.size > max_size) {
      target.value = "";
      window.alert(size_err_msg);
      return;
    }

    var data = new FormData();
    data.append("media", file);

    app.model.uploadMedia(data, (response) => {
      var url = response.url;
      if (!url) {
        window.alert("Något gick fel i uppladningen, försök igen.");
        return;
      }
      uploadFinished(url);
    });
  }

  onChangeSubtitles(e) {
    const that = this;
    var handler = (url) => {
      const prevUrl = url;
      that.currentNode.subtitles_url = url;
      that.currentNode.props = that.Props.getEditorProps(that.currentNode);
      that.onChangeNode();
      that.showNode(that.currentNode);
      that.deleteMedia(prevUrl);
    }

    this.handleFileUpload(
      e.target,
      ["text/vtt"],
      "Felaktig filtyp. Du kan endast välja .vtt (WebVTT).",
      1024 * 1024,
      "Filens storlek får inte överstiga 1 Kb.",
      handler
    );
  }

  onAddFontFile(e) {
    const that = this;
    var handler = (url) => {
      that.currentAdventure.font_list.push(url);
      that.fontsChanged = true;
      that.onChangeAdventure();
    }

    this.handleFileUpload(
      e.target,
      [],
      "Felaktig filtyp. Du kan endast välja fontfiler.",
      10 * 1024 * 1024,
      "Filens storlek får inte överstiga 10 Kb.",
      handler
    );
  }


  resetCoverImage() {
    this.form.adventure.coverImage.value = ""; // clear any previous file name
    this.form.adventure.previewCoverImage.src = "";
    this.form.adventure.previewCoverImage.classList = "empty";
    this.form.adventure.panelReselectImage.classList.add("d-none");
  }
  resetImage() {
    this.form.node.image.value = ""; // clear any previous file name
    this.form.node.previewImage.src = "";
    this.form.node.previewVideo.src = "";
    this.form.node.previewImage.classList = "empty";
    this.form.node.imageLoaderLabel.innerHTML = "Ladda upp bild/film";
    this.form.node.subtitlesRow.hidden = true;
  }
  resetAudio() {
    this.form.node.audioLabel.innerHTML = "Ladda upp ljudfil";
    this.form.node.audio.value = "";
  }
  resetAudioAlt() {
    this.form.node.audioLabelAlt.innerHTML = "Ladda upp extraljud";
    this.form.node.audioAlt.value = "";
  }
  resetSubtitles() {
    this.form.node.subtitlesLabel.innerHTML = "Ladda upp undertexter";
    this.form.node.subtitles.value = "";
  }

  onClickDeleteImagePS(e) {
    e.preventDefault();

    if (this.currentNode.image_url) {
      var that = this;
      this.deleteMedia(this.currentNode.image_url, () => {
        that.resetImage();
        delete that.currentNode.image_url;
      });
    }
  }

  onDeleteCoverImage(e) {
    e.preventDefault();

    const url = this.currentAdventure.cover_url;
    if (url) {
      var that = this;
      this.deleteMedia(url, () => {
        that.currentAdventure.cover_url = undefined;
        that.resetCoverImage();
        that.onChangeAdventure();
      });
    }
  }

  onClickDeleteAudio(e) {
    e.preventDefault();

    const id = e.target.id == "btnDeleteAudioAlt" ? "audio_url_alt" : "audio_url";

    if (this.currentNode[id]) {
      var that = this;
      this.deleteMedia(this.currentNode[id], () => {
        if (e.target.id == "btnDeleteAudioAlt") that.resetAudioAlt();
        else that.resetAudio();

        delete that.currentNode[id];
        that.currentNode.props = that.Props.getEditorProps(that.currentNode);
      });
    }
  }

  onClickDeleteSubtitles(e) {
    e.preventDefault();

    if (this.currentNode.subtitles_url) {
      var that = this;
      this.deleteMedia(this.currentNode.subtitles_url, () => {
        that.resetSubtitles();
        that.currentNode.subtitles_url = undefined;
        that.currentNode.props = that.Props.getEditorProps(that.currentNode);
      });
    }
  }

  getFilePart(url) {
    return url.substring(url.lastIndexOf("/") + 1);
  }

  deleteMedia(url, callback) {
    if (url && this.didPressDeleteMedia) {
      var that = this;
      this.didPressDeleteMedia(this.getFilePart(url), function (status) {
        if (status.result == "success") {
          if (callback) callback();
          // send new data
          that.onChangeNode();
        } else {
          window.alert("Något gick fel vid borttagning av filen, försök igen.");
        }
      });
    }
  }
}


