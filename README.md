# Realtime Chat

A one-to-one real-time chat application built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS**, using **Appwrite** (free tier) for authentication, database, and realtime messaging, deployed on **Vercel** (free tier).

## Features

- Email/password signup, login, logout (Appwrite Auth)
- Protected `/chat` route — redirects to `/login` if not authenticated
- List of all registered users
- Select any user to start (or continue) a one-to-one conversation
- Messages are scoped to the correct sender/recipient pair and persist in Appwrite's database
- Switch between conversations; history loads automatically
- Real-time delivery via Appwrite Realtime — no polling
- Sender name + timestamp on every message
- Auto-scroll to the latest message
- Empty messages are blocked
- Responsive layout (mobile shows either the user list or the open chat, with a back button; desktop shows both side by side)
- **Bonus:** unread-message badges per user, cleared when you open that conversation
- **Bonus:** "Sending…" state on the send button, and an inline error banner if a message fails to send

---

## 1. Prerequisites

- Node.js 18.18+ and npm
- A free [Appwrite Cloud](https://cloud.appwrite.io) account (or a self-hosted Appwrite instance)
- A free [Vercel](https://vercel.com) account

---

## 2. Appwrite setup

### 2.1 Create a project

1. Go to the Appwrite Console → **Create Project**. Name it whatever you like (e.g. `realtime-chat`).
2. Copy the **Project ID** and your **API Endpoint** (e.g. `https://cloud.appwrite.io/v1`) — you'll need both for `.env.local`.

### 2.2 Enable email/password auth

1. In the console, go to **Auth → Settings**.
2. Make sure the **Email/Password** method is enabled (it is by default).

### 2.3 Add a Web platform (required for the SDK to work from the browser)

1. Go to **Overview → Add platform → Web app**.
2. For local development, set the hostname to `localhost`.
3. After you deploy to Vercel, come back and add a **second** Web platform with your Vercel domain (e.g. `your-app.vercel.app`) — see step 5.

### 2.4 Create a database

1. Go to **Databases → Create database**. When prompted to choose a database type, pick **TablesDB** (the free-tier option — `DocumentsDB` requires an upgrade). Name it e.g. `chat_db`. Copy its **Database ID**.

> Appwrite's newer console uses "Tables" (with "Columns" and "Rows") instead of the older "Collections" (with "Attributes" and "Documents") terminology. They're the same underlying concept — this app's code uses the `TablesDB` SDK to match what's on the free plan.

### 2.5 Create the `profiles` table

The Appwrite client SDK cannot list all registered auth users directly, so the app keeps a lightweight `profiles` table (one row per signed-up user) to power the user list.

1. Inside your database, **Create table** → name it `profiles`. Copy its **Table ID**.
2. Go to its **Columns** tab and add three String columns:

   | Key       | Type   | Size | Required |
   |-----------|--------|------|----------|
   | `userId`  | String | 64   | Yes      |
   | `name`    | String | 128  | Yes      |
   | `email`   | String | 128  | Yes      |

3. **Permissions** (Settings tab of the table):
   - Add a permission for role **Users** with **Read** access, so any logged-in user can see the list of profiles.
   - Grant **Create** access to role **Users** at the table level too, so a newly signed-up user can create their own profile row. (Leave **Row Security** off — the default — since this app doesn't need per-row permission overrides here.)

### 2.6 Create the `messages` table

1. **Create table** → name it `messages`. Copy its **Table ID**.
2. Go to its **Columns** tab and add five String columns:

   | Key              | Type   | Size | Required |
   |------------------|--------|------|----------|
   | `conversationId` | String | 128  | Yes      |
   | `senderId`       | String | 64   | Yes      |
   | `senderName`     | String | 128  | Yes      |
   | `receiverId`     | String | 64   | Yes      |
   | `content`        | String | 2000 | Yes      |

3. Add an **index** on `conversationId` (Indexes tab → Create index → key `conversationId`, type `key`, column `conversationId`) so conversation lookups stay fast.
4. **Permissions**: grant role **Users** both **Create** and **Read** access at the table level. (Every message a user can see is one they sent or received, so table-level read is fine for this app's scope — for stricter per-row access control you could instead enable Row Security and grant read/write to `user:<senderId>` and `user:<receiverId>` on each row.)

### 2.7 Copy your IDs into `.env.local`

Duplicate `.env.example` as `.env.local` and fill in the values you copied above:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
NEXT_PUBLIC_APPWRITE_PROFILES_TABLE_ID=your-profiles-table-id
NEXT_PUBLIC_APPWRITE_MESSAGES_TABLE_ID=your-messages-table-id
```

> Your endpoint's region prefix (e.g. `fra`, `nyc`, `syd`) depends on where your Appwrite project was created — copy it exactly as shown on your project's Overview page, and add `https://` to the front.

> All of these are **public, non-secret** identifiers — the Appwrite Web SDK authenticates via browser sessions, not an API key, so nothing secret is ever exposed to the client. Never add a server-side Appwrite **API key** to `NEXT_PUBLIC_*` variables or commit one to the repo.

---

## 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up with two different email addresses (e.g. in two browser windows, one normal + one incognito) to test real-time messaging between two users.

---

## 4. Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel, **Add New Project** → import the GitHub repo.
3. In the project's **Environment Variables** settings, add the same five `NEXT_PUBLIC_APPWRITE_*` variables from your `.env.local`.
4. Deploy. Vercel will give you a domain like `your-app.vercel.app`.

### 4.1 Register your Vercel domain in Appwrite

Back in the Appwrite console → **Overview → Add platform → Web app**, add your Vercel domain (`your-app.vercel.app`, and any custom domain you attach) as a **second** platform entry, alongside the `localhost` one you added for local dev. Without this, the browser SDK's requests from your deployed site will be rejected by Appwrite's CORS/platform checks.

---

## 5. Testing real-time messaging

1. Deploy or run locally, then sign up two accounts (e.g. `alice@example.com` and `bob@example.com`).
2. Log in as Alice in one browser/tab, and as Bob in another (use an incognito window so sessions don't collide).
3. As Alice, select Bob from the user list and send a message — it should appear instantly in Bob's open conversation without a page refresh, and as an unread badge if Bob has a different conversation open.

---

## 6. Project structure

```
app/
  layout.tsx          # Root layout, wraps app in AuthProvider
  page.tsx             # Redirects to /login or /chat based on session
  login/page.tsx        # Login form
  signup/page.tsx       # Signup form
  chat/page.tsx          # Protected chat page: user list + conversation
components/
  ProtectedRoute.tsx    # Redirects unauthenticated users to /login
  UserList.tsx          # Sidebar: registered users + unread badges
  ChatWindow.tsx         # Message list, auto-scroll, header
  MessageInput.tsx       # Composer with empty-message guard + sending state
lib/
  appwrite.ts            # Appwrite client/config singleton (TablesDB)
  auth-context.tsx        # React context: session, signup/login/logout
types/
  index.ts                # Shared types + conversationId helper
```

## 7. Notes on design choices

- **`conversationId`** is a deterministic key built by sorting and joining the two participants' user IDs (`types/index.ts` → `getConversationId`), so both users always resolve to the same conversation regardless of who opens it first.
- **Realtime** uses a single Appwrite Realtime subscription on the `messages` table (`tablesdb.<db>.tables.<table>.rows` channel) for the whole time `/chat` is mounted; incoming rows are routed to the open conversation or tallied as unread for others, rather than opening a new subscription per conversation.
- **Profiles table** exists because the Appwrite client SDK has no permission to list all Auth users; a profile row is created alongside each signup instead.
- **TablesDB vs. DocumentsDB**: this app targets Appwrite's `TablesDB` API (tables/columns/rows) since that's what's available on the free plan as of writing. If your project instead has the older `Databases` API (collections/attributes/documents), the concepts map 1:1 but the SDK calls differ — see Appwrite's migration notes if you need to adapt.
