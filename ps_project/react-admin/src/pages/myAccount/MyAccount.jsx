import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Users from "../users/users.jsx";
import userServices from "../../state/user/user.service";

const MyAccount = () => {
  const [loggedUser, setLoggedUser] = useState(null);

  const loggedUserData = useSelector((state) => state.currentUser);

  useEffect(() => {
    userServices
      .getUser(loggedUserData.userId)
      .then((data) => {
        setLoggedUser(data);
      })
      .catch((error) => {
        console.error("Error fetching user data", error);
      });
  }, [loggedUserData]);

  return <Users type="myAccount" loggedUserAccount={loggedUser} />;
};

export default MyAccount;
