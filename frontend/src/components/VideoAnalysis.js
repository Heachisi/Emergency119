// frontend/src/components/VideoAnalysis.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Header from '../user/Header';

import Footer from './Footer';
import VideoPlayer from './VideoPlayer';
import Timeline from './Timeline';
import StateIndicator from './StateIndicator';
import AlertLog from './AlertLog';
import SimpleVideoSelector from './SimpleVideoSelector';

// 디버그 모드 설정
const DEBUG = false; // false로 설정하면 console 로그가 거의 출력되지 않음

function VideoAnalysis() {
  const navigate = useNavigate();

  const [jobId, setJobId] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [currentData, setCurrentData] = useState({
    scores: { fire: 0, smoke: 0, hazard: 0 },
    detections: { fire: [], smoke: [], person: [] },
    state: 'NORMAL',
    timestamp: null,
    videoMeta: { width: 640, height: 480 }
  });
  const [events, setEvents] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedSupabaseVideo, setSelectedSupabaseVideo] = useState(null);
  const [displayVideoUrl, setDisplayVideoUrl] = useState(null); // 화면에 표시할 비디오 URL
  const eventSourceRef = useRef(null);

  useEffect(() => {

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);


  const handleLogout = () => {
    // 로그아웃 시 모든 상태 초기화
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setJobId(null);
    setVideoUrl(null);
    setCurrentData({
      scores: { fire: 0, smoke: 0, hazard: 0 },
      detections: { fire: [], smoke: [], person: [] },
      state: 'NORMAL',
      timestamp: null,
      videoMeta: { width: 640, height: 480 }
    });
    setEvents([]);
    setIsProcessing(false);
    setError(null);
    // 메인 페이지로 리다이렉트
    navigate('/');
  };

  const startSSEConnection = (id) => {
    // 기존 연결이 있으면 먼저 닫기
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const directUrl = `http://localhost:8000/events?job_id=${id}`;

    const eventSource = new EventSource(directUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = (event) => {
      if (DEBUG) console.log('SSE 연결 성공');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'tick') {
          setCurrentData({
            scores: data.scores,
            rawData: data,  // 원본 데이터 저장
            state: data.state,
            timestamp: data.t,
            videoMeta: { width: data.img_w || 640, height: data.img_h || 480 }
          });

          // 이벤트 히스토리에 추가
          setEvents(prev => [...prev, {
            timestamp: data.t,
            state: data.state,
            scores: data.scores,
            frame: prev.length
          }]);

        } else if (data.type === 'end') {
          if (DEBUG) console.log('영상 분석 완료');
          setIsProcessing(false);
          // SSE 연결 정상 종료
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
        } else if (data.type === 'error') {
          if (DEBUG) console.error('처리 오류:', data.error);
          setError(data.error);
          setIsProcessing(false);
        } else if (data.type === 'heartbeat') {
          // 연결 유지 확인 - 조용히 처리
          if (DEBUG) console.log('서버 연결 유지 확인');
        }
      } catch (err) {
        if (DEBUG) console.error('SSE 이벤트 파싱 오류:', err);
      }
    };

    eventSource.onerror = (event) => {
      console.log('SSE 연결 상태:', eventSource.readyState);

      // readyState가 2(CLOSED)인 경우는 정상 종료일 수 있음
      if (eventSource.readyState === 2) {
        if (DEBUG) console.log('SSE 연결 정상 종료');
        return;
      }

      // 실제 에러인 경우만 에러 표시
      if (eventSource.readyState === 0) {
        console.error('SSE 연결 오류 발생');
        setError('서버 연결이 끊어졌습니다. 재분석을 시도해주세요.');
        setIsProcessing(false);

        // 연결 정리
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      }
    };
  };

  // Supabase에서 비디오 선택 시 - 자동으로 분석 시작
  const handleVideoSelect = async (video) => {
    console.log('비디오 선택:', video);
    console.log('storage_url:', video.storage_url);
    setSelectedSupabaseVideo(video);
    setError(null);

    // storage_url이 유효한 URL인지 확인
    if (!video.storage_url || (!video.storage_url.startsWith('http://') && !video.storage_url.startsWith('https://'))) {
      setError('유효하지 않은 비디오 URL입니다. Signed URL 생성 실패');
      console.error('Invalid storage_url:', video.storage_url);
      return;
    }

    // 화면에 Supabase 비디오 URL 표시
    setDisplayVideoUrl(video.storage_url);

    // 자동으로 분석 시작
    try {
      setIsProcessing(true);

      // 백엔드에 URL 전달 (백엔드가 직접 다운로드)
      console.log('백엔드로 전송:', video.storage_url);
      const uploadResponse = await fetch('http://localhost:8000/upload-from-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: video.storage_url
        }),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('백엔드 응답:', errorText);
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      const result = await uploadResponse.json();

      // 분석 시작
      setJobId(result.job_id);
      setVideoUrl(`http://localhost:8000${result.video_url}`);
      setEvents([]);
      startSSEConnection(result.job_id);

    } catch (err) {
      console.error('비디오 분석 시작 오류:', err);
      setError(`비디오 분석 시작 실패: ${err.message}`);
      setIsProcessing(false);
    }
  };

  // 재분석 버튼 핸들러
  const handleReanalyze = async () => {
    if (!jobId) return;

    try {
      setIsProcessing(true);
      setError(null);
      setEvents([]);

      // 기존 SSE 연결 종료
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      console.log('🔄 재분석 요청:', jobId);
      const response = await fetch(`http://localhost:8000/jobs/${jobId}/restart`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`재분석 실패: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ 재분석 시작:', result);

      // 새로운 SSE 연결 시작
      startSSEConnection(jobId);

      // 비디오를 처음부터 다시 재생
      const videoElement = document.querySelector('video');
      if (videoElement) {
        videoElement.currentTime = 0;
        videoElement.muted = true;
        videoElement.play().then(() => {
          console.log('✅ 비디오 재시작 성공');
          setTimeout(() => {
            videoElement.muted = false;
          }, 500);
        }).catch(err => {
          console.error('비디오 재시작 실패:', err);
        });
      }

    } catch (err) {
      console.error('재분석 오류:', err);
      setError(`재분석 실패: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setJobId(null);
    setVideoUrl(null);
    setDisplayVideoUrl(null);
    setSelectedSupabaseVideo(null);
    setCurrentData({
      scores: { fire: 0, smoke: 0, hazard: 0 },
      detections: { fire: [], smoke: [], person: [] },
      state: 'NORMAL',
      timestamp: null
    });
    setEvents([]);
    setIsProcessing(false);
    setError(null);
  };

  // 영상 재생/일시정지 제어
  const handleVideoPlayPause = async (isPlaying) => {
    if (!jobId) return;

    try {
      const response = await fetch(`http://localhost:8000/jobs/${jobId}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cmd: isPlaying ? 'resume' : 'pause' })
      });

      if (response.ok) {
        setIsPaused(!isPlaying);
        if (DEBUG) console.log(`분석 ${isPlaying ? '재개' : '일시정지'}`);
      }
    } catch (error) {
      if (DEBUG) console.error('영상 제어 오류:', error);
    }
  };


  return (
    <div className="video-analysis-page">
      <Header />

      <main className="main-content">
        <div className="container">
          {/* 네비게이션 버튼 */}


          {error && (
            <div className="error-banner">
              <div className="error-content">
                <span className="error-icon">⚠️</span>
                <span className="error-text">{error}</span>
                <button
                  className="error-close"
                  onClick={() => setError(null)}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* 분석 대시보드 - 항상 표시 */}
          <div className="analysis-dashboard">
            {/* 상단 컨트롤 영역 - 항상 표시 */}
            <div className="dashboard-header-simple">
              <div className="video-selector-wrapper">
                <h3>🎬 비디오 선택</h3>
                <SimpleVideoSelector onVideoSelect={handleVideoSelect} autoSelect={false} />
              </div>

              <div className="status-section">
                {isProcessing && (
                  <div className="processing-status">
                    <div className="processing-spinner"></div>
                    <span>분석 진행 중...</span>
                  </div>
                )}

                {jobId && !isProcessing && (
                  <div className="analysis-complete">
                    <span className="complete-icon">✅</span>
                    <span>분석 완료</span>
                  </div>
                )}

                {jobId && (
                  <div className="action-buttons">
                    <button onClick={handleReanalyze} className="reanalyze-button" disabled={isProcessing}>
                      🔄 재분석
                    </button>
                    {/* <button onClick={handleReset} className="reset-button-simple">
                      📂 다른 비디오 선택
                    </button> */}
                  </div>
                )}
              </div>
            </div>

            {/* 비디오 표시 영역 */}
            {(displayVideoUrl || videoUrl) && (
              <>
                <div className="video-dashboard-container">
                  <div className="video-section">
                    <VideoPlayer
                      jobId={jobId}
                      videoUrl={videoUrl || displayVideoUrl}
                      currentFrame={events.length}
                      scores={currentData.scores}
                      rawData={currentData.rawData}
                      currentState={currentData.state}
                      timestamp={currentData.timestamp}
                      currentData={currentData}
                      onPlayPauseChange={handleVideoPlayPause}
                    />
                  </div>

                  <div className="right-panel">
                    <StateIndicator
                      currentState={currentData.state}
                      scores={currentData.scores}
                      jobId={jobId}
                      timestamp={currentData.timestamp}
                    />

                    <AlertLog
                      currentState={currentData.state}
                      scores={currentData.scores}
                      timestamp={currentData.timestamp}
                    />
                  </div>
                </div>

                {events.length > 0 && (
                  <Timeline
                    events={events}
                    currentFrame={events.length - 1}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default VideoAnalysis;