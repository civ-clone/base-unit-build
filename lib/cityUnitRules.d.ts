import { BuildPreferencesRegistry } from '@civ-clone/core-city-build/BuildPreferencesRegistry';
import { CityBuildRegistry } from '@civ-clone/core-city-build/CityBuildRegistry';
import { CityGrowthRegistry } from '@civ-clone/core-city-growth/CityGrowthRegistry';
import { CityRegistry } from '@civ-clone/core-city/CityRegistry';
import { Engine } from '@civ-clone/core-engine/Engine';
import { UnitImprovementRegistry } from '@civ-clone/core-unit-improvement/UnitImprovementRegistry';
import { UnitRegistry } from '@civ-clone/core-unit/UnitRegistry';
import BuildingComplete from '@civ-clone/core-city-build/Rules/BulidingComplete';
import Captured from '@civ-clone/core-city/Rules/Captured';
import City from '@civ-clone/core-city/City';
import Created from '@civ-clone/core-city/Rules/Created';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import UnitImprovement from '@civ-clone/core-unit-improvement/UnitImprovement';
export interface CityUnitDependencies {
  buildPreferencesRegistry?: BuildPreferencesRegistry;
  cityBuildRegistry?: CityBuildRegistry;
  cityGrowthRegistry?: CityGrowthRegistry;
  cityRegistry?: CityRegistry;
  engine?: Engine;
  unitImprovementRegistry?: UnitImprovementRegistry;
  unitRegistry?: UnitRegistry;
}
export interface CityUnitOptions {
  defenders: (typeof Unit)[];
  homeCity: (player: Player, tile: Tile, excluded: City | null) => City | null;
  lostWithCity: (typeof UnitImprovement)[];
  defectingCauses: (abstract new (...args: any[]) => unknown)[];
}
/**
 * A ruleset's city rules about units, by type, with ids `<prefix>:city/<type>/<name>` as civ1-unit's are: a new city's
 * first defender, repeating a military unit, Settlers costing their city a citizen (and abandoning a size-1 city that
 * isn't its player's last), and units defecting with a city.
 */
export declare const cityUnitRules: (
  prefix: string,
  {
    buildPreferencesRegistry,
    cityBuildRegistry,
    cityGrowthRegistry,
    cityRegistry,
    engine,
    unitImprovementRegistry,
    unitRegistry,
  }: CityUnitDependencies,
  { defenders, homeCity, lostWithCity, defectingCauses }: CityUnitOptions
) => {
  created: Created[];
  buildingComplete: BuildingComplete[];
  captured: Captured[];
};
export default cityUnitRules;
