/* @jsxImportSource react */
import React, { useState, useContext, useRef, useEffect } from "react";
import { Formik, Form } from "formik";
import { toast } from "react-toastify";
import { 
  Eye, 
  EyeOff, 
  Camera, 
  Save, 
  Loader2,
  User as UserIcon,
  Mail,
  Lock
} from "lucide-react";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { getBackendUrl } from "../../helpers/urlUtils";
import { UserProfileSchema } from "../../utils/userValidation";

import { 
  PageContainer, 
  PageHeader, 
  PageContent 
} from "../../components/ui/page-layout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Avatar } from "../../components/ui/avatar";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";

const UserProfile = () => {
  const { user } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileImage, setProfileImage] = useState(getBackendUrl(user?.profileImage));
  const [signature, setSignature] = useState(user?.signature || "");

  // Busca dados frescos do perfil ao montar (avatar/assinatura podem estar desatualizados no contexto)
  useEffect(() => {
    if (!user?.id) return;
    const fetchProfile = async () => {
      try {
        const { data } = await api.get(`/users/${user.id}`);
        if (data.profileImage) setProfileImage(getBackendUrl(data.profileImage));
        if (data.signature !== undefined) setSignature(data.signature || "");
      } catch (err) {
        // perfil pode não expor estes campos no backend atual — silencioso
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleUpdateUser = async (values) => {
    try {
      const payload: Record<string, unknown> = {
        name: values.name,
        email: values.email,
        signature: values.signature,
      };
      // Só envia senha quando preenchida (evita resetar para vazio)
      if (values.password) payload.password = values.password;

      await api.put(`/users/${user.id}`, payload);
      toast.success(i18n.t("userProfile.toasts.success"));
    } catch (err) {
      toastError(err);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("profileImage", file);

    try {
      const { data } = await api.put(`/users/${user.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data?.profileImage) setProfileImage(getBackendUrl(data.profileImage));
      toast.success(i18n.t("userProfile.toasts.imageSuccess"));
    } catch (err) {
      toastError(err);
    }
  };

  const initialValues = {
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    confirmPassword: "",
    signature: signature,
  };

  return (
    <PageContainer>
      <PageHeader 
        title={i18n.t("userProfile.title")}
        description="Gerencie suas informações pessoais e credenciais de acesso"
      />

      <PageContent className="max-w-3xl pb-20">
        <div className="grid gap-6">
          {/* Avatar Section */}
          <Card className="flex flex-col items-center p-6 text-center">
            <div className="relative group">
              <Avatar 
                src={profileImage} 
                name={user?.name} 
                className="h-32 w-32 text-4xl border-4 border-card shadow-xl"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <Camera className="text-white h-8 w-8" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleUploadImage}
              />
            </div>
            <div className="mt-4">
              <h3 className="text-xl font-bold">{user?.name}</h3>
              <p className="text-sm text-muted-foreground">{user?.profile === "admin" ? "Administrador" : "Atendente"}</p>
            </div>
          </Card>

          {/* Form Section */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Perfil</CardTitle>
              <CardDescription>Mantenha seus dados atualizados para facilitar a identificação</CardDescription>
            </CardHeader>
            <CardContent>
              <Formik
                initialValues={initialValues}
                enableReinitialize={true}
                validationSchema={UserProfileSchema}
                onSubmit={async (values, actions) => {
                  await handleUpdateUser(values);
                  actions.setSubmitting(false);
                }}
              >
                {({ values, touched, errors, handleChange, handleBlur, isSubmitting }) => (
                  <Form className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome completo</Label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="name" 
                            name="name" 
                            className="pl-9" 
                            value={values.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          />
                        </div>
                        {touched.name && errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="email" 
                            name="email" 
                            type="email" 
                            className="pl-9" 
                            value={values.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          />
                        </div>
                        {touched.email && errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Nova Senha (deixe em branco para não alterar)</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="password" 
                          name="password" 
                          type={showPassword ? "text" : "password"} 
                          className="pl-9 pr-10" 
                          value={values.password}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {touched.password && errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          className="pl-9 pr-10"
                          value={values.confirmPassword}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {touched.confirmPassword && errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signature">Assinatura</Label>
                      <Input 
                        id="signature" 
                        name="signature" 
                        placeholder="Ex: Att, Equipe Watink"
                        value={values.signature}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </div>

                    <Separator className="my-4" />

                    <div className="flex justify-end gap-3">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Alterações
                      </Button>
                    </div>
                  </Form>
                )}
              </Formik>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  );
};

export default UserProfile;
