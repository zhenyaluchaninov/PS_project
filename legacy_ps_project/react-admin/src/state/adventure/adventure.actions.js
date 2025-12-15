import constants from "./adventure.constants";

const fetch = (adventureId) => ({
	type: constants.ADVENTURE_FETCH,
  payload: adventureId
});

const fetchSuccess = (adventure) => ({
    type: constants.ADVENTURE_FETCH_SUCCESS,
    payload: adventure
});

const fetchFailed = (error) => ({
    type: constants.ADVENTURE_FETCH_FAILED,
    payload: error
});

const update = (adventure) => ({
  type: constants.ADVENTURE_UPDATE,
  payload: adventure
});

const updateSuccess = (adventure) => ({
  type: constants.ADVENTURE_UPDATE_SUCCESS,
  payload: adventure
});

const updateFailed = (error) => ({
  type: constants.ADVENTURE_UPDATE_FAILED,
  payload: error
});

const remove = (adventureId) => ({
  type: constants.ADVENTURE_DELETE,
  payload: adventureId
});

const removeSuccess = (adventureId) => ({
	type: constants.ADVENTURE_DELETE_SUCCESS,
	payload: adventureId
});

const removeFailed = (error) => ({
	type: constants.ADVENTURE_DELETE_FAILED,
	payload: error
});


export default {
  fetch,
  fetchSuccess,
  fetchFailed,

	remove,
	removeSuccess,
	removeFailed,

  update,
  updateSuccess,
  updateFailed
}
