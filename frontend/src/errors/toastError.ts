import { toast } from "react-toastify";
import { i18n } from "../translate/i18n";

interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: string;
    };
  };
}

const toastError = (err: unknown): void => {
  const apiErr = err as ApiError;
  const status = apiErr.response?.status;
  const errorMsg = apiErr.response?.data?.message || apiErr.response?.data?.error;

  if (status === 402) {
    toast.error(
      "Assinatura requerida ou expirada. Verifique seus planos no Marketplace.",
      {
        toastId: "PAYMENT_REQUIRED",
        onClick: () => {
          window.location.href = "/admin/settings/billing";
        },
      }
    );
    return;
  }

  if (errorMsg) {
    if (i18n.exists(`backendErrors.${errorMsg}`)) {
      toast.error(i18n.t(`backendErrors.${errorMsg}`), {
        toastId: errorMsg,
      });
    } else {
      toast.error(errorMsg, {
        toastId: errorMsg,
      });
    }
  } else {
    toast.error("An error occurred!");
  }
};

export default toastError;
