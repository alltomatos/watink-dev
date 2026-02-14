import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { useHistory, Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Formik, Form, Field } from "formik";
import { motion } from "framer-motion";

import {
	Avatar,
	Button,
	CssBaseline,
	TextField,
	Grid,
	Box,
	Typography,
	Container,
	InputAdornment,
	IconButton,
	Link,
	CircularProgress
} from '@material-ui/core';

import { LockOutlined, Visibility, VisibilityOff } from '@material-ui/icons';
import { makeStyles } from "@material-ui/core/styles";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
	root: {
		minHeight: "100vh",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: theme.palette.background.default,
		padding: theme.spacing(2),
	},
	paper: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		backgroundColor: theme.palette.type === "dark" ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.8)",
		backdropFilter: "blur(12px)",
		padding: theme.spacing(6),
		borderRadius: 24,
		boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
		border: `1px solid ${theme.palette.divider}`,
		width: "100%",
	},
	avatar: {
		margin: theme.spacing(1),
		backgroundColor: theme.palette.primary.main,
		width: 56,
		height: 56,
		marginBottom: theme.spacing(2),
	},
	form: {
		width: "100%",
		marginTop: theme.spacing(3),
	},
	submit: {
		margin: theme.spacing(3, 0, 2),
		height: 48,
		borderRadius: 12,
		fontSize: "1rem",
		fontWeight: 600,
	},
}));

const UserSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "Muito curto!")
		.max(50, "Muito longo!")
		.required("Obrigatório"),
	password: Yup.string().min(5, "Muito curto!").max(50, "Muito longo!").required("Obrigatório"),
	email: Yup.string().email("E-mail inválido").required("Obrigatório"),
});

const SignUp = () => {
	const classes = useStyles();
	const history = useHistory();

	const initialState = { name: "", email: "", password: "" };
	const [showPassword, setShowPassword] = useState(false);
	const [user] = useState(initialState);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchSettings = async () => {
			try {
				const { data } = await api.get("/public-settings");
				const settingsData = Array.isArray(data) ? data : [];
				const userCreationSetting = settingsData.find((s) => s.key === "userCreation");
				if (userCreationSetting && userCreationSetting.value === "disabled") {
					toast.error(i18n.t("signup.toasts.creationDisabled") || "Criação de usuário desabilitada");
					history.push("/login");
				}
			} catch (err) {
				console.error("Error fetching public settings", err);
			} finally {
				setLoading(false);
			}
		};
		fetchSettings();
	}, [history]);

	if (loading) {
		return (
			<div className={classes.root}>
				<CircularProgress />
			</div>
		);
	}

	const handleSignUp = async values => {
		try {
			await api.post("/auth/signup", values);
			toast.success(i18n.t("signup.toasts.success"));
			history.push("/login");
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<div className={classes.root}>
			<Container component="main" maxWidth="xs">
				<CssBaseline />
				<motion.div 
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5 }}
					className={classes.paper}
				>
					<Avatar className={classes.avatar}>
						<LockOutlined style={{ fontSize: 32 }} />
					</Avatar>
					<Typography component="h1" variant="h4" style={{ fontWeight: 700, marginBottom: 8 }}>
						{i18n.t("signup.title")}
					</Typography>
					<Typography variant="body2" style={{ marginBottom: 8, opacity: 0.7, textAlign: "center" }}>
						Crie sua conta agora e comece a automatizar seu atendimento.
					</Typography>

					<Formik
						initialValues={user}
						enableReinitialize={true}
						validationSchema={UserSchema}
						onSubmit={(values, actions) => {
							handleSignUp(values);
							actions.setSubmitting(false);
						}}
					>
						{({ touched, errors, isSubmitting }) => (
							<Form className={classes.form}>
								<Grid container spacing={2}>
									<Grid item xs={12}>
										<Field
											as={TextField}
											autoComplete="name"
											name="name"
											error={touched.name && Boolean(errors.name)}
											helperText={touched.name && errors.name}
											variant="outlined"
											fullWidth
											id="name"
											label={i18n.t("signup.form.name")}
											autoFocus
										/>
									</Grid>

									<Grid item xs={12}>
										<Field
											as={TextField}
											variant="outlined"
											fullWidth
											id="email"
											label={i18n.t("signup.form.email")}
											name="email"
											error={touched.email && Boolean(errors.email)}
											helperText={touched.email && errors.email}
											autoComplete="email"
										/>
									</Grid>
									<Grid item xs={12}>
										<Field
											as={TextField}
											variant="outlined"
											fullWidth
											name="password"
											id="password"
											autoComplete="current-password"
											error={touched.password && Boolean(errors.password)}
											helperText={touched.password && errors.password}
											label={i18n.t("signup.form.password")}
											type={showPassword ? 'text' : 'password'}
											InputProps={{
												endAdornment: (
													<InputAdornment position="end">
														<IconButton
															aria-label="toggle password visibility"
															onClick={() => setShowPassword((e) => !e)}
														>
															{showPassword ? <VisibilityOff /> : <Visibility />}
														</IconButton>
													</InputAdornment>
												)
											}}
										/>
									</Grid>
								</Grid>
								<Button
									type="submit"
									fullWidth
									variant="contained"
									color="primary"
									disabled={isSubmitting}
									className={classes.submit}
									component={motion.button}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
								>
									{isSubmitting ? <CircularProgress size={24} /> : i18n.t("signup.buttons.submit")}
								</Button>
								<Grid container justifyContent="center" style={{ marginTop: 16 }}>
									<Grid item>
										<Typography variant="body2">
											Já possui uma conta?{" "}
											<Link
												component={RouterLink}
												to="/login"
												style={{ fontWeight: 600, color: "inherit" }}
											>
												{i18n.t("signup.buttons.login")}
											</Link>
										</Typography>
									</Grid>
								</Grid>
							</Form>
						)}
					</Formik>
				</motion.div>
			</Container>
		</div>
	);
};

export default SignUp;
