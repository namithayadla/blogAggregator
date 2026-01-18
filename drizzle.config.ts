import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "src/lib/db/schema.ts",
  out: "src/<path_to_generated_files>",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgres://namithayadlapalli:@localhost:5432/gator",
  },
});