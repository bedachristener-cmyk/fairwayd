import assert from "node:assert/strict";
import { resolveMapBasemap } from "../src/maps/basemap.ts";

const osm = resolveMapBasemap(undefined);
assert.equal(osm.provider, "openstreetmap");
assert.equal(osm.url, "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
assert.equal(osm.attribution, "&copy; OpenStreetMap contributors");

const carto = resolveMapBasemap("carto test/key");
assert.equal(carto.provider, "carto");
assert.equal(
  carto.url,
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?api_key=carto%20test%2Fkey",
);
assert.equal(carto.attribution, "&copy; OpenStreetMap contributors &copy; CARTO");

console.log("Basemap configuration tests passed.");
