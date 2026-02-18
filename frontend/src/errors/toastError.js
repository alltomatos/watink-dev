/* @jsxImportSource react */
import { toast } from "react-toastify";
import { i18n } from "../translate/i18n";

const toastError = err => {
	const status = err.response?.status;
	const errorMsg = err.response?.data?.message || err.response?.data?.error;

	if (status === 402) {
		toast.error("Assinatura requerida ou expirada. Verifique seus planos no Marketplace.", {
			toastId: "PAYMENT_REQUIRED",
			onClick: () => { window.location.href = "/admin/settings/billing"; }
		});
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
