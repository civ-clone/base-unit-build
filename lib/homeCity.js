"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.homeCity = void 0;
const CityRegistry_1 = require("@civ-clone/core-city/CityRegistry");
/**
 * The home of a unit of `player`'s made at `tile`, or that changes sides there: the city nearest to it by `distance`,
 * whoever's it is, or none (`null`) when that city is another player's, or there are none. Of two as near, the first
 * registered wins. `excluded`, a city that is going, is left out.
 */
const homeCity = (distance, cityRegistry = CityRegistry_1.instance) => (player, tile, excluded = null) => {
    const nearest = cityRegistry
        .entries()
        .filter((city) => !city.destroyed() && city !== excluded)
        .reduce((nearest, city) => nearest === null ||
        distance(city.tile(), tile) < distance(nearest.tile(), tile)
        ? city
        : nearest, null);
    return nearest !== null && nearest.player() === player ? nearest : null;
};
exports.homeCity = homeCity;
exports.default = exports.homeCity;
//# sourceMappingURL=homeCity.js.map