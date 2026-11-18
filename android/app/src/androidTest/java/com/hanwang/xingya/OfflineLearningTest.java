package com.hanwang.xingya;

import android.os.SystemClock;
import android.graphics.Bitmap;
import java.io.File;
import java.io.FileOutputStream;
import android.os.ParcelFileDescriptor;
import android.content.Context;
import android.net.ConnectivityManager;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** Run on a clean emulator with Wi-Fi/data disabled. No live account is required. */
@RunWith(AndroidJUnit4.class)
public class OfflineLearningTest {
    @Rule public ActivityScenarioRule<MainActivity> activity = new ActivityScenarioRule<>(MainActivity.class);

    private String js(String code) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        activity.getScenario().onActivity(a -> a.getBridge().getWebView().evaluateJavascript(code, value -> { result.set(value); done.countDown(); }));
        assertTrue("JavaScript evaluation timed out", done.await(8, TimeUnit.SECONDS));
        return result.get();
    }
    private void waitFor(String expression) throws Exception {
        long end = SystemClock.uptimeMillis() + 20000;
        do {
            if ("true".equals(js("Boolean(" + expression + ")"))) return;
            SystemClock.sleep(150);
        } while (SystemClock.uptimeMillis() < end);
        fail("Timed out: " + expression + "\n" + js("document.body.innerText.slice(0,1600)"));
    }
    private void click(String selector) throws Exception {
        waitFor("document.querySelector(" + quote(selector) + ")");
        js("document.querySelector(" + quote(selector) + ").click()");
    }
    private void capture(String name) throws Exception {
        SystemClock.sleep(350); // Let the WebView compositor paint the asserted DOM.
        File file = new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null), name + ".png");
        try (FileOutputStream output = new FileOutputStream(file)) {
            InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot().compress(Bitmap.CompressFormat.PNG, 100, output);
        }
        // Keep report images after Gradle uninstalls the app. Commands run only on the test device.
        shell("mkdir -p /sdcard/Download/xingya-test");
        shell("cp " + file.getAbsolutePath() + " /sdcard/Download/xingya-test/" + name + ".png");
    }
    private void shell(String command) throws Exception {
        ParcelFileDescriptor pipe = InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand(command);
        try (ParcelFileDescriptor.AutoCloseInputStream output = new ParcelFileDescriptor.AutoCloseInputStream(pipe)) {
            while (output.read() != -1) {}
        }
    }
    private String quote(String text) { return "'" + text.replace("'", "\\'") + "'"; }
    private void back() {
        activity.getScenario().onActivity(a -> a.getOnBackPressedDispatcher().onBackPressed());
    }

    @Test public void threeSubjectsWorkOfflineAndKeepProgressAfterRecreation() throws Exception {
        waitFor("window.XingyaNative && document.querySelector('.portal-math')");
        assertEquals("\"android\"", js("window.XingyaNative.platform"));
        assertEquals("true", js("Capacitor.isPluginAvailable('XingyaSpeech')"));
        assertNull(((ConnectivityManager) InstrumentationRegistry.getInstrumentation().getTargetContext().getSystemService(Context.CONNECTIVITY_SERVICE)).getActiveNetwork());
        assertEquals("true", js("document.querySelector('.portal-title').getBoundingClientRect().top >= document.querySelector('.user-bar').getBoundingClientRect().bottom"));
        capture("home");
        // Offline users can keep studying beyond the web trial limit.
        js("localStorage.setItem('rm.trial.math','99');localStorage.setItem('rm.trial.english','99');localStorage.setItem('rm.trial.chinese','99')");
        click(".portal-chinese"); click(".portal-char");
        waitFor("document.querySelector('iframe')?.contentWindow.cnchar");
        js("window.strokeLoaded=false;document.querySelector('iframe').contentWindow.fetch('/vendor/hanzi-data/我.json').then(r=>r.json()).then(d=>window.strokeLoaded=d.strokes.length>0)");
        waitFor("window.strokeLoaded");
        capture("chinese-characters");
        back(); waitFor("document.querySelector('.portal-read')");
        click(".portal-read");
        waitFor("document.querySelector('iframe')?.contentDocument.querySelector('.library-choice')");
        js("document.querySelector('iframe').contentDocument.querySelector('.library-choice').click()");
        waitFor("document.querySelector('iframe').contentDocument.querySelector('.reading-choice')");
        js("document.querySelector('iframe').contentDocument.querySelector('.reading-choice').click()");
        waitFor("document.querySelector('iframe').contentDocument.querySelector('.reading-feedback').textContent.length>0");
        capture("chinese-reading");
        back(); waitFor("document.querySelector('.portal-read')"); back(); waitFor("document.querySelector('.portal-english')");
        click(".portal-english");
        waitFor("document.querySelector('iframe')?.contentDocument.body.innerText.length>200");
        click(".english-practice-links button");
        waitFor("document.querySelector('.choice')"); click(".choice");
        // Choice selection immediately records a result; no submit step.
        waitFor("document.querySelector('.wrong-hint') || document.querySelector('.feedback-bar')");
        js("window.savedCount=0;const r=indexedDB.open('rocket-math');r.onsuccess=()=>{const q=r.result.transaction('students').objectStore('students').get('local');q.onsuccess=()=>{window.savedCount=q.result?.xp || 0;r.result.close()}};");
        waitFor("window.savedCount>0");
        capture("english-feedback");
        String savedXp = js("window.savedCount");
        back(); waitFor("document.querySelector('.english-practice-menu')"); back(); waitFor("document.querySelector('.portal-math')");
        click(".portal-math"); click(".grade-card:nth-child(2)");
        waitFor("document.querySelector('.title')?.textContent.includes('四年级')");
        js("[...document.querySelectorAll('.topic-main')].find(b=>b.textContent.includes('三位数乘两位数')).click()");
        waitFor("document.querySelector('.native-answer-input .key')");
        assertEquals("true", js("document.querySelector('.native-answer-input input').readOnly"));
        click(".native-answer-input .key");
        js("[...document.querySelectorAll('.native-answer-input .key')].find(b=>b.textContent==='.').click()");
        click(".native-answer-input .key"); click(".native-answer-input .key-sign");
        assertEquals("\"-1.1\"", js("document.querySelector('.native-answer-input input').value"));
        capture("math-keypad");
        back(); waitFor("document.querySelector('.topic-main')"); back(); waitFor("document.querySelector('.grade-grid')"); back(); waitFor("document.querySelector('.portal-math')");
        activity.getScenario().recreate();
        waitFor("document.querySelector('.portal-math')");
        assertEquals("\"4\"", js("localStorage.getItem('rm.grade')"));
        js("window.savedCount=0;const r=indexedDB.open('rocket-math');r.onsuccess=()=>{const q=r.result.transaction('students').objectStore('students').get('local');q.onsuccess=()=>{window.savedCount=q.result?.xp || 0;r.result.close()}};");
        waitFor("window.savedCount>0");
        assertEquals(savedXp, js("window.savedCount"));
        // No installed voice can support this language: the user gets a readable fallback.
        js("speechSynthesis.speak(new SpeechSynthesisUtterance('test'));speechSynthesis.cancel();const u=new SpeechSynthesisUtterance('test');u.lang='zz-ZZ';speechSynthesis.speak(u)");
        waitFor("document.querySelector('[role=alert]')?.textContent.includes('离线语音包')");
        js("localStorage.setItem('token','offline-test-fixture');localStorage.setItem('user',JSON.stringify({id:42,username:'offline-fixture',role:'user'}));localStorage.setItem('rm.child',JSON.stringify({id:7,name:'offline-child',avatar:'🌱',grade:4}))");
        activity.getScenario().recreate();
        waitFor("document.querySelector('.user-name')?.textContent==='offline-fixture'");
        js("window.offlineRequestFailed=false;fetch('/api/auth/me').catch(()=>window.offlineRequestFailed=true)");
        waitFor("window.offlineRequestFailed");
        assertEquals("\"offline-test-fixture\"", js("localStorage.getItem('token')"));
        waitFor("document.querySelector('.child-chip-nm')?.textContent==='offline-child'");
    }
}
