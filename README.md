# Omarchy Audio

An Omarchy bar widget for audio: volume slider, output/input device
pickers, and a per-application mixer.

This is a fork of Omarchy's built-in `omarchy.audio` widget, not a
from-scratch plugin. See [Relationship to upstream](#relationship-to-upstream).

## Features

Everything upstream's audio widget does, plus per-entry customisation.

### Added by this fork

- **Rename any entry.** Give an output, input, or application a name that
  means something to you. The nickname replaces the auto-generated label.
- **Hide entries you never use.** Unwanted devices drop out of the
  pickers. Hidden entries stay visible while edit mode is on, so you can
  always get one back, and the *active* output is never hidden from you.
- **Choose an icon per entry**, from a fixed set of glyphs.

Turn on edit mode with the gear in the panel header; each row grows a
hide toggle and an editor. The panel looks exactly like upstream's until
you do.

Customisations are stored on this widget's entry in
`~/.config/omarchy/shell.json`, keyed by PipeWire node name so they
survive restarts. This plugin writes no files of its own.

### Inherited from upstream

- **Volume slider** for the default output, with scroll-to-adjust on the
  bar icon and an OSD on change.
- **Output picker** listing available sinks, with unavailable sinks
  filtered out and device names cleaned up for readability.
- **Input picker** listing sources, with its own level and mute.
- **Per-application mixer** — volume and mute for each playback stream,
  with stream names resolved against MPRIS players so entries read as
  "Spotify" rather than a raw PipeWire node description. This fork labels
  the section **APPS**; upstream calls it "SOURCES", which sits directly
  under "INPUT" and reads like a second device list rather than the app
  mixer.
- **Keyboard navigation** throughout the panel.

A note on the app mixer: it lists applications that are *currently
producing audio*. An idle Spotify or Discord has no stream in the audio
graph and so does not appear. The panel's scrollbar is also shown
whenever content overflows, rather than only while scrolling — otherwise
a section past the fold looks like an empty heading.

## Requirements

- Omarchy 4.x with `omarchy-shell` (Quickshell)
- PipeWire

## Install

```bash
git clone https://github.com/lunardi0x01/<repo> \
  ~/.config/omarchy/plugins/lunardi0x01.audio
omarchy-shell shell rescanPlugins
omarchy plugin enable lunardi0x01.audio
```

Because the manifest declares `omarchy.clonedFrom = "omarchy.audio"`,
enabling this plugin replaces the built-in audio widget in your bar
rather than sitting alongside it. To go back to the built-in:

```bash
omarchy plugin disable lunardi0x01.audio
```

QML is loaded once at shell startup, so changes to `panel.qml` need
`omarchy restart shell`. Saving files under `~/.config/omarchy/plugins/`
triggers a plugin rescan, but a restart is the reliable way to pick up
QML edits.

## Relationship to upstream

The first commit in this repository is an unmodified copy of
`/usr/share/omarchy/shell/plugins/panels/audio` as shipped in the omarchy
`4.0.3-1` package (shell version string `4.0.0.alpha`). Everything after
it is this fork's own work, so `git diff <first-commit> HEAD` is an exact
record of what has been changed.

Keeping that baseline pristine is deliberate: when upstream's audio widget
changes, the new version can be imported onto the same baseline and merged,
instead of the fork drifting into something that can no longer take
upstream fixes.

Upstream is MIT licensed and its copyright notice is retained in
[LICENSE](LICENSE) alongside this fork's.

Two cosmetic changes were made at import time, before any behavioural
work: `Panel.qml` and `Model.js` were renamed to `panel.qml` and
`model.js` to match this repo's file-naming convention, and
`manifest.json` was updated with this fork's id, author, and license.

## License

MIT — see [LICENSE](LICENSE). Derivative of MIT-licensed Omarchy code.
