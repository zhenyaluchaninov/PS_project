import React, {useState} from "react";
import "./login.css";

let Login = ({authenticate, errorMessage, serverError}) => {
	const [username, setUsername] = useState();
	const [password, setPassword] = useState();
	const [rememberMe, setRememberMe] = useState(false);

	function handleSubmit(e) {
		e.preventDefault();
		authenticate(username, password, rememberMe);
	}

	return (
		<div className="container-fluid">
		  <div className="row no-gutter">
		    <div className="d-none d-md-flex col-md-4 col-lg-6 bg-image"></div>
		    <div className="col-md-8 col-lg-6">
		      <div className="login d-flex align-items-center py-5">
		        <div className="container">
		          <div className="row">
		            <div className="col-md-9 col-lg-8 mx-auto">
		              <h3 className="login-heading mb-4">Välkommen tillbaka!</h3>
		              <h4>{errorMessage}</h4>
		              <h4>{serverError}</h4>

		              <form>
		                <div className="form-label-group">
		                  <input type="email" id="inputEmail" className="form-control" placeholder="Användarnamn" required autoFocus onChange={e => setUsername(e.target.value)} />
		                  <label htmlFor="inputEmail">Användarnamn</label>
		                </div>

		                <div className="form-label-group">
		                  <input type="password" id="inputPassword" className="form-control" placeholder="Lösenord" required onChange={e => setPassword(e.target.value)} />
		                  <label htmlFor="inputPassword">Lösenord</label>
		                </div>

		                <div className="custom-control custom-checkbox mb-3">
		                  <input type="checkbox" className="custom-control-input" id="customCheck1" checked={rememberMe} onChange={e => setRememberMe(!rememberMe)} />
		                  <label className="custom-control-label" htmlFor="customCheck1">Kom ih&aring;g mig</label>
		                </div>
		                <button className="btn btn-lg btn-primary btn-block btn-login text-uppercase font-weight-bold mb-2" onClick={handleSubmit}>Logga in</button>
		              </form>
		            </div>
		          </div>
		        </div>
		      </div>
		    </div>
		  </div>
		</div>

	);
};

export default Login;
