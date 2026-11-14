import {
  BuildPreferencesRegistry,
  instance as buildPreferencesRegistryInstance,
} from '@civ-clone/core-city-build/BuildPreferencesRegistry';
import {
  CityBuildRegistry,
  instance as cityBuildRegistryInstance,
} from '@civ-clone/core-city-build/CityBuildRegistry';
import {
  CityGrowthRegistry,
  instance as cityGrowthRegistryInstance,
} from '@civ-clone/core-city-growth/CityGrowthRegistry';
import {
  CityRegistry,
  instance as cityRegistryInstance,
} from '@civ-clone/core-city/CityRegistry';
import {
  Engine,
  instance as engineInstance,
} from '@civ-clone/core-engine/Engine';
import { High, Low } from '@civ-clone/core-rule/Priorities';
import {
  UnitImprovementRegistry,
  instance as unitImprovementRegistryInstance,
} from '@civ-clone/core-unit-improvement/UnitImprovementRegistry';
import {
  UnitRegistry,
  instance as unitRegistryInstance,
} from '@civ-clone/core-unit/UnitRegistry';
import { BuildableInstance } from '@civ-clone/core-city-build/Buildable';
import BuildingComplete from '@civ-clone/core-city-build/Rules/BulidingComplete';
import Captured from '@civ-clone/core-city/Rules/Captured';
import City from '@civ-clone/core-city/City';
import CityBuild from '@civ-clone/core-city-build/CityBuild';
import Created from '@civ-clone/core-city/Rules/Created';
import Criterion from '@civ-clone/core-rule/Criterion';
import Effect from '@civ-clone/core-rule/Effect';
import FoundsCities from '@civ-clone/base-unit-trait-founds-cities/FoundsCities';
import NonCombatant from '@civ-clone/base-unit-trait-non-combatant/NonCombatant';
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
  // What a new city builds first, if its player asks for that: the first of these it may build.
  defenders: (typeof Unit)[];
  // Where Settlers that outlive their size-1 city go home (base-unit-build's `homeCity`).
  homeCity: (player: Player, tile: Tile, excluded: City | null) => City | null;
  // What Settlers that outlive their city lose (a veteran's status).
  lostWithCity: (typeof UnitImprovement)[];
  // The causes of a capture that bring the city's units over with it (an incited revolt). None: no rule is made.
  defectingCauses: (abstract new (...args: any[]) => unknown)[];
}

// A unit that founds cities: Settlers.
const foundsCities = (buildItem: BuildableInstance): boolean =>
  buildItem instanceof Unit && buildItem.hasTrait(FoundsCities);

/**
 * A ruleset's city rules about units, by type, with ids `<prefix>:city/<type>/<name>` as civ1-unit's are: a new city's
 * first defender, repeating a military unit, Settlers costing their city a citizen (and abandoning a size-1 city that
 * isn't its player's last), and units defecting with a city.
 */
export const cityUnitRules = (
  prefix: string,
  {
    buildPreferencesRegistry = buildPreferencesRegistryInstance,
    cityBuildRegistry = cityBuildRegistryInstance,
    cityGrowthRegistry = cityGrowthRegistryInstance,
    cityRegistry = cityRegistryInstance,
    engine = engineInstance,
    unitImprovementRegistry = unitImprovementRegistryInstance,
    unitRegistry = unitRegistryInstance,
  }: CityUnitDependencies,
  { defenders, homeCity, lostWithCity, defectingCauses }: CityUnitOptions
) => {
  const id = (name: string): string => `${prefix}:city/${name}`,
    shrinkCity = new BuildingComplete(
      id('building-complete/settlers-shrink-city'),
      new Criterion((cityBuild: CityBuild, buildItem: BuildableInstance) =>
        foundsCities(buildItem)
      ),
      new Criterion(
        (cityBuild: CityBuild): boolean =>
          cityGrowthRegistry.getByCity(cityBuild.city()).size() > 1 ||
          cityRegistry.getByPlayer(cityBuild.city().player()).length > 1
      ),
      new Effect((cityBuild: CityBuild, buildItem: BuildableInstance): void => {
        const city = cityBuild.city(),
          cityGrowth = cityGrowthRegistry.getByCity(city);

        if (cityGrowth.size() === 1) {
          (buildItem as Unit).setCity(
            homeCity(city.player(), city.tile(), city)
          );

          unitImprovementRegistry
            .getByUnit(buildItem as Unit)
            .filter((improvement) =>
              lostWithCity.some(
                (Improvement: typeof UnitImprovement): boolean =>
                  improvement instanceof Improvement
              )
            )
            .forEach((improvement) =>
              unitImprovementRegistry.unregister(improvement)
            );
        }

        cityGrowth.shrink(buildItem);
      })
    );

  return {
    created: [
      new Created(
        id('created/first-build-defender'),
        new Low(),
        new Criterion(
          (city: City): boolean =>
            buildPreferencesRegistry.get(city.player()).firstBuild
        ),
        new Effect((city: City): void => {
          const cityBuild = cityBuildRegistry.getByCity(city),
            available = cityBuild
              .available()
              .map((buildItem) => buildItem.item()),
            defender = defenders.find((UnitType) =>
              available.includes(UnitType)
            );

          if (cityBuild.building() !== null || !defender) {
            return;
          }

          cityBuild.build(defender);
        })
      ),
    ],

    buildingComplete: [
      new BuildingComplete(
        id('building-complete/repeat-military-unit'),
        new High(),
        new Criterion(
          (cityBuild: CityBuild, buildItem: BuildableInstance): boolean =>
            buildItem instanceof Unit &&
            !buildItem.hasTrait(NonCombatant) &&
            !buildItem.hasTrait(FoundsCities) &&
            !cityBuild.auto() &&
            buildPreferencesRegistry.get(cityBuild.city().player()).repeat
        ),
        new Effect(
          (cityBuild: CityBuild, buildItem: BuildableInstance): void => {
            const UnitType = buildItem.constructor as typeof Unit;

            if (
              cityBuild.building() !== null ||
              !cityBuild.getAvailable(UnitType)
            ) {
              return;
            }

            cityBuild.build(UnitType);
          }
        )
      ),
      new BuildingComplete(
        id('building-complete/abandoned'),
        new High(),
        new Criterion(
          (cityBuild: CityBuild, buildItem: BuildableInstance): boolean =>
            shrinkCity.enabled() &&
            foundsCities(buildItem) &&
            cityGrowthRegistry.getByCity(cityBuild.city()).size() === 1 &&
            cityRegistry.getByPlayer(cityBuild.city().player()).length > 1
        ),
        new Effect(
          (cityBuild: CityBuild, buildItem: BuildableInstance): void => {
            engine.emit('city:abandoned', cityBuild.city(), buildItem);
          }
        )
      ),
      shrinkCity,
    ],

    captured:
      defectingCauses.length === 0
        ? []
        : [
            new Captured(
              id('captured/defecting-units'),
              new High(),
              new Criterion(
                (
                  city: City,
                  capturingPlayer: Player,
                  originalPlayer: Player,
                  cause: unknown
                ): boolean =>
                  defectingCauses.some(
                    (Cause): boolean => cause instanceof Cause
                  )
              ),
              new Effect(
                (
                  city: City,
                  capturingPlayer: Player,
                  originalPlayer: Player
                ): void =>
                  [
                    city.tile(),
                    ...city
                      .tile()
                      .getNeighbours()
                      .filter(
                        (tile: Tile): boolean =>
                          cityRegistry.getByTile(tile) === null
                      ),
                  ]
                    .flatMap((tile: Tile): Unit[] =>
                      unitRegistry.getByTile(tile)
                    )
                    .filter(
                      (unit: Unit): boolean => unit.player() === originalPlayer
                    )
                    .forEach((unit: Unit): void =>
                      unit.transfer(capturingPlayer, city)
                    )
              )
            ),
          ],
  };
};

export default cityUnitRules;
