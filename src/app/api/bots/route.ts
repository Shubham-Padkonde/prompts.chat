import { NextResponse } from "next/server";
import { BOT_PLATFORM_INFO, getBotUrls, listBots, platformFromParam } from "@/lib/bots";
import { getBaseUrl } from "@/lib/seo";

const MAX_BOTS = 500;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = platformFromParam(searchParams.get("platform") ?? undefined);
  const baseUrl = getBaseUrl();
  const { bots, total } = await listBots({ platform, take: MAX_BOTS });

  return NextResponse.json(
    {
      total,
      bots: bots.map((bot) => ({
        id: bot.id,
        slug: bot.slug,
        name: bot.title,
        description: bot.description,
        platforms: bot.platforms,
        platformNames: bot.platforms.map((platform) => BOT_PLATFORM_INFO[platform].name),
        icon: bot.icon,
        color: bot.color,
        installUrl: bot.installUrl,
        author: bot.author.username,
        urls: getBotUrls(bot, baseUrl),
      })),
    },
    { headers: { "X-Robots-Tag": "noindex", "Access-Control-Allow-Origin": "*" } }
  );
}
