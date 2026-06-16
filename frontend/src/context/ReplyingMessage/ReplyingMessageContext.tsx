import React, { useState, createContext, ReactNode } from "react";

interface Message {
  id?: string;
  body?: string;
  [key: string]: unknown;
}

interface ReplyMessageContextValue {
  replyingMessage: Message | null;
  setReplyingMessage: (msg: Message | null) => void;
}

const ReplyMessageContext = createContext<ReplyMessageContextValue>({
  replyingMessage: null,
  setReplyingMessage: () => {},
});

const ReplyMessageProvider = ({ children }: { children: ReactNode }) => {
  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);

  return (
    <ReplyMessageContext.Provider value={{ replyingMessage, setReplyingMessage }}>
      {children}
    </ReplyMessageContext.Provider>
  );
};

export { ReplyMessageContext, ReplyMessageProvider };
