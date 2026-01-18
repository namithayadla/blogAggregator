import postgres from 'postgres';
import { db } from '..';
import { feed_follows, feeds, users } from '../schema';
import { and, eq } from "drizzle-orm"
import { readConfig } from 'config';
import { getUserByName } from './users';
import { getFeeds } from './feeds';

export async function createFeedFollow(userId: string, feedId: string) {
    //const cfg = readConfig()
    //const currentUser = cfg.currentUserName
    const [newFollow] = await db.insert(feed_follows).values({user_id: userId, feed_id: feedId}).returning()
    return await db.select().from(feed_follows).innerJoin(feeds, eq(feed_follows.feed_id, feeds.id)).innerJoin(users, eq(feed_follows.user_id, users.id)).where(eq(feed_follows.id, newFollow.id))
}
export async function getFeedByUrl(url: string) {
    const [feed] = await db.select().from(feeds).where(eq(feeds.url, url))
    return feed
}
export async function getFeedFollowsForUser(userId: string) {
    const feedFollows = await db.select().from(feed_follows).innerJoin(feeds, eq(feed_follows.feed_id, feeds.id)).innerJoin(users, eq(feed_follows.user_id, users.id)).where(eq(feed_follows.user_id, userId))
    return feedFollows
}
export async function deleteFeedFollow(userId: string, feedUrl: string) {
    const feed = await getFeedByUrl(feedUrl)
    if(!feed) {
        throw new Error("feed not found")
    }
    const rows = await db.delete(feed_follows).where(and(eq(feed_follows.user_id, userId), eq(feed_follows.feed_id, feed.id))).returning()
    if(rows.length === 0) {
        throw new Error("nothing to unfollow")
    }
}