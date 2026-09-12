# Omarchy Audio

An Omarchy bar widget for audio: volume slider, output/input device
pickers, and a per-application mixer.

This is a fork of Omarchy's built-in `omarchy.audio` widget, not a
from-scratch plugin. See [Relationship to upstream](#relationship-to-upstream).

> **Status: early.** The fork baseline is in place and installable, but no
> behaviour has diverged from upstream yet. Treat the feature list below as
> describing what you get today, which is upstream's feature set.

## Features

- **Volume slider** for the default output, with scroll-to-adjust on the
  bar icon and an OSD on change.
- **Output picker** listing available sinks, with unavailable sinks
  filtered out and device names cleaned up for readability.
- **Input picker** listing sources, with its own level and mute.
- **Per-application mixer** — volume and mute for each playback stream,
  with stream names resolved against MPRIS players so entries read as
  "Spotify" rather than a raw PipeWire node description.
- **Keyboard navigation** throughout the panel.

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

Two cosmetic changes were made at import time, before any behavioural work:
`Panel.qml` and `Model.js` were renamed to `panel.qml` and `model.js` to
match this repo's file-naming convention, and `manifest.json` was updated
with this fork's id, author, and license.

## License

MIT — see [LICENSE](LICENSE). Derivative of MIT-licensed Omarchy code.
