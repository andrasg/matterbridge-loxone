interface SwitchControlSection {
  name: string;
  type: 'switch';
  uuidAction: string;
  room: string;
  states: {
    'active': string;
    [key: string]: string;
  };
}

interface SliderControlSection {
  name: string;
  type: 'slider' | 'LeftRightAnalog' | 'InfoOnlyAnalog';
  uuidAction: string;
  room: string;
  states: {
    'value': string;
    [key: string]: string;
  };
}

interface InfoOnlyDigitalControlSection {
  name: string;
  type: 'InfoOnlyDigital';
  uuidAction: string;
  room: string;
  states: {
    'active': string;
    [key: string]: string;
  };
}

interface LightControllerV2ControlSection {
  name: string;
  type: 'LightControllerV2';
  uuidAction: string;
  room: string;
  states: {
    'activeMoods': string;
    'moodList': string;
    [key: string]: string;
  };
}

interface JalousieControlSection {
  name: string;
  type: 'Jalousie';
  uuidAction: string;
  room: string;
  states: {
    'up': string;
    'down': string;
    'position': string;
    'targetPosition': string;
    [key: string]: string;
  };
}

interface RadioControlSection {
  name: string;
  type: 'Radio';
  uuidAction: string;
  room: string;
  states: {
    'activeOutput': string;
    [key: string]: string;
  };
  details: {
    allOff: string;
    outputs: Record<string, string>;
  };
}

type ControlSection = RadioControlSection | LightControllerV2ControlSection | InfoOnlyDigitalControlSection | SwitchControlSection | SliderControlSection | JalousieControlSection;

export { RadioControlSection, ControlSection, LightControllerV2ControlSection, InfoOnlyDigitalControlSection, SwitchControlSection, SliderControlSection, JalousieControlSection };
