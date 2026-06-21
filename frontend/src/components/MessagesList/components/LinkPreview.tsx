import React from "react";
import { parseData } from "../utils/messageHelpers";
import { Message } from "../types";

interface Props {
  message: Message;
}

const LinkPreview: React.FC<Props> = ({ message }) => {
  const data = parseData(message.dataJson);
  if (!data?.preview) return null;
  const preview = data.preview as {
    url?: string;
    image?: string;
    title?: string;
    description?: string;
  };
  return (
    <div
      className="mt-1.5 mb-1.5 bg-[var(--bg-surface-alt)] rounded-lg overflow-hidden max-w-[300px] border border-[var(--border-default)] cursor-pointer"
      onClick={() => preview.url && window.open(preview.url, "_blank")}
    >
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.title}
          className="w-full h-[150px] object-cover"
        />
      )}
      <div className="p-2.5">
        <a
          href={preview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold no-underline text-inherit block mb-1 text-sm"
        >
          {preview.title}
        </a>
        <p className="text-xs text-[hsl(var(--message-quote-text))] m-0 line-clamp-3">
          {preview.description}
        </p>
      </div>
    </div>
  );
};

export default LinkPreview;
