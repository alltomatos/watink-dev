/* @jsxImportSource react */
import axios from "axios";
import { getBackendUrl } from "../config";

const pluginApi = axios.create({
  baseURL: `${getBackendUrl()}/api/v1`,
  withCredentials: true,
});

pluginApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${JSON.parse(token)}`;
  }
  return config;
});

export default pluginApi;
