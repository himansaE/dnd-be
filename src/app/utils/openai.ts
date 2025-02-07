import OpenAI from "openai";
import { getEnvVariable } from "./env.js";

const openai = new OpenAI({
  apiKey: getEnvVariable("OPENAI_APIKEY", ""),
  baseURL: getEnvVariable("OPENAI_BASEURL", ""),
});

export { openai };
