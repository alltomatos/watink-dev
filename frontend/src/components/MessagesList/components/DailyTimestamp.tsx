import React from "react";
import { isSameDay, parseISO, format } from "date-fns";
import { isDateValid } from "../utils/messageHelpers";
import { Message } from "../types";

interface DailyTimestampProps {
  message: Message;
  index: number;
  messagesList: Message[];
}

const DailyTimestamp: React.FC<DailyTimestampProps> = ({
  message,
  index,
  messagesList,
}) => {
  if (!isDateValid(message.createdAt)) return null;
  const showTimestamp =
    index === 0 ||
    !isDateValid(messagesList[index - 1]?.createdAt) ||
    !isSameDay(
      parseISO(messagesList[index].createdAt),
      parseISO(messagesList[index - 1].createdAt)
    );
  if (!showTimestamp) return null;
  return (
    <span className="self-center w-[110px] text-center bg-[hsl(var(--message-daily-bg))] mx-2.5 my-2.5 rounded-[10px] shadow-sm">
      <div className="text-[hsl(var(--message-daily-text))] p-2 self-center ml-0">
        {format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")}
      </div>
    </span>
  );
};

export default DailyTimestamp;
