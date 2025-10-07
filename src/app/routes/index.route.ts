import { Hono } from "hono";
import { storyGenerator } from "./story-generator.route.js";
import { storyRoute } from "./story.route.js";
import { characterRoute } from "./character.route.js";

const router = new Hono();

router.route("/story", storyRoute);
router.route("/story-generator", storyGenerator);
router.route("/characters", characterRoute);

export default router;
