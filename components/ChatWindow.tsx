"use client";

import { useEffect, useRef, useState } from "react";
import { Message, Profile } from "@/types";
import MessageInput from "@/components/MessageInput";

interface ChatWindowProps {
  otherUser: Profile | null;
  currentUserId: string;
  messages: Message[];
  loadingMessages: boolean;
  onSend: (content: string) => Promise<void>;
  onBack?: () => void;
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatWindow({
  otherUser,
  currentUserId,
  messages,
  loadingMessages,
  onSend,
  onBack,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Auto-scroll to the newest message whenever the conversation changes
  // or a new message arrives.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherUser?.$id]);

  const handleSend = async (content: string) => {
    setSendError(null);
    try {
      await onSend(content);
    } catch (err: any) {
      setSendError(
        err?.message || "Message failed to send. Please try again."
      );
      throw err;
    }
  };

  if (!otherUser) {
    return (
      <div className="flex h-full flex-1 items-center justify-center text-slate-400">
        Select a user to start a conversation
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      {/* Clearly identify the currently selected conversation */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <button
          onClick={onBack}
          aria-label="Back to user list"
          className="-ml-2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
        >
          ←
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {otherUser.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div>
          <p className="font-semibold text-slate-800">{otherUser.name}</p>
          <p className="text-xs text-slate-400">{otherUser.email}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 px-5 py-4">
        {loadingMessages ? (
          <p className="text-center text-sm text-slate-400">
            Loading messages...
          </p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400">
            No messages yet. Say hello to {otherUser.name}!
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => {
              const isMine = m.senderId === currentUserId;
              return (
                <div
                  key={m.$id}
                  className={`flex flex-col ${
                    isMine ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      isMine
                        ? "bg-brand-500 text-white"
                        : "bg-white text-slate-800 shadow-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                  <span className="mt-1 px-1 text-[11px] text-slate-400">
                    {isMine ? "You" : m.senderName} · {formatTime(m.$createdAt)}
                  </span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {sendError && (
        <p className="bg-red-50 px-5 py-2 text-sm text-red-600">
          {sendError}
        </p>
      )}

      <MessageInput onSend={handleSend} />
    </div>
  );
}
