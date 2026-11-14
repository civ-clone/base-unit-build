# base-unit-build

- `lib/buildRules`: which units a city may build. `buildRulesFor(entry)` makes the rule a core-requirement entry is
  played by (`requires` an advance, or `obsoletedBy` one), `deriveBuildRules` hands that to a game's `requirements`, and
  `navalNeedsCoastRule(prefix)` keeps ships to coastal cities.
- `lib/cityUnitRules`: `cityUnitRules(prefix, deps, options)`, a ruleset's city rules about units: a new city's first
  defender, repeating a military unit, Settlers costing their city a citizen, and units defecting with a city.
  Settlers finished in a size-1 city that isn't its player's last abandon it, and in its player's only city they cost
  nothing. Civ2 does the same (OpenCiv2 `city_production.cpp`, richardpenman/civ2@49f26ec): its human player is asked
  first, which is a client's prompt, not a rule.
- `lib/homeCity`: `homeCity(distance)`, the home of a unit made or changing sides on a square: the nearest city, if its
  player's own.

A library: no `main`, so it registers nothing on its own.
