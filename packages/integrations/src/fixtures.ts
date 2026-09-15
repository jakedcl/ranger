import groupMembers from "../fixtures/group-members.json" with { type: "json" };
import groups from "../fixtures/groups.json" with { type: "json" };
import skus from "../fixtures/skus.json" with { type: "json" };
import throttle429 from "../fixtures/throttle-429.json" with { type: "json" };
import unauthorized403 from "../fixtures/unauthorized-403.json" with { type: "json" };
import usersPage1 from "../fixtures/users-page1.json" with { type: "json" };
import usersPage2 from "../fixtures/users-page2.json" with { type: "json" };

export type FixtureName =
  | "users-page1"
  | "users-page2"
  | "groups"
  | "skus"
  | "group-members"
  | "throttle-429"
  | "unauthorized-403";

const FIXTURES: Record<FixtureName, unknown> = {
  "users-page1": usersPage1,
  "users-page2": usersPage2,
  groups,
  skus,
  "group-members": groupMembers,
  "throttle-429": throttle429,
  "unauthorized-403": unauthorized403,
};

/** Load a Graph-shaped demo fixture (synthetic Harbor / Northstar data). */
export function loadFixtureJson<T = unknown>(name: FixtureName): T {
  return FIXTURES[name] as T;
}

/** @deprecated Prefer loadFixtureJson — kept for tests that read raw files. */
export function fixturesDirectory(): string {
  return new URL("../fixtures/", import.meta.url).pathname;
}
