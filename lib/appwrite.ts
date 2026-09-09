import { Client, Account, TablesDB, ID, Query } from "appwrite";

// Public, non-secret configuration. Never put an Appwrite API key in
// client-side code — the client SDK only needs the endpoint + project ID.
export const appwriteConfig = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT as string,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID as string,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID as string,
  profilesTableId: process.env
    .NEXT_PUBLIC_APPWRITE_PROFILES_TABLE_ID as string,
  messagesTableId: process.env
    .NEXT_PUBLIC_APPWRITE_MESSAGES_TABLE_ID as string,
};

const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export { client, ID, Query };
