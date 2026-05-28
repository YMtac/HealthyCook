import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ingredientsRouter from "./ingredients";
import recipesRouter from "./recipes";
import shoppingRouter from "./shopping";
import favoritesRouter from "./favorites";
import recommendationsRouter from "./recommendations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ingredientsRouter);
router.use(recipesRouter);
router.use(shoppingRouter);
router.use(favoritesRouter);
router.use(recommendationsRouter);

export default router;
