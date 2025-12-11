import doApiFetch from "../servicehelper";

const authenticate = (username, password) => doApiFetch({ username: username, password: password }, "POST", "/auth");

const getUser = (userId) => doApiFetch(null, "GET", "/admin/user/" + userId);

const createUser = (user) => doApiFetch(user, "POST", "/admin/users");

const updateUser = (user) => doApiFetch(user, "PUT", "/admin/user/" + user.id);

const deleteUser = (userId) => doApiFetch(null, "DELETE", "/admin/user/" + userId);

export default {
  authenticate,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};
