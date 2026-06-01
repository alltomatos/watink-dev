/* @jsxImportSource react */
import React, { useRef } from "react";

import Backdrop from "@material-ui/core/Backdrop";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
	backdrop: {
		zIndex: theme.zIndex.drawer + 1,
		color: "#fff",
	},
}));

const BackdropLoading = () => {
	const classes = useStyles();
	const backdropRef = useRef(null);

	return (
		<div ref={backdropRef}>
			<Backdrop className={classes.backdrop} open={true}>
				<CircularProgress color="inherit" />
			</Backdrop>
		</div>
	);
};

export default BackdropLoading;
