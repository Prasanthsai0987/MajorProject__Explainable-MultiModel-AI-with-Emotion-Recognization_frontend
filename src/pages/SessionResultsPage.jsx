import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import usePageTitle from "../hooks/usePageTitle";
import {
  RiArrowLeftLine,
  RiDownloadLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
} from "react-icons/ri";
import { BsRobot } from "react-icons/bs";
import "./SessionResultsPage.css";

/* ── Helpers ── */
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));

const pct = (v) => {
  if (typeof v !== "number" || Number.isNaN(v)) return 0;
  return clamp(Math.round(v * 100));
};

const scoreColor = (s) => {
  if (s >= 85) return "#2EECC5";
  if (s >= 70) return "#7B6EF6";
  if (s >= 55) return "#F6A94A";
  return "#FF6B82";
};

const titleCase = (text) => {
  if (!text || typeof text !== "string") return "N/A";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const average = (arr) => {
  const valid = arr.filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (!valid.length) return 0;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
};

/* ── Circular score ── */
function ScoreCircle({ score, color, size = 80 }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;

  return (
    <svg width={size} height={size}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#252D45"
        strokeWidth="6"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#EDF0FF"
        fontSize={size < 90 ? "16" : "24"}
        fontWeight="800"
        fontFamily="'Syne', sans-serif"
      >
        {score}
      </text>
    </svg>
  );
}

/* ── Radar chart — pure SVG ── */
function RadarChart({ scores }) {
  const cx = 160;
  const cy = 160;
  const r = 100;
  const labels = Object.keys(scores);
  const n = labels.length;
  const step = (2 * Math.PI) / n;

  const pt = (i, radius) => ({
    x: cx + radius * Math.sin(i * step),
    y: cy - radius * Math.cos(i * step),
  });

  const dataPoints = labels.map((k, i) => pt(i, (scores[k] / 100) * r));
  const dataPath =
    dataPoints
      .map(
        (p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      )
      .join(" ") + " Z";

  return (
    <svg width="320" height="320">
      {[0.25, 0.5, 0.75, 1].map((lvl, gi) => {
        const gpts = labels.map((_, i) => pt(i, r * lvl));
        const gpath =
          gpts
            .map(
              (p, i) =>
                `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
            )
            .join(" ") + " Z";

        return (
          <path
            key={gi}
            d={gpath}
            fill="none"
            stroke="#252D45"
            strokeWidth="1"
          />
        );
      })}

      {labels.map((_, i) => {
        const e = pt(i, r);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={e.x.toFixed(1)}
            y2={e.y.toFixed(1)}
            stroke="#252D45"
            strokeWidth="1"
          />
        );
      })}

      <path
        d={dataPath}
        fill="rgba(123,110,246,0.18)"
        stroke="#7B6EF6"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x.toFixed(1)}
          cy={p.y.toFixed(1)}
          r="4"
          fill="#7B6EF6"
          stroke="#EDF0FF"
          strokeWidth="1.5"
        />
      ))}

      {labels.map((k, i) => {
        const lp = pt(i, r + 28);
        return (
          <g key={i}>
            <text
              x={lp.x.toFixed(1)}
              y={(lp.y - 7).toFixed(1)}
              textAnchor="middle"
              fill="#9AA3C2"
              fontSize="11"
              fontFamily="'DM Sans', sans-serif"
            >
              {k}
            </text>
            <text
              x={lp.x.toFixed(1)}
              y={(lp.y + 8).toFixed(1)}
              textAnchor="middle"
              fill="#EDF0FF"
              fontSize="12"
              fontWeight="800"
              fontFamily="'Syne', sans-serif"
            >
              {scores[k]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const WaveBar = () => (
  <div className="waveform">
    <span />
    <span />
    <span />
    <span />
    <span />
  </div>
);

export default function SessionResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  usePageTitle("Session Results — VoxIQ");

  const { sessionResults = {} } = location.state || {};

  useEffect(() => {
    if (!Object.keys(sessionResults).length) {
      navigate("/home", { replace: true });
    }
  }, [sessionResults, navigate]);

  const framesProcessed = sessionResults.frames_processed ?? 0;
  const blinkCount = sessionResults.blink_count ?? 0;
  const dominantEmotion = sessionResults.dominant_emotion || "neutral";
  const emotionDurations = sessionResults.emotion_duration_seconds || {};
  const emotionChanges = sessionResults.emotion_changes_1min ?? 0;
  const clumsyBehavior = Boolean(sessionResults.clumsy_behavior);

  const rawSpeechScore = Number(sessionResults.score ?? 0);
  const rawPhonemeScore = Number(sessionResults.phoneme_score ?? 0);
  const pitch = Number(sessionResults.pitch ?? 0);
  const energy = Number(sessionResults.energy ?? 0);
  const mfcc = Array.isArray(sessionResults.mfcc) ? sessionResults.mfcc : [];
  const feedback = Array.isArray(sessionResults.feedback)
    ? sessionResults.feedback
    : sessionResults.feedback
    ? [sessionResults.feedback]
    : [];

  const fluency =
    rawSpeechScore <= 1 ? pct(rawSpeechScore) : clamp(Math.round(rawSpeechScore));

  const pronunciation =
    rawPhonemeScore <= 1
      ? pct(rawPhonemeScore)
      : clamp(Math.round(rawPhonemeScore));

  const confidence = clamp(
    Math.round(100 - Math.min(blinkCount, 20) * 3 - emotionChanges * 2)
  );

  const emotionScore = clamp(
    Math.round(
      dominantEmotion.toLowerCase() === "confident"
        ? 90
        : dominantEmotion.toLowerCase() === "engaged"
        ? 85
        : dominantEmotion.toLowerCase() === "neutral"
        ? 72
        : dominantEmotion.toLowerCase() === "hesitant"
        ? 58
        : dominantEmotion.toLowerCase() === "nervous"
        ? 50
        : 65
    )
  );

  const grammar = clamp(Math.round(fluency * 0.55 + pronunciation * 0.45));
  const vocabulary = clamp(Math.round(fluency * 0.5 + emotionScore * 0.5));

  const overall = average([
    pronunciation,
    fluency,
    grammar,
    vocabulary,
    emotionScore,
    confidence,
  ]);

  const overallColor = scoreColor(overall);

  const detailScores = [
    { label: "Pronunciation", val: pronunciation, color: "#7B6EF6" },
    { label: "Fluency", val: fluency, color: "#2EECC5" },
    { label: "Grammar", val: grammar, color: "#F6A94A" },
    { label: "Vocabulary", val: vocabulary, color: "#9B8FF8" },
    { label: "Emotion", val: emotionScore, color: "#2EECC5" },
    { label: "Confidence", val: confidence, color: "#F6A94A" },
  ];

  const radarScores = {
    Pronunciation: pronunciation,
    Fluency: fluency,
    Grammar: grammar,
    Vocabulary: vocabulary,
    Emotion: emotionScore,
    Confidence: confidence,
  };

  const strengths = [
    pronunciation >= 75 && "Good pronunciation clarity",
    fluency >= 75 && "Natural speaking pace and rhythm",
    confidence >= 70 && "Stable and composed visual behavior",
    emotionScore >= 75 && "Good emotional expression during speaking",
    blinkCount >= 5 && blinkCount <= 20 && "Healthy eye-contact pattern",
    energy > 0 && "Voice energy captured successfully",
  ].filter(Boolean);

  const improvements = [
    pronunciation < 75 && {
      txt: "Practice phoneme articulation more clearly",
      label: "Pronunciation",
      score: pronunciation,
    },
    fluency < 75 && {
      txt: "Improve smoothness and reduce pauses while speaking",
      label: "Fluency",
      score: fluency,
    },
    confidence < 70 && {
      txt: "Try to stay more relaxed and maintain steadier expression",
      label: "Confidence",
      score: confidence,
    },
    emotionScore < 70 && {
      txt: "Show more engagement and confidence in facial expression",
      label: "Emotion",
      score: emotionScore,
    },
    clumsyBehavior && {
      txt: "Blink and visual behavior indicate possible hesitation or discomfort",
      label: "Behavior",
      score: confidence,
    },
  ].filter(Boolean);

  const topEmotionEntries = Object.entries(emotionDurations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="sr-wrapper">
      <div className="sr-wave-left">
        <WaveBar />
      </div>
      <div className="sr-wave-right">
        <WaveBar />
      </div>

      <nav className="sr-nav">
        <div className="sr-nav-inner">
          <button className="sr-nav-back" onClick={() => navigate("/home")}>
            <RiArrowLeftLine className="sr-nav-icon" /> Back to Setup
          </button>

          <span className="sr-nav-title">Session Results</span>

          <div className="sr-nav-right">
            <button
              className="sr-nav-btn"
              onClick={() =>
                navigate("/session/report", { state: { sessionResults } })
              }
            >
              <RiDownloadLine className="sr-nav-btn-icon" /> Export Report
            </button>
          </div>
        </div>
      </nav>

      <main className="sr-main">
        <div className="sr-overall-card">
          <ScoreCircle score={overall} color={overallColor} size={120} />
          <div className="sr-overall-info">
            <h2 className="sr-overall-title">Overall Performance</h2>
            <p className="sr-overall-cefr">
              Dominant Emotion:{" "}
              <strong style={{ color: overallColor }}>
                {titleCase(dominantEmotion)}
              </strong>
            </p>
            <div className="sr-overall-meta">
              <span className="sr-meta-green">
                Frames: {framesProcessed} • Blinks: {blinkCount}
              </span>
              <span className="sr-meta-muted">
                Changes/min: {emotionChanges}
              </span>
            </div>
          </div>
        </div>

        <div className="sr-section">
          <h3 className="sr-section-title">Detailed Scores</h3>
          <div className="sr-scores-grid">
            {detailScores.map(({ label, val, color }) => (
              <div key={label} className="sr-score-card">
                <div className="sr-score-top">
                  <span className="sr-score-label">{label}</span>
                  <span className="sr-score-trend" style={{ color }}>
                    ↑
                  </span>
                </div>
                <ScoreCircle score={val} color={color} size={80} />
              </div>
            ))}
          </div>
        </div>

        <div className="sr-section">
          <div className="sr-radar-card">
            <h3 className="sr-section-title">Performance Overview</h3>
            <div className="sr-radar-wrap">
              <RadarChart scores={radarScores} />
            </div>
          </div>
        </div>

        <div className="sr-feedback-row">
          <div className="sr-feedback-card">
            <div className="sr-feedback-header">
              <RiCheckboxCircleLine className="sr-fh-icon sr-icon-cyan" />
              <h3 className="sr-feedback-title">Strengths</h3>
            </div>
            {strengths.length > 0 ? (
              strengths.map((s, i) => (
                <div key={i} className="sr-feedback-item sr-item-green">
                  <RiCheckboxCircleLine className="sr-fi-icon sr-icon-cyan" />
                  <span>{s}</span>
                </div>
              ))
            ) : (
              <p className="sr-feedback-empty">
                Keep practising to build your strengths.
              </p>
            )}
          </div>

          <div className="sr-feedback-card">
            <div className="sr-feedback-header">
              <RiErrorWarningLine className="sr-fh-icon sr-icon-amber" />
              <h3 className="sr-feedback-title">Areas to Improve</h3>
            </div>
            {improvements.length > 0 ? (
              improvements.map((item, i) => (
                <div key={i} className="sr-feedback-item sr-item-amber">
                  <RiErrorWarningLine className="sr-fi-icon sr-icon-amber" />
                  <div className="sr-improve-text">
                    <span>{item.txt}</span>
                    <div className="sr-improve-meta">
                      <span className="sr-improve-label">{item.label}</span>
                      <span className="sr-improve-score">{item.score}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="sr-feedback-empty">
                Great work — no major areas to flag.
              </p>
            )}
          </div>
        </div>

        <div className="sr-section">
          <h3 className="sr-section-title">Session Insights</h3>
          <div className="sr-scores-grid">
            <div className="sr-score-card">
              <div className="sr-score-top">
                <span className="sr-score-label">Pitch</span>
              </div>
              <h2 style={{ color: "#EDF0FF", marginTop: "12px" }}>
                {typeof pitch === "number" ? pitch.toFixed(2) : "0.00"}
              </h2>
            </div>

            <div className="sr-score-card">
              <div className="sr-score-top">
                <span className="sr-score-label">Energy</span>
              </div>
              <h2 style={{ color: "#EDF0FF", marginTop: "12px" }}>
                {typeof energy === "number" ? energy.toFixed(2) : "0.00"}
              </h2>
            </div>

            <div className="sr-score-card">
              <div className="sr-score-top">
                <span className="sr-score-label">Clumsy Behavior</span>
              </div>
              <h2
                style={{
                  color: clumsyBehavior ? "#FF6B82" : "#2EECC5",
                  marginTop: "12px",
                }}
              >
                {clumsyBehavior ? "Yes" : "No"}
              </h2>
            </div>

            <div className="sr-score-card">
              <div className="sr-score-top">
                <span className="sr-score-label">MFCC Count</span>
              </div>
              <h2 style={{ color: "#EDF0FF", marginTop: "12px" }}>
                {mfcc.length}
              </h2>
            </div>
          </div>
        </div>

        <div className="sr-section">
          <h3 className="sr-section-title">Emotion Duration (seconds)</h3>
          <div className="sr-scores-grid">
            {topEmotionEntries.length > 0 ? (
              topEmotionEntries.map(([emotion, seconds]) => (
                <div key={emotion} className="sr-score-card">
                  <div className="sr-score-top">
                    <span className="sr-score-label">{titleCase(emotion)}</span>
                  </div>
                  <h2 style={{ color: "#EDF0FF", marginTop: "12px" }}>
                    {Number(seconds).toFixed(1)}s
                  </h2>
                </div>
              ))
            ) : (
              <div className="sr-score-card">
                <div className="sr-score-top">
                  <span className="sr-score-label">No emotion timing data</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sr-section">
          <h3 className="sr-section-title">Feedback</h3>
          <div className="sr-feedback-card">
            {feedback.length > 0 ? (
              feedback.map((item, i) => (
                <div key={i} className="sr-feedback-item sr-item-green">
                  <RiCheckboxCircleLine className="sr-fi-icon sr-icon-cyan" />
                  <span>{item}</span>
                </div>
              ))
            ) : (
              <p className="sr-feedback-empty">No feedback available.</p>
            )}
          </div>
        </div>

        <div className="sr-cta-row">
          <button className="sr-cta-secondary" onClick={() => navigate("/home")}>
            Start New Session
          </button>
        </div>
      </main>

      <div className="sr-aria-float" onClick={() => navigate("/chatbot")}>
        <span className="sr-aria-label">Hi, I'm ARIA</span>
        <div className="sr-aria-btn">
          <BsRobot className="sr-aria-icon" />
        </div>
      </div>
    </div>
  );
}