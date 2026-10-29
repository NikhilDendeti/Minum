import { useEffect, useRef } from "react";
import { useMunim } from "../hooks/useMunim";
import AudioPlayer from "./AudioPlayer";
import ProposalCard from "./ProposalCard";
import Spinner from "./Spinner";
import SqlPanel from "./SqlPanel";

export default function ChatThread() {
  const { thread, t } = useMunim();
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread]);

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
      {thread.map((turn) => (
        <div key={turn.id} className="space-y-2">
          <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-navy px-3 py-2 text-sm text-white">{turn.transcript}</div>
          <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200">
            {turn.pending && <Spinner label={t.thinking} />}
            {turn.error && <p className="text-red-600">{turn.error}</p>}
            {turn.response && (
              <>
                <p className="leading-relaxed text-ink">{turn.response.answer_local}</p>
                {turn.response.answer_local !== turn.response.answer_en && (
                  <p className="mt-1 text-[11px] italic text-slate-400">EN: {turn.response.answer_en}</p>
                )}
                <div className="mt-2">
                  <AudioPlayer url={turn.response.audio_url} />
                </div>
                <SqlPanel evidence={turn.response.evidence} label={t.howIWorked} />
                {turn.response.proposal && turn.response.intent !== "approval" && <ProposalCard offer={turn.response.proposal} />}
              </>
            )}
          </div>
        </div>
      ))}
      <div ref={bottom} />
    </div>
  );
}
