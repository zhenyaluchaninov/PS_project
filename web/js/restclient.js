/**
 * Restclient
 * Performs communication with REST API server (via XMLHttpRequest)
 */
(function (window) {
  "use strict";

  function Restclient(host, path, token) {
    var restHost = host || location.host;
    this.baseURL = location.protocol + "//" + restHost + "/" + path;
    this.token = token;
    // console.log("Creating Restclient", this.baseURL);
  }

  /**
   * Perform request
   * Request assumes communication is performed with JSON
   * @param  {string}    method    [Method to be used (GET/POST/PUT/DELETE)]
   * @param  {string}    url        [Relative path to endpoint (ie. "/path")]
   * @param  {object}    payload    [JSON object containing payload]
   * @param  {function}  callback  [Callback method that accepts a payload JSON object]
   * @param  {boolean}    secure    [Determines if JWT-token will be passed with the request]
   * @param  {number}    cachemode [Cachemode to be used in methods (0 to turn off cache)]
   */
  Restclient.prototype.request = function (method, url, payload, callback, secure = false, cachemode = 0) {
    var targetURL = this.baseURL + url;
    var xhr = new XMLHttpRequest();
    xhr.open(method, targetURL, true);

    var isFileUpload = payload instanceof FormData;

    if (!isFileUpload) {
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.responseType = "json";
      if (secure) {
        xhr.setRequestHeader("Authorization", this.token);
      }
      if (cachemode == 0) {
        xhr.setRequestHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }
    }
    xhr.addEventListener("load", function (e) {
      var payload = {};
      payload.response = this.response;
      payload.status = this.status;

      if (isFileUpload) {
        payload.response = JSON.parse(payload.response);
      }

      callback(payload);
    });
    xhr.addEventListener("error", function (e) {
      console.log("Error");
      callback(e);
    });
    xhr.addEventListener("abort", function (e) {
      callback(e);
    });
    if (payload != null) {
      if (isFileUpload) {
        // send raw
        xhr.send(payload);
      } else {
        xhr.send(JSON.stringify(payload));
      }
    } else {
      xhr.send();
    }
  };

  /**
   * Perform HTTP GET
   * @param  {string}    url    [Relative path to endpoint (ie. "/path")]
   * @param  {object}    payload  [JSON object containing payload]
   * @param  {function}  callback [Callback method that accepts a payload JSON object]
   * @param  {boolean}    secure   [Determines if JWT-token will be passed with the request]
   */
  Restclient.prototype.get = function (url, payload, callback, secure) {
    this.request("GET", url, payload, callback, secure);
  };

  /**
   * Perform HTTP POST
   * @param  {string}    url    [Relative path to endpoint (ie. "/path")]
   * @param  {object}    payload  [JSON object containing payload]
   * @param  {function}  callback [Callback method that accepts a payload JSON object]
   * @param  {boolean}    secure   [Determines if JWT-token will be passed with the request]
   */
  Restclient.prototype.post = function (url, payload, callback, secure) {
    this.request("POST", url, payload, callback, secure);
  };

  /**
   * Perform HTTP PUT
   * @param  {string}    url    [Relative path to endpoint (ie. "/path")]
   * @param  {object}    payload  [JSON object containing payload]
   * @param  {function}  callback [Callback method that accepts a payload JSON object]
   * @param  {boolean}    secure   [Determines if JWT-token will be passed with the request]
   */
  Restclient.prototype.put = function (url, payload, callback, secure) {
    this.request("PUT", url, payload, callback, secure);
  };

  /**
   * Perform HTTP DELETE
   * @param  {string}    url    [Relative path to endpoint (ie. "/path")]
   * @param  {function}  callback [Callback method that accepts a payload JSON object]
   * @param  {boolean}    secure   [Determines if JWT-token will be passed with the request]
   */
  Restclient.prototype.delete = function (url, callback, secure) {
    this.request("DELETE", url, {}, callback, secure);
  };

  // Export to window
  window.Restclient = Restclient;
})(window);
