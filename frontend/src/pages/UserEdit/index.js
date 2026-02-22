/* @jsxImportSource react */
import React, { useState, useEffect, useContext } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { useParams, useHistory } from "react-router-dom";

import {
    Button,
    CircularProgress,
    Select,
    InputLabel,
    MenuItem,
    FormControl,
    TextField,
    InputAdornment,
    IconButton,
    Paper,
    Tabs,
    Tab,
    Box,
    Typography,
    Grid,
    Checkbox,
    FormControlLabel,
} from "@material-ui/core";

import { Visibility, VisibilityOff, ArrowBack } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import QueueSelect from "../../components/QueueSelect";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import useWhatsApps from "../../hooks/useWhatsApps";

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexWrap: "wrap",
    },
    paper: {
        padding: theme.spacing(2),
        display: "flex",
        overflow: "auto",
        flexDirection: "column",
        borderRadius: 16,
    },
    multFieldLine: {
        display: "flex",
        "& > *:not(:last-child)": {
            marginRight: theme.spacing(1),
        },
    },
    btnWrapper: {
        position: "relative",
        marginTop: theme.spacing(2),
    },
    buttonProgress: {
        color: green[500],
        position: "absolute",
        top: "50%",
        left: "50%",
        marginTop: -12,
        marginLeft: -12,
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    tabContent: {
        padding: theme.spacing(2)
    },
    backButton: {
        marginRight: theme.spacing(2),
    }
}));

const UserSchema = Yup.object().shape({
    name: Yup.string()
        .min(2, "Muito curto!")
        .max(50, "Muito longo!")
        .required("Obrigatório"),
    password: Yup.string().min(5, "Muito curto!").max(50, "Muito longo!"),
    email: Yup.string().email("Email inválido").required("Obrigatório"),
});

const UserEdit = () => {
    const classes = useStyles();
    const { userId } = useParams();
    const history = useHistory();

    const isNew = userId === "new";

    const initialState = {
        name: "",
        email: "",
        password: "",
        profile: "user",
        roleId: ""
    };

    const { user: loggedInUser } = useContext(AuthContext);

    const [user, setUser] = useState(initialState);
    const [selectedQueueIds, setSelectedQueueIds] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [whatsappId, setWhatsappId] = useState("");
    const { loading: loadingWapps, whatsApps } = useWhatsApps();
    const [tab, setTab] = useState(0);
    const [roles, setRoles] = useState([]);
    const [allPermissions, setAllPermissions] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [loading, setLoading] = useState(true);

    const findWhatsApp = (id) => {
        if (!whatsApps || !id) return null;
        return whatsApps.find(w => w.id === parseInt(id));
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const requests = [
                    api.get("/roles"),
                    api.get("/permissions")
                ];

                if (!isNew) {
                    requests.push(api.get(`/users/${userId}`));
                }

                const responses = await Promise.all(requests);
                
                const [rolesRes, permissionsRes, userRes] = responses;
                
                setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : rolesRes.data.roles || []);
                setAllPermissions(permissionsRes.data);

                if (!isNew && userRes) {
                    const data = userRes.data;
                    const userQueueIds = data.queues?.map((queue) => queue.id) || [];
                    setSelectedQueueIds(userQueueIds);
                    setWhatsappId(data.whatsappId || "");
                    
                    // Suporte a ambos os formatos de permissões
                    const perms = data.permissions || [];
                    setSelectedPermissions(perms.map(p => p.id || p));
                    
                    setUser({
                        name: data.name || "",
                        email: data.email || "",
                        password: "",
                        profile: data.profile || "user",
                        roleId: data.roleId || ""
                    });
                }
            } catch (err) {
                toastError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, isNew]);

    const handleSaveUser = async (values) => {
        const userData = { 
            ...values, 
            whatsappId, 
            queueIds: selectedQueueIds, 
            permissionIds: selectedPermissions, // Formato Go
            permissions: selectedPermissions // Formato Legado
        };
        
        try {
            if (isNew) {
                await api.post("/users", userData);
                toast.success(i18n.t("userModal.success"));
            } else {
                await api.put(`/users/${userId}`, userData);
                toast.success(i18n.t("userModal.success"));
            }
            history.push("/users");
        } catch (err) {
            toastError(err);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTab(newValue);
    };

    const handlePermissionChange = (permissionId) => {
        setSelectedPermissions(prevState => {
            const id = typeof permissionId === 'object' ? permissionId.id : permissionId;
            if (prevState.includes(id)) {
                return prevState.filter(pId => pId !== id);
            } else {
                return [...prevState, id];
            }
        });
    };

    if (loading) {
        return (
            <MainContainer>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
                    <CircularProgress />
                </Box>
            </MainContainer>
        );
    }

    return (
        <MainContainer>
            <MainHeader>
                <Box display="flex" alignItems="center">
                    <IconButton onClick={() => history.push("/users")} className={classes.backButton}>
                        <ArrowBack />
                    </IconButton>
                    <Title>{isNew ? i18n.t("userModal.title.add") : user.name}</Title>
                </Box>
            </MainHeader>
            <Paper className={classes.paper}>
                <Tabs value={tab} onChange={handleTabChange} indicatorColor="primary" textColor="primary">
                    <Tab label="Dados do Usuário" />
                    <Tab label="Permissões Adicionais" />
                </Tabs>

                <Box hidden={tab !== 0} className={classes.tabContent}>
                    <Formik
                        initialValues={user}
                        enableReinitialize={true}
                        validationSchema={UserSchema}
                        onSubmit={(values, actions) => {
                            handleSaveUser(values);
                            actions.setSubmitting(false);
                        }}
                    >
                        {({ touched, errors, isSubmitting }) => (
                            <Form>
                                <div className={classes.multFieldLine}>
                                    <Field
                                        as={TextField}
                                        label={i18n.t("userModal.form.name")}
                                        name="name"
                                        error={touched.name && Boolean(errors.name)}
                                        helperText={touched.name && errors.name}
                                        variant="outlined"
                                        margin="dense"
                                        fullWidth
                                    />
                                    <Field
                                        as={TextField}
                                        name="password"
                                        variant="outlined"
                                        margin="dense"
                                        label={i18n.t("userModal.form.password")}
                                        error={touched.password && Boolean(errors.password)}
                                        helperText={touched.password && errors.password}
                                        type={showPassword ? "text" : "password"}
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
                                            ),
                                        }}
                                        fullWidth
                                    />
                                </div>
                                <div className={classes.multFieldLine}>
                                    <Field
                                        as={TextField}
                                        label={i18n.t("userModal.form.email")}
                                        name="email"
                                        error={touched.email && Boolean(errors.email)}
                                        helperText={touched.email && errors.email}
                                        variant="outlined"
                                        margin="dense"
                                        fullWidth
                                    />
                                    <FormControl
                                        variant="outlined"
                                        className={classes.formControl}
                                        margin="dense"
                                        fullWidth
                                    >
                                        <Can
                                            role={loggedInUser.profile}
                                            perform="user-modal:editProfile"
                                            yes={() => (
                                                <>
                                                    <InputLabel id="profile-selection-input-label">
                                                        {i18n.t("userModal.form.profile")}
                                                    </InputLabel>

                                                    <Field
                                                        as={Select}
                                                        label={i18n.t("userModal.form.profile")}
                                                        name="profile"
                                                        labelId="profile-selection-label"
                                                        id="profile-selection"
                                                        required
                                                    >
                                                        <MenuItem value="user">User</MenuItem>
                                                        <MenuItem value="admin">Admin</MenuItem>
                                                        <MenuItem value="superadmin">Super Admin</MenuItem>
                                                    </Field>
                                                </>
                                            )}
                                        />
                                    </FormControl>

                                    <FormControl
                                        variant="outlined"
                                        className={classes.formControl}
                                        margin="dense"
                                        fullWidth
                                    >
                                        <InputLabel id="role-selection-input-label">
                                            {i18n.t("userModal.form.role") || "Papel (RBAC)"}
                                        </InputLabel>
                                        <Field
                                            as={Select}
                                            label={i18n.t("userModal.form.role") || "Papel (RBAC)"}
                                            name="roleId"
                                            labelId="role-selection-label"
                                            id="role-selection"
                                        >
                                            <MenuItem value=""><em>Nenhum</em></MenuItem>
                                            {roles.map(role => (
                                                <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>
                                            ))}
                                        </Field>
                                    </FormControl>

                                </div>
                                <Can
                                    role={loggedInUser.profile}
                                    perform="user-modal:editQueues"
                                    yes={() => (
                                        <QueueSelect
                                            selectedQueueIds={selectedQueueIds || []}
                                            onChange={(values) => setSelectedQueueIds(values || [])}
                                        />
                                    )}
                                />
                                <Can
                                    role={loggedInUser.profile}
                                    perform="user-modal:editQueues"
                                    yes={() => (
                                        !loadingWapps && (
                                            <FormControl
                                                variant="outlined"
                                                margin="dense"
                                                fullWidth
                                                style={{ marginTop: 8 }}
                                            >
                                                <InputLabel>{i18n.t("userModal.form.whatsapp")}</InputLabel>
                                                <Select
                                                    value={whatsappId}
                                                    onChange={(e) => setWhatsappId(e.target.value)}
                                                    label={i18n.t("userModal.form.whatsapp")}
                                                >
                                                    <MenuItem value={""}>&nbsp;</MenuItem>
                                                    {whatsApps.map((whatsapp) => (
                                                        <MenuItem key={whatsapp.id} value={whatsapp.id}>
                                                            {whatsapp.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        )
                                    )}
                                />

                                <div className={classes.btnWrapper}>
                                    <Button
                                        type="submit"
                                        color="primary"
                                        disabled={isSubmitting}
                                        variant="contained"
                                    >
                                        {i18n.t("userModal.buttons.okEdit")}
                                        {isSubmitting && (
                                            <CircularProgress
                                                size={24}
                                                className={classes.buttonProgress}
                                            />
                                        )}
                                    </Button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </Box>

                <Box hidden={tab !== 1} className={classes.tabContent}>
                    <Can
                        role={loggedInUser.profile}
                        perform="user-modal:editProfile"
                        yes={() => (
                            <>
                                <Typography variant="subtitle2" gutterBottom>
                                    As permissões selecionadas aqui serão adicionadas às permissões já concedidas pelo Papel (Role) do usuário.
                                </Typography>
                                <Grid container spacing={1} style={{ marginTop: 16 }}>
                                    {allPermissions.map(permission => (
                                        <Grid item xs={12} sm={6} md={4} key={permission.id}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={selectedPermissions.includes(permission.id)}
                                                        onChange={() => handlePermissionChange(permission.id)}
                                                        name={`permission-${permission.id}`}
                                                        color="primary"
                                                    />
                                                }
                                                label={permission.description || permission.name}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                                <div className={classes.btnWrapper}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => handleSaveUser(user)}
                                    >
                                        Salvar Alterações
                                    </Button>
                                </div>
                            </>
                        )}
                        no={() => <Typography variant="h6" color="error">Você não tem permissão para editar permissões.</Typography>}
                    />
                </Box>

            </Paper>
        </MainContainer>
    );
};

export default UserEdit;
