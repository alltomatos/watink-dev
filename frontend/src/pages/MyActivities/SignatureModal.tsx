/* @jsxImportSource react */
import React, { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (dataUrl: string) => void;
  title?: string;
}

const SignatureModal: React.FC<SignatureModalProps> = ({
  open,
  onClose,
  onConfirm,
  title = "Assinatura",
}) => {
  const sigPad = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigPad.current?.clear();
    setIsEmpty(true);
  };

  const handleConfirm = () => {
    if (!sigPad.current || sigPad.current.isEmpty()) {
      alert("Por favor, assine antes de confirmar.");
      return;
    }
    const dataUrl = sigPad.current.getTrimmedCanvas().toDataURL("image/png");
    onConfirm(dataUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Por favor, assine no campo abaixo para confirmar a execução.
          </p>
          <div
            className="relative w-full rounded-md border border-border bg-muted/50"
            style={{ height: 300 }}
          >
            <SignatureCanvas
              ref={sigPad}
              penColor="var(--foreground)"
              canvasProps={{
                className: "w-full h-full",
              }}
              onBegin={() => setIsEmpty(false)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" size="sm" onClick={handleClear}>
            <Eraser className="mr-2 h-4 w-4" />
            Limpar
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={isEmpty}>
            Confirmar Assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SignatureModal;