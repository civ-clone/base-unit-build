import { CityRegistry } from '@civ-clone/core-city/CityRegistry';
import City from '@civ-clone/core-city/City';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
/**
 * The home of a unit of `player`'s made at `tile`, or that changes sides there: the city nearest to it by `distance`,
 * whoever's it is, or none (`null`) when that city is another player's, or there are none. Of two as near, the first
 * registered wins. `excluded`, a city that is going, is left out.
 */
export declare const homeCity: (
  distance: (from: Tile, to: Tile) => number,
  cityRegistry?: CityRegistry
) => (player: Player, tile: Tile, excluded?: City | null) => City | null;
export default homeCity;
