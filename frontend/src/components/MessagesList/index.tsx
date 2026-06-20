/* @jsxImportSource react */
import React from "react";
import { History, Loader2 } from "lucide-react";

import MessageOptionsMenu from "../MessageOptionsMenu";
import whatsBackground from "../../assets/wa-background.png";

import { useThemeContext } from "../../context/DarkMode";

import { useMessagesList } from "./hooks/useMessagesList";
import HistorySyncModal from "./components/HistorySyncModal";
import MessageBubble from "./components/MessageBubble";

interface MessagesListProps {
  ticketId: string | number;
  isGroup?: boolean;
}

const MessagesList: React.FC<MessagesListProps> = ({ ticketId, isGroup }) => {
  const { appTheme } = useThemeContext();

  const {
    messagesList,
    loading,
    lastMessageRef,
    messagesListRef,
    selectedMessage,
    anchorEl,
    messageOptionsMenuOpen,
    mentionsMap,
    groupColorCacheRef,
    historyModalOpen,
    historyFromDate,
    historyLoading,
    setHistoryModalOpen,
    setHistoryFromDate,
    handleScroll,
    handleOpenMessageOptionsMenu,
    handleCloseMessageOptionsMenu,
    handleSyncHistory,
  } = useMessagesList(ticketId, isGroup);

  return (
    <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden">
      <MessageOptionsMenu
        message={selectedMessage}
        anchorEl={anchorEl}
        menuOpen={messageOptionsMenuOpen}
        handleClose={handleCloseMessageOptionsMenu}
      />

      <HistorySyncModal
        open={historyModalOpen}
        fromDate={historyFromDate}
        loading={historyLoading}
        onOpenChange={setHistoryModalOpen}
        onFromDateChange={setHistoryFromDate}
        onSync={handleSyncHistory}
      />

      <button
        type="button"
        className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm hover:bg-[var(--bg-surface-alt)] transition-colors"
        onClick={() => setHistoryModalOpen(true)}
        title="Buscar histórico"
        aria-label="Buscar histórico"
      >
        <History className="h-4 w-4 text-[var(--text-muted)]" />
      </button>

      <div
        id="messagesList"
        className="flex flex-col flex-1 min-h-0 p-5 overflow-y-auto sm:pb-5 pb-[90px]"
        style={{ backgroundImage: `url(${whatsBackground})` }}
        onScroll={handleScroll}
        ref={messagesListRef}
      >
        {messagesList.length === 0 ? (
          <div>Say hello to your new contact!</div>
        ) : (
          messagesList.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              index={index}
              messagesList={messagesList}
              isGroup={isGroup}
              appTheme={appTheme}
              mentionsMap={mentionsMap}
              colorCache={groupColorCacheRef.current ?? new Map()}
              onOpenOptions={handleOpenMessageOptionsMenu}
            />
          ))
        )}
        <div ref={lastMessageRef} />
      </div>

      {loading && (
        <div>
          <Loader2 className="absolute top-3 left-1/2 -ml-3 h-6 w-6 animate-spin text-[var(--status-success)] opacity-70" />
        </div>
      )}
    </div>
  );
};

export default MessagesList;
