export interface Profile {
  $id: string;
  userId: string;
  name: string;
  email: string;
}

export interface Message {
  $id: string;
  $createdAt: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
}

/**
 * Builds a deterministic, order-independent conversation id for a pair of
 * user ids so that both participants always resolve to the same id.
 */
export function getConversationId(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join("_");
}
