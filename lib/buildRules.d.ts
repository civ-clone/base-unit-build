import { Build } from '@civ-clone/core-city-build/Rules/Build';
import { PlayerResearchRegistry } from '@civ-clone/core-science/PlayerResearchRegistry';
import { Requirement } from '@civ-clone/core-requirement/Requirement';
import { Deriver } from '@civ-clone/core-requirement/RequirementRegistry';
/** Ships are only built in a coastal city, `<prefix>:city/build/naval-needs-coast`: a state of the map. */
export declare const navalNeedsCoastRule: (prefix: string) => Build;
/**
 * The rule `entry` is played by: a city may build its subject only while its player has the advances it `requires`,
 * and only until its player has the ones it is `obsoletedBy`. Any other relation (`replacedBy`) only describes, so
 * it makes none. The rule's id is the entry's.
 */
export declare const buildRulesFor: (
  entry: Requirement,
  playerResearchRegistry?: PlayerResearchRegistry
) => Build[];
/** What a ruleset gives its game's `requirements` to make each entry's rules with. */
export declare const deriveBuildRules: (
  playerResearchRegistry: PlayerResearchRegistry
) => Deriver;
/** The coastal rule, then one for each of `entries`: for a rule registry without a game's `requirements`. */
export declare const buildRules: (
  prefix: string,
  entries: Requirement[],
  playerResearchRegistry?: PlayerResearchRegistry
) => Build[];
export default buildRules;
