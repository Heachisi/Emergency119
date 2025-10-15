// frontend/src/components/Footer.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import './Footer.css';

const Footer = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // 로그인 상태 확인
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session?.user);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsLoggedIn(!!session?.user);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  // 회원탈퇴 처리
  const handleDeleteAccount = async () => {
    if (!password.trim()) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    setIsDeleting(true);

    try {
      // 1. 현재 사용자 정보 가져오기
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('사용자 정보를 가져올 수 없습니다.');
      }

      // 2. 비밀번호 확인 (재인증)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      });

      if (signInError) {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }

      // 3. public.users 테이블에서 사용자 비활성화
      const { error: publicUsersError } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', user.id);

      if (publicUsersError) {
        console.error('users 테이블 업데이트 오류:', publicUsersError);
      }

      // 4. auth.users에서 완전 삭제 (Database Function 사용)
      // 먼저 delete_user() 함수가 생성되어 있어야 합니다
      const { error: deleteError } = await supabase.rpc('delete_user');

      if (deleteError) {
        console.error('계정 삭제 오류:', deleteError);
      }

      // 5. 세션 완전히 종료
      await supabase.auth.signOut();

      // 6. 로컬/세션 스토리지 정리
      sessionStorage.clear();
      localStorage.clear();

      alert('회원탈퇴가 완료되었습니다.');
      setShowDeleteModal(false);
      setPassword('');

      // 페이지 새로고침으로 상태 완전히 초기화
      window.location.href = '/';

    } catch (error) {
      console.error('회원탈퇴 오류:', error);
      alert(error.message || '회원탈퇴 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Emergency Detection System</h4>
            <p>AI 기반 실시간 안전 모니터링</p>
          </div>
          <div className="footer-section">
            <h4>연락처</h4>
            <p>긴급상황: 119</p>
            <p>기술지원: support@emergency.ai</p>
          </div>
          <div className="footer-section">
            <h4>시스템 정보</h4>
            <p>Version 1.0.0</p>
            <p>© 2024 Emergency AI Team</p>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="tech-info">
            {isLoggedIn && (
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#999',
                  fontSize: '15px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '5px 10px'
                }}
                onMouseEnter={(e) => e.target.style.color = '#666'}
                onMouseLeave={(e) => e.target.style.color = '#999'}
              >
                회원탈퇴
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* 회원탈퇴 확인 모달 */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{
              margin: '0 0 20px 0',
              fontSize: '22px',
              fontWeight: '700',
              color: '#d32f2f'
            }}>
              회원탈퇴
            </h2>

            <p style={{
              margin: '0 0 10px 0',
              fontSize: '14px',
              color: '#424242'
            }}>
              정말로 탈퇴하시겠습니까? 확인을 위해 <strong>비밀번호</strong>를 입력해주세요.
            </p>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              disabled={isDeleting}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '20px',
                boxSizing: 'border-box',
                transition: 'border-color 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#d32f2f'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPassword('');
                }}
                disabled={isDeleting}
                style={{
                  padding: '10px 24px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#666',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: isDeleting ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isDeleting) {
                    e.target.style.background = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDeleting) {
                    e.target.style.background = 'white';
                  }
                }}
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || !password.trim()}
                style={{
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: password.trim() && !isDeleting ? '#d32f2f' : '#ccc',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (password.trim() && !isDeleting) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (password.trim() && !isDeleting) {
                    e.target.style.background = '#b71c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (password.trim() && !isDeleting) {
                    e.target.style.background = '#d32f2f';
                  }
                }}
              >
                {isDeleting ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;