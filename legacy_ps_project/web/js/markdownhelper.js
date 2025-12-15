var markDownIt;

function markDownText(text) {
  if (markDownIt) return markDownIt.render(text);
  else return text;
}

function markDownTextForView(text) {
  // Escape list characters
  const regex0 = /^([0-9]+)(\.|\))/gm;
  const regex1 = /^(\* |\- )/gm;
  text = text.replace(regex0, "$1\\$2").replace(regex1, "• ");

  if (markDownIt) return markDownIt.render(text);
  else return text;
}


// https://github.com/crookedneighbor/markdown-it-link-target
function markdownitLinkTarget(md, config) {
  config = config || {};

  var defaultRender = md.renderer.rules.link_open || this.defaultRender;
  var target = config.target || "_blank";

  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    // If you are sure other plugins can't add `target` - drop check below
    var aIndex = tokens[idx].attrIndex("target");

    if (aIndex < 0) {
      tokens[idx].attrPush(["target", target]); // add new attribute
    } else {
      tokens[idx].attrs[aIndex][1] = target; // replace value of existing attr
    }

    // pass token to default renderer.
    return defaultRender(tokens, idx, options, env, self);
  };
}

markdownitLinkTarget.defaultRender = function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options);
};

if (window.markdownit) {
  markDownIt = window.markdownit("commonmark", { breaks: true });
  markDownIt.use(markdownitLinkTarget);
}
