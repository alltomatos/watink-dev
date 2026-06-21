import React from "react";
import { parseData, getParticipantColor } from "../utils/messageHelpers";
import { Message } from "../types";

interface SenderNameProps {
  message: Message;
  isGroup?: boolean;
  colorCache: Map<string, string>;
}

const SenderName: React.FC<SenderNameProps> = ({
  message,
  isGroup,
  colorCache,
}) => {
  if (!isGroup || message.fromMe) return null;
  const data = parseData(message.dataJson);
  const pushName = data.pushName as string | undefined;
  const participantNumber = message.participant
    ? (message.participant as string).replace(/\D/g, "")
    : undefined;
  const displayName = pushName || participantNumber || "Unknown";
  const color = getParticipantColor(message, colorCache);
  return (
    <span className="flex font-medium" style={{ color }}>
      {displayName}
    </span>
  );
};

export default SenderName;
