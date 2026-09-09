"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { appwriteConfig, client, tablesDB, ID, Query } from "@/lib/appwrite";
import { getConversationId, Message, Profile } from "@/types";
import ProtectedRoute from "@/components/ProtectedRoute";
import UserList from "@/components/UserList";
import ChatWindow from "@/components/ChatWindow";
import type { Models } from "appwrite";

function ChatPageContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Keep a ref to the currently open conversation so the realtime
  // subscription callback (registered once) always reads the latest value.
  const selectedUserRef = useRef<Profile | null>(null);
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  // Load the list of registered users (profiles), excluding ourselves.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await tablesDB.listRows({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.profilesTableId,
          queries: [Query.limit(100)],
        });
        const others = (res.rows as unknown as Profile[]).filter(
          (p) => p.userId !== user.$id
        );
        setProfiles(others);
      } catch (err) {
        console.error("Failed to load users", err);
      }
    })();
  }, [user]);

  // Load message history whenever the selected conversation changes.
  useEffect(() => {
    if (!user || !selectedUser) {
      setMessages([]);
      return;
    }
    const conversationId = getConversationId(user.$id, selectedUser.userId);
    setLoadingMessages(true);
    (async () => {
      try {
        const res = await tablesDB.listRows({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.messagesTableId,
          queries: [
            Query.equal("conversationId", conversationId),
            Query.orderAsc("$createdAt"),
            Query.limit(200),
          ],
        });
        setMessages(res.rows as unknown as Message[]);
      } catch (err) {
        console.error("Failed to load messages", err);
      } finally {
        setLoadingMessages(false);
      }
    })();

    // Opening a conversation clears its unread indicator.
    setUnreadCounts((prev) => ({ ...prev, [selectedUser.userId]: 0 }));
  }, [user, selectedUser]);

  // Single realtime subscription for the messages collection, active for
  // the whole time the chat page is mounted. New documents are routed to
  // the open conversation, or tallied as unread for other conversations.
  useEffect(() => {
    if (!user) return;

    const channel = `tablesdb.${appwriteConfig.databaseId}.tables.${appwriteConfig.messagesTableId}.rows`;

    const unsubscribe = client.subscribe(channel, (event) => {
      if (!event.events.some((e) => e.endsWith(".create"))) return;
      const doc = event.payload as Message;

      // Only messages that involve the current user are relevant.
      if (doc.senderId !== user.$id && doc.receiverId !== user.$id) return;

      const current = selectedUserRef.current;
      const openConversationId = current
        ? getConversationId(user.$id, current.userId)
        : null;

      if (doc.conversationId === openConversationId) {
        setMessages((prev) =>
          prev.some((m) => m.$id === doc.$id) ? prev : [...prev, doc]
        );
      } else if (doc.receiverId === user.$id) {
        // A message arrived for a conversation that isn't currently open.
        setUnreadCounts((prev) => ({
          ...prev,
          [doc.senderId]: (prev[doc.senderId] || 0) + 1,
        }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!user || !selectedUser) return;
      const conversationId = getConversationId(user.$id, selectedUser.userId);
      const newRow = await tablesDB.createRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.messagesTableId,
        rowId: ID.unique(),
        data: {
          conversationId,
          senderId: user.$id,
          senderName: user.name,
          receiverId: selectedUser.userId,
          content,
        },
      });
      // Add locally right away; the realtime event for our own message
      // will be de-duplicated by $id in the subscription handler above.
      setMessages((prev) => [...prev, newRow as unknown as Message]);
    },
    [user, selectedUser]
  );

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (!user) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar: full-width on mobile until a chat is opened, fixed width on larger screens */}
      <div
        className={`w-full shrink-0 md:w-80 ${
          selectedUser ? "hidden md:block" : "block"
        }`}
      >
        <UserList
          users={profiles}
          selectedUserId={selectedUser?.userId ?? null}
          onSelect={setSelectedUser}
          unreadCounts={unreadCounts}
          currentUserName={user.name}
          onLogout={handleLogout}
        />
      </div>

      {/* Conversation: hidden on mobile until a user is selected */}
      <div
        className={`h-full flex-1 flex-col ${
          selectedUser ? "flex" : "hidden md:flex"
        }`}
      >
        <ChatWindow
          otherUser={selectedUser}
          currentUserId={user.$id}
          messages={messages}
          loadingMessages={loadingMessages}
          onSend={handleSend}
          onBack={() => setSelectedUser(null)}
        />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatPageContent />
    </ProtectedRoute>
  );
}
