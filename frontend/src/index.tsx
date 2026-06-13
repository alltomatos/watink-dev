/* @jsxImportSource react */
import React from "react";
import { createRoot } from "react-dom/client";
import CssBaseline from "@material-ui/core/CssBaseline";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";

import App from "./App";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <>
    <CssBaseline />
    <App />
  </>
);
