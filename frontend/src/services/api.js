/* @jsxImportSource react */
import axios from "axios";
import { getBackendUrl } from "../config";

const backendUrl = getBackendUrl();
const normalizedBase = backendUrl ? backendUrl.replace(/\/+$/, "") : "";
const baseURL = normalizedBase ? `${normalizedBase}/v1/api` : "/v1/api";

const api = axios.create({
	baseURL,
	withCredentials: true,
});

export default api;
