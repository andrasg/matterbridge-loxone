// Central import file to ensure all device modules are evaluated and to export constructors explicitly.
import './AirConditioner.js';
import './ContactSensor.js';
import './DimmerLight.js';
import './HumiditySensor.js';
import './LightMood.js';
import './LightSensor.js';
import './MotionSensor.js';
import './OnOffButton.js';
import './OnOffDevice.js';
import './OnOffLight.js';
import './OnOffOutlet.js';
import './OnOffSwitch.js';
import './PressureSensor.js';
import './PushButton.js';
import './RadioButton.js';
import './SmokeAlarm.js';
import './TemperatureSensor.js';
import './WaterLeakSensor.js';
import './WindowShade.js';

// This file's main purpose is module evaluation; platform can import it to ensure registration.
export {};
