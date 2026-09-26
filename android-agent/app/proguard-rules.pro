# ──────────────────────────────────────────────────────────────
#  APIXER - ProGuard / R8 Obfuscation Rules
# ──────────────────────────────────────────────────────────────

# ── Keep Application entry point ──
-keep class zxtni.apixer.into.ApixerApp { *; }
-keep class zxtni.apixer.into.MainActivity { *; }

# ── Keep all BroadcastReceivers (manifest-registered) ──
-keep class zxtni.apixer.into.receiver.** { *; }

# ── Keep Services (manifest-registered) ──
-keep class zxtni.apixer.into.service.** { *; }

# ── Keep Serialization models (kotlinx.serialization) ──
-keepattributes *Annotation*
-keep class kotlinx.serialization.** { *; }
-keepclassmembers class zxtni.apixer.into.network.** {
    <fields>;
    <init>(...);
}
-keepclassmembers @kotlinx.serialization.Serializable class ** {
    # lookup for plugin generated serializable classes
    *** Companion;
    *** INSTANCE;
    kotlinx.serialization.KSerializer serializer(...);
}
-keepclasseswithmembers class **$$serializer {
    *** INSTANCE;
}

# ── Keep Compose ──
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**

# ── Keep WorkManager Workers ──
-keep class zxtni.apixer.into.worker.** { *; }

# ── OkHttp ──
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# ── Keep enum members ──
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ── Aggressive obfuscation settings ──
-repackageclasses ''
-allowaccessmodification
-overloadaggressively
-mergeinterfacesaggressively

# ── Remove logging in release ──
-assumenosideeffects class android.util.Log {
    public static *** v(...);
    public static *** d(...);
    public static *** i(...);
    public static *** w(...);
}

# ── Remove toString() for data classes (reduces signatures) ──
-assumenosideeffects class java.lang.Object {
    java.lang.String toString();
}

# ── Suppress common warnings ──
-dontwarn java.lang.invoke.**
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.**
