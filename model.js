function isPlaybackStream(node) {
  if (!node || !node.isStream) return false
  if (node.isSink === true) return true

  var mediaClass = String(node.type || "")
  return mediaClass.indexOf("Stream/Output/Audio") !== -1
    || mediaClass.indexOf("AudioOutStream") !== -1
    || mediaClass.indexOf("Output") !== -1
}

function isAudioSource(node) {
  if (!node) return false
  if (node.audio) return true

  var mediaClass = String(node.type || "")
  return mediaClass.indexOf("Audio/Source") !== -1
    || mediaClass.indexOf("AudioSource") !== -1
    || mediaClass.indexOf("Source") !== -1
}

function listSnapshot(list) {
  return list && list.slice ? list.slice() : []
}

function outputVolumeName(volume, muted) {
  if (muted) return "Muted"
  var p = Math.round(volume * 100)
  if (p === 0) return "Silenced"
  if (p >= 100) return "Concert hall"
  if (p >= 85) return "Party mode"
  if (p >= 70) return "Cranked up"
  if (p >= 50) return "Steady groove"
  if (p >= 30) return "Easy listening"
  if (p >= 15) return "Murmur"
  return "Whisper"
}

function parseSinkAvailability(raw) {
  var next = {}
  var lines = String(raw || "").split("\n")
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim()
    if (!line) continue
    var parts = line.split("\t")
    if (parts.length >= 2) next[parts[0]] = parts[1] !== "0"
  }
  return next
}

function friendlyDeviceLabel(text) {
  var label = String(text || "").trim()
  label = label.replace(/^sof-soundwire\s+/i, "")
  label = label.replace(/^built-?in audio\s+/i, "")
  label = label.replace(/\s+Output$/i, "")
  label = label.replace(/\s+Input$/i, "")
  label = label.replace(/\bMicrophones\b/g, "Microphone")
  return label
}

function nodeProps(node) {
  return node && node.ready && node.properties ? node.properties : {}
}

function nodeLabel(node) {
  if (!node) return "Unknown"
  var p = nodeProps(node)
  var nickname = friendlyDeviceLabel(node.nickname || node.nick || p["node.nick"] || p["device.profile.description"] || "")
  if (nickname) return nickname
  return friendlyDeviceLabel(node.description || p["node.description"] || node.name || "Unknown")
}

function isHeadphones(node) {
  if (!node) return false
  var p = nodeProps(node)
  var blob = String([
    node.name, node.description, node.nickname,
    p["device.icon-name"] || "",
    p["device.product.name"] || "",
    p["node.description"] || "",
    p["node.nick"] || ""
  ].join(" ")).toLowerCase()
  return blob.indexOf("headphone") !== -1
    || blob.indexOf("headset") !== -1
    || blob.indexOf("earbud") !== -1
    || blob.indexOf("earphone") !== -1
    || blob.indexOf("airpod") !== -1
}

function sinkGlyph(node) {
  if (!node) return "󰓃"
  if (isHeadphones(node)) return "󰋋"
  var p = nodeProps(node)
  var blob = String([
    node.name, node.description, node.nickname,
    p["device.icon-name"] || "",
    p["device.product.name"] || ""
  ].join(" ")).toLowerCase()
  if (blob.indexOf("bluetooth") !== -1) return "󰂯"
  if (blob.indexOf("hdmi") !== -1 || blob.indexOf("display") !== -1) return "󰍹"
  return "󰓃"
}

function sourceGlyph(node) {
  if (!node) return "󰍬"
  var p = nodeProps(node)
  var blob = String([
    node.name, node.description, node.nickname,
    p["device.icon-name"] || ""
  ].join(" ")).toLowerCase()
  if (blob.indexOf("headset") !== -1) return "󰋋"
  if (blob.indexOf("bluetooth") !== -1) return "󰂯"
  if (blob.indexOf("webcam") !== -1 || blob.indexOf("camera") !== -1) return "󰄀"
  return "󰍬"
}

function friendlyStreamLabel(label) {
  label = String(label || "").trim()
  if (!label) return ""

  var known = {
    "spotify": "Spotify"
  }
  var normalized = label.toLowerCase()
  return known[normalized] || label
}

function streamLabelKey(label) {
  return String(label || "").trim().toLowerCase()
}

function streamLabelIsGeneric(label) {
  return streamLabelKey(label) === "audio-src"
}

function rawStreamLabel(node) {
  if (!node) return ""
  var p = nodeProps(node)
  return p["application.name"]
    || node.description
    || p["media.name"]
    || p["node.name"]
    || node.name
}

function mprisPlayerLabel(player) {
  if (!player) return ""
  return friendlyStreamLabel(player.identity || player.desktopEntry || "")
}

function mprisPlayerIsProxy(player) {
  var dbusName = String(player && player.dbusName || "").toLowerCase()
  var desktopEntry = String(player && player.desktopEntry || "").toLowerCase()
  return dbusName.indexOf("playerctld") !== -1 || desktopEntry === "playerctld"
}

function streamRepresentsMprisPlayer(streamLabel, playerLabel) {
  var streamKey = streamLabelKey(friendlyStreamLabel(streamLabel))
  var playerKey = streamLabelKey(playerLabel)
  if (!streamKey || !playerKey) return false
  return streamKey === playerKey
    || streamKey.indexOf(playerKey) !== -1
    || playerKey.indexOf(streamKey) !== -1
}

function mprisLabelsFor(players, predicate) {
  var values = Array.isArray(players) ? players : []
  var playingCandidates = []
  var candidates = []
  var playingProxyCandidates = []
  var proxyCandidates = []

  for (var i = 0; i < values.length; i++) {
    var player = values[i]
    if (!player) continue
    if (!player.isPlaying && !player.canPlay) continue

    var playerLabel = mprisPlayerLabel(player)
    if (!playerLabel || !predicate(playerLabel)) continue

    if (mprisPlayerIsProxy(player)) {
      if (player.isPlaying) playingProxyCandidates.push(playerLabel)
      proxyCandidates.push(playerLabel)
    } else {
      if (player.isPlaying) playingCandidates.push(playerLabel)
      candidates.push(playerLabel)
    }
  }

  if (playingCandidates.length === 1) return playingCandidates[0]
  if (playingCandidates.length === 0 && playingProxyCandidates.length === 1) return playingProxyCandidates[0]
  if (candidates.length === 1) return candidates[0]
  if (candidates.length === 0 && proxyCandidates.length === 1) return proxyCandidates[0]
  return ""
}

function matchingMprisStreamLabel(label, players) {
  if (streamLabelIsGeneric(label)) return ""
  return mprisLabelsFor(players, function(playerLabel) {
    return streamRepresentsMprisPlayer(label, playerLabel)
  })
}

function unmatchedMprisStreamLabel(label, players, streams) {
  if (!streamLabelIsGeneric(label)) return ""

  return mprisLabelsFor(players, function(playerLabel) {
    var values = Array.isArray(streams) ? streams : []
    for (var i = 0; i < values.length; i++) {
      var stream = values[i]
      var streamLabel = rawStreamLabel(stream)
      if (!streamLabelIsGeneric(streamLabel) && streamRepresentsMprisPlayer(streamLabel, playerLabel))
        return false
    }
    return true
  })
}

function streamLabel(node, players, streams) {
  if (!node) return "Stream"
  var label = rawStreamLabel(node)
  return friendlyStreamLabel(matchingMprisStreamLabel(label, players)
    || unmatchedMprisStreamLabel(label, players, streams)
    || label) || "Stream"
}

function streamRepresentsPlayer(node, player, players, streams) {
  if (!node || !player) return false
  var playerLabel = mprisPlayerLabel(player)
  if (!playerLabel) return false

  var label = rawStreamLabel(node)
  if (!streamLabelIsGeneric(label)) return streamRepresentsMprisPlayer(label, playerLabel)
  return streamRepresentsMprisPlayer(streamLabel(node, players, streams), playerLabel)
}


// ---- User overrides -------------------------------------------------
//
// Per-device customisation (nickname, hidden, icon) lives on this
// widget's entry in shell.json, written through the shell's own
// updateEntryInline API. There is no settings file of our own, so
// nothing here does I/O -- these are pure functions over the settings
// object the shell injects, which keeps them testable outside a shell.
//
// The settings object is user-writable (shell.json is a plain file the
// user edits) and the keys are PipeWire node names, which any
// application can influence. So every read below is defensive: no
// throwing on malformed input, and values are shape-checked before use.

var OVERRIDES_KEY = "deviceOverrides"

// A nickname is rendered in the panel, so it is bounded to keep a
// pathological settings file from producing an unusable widget.
var MAX_NICKNAME_LENGTH = 64

// Icons resolve against this allowlist and nothing else. Never let a
// settings value reach Image.source or a filesystem path -- that would
// turn a nickname file into an arbitrary-file-read primitive inside the
// shell process.
var ICON_CHOICES = [
  { key: "speaker", glyph: "\uf028" },
  { key: "headphones", glyph: "\uf025" },
  { key: "headset", glyph: "\uf590" },
  { key: "monitor", glyph: "\uf108" },
  { key: "hdmi", glyph: "\uf26c" },
  { key: "usb", glyph: "\uf287" },
  { key: "bluetooth", glyph: "\uf293" },
  { key: "microphone", glyph: "\uf130" },
  { key: "game", glyph: "\uf11b" },
  { key: "music", glyph: "\uf001" },
  { key: "video", glyph: "\uf03d" },
  { key: "chat", glyph: "\uf075" },
  { key: "browser", glyph: "\uf268" },
  { key: "app", glyph: "\uf013" }
]

function iconChoiceKeys() {
  var keys = []
  for (var i = 0; i < ICON_CHOICES.length; i++) keys.push(ICON_CHOICES[i].key)
  return keys
}

function glyphForIconKey(key) {
  var wanted = String(key || "")
  for (var i = 0; i < ICON_CHOICES.length; i++)
    if (ICON_CHOICES[i].key === wanted) return ICON_CHOICES[i].glyph
  return ""
}

// Stable identity for an override. Node id is per-session, so it cannot
// key anything that must survive a restart; node name is what persists.
function overrideKey(node) {
  if (!node) return ""
  return String(node.name || "")
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !(value instanceof Array)
}

function readOverrides(settings) {
  if (!isPlainObject(settings)) return {}
  var raw = settings[OVERRIDES_KEY]
  return isPlainObject(raw) ? raw : {}
}

// Normalises one stored entry, dropping anything malformed rather than
// trusting it. Returns a fully-populated record so callers never have to
// null-check individual fields.
function normalizeOverride(raw) {
  var out = { nickname: "", hidden: false, icon: "" }
  if (!isPlainObject(raw)) return out

  if (typeof raw.nickname === "string") {
    var nickname = raw.nickname.trim()
    if (nickname.length > MAX_NICKNAME_LENGTH)
      nickname = nickname.slice(0, MAX_NICKNAME_LENGTH)
    out.nickname = nickname
  }

  out.hidden = raw.hidden === true

  if (typeof raw.icon === "string" && glyphForIconKey(raw.icon) !== "")
    out.icon = raw.icon

  return out
}

function overrideFor(settings, node) {
  var key = overrideKey(node)
  if (key === "") return normalizeOverride(null)
  return normalizeOverride(readOverrides(settings)[key])
}

// True only for an explicit user hide. Deliberately separate from
// upstream's sinkAvailable()/omarchy-audio-sink-availability filtering:
// folding the two together would mean a speaker-tuning change could
// silently unhide something the user hid, or vice versa.
function isHiddenByUser(settings, node) {
  return overrideFor(settings, node).hidden
}

function hasOverride(record) {
  var o = normalizeOverride(record)
  return o.nickname !== "" || o.hidden || o.icon !== ""
}

// Builds the next overrides map. Entries that carry no customisation are
// pruned rather than stored as empty objects, so shell.json does not
// accumulate dead keys for every device ever seen.
function withOverride(settings, node, patch) {
  var key = overrideKey(node)
  var current = readOverrides(settings)
  var next = {}
  for (var existing in current)
    if (current.hasOwnProperty(existing)) next[existing] = current[existing]
  if (key === "") return next

  var merged = normalizeOverride(current[key])
  if (isPlainObject(patch)) {
    if (patch.nickname !== undefined) merged.nickname = String(patch.nickname || "").trim()
    if (patch.hidden !== undefined) merged.hidden = patch.hidden === true
    if (patch.icon !== undefined) merged.icon = String(patch.icon || "")
  }
  merged = normalizeOverride(merged)

  if (hasOverride(merged)) next[key] = merged
  else delete next[key]
  return next
}

if (typeof module !== "undefined") {
  module.exports = {
    isPlaybackStream: isPlaybackStream,
    isAudioSource: isAudioSource,
    listSnapshot: listSnapshot,
    outputVolumeName: outputVolumeName,
    parseSinkAvailability: parseSinkAvailability,
    friendlyDeviceLabel: friendlyDeviceLabel,
    nodeProps: nodeProps,
    nodeLabel: nodeLabel,
    isHeadphones: isHeadphones,
    sinkGlyph: sinkGlyph,
    sourceGlyph: sourceGlyph,
    friendlyStreamLabel: friendlyStreamLabel,
    streamLabelKey: streamLabelKey,
    streamLabelIsGeneric: streamLabelIsGeneric,
    rawStreamLabel: rawStreamLabel,
    mprisPlayerLabel: mprisPlayerLabel,
    mprisPlayerIsProxy: mprisPlayerIsProxy,
    streamRepresentsMprisPlayer: streamRepresentsMprisPlayer,
    mprisLabelsFor: mprisLabelsFor,
    matchingMprisStreamLabel: matchingMprisStreamLabel,
    unmatchedMprisStreamLabel: unmatchedMprisStreamLabel,
    streamLabel: streamLabel,
    streamRepresentsPlayer: streamRepresentsPlayer,
    OVERRIDES_KEY: OVERRIDES_KEY,
    MAX_NICKNAME_LENGTH: MAX_NICKNAME_LENGTH,
    ICON_CHOICES: ICON_CHOICES,
    iconChoiceKeys: iconChoiceKeys,
    glyphForIconKey: glyphForIconKey,
    overrideKey: overrideKey,
    readOverrides: readOverrides,
    normalizeOverride: normalizeOverride,
    overrideFor: overrideFor,
    isHiddenByUser: isHiddenByUser,
    hasOverride: hasOverride,
    withOverride: withOverride
  }
}
