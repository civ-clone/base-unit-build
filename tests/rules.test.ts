import * as fs from 'fs';
import * as path from 'path';
import buildRules, { buildRulesFor } from '../lib/buildRules';
import Build from '@civ-clone/core-city-build/Rules/Build';
import FoundsCities from '@civ-clone/base-unit-trait-founds-cities/FoundsCities';
import NonCombatant from '@civ-clone/base-unit-trait-non-combatant/NonCombatant';
import Naval from '@civ-clone/base-unit-type-naval/Naval';
import { Requirement, table } from '@civ-clone/core-requirement/Requirement';
import Rule from '@civ-clone/core-rule/Rule';
import Unit from '@civ-clone/core-unit/Unit';
import UnitImprovement from '@civ-clone/core-unit-improvement/UnitImprovement';
import cityUnitRules from '../lib/cityUnitRules';
import { expect } from 'chai';
import homeCity from '../lib/homeCity';

// civ1-unit 0.1.40's own rules (835709d): id, rule type, priority and criteria count, in order. With civ1-unit's
//  prefix and entries, the assemblers give exactly these (R2b adopts them unchanged).
const fixture = (name: string): [string | null, string, number, number][] =>
  JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'tests/fixtures', name), 'utf8')
  );

const fingerprint = (rules: Rule<any, any>[]) =>
  rules.map((rule: Rule<any, any>) => [
    rule.id(),
    rule.constructor.name,
    rule.priority().value(),
    (
      (rule as unknown as { _criteria?: { _criteria: unknown[] } })._criteria
        ?._criteria ?? []
    ).length,
  ]);

class Advance {}
class Later {}
class Warrior extends Unit {}
class Veteran extends UnitImprovement {}
class InciteRevolt {}

describe('buildRules', (): void => {
  it("gives civ1-unit's Rules/City/build rules, in order, from entries made as civ1-unit makes them", (): void => {
    // civ1-unit's `Requirements`: `table` entries for the units that need an advance, then for those an advance makes
    //  obsolete, in its order. Only the class names come from civ1-unit; the ids are `table`'s, the rules ours.
    const named = (name: string): typeof Unit =>
        ({ [name]: class extends Unit {} }[name]),
      requires = [
        'Artillery',
        'Battleship',
        'Bomber',
        'Cannon',
        'Carrier',
        'Caravan',
        'Catapult',
        'Chariot',
        'Cruiser',
        'Diplomat',
        'Fighter',
        'Frigate',
        'Horseman',
        'Ironclad',
        'Knight',
        'MechanizedInfantry',
        'Musketman',
        'Nuclear',
        'Rifleman',
        'Sail',
        'Spearman',
        'Submarine',
        'Swordman',
        'Tank',
        'Transport',
        'Trireme',
      ],
      obsoleted = [
        'Cannon',
        'Catapult',
        'Chariot',
        'Frigate',
        'Horseman',
        'Ironclad',
        'Knight',
        'Musketman',
        'Sail',
        'Spearman',
        'Swordman',
        'Trireme',
        'Warrior',
      ],
      entries = [
        ...table(
          'civ1-unit:city/build/requires-advance',
          'requires',
          requires.map((name: string): [typeof Unit, typeof Advance] => [
            named(name),
            Advance,
          ])
        ),
        ...table(
          'civ1-unit:city/build/obsolete',
          'obsoletedBy',
          obsoleted.map((name: string): [typeof Unit, typeof Later] => [
            named(name),
            Later,
          ])
        ),
      ];

    expect(fingerprint(buildRules('civ1-unit', entries))).to.deep.equal(
      fixture('civ1-unit-build.json')
    );
  });

  const research = (known: unknown[]) =>
      ({
        getByPlayer: () => ({
          completed: (Type: unknown): boolean => known.includes(Type),
        }),
      } as never),
    city = (coast = true) =>
      ({
        player: () => ({}),
        tile: () => ({ isCoast: (): boolean => coast }),
      } as never),
    allows = (rule: Build, item: unknown, at = city()): boolean =>
      rule.validate(at, item) &&
      (rule.process(at, item) as unknown as { validate(): boolean }).validate();

  it('allows a unit while its advance is known, and until its obsoleting one is', (): void => {
    const [requires] = buildRulesFor(
        new Requirement({
          id: 'game:requires/Warrior',
          subject: Warrior,
          relation: 'requires',
          targets: [Advance],
        }),
        research([Advance])
      ),
      [obsolete] = buildRulesFor(
        new Requirement({
          id: 'game:obsolete/Warrior',
          subject: Warrior,
          relation: 'obsoletedBy',
          targets: [Later],
        }),
        research([Advance, Later])
      );

    expect(allows(requires, Warrior)).to.true;
    expect(allows(obsolete, Warrior)).to.false;
    expect(requires.validate(city(), class extends Unit {})).to.false;
    expect(
      buildRulesFor(
        new Requirement({
          id: 'game:replaced',
          subject: Warrior,
          relation: 'replacedBy',
          targets: [Warrior],
        })
      )
    ).to.deep.equal([]);
  });

  it('builds ships only on the coast', (): void => {
    class Ship extends Naval {}

    const [coast] = buildRules('game', []);

    expect(coast.id()).to.equal('game:city/build/naval-needs-coast');
    expect(allows(coast, Ship, city(true))).to.true;
    expect(allows(coast, Ship, city(false))).to.false;
    expect(coast.validate(city(), Warrior)).to.false;
  });
});

describe('homeCity', (): void => {
  it('is the nearest city if it is the player’s own, the first of two as near', (): void => {
    const me = {},
      them = {},
      at = (x: number, player: object, destroyed = false) => ({
        tile: () => x,
        player: () => player,
        destroyed: () => destroyed,
      }),
      near = at(2, me),
      alsoNear = at(-2, them),
      far = at(5, me),
      home = (cities: object[]) =>
        homeCity((from, to) => Math.abs((from as never) - (to as never)), {
          entries: () => cities,
        } as never);

    expect(home([far, near, alsoNear])(me as never, 0 as never)).to.equal(near);
    expect(home([alsoNear, near])(me as never, 0 as never)).to.null;
    expect(home([near, far])(me as never, 0 as never, near as never)).to.equal(
      far
    );
    expect(home([at(1, me, true), far])(me as never, 0 as never)).to.equal(far);
  });
});

describe('cityUnitRules', (): void => {
  const civ1 = cityUnitRules(
    'civ1-unit',
    {},
    {
      defenders: [],
      homeCity: () => null,
      lostWithCity: [Veteran],
      defectingCauses: [InciteRevolt],
    }
  );

  it("gives civ1-unit's Rules/City/created, buildingComplete and captured rules, in order", (): void => {
    expect(fingerprint(civ1.created)).to.deep.equal(
      fixture('civ1-unit-city-created.json')
    );
    expect(fingerprint(civ1.buildingComplete)).to.deep.equal(
      fixture('civ1-unit-building-complete.json')
    );
    expect(fingerprint(civ1.captured)).to.deep.equal(
      fixture('civ1-unit-captured.json')
    );
  });

  it('makes no defecting rule without a cause', (): void => {
    expect(
      cityUnitRules(
        'game',
        {},
        {
          defenders: [],
          homeCity: () => null,
          lostWithCity: [],
          defectingCauses: [],
        }
      ).captured
    ).to.deep.equal([]);
  });

  it('shrinks the city for Settlers, sending them home and taking their veteran status when it was size 1', (): void => {
    const sizes = new Map<object, number>(),
      unregistered: unknown[] = [],
      homes: unknown[] = [],
      player = {},
      other = {},
      cityOf = (size: number) => {
        const city = { player: () => player, tile: () => 'tile' };

        sizes.set(city, size);

        return city;
      },
      rules = cityUnitRules(
        'game',
        {
          cityGrowthRegistry: {
            getByCity: (city: object) => ({
              size: () => sizes.get(city)!,
              shrink: () => sizes.set(city, sizes.get(city)! - 1),
            }),
          } as never,
          cityRegistry: {
            getByPlayer: () => [cityOf(3), cityOf(3)],
          } as never,
          unitImprovementRegistry: {
            getByUnit: () => [new Veteran()],
            unregister: (improvement: unknown) =>
              unregistered.push(improvement),
          } as never,
        },
        {
          defenders: [],
          homeCity: () => other as never,
          lostWithCity: [Veteran],
          defectingCauses: [],
        }
      ),
      shrink = rules.buildingComplete[2],
      settlers = Object.assign(Object.create(Unit.prototype), {
        hasTrait: (Trait: unknown): boolean => Trait === FoundsCities,
        setCity: (city: unknown) => homes.push(city),
      }),
      big = cityOf(4),
      small = cityOf(1),
      build = (city: object) => ({ city: () => city });

    expect(shrink.validate(build(big), settlers)).to.true;
    shrink.process(build(big), settlers);
    expect(sizes.get(big)).to.equal(3);
    expect(homes).to.deep.equal([]);

    shrink.process(build(small), settlers);
    expect(sizes.get(small)).to.equal(0);
    expect(homes).to.deep.equal([other]);
    expect(unregistered).to.length(1);
  });
});

describe('cityUnitRules, the other rules', (): void => {
  class Phalanx extends Unit {}
  class Diplomat extends Unit {}
  class Settlers extends Unit {}

  const traitOf = (UnitType: Function) => (Trait: unknown) =>
      (UnitType === Diplomat && Trait === NonCombatant) ||
      (UnitType === Settlers && Trait === FoundsCities),
    instance = (UnitType: typeof Unit, props = {}) =>
      Object.assign(Object.create(UnitType.prototype), {
        hasTrait: traitOf(UnitType),
        ...props,
      }),
    player = {},
    rulesWith = (deps: object) =>
      cityUnitRules('game', deps as never, {
        defenders: [Phalanx, Warrior],
        homeCity: () => null,
        lostWithCity: [Veteran],
        defectingCauses: [InciteRevolt],
      }),
    build = (available: Function[], building: Function | null = null) => {
      const built: Function[] = [];

      return {
        built,
        cityBuild: {
          available: () => available.map((item) => ({ item: () => item })),
          getAvailable: (item: Function) => available.includes(item),
          building: () => (building === null ? null : {}),
          build: (item: Function) => built.push(item),
          auto: () => false,
          city: () => ({ player: () => player }),
        },
      };
    };

  it('has a new city build its strongest defender first, if its player asks', (): void => {
    const { built, cityBuild } = build([Warrior, Phalanx]),
      [first] = rulesWith({
        buildPreferencesRegistry: { get: () => ({ firstBuild: true }) },
        cityBuildRegistry: { getByCity: () => cityBuild },
      }).created,
      city = { player: () => player };

    expect(first.validate(city)).to.true;
    first.process(city);
    expect(built).to.deep.equal([Phalanx]);
    expect(
      rulesWith({
        buildPreferencesRegistry: { get: () => ({ firstBuild: false }) },
      }).created[0].validate(city)
    ).to.false;
  });

  it('repeats a military unit, but not a Diplomat or Settlers', (): void => {
    const { built, cityBuild } = build([Phalanx, Diplomat, Settlers]),
      [repeat] = rulesWith({
        buildPreferencesRegistry: { get: () => ({ repeat: true }) },
      }).buildingComplete;

    [Phalanx, Diplomat, Settlers].forEach((UnitType) => {
      const unit = instance(UnitType);

      if (repeat.validate(cityBuild, unit)) {
        repeat.process(cityBuild, unit);
      }
    });

    expect(built).to.deep.equal([Phalanx]);
  });

  it('tells the client a size-1 city that isn’t its player’s last is abandoned for Settlers', (): void => {
    const events: string[] = [],
      sizes = [1, 1, 2],
      [, abandoned] = rulesWith({
        cityGrowthRegistry: { getByCity: () => ({ size: () => sizes[0] }) },
        cityRegistry: { getByPlayer: () => sizes.slice(1) },
        engine: { emit: (event: string) => events.push(event) },
      }).buildingComplete,
      { cityBuild } = build([]);

    expect(abandoned.validate(cityBuild, instance(Settlers))).to.true;
    expect(abandoned.validate(cityBuild, instance(Phalanx))).to.false;
    abandoned.process(cityBuild, instance(Settlers));
    expect(events).to.deep.equal(['city:abandoned']);
  });

  it('brings its player’s units on and around an incited city over, but not those in another city', (): void => {
    const original = {},
      capturer = {},
      transferred: string[] = [],
      unit = (name: string, owner: object) => ({
        player: () => owner,
        transfer: () => transferred.push(name),
      }),
      squares: Record<string, unknown[]> = {
        city: [unit('defender', original)],
        field: [unit('outside', original), unit('foreign', capturer)],
        town: [unit('in another city', original)],
      },
      tile = (name: string) => ({
        name,
        getNeighbours: () => [tile('field'), tile('town')],
      }),
      [defecting] = rulesWith({
        cityRegistry: {
          getByTile: (square: { name: string }) =>
            square.name === 'town' ? {} : null,
        },
        unitRegistry: {
          getByTile: (square: { name: string }) => squares[square.name],
        },
      }).captured,
      city = { tile: () => tile('city') };

    expect(defecting.validate(city, capturer, original, new InciteRevolt())).to
      .true;
    expect(defecting.validate(city, capturer, original, {})).to.false;
    defecting.process(city, capturer, original);
    expect(transferred).to.deep.equal(['defender', 'outside']);
  });
});
