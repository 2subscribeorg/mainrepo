package com.twosubscribe.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FileSaverPlugin.class);
        super.onCreate(savedInstanceState);
        ensureFirebaseInitialized();
    }

    private void ensureFirebaseInitialized() {
        try {
            FirebaseApp.getInstance();
        } catch (IllegalStateException e) {
            Log.w(TAG, "Firebase not yet initialised — calling initializeApp", e);
            try {
                FirebaseApp.initializeApp(this);
            } catch (Exception ex) {
                Log.e(TAG, "FirebaseApp.initializeApp failed — push notifications will be unavailable", ex);
            }
        }
    }
}
