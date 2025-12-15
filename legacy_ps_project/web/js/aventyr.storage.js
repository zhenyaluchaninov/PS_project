function Storage() {
  // Restclient used to fetch and pass data to server
  const token = localStorage.getItem("token");
  this.restclient = new Restclient(null, "api", token);
  this.autosavetimerinterval = 250;

  this.currentAdventure = {};
  this.currentAdventure.hasUnsyncedChanges = false;
}

Storage.prototype.isLoggedIn = function () {
  return localStorage.getItem("token") != undefined;
};

Storage.prototype.load = function (guid, edit, callback) {
  // Fetch data for adventure with slug / guid
  let that = this;
  var url = "/adventure/" + guid + (edit ? "/edit" : "");
  this.restclient.get(
    url,
    null,
    function (payload) {
      var error = false;
      var data = payload.response;
      if (payload.status < 300) {
        // Store data in localStorage
        that.set(guid, data, false);
      } else error = true;

      // Pass data back to caller
      callback(data, error);
    },
    true
  );
};

Storage.prototype.save = function (guid, payload, callback) {
  // Serialize data
  var data = JSON.stringify(payload);

  // Store in localstorage
  this.set(guid, data, true);

  var url = "/adventure/" + guid;
  this.restclient.put(url, payload, callback, true);
};

Storage.prototype.set = function (guid, payload, hasChanges) {
  // If the loaded adventure doesnt have a slug, dont cache it.
  if (payload.slug == null || payload.slug.length == 0) {
    return;
  }

  var data = JSON.stringify(payload);
  localStorage.setItem(guid, data);

  this.currentAdventure.payload = payload;
  this.currentAdventure.guid = guid;

  if (hasChanges) {
    this.currentAdventure.hasUnsyncedChanges = true;
    this.update();
  }
};

Storage.prototype.update = function () {
  if (this.autosavetimerinterval == 0) this.automaticUpdate();
  else {
    let that = this;
    if (this.currentAdventure.timer) {
      clearTimeout(this.currentAdventure.timer);
    }
    this.currentAdventure.timer = setTimeout(function () {
      that.automaticUpdate();
    }, this.autosavetimerinterval);
  }
};

Storage.prototype.automaticUpdate = function () {
  let that = this;
  this.save(this.currentAdventure.guid, this.currentAdventure.payload, function (result) {
    that.currentAdventure.hasUnsyncedChanges = false;
    if (that.didSave) that.didSave(result);
  });
};

Storage.prototype.exists = function (guid) {
  return !(localStorage.getItem(guid) === null);
};

Storage.prototype.getCategories = function (callback) {
  var url = "/categories";
  this.restclient.get(
    url,
    null,
    function (result) {
      callback(result.response);
    },
    true
  );
};

Storage.prototype.getImageCategories = function (callback) {
  var url = "/images/categories";
  this.restclient.get(
    url,
    null,
    function (result) {
      callback(result.response);
    },
    false
  );
};

Storage.prototype.getImagesInCategory = function (categoryID, callback) {
  var url = "/images/category/" + categoryID;
  this.restclient.get(
    url,
    null,
    function (result) {
      callback(result.response);
    },
    false
  );
};

Storage.prototype.getImage = function (imageID, callback) {
  var url = "/images/" + imageID;
  this.restclient.get(
    url,
    null,
    function (result) {
      callback(result.response);
    },
    false
  );
};

Storage.prototype.get = function (guid) {
  if (!this.exists(guid)) {
    return nil;
  }

  var data = JSON.parse(localStorage.getItem(guid));
  return data;
};

Storage.prototype.list = function () {
  var values = [];
  keys = Object.keys(localStorage);
  i = keys.length;

  while (i--) {
    var item = {};
    item.guid = keys[i];
    if (item.guid == "token") continue;
    item.data = JSON.parse(localStorage.getItem(keys[i]));
    values.push(item);
  }

  const limitAdventureList = 20;
  var sorted = values.sort((a, b) => (a.data.updated_at < b.data.updated_at ? 1 : -1));
  var sliced = sorted.slice(limitAdventureList);
  sliced.forEach((x) => localStorage.removeItem(x.guid));

  return sorted.slice(0, limitAdventureList);
};

Storage.prototype.deleteMedia = function (modelGUID, mediaURL, callback) {
  var url = "/media/" + modelGUID + "/" + mediaURL;
  var that = this;
  this.restclient.delete(
    url,
    function (result) {
      that.currentAdventure.hasUnsyncedChanges = false;
      callback(result.response);
    },
    true
  );
};

Storage.prototype.uploadMedia = function (payload, callback) {
  var url = "/media";
  var that = this;
  this.restclient.post(
    url,
    payload,
    function (result) {
      that.currentAdventure.hasUnsyncedChanges = false;
      callback(result.response);
    },
    true
  );
};

Storage.prototype.reportAdventure = function (guid, payload, callback) {
  var url = "/adventure/" + guid + "/report";
  this.restclient.post(
    url,
    payload,
    function (result) {
      callback(result.response);
    },
    false
  );
};

Storage.prototype.setPlayerStatistics = function (guid, nodeId, callback) {
  var url = "/statistics/" + guid + "/" + nodeId;
  this.restclient.get(
    url,
    null,
    function (result) {
      callback(result.response);
    },
    false
  );
};

Storage.prototype.newAdventure = function (callback) {
  var url = "/newAdventure";
  this.restclient.get(
    url,
    null,
    function (result) {
      callback(result.response);
    },
    true
  );
};

