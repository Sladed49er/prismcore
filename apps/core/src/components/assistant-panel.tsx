"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type Anthropic from "@anthropic-ai/sdk";
import { runAssistantTurn } from "@/app/(shell)/settings/customize/assistant-actions";

interface Turn {
  role: "user" | "assistant";
  text: string;
  changes?: string[];
}

const EXAMPLES = [
  "Rename the Clients module to “Members”.",
  "Add a “Renewal month” date field to clients.",
  "Set our accent colour to a deep teal.",
  "Make a client-status picklist: Lead, Active, Lapsed.",
];

/**
 * The AI customization assistant — a chat that reshapes this workspace.
 * It is autonomous: it applies changes as it goes. Its only abilities are the
 * tenant-isolated customization API, so it can never reach code or another
 * tenant; every change is logged and shows in the hub once applied.
 */
export function AssistantPanel() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [messages, setMessages] = useState<Anthropic.MessageParam[]>([]);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  function send(text: string): void {
    const prompt = text.trim();
    if (!prompt || pending) return;
    setError(null);
    setInput("");
    const nextMessages: Anthropic.MessageParam[] = [
      ...messages,
      { role: "user", content: prompt },
    ];
    setTranscript((t) => [...t, { role: "user", text: prompt }]);
    setMessages(nextMessages);

    startTransition(async () => {
      const result = await runAssistantTurn(nextMessages);
      if (result.error && !result.reply) {
        setError(result.error);
        return;
      }
      setMessages(result.messages);
      setTranscript((t) => [
        ...t,
        {
          role: "assistant",
          text: result.reply || "Done.",
          changes: result.changes,
        },
      ]);
      if (result.changes.length > 0) router.refresh();
      requestAnimationFrame(() =>
        endRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
    });
  }

  return (
    <div className="mt-6">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="max-h-[28rem] min-h-[16rem] overflow-y-auto p-5">
          {transcript.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-gray-600">
                Tell me how you&rsquo;d like this workspace to work — I&rsquo;ll
                make the change.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => send(ex)}
                    disabled={pending}
                    className="rounded-full border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-40"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {transcript.map((turn, i) => (
                <div
                  key={i}
                  className={
                    turn.role === "user" ? "flex justify-end" : "flex"
                  }
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      turn.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{turn.text}</p>
                    {turn.changes && turn.changes.length > 0 ? (
                      <ul className="mt-2 space-y-1 border-t border-gray-200 pt-2">
                        {turn.changes.map((c, j) => (
                          <li
                            key={j}
                            className="flex items-start gap-1.5 text-xs font-medium text-emerald-700"
                          >
                            <span aria-hidden>✓</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ))}
              {pending ? (
                <div className="flex">
                  <div className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm text-gray-400">
                    Working…
                  </div>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {error ? (
          <p className="border-t border-rose-100 bg-rose-50 px-5 py-2 text-xs text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-2 border-t border-gray-200 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send(input);
            }}
            placeholder="Ask the assistant to change something…"
            disabled={pending}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={pending || !input.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        The assistant applies changes as it goes — all isolated to this
        workspace, and all logged in the activity history.
      </p>
    </div>
  );
}
