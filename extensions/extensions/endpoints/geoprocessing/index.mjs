import middleware from "./middleware.mjs";
import clip from "./clip.mjs";
import dissolve from "./dissolve.mjs";
import intersect from "./intersect.mjs";
import merge from "./merge.mjs";
import spatialJoin from "./spatialJoin.mjs";
import union from "./union.mjs";
import difference from "./difference.mjs";
import tableJoin from "./tableJoin.mjs";

const routes = {
  clip,
  dissolve,
  intersect,
  merge,
  spatialJoin,
  union,
  difference,
  tableJoin,
};

export default (router, { database, logger }) => {
  router.use(middleware);

  Object.keys(routes).forEach((route) => {
    router.post(
      `/${route.replace(/([A-Z])/g, "-$1").toLowerCase()}`,
      (req, res, next) => routes[route](req, res, next, database, logger)
    );
  });
};
