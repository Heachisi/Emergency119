import React, { useState, useEffect } from 'react';
import Header from '../user/Header';
import { supabase } from '../supabase.js';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

const SmokeDetect = () => {
  const [since, setSince] = useState('');
  const [limit, setLimit] = useState(1000);
  const [threshold, setThreshold] = useState(0.5);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // 센서 데이터 기반 화재 확률 계산 함수
  const calculateFireProbability = (data) => {
    const {
      temperature_c = 0,
      humidity_percent = 0,
      tvoc_ppb = 0,
      eco2_ppm = 0,
      pm2_5 = 0
    } = data;

    let riskScore = 0;

    // 온도 위험도
    if (temperature_c > 20) {
      riskScore += Math.min((temperature_c - 20) / 25, 0.4);
    }

    // 습도 위험도
    if (humidity_percent < 40) {
      riskScore += Math.min((40 - humidity_percent) / 40, 0.3);
    }

    // TVOC 위험도
    if (tvoc_ppb > 500) {
      riskScore += Math.min((tvoc_ppb - 500) / 1500, 0.4);
    }

    // eCO2 위험도
    if (eco2_ppm > 400) {
      riskScore += Math.min((eco2_ppm - 400) / 600, 0.4);
    }

    // PM2.5 위험도
    if (pm2_5 > 1.5) {
      riskScore += Math.min((pm2_5 - 1.5) / 10, 0.3);
    }

    // 복합 위험도 계산
    const tempHumidityRisk = temperature_c > 25 && humidity_percent < 30 ? 0.2 : 0;
    const gasRisk = tvoc_ppb > 800 && eco2_ppm > 600 ? 0.15 : 0;
    const particleRisk = pm2_5 > 3 ? 0.1 : 0;

    riskScore += tempHumidityRisk + gasRisk + particleRisk;

    // 최종 확률 계산
    const normalizedScore = Math.min(riskScore, 2.0);
    const probability = 1 / (1 + Math.exp(-3 * (normalizedScore - 0.5)));

    return Math.min(Math.max(probability, 0.0), 1.0);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setErr('');

      let query = supabase
        .from('smoke_sensor_data')
        .select('*')
        .order('created_at', { ascending: true });

      if (since) {
        query = query.gte('created_at', since);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      const shaped = data.map(d => {
        const prob_fire = calculateFireProbability(d);
        const pred = prob_fire >= threshold ? 1 : 0;

        // UTC 시간 그대로 표시
        const date = new Date(d.created_at);
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hour = String(date.getUTCHours()).padStart(2, '0');
        const minute = String(date.getUTCMinutes()).padStart(2, '0');
        const timeStr = `${month}-${day} ${hour}:${minute}`;

        return {
          t: timeStr,
          prob_fire: Number(prob_fire.toFixed(3)),
          pred: Number(pred),
          fire_alarm: d.fire_alarm ? 1 : 0,
          temperature: d.temperature_c,
          humidity: d.humidity_percent,
          tvoc: d.tvoc_ppb,
          eco2: d.eco2_ppm,
          pm25: d.pm2_5,
          original: d
        };
      });

      setRows(shaped);
    } catch (e) {
      console.error('Error loading data:', e);
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold]);

  // 실시간 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(15, 15, 35, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '12px',
          fontSize: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          color: '#fff'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#8ab4f8' }}>{`⏰ ${label}`}</p>
          <p style={{ margin: '6px 0', color: '#8884d8' }}>
            {`화재 확률: ${(data.prob_fire * 100).toFixed(1)}%`}
          </p>
          <p style={{ margin: '6px 0', color: '#82ca9d' }}>
            {`예측: ${data.pred ? '🔥 화재 위험' : '✅ 정상'}`}
          </p>
          <p style={{ margin: '6px 0', color: '#ffc658' }}>
            {`실제 알람: ${data.fire_alarm ? '🚨 발생' : '⭕ 없음'}`}
          </p>
          <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
          <p style={{ margin: '3px 0', fontSize: '11px', color: '#aaa' }}>🌡️ 온도: {data.temperature?.toFixed(1)}°C</p>
          <p style={{ margin: '3px 0', fontSize: '11px', color: '#aaa' }}>💧 습도: {data.humidity?.toFixed(1)}%</p>
          <p style={{ margin: '3px 0', fontSize: '11px', color: '#aaa' }}>💨 TVOC: {data.tvoc?.toFixed(0)} ppb</p>
          <p style={{ margin: '3px 0', fontSize: '11px', color: '#aaa' }}>🫁 eCO2: {data.eco2?.toFixed(0)} ppm</p>
          <p style={{ margin: '3px 0', fontSize: '11px', color: '#aaa' }}>🌫️ PM2.5: {data.pm25?.toFixed(1)} μg/m³</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
    <Header />
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* 왼쪽 컨트롤 패널 */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          {/* 컨트롤 카드 */}
          <div style={{
            background: 'rgba(26, 26, 46, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#8ab4f8' }}>⚙️ 필터 설정</h3>
            
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', color: '#aaa' }}>
              📅 날짜 범위
              <input
                type="datetime-local"
                value={since}
                onChange={e => setSince(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: 'white',
                  fontSize: '14px',
                  colorScheme: 'dark',
                }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', color: '#aaa' }}>
              📊 데이터 개수
              <input
                type="number"
                min={1}
                max={10000}
                value={limit}
                onChange={e => setLimit(Number(e.target.value))}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: '16px', fontSize: '14px', color: '#aaa' }}>
              ⚠️ 임계값
              <input
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
            </label>

            <button
              onClick={loadData}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: loading ? '#555' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseOver={e => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {loading ? '🔄 로딩 중...' : '🔄 새로고침'}
            </button>
            {err && <div style={{ marginTop: '12px', color: '#ff6b6b', fontSize: '12px' }}>❌ {err}</div>}
          </div>

        </div>

        {/* 오른쪽 차트 영역 */}
        <div style={{ flex: '3', minWidth: '600px' }}>
          {/* 통계 카드들 */}
          <div style={{
            background: 'rgba(26, 26, 46, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            marginBottom:'20px'
          }}>
          {rows.length > 0 && (
            <div style={{ display: 'flex', gap: '30px' }}>
              <StatCard 
                icon="📈" 
                label="실시간 화재 위험도" 
                value={`${(rows.reduce((sum, r) => sum + r.prob_fire, 0) / rows.length * 100).toFixed(1)}%`}
                gradient="linear-gradient(135deg, #66c963ff 0%, #d0ebcfff 100%)"
              />
              <StatCard 
                icon="🔥" 
                label="예측된 화재" 
                value={rows.filter(r => r.pred === 1).length}
                gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
              />
              <StatCard 
                icon="🚨" 
                label="실제 경보 발생" 
                value={rows.filter(r => r.fire_alarm === 1).length}
                gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
              />
              <StatCard 
                icon="📋" 
                label="총 데이터" 
                value={rows.length.toLocaleString()}
                gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              />
            </div>
          )}
          </div>
          <div style={{
            background: 'rgba(26, 26, 46, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>

            <div style={{ height: 400 }}>
              <ResponsiveContainer>
                <LineChart data={rows}>
                  <defs>
                    <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="t" 
                    minTickGap={50}
                    tick={{ fontSize: 10, fill: '#888' }}
                    stroke="rgba(255,255,255,0.2)"
                  />
                  <YAxis 
                    yAxisId="left" 
                    domain={[0, 1]}
                    tick={{ fill: '#888' }}
                    stroke="rgba(255,255,255,0.2)"
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[0, 1]} 
                    ticks={[0, 1]}
                    tick={{ fill: '#888' }}
                    stroke="rgba(255,255,255,0.2)"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ color: '#aaa' }}
                    iconType="line"
                  />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="prob_fire" 
                    stroke="#ff7811ff"
                    strokeWidth={3}
                    dot={false}
                    name="🔥 실시간 화재 발생 확률"
                    filter="drop-shadow(0 0 8px rgba(136, 132, 216, 0.6))"
                  />
                  <ReferenceLine 
                    yAxisId="left" 
                    y={threshold} 
                    stroke="#ff7300"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    label={{ value: `⚠️ ${threshold}`, fill: '#ff7300', fontSize: 12 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ 
              marginTop: '16px', 
              padding: '12px',
              background: 'rgba(139, 180, 248, 0.1)',
              borderRadius: '8px',
              fontSize: '13px', 
              color: '#aaa',
              textAlign: 'center',
              border: '1px solid rgba(139, 180, 248, 0.2)'
            }}>
              💡 임계값 {threshold} 이상이면 화재 위험으로 분류됩니다. 
              차트의 점에 마우스를 올리면 상세 센서 데이터를 볼 수 있습니다.
            </div>
          </div>

          

          {/* 실시간 상태 표시 */}
          <RealTimeStatusPanel
            rows={rows}
            threshold={threshold}
            currentTime={currentTime}
          />

          {/* 시스템 정보 */}
          <div style={{
            marginTop: '24px',
            background: 'rgba(26, 26, 46, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#8ab4f8' }}>📋 시스템 정보</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#aaa', fontSize: '14px', lineHeight: '1.8' }}>
              <li><strong style={{ color: '#8ab4f8' }}>🔥 화재 확률</strong>: 온도(20°C+), 습도(40%-), TVOC(500ppb+), eCO2(400ppm+), PM2.5(1.5+) 기반 계산</li>
              <li><strong style={{ color: '#82ca9d' }}>📊 예측</strong>: 화재 확률이 설정한 임계값 이상일 때 1 (위험), 이하일 때 0 (정상)</li>
              <li><strong style={{ color: '#ffc658' }}>🚨 실제 알람</strong>: 데이터베이스에 저장된 실제 화재 알람 발생 여부</li>
              <li><strong style={{ color: '#ff7300' }}>💡 센서 데이터</strong>: 차트의 점에 마우스를 올리면 해당 시점의 상세 센서 값 확인 가능</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

// 통계 카드 컴포넌트
const StatCard = ({ icon, label, value, gradient }) => (
  <div style={{
    width:'200px',
    background: gradient,
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.2s',
    cursor: 'pointer'
  }}
  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</div>
    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{value}</div>
  </div>
);

// 실시간 상태 표시 패널 컴포넌트
const RealTimeStatusPanel = ({ rows, threshold, currentTime }) => {
  // 가장 최근 데이터로 현재 상태 계산
  const latestData = rows.length > 0 ? rows[rows.length - 1] : null;
  const currentRisk = latestData ? latestData.prob_fire : 0;

  // 상태 결정 (안전/주의/위험)
  const getStatus = () => {
    if (currentRisk < threshold * 0.5) {
      return {
        level: 'safe',
        text: '안전',
        color: '#4ade80',
        bgColor: 'rgba(74, 222, 128, 0.1)',
        borderColor: 'rgba(74, 222, 128, 0.3)',
        icon: '✅',
        animation: 'none'
      };
    } else if (currentRisk < threshold) {
      return {
        level: 'warning',
        text: '주의',
        color: '#fb923c',
        bgColor: 'rgba(251, 146, 60, 0.1)',
        borderColor: 'rgba(251, 146, 60, 0.3)',
        icon: '⚠️',
        animation: 'none'
      };
    } else {
      return {
        level: 'danger',
        text: '위험',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
        icon: '🚨',
        animation: 'blink 1s infinite'
      };
    }
  };

  const status = getStatus();

  return (
    <>
      <style>
        {`
          @keyframes blink {
            0%, 50%, 100% { opacity: 1; }
            25%, 75% { opacity: 0.4; }
          }
        `}
      </style>
      <div style={{
        marginTop: '24px',
        background: 'rgba(26, 26, 46, 0.6)',
        backdropFilter: 'blur(10px)',
        border: `2px solid ${status.borderColor}`,
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
      }}>
        <h4 style={{ margin: '0 0 20px 0', color: '#8ab4f8', fontSize: '18px' }}>
          📡 실시간 화재 위험 모니터링
        </h4>

        {/* 메인 상태 표시 */}
        <div style={{
          background: status.bgColor,
          border: `2px solid ${status.borderColor}`,
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
          marginBottom: '20px',
          animation: status.animation
        }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>{status.icon}</div>
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: status.color,
            marginBottom: '8px'
          }}>
            {status.text}
          </div>
          <div style={{
            fontSize: '24px',
            color: status.color,
            fontWeight: '600'
          }}>
            위험도: {(currentRisk * 100).toFixed(1)}%
          </div>
        </div>

        {/* 상세 정보 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '16px'
        }}>
          {/* 업데이트 시간 */}
          <div style={{
            background: 'rgba(139, 180, 248, 0.1)',
            border: '1px solid rgba(139, 180, 248, 0.2)',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ fontSize: '12px', color: '#8ab4f8', marginBottom: '4px' }}>
              🕐 업데이트 시간
            </div>
            <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600' }}>
              {currentTime.toLocaleTimeString('ko-KR')}
            </div>
          </div>

          {/* 위치 정보 */}
          <div style={{
            background: 'rgba(139, 180, 248, 0.1)',
            border: '1px solid rgba(139, 180, 248, 0.2)',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ fontSize: '12px', color: '#8ab4f8', marginBottom: '4px' }}>
              📍 모니터링 위치
            </div>
            <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600' }}>
              센서 위치 A동 3층
            </div>
          </div>
        </div>

        {/* 센서 상세 데이터 */}
        {latestData && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{ fontSize: '14px', color: '#8ab4f8', marginBottom: '12px', fontWeight: '600' }}>
              📊 센서 데이터
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              fontSize: '13px',
              color: '#aaa'
            }}>
              <div>
                <span style={{ color: '#8ab4f8' }}>🌡️ 온도:</span>
                <br />
                <span style={{ color: '#fff', fontSize: '16px' }}>
                  {latestData.temperature?.toFixed(1)}°C
                </span>
              </div>
              <div>
                <span style={{ color: '#8ab4f8' }}>💧 습도:</span>
                <br />
                <span style={{ color: '#fff', fontSize: '16px' }}>
                  {latestData.humidity?.toFixed(1)}%
                </span>
              </div>
              <div>
                <span style={{ color: '#8ab4f8' }}>💨 TVOC:</span>
                <br />
                <span style={{ color: '#fff', fontSize: '16px' }}>
                  {latestData.tvoc?.toFixed(0)} ppb
                </span>
              </div>
              <div>
                <span style={{ color: '#8ab4f8' }}>🫁 eCO2:</span>
                <br />
                <span style={{ color: '#fff', fontSize: '16px' }}>
                  {latestData.eco2?.toFixed(0)} ppm
                </span>
              </div>
              <div>
                <span style={{ color: '#8ab4f8' }}>🌫️ PM2.5:</span>
                <br />
                <span style={{ color: '#fff', fontSize: '16px' }}>
                  {latestData.pm25?.toFixed(1)} μg/m³
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 상태 설명 */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(139, 180, 248, 0.05)',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#aaa',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: '600', color: '#8ab4f8' }}>
            상태 기준
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <span style={{ color: '#4ade80' }}>✅ 안전: {(threshold * 0.5 * 100).toFixed(0)}% 미만</span>
            <span style={{ color: '#fb923c' }}>⚠️ 주의: {(threshold * 0.5 * 100).toFixed(0)}% ~ {(threshold * 100).toFixed(0)}%</span>
            <span style={{ color: '#ef4444' }}>🚨 위험: {(threshold * 100).toFixed(0)}% 이상</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default SmokeDetect;