import React from 'react';
import { FileText, Mic, MapPin, User } from 'lucide-react';

interface MessageMediaProps {
  mediaType: string;
  mediaUrl: string;
}

const MessageMedia: React.FC<MessageMediaProps> = ({ mediaType, mediaUrl }) => {
  const getMediaContent = () => {
    switch (mediaType) {
      case 'image':
        return <img src={mediaUrl} alt="media" className="max-w-full rounded" />;
      case 'video':
        return <video src={mediaUrl} controls className="max-w-full rounded" />;
      case 'audio':
        return (
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded">
            <Mic className="w-5 h-5 text-slate-500" />
            <audio src={mediaUrl} controls className="h-8" />
          </div>
        );
      case 'vcard':
        return (
          <div className="flex items-center gap-2 p-2 border rounded bg-slate-50">
            <User className="w-8 h-8 text-slate-400" />
            <span className="text-sm font-medium">Contato recebido</span>
          </div>
        );
      case 'location':
        return (
          <div className="flex items-center gap-2 p-2 border rounded bg-slate-50">
            <MapPin className="w-5 h-5 text-red-500" />
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">Ver Localização</a>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 p-2 border rounded bg-slate-50">
            <FileText className="w-5 h-5 text-slate-500" />
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">Arquivo</a>
          </div>
        );
    }
  };

  return <div className="mt-1">{getMediaContent()}</div>;
};

export default MessageMedia;
