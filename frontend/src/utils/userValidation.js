import * as Yup from "yup";

export const UserSchema = Yup.object().shape({
    name: Yup.string()
        .min(2, "Muito curto!")
        .max(50, "Muito longo!")
        .required("Obrigatório"),
    password: Yup.string().min(5, "Muito curto!").max(50, "Muito longo!"),
    email: Yup.string().email("Email inválido").required("Obrigatório"),
});

export const UserProfileSchema = Yup.object().shape({
    name: Yup.string()
        .min(2, "Too Short!")
        .max(50, "Too Long!")
        .required("Required"),
    email: Yup.string().email("Invalid email").required("Required"),
    password: Yup.string().min(5, "Too Short!").max(50, "Too Long!"),
    confirmPassword: Yup.string().oneOf(
        [Yup.ref("password"), null],
        "Passwords must match"
    ),
});
