import postgres from 'postgres';
import { db } from '..';
import { users } from '../schema';
import { eq } from "drizzle-orm"
import { readConfig } from 'config';

export async function createUser(name: string) {
    const [result] = await db.insert(users).values({ name: name }).returning();
    return result;
} 

export async function getUserByName(name: string) {
    const [user] = await db.select().from(users).where(eq(users.name, name));
    return user;
}
export async function deleteUsers() {
    await db.delete(users)
}
export async function getUsers() {
    const rows = await db.select().from(users)
    const cfg = readConfig()
    for(let user of rows) {
        if(user.name === cfg.currentUserName) {
            console.log("*", user.name, "(current)")
        } else {
            console.log("*", user.name)
        }
    }
}
export async function getAgg() {

}