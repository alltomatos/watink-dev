import { Message } from '../../types/Message';
import { cn } from '../../lib/utils';
import MessageMedia from './MessageMedia';
import { Check, CheckCheck, Clock } from 'lucide-react';

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isFromMe = message.fromMe;

  const renderAck = () => {
    if (!isFromMe) return null;
    switch (message.ack) {
      case 0: return <Clock className="w-3 h-3 text-slate-400" />;
      case 1: return <Check className="w-3 h-3 text-slate-400" />;
      case 2: return <CheckCheck className="w-3 h-3 text-slate-400" />;
      case 3: return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default: return null;
    }
  };

  return (
    <div className={cn("flex w-full mb-2", isFromMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-4 py-2 text-sm shadow-sm",
          isFromMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-white text-slate-900 rounded-tl-none border border-slate-200"
        )}
      >
        {message.participant && !isFromMe && (
          <div className="text-xs font-semibold text-slate-500 mb-1">{message.participant}</div>
        )}

        {message.mediaType && message.mediaUrl && (
          <div className="mb-2">
            <MessageMedia mediaType={message.mediaType} mediaUrl={message.mediaUrl} />
          </div>
        )}

        <div className="whitespace-pre-wrap break-words">{message.body}</div>

        <div className={cn("flex items-center justify-end gap-1 mt-1 text-[10px]", isFromMe ? "text-blue-100" : "text-slate-400")}>
          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {renderAck()}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
