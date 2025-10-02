// frontend/src/App.js
import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ChatbotWidget from "./components/ChatbotWidget"; 
import './App.css';

// 기존 컴포넌트들
import HeroSection from './user/HeroSection';
import Login from './user/Login';
import Signup from './user/Signup';
import Resetpw from './user/Resetpw';

//센서 값 및 그래프 출력 페이지
import SmokeDetect from './analysis/SmokeDetect';

// 비디오 분석 컴포넌트들
import VideoAnalysis from './components/VideoAnalysis';
import VideoUploadPage from './components/VideoUploadPage';

// 디버그 모드 설정
const DEBUG = false;

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* 메인 페이지 */}
          <Route path="/" element={<HeroSection />} />
          
          {/* 사용자 인증 관련 */}
          <Route path="/user/login" element={<Login />} />
          <Route path="/user/signup" element={<Signup />} />
          <Route path="/user/resetpw" element={<Resetpw />} />
          
          {/* 화재 감지 시스템 대시보드 */}
          <Route path="/smokedetect" element={<SmokeDetect />} />

          {/* 비디오 분석 페이지 */}
          <Route path="/analysis" element={<VideoAnalysis />} />

          {/* 영상 업로드 관리 페이지 */}
          <Route path="/upload" element={<VideoUploadPage />} />

          {/* 404 페이지 */}
          <Route path="*" element={<div>페이지를 찾을 수 없습니다.</div>} />
        </Routes>
      </div>
      <ChatbotWidget />
    </Router>
  );
}

export default App;