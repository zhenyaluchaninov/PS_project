import React from "react";
import { BrowserRouter, Switch, Route, Redirect } from "react-router-dom";
import { connect } from "react-redux";

import Navigation from "./components/navigation/navigation";
import ContentContainer from "./components/contentcontainer";
import Home from "./pages/home/home";
import Authentication from "./pages/authentication/authentication";
import Adventures from "./pages/adventures/adventures";
import Users from "./pages/users/users";
import MyAccount from "./pages/myAccount/MyAccount";
import Adventure from "./pages/adventure";
import Categories from "./pages/categories/categories";
import Category from "./pages/category";
import Lists from "./pages/lists";
import List from "./pages/list";
import CoCreatorStartPage from "./pages/coCreatorStartPage/coCreatorStartPage";

class App extends React.Component {
  render() {
    // If the user isnt authenticated
    if (!this.props.currentUser.auth) {
      return (
        <BrowserRouter>
          <Switch>
            <Route path="/" exact component={Authentication} />
            <Redirect to="/" />
          </Switch>
        </BrowserRouter>
      );
    }

    // Authenticated users default to /home
    return this.props.currentUser?.role === 2 ? (
      <BrowserRouter>
        <Switch>
          <Route path="/" exact component={CoCreatorStartPage} />
          <Redirect to="/" />
        </Switch>
      </BrowserRouter>
    ) : (
      <BrowserRouter basename="/admin">
        <Navigation />
        <ContentContainer>
          <Switch>
            <Route path="/home" exact component={Home} />
            <Route path="/adventures" exact component={Adventures} />
            <Route path="/adventure/:id" exact component={Adventure} />
            <Route path="/categories" exact component={Categories} />
            <Route path="/category/:id" exact component={Category} />
            <Route path="/lists" exact component={Lists} />
            <Route path="/users" exact component={Users} />
            <Route path="/myaccount" exact component={MyAccount} />
            <Route path="/list/:id" exact component={List} />
            <Redirect to="/adventures" />
          </Switch>
        </ContentContainer>
      </BrowserRouter>
    );
  }
}

const mapStateToProps = (state) => ({
  currentUser: state.currentUser,
});

const mapDispatchToProps = (dispatch) => {
  return {
    dispatch,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(App);
