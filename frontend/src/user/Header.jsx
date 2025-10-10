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
                    {/* 상단 헤더 - 그라디언트 적용 */}
                    <header
                        style={{
                            width: "100%",
                            height: "65px",
                            background: "linear-gradient(135deg, #c62828 0%, #e53935 50%, #d32f2f 100%)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            color: "white",
                            padding: "0 15px",
                            boxShadow: "0 4px 12px rgba(211, 47, 47, 0.3)",
                            position: "relative",
                            overflow: "hidden"
                        }}>
                        {/* 배경 장식 요소 */}
                        <div style={{
                            position: "absolute",
                            top: "-50%",
                            right: "-5%",
                            width: "400px",
                            height: "400px",
                            background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
                            borderRadius: "50%",
                            pointerEvents: "none"
                        }} />

                        <h1 style={{
                            margin: 0,
                            fontSize: "22px",
                            fontWeight: "700",
                            letterSpacing: "0.5px",
                            textShadow: "2px 2px 4px rgba(0,0,0,0.2)",
                            position: "relative",
                            zIndex: 1
                        }}>Emergency 119</h1>

                        <div style={{ display: "flex", alignItems: "center", gap: "24px", position: "relative", zIndex: 1 }}>
                            <span style={{
                                fontSize: "14px",
                                fontWeight: "500",
                                background: "rgba(255, 255, 255, 0.15)",
                                padding: "8px 16px",
                                borderRadius: "20px",
                                backdropFilter: "blur(10px)",
                                border: "1px solid rgba(255, 255, 255, 0.2)"
                            }}>
                                {user?.user_metadata?.user_id ? `${user.user_metadata.user_id}님 환영합니다!` : '사용자님 환영합니다!'}
                            </span>
                            <button
                                onClick={handleLogout}
                                style={{
                                    background: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    color: "#d32f2f",
                                    padding: "10px 24px",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                                    transition: "all 0.3s ease",
                                    transform: "translateY(0)"
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = "translateY(-2px)";
                                    e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = "translateY(0)";
                                    e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                                }}
                            >
                                로그아웃
                            </button>
                        </div>
                    </header>

                    {/* 탭 네비게이션 - 모던한 디자인 */}
                    <nav style={{
                        width: "100%",
                        background: "linear-gradient(to bottom, #ffffffff 0%, #f5f5f5 100%)",
                        display: "flex",
                        borderBottom: "2px solid #e0e0e0",
                        marginBottom: "30px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                    }}>
                        <button
                            onClick={navigateToAnalysis}
                            style={{
                                flex: 1,
                                padding: "18px 0",
                                border: "none",
                                borderRight: "1px solid #e0e0e0",
                                borderBottom: activeTab === 'analysis' ? "3px solid #d32f2f" : "3px solid transparent",
                                color: activeTab === 'analysis' ? "#d32f2f" : "#616161",
                                fontSize: "15px",
                                fontWeight: activeTab === 'analysis' ? "600" : "500",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                position: "relative"
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== 'analysis') {
                                    e.target.style.background = "linear-gradient(to bottom, #fafafa 0%, #f0f0f0 100%)";
                                    e.target.style.color = "#424242";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== 'analysis') {
                                    e.target.style.background = "transparent";
                                    e.target.style.color = "#616161";
                                }
                            }}
                        >
                            비디오 분석 시스템
                        </button>

                        <button
                            onClick={navigateToSmokeDetect}
                            style={{
                                flex: 1,
                                padding: "18px 0",
                                border: "none",
                                borderBottom: activeTab === 'smokeDetect' ? "3px solid #d32f2f" : "3px solid transparent",
                                color: activeTab === 'smokeDetect' ? "#d32f2f" : "#616161",
                                fontSize: "15px",
                                fontWeight: activeTab === 'smokeDetect' ? "600" : "500",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                position: "relative"
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== 'smokeDetect') {
                                    e.target.style.background = "linear-gradient(to bottom, #fafafa 0%, #f0f0f0 100%)";
                                    e.target.style.color = "#424242";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== 'smokeDetect') {
                                    e.target.style.background = "transparent";
                                    e.target.style.color = "#616161";
                                }
                            }}
                        > 실시간 센서 모니터링
                        </button>
                    </nav>
                </>
            ) : (
                <header
                     style={{
                        width: "100%",
                        height: "65px",
                        background: "linear-gradient(135deg, #c62828 0%, #e53935 50%, #d32f2f 100%)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: "white",
                        padding: "0 30px",
                        boxShadow: "0 4px 12px rgba(211, 47, 47, 0.3)",
                        position: "relative",
                        overflow: "hidden"
                    }}>
                    {/* 배경 장식 요소 */}
                    <div style={{
                        position: "absolute",
                        top: "-50%",
                        right: "-5%",
                        width: "400px",
                        height: "400px",
                        background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
                        borderRadius: "50%",
                        pointerEvents: "none"
                    }} />

                    <h1 style={{
                        margin: 0,
                        fontSize: "22px",
                        fontWeight: "700",
                        letterSpacing: "0.5px",
                        textShadow: "2px 2px 4px rgba(0,0,0,0.2)",
                        position: "relative",
                        zIndex: 1
                    }}>Emergency 119</h1>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative", zIndex: 1 }}>
                    <button
                        onClick={navigateToLogin}
                        style={{
                            background: "rgba(255, 255, 255, 0.15)",
                            border: "1.5px solid rgba(255, 255, 255, 0.4)",
                            borderRadius: "8px",
                            color: "white",
                            padding: "10px 22px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                            backdropFilter: "blur(10px)",
                            transition: "all 0.3s ease",
                            transform: "translateY(0)"
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = "rgba(255, 255, 255, 0.25)";
                            e.target.style.transform = "translateY(-2px)";
                            e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = "rgba(255, 255, 255, 0.15)";
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "none";
                        }}
                    >
                        로그인
                    </button>
                    <button
                        onClick={navigateToSignup}
                        style={{
                            background: "white",
                            border: "none",
                            borderRadius: "8px",
                            color: "#d32f2f",
                            padding: "10px 22px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            transition: "all 0.3s ease",
                            transform: "translateY(0)"
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-2px)";
                            e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
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