# matterbridge-loxone

[![npm version](https://img.shields.io/npm/v/matterbridge-loxone.svg)](https://www.npmjs.com/package/matterbridge-loxone)
[![npm downloads](https://img.shields.io/npm/dt/matterbridge-loxone.svg)](https://www.npmjs.com/package/matterbridge-loxone)
![Node.js CI](https://github.com/andrasg/matterbridge-loxone/actions/workflows/build-matterbridge-plugin.yml/badge.svg)

[![power by](https://img.shields.io/badge/powered%20by-matterbridge-blue)](https://www.npmjs.com/package/matterbridge)
[![power by](https://img.shields.io/badge/powered%20by-matter--history-blue)](https://www.npmjs.com/package/matter-history)
[![power by](https://img.shields.io/badge/powered%20by-node--ansi--logger-blue)](https://www.npmjs.com/package/node-ansi-logger)
[![power by](https://img.shields.io/badge/powered%20by-node--persist--manager-blue)](https://www.npmjs.com/package/node-persist-manager)
[![power by](https://img.shields.io/badge/powered%20by-node--lox--ws--api-blue)](https://www.npmjs.com/package/node-lox-ws-api)


A [matterbridge](https://github.com/Luligu/matterbridge) plugin allowing connecting Loxone devices to Matter.

As the plugin uses Loxone websocket connection, it can be used with all generations of Loxone Miniserver, including Gen.1.

## Supported devices

This plugin supports the following Loxone device types
- Lightcontroller
  - on/off light
  - dimmable light
  - mood
- Switches and pushbuttons
- Any read-only component or sensor with an `InfoOnlyAnalog` (0 or 1 digital value) internal type (memory flags, status values, switch outputs, etc.)
- Radio button values
- Shading
- Smoke alarm

## Installation

Install this plugin using the matterbridge web UI by typing `matter-bridgeloxone` into the Install plugins section and clicking the Install button.

> Don't forget to restart matterbridge afterwards.

## Configuration

The plugin needs to be configured before use with the following values:
- host - the IP address of the Loxone Miniserver
- port - the port of the web interface on Loxone
- username - the username to use for connecting
- passowrd - the passowrd to use for connecting
- uuidsandtypes - list of UUID's and types to map to matter devices
- logevents - when enabled, log will contain all received Loxone events, not just the ones that have been configured (careful, lot of log!)
- debug - enables debug mode on the plugin

### UUID and type mapping

The UUID and type mapping needs to be supplied in the format of:

`<UUID>,<type>,<optionalsettings>`

The plugin supports the following types
|type string|mapped Matter device type|mapped Loxone device|additional aparameters|notes|
|--|--|--|--|--|
|contactsensor|contact sensor|any `InfoOnlyAnalog` device (0/1 values)|none|
|humidity|humidity sensor|any `InfoOnlyAnalog` device (0/1 values)|none|
|temperature|temperature sensor|any `InfoOnlyAnalog` device (0/1 values)|none|
|pressure|pressure sensor|any `InfoOnlyAnalog` device (0/1 values)|none|
|waterleak|water leak sensor|any `InfoOnlyAnalog` device (0/1 values)|none|
|motion|occupancy sensor|any `InfoOnlyAnalog` device (0/1 values)|none|
|switch|switch|any `Pushbutton` or `Switch` device (0/1 values)|none|
|button|switch|any `Pushbutton` or `Switch` device (0/1 values)|none|switches automatically back to off after 1 second
|outlet|switch (outlet)|any `Pushbutton` or `Switch` device (0/1 values)|none|
|light|switch (light)|any `Pushbutton` or `Switch` device (0/1 values)|none|
|switch|switch|any `Pushbutton` or `Switch` device (0/1 values)|none|
|dimmer|dimmable light|`LightControllerV2` circuit|none|UUID needs to be in the format `<UUID>/AIxx`
|mood|switch (light)|`LightControllerV2` mood|ID of the mood||
|radio|switch|`Radio`|output number of the radio button||
|smoke|smoke alarm|`SmokeAlarm`|none||
|ac|airconditioner|`AcControl` device|none||

Additionally, all devices support specifying remaining battery %, by appending:
`,battery_<batterystatusUUID>` to the end of the UUID and type string.

> Don't forget to restart matterbridge after making a configuration change

#### Examples:
- `161f7bd3-0200-79f6-ffff796b564594c0,radio,2` - results in a switch that corresponds to the second output of the radio button
- `121b4263-0076-a710-ffff796b564594c0,mood,5` - results in a light that corresponds to mood with ID 5 on a light controller
- `120f23ad-02cd-14f3-ffff796b564594c0,motion,battery_1df94ed2-00f0-7c32-ffff796b564594c0` - results in an occupancy sensor with batter % remaining displayed
