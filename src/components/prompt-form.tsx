"use client";

import { useState, type FormEvent } from "react";

interface PromptFormProps {
  onSubmit: (prompt: string) => void;
  disabled: boolean;
}

export function PromptForm({ onSubmit, disabled }: PromptFormProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !disabled) {
      onSubmit(prompt.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="hkust entrance piazza in cyberpunk future"
          disabled={disabled}
          className="flex-1 px-6 py-4 rounded-full bg-white border-2 border-dark/10 text-base font-[family-name:var(--font-body)] placeholder:text-dark/30 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all disabled:opacity-50 shadow-sm"
        />
        <button
          type="submit"
          disabled={disabled || !prompt.trim()}
          className="px-8 py-4 rounded-full bg-sage text-white font-medium text-base hover:bg-sage-dark focus:outline-none focus:ring-2 focus:ring-sage/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
        >
          {disabled ? (
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating
            </span>
          ) : (
            "Generate"
          )}
        </button>
      </div>
    </form>
  );
}
