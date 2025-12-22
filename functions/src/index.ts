/**
 * Firebase Functions for MyHub AI Assistant
 *
 * This file contains all Cloud Functions for the AI chat feature.
 *
 * Setup:
 * 1. Install dependencies: cd functions && npm install
 * 2. Set OpenAI API key: firebase functions:secrets:set OPENAI_API_KEY
 * 3. Deploy: firebase deploy --only functions
 */

import {onCall} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {setGlobalOptions} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import OpenAI from "openai";
import {defineSecret} from "firebase-functions/params";
import * as nodemailer from "nodemailer";
import {format, startOfDay, differenceInDays} from "date-fns";

// Initialize Firebase Admin
admin.initializeApp();

// Define secrets
const openaiApiKey = defineSecret("OPENAI_API_KEY");
const smtpHost = defineSecret("SMTP_HOST");
const smtpPort = defineSecret("SMTP_PORT");
const smtpUser = defineSecret("SMTP_USER");
const smtpPassword = defineSecret("SMTP_PASSWORD");
const smtpFromEmail = defineSecret("SMTP_FROM_EMAIL");
const smtpFromName = defineSecret("SMTP_FROM_NAME");

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  secrets: [openaiApiKey, smtpHost, smtpPort, smtpUser,
    smtpPassword, smtpFromEmail, smtpFromName],
});

// Initialize OpenAI client (will be initialized in the function)
let openai: OpenAI;

// Constants
const DAILY_RATE_LIMIT = 2000; // Maximum AI calls per day
const GPT_MODEL = "gpt-3.5-turbo";
const MAX_TOKENS = 1000;

/**
 * Check if rate limit is exceeded
 */
async function checkRateLimit():
  Promise<{allowed: boolean; count: number}> {
  const today = new Date().toISOString().split("T")[0];
  const usageRef = admin.firestore().collection("appUsage").doc("aiCalls");
  const dailyRef = usageRef.collection("daily").doc(today);

  try {
    const dailyDoc = await dailyRef.get();

    if (!dailyDoc.exists) {
      // First call today, create document
      await dailyRef.set({
        date: today,
        count: 1,
        lastReset: admin.firestore.FieldValue.serverTimestamp(),
      });
      return {allowed: true, count: 1};
    }

    const data = dailyDoc.data();
    const count = data?.count || 0;

    if (count >= DAILY_RATE_LIMIT) {
      return {allowed: false, count};
    }

    // Increment count
    await dailyRef.update({
      count: admin.firestore.FieldValue.increment(1),
    });

    return {allowed: true, count: count + 1};
  } catch (error) {
    console.error("Error checking rate limit:", error);
    // Allow request on error (fail open)
    return {allowed: true, count: 0};
  }
}

/**
 * Track cost for AI API call
 * @param {number} tokensUsed - Number of tokens used in the API call
 * @param {number} cost - Cost of the API call in dollars
 */
async function trackCost(tokensUsed: number, cost: number): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const month = new Date().toISOString().slice(0, 7); // "2024-12"

  try {
    // Track daily costs
    const dailyRef = admin.firestore()
      .collection("appUsage")
      .doc("costs")
      .collection("daily")
      .doc(today);

    const dailyDoc = await dailyRef.get();
    if (dailyDoc.exists) {
      await dailyRef.update({
        cost: admin.firestore.FieldValue.increment(cost),
        tokens: admin.firestore.FieldValue.increment(tokensUsed),
        calls: admin.firestore.FieldValue.increment(1),
      });
    } else {
      await dailyRef.set({
        date: today,
        cost: cost,
        tokens: tokensUsed,
        calls: 1,
      });
    }

    // Track daily AI calls separately
    const dailyCallsRef = admin.firestore()
      .collection("appUsage")
      .doc("aiCalls")
      .collection("daily")
      .doc(today);

    const dailyCallsDoc = await dailyCallsRef.get();
    if (dailyCallsDoc.exists) {
      await dailyCallsRef.update({
        count: admin.firestore.FieldValue.increment(1),
      });
    } else {
      await dailyCallsRef.set({
        date: today,
        count: 1,
      });
    }

    // Track monthly
    const monthlyRef = admin.firestore()
      .collection("appUsage")
      .doc("costs")
      .collection("monthly")
      .doc(month);

    const monthlyDoc = await monthlyRef.get();
    if (monthlyDoc.exists && monthlyDoc.data()?.month === month) {
      await monthlyRef.update({
        totalCost: admin.firestore.FieldValue.increment(cost),
        totalTokens: admin.firestore.FieldValue.increment(tokensUsed),
        callCount: admin.firestore.FieldValue.increment(1),
      });
    } else {
      // New month, reset
      await monthlyRef.set({
        month: month,
        totalCost: cost,
        totalTokens: tokensUsed,
        callCount: 1,
      });
    }
  } catch (error) {
    console.error("Error tracking cost:", error);
    // Don't throw - cost tracking failure shouldn't break the function
  }
}

/**
 * Gather user context from Firestore (optimized for cost efficiency)
 * @param {string} userId - The user's unique ID
 * @param {Date} today - Today's date in user's timezone (optional)
 * @param {string} userMessage - User's message to determine relevant context
 * @return {Promise<string>} Formatted user context string
 */
async function gatherUserContext(
  userId: string,
  today?: Date,
  userMessage?: string
): Promise<string> {
  try {
    const db = admin.firestore();
    const contextParts: string[] = [];

    // Get user info and preferences (including timezone)
    const userDoc = await db.collection("users").doc(userId).get();
    let userTimezone = "UTC"; // Default timezone
    if (userDoc.exists) {
      const userData = userDoc.data();
      contextParts.push(`User: ${userData?.name || "User"}`);
      // Get timezone from preferences
      if (userData?.preferences?.timezone) {
        userTimezone = userData.preferences.timezone;
      }
      contextParts.push(`Timezone: ${userTimezone}`);
    }

    // Analyze message to determine what context is needed (cost optimization)
    const messageLower = (userMessage || "").toLowerCase();
    const schedulePattern = new RegExp(
      "\\b(schedule|class|lecture|meeting|appointment|time|when|" +
      "today|tomorrow|week|day)\\b"
    );
    const needsSchedule = messageLower.match(schedulePattern);
    const needsAssignments = messageLower.match(
      /\b(assignment|homework|due|deadline|task|project)\b/
    );
    const needsCalendar = messageLower.match(
      /\b(event|calendar|appointment|meeting|reminder)\b/
    );
    const needsCourses = messageLower.match(
      /\b(course|class|subject|semester)\b/
    );

    // If no specific keywords, include everything (general chat)
    const includeAll = !needsSchedule && !needsAssignments &&
      !needsCalendar && !needsCourses;

    // Get active semester
    const semestersSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("semesters")
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (!semestersSnapshot.empty) {
      const semester = semestersSnapshot.docs[0].data();
      contextParts.push(`Active Semester: ${semester.name || "Unknown"}`);

      const semesterId = semestersSnapshot.docs[0].id;

      // Get courses
      const coursesSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("semesters")
        .doc(semesterId)
        .collection("courses")
        .get();

      if (!coursesSnapshot.empty) {
        const courses = coursesSnapshot.docs.map((doc) => {
          const data = doc.data();
          return `${data.courseCode || ""} - ${data.courseName || ""}`;
        });
        contextParts.push(`Courses: ${courses.join(", ")}`);

        // Get course schedules (from course.schedule field)
        const courseSchedules: Array<{
          course: string;
          day: string;
          startTime: string;
          endTime: string;
          location?: string;
        }> = [];
        coursesSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          const schedule = data.schedule || [];
          schedule.forEach((sched: {
            day?: string;
            startTime?: string;
            endTime?: string;
            location?: string;
          }) => {
            courseSchedules.push({
              course: `${data.courseCode || ""} - ${data.courseName || ""}`,
              day: sched.day || "",
              startTime: sched.startTime || "",
              endTime: sched.endTime || "",
              location: sched.location || "",
            });
          });
        });

        // Only include schedule if needed (cost optimization)
        if ((includeAll || needsSchedule || needsCourses) &&
          courseSchedules.length > 0) {
          // If today is provided and user asks about today/tomorrow,
          // only show relevant day
          if (today && (messageLower.includes("today") ||
            messageLower.includes("tomorrow"))) {
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday",
              "Thursday", "Friday", "Saturday"];
            const todayDayName = dayNames[today.getDay()];
            const todaySchedule = courseSchedules.filter((s) =>
              s.day === todayDayName
            );
            if (todaySchedule.length > 0) {
              const todayScheduleText = todaySchedule
                .map((s) => {
                  const loc = s.location ? ` (${s.location})` : "";
                  return `${s.startTime} - ${s.endTime} - ${s.course}${loc}`;
                })
                .join("\n");
              contextParts.push(
                `Today's Schedule (${todayDayName}):\n${todayScheduleText}`
              );
            } else {
              contextParts.push(
                `Today's Schedule (${todayDayName}): No classes scheduled`
              );
            }
          } else {
            // Include full weekly schedule
            const scheduleText = courseSchedules
              .map((s) => {
                const loc = s.location ? ` (${s.location})` : "";
                return `${s.day}: ${s.startTime} - ${s.endTime} - ` +
                  `${s.course}${loc}`;
              })
              .join("\n");
            contextParts.push(`Weekly Schedule:\n${scheduleText}`);
          }
        }

        // Get schedule blocks (only if needed)
        if (includeAll || needsSchedule) {
          const scheduleBlocksSnapshot = await db
            .collection("users")
            .doc(userId)
            .collection("semesters")
            .doc(semesterId)
            .collection("scheduleBlocks")
            .get();

          if (!scheduleBlocksSnapshot.empty) {
            const blocks = scheduleBlocksSnapshot.docs.map((doc) => {
              const data = doc.data();
              const building = data.location?.building || "";
              const room = data.location?.room || "";
              const location = data.location ?
                ` (${building} ${room})`.trim() :
                "";
              const title = data.title || data.courseNumber || "";
              return `${data.dayOfWeek || ""}: ${data.startTime || ""} - ` +
                `${data.endTime || ""} - ${title}${location}`;
            });
            if (blocks.length > 0) {
              // Filter by today if asking about today
              if (today && messageLower.includes("today")) {
                const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday",
                  "Thursday", "Friday", "Saturday"];
                const todayDayName = dayNames[today.getDay()];
                const todayBlocks = blocks.filter((b) =>
                  b.startsWith(`${todayDayName}:`)
                );
                if (todayBlocks.length > 0) {
                  contextParts.push(
                    `Today's Schedule Blocks:\n${todayBlocks.join("\n")}`
                  );
                }
              } else {
                contextParts.push(`Schedule Blocks:\n${blocks.join("\n")}`);
              }
            }
          }
        }
      }

      // Get calendar events (only if needed)
      if (includeAll || needsCalendar || needsSchedule) {
        const calendarEventsSnapshot = await db
          .collection("users")
          .doc(userId)
          .collection("semesters")
          .doc(semesterId)
          .collection("calendarEvents")
          .get();

        if (!calendarEventsSnapshot.empty) {
          // Use today if provided, otherwise use current date
          const todayForFilter = today || new Date();
          const todayDateStr = todayForFilter.toISOString().split("T")[0];
          const nextWeekForEventsCalc = new Date(todayForFilter);
          nextWeekForEventsCalc.setDate(nextWeekForEventsCalc.getDate() + 7);

          const events: Array<{
            date: string;
            title: string;
            startTime?: string;
            endTime?: string;
          }> = [];

          calendarEventsSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            const eventDateStr = data.date; // Format: "YYYY-MM-DD"
            const eventDate = new Date(eventDateStr + "T00:00:00");
            const todayStart = new Date(todayDateStr + "T00:00:00");
            const nextWeekDateStr = nextWeekForEventsCalc.toISOString()
              .split("T")[0];
            const nextWeekStart = new Date(nextWeekDateStr + "T00:00:00");

            if (eventDate >= todayStart && eventDate <= nextWeekStart) {
              events.push({
                date: data.date,
                title: data.title || "",
                startTime: data.startTime,
                endTime: data.endTime,
              });
            }
          });

          // Also include today's specific events if today is provided
          if (today) {
            const todayEvents = events.filter((e) => e.date === todayDateStr);
            if (todayEvents.length > 0) {
              const todayEventsText = todayEvents
                .map((e) => {
                  const time = e.startTime && e.endTime ?
                    ` (${e.startTime} - ${e.endTime})` :
                    e.startTime ? ` (${e.startTime})` : "";
                  return `${e.title}${time}`;
                })
                .join("\n");
              contextParts.push(
                `Today's Calendar Events:\n${todayEventsText}`
              );
            }
          }

          if (events.length > 0) {
            const eventsText = events
              .sort((a, b) => {
                return new Date(a.date).getTime() - new Date(b.date).getTime();
              })
              .map((e) => {
                const time = e.startTime && e.endTime ?
                  ` (${e.startTime} - ${e.endTime})` :
                  e.startTime ? ` (${e.startTime})` : "";
                return `${e.date}: ${e.title}${time}`;
              })
              .join("\n");
            contextParts.push(`Calendar Events (next 7 days):\n${eventsText}`);
          }
        }
      }

      // Get upcoming assignments (only if needed)
      if (includeAll || needsAssignments) {
        const coursesSnapshot = await db
          .collection("users")
          .doc(userId)
          .collection("semesters")
          .doc(semesterId)
          .collection("courses")
          .get();

        // Use today if provided, otherwise use current date
        const todayForAssignments = today || new Date();
        const nextWeekForAssignments = new Date(todayForAssignments);
        nextWeekForAssignments.setDate(nextWeekForAssignments.getDate() + 7);

        const assignments: Array<{
          name: string;
          dueDate: Date;
          course: string;
        }> = [];
        for (const courseDoc of coursesSnapshot.docs) {
          const courseId = courseDoc.id;
          const assignmentsSnapshot = await db
            .collection("users")
            .doc(userId)
            .collection("semesters")
            .doc(semesterId)
            .collection("courses")
            .doc(courseId)
            .collection("assignments")
            .where("completedAt", "==", null)
            .get();

          assignmentsSnapshot.forEach((doc) => {
            const data = doc.data();
            const dueDate = data.dueDate?.toDate();
            if (dueDate) {
              // Compare dates (ignore time)
              const dueDateOnly = new Date(
                dueDate.getFullYear(),
                dueDate.getMonth(),
                dueDate.getDate()
              );
              const todayOnly = new Date(
                todayForAssignments.getFullYear(),
                todayForAssignments.getMonth(),
                todayForAssignments.getDate()
              );
              const nextWeekOnly = new Date(
                nextWeekForAssignments.getFullYear(),
                nextWeekForAssignments.getMonth(),
                nextWeekForAssignments.getDate()
              );

              if (dueDateOnly >= todayOnly && dueDateOnly <= nextWeekOnly) {
                assignments.push({
                  name: data.name,
                  dueDate: dueDate,
                  course: courseDoc.data().courseName,
                });
              }
            }
          });
        }

        if (assignments.length > 0) {
          const assignmentsText = assignments
            .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
            .map((a) => {
              return `${a.name} (${a.course}) - ` +
                `Due: ${a.dueDate.toLocaleDateString()}`;
            })
            .join("\n");
          contextParts.push(
            `Upcoming Assignments (next 7 days):\n${assignmentsText}`
          );

          // Also include today's assignments if today is provided
          if (today) {
            const todayDateStr = today.toISOString().split("T")[0];
            const todayAssignments = assignments.filter((a) => {
              const dueDateStr = a.dueDate.toISOString().split("T")[0];
              return dueDateStr === todayDateStr;
            });
            if (todayAssignments.length > 0) {
              const todayAssignmentsText = todayAssignments
                .map((a) => `${a.name} (${a.course})`)
                .join("\n");
              contextParts.push(
                `Today's Assignments:\n${todayAssignmentsText}`
              );
            }
          }
        }
      }
    }

    return contextParts.join("\n\n");
  } catch (error) {
    console.error("Error gathering user context:", error);
    return "User context unavailable.";
  }
}

/**
 * Main AI Chat Function
 *
 * This function handles chat requests from the frontend.
 * It validates the user, checks rate limits, gathers context,
 * calls OpenAI, tracks costs, and returns the response.
 */
export const chatWithAI = onCall(
  {
    secrets: [openaiApiKey],
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new Error("User must be authenticated to use AI chat.");
    }

    const userId = request.auth.uid;
    const message = request.data.message;
    const chatHistory = request.data.chatHistory || [];

    if (!message || typeof message !== "string" ||
      message.trim().length === 0) {
      throw new Error(
        "Message is required and must be a non-empty string."
      );
    }

    // Validate chat history format
    if (!Array.isArray(chatHistory)) {
      throw new Error("Chat history must be an array.");
    }

    // Initialize OpenAI client with the secret
    if (!openai) {
      openai = new OpenAI({
        apiKey: openaiApiKey.value(),
      });
    }

    // Check rate limit
    const rateLimit = await checkRateLimit();
    if (!rateLimit.allowed) {
      throw new Error(
        "I've reached my daily usage limit. The app has a limit to " +
        "keep costs manageable. Please try again tomorrow, or check " +
        "the admin dashboard for more details."
      );
    }

    try {
      // Get timezone first to calculate today correctly (minimal context)
      const tempContext = await gatherUserContext(userId, undefined, "");
      const timezoneMatch = tempContext.match(/Timezone: ([^\n]+)/);
      const userTimezone = timezoneMatch ? timezoneMatch[1] : "UTC";

      // Calculate today in user's timezone
      const now = new Date();
      const todayDateStr = now.toLocaleDateString("en-CA", {
        timeZone: userTimezone,
      });
      const [year, month, day] = todayDateStr.split("-").map(Number);
      const today = new Date(year, month - 1, day);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Gather full user context with today's date and message
      // for smart filtering
      const userContext = await gatherUserContext(userId, today, message);

      // Format dates for display
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday",
        "Thursday", "Friday", "Saturday"];
      const todayName = dayNames[today.getDay()];
      const tomorrowName = dayNames[tomorrow.getDay()];

      const todayStr = today.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const tomorrowStr = tomorrow.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const currentTime = now.toLocaleTimeString("en-US", {
        timeZone: userTimezone,
        hour: "2-digit",
        minute: "2-digit",
      });

      // Create optimized system prompt with personality and natural flow
      const systemPrompt = "You are DashAI, a warm and helpful personal " +
        "assistant for MyHub. You're friendly, professional, and genuinely " +
        "care about helping users manage their academic life and beyond.\n\n" +
        "YOUR PERSONALITY:\n" +
        "- Be warm, approachable, and conversational - like a helpful " +
        "friend who knows your schedule\n" +
        "- Show enthusiasm when appropriate, but stay professional\n" +
        "- Use natural language - avoid robotic or overly formal phrases\n" +
        "- Vary your responses - don't repeat the same phrases\n" +
        "- Match the user's tone (casual or formal)\n" +
        "- Be concise but not terse - add personality to your responses\n\n" +
        "CRITICAL RULES:\n" +
        "1. ONLY use data from User Context. Never make up information. " +
        "If you don't know something, say so honestly.\n" +
        "2. For empty schedules, be positive: 'You have a free day!' or " +
        "'Your schedule is clear - perfect for catching up!'\n" +
        "3. Date handling - use Current Date Information below:\n" +
        "   - 'today' = the current date shown\n" +
        "   - 'tomorrow' = the next day shown\n" +
        "   - 'next [day]' = the next occurrence of that weekday\n" +
        "   - 'in X days' = X days from today\n" +
        "   - Relative dates are based on Current Date Information\n" +
        "4. Use conversation history naturally. If the user says 'what " +
        "about that?' or 'tell me more', refer back to previous messages.\n\n" +
        `Current Date (${userTimezone}):\n` +
        `- Today: ${todayStr} (${todayName})\n` +
        `- Tomorrow: ${tomorrowStr} (${tomorrowName})\n` +
        `- Current Time: ${currentTime}\n\n` +
        `User Context:\n${userContext}\n\n` +
        "CONVERSATION GUIDELINES:\n" +
        "- NEVER end with questions like 'How can I help you today?' or " +
        "'What can I do for you?' or 'Feel free to ask!' - these are " +
        "repetitive and annoying\n" +
        "- For casual conversation, just respond naturally and end " +
        "naturally - don't force questions or suggestions\n" +
        "- Only ask follow-up questions if it genuinely adds value to " +
        "the conversation\n" +
        "- Vary your responses - sometimes acknowledge, sometimes " +
        "continue the topic, sometimes just provide info\n" +
        "- For casual chat, engage naturally without forcing academic " +
        "topics or suggestions\n" +
        "- When listing schedules/assignments, make it easy to scan " +
        "(use bullet points or clear formatting)\n" +
        "- Show empathy: 'That's a busy day!' or 'You've got this!'\n" +
        "- Keep responses under 200 words unless the user asks for " +
        "detailed information\n" +
        "- Examples of good responses:\n" +
        "  * Empty schedule: 'Great news - you have a free day! Perfect " +
        "for catching up on assignments or taking a break.'\n" +
        "  * Busy schedule: 'You've got a packed day tomorrow! Here's " +
        "what's coming up: [list with times]'\n" +
        "  * Casual chat: Just respond naturally, like a friend. " +
        "Don't add 'How can I help?' or 'Feel free to ask!' - just " +
        "end naturally\n" +
        "  * Follow-ups: 'Based on what we discussed earlier...' or " +
        "'Remember that assignment we talked about?'";

      // Build messages array with chat history
      type MessageRole = "system" | "user" | "assistant";
      type Message = {role: MessageRole; content: string};
      const messagesArray: Message[] = [
        {role: "system", content: systemPrompt},
      ];

      // Add chat history (last 10 messages for context, but limit tokens)
      // Filter and validate chat history
      interface ChatHistoryItem {
        role?: string;
        content?: string;
      }
      const validHistory = chatHistory
        .filter((msg: ChatHistoryItem) =>
          msg &&
          typeof msg === "object" &&
          (msg.role === "user" || msg.role === "assistant") &&
          typeof msg.content === "string" &&
          msg.content.trim().length > 0
        )
        .slice(-10) // Only last 10 messages
        .map((msg: ChatHistoryItem) => ({
          role: msg.role as "user" | "assistant",
          content: (msg.content || "").trim(),
        }));

      // Add chat history to messages
      messagesArray.push(...validHistory);

      // Add current message
      messagesArray.push({role: "user", content: message.trim()});

      // Call OpenAI with full conversation context
      // Temperature 0.8 for more personality and variety
      const completion = await openai.chat.completions.create({
        model: GPT_MODEL,
        messages: messagesArray,
        max_tokens: MAX_TOKENS,
        temperature: 0.8, // Slightly higher for more personality
      });

      const reply = completion.choices[0]?.message?.content ||
        "I apologize, but I could not generate a response.";

      // Calculate cost (GPT-3.5-turbo pricing: $0.002 per 1K tokens)
      const tokensUsed = completion.usage?.total_tokens || 0;
      const cost = (tokensUsed / 1000) * 0.002;

      // Track cost
      await trackCost(tokensUsed, cost);

      return {
        reply: reply,
        tokensUsed: tokensUsed,
        cost: cost,
      };
    } catch (error: unknown) {
      console.error("Error in chatWithAI:", error);

      // Provide user-friendly error messages
      let errorMessage = "I'm having trouble processing that right now. " +
        "Please try again in a moment.";

      if (error instanceof Error) {
        const errMsg = error.message.toLowerCase();
        if (errMsg.includes("rate limit") || errMsg.includes("quota")) {
          errorMessage = "I've reached my usage limit for now. " +
            "Please try again later, or check the admin dashboard " +
            "for usage details.";
        } else if (errMsg.includes("authentication") ||
          errMsg.includes("unauthorized")) {
          errorMessage = "Authentication error. Please refresh the page " +
            "and try again.";
        } else if (errMsg.includes("network") || errMsg.includes("timeout")) {
          errorMessage = "Connection issue. Please check your internet " +
            "and try again.";
        } else if (errMsg.includes("invalid") || errMsg.includes("format")) {
          errorMessage = "I couldn't understand that request. " +
            "Could you rephrase it?";
        }
      }

      throw new Error(errorMessage);
    }
  }
);

// ============================================================================
// EMAIL SERVICE FUNCTIONS
// ============================================================================

/**
 * Get or create nodemailer transporter
 * @return {nodemailer.Transporter} Configured email transporter
 */
function getEmailTransporter(): nodemailer.Transporter {
  const host = smtpHost.value();
  const port = parseInt(smtpPort.value() || "587", 10);
  const user = smtpUser.value();
  const password = smtpPassword.value();

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user: user,
      pass: password,
    },
  });
}

/**
 * Generate email HTML template (same design as before)
 * @param {string} subject - Email subject
 * @param {string} content - Email body content
 * @return {string} Complete HTML email template
 */
function generateEmailTemplate(
  subject: string,
  content: string
): string {
  const bodyStyle = "font-family: -apple-system, BlinkMacSystemFont, " +
    "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; " +
    "line-height: 1.6; color: #333; max-width: 600px; " +
    "margin: 0 auto; padding: 20px;";
  const headerStyle = "background: linear-gradient(135deg, " +
    "#667eea 0%, #764ba2 100%); padding: 30px; " +
    "text-align: center; border-radius: 10px 10px 0 0;";
  const contentStyle = "background: #ffffff; padding: 30px; " +
    "border: 1px solid #e5e7eb; border-top: none; " +
    "border-radius: 0 0 10px 10px;";
  const footerStyle = "text-align: center; margin-top: 30px; " +
    "color: #6b7280; font-size: 12px;";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="${bodyStyle}">
        <div style="${headerStyle}">
          <h1 style="color: white; margin: 0; font-size: 28px;">MyHub</h1>
        </div>
        <div style="${contentStyle}">
          ${content}
        </div>
        <div style="${footerStyle}">
          <p>This email was sent from MyHub. You can manage your " +
            "email preferences in Settings.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Send email using nodemailer
 * @param {string} to - Recipient email address
 * @param {string} toName - Recipient name
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML email content
 * @return {Promise<void>} Promise that resolves when email is sent
 */
async function sendEmail(
  to: string,
  toName: string,
  subject: string,
  htmlContent: string
): Promise<void> {
  const transporter = getEmailTransporter();
  const fromEmail = smtpFromEmail.value();
  const fromName = smtpFromName.value();

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: `"${toName}" <${to}>`,
    subject: subject,
    html: htmlContent,
  });
}

/**
 * Get user data from Firestore
 * @param {string} userId - User ID
 * @return {Promise<Object>} User data with email, name, preferences
 */
async function getUserData(userId: string): Promise<{
  email: string;
  name: string;
  preferences: Record<string, unknown>;
}> {
  const userDoc = await admin.firestore()
    .collection("users")
    .doc(userId)
    .get();

  if (!userDoc.exists) {
    throw new Error("User not found");
  }

  const data = userDoc.data();
  return {
    email: data?.email || "",
    name: data?.name || "User",
    preferences: data?.preferences || {},
  };
}

/**
 * Get assignment data
 * @param {string} userId - User ID
 * @param {string} assignmentId - Assignment ID
 * @return {Promise<Object>} Assignment and course data
 */
async function getAssignmentData(
  userId: string,
  assignmentId: string
): Promise<{
  assignment: {name: string; dueDate: Date; completedAt?: Date};
  course: {courseName: string; courseCode: string};
}> {
  const semesterSnapshot = await admin.firestore()
    .collection("users")
    .doc(userId)
    .collection("semesters")
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (semesterSnapshot.empty) {
    throw new Error("No active semester");
  }

  const semesterId = semesterSnapshot.docs[0].id;
  const coursesSnapshot = await admin.firestore()
    .collection("users")
    .doc(userId)
    .collection("semesters")
    .doc(semesterId)
    .collection("courses")
    .get();

  for (const courseDoc of coursesSnapshot.docs) {
    const assignmentDoc = await admin.firestore()
      .collection("users")
      .doc(userId)
      .collection("semesters")
      .doc(semesterId)
      .collection("courses")
      .doc(courseDoc.id)
      .collection("assignments")
      .doc(assignmentId)
      .get();

    if (assignmentDoc.exists) {
      const assignmentData = assignmentDoc.data();
      const courseData = courseDoc.data();
      const dueDate = assignmentData?.dueDate?.toDate ?
        assignmentData.dueDate.toDate() :
        new Date(assignmentData?.dueDate);

      return {
        assignment: {
          name: assignmentData?.name || "",
          dueDate: dueDate,
          completedAt: assignmentData?.completedAt?.toDate(),
        },
        course: {
          courseName: courseData?.courseName || "Unknown Course",
          courseCode: courseData?.courseCode || "",
        },
      };
    }
  }

  throw new Error("Assignment not found");
}

/**
 * Get all assignments for digest
 * @param {string} userId - User ID
 * @return {Promise<Object>} Assignments organized by due date
 */
async function getAllAssignmentsForDigest(userId: string): Promise<{
  dueToday: Array<{name: string; dueDate: Date; courseName?: string}>;
  dueThisWeek: Array<{name: string; dueDate: Date; courseName?: string}>;
  overdue: Array<{name: string; dueDate: Date; courseName?: string}>;
  semester: {id: string; name: string};
}> {
  const semesterSnapshot = await admin.firestore()
    .collection("users")
    .doc(userId)
    .collection("semesters")
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (semesterSnapshot.empty) {
    throw new Error("No active semester");
  }

  const semesterDoc = semesterSnapshot.docs[0];
  const semesterId = semesterDoc.id;
  const semesterData = semesterDoc.data();

  const coursesSnapshot = await admin.firestore()
    .collection("users")
    .doc(userId)
    .collection("semesters")
    .doc(semesterId)
    .collection("courses")
    .get();

  const courseMap = new Map();
  coursesSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    courseMap.set(doc.id, {
      courseName: data.courseName || "Unknown Course",
      courseCode: data.courseCode || "",
    });
  });

  const assignments: Array<{
    name: string;
    dueDate: Date;
    completedAt?: Date;
    courseId: string;
  }> = [];

  for (const courseDoc of coursesSnapshot.docs) {
    const assignmentsSnapshot = await admin.firestore()
      .collection("users")
      .doc(userId)
      .collection("semesters")
      .doc(semesterId)
      .collection("courses")
      .doc(courseDoc.id)
      .collection("assignments")
      .get();

    assignmentsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const dueDate = data.dueDate?.toDate ?
        data.dueDate.toDate() :
        new Date(data.dueDate);
      assignments.push({
        name: data.name || "",
        dueDate: dueDate,
        completedAt: data.completedAt?.toDate(),
        courseId: courseDoc.id,
      });
    });
  }

  const now = new Date();
  const today = startOfDay(now);

  const dueToday = assignments
    .filter((a) => {
      if (a.completedAt) return false;
      const dueDate = startOfDay(a.dueDate);
      return dueDate.getTime() === today.getTime();
    })
    .map((a) => ({
      name: a.name,
      dueDate: a.dueDate,
      courseName: courseMap.get(a.courseId)?.courseName,
    }));

  const dueThisWeek = assignments
    .filter((a) => {
      if (a.completedAt) return false;
      const dueDate = startOfDay(a.dueDate);
      const daysUntil = differenceInDays(dueDate, today);
      return daysUntil > 0 && daysUntil <= 7;
    })
    .map((a) => ({
      name: a.name,
      dueDate: a.dueDate,
      courseName: courseMap.get(a.courseId)?.courseName,
    }));

  const overdue = assignments
    .filter((a) => {
      if (a.completedAt) return false;
      const dueDate = startOfDay(a.dueDate);
      return dueDate.getTime() < today.getTime();
    })
    .map((a) => ({
      name: a.name,
      dueDate: a.dueDate,
      courseName: courseMap.get(a.courseId)?.courseName,
    }));

  return {
    dueToday,
    dueThisWeek,
    overdue,
    semester: {
      id: semesterId,
      name: semesterData?.name || "Unknown Semester",
    },
  };
}

/**
 * Send assignment reminder email (callable function)
 */
export const sendAssignmentReminderEmail = onCall(
  {
    secrets: [smtpHost, smtpPort, smtpUser, smtpPassword,
      smtpFromEmail, smtpFromName],
  },
  async (request) => {
    if (!request.auth) {
      throw new Error("User must be authenticated");
    }

    const userId = request.auth.uid;
    const assignmentId = request.data.assignmentId;
    const reminderType = request.data.reminderType;

    if (!assignmentId || !reminderType) {
      throw new Error("assignmentId and reminderType are required");
    }

    try {
      const user = await getUserData(userId);
      const preferences = user.preferences || {};

      if (!preferences.emailNotificationsEnabled ||
        !preferences.emailAssignmentReminders) {
        return {success: false, message: "Email notifications disabled"};
      }

      const {assignment, course} = await getAssignmentData(
        userId,
        assignmentId
      );

      if (assignment.completedAt) {
        return {success: false, message: "Assignment already completed"};
      }

      const dueDateStr = format(assignment.dueDate, "MMMM d, yyyy");
      let subject = "";
      let message = "";

      switch (reminderType) {
      case "due-today":
        subject = `📅 ${assignment.name} is due today!`;
        message = `<h2 style="color: #dc2626;">Assignment Due Today</h2>
          <p><strong>${assignment.name}</strong> for ` +
          `<strong>${course.courseName}</strong> is due today ` +
          `(${dueDateStr}).</p>
          <p>Make sure to submit it on time!</p>`;
        break;
      case "due-1-day":
        subject = `⏰ ${assignment.name} is due tomorrow`;
        message = `<h2 style="color: #f59e0b;">Assignment Due Tomorrow</h2>
          <p><strong>${assignment.name}</strong> for ` +
          `<strong>${course.courseName}</strong> is due tomorrow ` +
          `(${dueDateStr}).</p>
          <p>Don't forget to complete it!</p>`;
        break;
      case "due-3-days":
        subject = `📝 ${assignment.name} is due in 3 days`;
        message = `<h2 style="color: #3b82f6;">Upcoming Assignment</h2>
          <p><strong>${assignment.name}</strong> for ` +
          `<strong>${course.courseName}</strong> is due in 3 days ` +
          `(${dueDateStr}).</p>
          <p>Start working on it soon!</p>`;
        break;
      case "overdue":
        subject = `⚠️ ${assignment.name} is overdue`;
        message = `<h2 style="color: #dc2626;">Overdue Assignment</h2>
          <p><strong>${assignment.name}</strong> for ` +
          `<strong>${course.courseName}</strong> was due on ` +
          `${dueDateStr} and is now overdue.</p>
          <p>Please complete it as soon as possible!</p>`;
        break;
      default:
        throw new Error("Invalid reminder type");
      }

      const emailHtml = generateEmailTemplate(subject, message);
      await sendEmail(user.email, user.name, subject, emailHtml);

      return {success: true};
    } catch (error: unknown) {
      console.error("Error sending assignment reminder:", error);
      const errorMessage = error instanceof Error ?
        error.message :
        "Unknown error";
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }
);

/**
 * Send daily digest email (callable function)
 */
export const sendDailyDigestEmail = onCall(
  {
    secrets: [smtpHost, smtpPort, smtpUser, smtpPassword,
      smtpFromEmail, smtpFromName],
  },
  async (request) => {
    if (!request.auth) {
      throw new Error("User must be authenticated");
    }

    const userId = request.auth.uid;

    try {
      const user = await getUserData(userId);
      const preferences = user.preferences || {};

      if (!preferences.emailNotificationsEnabled ||
        preferences.emailDigestFrequency !== "daily") {
        return {success: false, message: "Daily digest not enabled"};
      }

      const {dueToday, dueThisWeek, overdue, semester} =
        await getAllAssignmentsForDigest(userId);
      const now = new Date();

      let content = "<h2 style=\"color: #667eea;\">" +
        "Your Daily Assignment Summary</h2>";
      content += "<p>Here's what's coming up for " +
        `<strong>${semester.name}</strong>:</p>`;

      if (dueToday.length > 0) {
        content += "<h3 style=\"color: #dc2626; margin-top: 20px;\">" +
          `Due Today (${dueToday.length})</h3><ul>`;
        dueToday.forEach((a) => {
          const course = a.courseName || "Unknown Course";
          const dueTime = format(a.dueDate, "h:mm a");
          content += `<li><strong>${a.name}</strong> - ${course} ` +
            `(${dueTime})</li>`;
        });
        content += "</ul>";
      }

      if (overdue.length > 0) {
        content += "<h3 style=\"color: #dc2626; margin-top: 20px;\">" +
          `Overdue (${overdue.length})</h3><ul>`;
        overdue.forEach((a) => {
          const course = a.courseName || "Unknown Course";
          content += `<li><strong>${a.name}</strong> - ${course}</li>`;
        });
        content += "</ul>";
      }

      if (dueThisWeek.length > 0) {
        content += "<h3 style=\"color: #3b82f6; margin-top: 20px;\">" +
          `Due This Week (${dueThisWeek.length})</h3><ul>`;
        dueThisWeek.forEach((a) => {
          const course = a.courseName || "Unknown Course";
          const dateStr = format(a.dueDate, "MMM d, h:mm a");
          content += `<li><strong>${a.name}</strong> - ${course} ` +
            `(${dateStr})</li>`;
        });
        content += "</ul>";
      }

      if (dueToday.length === 0 && overdue.length === 0 &&
        dueThisWeek.length === 0) {
        content += "<p style=\"color: #10b981;\">🎉 Great job! " +
          "You have no assignments due soon.</p>";
      }

      const subject = "📚 Daily Assignment Digest - " +
        `${format(now, "MMMM d, yyyy")}`;
      const emailHtml = generateEmailTemplate(subject, content);
      await sendEmail(user.email, user.name, subject, emailHtml);

      return {success: true};
    } catch (error: unknown) {
      console.error("Error sending daily digest:", error);
      const errorMessage = error instanceof Error ?
        error.message :
        "Unknown error";
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }
);

/**
 * Send weekly digest email (callable function)
 */
export const sendWeeklyDigestEmail = onCall(
  {
    secrets: [smtpHost, smtpPort, smtpUser, smtpPassword,
      smtpFromEmail, smtpFromName],
  },
  async (request) => {
    if (!request.auth) {
      throw new Error("User must be authenticated");
    }

    const userId = request.auth.uid;

    try {
      const user = await getUserData(userId);
      const preferences = user.preferences || {};

      if (!preferences.emailNotificationsEnabled ||
        preferences.emailDigestFrequency !== "weekly") {
        return {success: false, message: "Weekly digest not enabled"};
      }

      const {dueThisWeek, overdue, semester} =
        await getAllAssignmentsForDigest(userId);
      const now = new Date();

      let content = "<h2 style=\"color: #667eea;\">" +
        "Your Weekly Assignment Summary</h2>";
      content += "<p>Here's what's coming up for " +
        `<strong>${semester.name}</strong> this week:</p>`;

      if (overdue.length > 0) {
        content += "<h3 style=\"color: #dc2626; margin-top: 20px;\">" +
          `Overdue (${overdue.length})</h3><ul>`;
        overdue.forEach((a) => {
          const course = a.courseName || "Unknown Course";
          content += `<li><strong>${a.name}</strong> - ${course}</li>`;
        });
        content += "</ul>";
      }

      if (dueThisWeek.length > 0) {
        content += "<h3 style=\"color: #3b82f6; margin-top: 20px;\">" +
          `Due This Week (${dueThisWeek.length})</h3><ul>`;
        dueThisWeek.forEach((a) => {
          const course = a.courseName || "Unknown Course";
          const dateStr = format(a.dueDate, "MMM d, h:mm a");
          content += `<li><strong>${a.name}</strong> - ${course} ` +
            `(${dateStr})</li>`;
        });
        content += "</ul>";
      }

      if (overdue.length === 0 && dueThisWeek.length === 0) {
        content += "<p style=\"color: #10b981;\">🎉 Great job! " +
          "You have no assignments due this week.</p>";
      }

      const subject = "📚 Weekly Assignment Digest - Week of " +
        `${format(now, "MMMM d")}`;
      const emailHtml = generateEmailTemplate(subject, content);
      await sendEmail(user.email, user.name, subject, emailHtml);

      return {success: true};
    } catch (error: unknown) {
      console.error("Error sending weekly digest:", error);
      const errorMessage = error instanceof Error ?
        error.message :
        "Unknown error";
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }
);

/**
 * Send test email (callable function)
 */
export const sendTestEmail = onCall(
  {
    secrets: [smtpHost, smtpPort, smtpUser, smtpPassword,
      smtpFromEmail, smtpFromName],
  },
  async (request) => {
    if (!request.auth) {
      throw new Error("User must be authenticated");
    }

    const userId = request.auth.uid;

    try {
      const user = await getUserData(userId);

      const content = "<h2 style=\"color: #667eea;\">" +
        "Email Setup Successful!</h2>" +
        "<p>If you received this email, your email integration " +
        "is working correctly.</p>" +
        "<p style=\"margin-top: 20px; color: #10b981; " +
        "font-weight: bold;\">✅ Your email notifications are " +
        "ready to go!</p>";

      const subject = "✅ MyHub Email Test";
      const emailHtml = generateEmailTemplate(subject, content);
      await sendEmail(user.email, user.name, subject, emailHtml);

      return {success: true};
    } catch (error: unknown) {
      console.error("Error sending test email:", error);
      const errorMessage = error instanceof Error ?
        error.message :
        "Unknown error";
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }
);

/**
 * Scheduled function: Check and send daily digests
 * Runs every hour to check if it's time to send daily digests
 */
export const checkDailyDigests = onSchedule(
  {
    schedule: "0 * * * *", // Every hour
    timeZone: "America/Halifax",
    secrets: [smtpHost, smtpPort, smtpUser, smtpPassword,
      smtpFromEmail, smtpFromName],
  },
  async () => {
    const db = admin.firestore();
    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      try {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const preferences = userData.preferences || {};

        if (!preferences.emailNotificationsEnabled ||
          preferences.emailDigestFrequency !== "daily") {
          continue;
        }

        const digestTime = preferences.emailDigestTime || "09:00";
        const [hours, minutes] = digestTime.split(":").map(Number);
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);

        // Check if current time matches scheduled time (within 1 hour)
        const timeDiff = Math.abs(now.getTime() - scheduledTime.getTime());
        if (timeDiff > 3600000) { // More than 1 hour difference
          continue;
        }

        // Check if already sent today
        const today = format(now, "yyyy-MM-dd");
        const lastSentKey = `daily-digest-sent-${userId}`;
        const lastSentDoc = await db.collection("emailTracking")
          .doc(lastSentKey)
          .get();

        if (lastSentDoc.exists && lastSentDoc.data()?.date === today) {
          continue; // Already sent today
        }

        // Send daily digest
        const user = await getUserData(userId);
        const {dueToday, dueThisWeek, overdue, semester} =
          await getAllAssignmentsForDigest(userId);

        let content = "<h2 style=\"color: #667eea;\">" +
          "Your Daily Assignment Summary</h2>";
        content += "<p>Here's what's coming up for " +
          `<strong>${semester.name}</strong>:</p>`;

        if (dueToday.length > 0) {
          content += "<h3 style=\"color: #dc2626; margin-top: 20px;\">" +
            `Due Today (${dueToday.length})</h3><ul>`;
          dueToday.forEach((a) => {
            const course = a.courseName || "Unknown Course";
            const dueTime = format(a.dueDate, "h:mm a");
            content += `<li><strong>${a.name}</strong> - ${course} ` +
              `(${dueTime})</li>`;
          });
          content += "</ul>";
        }

        if (overdue.length > 0) {
          content += "<h3 style=\"color: #dc2626; margin-top: 20px;\">" +
            `Overdue (${overdue.length})</h3><ul>`;
          overdue.forEach((a) => {
            const course = a.courseName || "Unknown Course";
            content += `<li><strong>${a.name}</strong> - ${course}</li>`;
          });
          content += "</ul>";
        }

        if (dueThisWeek.length > 0) {
          content += "<h3 style=\"color: #3b82f6; margin-top: 20px;\">" +
            `Due This Week (${dueThisWeek.length})</h3><ul>`;
          dueThisWeek.forEach((a) => {
            const course = a.courseName || "Unknown Course";
            const dateStr = format(a.dueDate, "MMM d, h:mm a");
            content += `<li><strong>${a.name}</strong> - ${course} ` +
              `(${dateStr})</li>`;
          });
          content += "</ul>";
        }

        if (dueToday.length === 0 && overdue.length === 0 &&
          dueThisWeek.length === 0) {
          content += "<p style=\"color: #10b981;\">🎉 Great job! " +
            "You have no assignments due soon.</p>";
        }

        const subject = "📚 Daily Assignment Digest - " +
          `${format(now, "MMMM d, yyyy")}`;
        const emailHtml = generateEmailTemplate(subject, content);
        await sendEmail(user.email, user.name, subject, emailHtml);

        // Mark as sent
        await db.collection("emailTracking").doc(lastSentKey).set({
          date: today,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (error) {
        console.error("Error processing daily digest for user " +
          `${userDoc.id}:`, error);
        // Continue with other users
      }
    }
  }
);

/**
 * Scheduled function: Check and send weekly digests
 * Runs every Monday at 9 AM
 */
export const checkWeeklyDigests = onSchedule(
  {
    schedule: "0 9 * * 1", // Every Monday at 9 AM
    timeZone: "America/Halifax",
    secrets: [smtpHost, smtpPort, smtpUser, smtpPassword,
      smtpFromEmail, smtpFromName],
  },
  async () => {
    const db = admin.firestore();
    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      try {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const preferences = userData.preferences || {};

        if (!preferences.emailNotificationsEnabled ||
          preferences.emailDigestFrequency !== "weekly") {
          continue;
        }

        // Check if already sent this week
        const now = new Date();
        const weekStart = format(now, "yyyy-MM-dd");
        const lastSentKey = `weekly-digest-sent-${userId}`;
        const lastSentDoc = await db.collection("emailTracking")
          .doc(lastSentKey)
          .get();

        if (lastSentDoc.exists && lastSentDoc.data()?.week === weekStart) {
          continue; // Already sent this week
        }

        // Send weekly digest
        const user = await getUserData(userId);
        const {dueThisWeek, overdue, semester} =
          await getAllAssignmentsForDigest(userId);

        let content = "<h2 style=\"color: #667eea;\">" +
          "Your Weekly Assignment Summary</h2>";
        content += "<p>Here's what's coming up for " +
          `<strong>${semester.name}</strong> this week:</p>`;

        if (overdue.length > 0) {
          content += "<h3 style=\"color: #dc2626; margin-top: 20px;\">" +
            `Overdue (${overdue.length})</h3><ul>`;
          overdue.forEach((a) => {
            const course = a.courseName || "Unknown Course";
            content += `<li><strong>${a.name}</strong> - ${course}</li>`;
          });
          content += "</ul>";
        }

        if (dueThisWeek.length > 0) {
          content += "<h3 style=\"color: #3b82f6; margin-top: 20px;\">" +
            `Due This Week (${dueThisWeek.length})</h3><ul>`;
          dueThisWeek.forEach((a) => {
            const course = a.courseName || "Unknown Course";
            const dateStr = format(a.dueDate, "MMM d, h:mm a");
            content += `<li><strong>${a.name}</strong> - ${course} ` +
              `(${dateStr})</li>`;
          });
          content += "</ul>";
        }

        if (overdue.length === 0 && dueThisWeek.length === 0) {
          content += "<p style=\"color: #10b981;\">🎉 Great job! " +
            "You have no assignments due this week.</p>";
        }

        const subject = "📚 Weekly Assignment Digest - Week of " +
          `${format(now, "MMMM d")}`;
        const emailHtml = generateEmailTemplate(subject, content);
        await sendEmail(user.email, user.name, subject, emailHtml);

        // Mark as sent
        await db.collection("emailTracking").doc(lastSentKey).set({
          week: weekStart,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (error) {
        console.error("Error processing weekly digest for user " +
          `${userDoc.id}:`, error);
        // Continue with other users
      }
    }
  }
);

/**
 * Scheduled function: Check and send assignment reminders
 * Runs every 6 hours to check for due assignments
 */
export const checkAssignmentReminders = onSchedule(
  {
    schedule: "0 */6 * * *", // Every 6 hours
    timeZone: "America/Halifax",
    secrets: [smtpHost, smtpPort, smtpUser, smtpPassword,
      smtpFromEmail, smtpFromName],
  },
  async () => {
    const db = admin.firestore();
    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      try {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const preferences = userData.preferences || {};

        if (!preferences.emailNotificationsEnabled ||
          !preferences.emailAssignmentReminders) {
          continue;
        }

        const {dueToday, overdue} =
          await getAllAssignmentsForDigest(userId);

        // Check assignments due today
        for (const assignment of dueToday) {
          const reminderKey = `assignment-reminder-${userId}-` +
            `${assignment.name}`;
          const lastReminderDoc = await db.collection("emailTracking")
            .doc(reminderKey)
            .get();

          if (lastReminderDoc.exists &&
            lastReminderDoc.data()?.type === "due-today") {
            continue; // Already sent
          }

          // Find assignment ID (simplified - would need proper lookup)
          // For now, send reminder based on assignment name
          const user = await getUserData(userId);
          const subject = `📅 ${assignment.name} is due today!`;
          const coursePart = assignment.courseName ?
            ` for <strong>${assignment.courseName}</strong>` : "";
          const message = "<h2 style=\"color: #dc2626;\">" +
            "Assignment Due Today</h2>" +
            `<p><strong>${assignment.name}</strong>${coursePart} ` +
            "is due today.</p>" +
            "<p>Make sure to submit it on time!</p>";

          const emailHtml = generateEmailTemplate(subject, message);
          await sendEmail(user.email, user.name, subject, emailHtml);

          await db.collection("emailTracking").doc(reminderKey).set({
            type: "due-today",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        // Check overdue assignments
        for (const assignment of overdue) {
          const reminderKey = `assignment-reminder-${userId}-` +
            `${assignment.name}`;
          const lastReminderDoc = await db.collection("emailTracking")
            .doc(reminderKey)
            .get();

          if (lastReminderDoc.exists &&
            lastReminderDoc.data()?.type === "overdue") {
            continue; // Already sent
          }

          const user = await getUserData(userId);
          const dueDateStr = format(assignment.dueDate, "MMMM d, yyyy");
          const subject = `⚠️ ${assignment.name} is overdue`;
          const coursePart = assignment.courseName ?
            ` for <strong>${assignment.courseName}</strong>` : "";
          const message = "<h2 style=\"color: #dc2626;\">" +
            "Overdue Assignment</h2>" +
            `<p><strong>${assignment.name}</strong>${coursePart} ` +
            `was due on ${dueDateStr} and is now overdue.</p>` +
            "<p>Please complete it as soon as possible!</p>";

          const emailHtml = generateEmailTemplate(subject, message);
          await sendEmail(user.email, user.name, subject, emailHtml);

          await db.collection("emailTracking").doc(reminderKey).set({
            type: "overdue",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } catch (error) {
        console.error("Error processing reminders for user " +
          `${userDoc.id}:`, error);
        // Continue with other users
      }
    }
  }
);
