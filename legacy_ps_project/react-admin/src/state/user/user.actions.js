import constants from "./user.constants";

const authenticate = (username, password, remember) => ({
  type: constants.USER_AUTH,
  payload: {
    username: username,
    password: password,
    remember: remember,
  },
});

const success = (user) => ({
  type: constants.USER_AUTH_SUCCESS,
  payload: user,
});

const fail = (error) => ({
  type: constants.USER_AUTH_FAILED,
  payload: error,
});

const signOut = () => ({
  type: constants.USER_SIGN_OUT,
});

export default {
  authenticate,
  success,
  fail,
  signOut,
};
