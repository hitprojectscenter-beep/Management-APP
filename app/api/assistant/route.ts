import { NextResponse } from "next/server";
import { chat } from "@/lib/ai/claude";
import { buildSystemPrompt, heuristicParse } from "@/lib/ai/assistant-prompts";
import { askGemini, isGeminiAvailable } from "@/lib/ai/gemini";
import { formatKnowledgeBaseForAI } from "@/lib/help/help-content";
import {
  analyzeGaps,
  detectConflicts,
  resolveProjectByName,
  resolveUserByName,
  mergeEntities,
  buildConfirmationSummary,
  logAssistantAction,
  type ParsedIntent,
  type TaskEntities,
} from "@/lib/ai/assistant-engine";
import {
  mockTasks,
  mockUsers,
  mockProjectMembers,
  getProjects,
  getUserById,
  CURRENT_USER_ID,
} from "@/lib/db/mock-data";
import { requireUser } from "@/lib/auth/require-user";
import { upsertAppTask } from "@/lib/db/app-tasks-repo";
import { isDatabaseConfigured } from "@/lib/db/client";

export const runtime = "nodejs";

interface RequestBody {
  text: string;
  locale: string;
  /** Previously extracted entities - passed back during clarification loop */
  carryover?: TaskEntities;
  /** Previous action - if we're continuing a dialog */
  carryoverAction?: string;
  /** Is this a confirmation response? */
  mode?: "parse" | "confirm";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const { text, locale: rawLocale, carryover, carryoverAction } = body;
    // Ensure locale is always a valid value — default to "he"
    const locale = rawLocale && ["he", "en", "ru", "fr", "es"].includes(rawLocale) ? rawLocale : "he";

    // Validate BEFORE logging — otherwise a missing `text` field gives a
    // confusing 500 ("Cannot read .slice of undefined") instead of the
    // intended 400 "Empty input".
    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Empty input — expected { text: string }" }, { status: 400 });
    }

    console.log(`[assistant] locale=${locale} (raw=${rawLocale}) text="${text.slice(0, 50)}"`);

    const projects = getProjects();
    const currentUser = getUserById(CURRENT_USER_ID);
    if (!currentUser) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    // ============================================
    // 1. Intent Recognition - Claude or heuristic
    // ============================================
    let parsed: ParsedIntent;

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const systemPrompt = buildSystemPrompt(locale);
        const raw = await chat([{ role: "user", content: text }], systemPrompt);
        // Strip markdown fences if Claude wraps output
        const cleaned = raw
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        const obj = JSON.parse(cleaned);
        parsed = {
          action: obj.action || "unknown",
          entities: obj.entities || {},
          rawText: text,
          confidence: obj.confidence ?? 0.7,
          responseText: obj.responseText,
        };
      } catch (err) {
        console.warn("[assistant] Claude parsing failed, using heuristic:", err);
        const heur = heuristicParse(text, locale);
        parsed = {
          action: heur.action as any,
          entities: heur.entities,
          rawText: text,
          confidence: heur.confidence,
          responseText: heur.responseText,
        };
      }
    } else {
      const heur = heuristicParse(text, locale);
      parsed = {
        action: heur.action as any,
        entities: heur.entities,
        rawText: text,
        confidence: heur.confidence,
        responseText: heur.responseText,
      };
    }

    // ============================================
    // 1b. GEMINI AI FALLBACK for informational questions
    // Detect language from text characters + locale for proper response
    // ============================================
    const hasHebrewInText = /[\u0590-\u05FF]/.test(text);
    const hasCyrillicInText = /[\u0400-\u04FF]/.test(text);
    // Determine response language: script detection → locale → Hebrew default
    const responseLang = hasHebrewInText ? "he" : hasCyrillicInText ? "ru" : (["en", "fr", "es"].includes(locale) ? locale : "he");
    // Trigger Gemini broadly: for ANY informational query that isn't a clear
    // mutation action. The grounded system prompt (app facts + live snapshot)
    // makes Gemini a reliable fallback even for free-form questions the
    // heuristic doesn't explicitly route.
    const isMutation = ["create_task", "create_project", "assign_task", "update_task_status"].includes(parsed.action);
    const shouldTryGemini = isGeminiAvailable() && !isMutation;

    if (shouldTryGemini) {
      try {
        const context = formatKnowledgeBaseForAI(responseLang === "he" ? "he" : "en");
        const answer = await askGemini(text, context, responseLang);
        parsed.action = "query_tasks";
        parsed.responseText = answer;
        parsed.confidence = 0.9;
        console.log(`[assistant] Gemini answered in ${responseLang}`);
      } catch (err) {
        console.warn("[assistant] Gemini failed, using heuristic response:", err);
        // Keep the heuristic response as fallback
      }
    }

    // ============================================
    // 2. Merge with carryover entities (clarification dialog)
    // ============================================
    if (carryover) {
      parsed.entities = mergeEntities(carryover, parsed.entities);
    }
    if (carryoverAction && parsed.action === "unknown") {
      parsed.action = carryoverAction as any;
    }

    // ============================================
    // 3. Resolve name hints to IDs
    // ============================================
    if (parsed.entities.projectNameHint && !parsed.entities.projectId) {
      parsed.entities.projectId = resolveProjectByName(parsed.entities.projectNameHint, projects);
    }
    if (parsed.entities.assigneeNameHint && !parsed.entities.assigneeId) {
      parsed.entities.assigneeId = resolveUserByName(parsed.entities.assigneeNameHint, mockUsers);
    }

    // ============================================
    // 4. Gap Analysis
    // ============================================
    const gaps = analyzeGaps(parsed, projects, mockUsers);

    // ============================================
    // 5. Conflict Detection
    // ============================================
    const conflicts = detectConflicts(parsed, currentUser, mockTasks, mockProjectMembers);
    const blockingConflicts = conflicts.filter((c) => c.blocking);

    // ============================================
    // 6. Determine next stage
    // ============================================
    let stage: "clarification" | "confirmation" | "blocked" | "query_response";
    let summary = "";

    if (blockingConflicts.length > 0) {
      stage = "blocked";
      logAssistantAction({
        actorUserId: currentUser.id,
        actorUserName: currentUser.name,
        action: `${parsed.action}_blocked`,
        entityType: "intent",
        details: { text, conflicts: blockingConflicts, parsed },
      });
    } else if (gaps.length > 0) {
      stage = "clarification";
    } else if (
      parsed.action === "query_risks" ||
      parsed.action === "query_tasks" ||
      parsed.action === "query_workload" ||
      parsed.action === "unknown"
    ) {
      stage = "query_response";
    } else {
      stage = "confirmation";
      summary = buildConfirmationSummary(parsed, projects, mockUsers, locale);
    }

    return NextResponse.json({
      stage,
      intent: parsed,
      gaps,
      conflicts,
      summary,
      _locale: locale, // debug: sent back so client can verify
    });
  } catch (err) {
    console.error("[assistant] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * PUT = execute a confirmed action
 */
export async function PUT(req: Request) {
  try {
    const { intent } = (await req.json()) as { intent: ParsedIntent };
    // Prefer the REAL signed-in user — so an assistant-created task persists to
    // the DB and is owned correctly. Fall back to the demo user only when there
    // is no DB session (mock mode).
    const sessionUser = await requireUser();
    const currentUser = sessionUser ?? getUserById(CURRENT_USER_ID);
    if (!currentUser) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    if (intent.action === "create_task") {
      const e = intent.entities;
      if (!e.title || !e.projectId || !e.assigneeId || !e.plannedStart || !e.plannedEnd) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const newTask = {
        id: `task-new-${Date.now()}`,
        wbsNodeId: e.projectId,
        parentTaskId: null,
        title: e.title,
        description: e.description || "",
        status: (e.status || "not_started") as any,
        priority: (e.priority || "medium") as any,
        assigneeId: e.assigneeId,
        plannedStart: e.plannedStart,
        plannedEnd: e.plannedEnd,
        actualStart: null,
        actualEnd: null,
        estimateHours: e.estimateHours || 8,
        actualHours: 0,
        progressPercent: 0,
        tags: e.tags || [],
        dependencies: [],
      };
      // Persist to PostgreSQL (per-user, cross-device) when a DB session exists;
      // otherwise fall back to the in-memory demo array (mock mode).
      if (isDatabaseConfigured() && sessionUser) {
        await upsertAppTask(newTask, sessionUser.id);
      } else {
        mockTasks.push(newTask);
      }

      // Audit log
      logAssistantAction({
        actorUserId: currentUser.id,
        actorUserName: currentUser.name ?? "",
        action: "create_task",
        entityType: "Task",
        entityId: newTask.id,
        details: {
          title: newTask.title,
          projectId: newTask.wbsNodeId,
          assigneeId: newTask.assigneeId,
          viaAssistant: true,
        },
      });

      return NextResponse.json({ success: true, taskId: newTask.id });
    }

    // Actions beyond create_task (assign / status change / reassign) aren't
    // executed by the assistant yet — return a friendly guidance message (200)
    // instead of a hard 501 the user would see as an error.
    return NextResponse.json({
      success: false,
      needsManual: true,
      message:
        "פעולה זו מתבצעת כרגע ישירות במסך המשימה: פתח/י את המשימה מרשימת המשימות ובצע/י שם (שינוי סטטוס, שיוך מחדש וכו'). העוזר תומך כעת בפתיחת משימה חדשה.",
    });
  } catch (err) {
    console.error("[assistant PUT] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
