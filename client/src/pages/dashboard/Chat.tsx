import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { chatService } from "../../services/chatService";
import type { ChatContact, ChatMessage } from "../../types";
import { Send, User as UserIcon, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

const Chat = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch contacts on mount
  // Fetch contacts on mount and poll
  useEffect(() => {
    loadContacts();
    const interval = setInterval(loadContacts, 10000); // Poll contacts for new unread messages
    return () => clearInterval(interval);
  }, []);

  // Fetch messages when contact is selected (and poll every 5s)
  useEffect(() => {
    if (!selectedContact) return;

    loadMessages();
    const interval = setInterval(loadMessages, 5000); // Simple polling

    return () => clearInterval(interval);
  }, [selectedContact]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
    // Refresh contacts when messages change (might have read something)
    if (selectedContact) {
      loadContacts();
    }
  }, [messages]);

  const loadContacts = async () => {
    try {
      const data = await chatService.getContacts();
      // Sort: Unread messages on top
      const sortedData = [...data].sort((a, b) => {
        const countA = a.unreadCount || 0;
        const countB = b.unreadCount || 0;
        return countB - countA; // Descending order
      });
      setContacts(sortedData);
    } catch (error) {
      console.error("Failed to load contacts", error);
    }
  };

  const loadMessages = async () => {
    if (!selectedContact) return;
    try {
      const data = await chatService.getHistory(selectedContact.id);
      // Determine if we need to set messages.
      // Optimally, compare IDs, but simple replacement works for now.
      setMessages(data.reverse()); // Reverse to show oldest first (top) if API returns newest first
    } catch (error) {
      console.error("Failed to load messages", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !newMessage.trim()) return;

    try {
      const sentMsg = await chatService.sendMessage(
        selectedContact.id,
        newMessage
      );
      setMessages([...messages, sentMsg]);
      setNewMessage("");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-4">
      {/* Contacts List */}
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <UserIcon size={20} /> Contacts
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              No contacts available.
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`p-4 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 flex items-center gap-3 relative ${
                  selectedContact?.id === contact.id ? "bg-orange-50" : ""
                }`}>
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold relative">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-gray-900">
                      {contact.name}
                    </h3>
                    {contact.unreadCount && contact.unreadCount > 0 ? (
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {contact.unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-500 capitalize">
                    {contact.role}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="w-2/3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold">
                  {selectedContact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedContact.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Messages expire in 48h
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <MessageSquare size={48} className="mb-2 opacity-20" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isMe ? "justify-end" : "justify-start"
                      }`}>
                      <div
                        className={`max-w-[70%] p-3 rounded-lg shadow-sm ${
                          isMe
                            ? "bg-orange-500 text-white rounded-br-none"
                            : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                        }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={`text-[10px] mt-1 text-right ${
                            isMe ? "text-orange-100" : "text-gray-400"
                          }`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-gray-100 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-orange-600 text-white p-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <Send size={20} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageSquare size={64} className="mb-4 text-orange-200" />
            <p className="text-lg font-medium text-gray-600">
              Select a contact to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
