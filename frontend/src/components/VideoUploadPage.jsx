import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import './VideoUploadPage.css';
import Header from '../user/Header';

const VideoUploadPage = () => {
  const [videos, setVideos] = useState([]);
  const [videoUrls, setVideoUrls] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadVideos();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
    } else {
      setError('로그인이 필요합니다.');
    }
  };

  const loadVideos = async () => {
    if (!user) return;

    console.log('📋 영상 목록 로드 시작 - User ID:', user.id);
    setLoading(true);
    setError('');

    try {
      // 1. Storage에서 실제 파일 목록 조회
      console.log('📦 Storage 파일 목록 조회...');
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('emergency-videos')
        .list(user.id, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (storageError) {
        console.error('❌ Storage 조회 실패:', storageError);
      } else {
        console.log('📦 Storage 파일 개수:', storageFiles?.length, '개');
        console.log('📦 Storage 파일 목록:', storageFiles);
      }

      // 2. DB에서 레코드 조회
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('❌ 영상 목록 조회 실패:', error);
        throw error;
      }

      console.log('✅ DB 레코드 개수:', data?.length, '개');
      console.log('📹 DB 레코드:', data);

      // 3. DB와 Storage 비교
      const dbPaths = new Set(data?.map(v => v.storage_path) || []);
      const storagePaths = storageFiles?.map(f => `${user.id}/${f.name}`) || [];

      console.log('🔍 DB 경로:', Array.from(dbPaths));
      console.log('🔍 Storage 경로:', storagePaths);

      // Storage에만 있고 DB에 없는 파일 찾기
      const orphanFiles = storagePaths.filter(path => !dbPaths.has(path));
      if (orphanFiles.length > 0) {
        console.warn('⚠️ DB에 없는 고아 파일:', orphanFiles);
        console.log('🧹 고아 파일 자동 삭제 시작...');

        // 고아 파일 자동 삭제
        for (const orphanPath of orphanFiles) {
          const { error: removeError } = await supabase.storage
            .from('emergency-videos')
            .remove([orphanPath]);

          if (removeError) {
            console.error('❌ 고아 파일 삭제 실패:', orphanPath, removeError);
          } else {
            console.log('✅ 고아 파일 삭제 완료:', orphanPath);
          }
        }
      }

      // DB에만 있고 Storage에 없는 레코드 찾기
      const missingFiles = Array.from(dbPaths).filter(path => !storagePaths.includes(path));
      if (missingFiles.length > 0) {
        console.warn('⚠️ Storage에 없는 DB 레코드:', missingFiles);
        console.log('🧹 잘못된 DB 레코드 자동 삭제 시작...');

        // Storage에 없는 DB 레코드 삭제
        for (const missingPath of missingFiles) {
          const videoToDelete = data.find(v => v.storage_path === missingPath);
          if (videoToDelete) {
            const { error: deleteError } = await supabase
              .from('videos')
              .delete()
              .eq('id', videoToDelete.id);

            if (deleteError) {
              console.error('❌ DB 레코드 삭제 실패:', missingPath, deleteError);
            } else {
              console.log('✅ DB 레코드 삭제 완료:', missingPath);
            }
          }
        }

        // 정리 후 다시 조회
        if (orphanFiles.length > 0 || missingFiles.length > 0) {
          console.log('🔄 정리 완료, 목록 다시 조회...');
          setTimeout(() => loadVideos(), 1000);
          return;
        }
      }

      setVideos(data || []);

      // 각 비디오에 대한 signed URL 생성
      console.log('🔗 Signed URL 생성 시작...');
      const urls = {};
      for (const video of data || []) {
        const { data: signedData, error: signError } = await supabase.storage
          .from('emergency-videos')
          .createSignedUrl(video.storage_path, 3600);

        if (signError) {
          console.error('❌ Signed URL 생성 실패:', video.storage_path, signError);
        } else if (signedData?.signedUrl) {
          console.log('✅ Signed URL 생성:', video.filename);
          urls[video.id] = signedData.signedUrl;
        }
      }
      console.log('🔗 Signed URL 개수:', Object.keys(urls).length);
      setVideoUrls(urls);
    } catch (err) {
      console.error('💥 영상 목록 로드 실패:', err);
      setError('영상 목록을 불러오는데 실패했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('📤 업로드 시작:', file.name, 'Size:', file.size, 'Type:', file.type);

    // 파일 타입 검증
    if (!file.type.startsWith('video/')) {
      setError('비디오 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 검증 (500MB 제한)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('파일 크기는 500MB 이하여야 합니다.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // 파일명에서 확장자 추출
      const extension = file.name.split('.').pop();
      // 안전한 파일명 생성 (타임스탬프 + 확장자)
      const fileName = `${Date.now()}.${extension}`;
      const filePath = `${user.id}/${fileName}`;
      console.log('📁 Storage 경로:', filePath);
      console.log('📝 원본 파일명:', file.name, '→ 저장 파일명:', fileName);

      // Storage에 파일 업로드
      console.log('⬆️ Storage 업로드 시작...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('emergency-videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Storage 업로드 실패:', uploadError);
        throw uploadError;
      }
      console.log('✅ Storage 업로드 성공:', uploadData);

      // videos 테이블에 메타데이터 저장 (storage_url은 나중에 signed URL로 생성)
      console.log('💾 DB 저장 시작...');
      const insertData = {
        user_id: user.id,
        filename: file.name,
        storage_path: filePath,
        storage_url: filePath, // storage_path를 저장 (나중에 signed URL 생성용)
        file_size: file.size,
        metadata: {
          type: file.type,
          originalName: file.name
        }
      };
      console.log('📝 Insert 데이터:', insertData);

      const { data: dbData, error: dbError } = await supabase
        .from('videos')
        .insert(insertData);

      if (dbError) {
        console.error('❌ DB 저장 실패:', dbError);
        // DB 저장 실패 시 업로드된 파일 삭제
        console.log('🗑️ 업로드된 파일 롤백 중...');
        await supabase.storage.from('emergency-videos').remove([filePath]);
        throw dbError;
      }
      console.log('✅ DB 저장 성공:', dbData);

      setSuccess('영상이 성공적으로 업로드되었습니다!');
      loadVideos();

      // 파일 입력 리셋
      e.target.value = '';
    } catch (err) {
      console.error('💥 업로드 전체 실패:', err);
      setError('업로드 실패: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (videoId, storagePath) => {
    if (!window.confirm('이 영상을 삭제하시겠습니까?')) {
      return;
    }

    console.log('🗑️ 삭제 시작 - Video ID:', videoId, 'Storage Path:', storagePath);

    setError('');
    setSuccess('');

    try {
      // Storage에서 파일 삭제
      console.log('📦 Storage에서 파일 삭제 중...');
      const { data: storageData, error: storageError } = await supabase.storage
        .from('emergency-videos')
        .remove([storagePath]);

      if (storageError) {
        console.error('❌ Storage 삭제 실패:', storageError);
        throw storageError;
      }
      console.log('✅ Storage 삭제 성공:', storageData);

      // videos 테이블에서 레코드 삭제
      console.log('💾 DB에서 레코드 삭제 중...');
      const { data: dbData, error: dbError } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (dbError) {
        console.error('❌ DB 삭제 실패:', dbError);
        throw dbError;
      }
      console.log('✅ DB 삭제 성공:', dbData);

      setSuccess('영상이 삭제되었습니다.');
      loadVideos();
    } catch (err) {
      console.error('💥 삭제 전체 실패:', err);
      setError('삭제 실패: ' + err.message);
    }
  };

  const getVideoUrl = (storagePath) => {
    // Signed URL 생성 (1시간 유효)
    const { data } = supabase.storage
      .from('emergency-videos')
      .createSignedUrl(storagePath, 3600);

    return data?.signedUrl || '';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
  };

  if (!user) {
    return (
      <div className="upload-page">
        <div className="upload-container">
          <div className="error-message">
            로그인이 필요합니다. <a href="/user/login">로그인 페이지로 이동</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
     <Header/>
      <div className="upload-page">
        <div className="upload-container">
          <h1>영상 관리</h1>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="upload-section">
            <h2>영상 업로드</h2>
            <div className="upload-area">
              <label htmlFor="video-input" className="upload-button">
                {uploading ? '업로드 중...' : '📹 영상 선택'}
              </label>
              <input
                id="video-input"
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              <p className="upload-info">
                지원 형식: MP4, AVI, MOV, WMV 등 | 최대 크기: 500MB
              </p>
            </div>
          </div>

          <div className="videos-section">
            <div className="section-header">
              <h2>내 영상 목록</h2>
              <button onClick={loadVideos} disabled={loading} className="refresh-button">
                재조회
              </button>
            </div>

            {loading ? (
              <div className="loading">영상 목록을 불러오는 중...</div>
            ) : videos.length === 0 ? (
              <div className="no-videos">업로드된 영상이 없습니다.</div>
            ) : (
              <div className="videos-grid">
                {videos.map((video) => (
                  <div key={video.id} className="video-card">
                    <div className="video-preview">
                      {videoUrls[video.id] ? (
                        <video
                          src={videoUrls[video.id]}
                          controls
                          preload="metadata"
                        />
                      ) : (
                        <div className="loading">URL 생성 중...</div>
                      )}
                    </div>
                    <div className="video-info">
                      <h3>{video.filename}</h3>
                      <p>크기: {formatFileSize(video.file_size || 0)}</p>
                      <p>업로드: {formatDate(video.uploaded_at)}</p>
                    </div>
                    <div className="video-actions">
                      <a
                        href={videoUrls[video.id] || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="view-button"
                        onClick={(e) => !videoUrls[video.id] && e.preventDefault()}
                      >
                        보기
                      </a>
                      <button
                        onClick={() => handleDelete(video.id, video.storage_path)}
                        className="delete-button"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default VideoUploadPage;
