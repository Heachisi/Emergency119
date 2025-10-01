import React, { useState } from 'react';
import { supabase } from '../supabase';

function VideoManager({ onVideoUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 비디오 파일 검증
    if (!file.type.startsWith('video/')) {
      setError('비디오 파일만 업로드 가능합니다.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 현재 로그인된 사용자 정보 가져오기
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('로그인이 필요합니다.');
      }

      // 파일명 생성 (고유값 + 원본 파일명)
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${timestamp}.${fileExt}`;

      // Supabase Storage에 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('emergency-videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Public URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('emergency-videos')
        .getPublicUrl(fileName);

      // DB에 메타데이터 저장
      const { data: videoRecord, error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          filename: file.name,
          storage_path: fileName,
          storage_url: publicUrl,
          file_size: file.size,
          metadata: {
            type: file.type,
            lastModified: file.lastModified
          }
        })
        .select()
        .single();

      if (dbError) throw dbError;

      console.log('✅ 비디오 업로드 완료:', videoRecord);

      // 업로드 성공 콜백
      if (onVideoUploaded) {
        onVideoUploaded(videoRecord);
      }

      // 입력 필드 초기화
      event.target.value = '';

    } catch (err) {
      console.error('업로드 오류:', err);
      setError(err.message || '업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="video-manager">
      <div className="upload-section">
        <label htmlFor="video-upload" className="upload-label">
          {uploading ? '업로드 중...' : '비디오 업로드'}
        </label>
        <input
          id="video-upload"
          type="file"
          accept="video/*"
          onChange={handleFileUpload}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => document.getElementById('video-upload').click()}
          disabled={uploading}
          className="upload-button"
        >
          {uploading ? '⏳ 업로드 중...' : '📤 비디오 선택'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <style jsx>{`
        .video-manager {
          margin: 20px 0;
        }

        .upload-section {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .upload-button {
          padding: 10px 20px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          transition: background 0.3s;
        }

        .upload-button:hover:not(:disabled) {
          background: #45a049;
        }

        .upload-button:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }

        .error-message {
          margin-top: 10px;
          padding: 10px;
          background: #ffebee;
          color: #c62828;
          border-radius: 5px;
        }
      `}</style>
    </div>
  );
}

export default VideoManager;
