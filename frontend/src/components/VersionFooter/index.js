/* @jsxImportSource react */
import React, { useContext } from "react";
import { Link as RouterLink } from "react-router-dom";
import { AuthContext } from "../../context/Auth/AuthContext";

const VersionFooter = ({ collapsed = false }) => {
	const { user } = useContext(AuthContext);
	const isSuperAdmin = (user?.profile || "").toLowerCase() === "superadmin";

	if (collapsed || !isSuperAdmin) {
		return null;
	}

	return (
		<div className="p-4 text-center text-xs text-muted-foreground border-t border-border mt-auto overflow-hidden whitespace-nowrap">
			<RouterLink
				to="/monitor"
				className="no-underline font-semibold text-primary hover:underline"
			>
				Monitor
			</RouterLink>
		</div>
	);
};

export default VersionFooter;
