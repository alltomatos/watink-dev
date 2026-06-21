import React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

interface PhoneInputDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  phoneNumber: string;
  onPhoneNumberChange: (v: string) => void;
  onConfirm: () => void;
  pairingLoading: boolean;
}

const PhoneInputDialog: React.FC<PhoneInputDialogProps> = ({
  open,
  onOpenChange,
  phoneNumber,
  onPhoneNumberChange,
  onConfirm,
  pairingLoading,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Número para Pareamento</DialogTitle>
      </DialogHeader>
      <div className="py-4">
        <Label htmlFor="phoneNumber" className="mb-2 block">
          Digite o número do telefone com DDD (Ex: 5585999999999):
        </Label>
        <Input
          id="phoneNumber"
          autoFocus
          placeholder="5585999999999"
          value={phoneNumber}
          onChange={(e) => onPhoneNumberChange(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!phoneNumber || phoneNumber.length < 10 || pairingLoading}
        >
          {pairingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Gerar Código
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default PhoneInputDialog;
