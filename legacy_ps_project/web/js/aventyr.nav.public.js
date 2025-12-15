// DOM Entrypoint
document.addEventListener("DOMContentLoaded", onLoadNav);

// App root object
var page = window.page || {};
window.page = page;

function onLoadNav() {

  page.storage = new Storage();

  // Get reference to key elements
  page.form = {};
  page.form.navigation = {};
  page.form.navigation.edit_adventure = document.getElementById('btnEdit');
  page.form.navigation.create_adventure = document.getElementById('btnCreate');
  page.form.navigation.archive_list = document.getElementById("dropdown_adventures_edit");

  updateArchiveList();
}

function updateArchiveList() {
  // Check if dropdown exists
  if (page.form.navigation.archive_list == null) return;
  if (page.form.navigation.edit_adventure == null) return;

  // Get cached adventures
  list = page.storage.list();
  // console.log("List", list);

  // Remove all entries in dropdown
  while (page.form.navigation.archive_list.firstChild) {
    page.form.navigation.archive_list.removeChild(page.form.navigation.archive_list.firstChild);
  }

  var itemCount = 0;

  // Create new links
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (item.data == null) continue;
    var data = item.data;
    var title = data.title;
    if (title === undefined) continue;
    if (title.length == 0) {
      title = "Namnlöst äventyr";
    } else {
      title = shorten(title, 33, "...");
    }

    var url = "/redigera/" + data.slug;

    var link = document.createElement("a");
    link.className = "dropdown-item";
    link.href = url;

    var icon = document.createElement("i");
    var iconClass = "text-secondary fa fa-"
    if (data.category != null) {
      iconClass += data.category.icon;
    } else {
      iconClass += "tag";
    }
    icon.className = iconClass;
    link.appendChild(icon);

    var t = document.createTextNode(" " + title);
    link.appendChild(t);

    page.form.navigation.archive_list.appendChild(link);
    itemCount++;
  }

  // Enable/disable dropdown if there are no adventures cached
  if ((list.length > 0) && (itemCount > 0)) {
    page.form.navigation.edit_adventure.classList.toggle("d-none");
  }
}

function shorten(text, maxLength, delimiter, overflow) {
  delimiter = delimiter || "&hellip;";
  overflow = overflow || false;
  var ret = text;
  if (ret.length > maxLength) {
    var breakpoint = overflow ? maxLength + ret.substr(maxLength).indexOf(" ") : ret.substr(0, maxLength).lastIndexOf(" ");
    ret = ret.substr(0, breakpoint) + delimiter;
  }
  return ret;
}