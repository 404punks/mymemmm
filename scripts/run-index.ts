import { runIndexSource } from "../src/lib/index/engine";

const source = process.argv[2];
if (source !== "huggingface" && source !== "github" && source !== "mcp") {
  console.error("Usage: npm run index:run -- huggingface|github|mcp");
  process.exit(1);
}

runIndexSource(source)
  .then((job) => {
    console.log(JSON.stringify({ id: job.id, status: job.status, itemsAdded: job.itemsAdded, itemsUpdated: job.itemsUpdated }));
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
