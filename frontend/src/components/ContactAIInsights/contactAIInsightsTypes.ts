export interface Insight {
  averageSentiment?: number;
  conversationCount?: number;
  totalMessages?: number;
  topTopics?: string[];
  recentSummaries?: Array<{ summary: string; ticketId: number }>;
}

export interface ChatMessage {
  role: "user" | "ai";
  content: string;
  sources?: string[];
}

export interface ContactAIInsightsProps {
  contactId: number;
  ticketId?: number;
}
