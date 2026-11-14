"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cityUnitRules = void 0;
const BuildPreferencesRegistry_1 = require("@civ-clone/core-city-build/BuildPreferencesRegistry");
const CityBuildRegistry_1 = require("@civ-clone/core-city-build/CityBuildRegistry");
const CityGrowthRegistry_1 = require("@civ-clone/core-city-growth/CityGrowthRegistry");
const CityRegistry_1 = require("@civ-clone/core-city/CityRegistry");
const Engine_1 = require("@civ-clone/core-engine/Engine");
const Priorities_1 = require("@civ-clone/core-rule/Priorities");
const UnitImprovementRegistry_1 = require("@civ-clone/core-unit-improvement/UnitImprovementRegistry");
const UnitRegistry_1 = require("@civ-clone/core-unit/UnitRegistry");
const BulidingComplete_1 = require("@civ-clone/core-city-build/Rules/BulidingComplete");
const Captured_1 = require("@civ-clone/core-city/Rules/Captured");
const Created_1 = require("@civ-clone/core-city/Rules/Created");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const FoundsCities_1 = require("@civ-clone/base-unit-trait-founds-cities/FoundsCities");
const NonCombatant_1 = require("@civ-clone/base-unit-trait-non-combatant/NonCombatant");
const Unit_1 = require("@civ-clone/core-unit/Unit");
// A unit that founds cities: Settlers.
const foundsCities = (buildItem) => buildItem instanceof Unit_1.default && buildItem.hasTrait(FoundsCities_1.default);
/**
 * A ruleset's city rules about units, by type, with ids `<prefix>:city/<type>/<name>` as civ1-unit's are: a new city's
 * first defender, repeating a military unit, Settlers costing their city a citizen (and abandoning a size-1 city that
 * isn't its player's last), and units defecting with a city.
 */
const cityUnitRules = (prefix, { buildPreferencesRegistry = BuildPreferencesRegistry_1.instance, cityBuildRegistry = CityBuildRegistry_1.instance, cityGrowthRegistry = CityGrowthRegistry_1.instance, cityRegistry = CityRegistry_1.instance, engine = Engine_1.instance, unitImprovementRegistry = UnitImprovementRegistry_1.instance, unitRegistry = UnitRegistry_1.instance, }, { defenders, homeCity, lostWithCity, defectingCauses }) => {
    const id = (name) => `${prefix}:city/${name}`, shrinkCity = new BulidingComplete_1.default(id('building-complete/settlers-shrink-city'), new Criterion_1.default((cityBuild, buildItem) => foundsCities(buildItem)), new Criterion_1.default((cityBuild) => cityGrowthRegistry.getByCity(cityBuild.city()).size() > 1 ||
        cityRegistry.getByPlayer(cityBuild.city().player()).length > 1), new Effect_1.default((cityBuild, buildItem) => {
        const city = cityBuild.city(), cityGrowth = cityGrowthRegistry.getByCity(city);
        if (cityGrowth.size() === 1) {
            buildItem.setCity(homeCity(city.player(), city.tile(), city));
            unitImprovementRegistry
                .getByUnit(buildItem)
                .filter((improvement) => lostWithCity.some((Improvement) => improvement instanceof Improvement))
                .forEach((improvement) => unitImprovementRegistry.unregister(improvement));
        }
        cityGrowth.shrink(buildItem);
    }));
    return {
        created: [
            new Created_1.default(id('created/first-build-defender'), new Priorities_1.Low(), new Criterion_1.default((city) => buildPreferencesRegistry.get(city.player()).firstBuild), new Effect_1.default((city) => {
                const cityBuild = cityBuildRegistry.getByCity(city), available = cityBuild
                    .available()
                    .map((buildItem) => buildItem.item()), defender = defenders.find((UnitType) => available.includes(UnitType));
                if (cityBuild.building() !== null || !defender) {
                    return;
                }
                cityBuild.build(defender);
            })),
        ],
        buildingComplete: [
            new BulidingComplete_1.default(id('building-complete/repeat-military-unit'), new Priorities_1.High(), new Criterion_1.default((cityBuild, buildItem) => buildItem instanceof Unit_1.default &&
                !buildItem.hasTrait(NonCombatant_1.default) &&
                !buildItem.hasTrait(FoundsCities_1.default) &&
                !cityBuild.auto() &&
                buildPreferencesRegistry.get(cityBuild.city().player()).repeat), new Effect_1.default((cityBuild, buildItem) => {
                const UnitType = buildItem.constructor;
                if (cityBuild.building() !== null ||
                    !cityBuild.getAvailable(UnitType)) {
                    return;
                }
                cityBuild.build(UnitType);
            })),
            new BulidingComplete_1.default(id('building-complete/abandoned'), new Priorities_1.High(), new Criterion_1.default((cityBuild, buildItem) => shrinkCity.enabled() &&
                foundsCities(buildItem) &&
                cityGrowthRegistry.getByCity(cityBuild.city()).size() === 1 &&
                cityRegistry.getByPlayer(cityBuild.city().player()).length > 1), new Effect_1.default((cityBuild, buildItem) => {
                engine.emit('city:abandoned', cityBuild.city(), buildItem);
            })),
            shrinkCity,
        ],
        captured: defectingCauses.length === 0
            ? []
            : [
                new Captured_1.default(id('captured/defecting-units'), new Priorities_1.High(), new Criterion_1.default((city, capturingPlayer, originalPlayer, cause) => defectingCauses.some((Cause) => cause instanceof Cause)), new Effect_1.default((city, capturingPlayer, originalPlayer) => [
                    city.tile(),
                    ...city
                        .tile()
                        .getNeighbours()
                        .filter((tile) => cityRegistry.getByTile(tile) === null),
                ]
                    .flatMap((tile) => unitRegistry.getByTile(tile))
                    .filter((unit) => unit.player() === originalPlayer)
                    .forEach((unit) => unit.transfer(capturingPlayer, city)))),
            ],
    };
};
exports.cityUnitRules = cityUnitRules;
exports.default = exports.cityUnitRules;
//# sourceMappingURL=cityUnitRules.js.map