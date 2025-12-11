import React, {Component} from "react";
import Dashboard from "./dashboard";

class Home extends Component {

	componentDidMount() {
		console.log("Home: component did mount");
	}

	render() {
		return (
			<Dashboard />
		);
	}

}

export default Home;
