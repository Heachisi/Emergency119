import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const Header = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('analysis');

    // 페이지 이동 함수
    const navigateToLogin = () => {
        window.location.href = '/user/login';
    };

    const navigateToSignup = () => {
        window.location.href = '/user/signup';
    };

    const navigateToAnalysis = () => {
        setActiveTab('analysis');
        window.location.href = '/analysis';
    };

    const navigateToSmokeDetect = () => {
        setActiveTab('smokeDetect');
        window.location.href = '/smokedetect';
    };

    // 현재 URL에 따라 activeTab 설정
    useEffect(() => {
        const path = window.location.pathname;
        if (path.includes('analysis')) {
            setActiveTab('analysis');
        } else if (path.includes('smokedetect')) {
            setActiveTab('smokeDetect');
        }
    }, []);

    // 로그인 상태 확인
    useEffect(() => {
        // 현재 세션 확인
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setIsLoggedIn(true);
                setUser(session.user);
            }
        };

        checkSession();

        // 인증 상태 변경 리스너
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (session?.user) {
                    setIsLoggedIn(true);
                    setUser(session.user);
                } else {
                    setIsLoggedIn(false);
                    setUser(null);
                }
            }
        );

        return () => subscription?.unsubscribe();
    }, []);

    // 로그아웃 함수
    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            setIsLoggedIn(false);
            setUser(null);
            window.location.href = '/';
        } catch (error) {
            console.error('로그아웃 오류:', error);
            alert('로그아웃 중 오류가 발생했습니다.');
        }
    };

    return (
        <>
            {isLoggedIn ? (
                <>
                    {/* 상단 빨간색 헤더 */}
                    <header
                        style={{
                            width: "100%",
                            height: "50px",
                            background: "#d32f2f",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            color: "white",
                            padding: "0 15px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                        }}>
                        <h1 style={{
                            margin: 0,
                            fontSize: "18px",
                            fontWeight: "700"
                        }}>Emergency 119</h1>
                        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                            <span style={{
                                fontSize: "14px",
                                fontWeight: "500"
                            }}>
                                {user?.user_metadata?.user_id ? `${user.user_metadata.user_id}님 환영합니다!` : '사용자님 환영합니다!'}
                            </span>
                            <button
                                onClick={handleLogout}
                                style={{
                                    background: "rgba(255, 255, 255, 0.2)",
                                    border: "1px solid rgba(255, 255, 255, 0.3)",
                                    borderRadius: "4px",
                                    color: "white",
                                    padding: "6px 16px",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    cursor: "pointer"
                                }}
                            >
                                로그아웃
                            </button>
                        </div>
                    </header>
                    
                    {/* 탭 네비게이션 */}
                    <nav style={{
                        width: "100%",
                        background: "#e0e0e0",
                        display: "flex",
                        borderBottom: "1px solid #bdbdbd",
                        marginBottom:"30px"
                    }}>
                        <button
                            onClick={navigateToAnalysis}
                            style={{
                                flex: 1,
                                padding: "16px 0",
                                background: activeTab === 'analysis' ? "white" : "transparent",
                                border: "none",
                                borderRight: "1px solid #bdbdbd",
                                color: "#424242",
                                fontSize: "15px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "background 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== 'analysis') {
                                    e.target.style.background = "#d5d5d5";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== 'analysis') {
                                    e.target.style.background = "transparent";
                                }
                            }}
                        >
                            비디오 분석 시스템
                        </button>
                        
                        <button
                            onClick={navigateToSmokeDetect}
                            style={{
                                flex: 1,
                                padding: "16px 0",
                                background: activeTab === 'smokeDetect' ? "white" : "transparent",
                                border: "none",
                                color: "#424242",
                                fontSize: "15px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "background 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== 'smokeDetect') {
                                    e.target.style.background = "#d5d5d5";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== 'smokeDetect') {
                                    e.target.style.background = "transparent";
                                }
                            }}
                        >
                            건물 안전 상태
                        </button>
                    </nav>
                </> 
            ) : (
                <header
                     style={{
                        width: "100%",
                        height: "50px",
                        background: "#d32f2f",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: "white",
                        padding: "0 15px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}>
                    <h1 style={{
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: "700"
                    }}>Emergency 119</h1>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                    <button 
                        onClick={navigateToLogin}
                        style={{
                            background: "rgba(255, 255, 255, 0.2)",
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                            borderRadius: "4px",
                            color: "white",
                            padding: "6px 16px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer"
                        }}
                    >
                        로그인
                    </button>
                    <button 
                        onClick={navigateToSignup}
                        style={{
                            background: "rgba(255, 255, 255, 0.2)",
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                            borderRadius: "4px",
                            color: "white",
                            padding: "6px 16px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer"
                        }}
                    >
                        회원가입
                    </button>
                </div>
                </header>
            )}
        </>
    );
};

export default Header;