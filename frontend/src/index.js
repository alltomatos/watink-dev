import React from "react";
import ReactDOM from "react-dom/client";
import CssBaseline from "@material-ui/core/CssBaseline";
import "react-toastify/dist/ReactToastify.css";

import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
	<React.StrictMode>
		<CssBaseline>
			<App />
		</CssBaseline>
	</React.StrictMode>
);