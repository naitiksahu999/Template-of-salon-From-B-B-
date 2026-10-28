#!/usr/bin/env bash
set -e

echo "[1/7] Preparing workspace..."
BUILD_DIR="/tmp/apk_build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/src/com/bbfamilysalon/app"
mkdir -p "$BUILD_DIR/res/values"
mkdir -p "$BUILD_DIR/res/mipmap-mdpi"
mkdir -p "$BUILD_DIR/res/mipmap-hdpi"
mkdir -p "$BUILD_DIR/res/mipmap-xhdpi"
mkdir -p "$BUILD_DIR/res/mipmap-xxhdpi"
mkdir -p "$BUILD_DIR/assets"
mkdir -p "$BUILD_DIR/bin/classes"

ANDROID_JAR="/opt/android-sdk/android.jar"
D8_JAR="/opt/android-sdk/d8.jar"
KEYSTORE="/opt/android-sdk/debug.keystore"

# 1. AndroidManifest.xml
cat << 'EOF' > "$BUILD_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.bbfamilysalon.app"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.Light.NoActionBar"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true">
        <activity
            android:name="com.bbfamilysalon.app.MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:windowSoftInputMode="adjustResize"
            android:label="@string/app_name">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# 2. strings.xml
cat << 'EOF' > "$BUILD_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">B&amp;B Family Salon</string>
</resources>
EOF

# 3. Generate high-res gold & charcoal launcher icons
convert -size 512x512 xc:"#1C1B1A" \
  -fill "#C29F67" -draw "circle 256,256 256,40" \
  -fill "#1C1B1A" -draw "circle 256,256 256,54" \
  -fill "#C29F67" -pointsize 180 -font "DejaVu-Serif-Bold" -gravity center -draw "text 0,0 'B&B'" \
  "$BUILD_DIR/assets/icon-512.png" 2>/dev/null || \
convert -size 512x512 xc:"#1C1B1A" -fill "#C29F67" -draw "circle 256,256 256,50" "$BUILD_DIR/assets/icon-512.png"

convert "$BUILD_DIR/assets/icon-512.png" -resize 48x48   "$BUILD_DIR/res/mipmap-mdpi/ic_launcher.png"
convert "$BUILD_DIR/assets/icon-512.png" -resize 72x72   "$BUILD_DIR/res/mipmap-hdpi/ic_launcher.png"
convert "$BUILD_DIR/assets/icon-512.png" -resize 96x96   "$BUILD_DIR/res/mipmap-xhdpi/ic_launcher.png"
convert "$BUILD_DIR/assets/icon-512.png" -resize 144x144 "$BUILD_DIR/res/mipmap-xxhdpi/ic_launcher.png"

# Also copy to public icons for PWA
cp "$BUILD_DIR/assets/icon-512.png" "/public/pwa-512x512.png" 2>/dev/null || true
convert "$BUILD_DIR/assets/icon-512.png" -resize 192x192 "/public/pwa-192x192.png" 2>/dev/null || true
convert "$BUILD_DIR/assets/icon-512.png" -resize 180x180 "/public/apple-touch-icon.png" 2>/dev/null || true

# 4. assets/app-config.json
cat << 'EOF' > "$BUILD_DIR/assets/app-config.json"
{
  "appName": "B & B Family Salon",
  "packageName": "com.bbfamilysalon.app",
  "version": "1.0.0",
  "versionCode": 1,
  "supabase": {
    "url": "https://fkkbcnaazeajcnssniev.supabase.co",
    "anonKey": "sb_publishable_SeQLZGYpG6SU7pj8fTTRRg_bXRnqudV",
    "syncTables": ["appointments", "services", "business_hours", "blocked_dates", "settings"]
  },
  "salon": {
    "name": "B & B Family Salon",
    "alternateName": "B&B Unisex Salon",
    "phone": "+91 91316 29031",
    "address": "2nd Floor, Ultimate Arcade, F11-12, Kolar Road, Bhopal",
    "city": "Bhopal",
    "state": "Madhya Pradesh"
  }
}
EOF

# 5. MainActivity.java
cat << 'EOF' > "$BUILD_DIR/src/com/bbfamilysalon/app/MainActivity.java"
package com.bbfamilysalon.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.webkit.DownloadListener;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;
    private ProgressBar progressBar;

    private static final String APP_URL = "https://ais-pre-55b6nyqbgt6lygckq6qr34-650011710926.asia-southeast1.run.app/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFFFBFBFA);

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, 12
        ));
        progressBar.setMax(100);

        root.addView(webView);
        root.addView(progressBar);
        setContentView(root);

        initWebView();
        webView.loadUrl(APP_URL);
    }

    private void initWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("tel:") || url.startsWith("whatsapp:") || url.startsWith("mailto:")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        return false;
                    }
                }
                return false;
            }
        });

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Downloading...", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
EOF

echo "[2/7] Compiling Android resources with aapt..."
aapt package -f -m \
  -J "$BUILD_DIR/src" \
  -M "$BUILD_DIR/AndroidManifest.xml" \
  -S "$BUILD_DIR/res" \
  -I "$ANDROID_JAR"

echo "[3/7] Compiling Java sources with javac..."
javac -encoding UTF-8 \
  -cp "$ANDROID_JAR" \
  -d "$BUILD_DIR/bin/classes" \
  $(find "$BUILD_DIR/src" -name "*.java")

echo "[4/7] Generating classes.dex with D8..."
java -cp "$D8_JAR" com.android.tools.r8.D8 \
  --release \
  --min-api 21 \
  --output "$BUILD_DIR/bin" \
  --lib "$ANDROID_JAR" \
  $(find "$BUILD_DIR/bin/classes" -name "*.class")

echo "[5/7] Packaging APK with aapt..."
aapt package -f \
  -M "$BUILD_DIR/AndroidManifest.xml" \
  -S "$BUILD_DIR/res" \
  -A "$BUILD_DIR/assets" \
  -I "$ANDROID_JAR" \
  -F "$BUILD_DIR/bin/unaligned.apk"

cd "$BUILD_DIR/bin"
aapt add unaligned.apk classes.dex

echo "[6/7] Aligning APK with zipalign..."
zipalign -f -p 4 unaligned.apk aligned.apk

echo "[7/7] Signing APK with apksigner..."
apksigner sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:android \
  --key-pass pass:android \
  --out "$BUILD_DIR/bin/signed.apk" \
  aligned.apk

# Verify signature
apksigner verify --verbose "$BUILD_DIR/bin/signed.apk"

FINAL_APK="/public/downloads/BB-Family-Salon.apk"
mkdir -p "/public/downloads"
cp "$BUILD_DIR/bin/signed.apk" "$FINAL_APK"

APK_SIZE=$(stat -c%s "$FINAL_APK")
APK_MB=$(awk "BEGIN {printf \"%.2f\", $APK_SIZE / 1048576}")
echo "SUCCESS! Real Android APK generated at $FINAL_APK ($APK_SIZE bytes / $APK_MB MB)"
