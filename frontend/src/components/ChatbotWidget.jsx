import React, { useEffect, useMemo, useRef, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./chatbot.css";
import goblin from "../images/fireGoblinSmile.png";

const SYSTEM_PROMPT = `언어: 모든 답변은 한국어로 간결하게, 역할: 당신은 “119 안전도우미” 챗봇입니다.
원칙:
1) 위급 징후면 즉시 119 권고를 최우선으로 안내.
2) 의료적 진단/처치는 지시하지 말고, 전문가 상담 권고.
3) 응답은 '요약 → 단계별 조치 → 주의사항' 구조.
4) 위험한 행위/불법은 안내 금지.
5) 모르면 모른다고 말하고 공공기관 자료 확인 권장.
6) 위치를 모르는 사용자를 위해 보편적 대피 원칙을 우선 제시.
7) "**" 이용해서 특정 단어나 문장 강조 금지
출력 포맷:
- 요약(1~2문장)
- 즉시 조치(번호 목록)
- 추가 정보/예방 팁
- 119/응급 안내(필요 시)
- "**" 이용해서 단어나 문장 강조 금지
`;

/** 짧은 원버튼(아이콘 느낌의 라벨) → 실제 전송 프롬프트 매핑 */
const ONE_TAPS = [
  {
    label: "프라이팬 불 🔥",
    prompt:
      "집에서 프라이팬에 불이 붙었어요. 지금 당장 어떻게 해야 하나요? 물 붓기 여부와 가스 밸브, 불끄는 순서, 환기, 재발 방지까지 단계별로 알려줘.",
  },
  {
    label: "욕실 낙상 🛁",
    prompt:
      "노인이 욕실에서 넘어졌어요. 의식은 있는데 무릎을 아파합니다. 무엇을 확인하고 어떤 순서로 도와야 하나요? 절대 하면 안 되는 행동도 함께 알려줘.",
  },
  {
    label: "연기·대피 🧯",
    prompt:
      "아파트 복도에서 연기 냄새가 납니다. 계단·엘리베이터 사용, 젖은 수건, 대피 우선순위 등 안전하게 대피하는 법을 알려줘.",
  },
  {
    label: "소화기 사용법 🧰",
    prompt:
      "소화기 사용법을 초등학생도 이해할 수 있게 간단하고 정확하게 설명해줘. 분사 거리, 안전핀, 바람 방향 주의 등.",
  },
  {
    label: "멀티탭 과열 🔌",
    prompt:
      "전기 멀티탭 과열을 예방하려면 어떻게 해야 하나요? 전력 용량, 발열 징후, 문어발 금지, 주기 점검 체크리스트를 알려줘.",
  },
];

const NEARBY_INTENT =
  /(가까운|근처|주변).*(응급실|병원|소방서)|길찾기|가야[해|할]\s*병원|어디.*병원/;

const isAndroid = /Android/i.test(navigator.userAgent || "");
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
const isMobile = isAndroid || isIOS;

function isSecureContextOk() {
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  return isLocal || window.location.protocol === "https:";
}

function setNearbyLinks(lat, lon, what, setNearby) {
  const q = encodeURIComponent(what);
  const naverWeb = `https://map.naver.com/v5/search/${q}?c=${lon},${lat},15,0,0`;
  const googleWeb = `https://www.google.com/maps/search/${q}/@${lat},${lon},15z`;

  const naverApp = isMobile ? `nmap://search?query=${q}&appname=${window.location.host}` : null;
  let googleApp = null;
  if (isAndroid) {
    googleApp = `intent://maps.google.com/maps?q=${q}&center=${lat},${lon}#Intent;scheme=https;package=com.google.android.apps.maps;end`;
  } else if (isIOS) {
    googleApp = `comgooglemaps://?q=${q}&center=${lat},${lon}&zoom=15`;
  }

  setNearby({ naverWeb, googleWeb, naverApp, googleApp, what });
}

function openDeepLinkInNewTab(appUrl, webUrl) {
  const w = window.open("about:blank", "_blank", "noopener");
  if (!w) {
    window.open(webUrl, "_blank", "noopener");
    return;
  }
  try {
    w.location.href = appUrl || webUrl;
  } catch (_) {}
  if (appUrl) {
    setTimeout(() => {
      try {
        if (!w.closed) w.location.href = webUrl;
      } catch (_) {}
    }, 1400);
  }
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    {
      role: "ai",
      text:
        "안녕하세요! 저는 119 안전도우미예요.\n" +
        "화재·낙상·생활 안전사고 예방/대응 방법을 간단히 안내해 드립니다.\n" +
        "근처 응급실/병원을 찾으려면 아래 '내 위치로 찾기' 버튼을 눌러 주세요.\n" +
        "응급 상황이면 즉시 119에 신고하세요. 무엇을 도와드릴까요?",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  // 근처 지도
  const [nearbyType, setNearbyType] = useState("응급실");
  const [nearby, setNearby] = useState(null);

  const chatRef = useRef(null);

  // ✅ 임시 로그(1): .env 주입 여부 확인
  const genAI = useMemo(() => {
    console.log("ENV KEY PRESENT?", !!process.env.REACT_APP_GEMINI_API_KEY);
    const key = process.env.REACT_APP_GEMINI_API_KEY;
    return key ? new GoogleGenerativeAI(key) : null;
  }, []);

  useEffect(() => {
    if (!genAI) return;
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
    });
    chatRef.current = model.startChat({
      history: [
        { role: "user", parts: [{ text: "당신은 누구죠?" }] },
        {
          role: "model",
          parts: [
            {
              text:
                "저는 119 안전도우미입니다. 화재·낙상 등 생활 안전 정보를 드릴게요.",
            },
          ],
        },
      ],
    });
  }, [genAI]);

  async function sendNow(text) {
    const q = (text ?? input).trim();
    if (!q) return;
    setInput("");
    setMsgs((m) => [...m, { role: "you", text: q }]);

    if (NEARBY_INTENT.test(q)) {
      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text:
            "가까운 기관을 찾도록 도와드릴게요. 아래 '내 위치로 찾기' 버튼을 사용해 주세요.\n" +
            "응급 상황이면 119가 최우선입니다.",
        },
      ]);
    }

    if (!genAI || !chatRef.current) {
      setMsgs((m) => [
        ...m,
        { role: "ai", text: "API 초기화 오류입니다. .env 설정을 확인해 주세요." },
      ]);
      return;
    }

    try {
      setBusy(true);
      const result = await chatRef.current.sendMessage(q);
      const textResp = (await result.response).text();
      setMsgs((m) => [...m, { role: "ai", text: textResp }]);
    } catch (e) {
      // ✅ 임시 로그(2): 에러 상세 확인
      console.error("Gemini error:", e);
      setMsgs((m) => [
        ...m,
        { role: "ai", text: "오류가 발생했어요. 네트워크와 API 키를 확인해 주세요." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function handleUseHere() {
    if (!navigator.geolocation) {
      setMsgs((m) => [
        ...m,
        { role: "ai", text: "이 브라우저는 위치 정보를 지원하지 않아요." },
      ]);
      return;
    }
    if (!isSecureContextOk()) {
      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text:
            "위치 접근은 HTTPS(또는 localhost)에서만 동작합니다. HTTPS로 열어 주세요.",
        },
      ]);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setNearbyLinks(lat, lon, nearbyType, setNearby);
      },
      (err) => {
        console.error(err);
        setMsgs((m) => [
          ...m,
          { role: "ai", text: "위치 권한이 거부되었거나 확인에 실패했어요." },
        ]);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  return (
    <>
      {/* 플로팅 아이콘(토글) */}
      <button
        className="emg-chat-fab"
        aria-label="119 안전도우미 열기"
        onClick={() => setOpen(!open)}
      >
        <img src={goblin} alt="안전도우미" />
      </button>

      {/* 챗봇 패널 */}
      {open && (
        <div className="emg-chat-panel" role="dialog" aria-label="119 안전도우미">
          <header className="emg-chat-header">
            <div className="emg-chat-title">🚑 119 안전도우미</div>
            <button
              className="emg-chat-close"
              onClick={() => setOpen(false)}
              aria-label="닫기"
            >
              ✕
            </button>
          </header>

          {/* 짧은 원버튼(한 줄/두 줄로 자동 줄바꿈) */}
          <div className="emg-one-taps">
            {ONE_TAPS.map((b) => (
              <button
                key={b.label}
                className="pill"
                onClick={() => sendNow(b.prompt)}
                title={b.label}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* 근처 찾기: 두 줄 레이아웃 */}
          <div className="emg-nearby-bar vertical">
            <div className="row">
              <span className="label">근처 보기</span>
              <select
                value={nearbyType}
                onChange={(e) => setNearbyType(e.target.value)}
                className="select"
              >
                <option value="응급실">응급실(ER)</option>
                <option value="병원">병원</option>
                <option value="소방서">소방서</option>
              </select>
              <button className="btn primary" onClick={handleUseHere}>
                내 위치로 찾기
              </button>
            </div>

            <div className="row">
              <button
                className="btn ghost"
                disabled={!nearby}
                onClick={(e) => {
                  e.preventDefault();
                  if (!nearby) return;
                  isMobile && nearby.naverApp
                    ? openDeepLinkInNewTab(nearby.naverApp, nearby.naverWeb)
                    : window.open(nearby.naverWeb, "_blank", "noopener");
                }}
              >
                네이버 지도
              </button>
              <button
                className="btn ghost"
                disabled={!nearby}
                onClick={(e) => {
                  e.preventDefault();
                  if (!nearby) return;
                  isMobile && nearby.googleApp
                    ? openDeepLinkInNewTab(nearby.googleApp, nearby.googleWeb)
                    : window.open(nearby.googleWeb, "_blank", "noopener");
                }}
              >
                구글 지도
              </button>
            </div>
          </div>

          {/* 대화 영역 */}
          <div className="emg-chat-log" role="log" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className="bubble">{m.text}</div>
              </div>
            ))}
            {busy && <div className="meta">답변 생성 중…</div>}
          </div>

          {/* 입력 */}
          <div className="emg-chat-input">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="질문을 입력하세요. Enter=전송, Shift+Enter=줄바꿈"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendNow();
                }
              }}
            />
            <button className="send" onClick={() => sendNow()} disabled={busy}>
              전송
            </button>
          </div>

          {/* 주의사항(폰트 더 작게) */}
          <div className="note small">
            ⚠️응급·화재 징후가 있으면 즉시 119에 신고하세요. 이 챗봇은 일반 정보
            제공용이며 전문적 진단/처치를 대체하지 않습니다.
          </div>
        </div>
      )}
    </>
  );
}
