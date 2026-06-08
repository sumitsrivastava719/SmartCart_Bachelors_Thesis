#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(115200);
  delay(2000);
  Serial.println("=== BOOT OK ===");

  pinMode(4, OUTPUT);
  digitalWrite(4, LOW);

  Serial.println("Starting Wire...");
  Wire.begin(2, 13);
  Serial.println("Wire OK");

  Wire.beginTransmission(0x27);
  byte error = Wire.endTransmission();
  if (error == 0) {
    Serial.println("LCD found at 0x27");
  } else {
    Serial.println("LCD NOT found — check wiring!");
  }

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("INOVATRIX");
  Serial.println("LCD OK");
}

void loop() {
  Serial.println("alive");
  delay(1000);
}