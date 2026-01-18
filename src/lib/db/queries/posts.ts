import { sql } from "drizzle-orm";
import { db } from "..";
import { feeds, posts } from "../schema";

export async function createPost(title: string, url: string, description: string, published_at: Date, feedId: string) {
    const now: Date = new Date()
    const [result]= await db.insert(posts).values({title: title, url: url, description: description, publishedAt: now, feed_id: feedId}).returning()
    return result
}
export async function getPostsForUser(count: number) {
    const rows = await db.select().from(posts).orderBy(sql`${posts.publishedAt} DESC NULLS FIRST`).limit(1)
    for(let i = 0; i < count; i++) {
        console.log(rows[i])
    }
}
