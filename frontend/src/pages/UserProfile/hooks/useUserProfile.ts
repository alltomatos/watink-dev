import { useState, useContext, useRef, useEffect } from "react";
import { toast } from "react-toastify";

import api from "../../../services/api";
import { i18n } from "../../../translate/i18n";
import toastError from "../../../errors/toastError";
import { AuthContext } from "../../../context/Auth/AuthContext";
import { getBackendUrl } from "../../../helpers/urlUtils";
import type { UserProfileFormValues } from "../userProfileTypes";

export function useUserProfile() {
  const { user } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileImage, setProfileImage] = useState(
    getBackendUrl(user?.profileImage as string | undefined)
  );
  const [signature, setSignature] = useState<string>(
    (user as Record<string, unknown>)?.signature as string || ""
  );

  useEffect(() => {
    if (!user?.id) return;
    const fetchProfile = async () => {
      try {
        const { data } = await api.get(`/users/${user.id}`);
        if (data.profileImage) setProfileImage(getBackendUrl(data.profileImage));
        if (data.signature !== undefined) setSignature(data.signature || "");
      } catch {
        // perfil pode não expor estes campos no backend atual — silencioso
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleUpdateUser = async (values: UserProfileFormValues) => {
    try {
      const payload: Record<string, unknown> = {
        name: values.name,
        email: values.email,
        signature: values.signature,
      };
      if (values.password) payload.password = values.password;
      await api.put(`/users/${user!.id}`, payload);
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
      const { data } = await api.put(`/users/${user!.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data?.profileImage) setProfileImage(getBackendUrl(data.profileImage));
      toast.success(i18n.t("userProfile.toasts.imageSuccess"));
    } catch (err) {
      toastError(err);
    }
  };

  const initialValues: UserProfileFormValues = {
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    confirmPassword: "",
    signature,
  };

  return {
    user,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    fileInputRef,
    profileImage,
    initialValues,
    handleUpdateUser,
    handleUploadImage,
  };
}
