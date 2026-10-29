import { useState } from "react";
import ChatThread from "../components/ChatThread";
import MicButton from "../components/MicButton";
import { useMunim } from "../hooks/useMunim";

export default function Ask() {
  const { ask, asking, suggestions, thread, t } = useMunim();
  const [text, setText] = useState("");

  const submit = () => {
    const q = text.trim();
    if (!q || asking) return;
    setText("");
    void ask(q);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {thread.length === 0 && (
        <div className="px-4 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.tryAsking}</p>
          <div className="mt-2 flex flex-col gap-2">
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => void ask(s.text)}
                disabled={asking}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-navy shadow-sm active:bg-sky-50"
              >
                {s.text}
              </button>
            ))}
          </div>
        </div>
      )}
      <ChatThread />
      <div className="border-t border-slate-200 bg-white px-3 pb-3 pt-2">
        <div className="mb-2 flex justify-center">
          <MicButton />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.typeHere}
            className="min-w-0 flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-paytm"
          />
          <button type="submit" disabled={asking || !text.trim()} className="rounded-full bg-navy px-4 text-sm font-semibold text-white disabled:opacity-50">
            {t.send}
          </button>
        </form>
      </div>
    </div>
  );
}
