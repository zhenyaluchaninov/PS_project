import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Redirect } from "react-router-dom";

import userActions from "../../state/user/user.actions";
import userService from "../../state/user/user.service";
import Login from "./login";

let Authentication = () => {
  const dispatch = useDispatch();
  const [error, setError] = useState();
  const isAuthenticated = useSelector((state) => state.currentUser.auth);

  function authenticate(username, password, rememberMe) {
    if (!username || !password) {
      setError("Du måste ange användarnamn och lösenord");
      return;
    }
    setError();

    userService
      .authenticate(username, password)
      .then((data) => {
        dispatch(userActions.success(data));
      })
      .catch((error) => {
        setError(error);
      });
  }

  if (isAuthenticated) {
    return <Redirect to="/home" />;
  } else {
    return <Login authenticate={authenticate} errorMessage={error} />;
  }
};

export default Authentication;
