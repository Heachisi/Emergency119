import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const Header = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);

    // 페이지 이동 함수
    const navigateToLogin = () => {
        window.location.href = '/user/login';
    };

    const navigateToSignup = () => {
        window.location.href = '/user/signup';
    };

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
        <header
            style={{
                width: "100%",
                height: "45px",
                background: "#b52929ff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "white",
                padding: "0 10px"
            }}>
            <p style={{
                margin: 0,
                fontFamily: "'Playfair Display', serif", // 고급스러운 세리프
                fontSize: "20px",
                fontWeight: 800,
                letterSpacing: "1px"
            }}>Emergency 119</p>
            {isLoggedIn ? (
                <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{
                        marginRight: "15px",
                        fontSize: "14px",
                        fontWeight: "500"
                    }}>
                        {user?.user_metadata?.user_id ? `${user.user_metadata.user_id}님 환영합니다!` : '사용자님 환영합니다!'}
                    </span>
                    <button
                        onClick={handleLogout}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "white",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer",
                            textDecoration: "none"
                        }}
                    >
                        로그아웃
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", alignItems: "center" }}>
                    <button 
                        onClick={navigateToLogin}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "white",
                            marginRight: "20px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer",
                            textDecoration: "none"
                        }}
                    >
                        로그인
                    </button>
                    <button 
                        onClick={navigateToSignup}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "white",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer",
                            textDecoration: "none"
                        }}
                    >
                        회원가입
                    </button>
                </div>
            )}
        </header>
    );
};

export default Header;