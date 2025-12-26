
#include "HX711.h"

const int LOADCELL_DOUT_PIN = 2;
const int LOADCELL_SCK_PIN = 4;

HX711 scale;



void setup() {
  Serial.begin(57600);
  Serial.println("Load Cell Interfacing with ESP32 - DIY CHEAP PERFECT");
  
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);

  scale.set_scale(-443);    // this value is obtained by calibrating the scale with known weights as in previous step
  scale.tare();				         // reset the scale to 0
}

//DIY_CHEAP_PERFECT

void loop() {
  Serial.print("Weight: ");
  Serial.println(scale.get_units(10), 1);
  scale.power_down();			        // put the ADC in sleep mode
  delay(1000);
  scale.power_up();
}

//DIY_CHEAP_PERFECT
