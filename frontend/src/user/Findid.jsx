import React, { useState } from 'react';
import Emergency from '../images/EmergencyRed.png';
import NineOneOne from '../images/119Orange.png';
import Extinguisher from '../images/extinguisher.png';
import Header from '../components/Header';

const Findid = () => {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(135); // 2:15 = 135초

  // 타이머 표시 함수
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Header />
      <div style={{
        width: "100%",
        height: "calc(100vh - 45px)",
        background: "linear-gradient(to bottom, #fefaedff, #fff4dfff)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative"
      }}>

        {/* 소화기 이미지 - 오른쪽 하단 */}
        <img
          src={Extinguisher}
          alt="소화기"
          style={{
            cursor: "pointer",
            position: "absolute",
            bottom: "20px",
            right: "20px",
            width: "80px",
            height: "auto"
          }}
        />

        {/* 아이디 찾기 전체 박스 */}
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

          {/* 아이디 찾기 내부 박스 */}
          <div style={{
            width: "330px",
            background: "white",
            borderRadius: "20px",
            padding: "20px",
            textAlign: "center",
            marginBottom: "10px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          }}>
            
            {/* Find ID 텍스트 */}
            <h2 style={{
              color: "#FF6B35",
              fontSize: "24px",
              fontWeight: "600",
              marginBottom: "20px",
              fontFamily: "Montserrat, sans-serif"
            }}>Find ID</h2>

            {/* 이메일 입력 필드 */}
            <div style={{ marginBottom: "15px", textAlign: "left" }}>
              <label style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "14px",
                fontWeight: "500"
              }}>이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  marginBottom: "10px"
                }}
                placeholder="이메일을 입력하세요"
              />
              <button style={{
                width: "100%",
                padding: "10px",
                background: "#FF6B35",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer"
              }}>이메일 인증</button>
            </div>

            {/* 인증번호 입력 필드 */}
            <div style={{ marginBottom: "20px", textAlign: "left" }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                marginBottom: "5px"
              }}>
                <label style={{
                  fontSize: "14px",
                  fontWeight: "500"
                }}>인증번호 입력</label>
                <span style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: "#FF0000"
                }}>{formatTime(timeLeft)}</span>
              </div>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  marginBottom: "10px"
                }}
                placeholder="인증번호를 입력하세요."
              />
              <button style={{
                width: "100%",
                padding: "10px",
                background: "#FF6B35",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer"
              }}>인증번호 확인</button>
            </div>

            {/* 아이디 찾기 버튼 */}
            <button style={{
              width: "100%",
              padding: "12px",
              background: "#D52222",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer"
            }}>아이디 찾기</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Findid;