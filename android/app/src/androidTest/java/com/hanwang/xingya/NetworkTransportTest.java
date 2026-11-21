package com.hanwang.xingya;

import android.os.SystemClock;
import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** Online smoke test: a read-only, unauthenticated request. Never creates an account. */
@RunWith(AndroidJUnit4.class)
public class NetworkTransportTest {
    @Rule public ActivityScenarioRule<MainActivity> activity = new ActivityScenarioRule<>(MainActivity.class);
    private String js(String code) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        activity.getScenario().onActivity(a -> a.getBridge().getWebView().evaluateJavascript(code, value -> { result.set(value); done.countDown(); }));
        assertTrue(done.await(8, TimeUnit.SECONDS)); return result.get();
    }
    @Test public void bundledApiCallsReachTheExistingHttpsService() throws Exception {
        long end = SystemClock.uptimeMillis() + 15000;
        while (!"true".equals(js("Boolean(window.XingyaNative)")) && SystemClock.uptimeMillis() < end) SystemClock.sleep(100);
        assertEquals("true", js("Boolean(window.XingyaNative)"));
        js("window.apiResult='waiting';fetch('/api/auth/me').then(async r=>window.apiResult={status:r.status,data:await r.json()}).catch(()=>window.apiResult='network-error')");
        end = SystemClock.uptimeMillis() + 30000;
        while ("\"waiting\"".equals(js("window.apiResult")) && SystemClock.uptimeMillis() < end) SystemClock.sleep(200);
        assertEquals("Native transport should preserve HTTP status: " + js("window.apiResult"), "401", js("window.apiResult.status"));
        assertEquals("true", js("typeof window.apiResult.data==='object'"));
    }
}
