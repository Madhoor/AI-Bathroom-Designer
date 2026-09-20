"use client";

import React, { useState } from "react";
import { getAIProvider } from "@/lib/ai/provider";
import type { AIMessage, DesignChangeDelta, DesignCommand } from "@/lib/ai/types";

interface ModifyWithAiSectionProps {
  onApplyCommand?: (command: DesignCommand) => Promise<{ success: boolean; delta?: DesignChangeDelta; reason?: string } | void>;
  isProcessing?: boolean;
  canRestore?: boolean;
  onRestorePrevious?: () => void;
  initialDelta?: DesignChangeDelta | null;
}

const EXAMPLE_PROMPTS = [
  "Make it more luxurious",
  "Bring it under ₹4.5 lakh",
  "Add a bathtub",
  "Switch to Minimalist style",
  "Expand room to 10 by 8 ft",
  "Change fittings to French Gold",
];

export default function ModifyWithAiSection({
  onApplyCommand,
  isProcessing = false,
  canRestore = false,
  onRestorePrevious,
  initialDelta = null,
}: ModifyWithAiSectionProps) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: "init",
      sender: "assistant",
      text: "Welcome to the KOHLER Spatial Design Assistant. You can refine your bathroom using natural language—for instance, adjust budget thresholds, expand room boundaries, integrate a bathtub, or change architectural styles.",
      timestamp: "Just now",
    },
  ]);
  const [activeDelta, setActiveDelta] = useState<DesignChangeDelta | null>(initialDelta);

  const processCommand = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: AIMessage = {
      id: userMsgId,
      sender: "user",
      text: text.trim(),
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");

    try {
      const provider = getAIProvider();
      const command = await provider.parseCommand(text);

      if (!onApplyCommand) return;

      const result = await onApplyCommand(command);

      const assistantMsgId = `assistant-${Date.now()}`;
      if (result && result.success) {
        if (result.delta) {
          setActiveDelta(result.delta);
        }
        const assistantMsg: AIMessage = {
          id: assistantMsgId,
          sender: "assistant",
          text: `Applied: ${command.suggestedAction}`,
          timestamp: "Just now",
          command,
          delta: result.delta,
          status: "applied",
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const failureReason = result?.reason ?? command.explanation;
        const assistantMsg: AIMessage = {
          id: assistantMsgId,
          sender: "assistant",
          text: `Constraint guardrail: ${failureReason}`,
          timestamp: "Just now",
          command,
          status: "unsupported",
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (error) {
      const errId = `error-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: errId,
          sender: "assistant",
          text: error instanceof Error ? error.message : "Unable to evaluate modification.",
          timestamp: "Just now",
          status: "unsupported",
        },
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processCommand(prompt);
  };

  const handleChipClick = (suggestion: string) => {
    processCommand(suggestion);
  };

  return (
    <section id="modify-with-ai" className="w-full bg-neutral-900 px-6 py-20 text-white md:px-16 lg:px-24 border-t border-white/10">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c49a45]/30 bg-[#c49a45]/10 px-4 py-1.5 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c49a45] animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f0d8a8]">
              Conversational Design Engine
            </span>
          </div>

          <h2 className="font-serif text-3xl font-light tracking-tight sm:text-4xl md:text-5xl">
            Refine your design with AI.
          </h2>
          <p className="mx-auto max-w-2xl text-sm font-light leading-relaxed text-stone-400 sm:text-base">
            Refine architectural parameters, rebalance budget, or adjust dimensions using natural language.
            Every modification is strictly evaluated against factory CAD dimensions and clearance rules.
          </p>

          {canRestore && onRestorePrevious && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onRestorePrevious}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-800 hover:bg-stone-700 text-[#f0d8a8] border border-[#c49a45]/40 text-xs font-medium transition-colors shadow-md"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4" />
                </svg>
                <span>Restore Previous Design</span>
              </button>
            </div>
          )}
        </div>

        {/* Conversation Thread */}
        <div className="rounded-2xl border border-stone-800 bg-[#151311] p-5 shadow-2xl space-y-4 max-h-[380px] overflow-y-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[#c49a45] text-black font-medium rounded-tr-sm"
                    : "bg-[#221f1c] text-stone-200 border border-stone-800 rounded-tl-sm"
                }`}
              >
                <div className="flex items-center justify-between gap-4 pb-1 border-b border-black/10 opacity-70 text-[10px]">
                  <span className="font-semibold uppercase tracking-wider">
                    {msg.sender === "user" ? "You" : "KOHLER Design Assistant"}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="mt-2 text-sm font-sans">{msg.text}</p>

                {msg.command && msg.status === "applied" && (
                  <div className="mt-2 pt-2 border-t border-white/10 text-[11px] text-stone-300 font-mono">
                    ✓ Intent verified: {msg.command.intent.replace("_", " ")}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-amber-300/80 bg-amber-950/20 border border-amber-500/20 px-4 py-2 rounded-xl w-fit">
              <span className="w-2 h-2 rounded-full bg-[#c49a45] animate-ping" />
              <span>Validating CAD clearance &amp; regenerating 3D layout...</span>
            </div>
          )}
        </div>

        {/* Visible "What Changed" Delta Card */}
        {activeDelta && (
          <div className="rounded-2xl border border-[#c49a45]/40 bg-[#1c1916] p-5 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#c49a45]">
                  What Changed: Design Delta
                </span>
                <span className="text-[10px] bg-[#c49a45]/20 text-[#f0d8a8] px-2 py-0.5 rounded font-mono">
                  Verified
                </span>
              </div>
              <div className="text-xs font-mono text-stone-300">
                <span>Previous: ₹{activeDelta.previousCost.toLocaleString("en-IN")}</span>
                <span className="mx-2">→</span>
                <span className="font-semibold text-white">New: ₹{activeDelta.newCost.toLocaleString("en-IN")}</span>
                {activeDelta.costDifference !== 0 && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                      activeDelta.costDifference < 0
                        ? "bg-emerald-900/60 text-emerald-300"
                        : "bg-amber-900/60 text-amber-300"
                    }`}
                  >
                    {activeDelta.costDifference < 0 ? "-" : "+"}₹
                    {Math.abs(activeDelta.costDifference).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed font-sans">
              {activeDelta.summary}
            </p>

            {/* Added & Removed Products Chips */}
            <div className="flex flex-wrap gap-4 pt-1 text-[11px]">
              {activeDelta.addedProducts.length > 0 && (
                <div>
                  <span className="text-emerald-400 font-medium mr-1.5">+ Added:</span>
                  {activeDelta.addedProducts.map((p) => (
                    <span key={p.productCode} className="mr-1.5 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-200 font-mono text-[10px]">
                      {p.productCode} ({p.productName ?? "Fixture"})
                    </span>
                  ))}
                </div>
              )}
              {activeDelta.removedProducts.length > 0 && (
                <div>
                  <span className="text-rose-400 font-medium mr-1.5">- Replaced:</span>
                  {activeDelta.removedProducts.map((p) => (
                    <span key={p.productCode} className="mr-1.5 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/60 text-rose-200 font-mono text-[10px]">
                      {p.productCode}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center rounded-2xl border border-stone-700 bg-neutral-950 p-2 shadow-2xl transition-all focus-within:border-[#c49a45]">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isProcessing}
              placeholder="e.g. Bring it under ₹4.5 lakh, add a bathtub, or switch to minimal..."
              className="w-full bg-transparent px-5 py-3 text-sm text-white placeholder-stone-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isProcessing || !prompt.trim()}
              className="cursor-pointer rounded-xl bg-[#c49a45] hover:bg-[#b0873a] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-black transition-all active:scale-95 disabled:opacity-40 shrink-0"
            >
              Refine
            </button>
          </div>
        </form>

        {/* Suggested Quick Chips */}
        <div className="space-y-2.5 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Suggested Modifications</p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLE_PROMPTS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={isProcessing}
                onClick={() => handleChipClick(suggestion)}
                className="cursor-pointer rounded-full border border-stone-800 bg-stone-900/70 px-3.5 py-1.5 text-xs text-stone-300 transition-all hover:border-[#c49a45] hover:bg-stone-900 hover:text-white disabled:opacity-50"
              >
                &ldquo;{suggestion}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
