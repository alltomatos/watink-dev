/* @jsxImportSource react */
import React from "react";

import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Divider from "@material-ui/core/Divider";
import Skeleton from "@material-ui/lab/Skeleton";

const TicketsSkeleton = () => {
	return (
		<div style={{ padding: "0 12px" }}>
			{[1, 2, 3].map((i) => (
				<div 
					key={i} 
					style={{ 
						padding: "12px 16px", 
						marginBottom: 8, 
						borderRadius: 12, 
						backgroundColor: "#ffffff",
						border: "1px solid #f1f5f9",
						display: "flex",
						gap: 12
					}}
				>
					<Skeleton animation="wave" variant="rect" width={44} height={44} style={{ borderRadius: 10, flexShrink: 0 }} />
					<div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<Skeleton animation="wave" height={16} width="40%" />
							<Skeleton animation="wave" height={14} width="15%" />
						</div>
						<Skeleton animation="wave" height={14} width="70%" />
					</div>
				</div>
			))}
		</div>
	);
};

export default TicketsSkeleton;
