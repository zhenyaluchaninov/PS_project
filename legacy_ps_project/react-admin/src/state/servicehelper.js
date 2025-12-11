import constants from "../config";

export default function doApiFetch(payload, method, url) {
  return new Promise(function (resolve, reject) {
    const opts = {
      method: method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: payload ? JSON.stringify(payload) : undefined,
    };
  
    fetch(constants.APIURL + url, opts)
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
};

