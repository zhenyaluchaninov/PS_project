import doApiFetch from "../servicehelper";

const getUsers = () => doApiFetch(null, "GET", "/admin/users");

export default {
  getUsers,
};
