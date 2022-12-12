import { assertArrayIncludes, assertEquals } from "https://deno.land/std@0.166.0/testing/asserts.ts"
import { CommonEvents, packEvents, unpackEvents } from "./netlify/edge-functions/ts/github-events.ts"

Deno.test("packEvents and unpackEvents are inverse", _t => {
	const res = unpackEvents(packEvents(CommonEvents))
	assertEquals(CommonEvents.length, res.length, "The lengths differ")

	assertArrayIncludes(CommonEvents, res, "Result contains incorrect values")
	assertArrayIncludes(res, CommonEvents, "Some events were missing from the result")
})
