import constants from "../../config";

const Options = (method, body) => {
  const type = "application/json";
  return {
    method: method,
    headers: {
      Accept: type,
      "Content-Type": type,
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: body,
  };
};

const copyAdventureBySlug = (adventure) =>
  new Promise(function (resolve, reject) {
    const opts = Options("PUT", JSON.stringify(adventure));

    fetch(constants.ADMINAPIURL + "/copy/" + adventure.slug, opts)
      .then((response) => response.text())
      .then((data) => {
        console.log("[adventure-middleware] COPY performed", data, data.error);
        if (data.error) throw new Error(data.error);
        if (data) {
          resolve(data);
          return;
        }
      })
      .catch((error) => {
        reject(error.message);
      });
  });

const exportAdventure = (slug) =>
  new Promise(function (resolve, reject) {
    const url = constants.ADMINAPIURL + "/exportAdventure/" + slug;
    fetch(url, Options("GET"))
      .then((response) => response.blob())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        if (data) {
          resolve(data);
          return;
        }
        reject(data);
      })
      .catch((error) => {
        reject(error.message);
      });
  });

const importAdventure = (file) =>
  new Promise(function (resolve, reject) {
    const opts = Options("PUT", file);

    fetch(constants.ADMINAPIURL + "/importAdventure/", opts)
      .then((response) => response.json())
      .then((data) => {
        console.log("[adventure-middleware] IMPORT performed", data.error);
        if (data.error) throw new Error(data.error);
        if (data) {
          resolve(data);
          return;
        }
      })
      .catch((error) => {
        reject(error.message);
      });
  });

const getAdventureByID = (adventureID) =>
  new Promise(function (resolve, reject) {
    fetch(constants.ADMINAPIURL + "/adventure/" + adventureID, Options("GET"))
      .then((response) => response.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        if (data) {
          resolve(data);
          return;
        }
        reject(data);
      })
      .catch((error) => {
        reject(error.message);
      });
  });

const getAdventureBySlug = (slug) =>
  new Promise(function (resolve, reject) {
    fetch(constants.APIURL + "/adventure/" + slug, Options("GET"))
      .then((response) => response.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        if (data) {
          resolve(data);
          return;
        }
        reject(data);
      })
      .catch((error) => {
        reject(error.message);
      });
  });

const updateAdventure = (adventure) =>
  new Promise(function (resolve, reject) {
    console.log("[adv-middleware] Updating adventure", adventure);
    const adventureId = adventure.id;

    const opts = Options("PUT", JSON.stringify(adventure));

    fetch(constants.ADMINAPIURL + "/adventure/" + adventureId, opts)
      .then((response) => response.json())
      .then((data) => {
        console.log("[adventure-middleware] PUT performed", data);
        if (data.error) throw new Error(data.error);
        if (data) {
          resolve(data);
          return;
        }
      })
      .catch((error) => {
        reject(error.message);
      });
  });

const deleteAdventure = (adventureId) =>
  new Promise(function (resolve, reject) {
    console.log("Deleting adventure", adventureId);

    fetch(constants.ADMINAPIURL + "/adventure/" + adventureId, Options("DELETE"))
      .then((response) => response.json())
      .then((data) => {
        console.log("DELETE performed", data);
        if (data.error) throw new Error(data.error);
        if (data) {
          resolve(data);
          return;
        }
        reject(data);
      })
      .catch((error) => {
        console.log("Error while deleting adventure", error);
        reject(error.message);
      });
  });

  
const getStatisticsByDates = (adventureId, startTime, stopTime) =>
  new Promise(function (resolve, reject) {

    const data = {
      startTime: startTime,
      stopTime: stopTime,
      adventureId: adventureId,
    }

    const opts = Options("PUT", JSON.stringify(data));

    fetch(constants.ADMINAPIURL + "/statistics/", opts)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        if (data) {
          resolve(data);
          return;
        }
        reject(data);
      })
      .catch((error) => {
        console.log("Error while getting adventure statistics", error);
        reject(error.message);
      });
  });
  

export default {
  copyAdventureBySlug,
  exportAdventure,
  importAdventure,
  getAdventureByID,
  getAdventureBySlug,
  updateAdventure,
  deleteAdventure,
  getStatisticsByDates,
};
