import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

function VideoSelector({ onVideoSelect }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideoId, setSelectedVideoId] = useState('');

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

  const handleDelete = async (videoId) => {
    if (!window.confirm('이 비디오를 삭제하시겠습니까?')) return;

    try {
      const video = videos.find(v => v.id === videoId);
      if (!video) return;

      // Storage에서 파일 삭제
      const { error: storageError } = await supabase.storage
        .from('emergency-videos')
        .remove([video.storage_path]);

      if (storageError) throw storageError;

      // DB에서 레코드 삭제
      const { error: dbError } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (dbError) throw dbError;

      // 목록 새로고침
      await fetchVideos();

      if (selectedVideoId === videoId) {
        setSelectedVideoId('');
      }

      console.log('✅ 비디오 삭제 완료');
    } catch (err) {
      console.error('비디오 삭제 오류:', err);
      alert(`삭제 실패: ${err.message}`);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="video-selector loading">비디오 목록 로딩 중...</div>;
  }

  if (error) {
    return (
      <div className="video-selector error">
        ⚠️ 오류: {error}
        <button onClick={fetchVideos}>다시 시도</button>
      </div>
    );
  }

  return (
    <div className="video-selector">
      <div className="selector-header">
        <h3>저장된 비디오 선택</h3>
        <button onClick={fetchVideos} className="refresh-button">
          🔄 새로고침
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="no-videos">
          저장된 비디오가 없습니다. 먼저 비디오를 업로드해주세요.
        </div>
      ) : (
        <>
          <select
            value={selectedVideoId}
            onChange={handleSelect}
            className="video-select"
          >
            <option value="">-- 비디오를 선택하세요 --</option>
            {videos.map((video) => (
              <option key={video.id} value={video.id}>
                {video.filename} ({formatDate(video.uploaded_at)})
              </option>
            ))}
          </select>

          {videos.length > 0 && (
            <div className="video-list">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className={`video-item ${selectedVideoId === video.id ? 'selected' : ''}`}
                >
                  <div className="video-info">
                    <div className="video-name">{video.filename}</div>
                    <div className="video-meta">
                      {formatFileSize(video.file_size)} • {formatDate(video.uploaded_at)}
                    </div>
                  </div>
                  <div className="video-actions">
                    <button
                      onClick={() => handleSelect({ target: { value: video.id } })}
                      className="select-button"
                    >
                      선택
                    </button>
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="delete-button"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .video-selector {
          margin: 20px 0;
          padding: 20px;
          background: #f5f5f5;
          border-radius: 8px;
        }

        .selector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .selector-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .refresh-button {
          padding: 5px 10px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .refresh-button:hover {
          background: #1976D2;
        }

        .video-select {
          width: 100%;
          padding: 10px;
          font-size: 16px;
          border: 2px solid #ddd;
          border-radius: 5px;
          margin-bottom: 15px;
          cursor: pointer;
        }

        .video-select:focus {
          outline: none;
          border-color: #2196F3;
        }

        .no-videos {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
        }

        .video-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .video-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: white;
          border: 2px solid #ddd;
          border-radius: 5px;
          transition: all 0.3s;
        }

        .video-item.selected {
          border-color: #4CAF50;
          background: #e8f5e9;
        }

        .video-item:hover {
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .video-info {
          flex: 1;
        }

        .video-name {
          font-weight: bold;
          margin-bottom: 5px;
        }

        .video-meta {
          font-size: 12px;
          color: #666;
        }

        .video-actions {
          display: flex;
          gap: 10px;
        }

        .select-button {
          padding: 6px 12px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .select-button:hover {
          background: #45a049;
        }

        .delete-button {
          padding: 6px 12px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .delete-button:hover {
          background: #da190b;
        }

        .loading, .error {
          text-align: center;
          padding: 20px;
        }

        .error button {
          margin-left: 10px;
          padding: 5px 10px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

export default VideoSelector;
