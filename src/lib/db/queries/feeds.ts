import postgres from 'postgres';
import { db } from '..';
import { feed_follows, feeds, users } from '../schema';
import { sql, eq } from "drizzle-orm"
import { readConfig } from 'config';
import { getUserByName } from './users';
import { getFeedByUrl } from './feed_follows';
import { fetchFeed } from 'src/commands';

export async function createFeed(name: string, url: string, user_id: string) {
    const cfg = readConfig()
    const currentUser = cfg.currentUserName
    user_id = (await getUserByName(currentUser)).id
    const [result] = await db.insert(feeds).values({ name: name, url: url, user_id: user_id}).returning();
    return result
}
export async function getFeeds() {
    const rows = await db.select().from(feeds)
    const userid = await db.select().from(feeds).innerJoin(users, eq(feeds.user_id, users.id))
    for(let feed of rows) {
        console.log(feed.name)
        console.log(feed.url)
        console.log(userid)
    }
}
export async function markFeedFetched(feedId: string) {
    const now: Date = new Date()
    await db.update(feeds).set({lastFetchedAt: now, updatedAt: now}).where(eq(feeds.id, feedId))
}
export async function getNextFeedToFetch() {
    const [feed] = await db.select().from(feeds).orderBy(sql`${feeds.lastFetchedAt} ASC NULLS FIRST`).limit(1)
    return feed
}
export async function scrapeFeeds() {
    const nextFeed = await getNextFeedToFetch()
    if(!nextFeed) {
        process.exit(0)
    }
    await markFeedFetched(nextFeed.id)
    const rss = await fetchFeed(nextFeed.url)
    for(let item of rss.items) {
        console.log(item.title)
    }
}