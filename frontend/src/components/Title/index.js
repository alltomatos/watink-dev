import React from "react";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
	title: {
		fontWeight: 700,
		color: theme.palette.text.primary,
		marginBottom: theme.spacing(3),
		position: "relative",
		"&::after": {
			content: '""',
			position: "absolute",
			bottom: -8,
			left: 0,
			width: 40,
			height: 4,
			borderRadius: 2,
			backgroundColor: theme.palette.primary.main,
		}
	},
}));

export default function Title(props) {
	const classes = useStyles();
	return (
		<Typography variant="h4" className={classes.title}>
			{props.children}
		</Typography>
	);
}
