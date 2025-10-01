import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase.js';
import Emergency from '../images/EmergencyRed.png';
import NineOneOne from '../images/119Orange.png';
import Header from '../user/Header';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 엔터키 처리
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin();
    }
  };

  // 로그인 처리
  const handleLogin = async () => {
    // 입력 유효성 검사
    if (!formData.email.trim()) {
      alert('이메일을 입력해주세요.');
      return;
    }

    if (!formData.password.trim()) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
        if (!data.user.email_confirmed_at) {
          alert('이메일 인증이 필요합니다. 이메일을 확인해주세요.');
          await supabase.auth.signOut();
          return;
        }

        // 사용자의 아이디를 가져오기 위해 추가 정보 조회
        const userId = data.user.user_metadata?.user_id || formData.email.split('@')[0];

        alert('로그인 성공!');
        navigate('/analysis');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      if (error.message.includes('Invalid login credentials')) {
        alert('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        alert(`로그인 중 오류가 발생했습니다: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email_confirmed_at) {
            // 이미 인증완료된 사용자면 메인페이지로
            navigate('/');
        }
    };
    checkUser();
}, [navigate]);

  const navigateToFindid = () => {
    window.location.href = '/user/findid';
  };

  const handleResetPassword = async () => {
    const email = prompt('비밀번호를 재설정할 이메일 주소를 입력해주세요:');

    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/user/resetpw`
      });

      if (error) throw error;

      alert('비밀번호 재설정 링크를 이메일로 발송했습니다.\n메일함을 확인해주세요.');
    } catch (error) {
      console.error('비밀번호 재설정 요청 오류:', error);
      // 보안을 위해 항상 동일한 메시지 표시
      alert('비밀번호 재설정 링크를 이메일로 발송했습니다.\n메일함을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignup = () => {
    window.location.href = '/user/signup';
  };

  return (
    <>
      <Header />
      <div style={{
        width: "100%",
        height: "calc(100vh - 45px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative"
      }}>

        {/* 로그인 전체 박스 */}
        <div style={{
          width: "400px",
          background: "#FFE4B5",
          border: "2px solid #FF6B35",
          borderRadius: "20px",
          padding: "20px 30px",
          textAlign: "center",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
        }}>

          {/* 로고 부분 */}
          <div style={{
            borderRadius: "15px",
            padding: "10px"
          }}>
            <img
              src={Emergency}
              alt="Emergency"
              style={{
                width: "220px",
                height: "auto",
                marginBottom: "3px"
              }}
            />
            <img
              src={NineOneOne}
              alt="119"
              style={{
                width: "100px",
                height: "auto"
              }}
            />
          </div>

          {/* 로그인 내부 박스 */}
          <div style={{
            width: "330px",
            background: "white",
            borderRadius: "20px",
            padding: "20px",
            textAlign: "center",
            marginBottom: "10px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          }}>

            {/* Log in 텍스트 */}
            <h2 style={{
              color: "#FF6B35",
              fontSize: "24px",
              fontWeight: "600",
              marginBottom: "20px",
              fontFamily: "Montserrat, sans-serif"
            }}>Log in</h2>

            {/* 입력 필드들 */}
            <div style={{ marginBottom: "15px", textAlign: "left", color:"black" }}>
              <label style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "14px",
                fontWeight: "500"
              }}>이메일</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
                placeholder="이메일을 입력하세요"
              />
            </div>

            <div style={{ marginBottom: "25px", textAlign: "left", color:"black" }}>
              <label style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "14px",
                fontWeight: "500"
              }}>비밀번호</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            {/* 로그인 버튼 */}
            <button 
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: "100%",
                padding: "8px",
                background: loading ? "#ccc" : "#D52222",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: loading ? "not-allowed" : "pointer",
                marginBottom: "5px"
              }}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </div>
          
          {/* 하단 링크들 */}
          <div style={{
            fontSize: "14px",
            color: "#FF6B35",
            marginTop: "20px"
          }}>
            <span
              onClick={handleResetPassword}
              style={{
                cursor: "pointer",
                marginLeft: "10px",
                textDecoration: "underline"
              }}
            >
              비밀번호를 잊으셨나요?
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;