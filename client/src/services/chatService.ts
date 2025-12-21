import api from "./api";
import type { ChatMessage, ChatContact } from "../types";

export const chatService = {
  getContacts: async () => {
    const response = await api.get<ChatContact[]>("/chat/contacts");
    return response.data;
  },

  getHistory: async (userId: number) => {
    const response = await api.get<ChatMessage[]>(`/chat/history/${userId}`);
    return response.data;
  },

  sendMessage: async (receiverId: number, content: string) => {
    const response = await api.post<ChatMessage>("/chat/send", {
      receiverId,
      content,
    });
    return response.data;
  },
};
