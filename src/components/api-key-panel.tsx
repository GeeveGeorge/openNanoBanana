"use client";

import { useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface ApiKeyPanelProps {
  onKeysChange: (keys: {
    geminiApiKey: string;
    serperApiKey: string;
    runpodApiKey: string;
  }) => void;
}

export function ApiKeyPanel({ onKeysChange }: ApiKeyPanelProps) {
  const [open, setOpen] = useState(false);
  const [geminiKey, setGeminiKey] = useLocalStorage("onb:geminiKey", "");
  const [serperKey, setSerperKey] = useLocalStorage("onb:serperKey", "");
  const [runpodKey, setRunpodKey] = useLocalStorage("onb:runpodKey", "");
  const [showKeys, setShowKeys] = useState(false);

  const handleChange = (
    setter: (v: string) => void,
    field: "geminiApiKey" | "serperApiKey" | "runpodApiKey",
    value: string,
  ) => {
    setter(value);
    const keys = { geminiApiKey: geminiKey, serperApiKey: serperKey, runpodApiKey: runpodKey };
    keys[field] = value;
    onKeysChange(keys);
  };

  return (
    <div className="w-full">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-dark/60 hover:text-sage transition-colors cursor-pointer"
      >
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        API Keys (BYOK)
      </button>

      {open && (
        <div className="mt-3 p-5 bg-cream-dark rounded-2xl space-y-4">
          <p className="text-xs text-dark/50">
            Keys are sent directly to each API and never stored on our server.
            Leave blank to use server defaults.
          </p>

          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setShowKeys(!showKeys)}
              className="text-xs text-sage hover:text-sage-dark transition-colors cursor-pointer"
            >
              {showKeys ? "Hide keys" : "Show keys"}
            </button>
          </div>

          {[
            { label: "Gemini API Key", value: geminiKey, setter: setGeminiKey, field: "geminiApiKey" as const },
            { label: "Serper API Key", value: serperKey, setter: setSerperKey, field: "serperApiKey" as const },
            { label: "RunPod API Key", value: runpodKey, setter: setRunpodKey, field: "runpodApiKey" as const },
          ].map(({ label, value, setter, field }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-dark/70 mb-1">{label}</label>
              <input
                type={showKeys ? "text" : "password"}
                value={value}
                onChange={(e) => handleChange(setter, field, e.target.value)}
                placeholder="Leave blank for server default"
                className="w-full px-4 py-2.5 rounded-xl bg-cream border border-dark/10 text-sm focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage transition-colors"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
