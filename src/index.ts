#!/usr/bin/env tsx
import { register } from "module"
import { setUser, readConfig } from "../config"
import {handlerLogin, handlerRegister, runCommand, registerCommand, handlerReset, handlerUsers, handlerAgg, addfeed, handlerListFeeds, handlerFollow, handlerFollowing, MiddlewareLoggedIn, handlerUnfollow, handlerBrowse} from "./commands"
import { CommandsRegistry } from "./commands"
import { getUserByName } from "./lib/db/queries/users"
async function main() {
    //setUser("Namitha");
    // let cfg = readConfig()
    // console.log(`currentUserName`)
    // console.log(`dbUrl`)
    // console.log(`${cfg.dbUrl}`)
    const middlewareLoggedIn: MiddlewareLoggedIn = (handler) => {
        return async (commandName, ...args) => {
            const cfg = readConfig()
            const user = await getUserByName(cfg.currentUserName)
            if (!user) {
                console.log("User not found. Please login first.")
                process.exit(1)
            }
            await handler(commandName, user, ...args)
        }
    }
    let args = process.argv.slice(2)
    if(args.length < 1) {
        console.log("Not enough arguments")
        process.exit(1)
    }
    const commandName = args[0].trim().toLowerCase()
    const commandArgs = args.slice(1)
    const registry: CommandsRegistry = {}
    if(commandName === undefined || commandName === "") {
        console.log("Not enough arguments were provided")
        process.exit(1)
    }
    if(commandName === "login") {
        registerCommand(registry, commandName, handlerLogin)
    } else if(commandName === "register") {
        registerCommand(registry, commandName, handlerRegister)
    } else if(commandName === "reset") {
        registerCommand(registry, commandName, handlerReset)
    } else if(commandName === "users") {
        registerCommand(registry, commandName, handlerUsers)
    } else if(commandName === "agg") {
        registerCommand(registry, commandName, handlerAgg)
    } else if(commandName === "addfeed") {
        registerCommand(registry, commandName, middlewareLoggedIn(addfeed))
    } else if(commandName === "feeds") {
        registerCommand(registry, commandName, handlerListFeeds)
    } else if(commandName === "follow") {
        registerCommand(registry, commandName, middlewareLoggedIn(handlerFollow))
    } else if(commandName === "following") {
        registerCommand(registry, commandName, middlewareLoggedIn(handlerFollowing))
    } else if(commandName === "unfollow") {
        registerCommand(registry, commandName, middlewareLoggedIn(handlerUnfollow))
    } else if(commandName === "browse") {
        registerCommand(registry, commandName, handlerBrowse)
    }
    // Only check for username argument if the command requires it
    if(commandName !== "reset" && commandName != "following" && commandName !== "users" && commandName !== "addfeed" && commandName !== "feeds" && (commandArgs.length === 0 || commandArgs[0] === undefined || commandArgs[0] === "")) {
        console.log("Username is required")
        process.exit(1)
    }
    try {
        await runCommand(registry, commandName, ...commandArgs)
    } catch(err) {
        console.log(err)
        process.exit(1)
    }
    process.exit(0)
}
main();