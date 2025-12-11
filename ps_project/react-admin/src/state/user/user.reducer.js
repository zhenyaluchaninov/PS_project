import userConstants from "./user.constants";

const tokenKey = "token";
const token = localStorage.getItem(tokenKey);
const user = JSON.parse(localStorage.getItem("user"));

const initialState =
  token && user
    ? { auth: true, token: token, error: "", userId: user.id, role: user.role }
    : {
        token: null,
        error: "",
        auth: false,
        userId: null,
        role: null,
      };

const currentUser = (state = initialState, action) => {
  switch (action.type) {
    case userConstants.USER_AUTH_SUCCESS: {
      localStorage.setItem(tokenKey, action.payload.token);
      localStorage.setItem("user", JSON.stringify({ id: action.payload.id, role: action.payload.role }));
      return {
        ...state,
        token: action.payload.token, //if I can get from action.payload.id, username, name, role, maybe also list of adventures connected to user profile... (list ids)
        userId: action.payload.id,
        role: action.payload.role,
        error: "",
        auth: true,
      };
    }

    case userConstants.USER_AUTH_FAILED: {
      return {
        ...state,
        error: action.payload,
        auth: false,
      };
    }

    case userConstants.USER_SIGN_OUT: {
      localStorage.removeItem(tokenKey);
      localStorage.removeItem("user");
      return {
        ...state,
        error: "",
        auth: false,
      };
    }

    default: {
      return state;
    }
  }
};

export default currentUser;
