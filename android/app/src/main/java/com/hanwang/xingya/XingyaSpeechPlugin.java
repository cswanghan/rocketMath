package com.hanwang.xingya;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;
import java.util.UUID;

/** Uses installed, non-network voices. No text is sent to a speech service. */
@CapacitorPlugin(name = "XingyaSpeech")
public class XingyaSpeechPlugin extends Plugin {
    private TextToSpeech engine;
    private boolean ready;
    private PluginCall active;
    private String utteranceId;

    @PluginMethod public void speak(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            stopCurrent();
            String text = call.getString("text", "");
            if (text.isBlank() || text.length() > TextToSpeech.getMaxSpeechInputLength()) {
                call.reject("朗读文本为空或过长"); return;
            }
            active = call;
            if (engine == null) {
                engine = new TextToSpeech(getContext(), status -> getActivity().runOnUiThread(() -> {
                    ready = status == TextToSpeech.SUCCESS;
                    if (!ready) { fail("系统朗读不可用"); engine.shutdown(); engine = null; return; }
                    engine.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                        @Override public void onStart(String id) {}
                        @Override public void onDone(String id) { finish(id, null); }
                        @Override public void onError(String id) { finish(id, "朗读失败"); }
                        @Override public void onStop(String id, boolean interrupted) { finish(id, null); }
                    });
                    speakActive();
                }));
            } else if (ready) speakActive();
            // While initialization is pending, keep only the latest request.
        });
    }

    private void speakActive() {
        if (active == null) return;
        Locale locale = Locale.forLanguageTag(active.getString("language", "zh-CN"));
        Voice selected = null;
        if (engine.getVoices() != null) for (Voice voice : engine.getVoices()) {
            if (!voice.isNetworkConnectionRequired() && (voice.getFeatures() == null || !voice.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) && voice.getLocale().getLanguage().equals(locale.getLanguage())) {
                if (selected == null || voice.getLocale().equals(locale)) selected = voice;
                if (voice.getLocale().equals(locale)) break;
            }
        }
        if (selected == null || engine.setVoice(selected) == TextToSpeech.ERROR) {
            fail("请安装对应语言的离线语音包"); return;
        }
        engine.setSpeechRate(Math.max(0.5f, Math.min(2f, active.getFloat("rate", 1f))));
        utteranceId = UUID.randomUUID().toString();
        if (engine.speak(active.getString("text", ""), TextToSpeech.QUEUE_FLUSH, new Bundle(), utteranceId) == TextToSpeech.ERROR) {
            fail("无法开始朗读");
        }
    }
    private void finish(String id, String error) {
        getActivity().runOnUiThread(() -> {
            if (id == null || !id.equals(utteranceId) || active == null) return;
            PluginCall call = active; active = null; utteranceId = null;
            if (error == null) call.resolve(); else call.reject(error);
        });
    }
    private void fail(String message) {
        PluginCall call = active; active = null; utteranceId = null;
        if (call != null) call.reject(message);
    }
    private void stopCurrent() {
        utteranceId = null;
        if (engine != null) engine.stop();
        if (active != null) { active.resolve(); active = null; }
    }
    @PluginMethod public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> { stopCurrent(); call.resolve(); });
    }
    @Override protected void handleOnPause() { stopCurrent(); }
    @Override protected void handleOnDestroy() {
        stopCurrent();
        if (engine != null) { engine.shutdown(); engine = null; }
        ready = false;
    }
}
