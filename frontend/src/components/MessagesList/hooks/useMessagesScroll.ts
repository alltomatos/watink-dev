import React, { useCallback } from "react";

interface UseMessagesScrollProps {
  pageNumber: number;
  hasMore: boolean;
  loading: boolean;
  lastMessageRef: React.RefObject<HTMLDivElement | null>;
  messagesListRef: React.RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
}

interface UseMessagesScrollReturn {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

/**
 * Manages scroll behaviour for the messages list:
 * - scrollToBottom: scrolls to the last message ref (no-op when paginating history)
 * - handleScroll: triggers load-more when the user scrolls to the top
 */
export const useMessagesScroll = ({
  pageNumber,
  hasMore,
  loading,
  lastMessageRef,
  messagesListRef,
  onLoadMore,
}: UseMessagesScrollProps): UseMessagesScrollReturn => {
  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      if (pageNumber > 1) return;
      setTimeout(() => {
        lastMessageRef.current?.scrollIntoView({ behavior });
      }, 100);
    },
    [pageNumber, lastMessageRef]
  );

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore) return;
      const { scrollTop } = e.currentTarget;
      if (scrollTop === 0 && messagesListRef.current) {
        messagesListRef.current.scrollTop = 1;
      }
      if (loading) return;
      if (scrollTop < 50) onLoadMore();
    },
    [hasMore, loading, messagesListRef, onLoadMore]
  );

  return { scrollToBottom, handleScroll };
};
