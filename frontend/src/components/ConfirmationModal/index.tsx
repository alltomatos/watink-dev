import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { i18n } from "../../translate/i18n";

interface ConfirmationModalProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  open: boolean;
  onClose: (confirmed: boolean) => void;
  onConfirm: () => void;
}

const ConfirmationModal = ({ title, children, open, onClose, onConfirm }: ConfirmationModalProps) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(false); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {children && <DialogDescription asChild><div>{children}</div></DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>
            {i18n.t("confirmationModal.buttons.cancel")}
          </Button>
          <Button
            variant="default"
            onClick={() => { onClose(false); onConfirm(); }}
          >
            {i18n.t("confirmationModal.buttons.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;
