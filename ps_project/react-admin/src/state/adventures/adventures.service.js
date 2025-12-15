import adventuresConstants from "../../state/adventures/adventures.constants";
import constants from "../../config";

const getAdventures = (filter, pagination) =>
  new Promise(function (resolve, reject) {
    let payload = {
      pagination: pagination,
      filter: {
        type: filter.type,
      },
    };

    if (filter.type === adventuresConstants.ADVENTURES_FILTER_CATEGORY) {
      payload.filter.category_id = filter.category;
    }

    if (filter.type === adventuresConstants.ADVENTURES_FILTER_SEARCH) {
      payload.filter.search_string = filter.search;
    }

    if (filter.type === adventuresConstants.ADVENTURES_FILTER_REPORT) {
      payload.filter.search_string = filter.search;
    }

    const opts = {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify(payload),
    };

    fetch(constants.ADMINAPIURL + "/adventures", opts)
      .then((response) => {
        return response.json();
      })
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

export default {
  getAdventures,
};
