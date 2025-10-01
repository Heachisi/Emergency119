import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase.js'; // Supabase 클라이언트 import
import Header from '../user/Header';

import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';

const SmokeDetect = () => {
  const navigate = useNavigate();

  // 필터 상태
  const [since, setSince] = useState('');     // 예: '2020-10-16' 또는 '2020-10-16T00:00:00Z'
  const [limit, setLimit] = useState(1000);
  const [threshold, setThreshold] = useState(0.5);

  // 데이터 상태
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // 센서 데이터 기반 화재 확률 계산 함수 (더 민감하게 조정)
  const calculateFireProbability = (data) => {
    const {
      temperature_c = 0,
      humidity_percent = 0,
      tvoc_ppb = 0,
      eco2_ppm = 0,
      pm2_5 = 0
    } = data;

    let riskScore = 0;

    // 온도 위험도 - 더 민감하게 (20도 이상부터 시작, 최대 0.4)
    if (temperature_c > 20) {
      riskScore += Math.min((temperature_c - 20) / 25, 0.4);
    }
    
    // 습도 위험도 - 더 민감하게 (40% 이하에서 시작, 최대 0.3)
    if (humidity_percent < 40) {
      riskScore += Math.min((40 - humidity_percent) / 40, 0.3);
    }
    
    // TVOC 위험도 - 더 민감하게 (500ppb 이상부터, 최대 0.4)
    if (tvoc_ppb > 500) {
      riskScore += Math.min((tvoc_ppb - 500) / 1500, 0.4);
    }
    
    // eCO2 위험도 - 더 민감하게 (400ppm 이상부터, 최대 0.4)
    if (eco2_ppm > 400) {
      riskScore += Math.min((eco2_ppm - 400) / 600, 0.4);
    }
    
    // PM2.5 위험도 - 더 민감하게 (1.5 이상부터, 최대 0.3)
    if (pm2_5 > 1.5) {
      riskScore += Math.min((pm2_5 - 1.5) / 10, 0.3);
    }

    // 복합 위험도 계산 (센서들의 상호작용 고려)
    const tempHumidityRisk = temperature_c > 25 && humidity_percent < 30 ? 0.2 : 0;
    const gasRisk = tvoc_ppb > 800 && eco2_ppm > 600 ? 0.15 : 0;
    const particleRisk = pm2_5 > 3 ? 0.1 : 0;

    riskScore += tempHumidityRisk + gasRisk + particleRisk;

    // 최종 확률 계산 - 시그모이드 함수로 더 자연스러운 곡선
    const normalizedScore = Math.min(riskScore, 2.0);
    const probability = 1 / (1 + Math.exp(-3 * (normalizedScore - 0.5))); // 0.8 → 0.5로 더 민감하게
    
    return Math.min(Math.max(probability, 0.0), 1.0);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setErr('');

      // Supabase 쿼리 구성
      let query = supabase
        .from('smoke_sensor_data')
        .select('*')
        .order('created_at', { ascending: true });

      // since 필터 적용
      if (since) {
        query = query.gte('created_at', since);
      }

      // limit 적용
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // 차트용 데이터 가공
      const shaped = data.map(d => {
        const prob_fire = calculateFireProbability(d);
        const pred = prob_fire >= threshold ? 1 : 0;

        return {
          t: new Date(d.created_at).toLocaleString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }), // x축 라벨
          prob_fire: Number(prob_fire.toFixed(3)),
          pred: Number(pred),
          fire_alarm: d.fire_alarm ? 1 : 0, // 실제 화재 알람 상태
          temperature: d.temperature_c,
          humidity: d.humidity_percent,
          tvoc: d.tvoc_ppb,
          eco2: d.eco2_ppm,
          pm25: d.pm2_5,
          original: d // 원본 데이터 보관 (툴팁용)
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
    // 초기 로드 + threshold 변경시마다 재계산
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold]);

  // 커스텀 툴팁 컴포넌트
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{`시간: ${label}`}</p>
          <p style={{ margin: '4px 0', color: '#8884d8' }}>
            {`화재 확률: ${(data.prob_fire * 100).toFixed(1)}%`}
          </p>
          <p style={{ margin: '4px 0', color: '#82ca9d' }}>
            {`예측: ${data.pred ? '🔥 화재 위험' : '✅ 정상'}`}
          </p>
          <p style={{ margin: '4px 0', color: '#ffc658' }}>
            {`실제 알람: ${data.fire_alarm ? '🚨 발생' : '⭕ 없음'}`}
          </p>
          <hr style={{ margin: '4px 0' }} />
          <p style={{ margin: '2px 0' }}>{`🌡️ 온도: ${data.temperature?.toFixed(1) || 'N/A'}°C`}</p>
          <p style={{ margin: '2px 0' }}>{`💧 습도: ${data.humidity?.toFixed(1) || 'N/A'}%`}</p>
          <p style={{ margin: '2px 0' }}>{`💨 TVOC: ${data.tvoc?.toFixed(0) || 'N/A'} ppb`}</p>
          <p style={{ margin: '2px 0' }}>{`🫁 eCO2: ${data.eco2?.toFixed(0) || 'N/A'} ppm`}</p>
          <p style={{ margin: '2px 0' }}>{`🌫️ PM2.5: ${data.pm25?.toFixed(1) || 'N/A'} μg/m³`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Header />
      <div style={{ maxWidth: 1200, margin: '16px auto', padding: '0 16px' }}>
        <h2 style={{ marginBottom: 12 }}>🔥 화재 감지 시스템 대시보드</h2>

        {/* 컨트롤 바 */}
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          marginBottom: 12,
          padding: '12px',
          background: '#f5f5f5',
          borderRadius: '8px'
        }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            📅 시작 날짜:
            <input
              type="datetime-local"
              value={since}
              onChange={e => setSince(e.target.value)}
              style={{ padding: 6, borderRadius: 4, border: '1px solid #ddd' }}
            />
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            📊 데이터 개수:
            <input
              type="number"
              min={1}
              max={10000}
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              style={{ width: 120, padding: 6, borderRadius: 4, border: '1px solid #ddd' }}
            />
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            ⚠️ 임계값:
            <input
              type="number" 
              step="0.01" 
              min={0} 
              max={1}
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              style={{ width: 100, padding: 6, borderRadius: 4, border: '1px solid #ddd' }}
            />
          </label>
          <button 
            onClick={loadData} 
            disabled={loading} 
            style={{ 
              padding: '8px 16px',
              borderRadius: 4,
              border: 'none',
              background: loading ? '#ccc' : '#007bff',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '🔄 로딩 중...' : '🔄 새로고침'}
          </button>
          {err && <span style={{ color: 'crimson', fontSize: '14px' }}>❌ 오류: {err}</span>}
        </div>

        {/* 통계 정보 */}
        {rows.length > 0 && (
          <div style={{
            display: 'flex',
            gap: 16,
            marginBottom: 16,
            flexWrap: 'wrap'
          }}>
            <div style={{
              padding: '12px',
              background: '#e3f2fd',
              borderRadius: '8px',
              minWidth: '120px'
            }}>
              <div style={{ fontSize: '14px', color: '#666' }}>📋 총 데이터</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2' }}>
                {rows.length.toLocaleString()}
              </div>
            </div>
            <div style={{
              padding: '12px',
              background: '#fff3e0',
              borderRadius: '8px',
              minWidth: '120px'
            }}>
              <div style={{ fontSize: '14px', color: '#666' }}>🔥 화재 예측</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f57c00' }}>
                {rows.filter(r => r.pred === 1).length}
              </div>
            </div>
            <div style={{
              padding: '12px',
              background: '#ffebee',
              borderRadius: '8px',
              minWidth: '120px'
            }}>
              <div style={{ fontSize: '14px', color: '#666' }}>🚨 실제 알람</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d32f2f' }}>
                {rows.filter(r => r.fire_alarm === 1).length}
              </div>
            </div>
            <div style={{
              padding: '12px',
              background: '#e8f5e8',
              borderRadius: '8px',
              minWidth: '120px'
            }}>
              <div style={{ fontSize: '14px', color: '#666' }}>📈 평균 위험도</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#388e3c' }}>
                {(rows.reduce((sum, r) => sum + r.prob_fire, 0) / rows.length * 100).toFixed(1)}%
              </div>
            </div>
            {/* 정확도 통계 추가 */}
            <div style={{
              padding: '12px',
              background: '#f3e5f5',
              borderRadius: '8px',
              minWidth: '120px'
            }}>
              <div style={{ fontSize: '14px', color: '#666' }}>🎯 예측 정확도</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7b1fa2' }}>
                {rows.length > 0 ? 
                  ((rows.filter(r => r.pred === r.fire_alarm).length / rows.length) * 100).toFixed(1) + '%'
                  : '0%'}
              </div>
            </div>
          </div>
        )}

        {/* 차트 */}
        <div style={{ 
          width: '100%', 
          height: 420, 
          background: '#fff', 
          border: '1px solid #eee', 
          borderRadius: 8, 
          padding: 8,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <ResponsiveContainer>
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="t" 
                minTickGap={50}
                tick={{ fontSize: 10 }}
              />
              <YAxis yAxisId="left" domain={[0, 1]} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 1]} ticks={[0, 1]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="prob_fire" 
                stroke="#8884d8"
                strokeWidth={2}
                dot={false} 
                name="🔥 화재 확률" 
              />
              <Line 
                yAxisId="right" 
                type="stepAfter" 
                dataKey="pred" 
                stroke="#82ca9d"
                strokeWidth={2}
                dot={false} 
                name="📊 예측 (0/1)" 
              />
              <Line 
                yAxisId="right" 
                type="stepAfter" 
                dataKey="fire_alarm" 
                stroke="#ffc658"
                strokeWidth={3}
                dot={false} 
                name="🚨 실제 알람" 
              />
              <ReferenceLine 
                yAxisId="left" 
                y={threshold} 
                stroke="#ff7300"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={`⚠️ 임계값: ${threshold}`}
              />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 8, fontSize: 12, color: '#555', textAlign: 'center' }}>
            💡 임계값 {threshold} 이상이면 화재 위험으로 분류됩니다. 
            차트의 점에 마우스를 올리면 상세 센서 데이터를 볼 수 있습니다.
          </div>
        </div>

        {/* 데이터 없을 때 안내 */}
        {!loading && rows.length === 0 && (
          <div style={{ 
            marginTop: 20, 
            padding: '20px',
            textAlign: 'center',
            background: '#f8f9fa',
            borderRadius: '8px',
            color: '#6c757d'
          }}>
            📊 표시할 데이터가 없습니다. 날짜 범위나 데이터 개수를 조정해서 다시 시도해보세요.
          </div>
        )}

        {/* 설명 */}
        <div style={{
          marginTop: 20,
          padding: '16px',
          background: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#495057'
        }}>
          <h4 style={{ margin: '0 0 8px 0' }}>📋 시스템 정보</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li><strong>🔥 화재 확률</strong>: 온도(20°C+), 습도(40%-), TVOC(500ppb+), eCO2(400ppm+), PM2.5(1.5+) 기반 계산</li>
            <li><strong>📊 예측</strong>: 화재 확률이 설정한 임계값 이상일 때 1 (위험), 이하일 때 0 (정상)</li>
            <li><strong>🚨 실제 알람</strong>: 데이터베이스에 저장된 실제 화재 알람 발생 여부</li>
            <li><strong>🎯 예측 정확도</strong>: 모델 예측과 실제 알람의 일치율</li>
            <li><strong>💡 센서 데이터</strong>: 차트의 점에 마우스를 올리면 해당 시점의 상세 센서 값 확인 가능</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default SmokeDetect;