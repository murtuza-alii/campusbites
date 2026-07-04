# Capacitor by Ionic: Mobile App Integration Guide

This guide outlines how to wrap the React + Vite frontend of the **CampusBites** canteen selector app into a native mobile app (Android & iOS) using **Capacitor by Ionic**. 

Capacitor runs your existing web application in a high-performance webview shell, allowing you to build native mobile binaries without rewriting your UI in React Native or Flutter.

---

## 1. Prerequisites
Before compiling the app, ensure you have the required native SDKs installed on your computer:
*   **For Android:** Install [Android Studio](https://developer.android.com/studio) and configure the Android SDK Command-line Tools.
*   **For iOS (Mac only):** Install Xcode and CocoaPods (`sudo gem install cocoapods`).

---

## 2. Step-by-Step Setup

All Capacitor commands should be run inside the `frontend/` directory where `package.json` and `vite.config.ts` are located.

### Step 2.1: Install Capacitor Core & CLI
Install the core library and command-line interface as dependencies:
```bash
cd frontend
npm install @capacitor/core
npm install -D @capacitor/cli
```

### Step 2.2: Initialize Capacitor
Initialize Capacitor with your App Name and Package ID (reverse-domain notation):
```bash
npx cap init CampusBites com.campusbites.app --web-dir=dist
```
> **Note:** We set `--web-dir=dist` because Vite outputs the compiled web assets into the `frontend/dist` directory.

### Step 2.3: Install Platform Packages
Install the Android and iOS platforms:
```bash
npm install @capacitor/android @capacitor/ios
```

### Step 2.4: Add the Platforms to your Project
Create the native Android and iOS project folders:
```bash
npx cap add android
npx cap add ios
```

---

## 3. Daily Development & Build Workflow

Whenever you make changes to the React frontend code and want to see it on a simulator or device:

### Step 3.1: Build the Web App
Compile your TypeScript and React source files into optimized static assets:
```bash
npm run build
```

### Step 3.2: Sync Web Assets to Native Platforms
Copy the built assets from `dist/` to the Android and iOS project shells:
```bash
npx cap sync
```

### Step 3.3: Open and Run in IDEs
Open the project in Android Studio or Xcode to compile, emulate, or deploy to a physical device:
```bash
# Open in Android Studio
npx cap open android

# Open in Xcode
npx cap open ios
```
Alternatively, run them directly from your terminal if configured:
```bash
npx cap run android
npx cap run ios
```

---

## 4. Crucial Mobile Configurations for CampusBites

Because this canteen selector app connects to an external backend API, keep the following in mind:

### 1. API Endpoints (Base URL)
In a web browser, absolute path URLs like `/api/menu` or `localhost:5000` work when hosted on the same origin. On mobile, `localhost` refers to the mobile phone itself!
*   **Action:** Update your frontend API client (Axios or Fetch configuration) to point to the production server IP or domain:
    ```typescript
    const API_BASE_URL = import.meta.env.PROD 
      ? 'https://api.campusbites.com' // Production server
      : 'http://192.168.1.50:5000';   // Your computer's local network IP for testing
    ```

### 2. Local Network (LAN) Hosting & HTTP Clearance
If hosting the backend on the college local network (LAN) without an HTTPS certificate (for offline/internal use):
*   **Android:** By default, Android blocks cleartext (HTTP) traffic. You must enable it in `frontend/android/app/src/main/AndroidManifest.xml`:
    ```xml
    <application
        android:usesCleartextTraffic="true"
        ... >
    ```
*   **iOS:** Add an App Transport Security (ATS) exception in your `Info.plist` file inside Xcode to allow HTTP connections to your local IP address.

### 3. JWT Authentication Storage
Your current setup stores JWTs. Ensure you are using a secure, persistent method. 
While standard `localStorage` works in Capacitor (since it's a webview), OS updates can occasionally wipe webview storage. For production security:
*   Use the official `@capacitor/preferences` plugin for key-value storage.
*   Or use `@aerogear/cordova-plugin-aerogear-security` for hardware-secured storage (Keychain / Keystore).

---

## 5. Helpful Commands Reference

| Command | Description |
| :--- | :--- |
| `npx cap sync` | Builds/copies files to platforms and updates plugins. |
| `npx cap update` | Updates native platforms and plugins (without copying web assets). |
| `npx cap doctor` | Runs diagnostics to check your native build environment. |
| `npx cap copy` | Copies web assets to native platforms (faster than `sync` if no plugin changes). |
