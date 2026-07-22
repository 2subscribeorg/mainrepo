package com.twosubscribe.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FileSaver")
public class FileSaverPlugin extends Plugin {

    private String pendingContent = null;

    @PluginMethod
    public void saveFile(PluginCall call) {
        String filename = call.getString("filename", "export.csv");
        pendingContent = call.getString("content", "");

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("text/csv");
        intent.putExtra(Intent.EXTRA_TITLE, filename);

        startActivityForResult(call, intent, "handleCreateDocument");
    }

    @ActivityCallback
    private void handleCreateDocument(PluginCall call, ActivityResult result) {
        if (call == null) return;

        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Uri uri = result.getData().getData();
            if (uri != null) {
                try {
                    byte[] bytes = pendingContent != null ? pendingContent.getBytes("UTF-8") : new byte[0];
                    java.io.OutputStream out = getActivity().getContentResolver().openOutputStream(uri);
                    out.write(bytes);
                    out.close();
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Failed to write file: " + e.getMessage());
                }
            } else {
                call.reject("No URI returned");
            }
        } else {
            call.reject("CANCELLED");
        }
        pendingContent = null;
    }
}
