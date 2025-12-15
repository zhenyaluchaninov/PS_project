import constants from "./adventures.constants";

const fetchSuccess = (adventures, count) => ({
  type: constants.ADVENTURES_FETCH_SUCCESS,
  payload: {
    adventures: {
      items: adventures,
    },
    pagination: {
      count: count,
    },
  },
});

export default {
  fetchSuccess,
};
