import constants from "./categories.constants";


const fetchAllSuccess = categories => ({
	type: constants.CATEGORY_FETCH_ALL_SUCCESS,
	payload: categories
});

const fetchAllFail = error => ({
	type: constants.CATEGORY_FETCH_ALL_FAILED,
	payload: error
});

const updateSuccess = category => ({
	type: constants.CATEGORY_UPDATE_SUCCESS,
	payload: category
});

const updateFail = error => ({
	type: constants.CATEGORY_UPDATE_FAILED,
	payload: error
});

const removeSuccess = categoryId => ({
	type: constants.CATEGORY_DELETE_SUCCESS,
	payload: categoryId
});

const removeFail = error => ({
	type: constants.CATEGORY_DELETE_FAILED,
	payload: error
});


const createSuccess = category => ({
	type: constants.CATEGORY_CREATE_SUCCESS,
	payload: category
});

const createFail = error => ({
	type: constants.CATEGORY_CREATE_FAILED,
	payload: error
});

export default {
	fetchAllSuccess,
	fetchAllFail,

	updateSuccess,
	updateFail,

	removeSuccess,
	removeFail,

	createSuccess,
	createFail
};
