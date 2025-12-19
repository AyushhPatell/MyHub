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
import {setGlobalOptions} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import OpenAI from "openai";
import {defineSecret} from "firebase-functions/params";

// Initialize Firebase Admin
admin.initializeApp();

// Define the secret for OpenAI API key
const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  secrets: [openaiApiKey],
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
    // Track daily
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
 * Gather user context from Firestore
 * @param {string} userId - The user's unique ID
 * @param {Date} today - Today's date in user's timezone (optional)
 * @return {Promise<string>} Formatted user context string
 */
async function gatherUserContext(
  userId: string,
  today?: Date
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

        if (courseSchedules.length > 0) {
          const scheduleText = courseSchedules
            .map((s) => {
              const loc = s.location ? ` (${s.location})` : "";
              return `${s.day}: ${s.startTime} - ${s.endTime} - ` +
                `${s.course}${loc}`;
            })
            .join("\n");
          contextParts.push(`Weekly Schedule:\n${scheduleText}`);

          // If today is provided, also include today's specific schedule
          if (today) {
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
          }
        }

        // Get schedule blocks
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
            contextParts.push(`Schedule Blocks:\n${blocks.join("\n")}`);
          }
        }
      }

      // Get calendar events
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

      // Get upcoming assignments (next 7 days)
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

    if (!message || typeof message !== "string" ||
      message.trim().length === 0) {
      throw new Error(
        "Message is required and must be a non-empty string."
      );
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
        `Daily rate limit of ${DAILY_RATE_LIMIT} calls exceeded. ` +
        "Please try again tomorrow."
      );
    }

    try {
      // Get timezone first to calculate today correctly
      const tempContext = await gatherUserContext(userId);
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

      // Gather full user context with today's date for filtering
      const userContext = await gatherUserContext(userId, today);

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

      // Create system prompt
      const systemPrompt = "You are a friendly and helpful personal AI " +
        "assistant for MyHub, a personal management app. " +
        "You're here to help with various aspects of the user's life, " +
        "including their academic schedule, assignments, courses, and " +
        "general conversation.\n\n" +
        "IMPORTANT: Only use the data provided in User Context. " +
        "Do NOT make up or assume any information. " +
        "If the data shows no events for a specific day, say so clearly.\n\n" +
        `Current Date Information (User's Timezone: ${userTimezone}):
- Today: ${todayStr} (${todayName})
- Tomorrow: ${tomorrowStr} (${tomorrowName})
- Current Time: ${currentTime}\n\n` +
        `User Context:
${userContext}\n\n` +
        "Be conversational, friendly, and natural. You can chat about " +
        "anything - not just academic tasks. Feel free to have casual " +
        "conversations, answer questions, or just chat.\n" +
        "When the user asks about their schedule, assignments, or courses, " +
        "provide accurate information based on the data provided.\n" +
        "When answering about specific dates (like 'today' or 'tomorrow'), " +
        "use the Current Date Information above to determine the correct " +
        "date in the user's timezone. Only mention events that are actually " +
        "scheduled for that date. If no events exist for that date, clearly " +
        "state that the schedule is empty.\n" +
        "Don't end every response with questions like 'How can I help you?' " +
        "or 'What else can I do?'. Be natural - sometimes just acknowledge " +
        "their message, continue the conversation, or respond naturally " +
        "without always asking follow-up questions.\n" +
        "Keep responses concise but warm, engaging, and conversational.";

      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: GPT_MODEL,
        messages: [
          {role: "system", content: systemPrompt},
          {role: "user", content: message.trim()},
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
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

      const errorMessage = error instanceof Error ?
        error.message :
        "An error occurred while processing your request.";

      throw new Error(errorMessage);
    }
  }
);
