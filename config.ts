//handle reading and writing the JSON file
import fs from "fs";
import os from "os";
import path from "path";

type Config = {
    dbUrl: string
    currentUserName: string
};
export function setUser(userName: string) {
    const cfg = readConfig()
    cfg.currentUserName = userName
    writeConfig(cfg)
};
export function readConfig(): Config {
    const filePath = getConfigFilePath()
    // console.log("file path: ", filePath)
    
    if(filePath === undefined || filePath === "") {
        throw new Error("No filepath")
    }
    const contents = fs.readFileSync(filePath, "utf-8")
    // console.log("contents: ", contents)
    let parsed = JSON.parse(contents)
    return validateConfig(parsed)
    
};
function getConfigFilePath(): string {
    const filePath = path.join(os.homedir(), ".gatorconfig.json")
    return filePath
};
function writeConfig(cfg: Config){
    let db_url = cfg.dbUrl
    let current_user_name = cfg.currentUserName
    const rawConfig = {db_url, current_user_name}
    fs.writeFileSync(getConfigFilePath(), JSON.stringify(rawConfig, null, 2))
};
function validateConfig(rawConfig: any): Config {
    if(typeof rawConfig.db_url !== "string") {
        throw new Error("db url is not the right type.")
    }
    if(typeof rawConfig.current_user_name !== "string") {
        throw new Error("current user name is not the right type")
    } else if(typeof rawConfig.current_user_name === "undefined") {
        rawConfig.current_user_name = ""
    }
    return {dbUrl: rawConfig.db_url, currentUserName: rawConfig.current_user_name}
};
