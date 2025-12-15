import constants from "./list.constants";

const fetchSuccess = (list) => ({
	type: constants.LIST_FETCH_SUCCESS,
	payload: {
		list: list
  	}
});

const updateSuccess = (list) => ({
	type: constants.LIST_UPDATE_SUCCESS,
	payload: {
		list: list
	}
})

const createSuccess = (list) => ({
	type: constants.LIST_CREATE_SUCCESS,
	payload: {
		list: list
	}
})

const deleteSuccess = (listID) => ({
	type: constants.LIST_DELETE_SUCCESS,
	payload: {
		id: listID
	}

});

export default {
	fetchSuccess,
	updateSuccess,
	createSuccess,
	deleteSuccess
};
