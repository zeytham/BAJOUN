package tz.phonevault.phonevault

import android.content.ClipData
import android.content.Intent
import android.view.WindowManager
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "tz.phonevault/screen")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "secure" -> {
                        val on = call.argument<Boolean>("on") == true
                        if (on) {
                            window.setFlags(
                                WindowManager.LayoutParams.FLAG_SECURE,
                                WindowManager.LayoutParams.FLAG_SECURE,
                            )
                        } else {
                            window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                        }
                        result.success(null)
                    }
                    "whatsapp" -> {
                        val phone = call.argument<String>("phone") ?: ""
                        val path = call.argument<String>("path") ?: ""
                        val file = File(path)
                        if (phone.length < 11 || !file.exists()) {
                            result.success(false)
                            return@setMethodCallHandler
                        }
                        val uri = FileProvider.getUriForFile(
                            this,
                            "$packageName.fileprovider",
                            file,
                        )
                        val opened = openWhatsapp("com.whatsapp", phone, uri) || openWhatsapp("com.whatsapp.w4b", phone, uri)
                        result.success(opened)
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun openWhatsapp(packageName: String, phone: String, uri: android.net.Uri): Boolean {
        return try {
            grantUriPermission(packageName, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                setPackage(packageName)
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra("jid", "$phone@s.whatsapp.net")
                clipData = ClipData.newRawUri("risiti", uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
            true
        } catch (_: Exception) {
            false
        }
    }
}
