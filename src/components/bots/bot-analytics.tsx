"use client";

import { useEffect, type ComponentProps } from "react";
import Link from "next/link";
import { analyticsBot } from "@/lib/analytics";

export function BotViewTracker({ botId, botTitle }: { botId: string; botTitle: string }) {
  useEffect(() => {
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
