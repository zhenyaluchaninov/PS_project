import constants from "./adventures.constants";

const initialState = {
	adventures: {
		items: []
	}
};

function updateObject(oldObject, newValues) {
  return Object.assign({}, oldObject, newValues)
}

function setAdventures(state, action) {
	return updateObject(state, { adventures: action.adventures })
}

const adventures = (state = initialState, action) => {
	switch (action.type) {

		case constants.ADVENTURES_FETCH_SUCCESS: {
			const newState = setAdventures(state, action.payload);
			return newState;
		}

		default: {
			return state;
		}
	}
};

export default adventures;
