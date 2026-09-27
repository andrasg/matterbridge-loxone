# matterbridge-loxone

[![npm version](https://img.shields.io/npm/v/matterbridge-loxone.svg)](https://www.npmjs.com/package/matterbridge-loxone)
[![npm downloads](https://img.shields.io/npm/dt/matterbridge-loxone.svg)](https://www.npmjs.com/package/matterbridge-loxone)
![Node.js CI](https://github.com/andrasg/matterbridge-loxone/actions/workflows/build-matterbridge-plugin.yml/badge.svg)

[![power by](https://img.shields.io/badge/powered%20by-matterbridge-blue)](https://www.npmjs.com/package/matterbridge)
[![power by](https://img.shields.io/badge/powered%20by-matter--history-blue)](https://www.npmjs.com/package/matter-history)
[![power by](https://img.shields.io/badge/powered%20by-node--ansi--logger-blue)](https://www.npmjs.com/package/node-ansi-logger)
[![power by](https://img.shields.io/badge/powered%20by-node--persist--manager-blue)](https://www.npmjs.com/package/node-persist-manager)
[![power by](https://img.shields.io/badge/powered%20by-node--lox--ws--api-blue)](https://www.npmjs.com/package/node-lox-ws-api)

A [matterbridge](https://github.com/Luligu/matterbridge) plugin allowing connecting Loxone devices to Matter. The plugin was mostly tested against Apple Home but should work wirh any Matter-compatible ecosystems.

As the plugin uses Loxone websocket connection, it can be used with all generations of Loxone Miniserver, including Gen.1.

## Supported devices

This plugin supports the following Loxone device types

- Lightcontroller
  - on/off light
  - dimmable light
  - tunable-white (color temperature) light
  - RGBW (full color) light
  - mood
- Switches and pushbuttons
- Any read-only component or sensor with an `InfoOnlyAnalog` (0 or 1 digital value) internal type (memory flags, status values, switch outputs, etc.)
- Radio button values
- Shading
- Smoke alarm
- CO sensor
- AC

Smoke alarms report Matter `Critical` when the Loxone smoke cause bit is set and the level is either Pre Alarm (`1`) or Main Alarm (`2`). Both levels use the same severity, so escalation does not clear the alarm. A cleared level or causes without smoke report `Normal`. This mapping applies at startup, state restoration, and during updates.

## Installation

Requires Matterbridge 3.10.11 or newer.

Install this plugin using the matterbridge web UI by typing `matterbridge-loxone` into the Install plugins section and clicking the Install button.

> Don't forget to restart matterbridge afterwards.

### Light commands

On/off lights, dimmers, tunable-white lights, and RGBW lights forward accepted Matter state changes to Loxone. This includes toggle, timed on/off, off-with-effect, and global-scene recall. Dimmers and colour lights also support level move/step/stop commands, including their OnOff variants. RGBW lights support hue/saturation move and step commands; RGBW and tunable-white lights support colour-temperature move/step/stop commands.

Matter.js manages transitions and timers; the plugin sends the resulting levels and colours to Loxone. Physical fade timing depends on Miniserver responsiveness. Outgoing updates are serialized, with intermediate pending values coalesced when Loxone is slower than the transition. Loxone feedback is not echoed back as a command.

Dimmers use Loxone's native `on` command for on, toggle-on, and timed-on requests, restoring the Miniserver's last brightness even after the plugin restarts while a light is off. Explicit level commands still send numeric positions. All positive position feedback, including `1`, updates Matter brightness; position `0` turns the light off while retaining the previous brightness.

RGBW and tunable-white lights use `sequenceColorIdx`, when available, to detect active Loxone sequences. Brightness-only updates during an active sequence use `setBrightness`; colour changes use `hsv` or `temp`. Without a reported active sequence, brightness and off commands use the current fixed colour with the requested brightness (zero for off). Pending colour values are retained when brightness updates are coalesced. Sequence preservation across off/on, including daylight sequences, still requires live-device verification.

RGBW endpoints expose hue/saturation and colour temperature, not XY or enhanced hue. Moods, outlets, switches, and buttons retain their existing command handling.

## Configuration

The plugin needs to be configured before use with the following values:

- host - the IP address of the Loxone Miniserver
- port - the port of the web interface on Loxone
- username - the username to use for connecting
- passowrd - the passowrd to use for connecting
- uuidsandtypes - list of UUID's and types to map to matter devices
- logevents - when enabled, log will contain all received Loxone events, not just the ones that have been configured (careful, lot of log!)
- dumpcontrols - dumps all discovered Loxone controls and their UUIDs
- dumpstates - dumps all discovered Loxone states and their UUIDs
- debug - enables debug mode on the plugin

> NOTE: Breaking changes in `v2.0.0`: configuration moved to a key-value approach from the simple comma-separated approach.

### UUID and type mapping

The UUID and type mapping needs to be supplied in the format of:

`<UUID>,<type>,<comma_separated_optionalsettings_key_value_pairs>`

The plugin supports the following types

| type string   | mapped Matter device type | mapped Loxone device                              | additional aparameters                       | notes                                                                                                                                                                                                                                                                 |
| ------------- | ------------------------- | ------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| contactsensor | contact sensor            | any `InfoOnlyDigital` device (0/1 values)         | none                                         |
| humidity      | humidity sensor           | any `InfoOnlyAnalog` device (numeric values)      | none                                         |
| temperature   | temperature sensor        | any `InfoOnlyAnalog` device (numeric values)      | none                                         |
| pressure      | pressure sensor           | any `InfoOnlyAnalog` device (`value` in hPa/mbar) | none                                         |
| lightsensor   | illuminance sensor        | any `InfoOnlyAnalog` device (lux values)          | none                                         | Uses Matterbridge's lux encoding. Readings below 1 lux or non-finite values report 0; encoded values are capped at 65534.                                                                                                                                             |
| waterleak     | water leak sensor         | any `InfoOnlyDigital` device (0/1 values)         | none                                         |
| motion        | occupancy sensor          | any `InfoOnlyDigital` device (0/1 values)         | none                                         |
| switch        | onOffSwitch               | any `Pushbutton` or `Switch` device (0/1 values)  | none                                         |
| button        | onOffSwitch               | any `Pushbutton` or `Switch` device (0/1 values)  | none                                         | switches automatically back to off after 1 second                                                                                                                                                                                                                     |
| pushbutton    | genericSwitch             | any `Pushbutton` or `Switch` device (0/1 values)  | none                                         | input device only, no Home app UI                                                                                                                                                                                                                                     |
| outlet        | switch (outlet)           | any `Pushbutton` or `Switch` device (0/1 values)  | none                                         |
| light         | switch (light)            | any `Pushbutton` or `Switch` device (0/1 values)  | none                                         |
| switch        | switch                    | any `Pushbutton` or `Switch` device (0/1 values)  | none                                         |
| dimmer        | dimmable light            | `LightControllerV2` circuit                       | none                                         | UUID needs to be in the format `<UUID>/AIxx`                                                                                                                                                                                                                          |
| lightoutput   | auto-detected (see below) | any `LightControllerV2` output (subcontrol)       | none                                         | UUID needs to be in the format `<UUID>/AIxx`. The Matter device type is auto-detected from the output: `ColorPickerV2`/`TunableWhite` → color temperature light, `ColorPickerV2`/`Rgb` or `Lumitech` → RGBW light, `Dimmer` → dimmable light, `Switch` → on/off light |
| mood          | switch (light)            | `LightControllerV2` mood                          | `moodId` ID of the mood                      |                                                                                                                                                                                                                                                                       |
| radio         | switch                    | `Radio`                                           | `outputId` output number of the radio button |                                                                                                                                                                                                                                                                       |
| smoke         | smoke alarm               | `SmokeAlarm`                                      | none                                         |                                                                                                                                                                                                                                                                       |
| co            | CO alarm                  | `InfoOnlyDigital` device (0/1 values)             | none                                         |                                                                                                                                                                                                                                                                       |
| ac            | airconditioner            | `AcControl` device                                | none                                         |                                                                                                                                                                                                                                                                       |
| shade         | window covering           | Window shade or roof shade device                 | none                                         |                                                                                                                                                                                                                                                                       |

Pressure readings must be supplied in hPa (equivalent to mbar). Matter uses whole 0.1 kPa units, so `1013.25 hPa` is rounded to `1013`. Finite readings are clamped to the signed 16-bit range (-32768 to 32767); missing or non-finite readings report `0`. The same conversion applies at startup, restoration, and on updates. Units are not inferred from the Loxone display format: convert sources in Pa, kPa, or bar to hPa in Loxone before mapping them.

Shades are exposed as lift-only window coverings. Lift and global movement status are derived from both Loxone direction flags: up only reports Opening, down only reports Closing, and both inactive or both active report Stopped. The same mapping applies during restoration and updates, independent of the order in which reversal events arrive. Tilt remains stopped during movement and state restoration. Slat-angle control is not exposed.

AC setpoint, system-mode, and fan attribute subscriptions forward only changes originating from a Matter fabric. Loxone feedback and initial-state restoration update Matter attributes without sending commands back to Loxone. Outbound temperature setpoints still round to whole degrees.

AC fan capabilities come from enabled entries in `details.fanspeed`: ID 0 is Off, ID 1 is Auto, and higher IDs are treated as ordered manual speed steps (including Quiet). Positive percentages select from those steps in ascending ID order; feedback reports the selected step as a percentage, not measured RPM. Low/Medium/High represent percentage ranges, so a mode can cover more than one physical speed. Controls with one or two manual speeds expose only High or Low/High, respectively; Auto is exposed only when enabled. Missing metadata or fewer than one or more than 100 manual speeds prevents AC registration with an error.

Fan Off sends `setFan/0` when supported, leaving AC power unchanged; otherwise it sends the whole-AC `off` command. Auto and positive speed requests send `on` followed by the selected `setFan/<id>`, in a serialized queue. Auto feedback uses a null percentage setting and leaves the current percentage unchanged because Loxone does not provide an actual automatic fan-speed percentage. Power-off feedback reports fan Off and zero percent. Unknown fan IDs and unsupported requests are logged rather than mapped to Auto.

Radio outputs use their configured IDs (1-16, including sparse IDs). Turning an output off sends `reset` only if that output is the known selection; turning off an inactive output sends nothing. Commands for the same Radio are serialized and retain the last sent selection until newer feedback is available, so selecting Night and then turning Day off does not reset Night merely because feedback is delayed. A simultaneous selection change from another controller can still race with Loxone's global `reset` command.

`outputId=allOff` (also accepted as `0`) is available only when the Radio has a non-empty `details.allOff` name. Turning it on sends `reset`. Turning it off while active is rejected: select a named output instead. Turning it off while already inactive sends nothing.

Optional settings are in the format of `key=value` and are separated by a comma.

Additionally, all devices support specifying remaining battery %, by adding a `battery` setting to the optional settings:
`battery=<batterystatusUUID>`.

> Don't forget to restart matterbridge after making a configuration change

#### Examples:

- `161f7bd3-0200-79f6-ffff796b564594c0,radio,outputId=2` - results in a switch that corresponds to the second output of the radio button
- `121b4263-0076-a710-ffff796b564594c0,mood,moodId=5` - results in a light that corresponds to mood with ID 5 on a light controller
- `12233b6d-039a-ea64-ffff796b564594c0/AI9,lightoutput` - results in a color/white light auto-detected from the `AI9` output of a light controller
- `120f23ad-02cd-14f3-ffff796b564594c0,motion,battery=1df94ed2-00f0-7c32-ffff796b564594c0` - results in an occupancy sensor with batter % remaining displayed
