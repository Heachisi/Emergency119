// frontend/src/App.js
import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// 기존 컴포넌트들
import HeroSection from './user/HeroSection';
import Login from './user/Login';
import Signup from './user/Signup';
import Findid from './user/Findid';
import Resetpw from './user/Resetpw';

// 비디오 분석 컴포넌트들
import VideoAnalysis from './components/VideoAnalysis';

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
          <Route path="/user/findid" element={<Findid />} />
          <Route path="/user/resetpw" element={<Resetpw />} />
          
          
          {/* 비디오 분석 페이지 */}
          <Route path="/analysis" element={<VideoAnalysis />} />
          
          {/* 404 페이지 */}
          <Route path="*" element={<div>페이지를 찾을 수 없습니다.</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;