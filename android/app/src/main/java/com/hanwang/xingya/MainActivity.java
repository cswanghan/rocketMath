package com.hanwang.xingya;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        registerPlugin(XingyaSpeechPlugin.class);
        super.onCreate(state);
        // Follow the system's accessibility font size inside the learning surface.
        getBridge().getWebView().getSettings().setTextZoom(Math.round(getResources().getConfiguration().fontScale * 100));
    }
}
