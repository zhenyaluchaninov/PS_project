import constants from "./lists.constants";

const fetchSuccess = (items) => ({
	type: constants.LISTS_FETCH_SUCCESS,
	payload: {
		lists: {
            items: items
		}
  	}
});

export default {
	fetchSuccess
};
