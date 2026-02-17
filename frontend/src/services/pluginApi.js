/* @jsxImportSource react */
import axios from "axios";

const pluginApi = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

export default pluginApi;
