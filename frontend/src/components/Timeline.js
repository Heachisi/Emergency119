// frontend/src/components/Timeline.js
import React, { useState, useEffect, useRef } from 'react';
import './Timeline.css';

const Timeline = ({ events, currentFrame, onTimeClick }) => {
  const [showAll, setShowAll] = useState(false);
  const [filterState, setFilterState] = useState('ALL');
  const timelineEventsRef = useRef(null);

  // 디버깅용 로그
  useEffect(() => {
    console.log('Timeline - events received:', events?.length || 0);
    console.log('Timeline - first few events:', events?.slice(0, 3));
    if (events?.length > 0) {
      console.log('Timeline - 첫 번째 이벤트 timestamp 상세:', {
        timestamp: events[0].timestamp,
        type: typeof events[0].timestamp,
        isNumber: typeof events[0].timestamp === 'number',
        value: events[0].timestamp
      });
    }
  }, [events]);

  // 자동 스크롤 (새 이벤트가 추가될 때)
  useEffect(() => {
    if (timelineEventsRef.current && !showAll) {
      timelineEventsRef.current.scrollTop = timelineEventsRef.current.scrollHeight;
    }
  }, [events, showAll]);

  if (!events || events.length === 0) {
    return (
      <div className="timeline-container">
        <h3>분석 타임라인</h3>
        <div className="timeline-empty">
          <p>아직 분석 데이터가 없습니다.</p>
          <p className="debug-info">이벤트 배열: {JSON.stringify(events)}</p>
        </div>
      </div>
    );
  }

  const getStateColor = (state) => {
    switch (state) {
      case 'NORMAL': return '#28a745';
      case 'PRE_FIRE': return '#ffc107';
      case 'SMOKE_DETECTED': return '#fd7e14';
      case 'FIRE_GROWING': return '#dc3545';
      case 'CALL_119': return '#ff3333';
      default: return '#6c757d';
    }
  };

  const getStateText = (state) => {
    switch (state) {
      case 'NORMAL': return '정상';
      case 'PRE_FIRE': return '화재 전조';
      case 'SMOKE_DETECTED': return '연기 감지';
      case 'FIRE_GROWING': return '화재 확산';
      case 'CALL_119': return '119 호출';
      default: return '분석 중';
    }
  };

  const formatTime = (timestamp) => {
    if (typeof timestamp === 'number') {
      // 비디오 시간 (초 단위)
      const minutes = Math.floor(timestamp / 60);
      const seconds = Math.floor(timestamp % 60);
      const milliseconds = Math.floor((timestamp % 1) * 1000);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString();
  };

  const handleTimeClick = (event) => {
    // 시간 정보만 콘솔에 로그 출력
    console.log(`🕐 타임라인 시간 정보: ${event.timestamp}초 (${formatTime(event.timestamp)})`);
  };

  // 초별로 최고 점수 이벤트만 필터링
  const getSecondBasedEvents = (eventList) => {
    const secondsMap = new Map();

    eventList.forEach((event, index) => {
      console.log(`🔍 이벤트 ${index} 처리:`, {
        timestamp: event.timestamp,
        timestampType: typeof event.timestamp,
        isValidTimestamp: !!(event.timestamp && typeof event.timestamp === 'number')
      });

      if (!event.timestamp || typeof event.timestamp !== 'number') {
        console.warn(`⚠️ 유효하지 않은 timestamp:`, event);
        return;
      }

      const second = Math.floor(event.timestamp);
      const hazardScore = event.scores?.hazard || 0;
      const fireScore = event.scores?.fire || 0;
      const smokeScore = event.scores?.smoke || 0;
      const totalScore = hazardScore + fireScore + smokeScore;

      if (!secondsMap.has(second) || totalScore > secondsMap.get(second).totalScore) {
        const processedEvent = {
          ...event,
          originalIndex: index,
          totalScore,
          second,
          // timestamp를 명시적으로 보존
          timestamp: event.timestamp
        };

        console.log(`✅ ${second}초 최고 점수 이벤트 업데이트:`, {
          timestamp: processedEvent.timestamp,
          totalScore,
          second
        });

        secondsMap.set(second, processedEvent);
      }
    });

    const result = Array.from(secondsMap.values()).sort((a, b) => a.second - b.second);
    console.log('🔍 최종 초별 이벤트:', result.map(e => ({ second: e.second, timestamp: e.timestamp })));
    return result;
  };

  const filteredEvents = filterState === 'ALL'
    ? events
    : events.filter(event => event.state === filterState);

  const secondBasedEvents = getSecondBasedEvents(filteredEvents);
  const displayEvents = showAll ? secondBasedEvents : secondBasedEvents.slice(-50); // 최근 50초

  return (
    <div className="timeline-container">
      <h3>분석 타임라인</h3>

      {/* 컨트롤 패널 */}
      <div className="timeline-controls">
        <div className="timeline-stats">
          <div className="stat-item">
            <span className="stat-label">총 프레임:</span>
            <span className="stat-value">{events.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">현재 프레임:</span>
            <span className="stat-value">{currentFrame + 1}</span>
          </div>
        </div>

        <div className="control-buttons">
          <button
            className={`control-btn ${showAll ? 'active' : ''}`}
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? '최근 50초' : '전체 보기'}
          </button>

          <select
            className="filter-select"
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
          >
            <option value="ALL">모든 상태</option>
            <option value="NORMAL">정상</option>
            <option value="PRE_FIRE">화재 전조</option>
            <option value="SMOKE_DETECTED">연기 감지</option>
            <option value="FIRE_GROWING">화재 확산</option>
            <option value="CALL_119">119 호출</option>
          </select>
        </div>
      </div>

      <div className="timeline-table">
        <div className="timeline-header">
          <span>초</span>
          <span>시간</span>
          <span>상태</span>
          <span>화재</span>
          <span>연기</span>
          <span>위험도</span>
        </div>

        <div className="timeline-events" ref={timelineEventsRef}>
          {displayEvents.map((event, index) => {
            const originalIndex = event.originalIndex || 0;
            const isCurrent = originalIndex === currentFrame;
            const second = Math.floor(event.timestamp || 0);

            return (
              <div
                key={`${second}-${event.timestamp || index}`}
                className={`timeline-event ${isCurrent ? 'current' : ''}`}
                onClick={() => handleTimeClick(event)}
              >
                <div className="event-frame">
                  {second}초
                </div>

                <div className="event-time clickable">
                  {formatTime(event.timestamp)}
                </div>

                <div className="event-state">
                  <span
                    className="state-indicator"
                    style={{ backgroundColor: getStateColor(event.state) }}
                  >
                    {getStateText(event.state)}
                  </span>
                </div>

                <div className="event-score fire">
                  {event.scores?.fire ? (event.scores.fire * 100).toFixed(1) : '0.0'}%
                </div>

                <div className="event-score smoke">
                  {event.scores?.smoke ? (event.scores.smoke * 100).toFixed(1) : '0.0'}%
                </div>

                <div className="event-score hazard">
                  {event.scores?.hazard ? (event.scores.hazard * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
            );
          })}
        </div>

        {!showAll && secondBasedEvents.length > 50 && (
          <div className="timeline-more">
            <small>
              최근 {displayEvents.length}초 표시 (총 {secondBasedEvents.length}초)
              <button className="show-all-btn" onClick={() => setShowAll(true)}>
                전체 보기
              </button>
            </small>
          </div>
        )}
      </div>

      <div className="timeline-summary">
        <h4>요약 통계</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span>최대 화재 점수:</span>
            <strong>{Math.max(...events.map(e => e.scores.fire * 100)).toFixed(1)}%</strong>
          </div>
          <div className="summary-item">
            <span>최대 연기 점수:</span>
            <strong>{Math.max(...events.map(e => e.scores.smoke * 100)).toFixed(1)}%</strong>
          </div>
          <div className="summary-item">
            <span>위험 상태 횟수:</span>
            <strong>{events.filter(e => e.state !== 'NORMAL').length}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;