import { Build, IBuildCriterion } from '@civ-clone/core-city-build/Rules/Build';
import {
  PlayerResearchRegistry,
  instance as playerResearchRegistryInstance,
} from '@civ-clone/core-science/PlayerResearchRegistry';
import {
  Requirement,
  Target,
  met,
} from '@civ-clone/core-requirement/Requirement';
import Advance from '@civ-clone/core-science/Advance';
import City from '@civ-clone/core-city/City';
import Criterion from '@civ-clone/core-rule/Criterion';
import { Deriver } from '@civ-clone/core-requirement/RequirementRegistry';
import Effect from '@civ-clone/core-rule/Effect';
import { IConstructor } from '@civ-clone/core-registry/Registry';
import Naval from '@civ-clone/base-unit-type-naval/Naval';
import isBarbarian from '@civ-clone/base-civilization-barbarian/isBarbarian';

// A barbarian city's player has no advances: what it may build is a rule of its own, and the advance a unit needs, or
//  makes obsolete, says nothing there.
const notBarbarian = new Criterion(
  (city: City): boolean => !isBarbarian(city.player())
);

/** Ships are only built in a coastal city, `<prefix>:city/build/naval-needs-coast`: a state of the map. */
export const navalNeedsCoastRule = (prefix: string): Build =>
  new Build(
    `${prefix}:city/build/naval-needs-coast`,
    Naval,
    new Criterion((city: City, BuildItem: IConstructor): boolean =>
      Object.prototype.isPrototypeOf.call(Naval, BuildItem)
    ),
    new Effect(
      (city: City): IBuildCriterion =>
        new Criterion((): boolean => city.tile().isCoast())
    )
  );

/**
 * The rule `entry` is played by: a city may build its subject only while its player has the advances it `requires`,
 * and only until its player has the ones it is `obsoletedBy`. Any other relation (`replacedBy`) only describes, so
 * it makes none. The rule's id is the entry's.
 */
export const buildRulesFor = (
  entry: Requirement,
  playerResearchRegistry: PlayerResearchRegistry = playerResearchRegistryInstance
): Build[] => {
  if (entry.relation !== 'requires' && entry.relation !== 'obsoletedBy') {
    return [];
  }

  const obsolete = entry.relation === 'obsoletedBy';

  return [
    new Build(
      entry.id,
      entry.subject,
      notBarbarian,
      new Criterion(
        (city: City, BuildItem: IConstructor): boolean =>
          BuildItem === entry.subject
      ),
      new Effect(
        (city: City): IBuildCriterion =>
          new Criterion((): boolean => {
            const known = met(entry, (target: Target): boolean =>
              playerResearchRegistry
                .getByPlayer(city.player())
                .completed(target as typeof Advance)
            );

            return obsolete ? !known : known;
          })
      )
    ),
  ];
};

/** What a ruleset gives its game's `requirements` to make each entry's rules with. */
export const deriveBuildRules =
  (playerResearchRegistry: PlayerResearchRegistry): Deriver =>
  (entry: Requirement): Build[] =>
    buildRulesFor(entry, playerResearchRegistry);

/** The coastal rule, then one for each of `entries`: for a rule registry without a game's `requirements`. */
export const buildRules = (
  prefix: string,
  entries: Requirement[],
  playerResearchRegistry: PlayerResearchRegistry = playerResearchRegistryInstance
): Build[] => [
  navalNeedsCoastRule(prefix),
  ...entries.flatMap((entry: Requirement): Build[] =>
    buildRulesFor(entry, playerResearchRegistry)
  ),
];

export default buildRules;
