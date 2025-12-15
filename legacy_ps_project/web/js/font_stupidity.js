
function loadFileFonts(doc, fonts)
{
    if (!fonts)
        fonts = [];
    fonts = ["/static/img/ConduitMedium.woff2", "/static/img/ConduitLight.woff2", ...fonts];
    
    const style = doc.createElement("style");
    var fontFamilies = "";
    var styleStr = "";

    for (var url of fonts) {
        var fontName = url.split('/').pop().replace(/\.[^/.]+$/, '')
        styleStr += `@font-face { font-family: "${fontName}"; src: url("${url}"); }\n`;
        styleStr += `#background[data-props~="xfont-${fontName}"] { font-family: "${fontName}"; }`
        fontFamilies = `${fontName}=${fontName};` + fontFamilies
    }

    style.textContent = styleStr;
    doc.head.appendChild(style);

    return fontFamilies;    
}