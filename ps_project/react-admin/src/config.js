const APIPORT = window.location.hostname === "localhost" ? 8080 : process.env.REACT_APP_HOST_API_PORT;
const BASEURL = window.location.protocol + "//" + window.location.hostname + (APIPORT === "" ? "" : ":" + APIPORT);
const APIURL = BASEURL + "/api";
const ADMINAPIURL = BASEURL + "/api/admin";

export default {
  BASEURL,
  APIURL,
  ADMINAPIURL,
};
