import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { supabase } from '../supabase.js'; // Flask를 호출할 거라면 굳이 필요 X
import Header from '../components/Header';

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

  const loadData = async () => {
    try {
      setLoading(true);
      setErr('');
      const qs = new URLSearchParams();
      if (since) qs.set('since', since);
      if (limit) qs.set('limit', String(limit));

      // Flask 백엔드 (동일 도메인/프록시 가정) 예: http://localhost:8000/api/predict
      const res = await fetch(`/api/predict?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // 차트용 가공
      const shaped = json.map(d => ({
        t: new Date(d.created_at).toLocaleString(), // x축 라벨
        prob_fire: Number(d.prob_fire),
        pred: Number(d.pred),
      }));
      setRows(shaped);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 초기 로드
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header />
      <div style={{ maxWidth: 1200, margin: '16px auto', padding: '0 16px' }}>
        <h2 style={{ marginBottom: 12 }}>Fire Alarm Probability</h2>

        {/* 컨트롤 바 */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            Since:
            <input
              placeholder="YYYY-MM-DD 또는 ISO8601"
              value={since}
              onChange={e => setSince(e.target.value)}
              style={{ padding: 6 }}
            />
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            Limit:
            <input
              type="number"
              min={1}
              max={100000}
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              style={{ width: 120, padding: 6 }}
            />
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            Threshold:
            <input
              type="number" step="0.01" min={0} max={1}
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              style={{ width: 100, padding: 6 }}
            />
          </label>
          <button onClick={loadData} disabled={loading} style={{ padding: '8px 12px' }}>
            {loading ? 'Loading...' : 'Reload'}
          </button>
          {err && <span style={{ color: 'crimson' }}>에러: {err}</span>}
        </div>

        {/* 차트 */}
        <div style={{ width: '100%', height: 420, background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
          <ResponsiveContainer>
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t" minTickGap={24} />
              <YAxis yAxisId="left" domain={[0, 1]} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 1]} ticks={[0, 1]} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="prob_fire" dot={false} name="Prob(Fire)" />
              <Line yAxisId="right" type="stepAfter" dataKey="pred" dot={false} name="Pred (0/1)" />
              <ReferenceLine yAxisId="left" y={threshold} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 8, fontSize: 12, color: '#555' }}>
            임계값 {threshold} 이상이면 모델이 Fire=1 로 분류.
          </div>
        </div>

        {/* 데이터 없을 때 안내 */}
        {!loading && rows.length === 0 && (
          <div style={{ marginTop: 12, color: '#777' }}>
            표시할 데이터가 없습니다. 기간/limit를 조정해서 다시 시도하세요.
          </div>
        )}
      </div>
    </>
  );
};

export default SmokeDetect;
