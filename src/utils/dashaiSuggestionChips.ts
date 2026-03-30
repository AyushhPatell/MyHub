/**
 * Suggested reply chips for DashAI — short prompts the user can tap to send.
 * Mixes academic helpers with supportive prompts when the chat feels personal.
 */

export interface DashAISuggestionChip {
  id: string;
  label: string;
  prompt: string;
}

const MOOD_RE =
  /\b(stress|stressed|anxious|anxiety|sad|lonely|overwhelm|tired|burnt|burned|cry|worried|scared|depress|heart|feelings?|vent|rough|bad day|homesick|miss)\b/i;

const ACADEMIC_RE =
  /\b(assign|homework|due|deadline|exam|midterm|quiz|lecture|class|course|schedule|gpa|professor|campus|study|semester|calendar)\b/i;

const DEFAULT_ACADEMIC: DashAISuggestionChip[] = [
  { id: 'due-today', label: "What's due today?", prompt: "What's due for me today?" },
  { id: 'week-plan', label: 'Plan my week', prompt: 'Help me prioritize what to work on this week.' },
  { id: 'schedule', label: 'Class schedule', prompt: "What's my class schedule like this week?" },
  { id: 'overdue', label: 'Anything overdue?', prompt: 'Do I have any overdue assignments?' },
];

const SUPPORT_CHIPS: DashAISuggestionChip[] = [
  { id: 'thanks', label: 'Thanks for that', prompt: 'Thanks — that really helped.' },
  { id: 'lighter', label: 'Lighter topic', prompt: "Let's talk about something lighter for a minute." },
  { id: 'small-wins', label: 'Small wins', prompt: 'What are some small wins I could aim for today?' },
  { id: 'focus', label: 'One focus', prompt: 'If I could only do one school thing today, what should it be?' },
];

const MIXED_CHIPS: DashAISuggestionChip[] = [
  { id: 'balance', label: 'Balance school & rest', prompt: 'How can I balance school with taking care of myself this week?' },
  { id: 'check-in', label: 'Quick check-in', prompt: "How does my workload look for the next few days?" },
  ...DEFAULT_ACADEMIC.slice(0, 2),
];

export interface PickDashAISuggestionChipsOptions {
  /** Try Demo: hide overdue prompt (AI context can disagree with the dashboard). */
  tryDemo?: boolean;
}

function stripOverdueChipForTryDemo(
  chips: DashAISuggestionChip[],
  tryDemo: boolean
): DashAISuggestionChip[] {
  if (!tryDemo) return chips;
  return chips.filter((c) => c.id !== 'overdue');
}

/**
 * Picks chips based on the latest user message and (optionally) assistant reply.
 */
export function pickDashAISuggestionChips(
  lastUserText: string | undefined,
  lastAssistantText: string | undefined,
  options?: PickDashAISuggestionChipsOptions
): DashAISuggestionChip[] {
  const tryDemo = options?.tryDemo === true;
  const u = (lastUserText || '').trim();
  const a = (lastAssistantText || '').trim();

  const userMood = MOOD_RE.test(u);
  const userAcademic = ACADEMIC_RE.test(u);
  const assistantMood = MOOD_RE.test(a);

  let chips: DashAISuggestionChip[];

  if (userMood && !userAcademic) {
    chips = SUPPORT_CHIPS;
  } else if (userMood && userAcademic) {
    chips = MIXED_CHIPS;
  } else if (assistantMood && !userAcademic && u.length > 0) {
    chips = [...SUPPORT_CHIPS.slice(0, 2), ...DEFAULT_ACADEMIC.slice(0, 2)];
  } else {
    chips = DEFAULT_ACADEMIC;
  }

  return stripOverdueChipForTryDemo(chips, tryDemo);
}
