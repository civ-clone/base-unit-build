"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRules = exports.deriveBuildRules = exports.buildRulesFor = exports.navalNeedsCoastRule = void 0;
const Build_1 = require("@civ-clone/core-city-build/Rules/Build");
const PlayerResearchRegistry_1 = require("@civ-clone/core-science/PlayerResearchRegistry");
const Requirement_1 = require("@civ-clone/core-requirement/Requirement");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const Naval_1 = require("@civ-clone/base-unit-type-naval/Naval");
const isBarbarian_1 = require("@civ-clone/base-civilization-barbarian/isBarbarian");
// A barbarian city's player has no advances: what it may build is a rule of its own, and the advance a unit needs, or
//  makes obsolete, says nothing there.
const notBarbarian = new Criterion_1.default((city) => !(0, isBarbarian_1.default)(city.player()));
/** Ships are only built in a coastal city, `<prefix>:city/build/naval-needs-coast`: a state of the map. */
const navalNeedsCoastRule = (prefix) => new Build_1.Build(`${prefix}:city/build/naval-needs-coast`, Naval_1.default, new Criterion_1.default((city, BuildItem) => Object.prototype.isPrototypeOf.call(Naval_1.default, BuildItem)), new Effect_1.default((city) => new Criterion_1.default(() => city.tile().isCoast())));
exports.navalNeedsCoastRule = navalNeedsCoastRule;
/**
 * The rule `entry` is played by: a city may build its subject only while its player has the advances it `requires`,
 * and only until its player has the ones it is `obsoletedBy`. Any other relation (`replacedBy`) only describes, so
 * it makes none. The rule's id is the entry's.
 */
const buildRulesFor = (entry, playerResearchRegistry = PlayerResearchRegistry_1.instance) => {
    if (entry.relation !== 'requires' && entry.relation !== 'obsoletedBy') {
        return [];
    }
    const obsolete = entry.relation === 'obsoletedBy';
    return [
        new Build_1.Build(entry.id, entry.subject, notBarbarian, new Criterion_1.default((city, BuildItem) => BuildItem === entry.subject), new Effect_1.default((city) => new Criterion_1.default(() => {
            const known = (0, Requirement_1.met)(entry, (target) => playerResearchRegistry
                .getByPlayer(city.player())
                .completed(target));
            return obsolete ? !known : known;
        }))),
    ];
};
exports.buildRulesFor = buildRulesFor;
/** What a ruleset gives its game's `requirements` to make each entry's rules with. */
const deriveBuildRules = (playerResearchRegistry) => (entry) => (0, exports.buildRulesFor)(entry, playerResearchRegistry);
exports.deriveBuildRules = deriveBuildRules;
/** The coastal rule, then one for each of `entries`: for a rule registry without a game's `requirements`. */
const buildRules = (prefix, entries, playerResearchRegistry = PlayerResearchRegistry_1.instance) => [
    (0, exports.navalNeedsCoastRule)(prefix),
    ...entries.flatMap((entry) => (0, exports.buildRulesFor)(entry, playerResearchRegistry)),
];
exports.buildRules = buildRules;
exports.default = exports.buildRules;
//# sourceMappingURL=buildRules.js.map