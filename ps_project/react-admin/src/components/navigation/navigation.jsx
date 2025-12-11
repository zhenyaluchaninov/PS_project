import React from "react";
import { Link } from "react-router-dom";
import "./navigation.css";

function Navigation() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
      <div className="navbar-brand">Projekt PS</div>
      <button
        className="navbar-toggler"
        type="button"
        data-toggle="collapse"
        data-target="#navbarSupportedContent"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon" />
      </button>
      <div className="collapse navbar-collapse" id="navbarSupportedContent">
        <ul className="navbar-nav mr-auto">
          <li className="nav-item">
            <Link className="nav-link" to="/home">
              Hem
            </Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/adventures">
              PS
            </Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/categories">
              Kategorier
            </Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/lists">
              Spellistor
            </Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/users">
              Mina användare
            </Link>
          </li>
        </ul>
        <ul className="navbar-nav ml-auto">
          <li className="nav-item">
            <Link className="nav-link" to="/myaccount">
              Mitt konto
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navigation;
