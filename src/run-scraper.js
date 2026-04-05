import { captureSiteRequests, searchAddress } from "./scraper.js";

const arg = process.argv[2];
const runner = arg === "capture" || !arg ? captureSiteRequests() : searchAddress(arg);

runner
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
