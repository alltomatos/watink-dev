import React, { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { VirtuosoMessageList } from '@virtuoso.dev/message-list';
import { subscribeToSocket } from '../../services/socket-io';
import MessageItem from './MessageItem';
import { Message } from '../../types/Message';
import { SocketMessageEvent } from '../../types/api';
import api from '../../services/api';

interface MessageListContainerProps {
  ticketId: string | number;
}

interface MessagesResponse {
  messages: Message[];
}

export const MessageListContainer: React.FC<MessageListContainerProps> = ({ ticketId }) => {
  const queryClient = useQueryClient();
  const virtuosoRef = useRef<{ scrollToIndex: (index: number) => void } | null>(null);

  // Fetch initial history
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['messages', ticketId],
    queryFn: async () => {
      const response = await api.get<MessagesResponse>(`/messages/${ticketId}`);
      return response.data.messages;
    },
  });

  // Listen for new messages
  useEffect(() => {
    const handleNewMessage = (data: SocketMessageEvent<Message>) => {
      if (data.action === 'create') {
        const newMessage = data.message;
        queryClient.setQueryData<Message[]>(['messages', ticketId], (oldData) => {
          if (!oldData) return [newMessage];
          if (oldData.find(m => m.id === newMessage.id)) {
            return oldData;
          }
          return [...oldData, newMessage];
        });
      } else if (data.action === 'update') {
        const updatedMessage = data.message;
        queryClient.setQueryData<Message[]>(['messages', ticketId], (oldData) => {
          if (!oldData) return [];
          return oldData.map(m => m.id === updatedMessage.id ? updatedMessage : m);
        });
      }
    };

    return subscribeToSocket({
      [`ticket:${ticketId}:message`]: handleNewMessage,
      appMessage: handleNewMessage,
    });
  }, [ticketId, queryClient]);


  if (isLoading) return <div>Carregando mensagens...</div>;

  return (
    <VirtuosoMessageList
      ref={virtuosoRef}
      data={messages}
      ItemContent={({ data }: { data: Message }) => <MessageItem message={data} />}
      computeItemKey={({ data }: { data: Message }) => String(data.id)}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    />
  );
};
