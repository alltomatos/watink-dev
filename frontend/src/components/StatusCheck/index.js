/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import axios from "axios";
import SplashScreen from "../SplashScreen";
import { getBackendUrl } from "../../config";

const StatusCheck = ({ children }) => {
  const [isBackendReady, setIsBackendReady] = useState(false);
  const history = useHistory();

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const backendUrl = getBackendUrl();
        const base = backendUrl ? backendUrl.replace(/\/+$/, "") : "";

        // Health/setup sempre no namespace /api para evitar concat incorreto (ex: https://hosthealth)
        const testUrl = base ? `${base}/api/health` : "/api/health";
        const setupCheckUrl = base ? `${base}/api/initial-setup/check` : "/api/initial-setup/check";

        // 1. Check health (Fully initialized backend)
        await axios.get(testUrl, { timeout: 5000 });
        
        // 2. Check if setup is needed
        const { data } = await axios.get(setupCheckUrl);
        
        if (data.needsSetup && window.location.pathname !== "/initial-setup") {
          history.push("/initial-setup");
        }
        
        setIsBackendReady(true);
      } catch (err) {
        console.error("Backend not ready or setup check failed, retrying...", err);
        setTimeout(checkBackend, 2000);
      }
    };

    checkBackend();
  }, [history]);

  if (!isBackendReady) {
    return <SplashScreen />;
  }

  return children;
};

export default StatusCheck;
