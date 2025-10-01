import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

function SimpleVideoSelector({ onVideoSelect, autoSelect = false }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [autoSelectTriggered, setAutoSelectTriggered] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      // 현재 사용자 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // 사용자의 비디오 목록 조회
      const { data, error: fetchError } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (fetchError) throw fetchError;

      setVideos(data || []);

      // autoSelect가 true이고 비디오가 있으면 자동으로 첫 번째(가장 최근) 비디오 선택
      if (autoSelect && data && data.length > 0 && !autoSelectTriggered) {
        const firstVideo = data[0];
        setSelectedVideoId(firstVideo.id);
        setAutoSelectTriggered(true);

        if (onVideoSelect) {
          // 약간의 딜레이를 주어 UI가 렌더링된 후 선택
          setTimeout(() => {
            onVideoSelect(firstVideo);
          }, 100);
        }
      }
    } catch (err) {
      console.error('비디오 목록 조회 오류:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (e) => {
    const videoId = e.target.value;
    setSelectedVideoId(videoId);

    if (videoId && onVideoSelect) {
      const selectedVideo = videos.find(v => v.id === videoId);
      if (selectedVideo) {
        onVideoSelect(selectedVideo);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="simple-video-selector">
        <select disabled className="video-select">
          <option>비디오 목록 로딩 중...</option>
        </select>
      </div>
    );
  }

  if (error) {
    return (
      <div className="simple-video-selector">
        <select disabled className="video-select error">
          <option>오류: {error}</option>
        </select>
      </div>
    );
  }

  return (
    <div className="simple-video-selector">
      <select
        value={selectedVideoId}
        onChange={handleSelect}
        className="video-select"
      >
        <option value="">-- 분석할 비디오를 선택하세요 --</option>
        {videos.map((video) => (
          <option key={video.id} value={video.id}>
            {video.filename} 
             {/* ({formatDate(video.uploaded_at)}) */}
          </option>
        ))}
      </select>

      {videos.length === 0 && (
        <p className="no-videos-message">
          저장된 비디오가 없습니다. Supabase에 비디오를 먼저 업로드해주세요.
        </p>
      )}

      <style jsx>{`
        .simple-video-selector {
          width: 100%;
        }

        .video-select {
          width: 100%;
          padding: 12px 16px;
          font-size: 16px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .video-select:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.4);
          background: rgba(255, 255, 255, 0.15);
        }

        .video-select:focus {
          outline: none;
          border-color: #4CAF50;
          box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
        }

        .video-select:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .video-select.error {
          border-color: #ff4444;
        }

        .video-select option {
          background: #1a1a2e;
          color: white;
          padding: 10px;
        }

        .no-videos-message {
          margin-top: 10px;
          padding: 12px;
          background: rgba(255, 193, 7, 0.1);
          border: 1px solid rgba(255, 193, 7, 0.3);
          border-radius: 6px;
          color: #ffc107;
          font-size: 14px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}

export default SimpleVideoSelector;
