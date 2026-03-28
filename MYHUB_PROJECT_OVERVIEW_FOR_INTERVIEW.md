# MyHub – Project Overview (Interview Prep)

**One-line:** MyHub is a full-stack personal academic dashboard (React, TypeScript, Firebase) for course and assignment management, with an **AI-powered in-app assistant (DashAI)** built on the **OpenAI API**.

---

## MyHub at a Glance

- **What it is:** Web app for students to manage semesters, courses, assignments, recurring templates, calendar events, quick notes, and dashboard widgets (stats, weather, calendar, schedule, notes).
- **Stack:** React, TypeScript, Firebase (Auth, Firestore, Cloud Functions), Vite. Responsive UI with dark/light mode, keyboard shortcuts, and accessibility considerations.
- **Features (high-level):** Real-time sync, search, in-app notifications, email digests/reminders (scheduled via Cloud Functions), widget customization, and an **AI chat assistant (DashAI)** that uses **OpenAI** to answer questions and give suggestions based on the user’s data.

---

## DashAI – OpenAI-Powered AI Chat (Main Focus)

### Role in the product

DashAI is an in-app conversational assistant that helps users with their **schedule, assignments, courses, and calendar** by reading their MyHub data and answering in natural language. It does **not** create or edit data; it only reads and explains.

### How the OpenAI API is used

1. **Backend-only API usage (security & cost)**  
   The frontend never talks to OpenAI directly. A **Firebase Callable Function** (`chatWithAI`) receives the user’s message (and optional chat history), then:
   - Loads the user’s **context** from Firestore (see below).
   - Builds a **system prompt** that defines DashAI’s personality, capabilities, and rules.
   - Calls the **OpenAI Chat Completions API** (`gpt-3.5-turbo`) with that system prompt + conversation history + current message.
   - Returns the assistant reply to the client.  
   The OpenAI API key is stored as a **Firebase secret** and only used in the Cloud Function.

2. **Context injection (RAG-style, without vector search)**  
   Before each API call, the backend runs `gatherUserContext(userId, today, userMessage)`:
   - Reads from Firestore: user profile, timezone, active semester, courses, **course schedules**, **schedule blocks**, **assignments** (with due dates and completion), and **calendar events**.
   - Uses **simple keyword detection** on the user message (e.g. “schedule”, “assignment”, “today”, “course”) to decide which parts of context to include, to keep token usage and cost down.
   - Optionally filters by “today” or “this week” when the user asks about a specific day.
   - Injects a formatted **User Context** string into the system prompt so the model answers only from real data and does not hallucinate.

3. **Prompt design**  
   The system prompt defines:
   - **Personality:** Helpful, conversational, friendly; matches user tone.
   - **Capabilities:** Read/display schedule, assignments, courses, events; give suggestions and planning help.
   - **Limitations:** Cannot create or modify any data; must direct users to the app UI for that.
   - **Rules:** Use only data from User Context; never invent information; handle dates using the provided “today”/timezone.
   - **Conversation guidelines:** Avoid repetitive endings (“How can I help?”); keep answers concise; use bullets for lists.

4. **Conversation memory**  
   The client sends the **last 10 messages** (user + assistant) as `chatHistory`. The backend appends them to the messages array after the system prompt, so the model has multi-turn context. Chat history is also persisted in Firestore per user for a consistent experience across sessions.

5. **Production safeguards**  
   - **Rate limiting:** Daily cap on AI calls per app (e.g. 2000/day) to control cost and abuse.  
   - **Cost tracking:** Token usage and estimated cost per call are stored in Firestore (daily/monthly) for monitoring.  
   - **Error handling:** User-friendly messages for rate limit, auth, and API errors.

### Frontend (AI chat UX)

- **Entry point:** Floating chat button (DashAI) opens a slide-out chat panel.
- **Proactive suggestions:** On open, the app loads the user’s assignments (today / this week / overdue) and shows short, contextual suggestion prompts (e.g. “You have 3 assignments due this week. Want to plan?”).
- **Quick actions / context cards:** The UI can show quick links (e.g. “Open Calendar”) or small “context cards” (e.g. today’s schedule or upcoming assignments) driven by the same data that is sent to the backend for context.
- **Persistence:** Messages are stored in `users/{uid}/aiChatHistory` and listened to in real time so the chat feels continuous across reloads.

### Technical summary for interviews

- **LLM:** OpenAI Chat Completions (`gpt-4o-mini` in production for better $/token vs. older chat models), with system + user/assistant messages.
- **Context:** Not a classical RAG with embeddings; instead, **structured user data** is fetched from Firestore, filtered by intent (keywords + time), and injected as text into the system prompt.
- **Security & scalability:** API key only in Cloud Functions; rate limits and cost tracking; context trimming to limit tokens.
- **UX:** Multi-turn chat, persisted history, proactive suggestions, and optional quick actions/context cards to improve task efficiency.

---

## For Application Questions

**Question #1 – Project where you applied AI Engineering techniques:**  
You can describe MyHub’s DashAI: you integrated the **OpenAI API** (Chat Completions) behind a Firebase Cloud Function; designed a **context pipeline** that pulls user-specific data (assignments, schedule, courses, calendar) from Firestore and injects it into the system prompt based on the user’s message; applied **prompt engineering** (personality, capabilities, guardrails, conciseness); and added **rate limiting** and **cost tracking** for production use. Challenges could include: keeping context relevant without sending too much data (keyword-based filtering, “today”/week filters) and making the assistant clearly read-only so it never claimed to change data.

**Question #2 – Python for data processing / model fine-tuning:**  
MyHub’s AI backend is in **TypeScript/Node (Firebase Functions)**. You can say you used **OpenAI’s API** for inference and structured the **data pipeline** (gathering and formatting user context from Firestore) to feed the model. For Python-specific experience, you can lean on **DEEBUG** (Gemini, Flask, Python) or other coursework.

Use this doc as a short, accurate reference for how MyHub works and how you used the **OpenAI API** for the DashAI chat feature.
