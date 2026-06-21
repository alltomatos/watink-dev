/* @jsxImportSource react */
import React, { useState } from "react";
import * as Yup from "yup";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Formik, Form } from "formik";
import { UserPlus, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent } from "../../components/ui/card";

const UserSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Muito curto!")
    .max(50, "Muito longo!")
    .required("Obrigatório"),
  email: Yup.string().email("E-mail inválido").required("Obrigatório"),
  password: Yup.string().min(5, "Mínimo de 5 caracteres").max(50, "Máximo de 50 caracteres").required("Obrigatório"),
});

const SignUp = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const initialState = { name: "", email: "", password: "" };

  const handleSignUp = async (values: { name: string; email: string; password: string }) => {
    try {
      await api.post("/auth/signup", values);
      toast.success(i18n.t("signup.toasts.success"));
      navigate("/login");
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[30%] h-[30%] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <Card className="w-full max-w-md z-10 shadow-xl border-border/40 bg-card/95 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="flex flex-col items-center space-y-6">
            <div className="flex flex-col items-center space-y-2 text-center w-full">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {i18n.t("signup.title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                Crie sua conta para começar a gerenciar seus canais
              </p>
            </div>

            <Formik
              initialValues={initialState}
              validationSchema={UserSchema}
              onSubmit={async (values, actions) => {
                await handleSignUp(values);
                actions.setSubmitting(false);
              }}
            >
              {({ values, touched, errors, handleChange, handleBlur, isSubmitting }) => (
                <Form className="grid gap-4 w-full">
                  <div className="grid gap-2">
                    <Label htmlFor="name">{i18n.t("signup.form.name")}</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Seu nome completo"
                      autoComplete="name"
                      required
                      value={values.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={touched.name && errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {touched.name && errors.name && (
                      <p className="text-[11px] font-medium text-destructive">{errors.name}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">{i18n.t("signup.form.email")}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="nome@empresa.com"
                      autoComplete="email"
                      required
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={touched.email && errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {touched.email && errors.email && (
                      <p className="text-[11px] font-medium text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">{i18n.t("signup.form.password")}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={values.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`pr-10 ${touched.password && errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" /> }
                      </button>
                    </div>
                    {touched.password && errors.password && (
                      <p className="text-[11px] font-medium text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <Button type="submit" className="h-11 w-full text-base font-bold mt-2" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      i18n.t("signup.buttons.submit")
                    )}
                  </Button>
                </Form>
              )}
            </Formik>

            <div className="flex flex-col items-center space-y-4 w-full pt-2 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <RouterLink to="/login" className="font-medium text-primary hover:underline">
                  {i18n.t("signup.buttons.login")}
                </RouterLink>
              </div>
              
              <RouterLink to="/login" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors group">
                <ArrowLeft className="mr-1 h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
                Voltar para o login
              </RouterLink>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUp;
