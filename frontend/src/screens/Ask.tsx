import AskBox, { Suggestions } from "../components/AskBox";
import ChatThread from "../components/ChatThread";
import { PageHeading } from "../components/ui";
import { useMunim } from "../hooks/useMunim";

export default function Ask() {
  const { thread, t } = useMunim();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeading title={t.askTitle} sub={t.askSub} />
      <ChatThread />
      <Suggestions limit={thread.length ? 2 : undefined} />
      {/* only the input stays within reach while answers scroll past */}
      <div className="sticky bottom-[calc(56px+env(safe-area-inset-bottom))] z-20 -mx-4 bg-canvas px-4 pb-3 pt-2 sm:-mx-6 sm:px-6 lg:bottom-0 lg:mx-0 lg:px-0 lg:pb-4">
        <AskBox />
      </div>
    </div>
  );
}
