import * as fs from 'fs';
import * as path from 'path';
import buildRules, { buildRulesFor } from '../lib/buildRules';
import Build from '@civ-clone/core-city-build/Rules/Build';
import FoundsCities from '@civ-clone/base-unit-trait-founds-cities/FoundsCities';
import Naval from '@civ-clone/base-unit-type-naval/Naval';
import { Requirement } from '@civ-clone/core-requirement/Requirement';
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
  it("gives civ1-unit's Rules/City/build rules, in order, from its entries", (): void => {
    const civ1 = fixture('civ1-unit-build.json'),
      entries = civ1.slice(1).map(
        ([id]) =>
          new Requirement({
            id: id as string,
            subject: Warrior,
            relation: (id as string).includes('/obsolete/')
              ? 'obsoletedBy'
              : 'requires',
            targets: [Advance],
          })
      );

    expect(fingerprint(buildRules('civ1-unit', entries))).to.deep.equal(civ1);
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
