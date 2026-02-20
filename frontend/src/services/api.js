/* @jsxImportSource react */
import axios from "axios";
import { getBackendUrl } from "../config";

const backendUrl = getBackendUrl();
const normalizedBase = backendUrl ? backendUrl.replace(/\/+$/, "") : "";
const baseURL = normalizedBase ? `${normalizedBase}/api` : "/api";

const api = axios.create({
	baseURL,
	withCredentials: true,
});

export default api;
