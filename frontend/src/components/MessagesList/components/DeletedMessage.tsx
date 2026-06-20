import React from "react";
import { Ban } from "lucide-react";
import { parseData } from "../utils/messageHelpers";
import { Message } from "../types";

interface DeletedMessageProps {
  message: Message;
}

const DeletedMessage: React.FC<DeletedMessageProps> = ({ message }) => {
  if (!message.isDeleted) return null;
  const data = parseData(message.dataJson);
  const deletedBy = data?.deletedBy as string | undefined;
  return (
    <div className="text-[13px] text-[var(--text-muted)] italic mb-1.5">
      <Ban className="inline h-4 w-4 mr-1.5 align-bottom" />
      {deletedBy ? `Mensagem apagada por: ${deletedBy}` : "Mensagem apagada"}
    </div>
  );
};

export default DeletedMessage;
