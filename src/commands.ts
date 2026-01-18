import { XMLParser } from "fast-xml-parser";
import { readConfig, setUser } from "../config";
import { createUser, deleteUsers, getAgg, getUserByName, getUsers } from "./lib/db/queries/users";
import { feed_follows, feeds, users } from "./lib/db/schema";
import { title } from "process";
import { createFeed, getFeeds, getNextFeedToFetch, markFeedFetched } from "./lib/db/queries/feeds";
import { createFeedFollow, deleteFeedFollow, getFeedByUrl, getFeedFollowsForUser } from "./lib/db/queries/feed_follows";
import { eq } from "drizzle-orm";
import { db } from "./lib/db";

type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;
type UserCommandHandler = (
    cmdName: string,
    user: User,
    ...args: string[]
  ) => Promise<void>;
export type MiddlewareLoggedIn = (handler: UserCommandHandler) => CommandHandler;
export async function handlerLogin(cmdName: string, ...args: string[]) {
    if(!args[0]) {
        console.log("username required!")
        process.exit(1)
    }
    const existing = await getUserByName(args[0])
    if(!existing) {
        console.log("User does not exist.")
        process.exit(1)
    }
    setUser(args[0]);
    console.log("User has been set!")
}
export async function handlerRegister(cmdName: string, ...args: string[]) {
    if(!args[0]) {
        throw new Error("username required!")
    }
    const existing = await getUserByName(args[0])
    if(existing) {
        console.log("User already exists")
        process.exit(1)
    } else {
        const user = await createUser(args[0])
        setUser(args[0])
        console.log("User was created")
        console.log(user)
    }
}
export async function handlerReset(cmdName: string) {
    if(!cmdName) {
        console.log("command required!")
        process.exit(1)
    } else {
        await deleteUsers()
    }
}
export async function handlerUsers(cmdName: string) {
    if(!cmdName) {
        console.log("command required!")
        process.exit(1)
    } else {
        await getUsers()
    }
}
export async function handlerAgg(cmdName: string, ...args: string[]) {
    if(!cmdName) {
        console.log("command required!")
        process.exit(1)
    } else {
        const timeArg = args[0]
        const timeBetweenRequests = parseDuration(timeArg)
        if(!timeBetweenRequests) {
            throw new Error("invalid duration")
        }
        console.log(`Collecting feeds every ${timeArg}...`)

        scrapeFeeds().catch(handleError);

        const interval = setInterval(() => {
        scrapeFeeds().catch(handleError);
        }, timeBetweenRequests);

        await new Promise<void>((resolve) => {
            process.on("SIGINT", () => {
              console.log("Shutting down feed aggregator...");
              clearInterval(interval);
              resolve();
            });
        });
    }
}
export function parseDuration(durationStr: string) {
    const regex = /^(\d+)(ms|s|m|h)$/;
    const match = durationStr.match(regex);
    if (!match) return;
  
    if (match.length !== 3) return;
  
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case "ms":
        return value;
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      default:
        return;
    }
  }
async function scrapeFeeds() {
    const feed = await getNextFeedToFetch()
    if(!feed) {
        console.log("no feeds to fetch")
        return
    }
    scrapeFeed(feed)
}
async function scrapeFeed(feed: Feed) {
    await markFeedFetched(feed.id)
    const feedData = await fetchFeed(feed.url)
}
function handleError(err: unknown) {
    console.error(`error scraping feeds: ${err}`)
}
export async function addfeed(cmdName: string, user: User, ...args: string[]) {
    const name = args[0]
    const url = args[1]
    if(!cmdName || !name || !url) {
        console.log("command required!")
        process.exit(1)
    } else {
        if(!user) {
            throw new Error("No user id!")
        } else {
            const feed = await createFeed(name, url, user.id)
            await createFeedFollow(user.id, feed.id)
            printFeed(feed, user)
        }
    }
}
export async function handlerListFeeds() {
    await getFeeds()
}
export async function handlerFollow(cmdName: string, user: User, ...args: string[]) {
    const url = args[0]
    if(!cmdName || !url) {
        console.log("command required!")
        process.exit(1)
    } else {
        // const cfg = readConfig()
        // const user = await getUserByName(cfg.currentUserName)
        if(!user) {
            throw new Error("user not found/ logged in")
        }
        const feed = await getFeedByUrl(url)
        if(!feed) {
            throw new Error("feed not found")
        }
        const [newFeedFollow] = await createFeedFollow(user.id, feed.id)
        console.log(newFeedFollow.feeds.name)
        console.log(newFeedFollow.users.name)
    }
}
export async function handlerFollowing(cmdName: string, user: User) {
    if(!user) {
        throw new Error("no user found")
    } else {
        const follows = await getFeedFollowsForUser(user.id)
        for(let follow of follows) {
            console.log(follow.feeds.name)
        }
    }
}
export async function handlerUnfollow(cmdName: string, user: User, ...args: string[]) {
    if(!user) {
        throw new Error("no user found")
    } else {
        const url = args[0]
        if(!url) {
            throw new Error("no url")
        }
        await deleteFeedFollow(user.id, url)
        console.log("deleted!")
    }
}
export async function handlerBrowse(cmdName: string, ...args: string[]) {
    let limit = args[0]
    if(!limit) {
        limit = "2"
    }
}

export type Feed = typeof feeds.$inferSelect
export type User = typeof users.$inferSelect
export type FeedFollow = typeof feed_follows.$inferSelect

export function printFeed(feed: Feed, user: User) {
    console.log(feed)
    console.log(user)
}
export type CommandsRegistry = {
    [commandName: string]: CommandHandler
}
export async  function registerCommand(registry: CommandsRegistry, cmdName: string, handler: CommandHandler) {
    registry[cmdName] = handler
}
export async function runCommand(registry: CommandsRegistry, cmdName: string, ...args: string[]) {
    if(!registry[cmdName]) {
        throw new Error("unknown command")
    } else {
        await registry[cmdName](cmdName, ...args)
    }
}
type RSSItem = {
    title: string
    link: string
    description: string
    pubDate: string
}
type RSSFeed = {
    title: string
    link: string
    description: string
    items: RSSItem[]
}
export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
    const res = await fetch(feedURL, {
        headers: {
          "User-Agent": "gator"
        }
      })
    const xml = await res.text()
    const parser = new XMLParser()
    const parsed = parser.parse(xml)
    if(!parsed?.rss?.channel) {
        throw new Error("channel field does not ")
    }
    const title = parsed.rss.channel.title
    const link = parsed.rss.channel.link
    const description = parsed.rss.channel.description
    if(typeof title !== "string" || typeof link !== "string" || typeof description !== "string") {
        throw new Error("channel metadata are not of type string")
    }
    let items = []
    if(Array.isArray(parsed.rss.channel.item)){
        items = parsed.rss.channel.item
    } else if(typeof parsed.rss.channel.item === 'object') {
        items = [parsed.rss.channel.item]
    }
    else {
        items = []
    }
    const rssItems: RSSItem[] = []
    for(let item of items) {
        if(typeof item.title === 'string' && typeof item.link === 'string' && typeof item.description === 'string' && typeof item.pubDate === 'string') {
            rssItems.push(item.title, item.link, item.description, item.pubDate)
        } else {
            continue;
        }
    }
    console.log(parsed.rss.channel.item)
    return {title, link, description, items: rssItems}
    // for(let item of items) {

    // }
    //console.log("parsed: ",parsed)
}