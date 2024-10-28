import { CorsOptions } from "cors";

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    const whitelist = [process.env.FRONTEND_URL];

    if (process.argv.includes("--api")) {
      whitelist.push(undefined);
    }

    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Error de CORS."));
    }
  },
};
