import { Router, Request, Response } from "express";
import { personalDb } from "../../../database/client";
import { personalPodcasts, personalPodcastEpisodes, personalActivityLogs } from "../../../database/schema/personal.schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.middleware";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

export const personalPodcastsRouter = Router();
personalPodcastsRouter.use(authenticate);

// GET /api/v1/personal/podcasts
personalPodcastsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const podcasts = await personalDb
      .select()
      .from(personalPodcasts)
      .where(eq(personalPodcasts.ownerUserId, user.id as string))
      .orderBy(desc(personalPodcasts.createdAt));

    return res.status(200).json({ success: true, data: podcasts });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/personal/podcasts/:id/episodes
personalPodcastsRouter.get("/:id/episodes", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const podcastId = req.params.id as string;

    const episodes = await personalDb
      .select()
      .from(personalPodcastEpisodes)
      .where(and(eq(personalPodcastEpisodes.podcastId, podcastId as string), eq(personalPodcastEpisodes.ownerUserId, user.id as string)))
      .orderBy(desc(personalPodcastEpisodes.publishedDate));

    return res.status(200).json({ success: true, data: episodes });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/personal/podcasts/resolve-rss
personalPodcastsRouter.post("/resolve-rss", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: "RSS URL is required" });

    // Fetch the RSS feed XML
    const rssRes = await axios.get(url);
    const xml = rssRes.data as string;

    // Very basic Regex-based RSS parser (for prototype purposes)
    const getTag = (tag: string, xmlString: string) => {
      const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xmlString);
      if (!match) return null;
      return match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
    };

    const title = getTag("title", xml);
    const description = getTag("description", xml);
    let coverUrl = getTag("url", xml) || null; 
    
    // Check for iTunes image tag
    const itunesImageMatch = /<itunes:image\s+href=["']([^"']+)["']/i.exec(xml);
    if (itunesImageMatch) {
      coverUrl = itunesImageMatch[1];
    }

    if (!title) {
      return res.status(400).json({ success: false, error: "Could not parse RSS feed title" });
    }

    // Extract episodes (first 10 for preview)
    const items = xml.split("<item>").slice(1, 11);
    const episodesPreview = items.map(item => {
      const epTitle = getTag("title", item);
      
      let audioUrl = null;
      const enclosureMatch = /<enclosure\s+url=["']([^"']+)["']/i.exec(item);
      if (enclosureMatch) audioUrl = enclosureMatch[1];

      const pubDateStr = getTag("pubDate", item);
      
      return {
        title: epTitle || "Untitled Episode",
        audioUrl,
        publishedDate: pubDateStr ? new Date(pubDateStr) : new Date()
      };
    });

    return res.status(200).json({ 
      success: true, 
      data: {
        title,
        description,
        coverUrl,
        rssUrl: url,
        episodesPreview
      } 
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to resolve RSS feed: " + error.message });
  }
});

// POST /api/v1/personal/podcasts
personalPodcastsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, description, coverUrl, rssUrl, episodesPreview } = req.body;

    if (!title) return res.status(400).json({ success: false, error: "Podcast title is required" });

    const newPodcastId = uuidv4();

    await personalDb.transaction(async (tx) => {
      await tx.insert(personalPodcasts).values({
        id: newPodcastId,
        ownerUserId: user.id as string,
        title,
        description,
        coverUrl,
        rssUrl,
      });

      // Insert the preview episodes as "Saved"
      if (episodesPreview && Array.isArray(episodesPreview)) {
        for (const ep of episodesPreview) {
          if (!ep.audioUrl) continue;
          await tx.insert(personalPodcastEpisodes).values({
            id: uuidv4(),
            podcastId: newPodcastId,
            ownerUserId: user.id as string,
            title: ep.title,
            audioUrl: ep.audioUrl,
            publishedDate: ep.publishedDate ? new Date(ep.publishedDate) : new Date(),
            status: "Saved"
          });
        }
      }

      await tx.insert(personalActivityLogs).values({
        id: uuidv4(),
        ownerUserId: user.id as string,
        eventType: "Podcast followed",
        details: `Subscribed to podcast "${title}"`,
      });
    });

    const [created] = await personalDb.select().from(personalPodcasts).where(eq(personalPodcasts.id, newPodcastId));
    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/personal/podcasts/episodes/:episodeId/progress
personalPodcastsRouter.patch("/episodes/:episodeId/progress", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const episodeId = req.params.episodeId;
    const { progressSeconds, status } = req.body;

    await personalDb.update(personalPodcastEpisodes)
      .set({ 
        progressSeconds,
        status: status || undefined,
        updatedAt: new Date()
      })
      .where(and(eq(personalPodcastEpisodes.id, episodeId as string), eq(personalPodcastEpisodes.ownerUserId, user.id as string)));

    return res.status(200).json({ success: true, message: "Progress updated" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default personalPodcastsRouter;
