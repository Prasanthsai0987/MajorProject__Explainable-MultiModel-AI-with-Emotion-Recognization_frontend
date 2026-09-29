import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import usePageTitle from "../hooks/usePageTitle";
import {
  RiPauseLine, RiPlayLine, RiStopCircleLine,
  RiMicAiLine, RiMicOffLine, RiEmotionHappyLine,
  RiTimeLine,
} from "react-icons/ri";
import { PiVideoCameraBold, PiVideoCameraSlashBold } from "react-icons/pi";
import "./LivePracticePage.css";

/* ── Speaking prompts per mode ── */
const PROMPTS = {
  fluency: [
    "Describe your typical day at work or school. What activities do you usually do, and how do you feel about your daily routine?",
    "Tell me about a recent challenge you faced and how you overcame it. What did you learn from that experience?",
    "Describe your favourite place and explain why it is meaningful to you.",
  ],
  pronunciation: [
    "Read aloud: 'The thirty-three thieves thought that they thrilled the throne throughout Thursday.'",
    "Say clearly: 'She sells seashells by the seashore and the shells she sells are seashells, I'm sure.'",
    "Repeat: 'How much wood would a woodchuck chuck if a woodchuck could chuck wood?'",
  ],
  roleplay: {
    interview:    "Interviewer: Tell me about yourself and why you are the best candidate for this position.",
    restaurant:   "Waiter: Good evening! Welcome. Can I start you off with something to drink?",
    presentation: "You are presenting to the board. Begin: 'Good morning everyone, today I will walk you through our Q3 results...'",
    phone:        "Caller: Hello, I'm calling to schedule an appointment. Is Dr. Smith available this week?",
  },
  cefr: [
    "Describe the advantages and disadvantages of social media in modern society.",
    "What changes would you make to the education system in your country and why?",
    "Talk about a global issue that concerns you the most and suggest a solution.",
  ],
};

const EMOTION_LABELS = ["Confident", "Nervous", "Neutral", "Engaged", "Hesitant"];
const EMOTION_COLORS = {
  Confident: "#2EECC5",
  Nervous:   "#FF6B82",
  Neutral:   "#9AA3C2",
  Engaged:   "#7B6EF6",
  Hesitant:  "#F6A94A",
};

const SESSION_DURATION = 10 * 60;

const MODE_LABELS = {
  fluency:       "Fluency Training",
  pronunciation: "Pronunciation Drill",
  roleplay:      "Scenario Roleplay",
  cefr:          "CEFR Assessment",
};

const WaveBar = () => (
  <div className="waveform">
    <span /><span /><span /><span /><span />
  </div>
);

export default function LivePracticePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state    = location.state || {};
  const { mode, scenario, cefrTarget } = state;

  usePageTitle("Live Practice — VoxIQ");

  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const timerRef  = useRef(null);

  const [cameraOn,    setCameraOn]    = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [micOn,       setMicOn]       = useState(true);
  const [isPaused,    setIsPaused]    = useState(false);
  const [elapsed,     setElapsed]     = useState(0);
  const [emotion,     setEmotion]     = useState("Confident");
  const [wpm,         setWpm]         = useState(72);
  const [db,          setDb]          = useState(-18);
  const [promptIndex, setPromptIndex] = useState(0);




  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const [transcript, setTranscript] = useState("");
const recognitionRef = useRef(null);
const fullTranscriptRef = useRef("");

useEffect(() => {
  let mounted = true;

  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((mediaStream) => {
      if (!mounted) return;

      streamRef.current = mediaStream;

      if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play().catch((err) => {
          console.error("Video play error:", err);
        });
      };
    }
      setCameraOn(true);
      setMicOn(true);
      setCameraError("");

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: "video/webm"
      });


      mediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, {
          type: "video/webm"
        });

        stopSpeechToText();

        // navigation is driven solely by this call
        sendSessionToBackend(videoBlob);

        // fire-and-forget — does NOT affect navigation
        const timestamp = Date.now();
        sendVideoToML(videoBlob, timestamp);

        streamRef.current?.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
    })
    .catch((err) => {
      console.error("Camera error:", err);
      setCameraError("Camera access denied or unavailable.");
      setCameraOn(false);
    });

  return () => {
    mounted = false;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
  };
}, []);


const sendVideoToML = (videoBlob, timestamp) => {
  const formData = new FormData();
  formData.append("video", videoBlob, `video_${timestamp}.webm`);

  fetch("http://127.0.0.1:8000/upload-video", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(data => console.log("Video ML:", data))
    .catch(err => console.error("Video error:", err));
};


const startSpeechToText = () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech Recognition not supported in this browser");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";


  recognition.onresult = (event) => {
    let interim = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        fullTranscriptRef.current += text + " ";
        setTranscript(prev => prev + text + " ");
      } else {
        interim += text;
      }
    }
    // show live text (UI only)
    // setTranscript(prev => prev + finalText);
  };
  recognition.start();
  recognitionRef.current = recognition;
};

const stopSpeechToText = () => {
  recognitionRef.current?.stop();

};

useEffect(() => {
  startSpeechToText();

  return () => {
    stopSpeechToText();
  };
}, []);

const sendSessionToBackend = (videoBlob) => {
  const formData = new FormData();
  formData.append("video", videoBlob, "session.webm");
  formData.append("transcript", fullTranscriptRef.current);

  fetch("http://127.0.0.1:8000/analyze-session", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      console.log("Full Analysis:", data);

      const sessionResults = {
        ...data.video_analysis,
        ...data.speech_analysis,
        mfcc: data.speech_analysis.mfcc != null ? [data.speech_analysis.mfcc] : [],
        feedback: data.speech_analysis.feedback ? [data.speech_analysis.feedback] : [],
      };

      navigate("/session/results", {
        state: { sessionResults }
      });
    })
    .catch(err => {
      console.error("Error:", err);
      navigate("/session/results", {
        state: { sessionResults: {} }
      });
    });
};

const sendTextToML = (text, timestamp) => {
  const formData = new FormData();
  formData.append("transcript", text);
  formData.append("filename", `text_${timestamp}.txt`);

  fetch("http://127.0.0.1:8000/upload-text", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(data => console.log("Text ML:", data))
    .catch(err => console.error("Text error:", err));
};

  /* ── Timer ── */
  useEffect(() => {
    if (isPaused) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setElapsed(p => {
        if (p >= SESSION_DURATION) { clearInterval(timerRef.current); return p; }
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isPaused]);


  /* ── Helpers ── */
  const fmt = (s) => {
    const m   = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const getPrompt = () => {
    if (mode === "roleplay" && scenario) return PROMPTS.roleplay?.[scenario] || PROMPTS.fluency[0];
    const list = PROMPTS[mode] || PROMPTS.fluency;
    return list[promptIndex % list.length];
  };

  const handleToggleCamera = () => {
    if (!streamRef.current) {
      /* stream not yet started — request camera now */
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setCameraOn(true);
          setMicOn(true);
        })
        .catch(() => setCameraError("Camera access denied."));
      return;
    }
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      const newState = !videoTrack.enabled;
      videoTrack.enabled = newState;
      setCameraOn(newState);        /* ON = track enabled, OFF = track disabled */
    }
  };

  const handleToggleMic = () => {
    if (!streamRef.current) return;
    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const newState = !audioTrack.enabled;
      audioTrack.enabled = newState;
      setMicOn(newState);           /* ON = track enabled, OFF = track disabled */
    }
  };

  const [showEndModal, setShowEndModal] = useState(false);

  const handleEnd = () => {
    setIsPaused(true);
    setShowEndModal(true);
  };
  const handleConfirmEnd = () => {
  // 🔴 stop recording (this triggers onstop → API call)
  if (
    mediaRecorderRef.current &&
    mediaRecorderRef.current.state !== "inactive"
  ) {
    mediaRecorderRef.current.stop();
  }

  // 🧠 stop speech recognition
  stopSpeechToText();

  clearInterval(timerRef.current);

  setCameraOn(false);
  setMicOn(false);
  setShowEndModal(false);
};

  // const handleConfirmEnd = () => {
  //   streamRef.current?.getTracks().forEach(t => t.stop());
  //   clearInterval(timerRef.current);
  //   const results = {
  //     fluency_score:    parseFloat((0.5 + Math.random() * 0.45).toFixed(2)),
  //     confidence_score: parseFloat((0.4 + Math.random() * 0.55).toFixed(2)),
  //     emotion_label:    emotion.toLowerCase(),
  //     emotion_score:    parseFloat((0.5 + Math.random() * 0.45).toFixed(2)),
  //     lip_sync_mse:     parseFloat((0.02 + Math.random() * 0.1).toFixed(3)),
  //     cefr_level:       cefrTarget || "B1",
  //     elapsed,
  //     mode,
  //     scenario,
  //   };
  //   navigate("/session/results", { state: { sessionResults: results } });
  // };

  const progress     = (elapsed / SESSION_DURATION) * 100;
  const promptList   = PROMPTS[mode] || PROMPTS.fluency;
  const hasNextPrompt = mode !== "roleplay" && Array.isArray(promptList) && promptList.length > 1;

  return (
    <div className="lp-wrapper">
      <div className="lp-orb lp-orb-1" />
      <div className="lp-orb lp-orb-2" />
      <div className="lp-wave-left"><WaveBar /></div>
      <div className="lp-wave-right"><WaveBar /></div>

      {/* ══ NAVBAR — VoxIQ left · Live Session centre ══ */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">

          {/* left — VoxIQ logo */}
          <div className="lp-logo" onClick={() => navigate("/home")}>
            <div className="lp-logo-dots">
              <span className="lp-dot lp-dot-purple" />
              <span className="lp-dot lp-dot-cyan" />
            </div>
            <span className="lp-logo-text">
              Vox<span className="lp-gradient">IQ</span>
            </span>
          </div>

          {/* centre — Live Session badge */}
          <div className="lp-live-badge">
            <span className="lp-live-dot" />
            <span>Live Session</span>
          </div>

          {/* right — spacer keeps centre truly centred */}
          <div className="lp-nav-spacer" />

        </div>
      </nav>

      {/* ══ BODY ══ */}
      <main className="lp-main">

        {/* ── Top row: session info centred + recording top-right ── */}
        <div className="lp-top-row">
          <div className="lp-session-label">
            <span className="lp-session-mode">{MODE_LABELS[mode] || "Practice"}</span>
            {cefrTarget && (
              <>
                <span className="lp-session-sep">•</span>
                <span className="lp-session-cefr">{cefrTarget} Level</span>
              </>
            )}
          </div>
          <div className="lp-rec-badge">
            <span className="lp-rec-dot" />
            <span>Recording</span>
          </div>
        </div>

        {/* ══ DESKTOP: camera left | prompt+waveform right ══ */}
        <div className="lp-content-row">

          {/* ── LEFT: Camera box ── */}
          <div className="lp-camera-box">

            

            {/* live video OR placeholder */}
            <video ref={videoRef} className="lp-video" autoPlay playsInline muted />
            {!cameraOn && (
              <div className="lp-cam-placeholder">
                <PiVideoCameraSlashBold className="lp-cam-ph-icon" />
                <span>{cameraError || "Starting camera..."}</span>
              </div>
            )}

            {/* bottom: camera + mic toggles left, HD badge right */}
            <div className="lp-cam-badges">
              <div className="lp-cam-toggles">
                <button
                  className={`lp-toggle-btn ${!cameraOn ? "off" : ""}`}
                  onClick={handleToggleCamera}
                  title={cameraOn ? "Turn off camera" : "Turn on camera"}
                >
                  {cameraOn
                    ? <PiVideoCameraBold      className="lp-toggle-icon" />
                    : <PiVideoCameraSlashBold className="lp-toggle-icon" />
                  }
                </button>
                <button
                  className={`lp-toggle-btn ${!micOn ? "off" : ""}`}
                  onClick={handleToggleMic}
                  title={micOn ? "Mute mic" : "Unmute mic"}
                >
                  {micOn
                    ? <RiMicAiLine  className="lp-toggle-icon" />
                    : <RiMicOffLine className="lp-toggle-icon" />
                  }
                </button>
              </div>
              <span className="lp-cam-badge">HD</span>
            </div>

          </div>

          {/* ── RIGHT: Prompt + Waveform ── */}
          <div className="lp-right-panel">

            {/* Speaking prompt */}
            <div className="lp-prompt-box">
              <span className="lp-prompt-tag">SPEAKING PROMPT</span>
              <p className="lp-prompt-text">"{getPrompt()}"</p>
              {hasNextPrompt && (
                <button className="lp-prompt-next" onClick={() => setPromptIndex(p => p + 1)}>
                  Next prompt →
                </button>
              )}
            </div>


          {/* Transcript data */}
          <div className="lp-transcription-box">
            <div className="lp-transcription-title">Live Transcription</div>
              <textarea
                value={transcript}
                placeholder="Start speaking..."
                readOnly
              />
            </div>

          </div>

        </div>


        <div className="lp-timer-section">
          <div className="lp-timer">
            <span className="lp-timer-now">{fmt(elapsed)}</span>
            <span className="lp-timer-total">/ {fmt(SESSION_DURATION)}</span>
          </div>
          <div className="lp-progress-track">
            <div
              className="lp-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        
        <div className="lp-controls">
          <button
            className={`lp-btn-pause ${isPaused ? "is-paused" : ""}`}
            onClick={() => setIsPaused(p => !p)}
          >
            {isPaused
              ? <><RiPlayLine  className="lp-ctrl-icon" /> Resume</>
              : <><RiPauseLine className="lp-ctrl-icon" /> Pause</>
            }
          </button>

          <button className="lp-btn-end" onClick={handleEnd}>
            <RiStopCircleLine className="lp-ctrl-icon" /> End Session
          </button>
        </div>

        <p className="lp-footer-hint">💡 Speak naturally. Take your time.</p>

      </main>

      {/* ══ END SESSION MODAL ══ */}
      {showEndModal && (
        <div className="lp-modal-backdrop">
          <div className="lp-modal">
            <h2 className="lp-modal-title">End Practice Session?</h2>
            <p className="lp-modal-desc">
              You've been practicing for <strong>{fmt(elapsed)}</strong>.<br />
              Your progress will be saved and analysed.
            </p>
            <div className="lp-modal-actions">
              <button
                className="lp-modal-btn-cancel"
                onClick={() => { setShowEndModal(false); setIsPaused(false); }}
              >
                Continue Practice
              </button>
              <button className="lp-modal-btn-confirm" onClick={handleConfirmEnd}>
                End &amp; View Results
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
