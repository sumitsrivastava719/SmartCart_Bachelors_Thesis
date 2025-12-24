#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>


const char* ssid = "XXX";
const char* password = "helloworld";
const char* serverName = "http://192.168.29.250:3000/api/frame";


#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
#define LED_GPIO_NUM       4

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();
  Serial.println("ESP32-CAM Starting...");
  
  
  if(psramFound()){
    Serial.println("PSRAM found and loaded");
  } else {
    Serial.println("WARNING: PSRAM not found!");
  }

  // Camera configuration
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  

  if(psramFound()){
    config.frame_size = FRAMESIZE_UXGA; // 1600x1200
    config.jpeg_quality = 10;  // 0-63 lower means higher quality
    config.fb_count = 2;
    config.fb_location = CAMERA_FB_IN_PSRAM;
    config.grab_mode = CAMERA_GRAB_LATEST;
  } else {
    config.frame_size = FRAMESIZE_SVGA; // 800x600
    config.jpeg_quality = 12;
    config.fb_count = 1;
    config.fb_location = CAMERA_FB_IN_DRAM;
  }

  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    Serial.println("Please check:");
    Serial.println("1. Partition Scheme is set to 'Huge APP'");
    Serial.println("2. PSRAM is enabled in Tools menu");
    Serial.println("3. Board is 'AI Thinker ESP32-CAM'");
    return;
  }
  Serial.println("Camera initialized successfully!");

  // Sensor adjustments
  sensor_t * s = esp_camera_sensor_get();
  if (s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);
    s->set_brightness(s, 1);
    s->set_saturation(s, -2);
  }
  // remember it sumit: Staring with lower resolution for faster processing
  s->set_framesize(s, FRAMESIZE_SVGA);

  
  WiFi.begin(ssid, password);
  WiFi.setSleep(false);
  
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  
  // Setup LED flash
  pinMode(LED_GPIO_NUM, OUTPUT);
  digitalWrite(LED_GPIO_NUM, LOW);
  
  Serial.println("\n=================================");
  Serial.println("Ready! Type 'Send' to capture image");
  Serial.println("=================================");
}

void loop() {
  
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim(); 
    
    if (command.equalsIgnoreCase("Send")) {
      if (WiFi.status() == WL_CONNECTED) {
        captureAndSendImage();
      } else {
        Serial.println("ERROR: WiFi disconnected!");
        WiFi.reconnect();
      }
    } else {
      Serial.println("Unknown command. Type 'Send' to capture image.");
    }
  }
}

void captureAndSendImage() {
  Serial.println("\n--- Capturing image ---");
  
  // Turn ON LED flash
  digitalWrite(LED_GPIO_NUM, HIGH);
  Serial.println("Flash ON");
  delay(200); // Give flash time to illuminate
  
  // Capture image
  camera_fb_t * fb = esp_camera_fb_get();
  
  // Turn OFF LED flash immediately after capture
  digitalWrite(LED_GPIO_NUM, LOW);
  Serial.println("Flash OFF");
  
  if (!fb) {
    Serial.println("ERROR: Camera capture failed");
    return;
  }
  
  Serial.printf("Image captured: %d bytes\n", fb->len);
  Serial.printf("Image size: %dx%d\n", fb->width, fb->height);
  
  // Send image to API
  HTTPClient http;
  http.begin(serverName);
  http.addHeader("Content-Type", "image/jpeg");
  
 
  
  Serial.println("Sending to API...");
  int httpResponseCode = http.POST(fb->buf, fb->len);
  
  if (httpResponseCode > 0) {
    Serial.printf("✓ HTTP Response code: %d\n", httpResponseCode);
    String response = http.getString();
    Serial.println("Server response:");
    Serial.println(response);
  } else {
    Serial.printf("✗ Error sending image: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
  esp_camera_fb_return(fb);
  Serial.println("--- Done ---");
}