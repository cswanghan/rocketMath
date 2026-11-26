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
        js("document.querySelector(" + quote(selector) + ").focus();document.querySelector(" + quote(selector) + ").click()");
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

    private void textButton(String selector, String text) throws Exception {
        String target = "[...document.querySelectorAll(" + quote(selector) + ")].find(b=>b.textContent.includes(" + quote(text) + "))";
        waitFor(target); js(target + ".focus();" + target + ".click()");
    }
    private void exitPractice() throws Exception {
        back(); waitFor("document.querySelector('dialog[open]')");
        textButton("dialog button", "退出练习"); waitFor("document.querySelector('.a-navigation')");
    }
    private void noOverflow() throws Exception {
        assertEquals("Horizontal overflow", "true", js("document.documentElement.scrollWidth <= innerWidth + 1"));
    }

    @Test public void threeSubjectsWorkOfflineAndKeepProgressAfterRecreation() throws Exception {
        waitFor("window.XingyaNative && document.querySelector('.a-focus-card .a-filled')");
        js("localStorage.removeItem('token');localStorage.removeItem('user');localStorage.removeItem('rm.child');localStorage.setItem('rm.grade','4')");
        activity.getScenario().recreate(); waitFor("document.querySelector('.a-focus-card .a-filled')");
        assertEquals("\"android\"", js("window.XingyaNative.platform"));
        assertEquals("true", js("Capacitor.isPluginAvailable('XingyaSpeech')"));
        assertNull(((ConnectivityManager) InstrumentationRegistry.getInstrumentation().getTargetContext().getSystemService(Context.CONNECTIVITY_SERVICE)).getActiveNetwork());
        noOverflow(); capture("build2-home");
        click(".a-grade"); waitFor("document.querySelector('dialog[open]')");
        assertEquals("true", js("document.querySelector('dialog').contains(document.activeElement)"));
        capture("build2-grade"); back(); waitFor("!document.querySelector('dialog[open]')");
        assertEquals("true", js("document.activeElement.matches('.a-grade')"));
        js("localStorage.setItem('rm.trial.math','99');localStorage.setItem('rm.trial.english','99');localStorage.setItem('rm.trial.chinese','99')");
        textButton(".a-subjects button", "语文"); textButton(".a-row", "生字学习");
        waitFor("document.querySelector('iframe')?.contentWindow.cnchar");
        js("window.strokeLoaded=false;document.querySelector('iframe').contentWindow.fetch('/vendor/hanzi-data/我.json').then(r=>r.json()).then(d=>window.strokeLoaded=d.strokes.length>0)");
        waitFor("window.strokeLoaded"); capture("build2-chinese-characters");
        back(); waitFor("document.querySelector('.a-focus-card')"); click(".a-focus-card .a-filled");
        waitFor("document.querySelector('iframe')?.contentDocument.querySelector('.library-choice')");
        capture("build2-reading-library");
        js("document.querySelector('iframe').contentDocument.querySelector('.library-choice').click()");
        waitFor("document.querySelector('iframe').contentDocument.querySelector('.reading-choice')");
        js("document.querySelector('iframe').contentDocument.querySelector('.reading-choice').click()");
        waitFor("document.querySelector('iframe').contentDocument.querySelector('.reading-feedback').textContent.length>0");
        capture("build2-chinese-reading");
        back(); waitFor("!document.querySelector('iframe').contentDocument.querySelector('#readingView.active')");
        back(); waitFor("document.querySelector('.a-subjects')");
        textButton(".a-subjects button", "英语"); click(".a-focus-card .a-filled");
        waitFor("document.querySelector('iframe')?.contentDocument.querySelector('.a-vocab-toolbar button')");
        capture("build2-english-vocab");
        js("document.querySelector('iframe').contentDocument.querySelector('.a-vocab-toolbar button').click()");
        waitFor("document.querySelector('iframe').contentDocument.querySelector('dialog[open]')");
        capture("build2-vocab-settings");
        back(); waitFor("!document.querySelector('iframe').contentDocument.querySelector('dialog[open]')");
        back(); waitFor("document.querySelector('.a-subjects')");
        click(".a-list .a-row"); waitFor("document.querySelector('.choice')"); capture("build2-english-question"); click(".choice");
        waitFor("document.querySelector('.wrong-hint') || document.querySelector('.feedback-bar')");
        js("window.savedCount=0;const r=indexedDB.open('rocket-math');r.onsuccess=()=>{const q=r.result.transaction('students').objectStore('students').get('local');q.onsuccess=()=>{window.savedCount=q.result?.xp || 0;r.result.close()}};");
        waitFor("window.savedCount>0"); capture("build2-english-feedback");
        String savedXp = js("window.savedCount"); exitPractice();
        textButton(".a-subjects button", "数学"); textButton(".a-row", "按知识点练习");
        waitFor("document.querySelector('.a-course-unit')"); capture("build2-courses");
        textButton(".a-row", "三位数乘两位数");
        waitFor("document.querySelector('.native-answer-input .key')");
        assertEquals("true", js("document.querySelector('.native-answer-input input').readOnly"));
        click(".native-answer-input .key");
        textButton(".native-answer-input .key", "."); click(".native-answer-input .key"); click(".native-answer-input .key-sign");
        assertEquals("\"-1.1\"", js("document.querySelector('.native-answer-input input').value"));
        capture("build2-math-keypad");
        // Both toolbar and system Back share the same leave confirmation.
        click(".play-head .ghost"); waitFor("document.querySelector('dialog[open]')");
        textButton("dialog button", "继续练习"); waitFor("!document.querySelector('dialog[open]')");
        exitPractice(); textButton(".a-navigation button", "进度"); capture("build2-progress");
        back(); waitFor("document.querySelector('.a-subjects')"); textButton(".a-navigation button", "我的");
        capture("build2-me"); textButton(".a-wide", "登录 / 注册"); waitFor("document.querySelector('.a-form')"); capture("build2-login");
        // Exercise the new account form's offline error without contacting a live account.
        js("const inputs=document.querySelectorAll('.a-form input');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(inputs[0],'offline-fixture');inputs[0].dispatchEvent(new Event('input',{bubbles:true}));setter.call(inputs[1],'fixture-only-not-a-secret');inputs[1].dispatchEvent(new Event('input',{bubbles:true}))");
        click(".a-form button[type=submit]"); waitFor("document.querySelector('.a-error')");
        assertEquals("true", js("document.querySelector('.a-error').textContent.includes('联网后重试')"));
        back(); waitFor("document.querySelector('.a-navigation')");
        activity.getScenario().recreate(); waitFor("document.querySelector('.a-focus-card')");
        assertEquals("\"4\"", js("localStorage.getItem('rm.grade')"));
        js("window.savedCount=0;const r=indexedDB.open('rocket-math');r.onsuccess=()=>{const q=r.result.transaction('students').objectStore('students').get('local');q.onsuccess=()=>{window.savedCount=q.result?.xp || 0;r.result.close()}};");
        waitFor("window.savedCount>0"); assertEquals(savedXp, js("window.savedCount"));
        js("const u=new SpeechSynthesisUtterance('test');u.lang='zz-ZZ';speechSynthesis.speak(u)");
        waitFor("document.querySelector('[role=alert]')?.textContent.includes('离线语音包')");
        js("localStorage.setItem('token','offline-test-fixture');localStorage.setItem('user',JSON.stringify({id:42,username:'offline-fixture',role:'user'}));localStorage.setItem('rm.child',JSON.stringify({id:7,name:'offline-child',avatar:'🌱',grade:4}))");
        activity.getScenario().recreate(); waitFor("document.querySelector('.a-navigation')"); textButton(".a-navigation button", "我的");
        waitFor("document.querySelector('.a-profile h2')?.textContent==='offline-fixture'");
        js("window.offlineRequestFailed=false;fetch('/api/auth/me').catch(()=>window.offlineRequestFailed=true)"); waitFor("window.offlineRequestFailed");
        assertEquals("\"offline-test-fixture\"", js("localStorage.getItem('token')"));
        assertEquals("true", js("document.querySelector('.a-profile p').textContent.includes('offline-child')"));
    }

    /** Run at externally configured sizes/themes; asserts geometry and captures actual rendering. */
    @Test public void layoutAtConfiguredDisplay() throws Exception {
        waitFor("document.querySelector('.a-focus-card .a-filled')"); noOverflow();
        String label = InstrumentationRegistry.getArguments().getString("layoutLabel", "default");
        capture("build2-layout-" + label);
        assertEquals("true", js("[...document.querySelectorAll('.a-navigation button,.a-subjects button,.a-grade,.a-filled')].every(b=>b.getBoundingClientRect().height>=48)"));
        click(".a-grade"); waitFor("document.querySelector('dialog[open]')"); noOverflow(); capture("build2-layout-" + label + "-sheet");
        back(); waitFor("!document.querySelector('dialog[open]')");
        textButton(".a-navigation button", "进度"); noOverflow(); capture("build2-layout-" + label + "-progress");
        textButton(".a-navigation button", "我的"); noOverflow(); capture("build2-layout-" + label + "-me");
        textButton(".a-navigation button", "学习"); textButton(".a-subjects button", "语文");
        click(".a-focus-card .a-filled"); waitFor("document.querySelector('iframe')?.contentDocument.querySelector('.library-choice')");
        assertEquals("Reading overflow", "true", js("document.querySelector('iframe').contentDocument.documentElement.scrollWidth <= document.querySelector('iframe').contentWindow.innerWidth + 1"));
        capture("build2-layout-" + label + "-reading");
        back(); waitFor("document.querySelector('.a-subjects')"); textButton(".a-row", "生字学习");
        waitFor("document.querySelector('iframe')?.contentDocument.querySelector('.a-character-picker')");
        System.out.println("CHAR_STYLE=" + js("(()=>{const w=document.querySelector('iframe').contentWindow,d=w.document,b=d.querySelector('.tabs button.active'),s=w.getComputedStyle(b);return JSON.stringify({page:d.body.dataset.aPage,background:s.backgroundColor,color:s.color,theme:w.matchMedia('(prefers-color-scheme: dark)').matches,primary:s.getPropertyValue('--a-primary'),sheets:[...d.styleSheets].map(s=>s.href)})})()"));
        waitFor("document.querySelector('iframe')?.contentDocument.querySelector('#writer-target path')");
        capture("build2-layout-" + label + "-characters");
        back(); waitFor("document.querySelector('.a-subjects')"); textButton(".a-subjects button", "英语");
        click(".a-focus-card .a-filled"); waitFor("document.querySelector('iframe')?.contentDocument.querySelector('.headline')");
        assertEquals("Vocabulary overflow", "true", js("document.querySelector('iframe').contentDocument.documentElement.scrollWidth <= document.querySelector('iframe').contentWindow.innerWidth + 1"));
        capture("build2-layout-" + label + "-vocab");
    }
}
