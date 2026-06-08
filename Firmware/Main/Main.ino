#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ── WiFi & WebSocket ────────────────────────────────────────
const char* ssid       = "xxxxx";
const char* password   = "xxxxx";
const char* serverHost = "smartcart-bachelors-thesis.onrender.com";
const uint16_t serverPort = 443;

WebSocketsClient webSocket;
bool wsConnected = false;
unsigned long lastWifiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 5000;

// ── LCD ─────────────────────────────────────────────────────
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ── Alert Lock ──────────────────────────────────────────────
bool alertActive = false;
unsigned long alertStartTime = 0;
const unsigned long ALERT_DURATION = 3000;

// ── Product Display Timer (5 sec then back to SmartCart) ────
bool productDisplayActive = false;
unsigned long productDisplayTime = 0;
const unsigned long PRODUCT_DISPLAY_DURATION = 5000;

// ── Pending Product (20 sec display delay) ──────────────────
bool productPending = false;
unsigned long productPendingTime = 0;
const unsigned long PRODUCT_DELAY = 20000;
char pendingName[20]   = "";
char pendingWeight[10] = "";
char pendingCost[10]   = "";

// ── Pending Alert (10 sec alert delay) ──────────────────────
bool alertPending = false;
unsigned long alertPendingTime = 0;
const unsigned long ALERT_DELAY = 10000;

// ── Print centered text on a given row ─────────────────────
void printCentered(int row, const char* text) {
  int len = strlen(text);
  int col = (len < 16) ? (16 - len) / 2 : 0;
  lcd.setCursor(0, row);
  lcd.print("                ");
  lcd.setCursor(col, row);
  lcd.print(text);
}

// ── Print weight + cost on row 2, spaced & centered ─────────
void printRow2(const char* weight, const char* cost) {
  char left[9], right[9];
  snprintf(left,  sizeof(left),  "%s", weight);
  snprintf(right, sizeof(right), "Rs.%s", cost);

  int totalLen = strlen(left) + strlen(right);
  int spaces   = 16 - totalLen;
  if (spaces < 1) spaces = 1;

  char buf[17];
  int idx = 0;
  int leftPad = (16 - totalLen - spaces) / 2;
  if (leftPad < 0) leftPad = 0;

  for (int i = 0; i < leftPad && idx < 16; i++)  buf[idx++] = ' ';
  for (int i = 0; left[i]  && idx < 16; i++)      buf[idx++] = left[i];
  for (int i = 0; i < spaces && idx < 16; i++)    buf[idx++] = ' ';
  for (int i = 0; right[i] && idx < 16; i++)      buf[idx++] = right[i];
  while (idx < 16) buf[idx++] = ' ';
  buf[16] = '\0';

  lcd.setCursor(0, 1);
  lcd.print(buf);
}

// ── Show product on LCD + start 5 sec display timer ─────────
void showProduct(const char* name, const char* weight, const char* cost) {
  if (alertActive) return;
  lcd.clear();
  printCentered(0, name);
  printRow2(weight, cost);
  productDisplayActive = true;
  productDisplayTime   = millis();
}

// ── Queue product to show after 20 seconds ──────────────────
void queueProduct(const char* name, const char* weight, const char* cost) {
  strncpy(pendingName,   name,   sizeof(pendingName)   - 1);
  strncpy(pendingWeight, weight, sizeof(pendingWeight) - 1);
  strncpy(pendingCost,   cost,   sizeof(pendingCost)   - 1);
  productPending     = true;
  productPendingTime = millis();
}

// ── Show mismatch alert immediately (highest priority) ───────
void showMismatchAlert() {
  alertActive          = true;
  alertStartTime       = millis();
  alertPending         = false;
  productPending       = false;
  productDisplayActive = false; // cancel product display timer too
  lcd.clear();
  printCentered(0, "Product Mismatch");
  printCentered(1, "Check the cart");
  Serial.println(">>> ALERT: Product Mismatch shown on LCD");
}

// ── Queue alert to show after 10 seconds ────────────────────
void queueAlert() {
  alertPending     = true;
  alertPendingTime = millis();
}

// ── WiFi connect ────────────────────────────────────────────
void connectWifi() {
  Serial.print("Connecting to WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi Connected");
    Serial.print("IP: "); Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi not connected yet — will keep retrying.");
  }
}

// ── Send ACK to backend ─────────────────────────────────────
void sendAck(const char* requestId, bool success) {
  JsonDocument doc;
  doc["type"]      = "ack";
  doc["requestId"] = requestId;
  doc["success"]   = success;
  String out;
  serializeJson(doc, out);
  webSocket.sendTXT(out);
  Serial.print("Sent ack: "); Serial.println(out);
}

// ── Handle incoming WebSocket message ───────────────────────
void handleCartMessage(uint8_t* payload, size_t length) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.print("JSON parse failed: "); Serial.println(err.c_str());
    return;
  }

  // ── Highest priority: command "e" ───────────────────────
  const char* command = doc["command"] | "";
  if (strcmp(command, "e") == 0) {
    Serial.println(">>> command 'e' received");
    queueAlert();
    return;
  }

  // ── Normal cart fields ───────────────────────────────────
  const char* type      = doc["type"]      | "";
  const char* requestId = doc["requestId"] | "";
  const char* productId = doc["productId"] | "";
  const char* barcode   = doc["barcode"]   | "";
  int         quantity  = doc["quantity"]  | 0;
  const char* action    = doc["action"]    | "";

  Serial.println("---- Cart action received ----");
  Serial.print("type      : "); Serial.println(type);
  Serial.print("productId : "); Serial.println(productId);
  Serial.print("barcode   : "); Serial.println(barcode);
  Serial.print("quantity  : "); Serial.println(quantity);
  Serial.print("action    : "); Serial.println(action);

  // ── Product ID → Queue for LCD after 20 seconds ─────────
  if (strcmp(productId, "PID-CP1133") == 0) {
    queueProduct("Jeera Wonder", "190g", "30");

  } else if (strcmp(productId, "PID-PS4410") == 0) {
    queueProduct("TATA Salt", "1Kg", "30");

  } else if (strcmp(productId, "PID-LC7829") == 0) {
    queueProduct("OPPO Enco Buds 2", "38g", "2000");

  } else if (strlen(productId) > 0) {
    if (!alertActive) {
      lcd.clear();
      printCentered(0, "Unknown Product");
      printCentered(1, productId);
      productDisplayActive = true;
      productDisplayTime   = millis();
    }
  }

  // ── ACK ─────────────────────────────────────────────────
  bool success = true;
  if (strlen(requestId) > 0) {
    sendAck(requestId, success);
  }
}

// ── WebSocket event handler ─────────────────────────────────
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("WebSocket Disconnected");
      wsConnected = false;
      break;
    case WStype_CONNECTED:
      Serial.println("WebSocket Connected");
      wsConnected = true;
      break;
    case WStype_TEXT:
      Serial.print("Received: "); Serial.println((char*)payload);
      handleCartMessage(payload, length);
      break;
    case WStype_ERROR:
      Serial.println("WebSocket Error");
      break;
    default:
      break;
  }
}

// ── Setup ───────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(2000);
  Serial.println("=== BOOT OK ===");

  pinMode(4, OUTPUT);
  digitalWrite(4, HIGH);

  // LCD
  Wire.begin(2, 13);
  lcd.init();
  delay(100);
  lcd.backlight();
  lcd.clear();
  printCentered(0, "SmartCart");
  printCentered(1, "Starting...");
  Serial.println("LCD OK");

  // WiFi
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  connectWifi();

  // WebSocket
  webSocket.beginSSL(serverHost, serverPort, "/esp32");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  lcd.clear();
  printCentered(0, "SmartCart");
  printCentered(1, "Connected!");
}

// ── Loop ────────────────────────────────────────────────────
void loop() {
  // ── Alert timeout — release lock after 3 seconds ────────
  if (alertActive && (millis() - alertStartTime >= ALERT_DURATION)) {
    alertActive = false;
    lcd.clear();
    printCentered(0, "SmartCart");
    printCentered(1, "Ready");
  }

  // ── Product display timeout — clear after 5 seconds ─────
  if (productDisplayActive && (millis() - productDisplayTime >= PRODUCT_DISPLAY_DURATION)) {
    productDisplayActive = false;
    if (!alertActive) {
      lcd.clear();
      printCentered(0, "SmartCart");
      printCentered(1, "Ready");
    }
  }

  // ── Pending alert — show after 10 seconds ───────────────
  if (alertPending && (millis() - alertPendingTime >= ALERT_DELAY)) {
    alertPending = false;
    showMismatchAlert();
  }

  // ── Pending product — show after 20 seconds ─────────────
  if (productPending && (millis() - productPendingTime >= PRODUCT_DELAY)) {
    productPending = false;
    showProduct(pendingName, pendingWeight, pendingCost);
  }

  // ── Serial '1' → queue mismatch alert (10 sec) ──────────
  if (Serial.available()) {
    char c = Serial.read();
    if (c == '1') {
      queueAlert();
    }
  }

  // ── WiFi watchdog ────────────────────────────────────────
  if (millis() - lastWifiCheck >= WIFI_CHECK_INTERVAL) {
    lastWifiCheck = millis();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi lost — reconnecting...");
      WiFi.disconnect();
      WiFi.begin(ssid, password);
    }
  }

  webSocket.loop();
}