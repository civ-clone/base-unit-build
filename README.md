# base-unit-build

- `lib/buildRules`: which units a city may build. `buildRulesFor(entry)` makes the rule a core-requirement entry is
  played by (`requires` an advance, or `obsoletedBy` one), `deriveBuildRules` hands that to a game's `requirements`, and
  `navalNeedsCoastRule(prefix)` keeps ships to coastal cities.
- `lib/cityUnitRules`: `cityUnitRules(prefix, deps, options)`, a ruleset's city rules about units: a new city's first
  defender, repeating a military unit, Settlers costing their city a citizen, and units defecting with a city.
- `lib/homeCity`: `homeCity(distance)`, the home of a unit made or changing sides on a square: the nearest city, if its
  player's own.

A library: no `main`, so it registers nothing on its own.
