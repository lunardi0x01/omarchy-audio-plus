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
