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
    let isMounted = true;
    const checkBackend = async () => {
      try {
        const backendUrl = getBackendUrl();
        const base = backendUrl ? backendUrl.replace(/\/+$/, "") : "";

        const testUrl = base ? `${base}/api/health` : "/api/health";
        const setupCheckUrl = base ? `${base}/api/initial-setup/check` : "/api/initial-setup/check";

        await axios.get(testUrl, { timeout: 5000 });
        const { data } = await axios.get(setupCheckUrl);
        
        if (!isMounted) return;

        if (data.needsSetup && window.location.pathname !== "/initial-setup") {
          if (history && history.push) {
            history.push("/initial-setup");
          } else {
            window.location.href = "/initial-setup";
          }
        }
        
        setIsBackendReady(true);
      } catch (err) {
        if (!isMounted) return;
        console.error("Backend not ready or setup check failed, retrying...", err);
        setTimeout(checkBackend, 2000);
      }
    };

    checkBackend();
    return () => { isMounted = false; };
  }, [history]);

  if (!isBackendReady) {
    return <SplashScreen />;
  }

  return children;
};

export default StatusCheck;
