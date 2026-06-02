import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";

export const authRouter = Router();

/** Returns the authenticated user and resolved persona role. */
authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ data: req.user, source: "murusSG auth", fetchedAt: new Date().toISOString() });
});
