# NIRMALTAG — DIRECT ANDROID APK INSTALLATION GUIDE

**Application Name**: NirmalTag  
**Application ID**: `com.nirmaltag.app`  
**Version**: `1.0.0` (Version Code: `1`)  
**Release Status**: **DIRECT APK RELEASE — READY**  
**Target OS**: Android 8.0+ (API 26 to API 34)  

---

## 1. OFFICIAL RELEASE ARTIFACT DETAILS

| Parameter | Value |
| :--- | :--- |
| **File Name** | `NirmalTag.apk` |
| **Repository Path** | `android/app/build/outputs/apk/release/NirmalTag.apk` |
| **File Size** | `46,855,064 bytes` (~44.68 MB) |
| **SHA-256 Checksum** | `F249A146D6C613019FA628B2E0B323A754651D5DD19F7F2AF0193F54AE944319` |
| **Distribution Channel** | Direct Sideload / Manual APK Installation |

---

## 2. SHA-256 CHECKSUM VERIFICATION

Before installing the APK on your device, verify that the downloaded file matches the official SHA-256 checksum to ensure file integrity.

### On Windows (PowerShell)
```powershell
Get-FileHash NirmalTag.apk -Algorithm SHA256
```
**Expected Output**:
`F249A146D6C613019FA628B2E0B323A754651D5DD19F7F2AF0193F54AE944319`

### On Linux / macOS
```bash
sha256sum NirmalTag.apk
```
**Expected Output**:
`f249a146d6c613019fa628b2e0b323a754651D5DD19F7F2AF0193F54AE944319  NirmalTag.apk`

---

## 3. INSTALLATION STEPS

### Method A: Direct Phone Sideloading
1. Download `NirmalTag.apk` directly to your Android device.
2. Open your phone's **File Manager** and tap `NirmalTag.apk`.
3. If prompted: *"For your security, your phone is not allowed to install unknown apps from this source"*:
   - Tap **Settings**.
   - Toggle **Allow from this source** to ON.
   - Tap **Back** and select **Install**.
4. Launch **NirmalTag** from your app drawer.

### Method B: ADB Installation (For Developers / Testers)
1. Enable **USB Debugging** on your Android device (Settings $\rightarrow$ Developer Options $\rightarrow$ USB Debugging).
2. Connect your device via USB.
3. Run the ADB command:
   ```bash
   adb install -r android/app/build/outputs/apk/release/NirmalTag.apk
   ```
4. ADB will return `Performing Streamed Install` followed by `Success`.

---

## 4. FIRST-TIME APP ONBOARDING & PERMISSIONS

When launching NirmalTag for the first time:
1. **Camera Permission**: Grant Camera access to enable the CameraX scanner for ML Kit QR barcode scanning and pouch evidence capture.
2. **Location Permission**: Grant Location access for GPS pickup verification metadata.
3. **Authentication Choice**:
   - **Continue with Google**: Tap to open native Android Google Account Chooser modal.
   - **Email & Password**: Enter registered email address and password.

---

## 5. GOOGLE ACCOUNT SWITCHING

NirmalTag supports native multi-account switching on Android:
1. Log into Account A $\rightarrow$ reach role portal dashboard.
2. Tap **Sign Out** in the top navigation bar.
3. Tap **Continue with Google** $\rightarrow$ native Android chooser modal opens.
4. Select Account B $\rightarrow$ authenticated as Account B immediately.
5. **No need to force-stop or clear app data**.
