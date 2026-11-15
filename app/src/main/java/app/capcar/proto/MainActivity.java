package app.capcar.proto;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Locale;

public class MainActivity extends Activity implements RecognitionListener, TextToSpeech.OnInitListener {

    private static final int MIC_REQUEST = 11;
    private static final int CAR_REQUEST = 12;
    private static final String CAR_SPEED_PERMISSION = "android.car.permission.CAR_SPEED";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView webView;

    private SpeechRecognizer recognizer;
    private boolean wantListen;

    private TextToSpeech speaker;
    private boolean speakerReady;

    private CarReader carReader;
    private boolean readingCar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        webView = new WebView(this);
        webView.setBackgroundColor(0xFFF2F4F6);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setTextZoom(100);
        webView.addJavascriptInterface(this, "CapCarNative");
        webView.loadUrl("file:///android_asset/index.html");
        setContentView(webView);

        speaker = new TextToSpeech(this, this);
    }

    @Override
    protected void onDestroy() {
        readingCar = false;
        handler.removeCallbacksAndMessages(null);
        if (recognizer != null) {
            recognizer.destroy();
        }
        if (speaker != null) {
            speaker.stop();
            speaker.shutdown();
        }
        webView.destroy();
        super.onDestroy();
    }

    private void runJs(String code) {
        handler.post(() -> webView.evaluateJavascript(code, null));
    }

    @JavascriptInterface
    public void startListening() {
        handler.post(() -> startRecognition());
    }

    @JavascriptInterface
    public void stopListening() {
        handler.post(() -> stopRecognition());
    }

    @JavascriptInterface
    public void speak(String text) {
        handler.post(() -> speakNow(text));
    }

    @JavascriptInterface
    public void stopSpeaking() {
        handler.post(() -> speaker.stop());
    }

    @JavascriptInterface
    public void setVehiclePolling(boolean on) {
        handler.post(() -> setReadingCar(on));
    }

    private void startRecognition() {
        wantListen = true;
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_REQUEST);
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            runJs("onListenError('service-not-allowed')");
            return;
        }
        if (recognizer == null) {
            recognizer = SpeechRecognizer.createSpeechRecognizer(this);
            recognizer.setRecognitionListener(this);
        } else {
            recognizer.cancel();
        }

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ko-KR");
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        recognizer.startListening(intent);
    }

    private void stopRecognition() {
        wantListen = false;
        if (recognizer != null) {
            recognizer.cancel();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != MIC_REQUEST) {
            return;
        }
        boolean allowed = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (!allowed) {
            runJs("onListenError('not-allowed')");
        } else if (wantListen) {
            startRecognition();
        }
    }

    private String firstText(Bundle results) {
        ArrayList<String> texts = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (texts == null || texts.isEmpty()) {
            return "";
        }
        return texts.get(0);
    }

    private String errorName(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_NO_MATCH:
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "no-speech";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "not-allowed";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
            case SpeechRecognizer.ERROR_SERVER:
                return "network";
            case SpeechRecognizer.ERROR_AUDIO:
                return "audio-capture";
            case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED:
            case SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE:
                return "language-not-supported";
            default:
                return "aborted";
        }
    }

    @Override
    public void onPartialResults(Bundle results) {
        String text = firstText(results);
        if (!text.isEmpty()) {
            runJs("onHeard(" + JSONObject.quote(text) + ", false)");
        }
    }

    @Override
    public void onResults(Bundle results) {
        String text = firstText(results);
        if (!text.isEmpty()) {
            runJs("onHeard(" + JSONObject.quote(text) + ", true)");
        }
        runJs("onListenEnd()");
    }

    @Override
    public void onError(int error) {
        if (!wantListen) {
            return;
        }
        runJs("onListenError('" + errorName(error) + "')");
        runJs("onListenEnd()");
    }

    @Override
    public void onReadyForSpeech(Bundle params) {
    }

    @Override
    public void onBeginningOfSpeech() {
    }

    @Override
    public void onRmsChanged(float volume) {
    }

    @Override
    public void onBufferReceived(byte[] buffer) {
    }

    @Override
    public void onEndOfSpeech() {
    }

    @Override
    public void onEvent(int eventType, Bundle params) {
    }

    @Override
    public void onInit(int status) {
        speakerReady = status == TextToSpeech.SUCCESS;
        if (!speakerReady) {
            return;
        }
        speaker.setLanguage(Locale.KOREAN);
        speaker.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override
            public void onStart(String id) {
            }

            @Override
            public void onDone(String id) {
                runJs("onSpeakDone()");
            }

            @Override
            public void onError(String id) {
                runJs("onSpeakDone()");
            }
        });
    }

    private void speakNow(String text) {
        if (!speakerReady) {
            runJs("onSpeakDone()");
            return;
        }
        speaker.speak(text, TextToSpeech.QUEUE_FLUSH, null, "capcar");
    }

    private void setReadingCar(boolean on) {
        readingCar = on;
        if (!on) {
            return;
        }
        if (checkSelfPermission(CAR_SPEED_PERMISSION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{CAR_SPEED_PERMISSION}, CAR_REQUEST);
        }
        if (carReader == null) {
            try {
                carReader = new CarReader(this);
            } catch (Throwable error) {
                carReader = null;
            }
        }
        readCar();
    }

    private void readCar() {
        if (!readingCar) {
            return;
        }
        if (carReader == null) {
            runJs("onCarValues(false, null, null)");
            return;
        }
        runJs("onCarValues(true, " + carReader.speedText() + ", " + carReader.gearText() + ")");
        handler.postDelayed(() -> readCar(), 500);
    }
}
