import React from "react";
import { Reaction } from "../../../types/Message";
import { Message } from "../types";

interface Props {
  message: Message;
}

const MessageReactions: React.FC<Props> = ({ message }) => {
  let reactions = message.reactions;
  if (typeof reactions === "string") {
    try {
      reactions = JSON.parse(reactions);
    } catch {
      reactions = [];
    }
  }
  if (!Array.isArray(reactions) || reactions.length === 0) return null;

  const aggregated = (reactions as Reaction[]).reduce<
    Array<{ emoji: string; count: number }>
  >((acc, curr) => {
    const emoji = curr.reaction || curr.emoji || curr.text;
    if (!emoji) return acc;
    const existing = acc.find((r) => r.emoji === emoji);
    if (existing) existing.count++;
    else acc.push({ emoji, count: 1 });
    return acc;
  }, []);

  return (
    <div className="absolute -bottom-2.5 left-2.5 bg-[hsl(var(--message-reaction-bg))] rounded-xl px-1.5 py-0.5 shadow-md text-xs flex items-center z-20 cursor-pointer border border-[hsl(var(--message-reaction-border))]">
      {aggregated.map((reaction, index) => (
        <span key={index} className="mr-1">
          {reaction.emoji} {reaction.count > 1 ? reaction.count : ""}
        </span>
      ))}
    </div>
  );
};

export default MessageReactions;
