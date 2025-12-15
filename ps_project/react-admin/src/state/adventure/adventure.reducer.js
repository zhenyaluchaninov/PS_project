import constants from "./adventure.constants";

const initialState = {
  current: {
    id: 0,
    title: "",
    nodes: [],
    links: [],
  },
  loading: false,
	error: ""
};

function updateObject(oldObject, newValues) {
  // Encapsulate the idea of passing a new object as the first parameter
  // to Object.assign to ensure we correctly copy data instead of mutating
  return Object.assign({}, oldObject, newValues)
}

function setCurrentAdventure(state, action) {
	return updateObject(state, {current:action,loading:false,error:""});
}

function setLoading(state, isLoading) {
  return updateObject(state, {loading:isLoading});
}

function setError(state, error) {
  return updateObject(state, {error:error,loading:false});
}

const adventure = (state = initialState, action) => {
	switch (action.type) {

    case constants.ADVENTURE_FETCH: {
      const newState = setLoading(state, true);
      return newState;
    }

    case constants.ADVENTURE_FETCH_SUCCESS: {
      const newState = setCurrentAdventure(state, action.payload);
      return newState;
    }

    case constants.ADVENTURE_FETCH_FAILED: {
      const newState = setError(state, action.payload);
      return newState;
    }

    // case constants.ADVENTURE_UPDATE_SUCCESS: {
    //   return state;
    // }

    case constants.ADVENTURE_DELETE_FAILED: {
      const newState = setError(state, action.payload);
      return newState;
    }

		default: {
			return state;
		}
	}
};

export default adventure;
