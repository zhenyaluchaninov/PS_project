import constants from "./category.constants";

const fetch = (categoryId) => ({
	type: constants.CATEGORY_FETCH,
	payload: categoryId
});

const fetchSuccess = category => ({
	type: constants.CATEGORY_FETCH_SUCCESS,
	payload: category
});

const fetchFail = error => ({
	type: constants.CATEGORY_FETCH_FAILED,
	payload: error
});

const clear = () => ({
    type: constants.CATEGORY_CLEAR
})

export default {
	fetch,
	fetchSuccess,
    fetchFail,

    clear
};
