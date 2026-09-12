const test = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const Model = require(path.join(__dirname, "..", "model.js"))

// Baseline characterisation tests for the inherited upstream model.js.
// These exist to pin current behaviour before this fork starts changing it,
// so a regression shows up as a failing test rather than a surprise in the
// panel. They are not a claim that the behaviour below is ideal.

test("parseSinkAvailability maps names to availability booleans", () => {
  const got = Model.parseSinkAvailability("alsa_out.a\t1\nalsa_out.b\t0\n")
  assert.deepEqual(got, { "alsa_out.a": true, "alsa_out.b": false })
})

test("parseSinkAvailability tolerates junk without throwing", () => {
  // Helper stdout is derived from pactl output and carries node names any
  // application can influence, so the parser has to stay total.
  for (const input of [null, undefined, "", "no-tab-here", "\n\n\t\n", "a\t1\textra"]) {
    assert.doesNotThrow(() => Model.parseSinkAvailability(input))
  }
})

test("parseSinkAvailability ignores lines with no availability field", () => {
  // A malformed line must not resurrect a sink that was filtered out.
  assert.deepEqual(Model.parseSinkAvailability("lonely\n"), {})
})

test("outputVolumeName reports mute and silence ahead of any level", () => {
  assert.equal(Model.outputVolumeName(0.8, true), "Muted")
  assert.equal(Model.outputVolumeName(0, false), "Silenced")
})

test("outputVolumeName buckets ascend across the range", () => {
  assert.equal(Model.outputVolumeName(0.05, false), "Whisper")
  assert.equal(Model.outputVolumeName(0.2, false), "Murmur")
  assert.equal(Model.outputVolumeName(0.4, false), "Easy listening")
  assert.equal(Model.outputVolumeName(0.6, false), "Steady groove")
  assert.equal(Model.outputVolumeName(0.75, false), "Cranked up")
  assert.equal(Model.outputVolumeName(0.9, false), "Party mode")
  assert.equal(Model.outputVolumeName(1.0, false), "Concert hall")
})

test("friendlyDeviceLabel strips the noisy prefixes and suffixes", () => {
  assert.equal(Model.friendlyDeviceLabel("sof-soundwire Built-in Audio Speaker Output"), "Speaker")
  assert.equal(Model.friendlyDeviceLabel("Built-in Audio Microphones"), "Microphone")
  assert.equal(Model.friendlyDeviceLabel("  Headset Input  "), "Headset")
})

test("friendlyDeviceLabel is cosmetic, not sanitisation", () => {
  // Pinned deliberately: device labels are attacker-influenced text and this
  // function does NOT neutralise them. Anything rendering a label still needs
  // textFormat: Text.PlainText. See .claude/rules/omarchy-plugin-security.md.
  const hostile = "<b>evil</b>"
  assert.equal(Model.friendlyDeviceLabel(hostile), hostile)
})

test("isPlaybackStream requires the node to be a stream", () => {
  assert.equal(Model.isPlaybackStream(null), false)
  assert.equal(Model.isPlaybackStream({ isStream: false, isSink: true }), false)
  assert.equal(Model.isPlaybackStream({ isStream: true, isSink: true }), true)
})

test("isPlaybackStream falls back to the media class string", () => {
  assert.equal(Model.isPlaybackStream({ isStream: true, type: "Stream/Output/Audio" }), true)
  assert.equal(Model.isPlaybackStream({ isStream: true, type: "Stream/Input/Audio" }), false)
})

test("isAudioSource accepts an audio node or a source-shaped media class", () => {
  assert.equal(Model.isAudioSource({ audio: {} }), true)
  assert.equal(Model.isAudioSource({ type: "Audio/Source" }), true)
  assert.equal(Model.isAudioSource({ type: "Audio/Sink" }), false)
  assert.equal(Model.isAudioSource(null), false)
})

// ---- User overrides -------------------------------------------------
// These back the rename / hide / custom-icon features. The settings
// object they read is a user-editable file whose keys are PipeWire node
// names, so "survives hostile input" is a requirement, not politeness.

const settingsWith = (overrides) => ({ deviceOverrides: overrides })

test("overrideFor returns a fully populated record for an unknown node", () => {
  // Callers rely on never having to null-check individual fields.
  const rec = Model.overrideFor({}, { name: "nope" })
  assert.deepEqual(rec, { nickname: "", hidden: false, icon: "" })
})

test("overrideFor survives a malformed settings object", () => {
  for (const settings of [null, undefined, "string", 42, [], { deviceOverrides: "nope" },
                          { deviceOverrides: [1, 2] }]) {
    assert.doesNotThrow(() => Model.overrideFor(settings, { name: "a" }))
    assert.equal(Model.overrideFor(settings, { name: "a" }).nickname, "")
  }
})

test("normalizeOverride rejects wrong-typed fields rather than trusting them", () => {
  const rec = Model.normalizeOverride({ nickname: 42, hidden: "yes", icon: 7 })
  assert.deepEqual(rec, { nickname: "", hidden: false, icon: "" })
})

test("hidden is true only for a literal true, not any truthy value", () => {
  assert.equal(Model.normalizeOverride({ hidden: true }).hidden, true)
  assert.equal(Model.normalizeOverride({ hidden: 1 }).hidden, false)
  assert.equal(Model.normalizeOverride({ hidden: "true" }).hidden, false)
})

test("nickname is trimmed and length-capped", () => {
  assert.equal(Model.normalizeOverride({ nickname: "  Desk  " }).nickname, "Desk")
  const long = "x".repeat(Model.MAX_NICKNAME_LENGTH + 50)
  assert.equal(Model.normalizeOverride({ nickname: long }).nickname.length,
    Model.MAX_NICKNAME_LENGTH)
})

test("icon must be an allowlisted key; anything else is dropped", () => {
  // The whole point of the allowlist: a settings value must never be able
  // to become a path or URL that something later feeds to Image.source.
  assert.equal(Model.normalizeOverride({ icon: "speaker" }).icon, "speaker")
  for (const hostile of ["../../etc/passwd", "/etc/shadow", "file:///etc/passwd",
                         "http://example.com/x.png", "", "nonexistent"]) {
    assert.equal(Model.normalizeOverride({ icon: hostile }).icon, "")
  }
})

test("every allowlisted icon key resolves to a glyph, and nothing else does", () => {
  for (const key of Model.iconChoiceKeys()) {
    assert.notEqual(Model.glyphForIconKey(key), "")
  }
  assert.equal(Model.glyphForIconKey("not-a-key"), "")
  assert.equal(Model.glyphForIconKey(null), "")
})

test("overrideKey uses node name, which survives a session; never the id", () => {
  assert.equal(Model.overrideKey({ name: "alsa.a", id: 77 }), "alsa.a")
  assert.equal(Model.overrideKey({ id: 77 }), "")
  assert.equal(Model.overrideKey(null), "")
})

test("isHiddenByUser reads only the explicit user flag", () => {
  assert.equal(Model.isHiddenByUser(settingsWith({ "a": { hidden: true } }), { name: "a" }), true)
  assert.equal(Model.isHiddenByUser(settingsWith({ "a": { hidden: true } }), { name: "b" }), false)
})

test("withOverride merges into an existing record without clobbering siblings", () => {
  const settings = settingsWith({
    "a": { nickname: "Desk", icon: "speaker" },
    "b": { hidden: true }
  })
  const next = Model.withOverride(settings, { name: "a" }, { hidden: true })
  assert.deepEqual(next.a, { nickname: "Desk", hidden: true, icon: "speaker" })
  // The untouched entry must come through unharmed.
  assert.equal(next.b.hidden, true)
})

test("withOverride prunes an entry once it carries no customisation", () => {
  // Otherwise shell.json accumulates a dead key for every device ever seen.
  const settings = settingsWith({ "a": { nickname: "Desk" }, "b": { hidden: true } })
  const next = Model.withOverride(settings, { name: "a" }, { nickname: "" })
  assert.equal(Object.prototype.hasOwnProperty.call(next, "a"), false)
  assert.equal(next.b.hidden, true)
})

test("withOverride does not mutate the settings it was given", () => {
  const overrides = { "a": { nickname: "Desk" } }
  Model.withOverride(settingsWith(overrides), { name: "a" }, { nickname: "Changed" })
  assert.equal(overrides.a.nickname, "Desk")
})

test("withOverride ignores a node with no usable key", () => {
  const settings = settingsWith({ "a": { hidden: true } })
  const next = Model.withOverride(settings, { id: 5 }, { hidden: true })
  assert.deepEqual(next, { "a": { hidden: true } })
})

test("a hostile nickname is stored verbatim, not sanitised", () => {
  // Pinned deliberately. Bounding and trimming is NOT escaping -- every
  // consumer must still render it with textFormat: Text.PlainText.
  const hostile = "<b>pwn</b>"
  assert.equal(Model.normalizeOverride({ nickname: hostile }).nickname, hostile)
})
