import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import usePageTitle from "../hooks/usePageTitle";

import {
  RiPauseLine,
  RiPlayLine,
  RiStopCircleLine,
  RiMicAiLine,
  RiMicOffLine,
} from "react-icons/ri";

import {
  PiVideoCameraBold,
  PiVideoCameraSlashBold,
} from "react-icons/pi";

import "./LivePracticePage.css";

/* =========================================================
   API CONFIGURATION
   ========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:10000";


/* =========================================================
   SPEAKING PROMPTS
   ========================================================= */

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
    interview:
      "Interviewer: Tell me about yourself and why you are the best candidate for this position.",

    restaurant:
      "Waiter: Good evening! Welcome. Can I start you off with something to drink?",

    presentation:
      "You are presenting to the board. Begin: 'Good morning everyone, today I will walk you through our Q3 results...'",

    phone:
      "Caller: Hello, I'm calling to schedule an appointment. Is Dr. Smith available this week?",
  },

  cefr: [
    "Describe the advantages and disadvantages of social media in modern society.",

    "What changes would you make to the education system in your country and why?",

    "Talk about a global issue that concerns you the most and suggest a solution.",
  ],
};


/* =========================================================
   EMOTION
   ========================================================= */

const EMOTION_LABELS = [
  "Confident",
  "Nervous",
  "Neutral",
  "Engaged",
  "Hesitant",
];

const EMOTION_COLORS = {
  Confident: "#2EECC5",
  Nervous: "#FF6B82",
  Neutral: "#9AA3C2",
  Engaged: "#7B6EF6",
  Hesitant: "#F6A94A",
};


/* =========================================================
   SESSION
   ========================================================= */

const SESSION_DURATION = 10 * 60;

const MODE_LABELS = {
  fluency: "Fluency Training",
  pronunciation: "Pronunciation Drill",
  roleplay: "Scenario Roleplay",
  cefr: "CEFR Assessment",
};


/* =========================================================
   WAVE BAR
   ========================================================= */

const WaveBar = () => (
  <div className="waveform">
    <span />
    <span />
    <span />
    <span />
    <span />
  </div>
);


/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function LivePracticePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state || {};

  const {
    mode,
    scenario,
    cefrTarget,
  } = state;

  usePageTitle("Live Practice — VoxIQ");


  /* =======================================================
     REFS
     ======================================================= */

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);

  const recognitionRef = useRef(null);
  const fullTranscriptRef = useRef("");


  /* =======================================================
     STATE
     ======================================================= */

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const [micOn, setMicOn] = useState(true);

  const [isPaused, setIsPaused] = useState(false);

  const [elapsed, setElapsed] = useState(0);

  const [emotion, setEmotion] = useState("Confident");

  const [wpm, setWpm] = useState(72);

  const [db, setDb] = useState(-18);

  const [promptIndex, setPromptIndex] = useState(0);

  const [transcript, setTranscript] = useState("");

  const [showEndModal, setShowEndModal] = useState(false);


  /* =======================================================
     CAMERA + MEDIA RECORDER
     ======================================================= */

  useEffect(() => {
    let mounted = true;

    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((mediaStream) => {
        if (!mounted) {
          mediaStream
            .getTracks()
            .forEach((track) => track.stop());

          return;
        }

        streamRef.current = mediaStream;


        /* -----------------------------------------------
           Attach camera stream to video element
           ----------------------------------------------- */

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;

          videoRef.current.onloadedmetadata = () => {
            videoRef.current
              .play()
              .catch((err) => {
                console.error(
                  "Video play error:",
                  err
                );
              });
          };
        }


        setCameraOn(true);
        setMicOn(true);
        setCameraError("");


        /* -----------------------------------------------
           Media Recorder
           ----------------------------------------------- */

        let mediaRecorder;

        try {
          mediaRecorder = new MediaRecorder(
            mediaStream,
            {
              mimeType: "video/webm",
            }
          );
        } catch (error) {
          console.error(
            "MediaRecorder initialization error:",
            error
          );

          setCameraError(
            "Video recording is not supported in this browser."
          );

          return;
        }


        mediaRecorderRef.current =
          mediaRecorder;

        videoChunksRef.current = [];


        /* -----------------------------------------------
           Video chunks
           ----------------------------------------------- */

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            videoChunksRef.current.push(
              event.data
            );
          }
        };


        /* -----------------------------------------------
           Recording stopped
           ----------------------------------------------- */

        mediaRecorder.onstop = () => {
          const videoBlob = new Blob(
            videoChunksRef.current,
            {
              type: "video/webm",
            }
          );


          /* Stop speech recognition */
          stopSpeechToText();


          /* Send complete session for analysis */
          sendSessionToBackend(videoBlob);


          /* Optional separate video ML call */
          const timestamp = Date.now();

          sendVideoToML(
            videoBlob,
            timestamp
          );


          /* Stop camera/microphone */
          streamRef.current
            ?.getTracks()
            .forEach((track) =>
              track.stop()
            );
        };


        /* Start recording */
        mediaRecorder.start();

      })
      .catch((error) => {
        console.error(
          "Camera error:",
          error
        );

        setCameraError(
          "Camera access denied or unavailable."
        );

        setCameraOn(false);
      });


    /* -----------------------------------------------
       Cleanup
       ----------------------------------------------- */

    return () => {
      mounted = false;


      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !==
          "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }


      streamRef.current
        ?.getTracks()
        .forEach((track) =>
          track.stop()
        );
    };
  }, []);


  /* =======================================================
     SEND VIDEO TO ML BACKEND
     ======================================================= */

  const sendVideoToML = (
    videoBlob,
    timestamp
  ) => {
    const formData = new FormData();

    formData.append(
      "video",
      videoBlob,
      `video_${timestamp}.webm`
    );


    console.log(
      "Sending video to:",
      `${API_URL}/upload-video`
    );


    fetch(
      `${API_URL}/upload-video`,
      {
        method: "POST",
        body: formData,
      }
    )
      .then(async (response) => {
        if (!response.ok) {
          const errorText =
            await response.text();

          throw new Error(
            `Video upload failed: ${response.status} ${errorText}`
          );
        }

        return response.json();
      })
      .then((data) => {
        console.log(
          "Video ML:",
          data
        );
      })
      .catch((error) => {
        console.error(
          "Video error:",
          error
        );
      });
  };


  /* =======================================================
     SPEECH TO TEXT
     ======================================================= */

  const startSpeechToText = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;


    if (!SpeechRecognition) {
      console.warn(
        "Speech Recognition is not supported in this browser."
      );

      return;
    }


    const recognition =
      new SpeechRecognition();


    recognition.continuous = true;

    recognition.interimResults = true;

    recognition.lang = "en-US";


    recognition.onresult = (event) => {
      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const text =
          event.results[i][0]
            .transcript;


        if (
          event.results[i].isFinal
        ) {
          fullTranscriptRef.current +=
            text + " ";

          setTranscript(
            (previous) =>
              previous +
              text +
              " "
          );
        }
      }
    };


    recognition.onerror = (event) => {
      console.error(
        "Speech recognition error:",
        event.error
      );
    };


    recognition.onend = () => {
      /*
       * Chrome may automatically stop recognition.
       * Don't restart after the session is ending.
       */
    };


    try {
      recognition.start();

      recognitionRef.current =
        recognition;

    } catch (error) {
      console.error(
        "Speech recognition start error:",
        error
      );
    }
  };


  const stopSpeechToText = () => {
    try {
      recognitionRef.current?.stop();
    } catch (error) {
      console.warn(
        "Speech recognition stop error:",
        error
      );
    }
  };


  /* =======================================================
     START SPEECH RECOGNITION
     ======================================================= */

  useEffect(() => {
    startSpeechToText();


    return () => {
      stopSpeechToText();
    };
  }, []);


  /* =======================================================
     SEND COMPLETE SESSION TO BACKEND
     ======================================================= */

  const sendSessionToBackend = (
    videoBlob
  ) => {
    const formData = new FormData();


    formData.append(
      "video",
      videoBlob,
      "session.webm"
    );


    formData.append(
      "transcript",
      fullTranscriptRef.current
    );


    console.log(
      "Sending session to:",
      `${API_URL}/analyze-session`
    );


    fetch(
      `${API_URL}/analyze-session`,
      {
        method: "POST",
        body: formData,
      }
    )
      .then(async (response) => {
        if (!response.ok) {
          const errorText =
            await response.text();

          throw new Error(
            `Session analysis failed: ${response.status} ${errorText}`
          );
        }

        return response.json();
      })
      .then((data) => {
        console.log(
          "Full Analysis:",
          data
        );


        const speechAnalysis =
          data.speech_analysis || {};

        const videoAnalysis =
          data.video_analysis || {};


        const sessionResults = {
          ...videoAnalysis,

          ...speechAnalysis,


          mfcc:
            speechAnalysis.mfcc !=
            null
              ? [
                  speechAnalysis.mfcc,
                ]
              : [],


          feedback:
            speechAnalysis.feedback
              ? [
                  speechAnalysis.feedback,
                ]
              : [],
        };


        navigate(
          "/session/results",
          {
            state: {
              sessionResults,
            },
          }
        );
      })
      .catch((error) => {
        console.error(
          "Session analysis error:",
          error
        );


        navigate(
          "/session/results",
          {
            state: {
              sessionResults: {},
            },
          }
        );
      });
  };


  /* =======================================================
     SEND TEXT TO ML
     ======================================================= */

  const sendTextToML = (
    text,
    timestamp
  ) => {
    const formData = new FormData();


    formData.append(
      "transcript",
      text
    );


    formData.append(
      "filename",
      `text_${timestamp}.txt`
    );


    console.log(
      "Sending text to:",
      `${API_URL}/upload-text`
    );


    fetch(
      `${API_URL}/upload-text`,
      {
        method: "POST",
        body: formData,
      }
    )
      .then(async (response) => {
        if (!response.ok) {
          const errorText =
            await response.text();

          throw new Error(
            `Text upload failed: ${response.status} ${errorText}`
          );
        }

        return response.json();
      })
      .then((data) => {
        console.log(
          "Text ML:",
          data
        );
      })
      .catch((error) => {
        console.error(
          "Text error:",
          error
        );
      });
  };


  /* =======================================================
     TIMER
     ======================================================= */

  useEffect(() => {
    if (isPaused) {
      clearInterval(
        timerRef.current
      );

      return;
    }


    timerRef.current =
      setInterval(() => {
        setElapsed((previous) => {
          if (
            previous >=
            SESSION_DURATION
          ) {
            clearInterval(
              timerRef.current
            );

            return previous;
          }


          return previous + 1;
        });
      }, 1000);


    return () =>
      clearInterval(
        timerRef.current
      );

  }, [isPaused]);


  /* =======================================================
     HELPERS
     ======================================================= */

  const fmt = (seconds) => {
    const minutes =
      Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");

    const secs =
      (seconds % 60)
        .toString()
        .padStart(2, "0");

    return `${minutes}:${secs}`;
  };


  const getPrompt = () => {
    if (
      mode === "roleplay" &&
      scenario
    ) {
      return (
        PROMPTS.roleplay?.[
          scenario
        ] ||
        PROMPTS.fluency[0]
      );
    }


    const list =
      PROMPTS[mode] ||
      PROMPTS.fluency;


    return list[
      promptIndex % list.length
    ];
  };


  /* =======================================================
     CAMERA TOGGLE
     ======================================================= */

  const handleToggleCamera = () => {
    if (!streamRef.current) {
      navigator.mediaDevices
        ?.getUserMedia({
          video: true,
          audio: true,
        })
        .then((stream) => {
          streamRef.current =
            stream;


          if (videoRef.current) {
            videoRef.current.srcObject =
              stream;
          }


          setCameraOn(true);
          setMicOn(true);
        })
        .catch(() =>
          setCameraError(
            "Camera access denied."
          )
        );


      return;
    }


    const videoTrack =
      streamRef.current.getVideoTracks()[0];


    if (videoTrack) {
      const newState =
        !videoTrack.enabled;


      videoTrack.enabled =
        newState;


      setCameraOn(newState);
    }
  };


  /* =======================================================
     MICROPHONE TOGGLE
     ======================================================= */

  const handleToggleMic = () => {
    if (!streamRef.current) {
      return;
    }


    const audioTrack =
      streamRef.current.getAudioTracks()[0];


    if (audioTrack) {
      const newState =
        !audioTrack.enabled;


      audioTrack.enabled =
        newState;


      setMicOn(newState);
    }
  };


  /* =======================================================
     END SESSION
     ======================================================= */

  const handleEnd = () => {
    setIsPaused(true);

    setShowEndModal(true);
  };


  const handleConfirmEnd = () => {
    /* -----------------------------------------------
       Stop recording.
       This triggers mediaRecorder.onstop()
       ----------------------------------------------- */

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }


    /* Stop speech recognition */

    stopSpeechToText();


    /* Stop timer */

    clearInterval(
      timerRef.current
    );


    setCameraOn(false);

    setMicOn(false);

    setShowEndModal(false);
  };


  /* =======================================================
     UI CALCULATIONS
     ======================================================= */

  const progress =
    (elapsed /
      SESSION_DURATION) *
    100;


  const promptList =
    PROMPTS[mode] ||
    PROMPTS.fluency;


  const hasNextPrompt =
    mode !== "roleplay" &&
    Array.isArray(promptList) &&
    promptList.length > 1;


  /* =======================================================
     UI
     ======================================================= */

  return (
    <div className="lp-wrapper">

      <div className="lp-orb lp-orb-1" />

      <div className="lp-orb lp-orb-2" />

      <div className="lp-wave-left">
        <WaveBar />
      </div>

      <div className="lp-wave-right">
        <WaveBar />
      </div>


      {/* ===================================================
          NAVBAR
          =================================================== */}

      <nav className="lp-nav">

        <div className="lp-nav-inner">

          <div
            className="lp-logo"
            onClick={() =>
              navigate("/home")
            }
          >

            <div className="lp-logo-dots">

              <span className="lp-dot lp-dot-purple" />

              <span className="lp-dot lp-dot-cyan" />

            </div>


            <span className="lp-logo-text">

              Vox
              <span className="lp-gradient">
                IQ
              </span>

            </span>

          </div>


          <div className="lp-live-badge">

            <span className="lp-live-dot" />

            <span>
              Live Session
            </span>

          </div>


          <div className="lp-nav-spacer" />

        </div>

      </nav>


      {/* ===================================================
          MAIN
          =================================================== */}

      <main className="lp-main">

        {/* Top row */}

        <div className="lp-top-row">

          <div className="lp-session-label">

            <span className="lp-session-mode">

              {MODE_LABELS[mode] ||
                "Practice"}

            </span>


            {cefrTarget && (
              <>
                <span className="lp-session-sep">
                  •
                </span>

                <span className="lp-session-cefr">
                  {cefrTarget} Level
                </span>
              </>
            )}

          </div>


          <div className="lp-rec-badge">

            <span className="lp-rec-dot" />

            <span>
              Recording
            </span>

          </div>

        </div>


        {/* =================================================
            CONTENT ROW
            ================================================= */}

        <div className="lp-content-row">


          {/* LEFT — CAMERA */}

          <div className="lp-camera-box">

            <video
              ref={videoRef}
              className="lp-video"
              autoPlay
              playsInline
              muted
            />


            {!cameraOn && (
              <div className="lp-cam-placeholder">

                <PiVideoCameraSlashBold
                  className="lp-cam-ph-icon"
                />

                <span>
                  {cameraError ||
                    "Starting camera..."}
                </span>

              </div>
            )}


            {/* Camera controls */}

            <div className="lp-cam-badges">

              <div className="lp-cam-toggles">

                <button
                  className={`lp-toggle-btn ${
                    !cameraOn
                      ? "off"
                      : ""
                  }`}
                  onClick={
                    handleToggleCamera
                  }
                  title={
                    cameraOn
                      ? "Turn off camera"
                      : "Turn on camera"
                  }
                >

                  {cameraOn ? (
                    <PiVideoCameraBold
                      className="lp-toggle-icon"
                    />
                  ) : (
                    <PiVideoCameraSlashBold
                      className="lp-toggle-icon"
                    />
                  )}

                </button>


                <button
                  className={`lp-toggle-btn ${
                    !micOn
                      ? "off"
                      : ""
                  }`}
                  onClick={
                    handleToggleMic
                  }
                  title={
                    micOn
                      ? "Mute mic"
                      : "Unmute mic"
                  }
                >

                  {micOn ? (
                    <RiMicAiLine
                      className="lp-toggle-icon"
                    />
                  ) : (
                    <RiMicOffLine
                      className="lp-toggle-icon"
                    />
                  )}

                </button>

              </div>


              <span className="lp-cam-badge">
                HD
              </span>

            </div>

          </div>


          {/* RIGHT — PROMPT */}

          <div className="lp-right-panel">

            <div className="lp-prompt-box">

              <span className="lp-prompt-tag">
                SPEAKING PROMPT
              </span>


              <p className="lp-prompt-text">
                "{getPrompt()}"
              </p>


              {hasNextPrompt && (
                <button
                  className="lp-prompt-next"
                  onClick={() =>
                    setPromptIndex(
                      (previous) =>
                        previous + 1
                    )
                  }
                >
                  Next prompt →
                </button>
              )}

            </div>


            {/* TRANSCRIPTION */}

            <div className="lp-transcription-box">

              <div className="lp-transcription-title">
                Live Transcription
              </div>


              <textarea
                value={transcript}
                placeholder="Start speaking..."
                readOnly
              />

            </div>

          </div>

        </div>


        {/* =================================================
            TIMER
            ================================================= */}

        <div className="lp-timer-section">

          <div className="lp-timer">

            <span className="lp-timer-now">
              {fmt(elapsed)}
            </span>

            <span className="lp-timer-total">
              / {fmt(SESSION_DURATION)}
            </span>

          </div>


          <div className="lp-progress-track">

            <div
              className="lp-progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />

          </div>

        </div>


        {/* =================================================
            CONTROLS
            ================================================= */}

        <div className="lp-controls">

          <button
            className={`lp-btn-pause ${
              isPaused
                ? "is-paused"
                : ""
            }`}
            onClick={() =>
              setIsPaused(
                (previous) =>
                  !previous
              )
            }
          >

            {isPaused ? (
              <>
                <RiPlayLine className="lp-ctrl-icon" />
                Resume
              </>
            ) : (
              <>
                <RiPauseLine className="lp-ctrl-icon" />
                Pause
              </>
            )}

          </button>


          <button
            className="lp-btn-end"
            onClick={handleEnd}
          >

            <RiStopCircleLine className="lp-ctrl-icon" />

            End Session

          </button>

        </div>


        <p className="lp-footer-hint">
          💡 Speak naturally. Take your time.
        </p>

      </main>


      {/* ===================================================
          END SESSION MODAL
          =================================================== */}

      {showEndModal && (

        <div className="lp-modal-backdrop">

          <div className="lp-modal">

            <h2 className="lp-modal-title">
              End Practice Session?
            </h2>


            <p className="lp-modal-desc">

              You've been practicing for{" "}

              <strong>
                {fmt(elapsed)}
              </strong>

              .<br />

              Your progress will be saved and analysed.

            </p>


            <div className="lp-modal-actions">

              <button
                className="lp-modal-btn-cancel"
                onClick={() => {
                  setShowEndModal(false);
                  setIsPaused(false);
                }}
              >
                Continue Practice
              </button>


              <button
                className="lp-modal-btn-confirm"
                onClick={
                  handleConfirmEnd
                }
              >
                End &amp; View Results
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}