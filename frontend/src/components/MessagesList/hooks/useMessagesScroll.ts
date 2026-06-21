import { useEffect, RefObject, MutableRefObject } from "react";
import { Message } from "../types";

export function useMessagesScroll(
  messagesList: Message[],
  pageNumber: number,
  lastMessageRef: RefObject<HTMLDivElement>,
  messagesListRef: RefObject<HTMLDivElement>,
  shouldScrollRef: MutableRefObject<"smooth" | "auto" | null>,
  hasMore: boolean,
  loading: boolean,
  loadMore: () => void
): { handleScroll: (e: React.UIEvent<HTMLDivElement>) => void } {
  useEffect(() => {
    if (shouldScrollRef.current) {
      const behavior = shouldScrollRef.current === "smooth" ? "smooth" : "auto";
      if (pageNumber <= 1) {
        setTimeout(() => {
          lastMessageRef.current?.scrollIntoView({ behavior });
        }, 100);
      }
      shouldScrollRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesList]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore) return;
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && messagesListRef.current) {
      messagesListRef.current.scrollTop = 1;
    }
    if (loading) return;
    if (scrollTop < 50) loadMore();
  };

  return { handleScroll };
}
