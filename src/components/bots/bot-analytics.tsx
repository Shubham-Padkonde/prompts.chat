"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import Link from "next/link";
import { analyticsBot } from "@/lib/analytics";

export function BotViewTracker({ botId, botTitle }: { botId: string; botTitle: string }) {
  // Guards against Strict Mode re-running the effect and title-only re-renders
  const trackedId = useRef<string | null>(null);

  useEffect(() => {
    if (trackedId.current === botId) return;
    trackedId.current = botId;
    analyticsBot.view(botId, botTitle);
  }, [botId, botTitle]);

  return null;
}

type LinkProps = ComponentProps<typeof Link>;

export function BotCardLink({ botId, position, onClick, ...props }: LinkProps & { botId: string; position?: number }) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        analyticsBot.cardClick(botId, position);
        onClick?.(event);
      }}
    />
  );
}

/** `platform` is the URL param of the platform, or "all" */
export function BotFilterLink({ platform, onClick, ...props }: LinkProps & { platform: string }) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        analyticsBot.filter(platform);
        onClick?.(event);
      }}
    />
  );
}
