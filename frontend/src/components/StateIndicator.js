// frontend/src/components/StateIndicator.js
import React, { useState, useEffect } from 'react';
import './StateIndicator.css';

const StateIndicator = ({ currentState, scores, jobId, timestamp }) => {
  // 불 점수가 15% 미만이고 hazard가 45% 미만이면 상태를 NORMAL로 강제 설정
  const fireScore = scores.fire * 100;
  const hazardScore = scores.hazard * 100;
  const displayState = (fireScore < 15 && hazardScore < 45) ? 'NORMAL' : currentState;

  const getStateInfo = (state) => {
    switch (state) {
      case 'NORMAL':
        return {
          icon: '🟢',
          text: '정상',
          description: '위험 요소가 감지되지 않았습니다.',
          color: '#28a745',
          bgColor: 'rgba(40, 167, 69, 0.1)',
          priority: 'safe'
        };
      case 'PRE_FIRE':
        return {
          icon: '🟡',
          text: '화재 전조',
          description: '화재 발생 가능성이 감지되었습니다.',
          color: '#ffc107',
          bgColor: 'rgba(255, 193, 7, 0.1)',
          priority: 'warning'
        };
      case 'SMOKE_DETECTED':
        return {
          icon: '🟠',
          text: '연기 감지',
          description: '연기가 감지되었습니다. 주의가 필요합니다.',
          color: '#fd7e14',
          bgColor: 'rgba(253, 126, 20, 0.1)',
          priority: 'caution'
        };
      case 'FIRE_GROWING':
        return {
          icon: '🔴',
          text: '화재 확산',
          description: '화재가 확산되고 있습니다. 즉시 대피하세요.',
          color: '#dc3545',
          bgColor: 'rgba(220, 53, 69, 0.1)',
          priority: 'danger'
        };
      case 'CALL_119':
        return {
          icon: '🚨',
          text: '119 호출',
          description: '긴급상황입니다. 119에 즉시 신고하세요.',
          color: '#ff3333',
          bgColor: 'rgba(255, 51, 51, 0.1)',
          priority: 'emergency'
        };
      default:
        return {
          icon: '⚪',
          text: '분석 중',
          description: '영상을 분석하고 있습니다.',
          color: '#6c757d',
          bgColor: 'rgba(108, 117, 125, 0.1)',
          priority: 'neutral'
        };
    }
  };

  const stateInfo = getStateInfo(displayState);
  const maxScore = Math.max(scores.fire, scores.smoke, scores.hazard);

  const getThreatLevel = () => {
    if (maxScore >= 0.8) return 'critical';
    if (maxScore >= 0.6) return 'high';
    if (maxScore >= 0.4) return 'medium';
    if (maxScore >= 0.2) return 'low';
    return 'minimal';
  };

  const formatPercentage = (score) => {
    return `${(score * 100).toFixed(1)}%`;
  };

  const handleEmergencyCall = async () => {
    try {
      // 첫 번째: 119 전화 걸기
      // window.open('tel:119');

      // 두 번째: 이메일 발송 API 호출
      if (jobId) {
        console.log('🚨 이메일 발송 요청:', { jobId, scores, timestamp });

        const response = await fetch('http://localhost:8000/send-emergency-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            job_id: jobId,
            scores: scores,
            timestamp: timestamp
          })
        });

        if (response.ok) {
          const result = await response.json();
          alert('✅ ' + result.message);
          console.log('✅ 이메일 발송 성공');
        } else {
          const errorData = await response.json();
          alert('❌ 이메일 발송 실패: ' + errorData.detail);
          console.error('❌ 이메일 발송 실패:', errorData);
        }
      }
    } catch (error) {
      console.error('❌ 긴급 호출 처리 오류:', error);
      alert('❌ 이메일 발송 중 오류가 발생했습니다: ' + error.message);
    }
  };

      // 상단: 상태 추가
        const [latchedCall119, setLatchedCall119] = useState(false);

      // CALL_119이거나 위험도가 60% 이상인 FIRE_GROWING 상태일 때 래치 ON
      useEffect(() => {
        const shouldShowButton = (
          (currentState === 'CALL_119' && (fireScore >= 15 || hazardScore >= 45)) ||
          (currentState === 'FIRE_GROWING' && hazardScore >= 60)
        );

        if (shouldShowButton) {
          console.log('🚨 119 호출 버튼 래치 ON:', { fireScore, hazardScore, currentState });
          setLatchedCall119(true);
        }
      }, [currentState, fireScore, hazardScore]);

      // (선택) 새로운 분석 영상/잡 시작 시 래치 초기화
      useEffect(() => {
        setLatchedCall119(false);
      }, [jobId]); // jobId를 사용 중이라면

      // (선택) 운영자가 수동 해제하고 싶을 때
      const handleAck = async () => {
        setLatchedCall119(false);
        // 백엔드에 ack 보내는 로직이 있다면 함께 호출
        // await fetch(`/jobs/${jobId}/control`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({cmd:'ack'}) });
      };

  return (
    <div className={`state-indicator-main ${stateInfo.priority}`}>
      {/* 간단한 상태 표시 */}
      <div className="state-header-simple">
        <div className="state-icon-simple">
          <span>{stateInfo.icon}</span>
        </div>
        <div className="state-title-simple">{stateInfo.text}</div>
      </div>

      {/* 위험도 점수만 표시 */}
      <div className="scores-simple">
        <div className="score-row">
          <span className="score-label">🔥 화재</span>
          <div className="score-bar-simple">
            <div
              className="score-fill-simple fire"
              style={{ width: `${scores.fire * 100}%` }}
            ></div>
          </div>
          <span className="score-value-simple">{formatPercentage(scores.fire)}</span>
        </div>

        <div className="score-row">
          <span className="score-label">💨 연기</span>
          <div className="score-bar-simple">
            <div
              className="score-fill-simple smoke"
              style={{ width: `${scores.smoke * 100}%` }}
            ></div>
          </div>
          <span className="score-value-simple">{formatPercentage(scores.smoke)}</span>
        </div>

        <div className="score-row">
          <span className="score-label">⚠️ 위험도</span>
          <div className="score-bar-simple">
            <div
              className="score-fill-simple hazard"
              style={{ width: `${scores.hazard * 100}%` }}
            ></div>
          </div>
          <span className="score-value-simple">{formatPercentage(scores.hazard)}</span>
        </div>
      </div>

      {/* 119 호출 상태일 때만 긴급 버튼 표시 */}
      {latchedCall119 && (
        <div className="emergency-simple">
          <button className="call-119-btn-simple" onClick={handleEmergencyCall}>
            📞 119 호출 + 알림
          </button>

          {/* (선택) 확인/숨기기 버튼 */}
          {/* <button className="ack-btn" onClick={handleAck}>확인</button> */}
        </div>
      )}
    </div>
  );
};

export default StateIndicator;