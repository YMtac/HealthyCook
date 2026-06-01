import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ingredientsRouter from "./ingredients";
import recipesRouter from "./recipes";
import exploreRouter from "./explore";
import shoppingRouter from "./shopping";
import favoritesRouter from "./favorites";
import recommendationsRouter from "./recommendations";
import cookingLogsRouter from "./cooking-logs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ingredientsRouter);
router.use(recipesRouter);
router.use(exploreRouter);
router.use(shoppingRouter);
router.use(favoritesRouter);
router.use(recommendationsRouter);
router.use(cookingLogsRouter);

export default router;
