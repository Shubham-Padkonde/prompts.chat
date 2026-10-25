import { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Clock, EyeOff, Pencil, Plug, Shield, Sparkles, Star, Trash2, Zap } from "lucide-react";
import { auth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BotViewTracker } from "@/components/bots/bot-analytics";
import { BotAvatar } from "@/components/bots/bot-avatar";
import { BotInstall } from "@/components/bots/bot-install";
import { BotPlatformBadge } from "@/components/bots/bot-platform-badge";
import { DelistBanner } from "@/components/prompts/delist-banner";
import { FeaturePromptButton } from "@/components/prompts/feature-prompt-button";
import { RestorePromptButton } from "@/components/prompts/restore-prompt-button";
import { UnlistPromptButton } from "@/components/prompts/unlist-prompt-button";
import { JsonLd, botSchema, breadcrumbSchema } from "@/components/seo/structured-data";
import { BOT_PLATFORM_INFO, extractBotId, formatBotPlatforms, getBotById, getBotInstallOptions, getBotUrls } from "@/lib/bots";
import { canViewPrompt } from "@/lib/prompt-access";
import { buildPageMetadata, getBaseUrl, NOINDEX_ROBOTS, toMetaDescription } from "@/lib/seo";
import { getBotUrl } from "@/lib/urls";

interface BotPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BotPageProps): Promise<Metadata> {
  const { slug } = await params;
  const bot = await getBotById(extractBotId(slug));
  if (!bot || bot.isPrivate) {
    return { robots: NOINDEX_ROBOTS };
  }
  return buildPageMetadata({
    title: `${bot.title} · ${formatBotPlatforms(bot.platforms)}`,
    description: toMetaDescription(bot.description || bot.instructions),
    path: getBotUrl(bot.id, bot.slug),
    noindex: bot.isUnlisted,
    image: "route",
  });
}

export default async function BotPage({ params }: BotPageProps) {
  const { slug } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const bot = await getBotById(extractBotId(slug), { includeDeleted: isAdmin });
  if (!bot || !canViewPrompt(bot, session)) {
    notFound();
  }

  const canonicalPath = getBotUrl(bot.id, bot.slug);
  if (`/bots/${slug}` !== canonicalPath) {
    permanentRedirect(canonicalPath);
  }

  const t = await getTranslations("bots");
  const tNav = await getTranslations("nav");
  const baseUrl = getBaseUrl();
  const tPrompts = await getTranslations("prompts");
  const isOwner = session?.user?.id === bot.authorId;
  const canEdit = isOwner || isAdmin;
  const { routines, skills, connectors } = bot.config;
  const platformNames = bot.platforms.map((platform) => BOT_PLATFORM_INFO[platform].name);

  return (
    <div className="container max-w-5xl py-6 min-w-0">
      <BotViewTracker botId={bot.id} botTitle={bot.title} />
      <JsonLd
        data={[
          ...botSchema({
            path: canonicalPath,
            name: bot.title,
            description: toMetaDescription(bot.description || bot.instructions),
            platforms: platformNames,
            author: { name: bot.author.name || bot.author.username, username: bot.author.username },
            keywords: [...platformNames, ...skills.map((skill) => skill.name), ...connectors],
            features: routines.map((routine) => routine.name),
            dateCreated: bot.createdAt,
            dateModified: bot.updatedAt,
          }),
          breadcrumbSchema([
            { name: tNav("bots"), path: "/bots" },
            { name: bot.title, path: canonicalPath },
          ]),
        ]}
      />

      {bot.deletedAt && isAdmin && (
        <div className="mb-6 p-4 rounded-lg border border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <Trash2 className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">{tPrompts("promptDeleted")}</h3>
              <p className="text-sm text-red-600 dark:text-red-500">{tPrompts("promptDeletedDescription")}</p>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <RestorePromptButton promptId={bot.id} />
          </div>
        </div>
      )}

      {bot.isUnlisted && bot.delistReason && (isOwner || isAdmin) && (
        <DelistBanner promptId={bot.id} delistReason={bot.delistReason} isOwner={isOwner} isDeleted={!!bot.deletedAt} />
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/bots" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {t("backToBots")}
        </Link>
        {canEdit && (
          <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
            <Link href={`${canonicalPath}/edit`}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              {t("edit")}
            </Link>
          </Button>
        )}
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {bot.platforms.map((platform) => (
            <BotPlatformBadge key={platform} platform={platform} />
          ))}
          {bot.isFeatured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
          {bot.isPrivate && (
            <Badge variant="secondary"><EyeOff />{t("private")}</Badge>
          )}
          {bot.isUnlisted && <Badge variant="outline">{t("unlisted")}</Badge>}
        </div>
        <div className="flex items-center gap-3">
          <BotAvatar icon={bot.icon} color={bot.color} size="lg" className="h-12 w-12 sm:h-14 sm:w-14" />
          <h1 className="min-w-0 flex-1 text-xl sm:text-2xl font-semibold wrap-anywhere">{bot.title}</h1>
        </div>
        {bot.description && <p className="text-muted-foreground wrap-anywhere">{bot.description}</p>}
        <Link href={`/@${bot.author.username}`} className="inline-flex max-w-full items-center gap-2 text-sm text-muted-foreground hover:text-foreground wrap-anywhere">
          <Avatar className="h-5 w-5">
            <AvatarImage src={bot.author.avatar || undefined} alt={bot.author.username} />
            <AvatarFallback className="text-[10px]">{(bot.author.name || bot.author.username).charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          @{bot.author.username}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8 min-w-0">
          <section className="space-y-2">
            <h2 className="text-base font-semibold">{t("instructions")}</h2>
            <pre className="overflow-x-auto whitespace-pre-wrap wrap-anywhere rounded-md border bg-muted/50 p-3 sm:p-4 text-xs sm:text-sm font-mono leading-relaxed">
              {bot.instructions}
            </pre>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">{t("routines")}</h2>
            {routines.length > 0 ? (
              <div className="space-y-3">
                {routines.map((routine, index) => (
                  <div key={index} className="min-w-0 rounded-md border p-3 sm:p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="min-w-0 font-medium wrap-anywhere">{routine.name}</h3>
                      <Badge variant="outline" className="gap-1">
                        {routine.type === "schedule" ? <Clock /> : <Zap />}
                        {routine.type === "schedule" ? t("scheduled") : t("eventTriggered")}
                      </Badge>
                    </div>
                    <p className="text-sm wrap-anywhere">
                      <span className="text-muted-foreground">{routine.type === "schedule" ? t("schedule") : t("trigger")}: </span>
                      {routine.triggerLabel || routine.trigger}
                      {routine.type === "schedule" && routine.triggerLabel && (
                        <code className="ml-2 inline-block rounded bg-muted px-1.5 py-0.5 text-xs">{routine.trigger}</code>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap wrap-anywhere">{routine.prompt}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noRoutines")}</p>
            )}
          </section>

          {(skills.length > 0 || connectors.length > 0) && (
            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {skills.length > 0 && (
                <div className="min-w-0 space-y-2">
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    <Sparkles className="h-4 w-4" />
                    {t("skills")}
                  </h2>
                  <ul className="space-y-2">
                    {skills.map((skill, index) => (
                      <li key={index} className="text-sm wrap-anywhere">
                        <span className="font-medium">{skill.name}</span>
                        {skill.description && <span className="text-muted-foreground"> — {skill.description}</span>}
                        {skill.source && (
                          <code className="mt-1 block w-fit max-w-full overflow-x-auto whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-xs">{skill.source}</code>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {connectors.length > 0 && (
                <div className="min-w-0 space-y-2">
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    <Plug className="h-4 w-4" />
                    {t("connectors")}
                  </h2>
                  <div className="flex flex-wrap gap-1">
                    {connectors.map((connector) => (
                      <Badge key={connector} variant="outline" className="max-w-full whitespace-normal wrap-anywhere">{connector}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-16 h-fit rounded-md border p-3 sm:p-4 space-y-3">
          <h2 className="text-base font-semibold">{t("install")}</h2>
          <BotInstall botId={bot.id} options={getBotInstallOptions(bot, baseUrl)} urls={getBotUrls(bot, baseUrl)} />
        </aside>
      </div>

      {isAdmin && (
        <div className="mt-8 p-4 rounded-lg border border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-red-500">{tPrompts("adminArea")}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FeaturePromptButton promptId={bot.id} isFeatured={bot.isFeatured} />
            <UnlistPromptButton promptId={bot.id} isUnlisted={bot.isUnlisted} />
            <Button variant="outline" size="sm" asChild>
              <Link href={`${canonicalPath}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                {t("edit")}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
