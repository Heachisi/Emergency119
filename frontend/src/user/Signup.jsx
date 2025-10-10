import React, { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import Emergency from '../images/EmergencyRed.png';
import NineOneOne from '../images/119Orange.png';
import Header from '../user/Header';
import { supabase } from '../supabase.js';

const Signup = () => {
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        userId: '',
        password: '',
        confirmPassword: '',
        email: ''
    });

    const [validationState, setValidationState] = useState({
        isUserIdChecked: false,
        isEmailSent: false,
        isUserIdDuplicate: false,
        passwordValid: false,
        passwordMatch: false
    });

    const [loading, setLoading] = useState({
        userIdCheck: false,
        emailSend: false,
        signup: false
    });

    // 비밀번호 유효성 검사
    useEffect(() => {
        if (formData.password) {
            const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
            const isValid = passwordRegex.test(formData.password);
            setValidationState(prev => ({
                ...prev,
                passwordValid: isValid
            }));
        } else {
            setValidationState(prev => ({
                ...prev,
                passwordValid: false
            }));
        }
    }, [formData.password]);

    // 비밀번호 일치 검사
    useEffect(() => {
        if (formData.password && formData.confirmPassword) {
            setValidationState(prev => ({
                ...prev,
                passwordMatch: formData.password === formData.confirmPassword
            }));
        } else {
            setValidationState(prev => ({
                ...prev,
                passwordMatch: false
            }));
        }
    }, [formData.password, formData.confirmPassword]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // 입력 변경시 관련 검증 상태 초기화
        if (field === 'userId') {
            setValidationState(prev => ({
                ...prev,
                isUserIdChecked: false,
                isUserIdDuplicate: false
            }));
        } else if (field === 'email') {
            setValidationState(prev => ({
                ...prev,
                isEmailSent: false
            }));
        }
    };

    // 아이디 중복 체크
    const handleUserIdCheck = async () => {
        if (!formData.userId.trim()) {
            alert('아이디를 입력해주세요.');
            return;
        }

        // 아이디 형식 검증
        const userIdRegex = /^[a-zA-Z0-9]{4,12}$/;
        if (!userIdRegex.test(formData.userId)) {
            alert('아이디는 영문, 숫자 포함 4~12자로 입력해주세요.');
            return;
        }

        setLoading(prev => ({ ...prev, userIdCheck: true }));

        try {
            const { data, error } = await supabase
                .rpc('check_user_id_duplicate', { input_user_id: formData.userId });

            if (error) throw error;

            if (data) {
                setValidationState(prev => ({
                    ...prev,
                    isUserIdDuplicate: true,
                    isUserIdChecked: false
                }));
                alert('이미 사용 중인 아이디입니다.');
            } else {
                setValidationState(prev => ({
                    ...prev,
                    isUserIdDuplicate: false,
                    isUserIdChecked: true
                }));
                alert('사용 가능한 아이디입니다.');
            }
        } catch (error) {
            console.error('아이디 중복 체크 오류:', error);
            alert('아이디 중복 체크 중 오류가 발생했습니다.');
        } finally {
            setLoading(prev => ({ ...prev, userIdCheck: false }));
        }
    };

    // Supabase 이메일 확인
    const handleEmailVerification = async () => {
        if (!formData.email.trim()) {
            alert('이메일을 입력해주세요.');
            return;
        }

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            alert('올바른 이메일 형식을 입력해주세요.');
            return;
        }

        // 아이디 중복 체크 확인
        if (!validationState.isUserIdChecked) {
            alert('아이디 중복 체크를 먼저 해주세요.');
            return;
        }

        // 비밀번호 유효성 검사
        if (!validationState.passwordValid) {
            alert('비밀번호는 영문, 숫자, 특수문자 포함 8~16자로 입력해주세요.');
            return;
        }

        // 비밀번호 일치 확인
        if (!validationState.passwordMatch) {
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }

        setLoading(prev => ({ ...prev, emailSend: true }));

        try {
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        user_id: formData.userId
                    },
                    emailRedirectTo: 'http://localhost:3000/user/login'
                }
            });

            if (error) throw error;

            // signUp이 성공했지만 이미 존재하는 사용자인 경우 체크
            // Supabase는 보안상 이유로 이메일이 존재해도 성공 응답을 보냄
            // 하지만 실제로는 인증 이메일을 보내지 않음
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                // identities가 빈 배열이면 이미 존재하는 이메일
                // 인증 미완료 계정인지 확인 후 재발송 시도
                try {
                    const { error: resendError } = await supabase.auth.resend({
                        type: 'signup',
                        email: formData.email
                    });

                    if (!resendError) {
                        // 재발송 성공 - 인증 미완료 계정으로 판단
                        setValidationState(prev => ({
                            ...prev,
                            isEmailSent: true
                        }));
                        alert('인증이 완료되지 않은 계정입니다.\n인증 이메일을 재발송했습니다. 이메일을 확인해주세요.');
                        return;
                    } else {
                        // 재발송 실패 - 원인 파악
                        if (resendError.message?.includes('rate limit') ||
                            resendError.message?.includes('Email rate limit exceeded')) {
                            alert('이메일 재발송은 1분에 한 번만 가능합니다.\n잠시 후 다시 시도해주세요.');
                            return;
                        } else {
                            // 이미 인증 완료된 계정
                            alert('이미 가입된 이메일입니다.');
                            return;
                        }
                    }
                } catch (resendErr) {
                    // 재발송 실패 - 원인 파악
                    console.error('재발송 오류:', resendErr);
                    if (resendErr.message?.includes('rate limit') ||
                        resendErr.message?.includes('Email rate limit exceeded')) {
                        alert('이메일 재발송은 1분에 한 번만 가능합니다.\n잠시 후 다시 시도해주세요.');
                        return;
                    } else {
                        // 이미 인증 완료된 계정
                        alert('이미 가입된 이메일입니다.');
                        return;
                    }
                }
            }

            setValidationState(prev => ({
                ...prev,
                isEmailSent: true
            }));

            alert('확인 이메일이 발송되었습니다. 이메일을 확인하고 링크를 클릭해주세요.');

        } catch (error) {
            console.error('이메일 확인 오류:', error);
            if (error.message.includes('User already registered')) {
                alert('이미 가입된 이메일입니다.');
            } else {
                alert(`이메일 확인 중 오류가 발생했습니다: ${error.message}`);
            }
        } finally {
            setLoading(prev => ({ ...prev, emailSend: false }));
        }
    };

    // 회원가입 완료 처리 (이메일 확인 후 자동 호출됨)
    const completeSignup = async () => {
        alert('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
        navigate('/user/login');
    };

    // 엔터키 핸들러
    const handleKeyDown = (e, nextTabIndex) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextTabIndex) {
                const nextElement = document.querySelector(`[tabindex="${nextTabIndex}"]`);
                if (nextElement) {
                    nextElement.focus();
                }
            } else {
                handleEmailVerification();
            }
        }
    };

    // 이메일 확인 후 처리 (Supabase Auth 사용)
    useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                // 이메일 인증이 완료된 경우에만 처리
                if (!session.user.email_confirmed_at) {
                    console.log('이메일 인증이 아직 완료되지 않았습니다.');
                    return;
                }

                try {
                    // 이미 users 테이블에 존재하는지 확인
                    const { data: existingUser, error: checkError } = await supabase
                        .from('users')
                        .select('id')
                        .eq('id', session.user.id)
                        .single();

                    // 이미 존재하면 중복 삽입 방지
                    if (existingUser) {
                        console.log('이미 등록된 사용자입니다.');
                        await supabase.auth.signOut();
                        navigate('/user/login');
                        return;
                    }

                    // public.users 테이블에 사용자 정보 저장
                    const { error: insertError } = await supabase
                        .from('users')
                        .insert({
                            id: session.user.id,
                            user_id: session.user.user_metadata?.user_id,
                            email: session.user.email,
                            is_active: true
                        });

                    if (insertError) {
                        console.error('users 테이블 저장 오류:', insertError);
                        return;
                    }

                    alert('회원가입이 완료되었습니다!');
                    await supabase.auth.signOut(); // 로그아웃 후 로그인 페이지로
                    navigate('/user/login');
                } catch (error) {
                    console.error('회원가입 완료 처리 오류:', error);
                }
            }
        }
    );

    return () => {
        authListener.subscription.unsubscribe();
    };
}, [navigate]);


    return (
        <>
            <Header />
            <div style={{
                width: "100%",
                minHeight: "calc(100vh - 45px)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
                padding: "20px 0"
            }}>

                <div style={{
                    width: "400px",
                    background: "#FFE4B5",
                    border: "2px solid #FF6B35",
                    borderRadius: "20px",
                    padding: "30px",
                    textAlign: "center",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                    overflowY: "auto"
                }}>

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

                    <div style={{
                        width: "330px",
                        background: "white",
                        borderRadius: "20px",
                        padding: "20px",
                        textAlign: "center",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                    }}>
                        <h2 style={{
                            color: "#FF6B35",
                            fontSize: "22px",
                            fontWeight: "600",
                            marginBottom: "15px",
                            fontFamily: "Montserrat, sans-serif"
                        }}>Sign up</h2>

                        {/* 아이디 입력 */}
                        <div style={{ marginBottom: "12px", textAlign: "left", color:"black" }}>
                            <label style={{
                                display: "block",
                                marginBottom: "5px",
                                fontSize: "13px",
                                fontWeight: "500"
                            }}>아이디 <span style={{ color: "red" }}>*</span></label>
                            <input
                                type="text"
                                value={formData.userId}
                                onChange={(e) => handleInputChange('userId', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, "2")}
                                tabIndex="1"
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    border: `2px solid ${validationState.isUserIdChecked ? '#28a745' : 
                                           validationState.isUserIdDuplicate ? '#dc3545' : '#ddd'}`,
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    boxSizing: "border-box"
                                }}
                                placeholder="영문, 숫자 포함 4~12자"
                                disabled={loading.userIdCheck}
                            />
                            <button 
                                onClick={handleUserIdCheck}
                                disabled={loading.userIdCheck}
                                style={{
                                    width: "100%",
                                    padding: "8px",
                                    background: loading.userIdCheck ? "#ccc" : "#FF8C42",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    cursor: loading.userIdCheck ? "not-allowed" : "pointer",
                                    marginTop: "8px"
                                }}
                            >
                                {loading.userIdCheck ? "확인 중..." : "중복체크"}
                            </button>
                        </div>

                        {/* 비밀번호 입력 */}
                        <div style={{ marginBottom: "12px", textAlign: "left", color:"black" }}>
                            <label style={{
                                display: "block",
                                marginBottom: "5px",
                                fontSize: "13px",
                                fontWeight: "500"
                            }}>비밀번호 <span style={{ color: "red" }}>*</span></label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, "3")}
                                tabIndex="2"
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    border: `2px solid ${validationState.passwordValid ? '#28a745' :
                                           formData.password && !validationState.passwordValid ? '#dc3545' : '#ddd'}`,
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    boxSizing: "border-box"
                                }}
                                placeholder="영문, 숫자, 특수문자 포함 8~16자"
                            />
                        </div>

                        {/* 비밀번호 확인 */}
                        <div style={{ marginBottom: "12px", textAlign: "left", color:"black" }}>
                            <label style={{
                                display: "block",
                                marginBottom: "5px",
                                fontSize: "13px",
                                fontWeight: "500"
                            }}>비밀번호 확인 <span style={{ color: "red" }}>*</span></label>
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, "4")}
                                tabIndex="3"
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    border: `2px solid ${validationState.passwordMatch ? '#28a745' :
                                           formData.confirmPassword && !validationState.passwordMatch ? '#dc3545' : '#ddd'}`,
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    boxSizing: "border-box"
                                }}
                                placeholder="비밀번호를 다시 입력하세요"
                            />
                        </div>

                        {/* 이메일 입력 */}
                        <div style={{ marginBottom: "15px", textAlign: "left", color:"black" }}>
                            <label style={{
                                display: "block",
                                marginBottom: "5px",
                                fontSize: "13px",
                                fontWeight: "500"
                            }}>이메일 <span style={{ color: "red" }}>*</span></label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, "5")}
                                tabIndex="4"
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    border: `2px solid ${validationState.isEmailSent ? '#28a745' : '#ddd'}`,
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    boxSizing: "border-box"
                                }}
                                placeholder="이메일을 입력하세요"
                                disabled={loading.emailSend}
                            />
                            <button
                                onClick={handleEmailVerification}
                                disabled={loading.emailSend || validationState.isEmailSent}
                                style={{
                                    width: "100%",
                                    padding: "8px",
                                    background: loading.emailSend ? "#ccc" : validationState.isEmailSent ? "#28a745" : "#FF8C42",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    cursor: (loading.emailSend || validationState.isEmailSent) ? "not-allowed" : "pointer",
                                    marginTop: "8px"
                                }}
                            >
                                {loading.emailSend ? "발송 중..." :
                                 validationState.isEmailSent ? "이메일 발송 완료" : "이메일 확인"}
                            </button>
                        </div>

                        {/* 이메일 발송 완료 메시지 */}
                        {validationState.isEmailSent && (
                            <div style={{
                                marginBottom: "15px",
                                padding: "12px",
                                backgroundColor: "#d4edda",
                                color: "#155724",
                                borderRadius: "8px",
                                fontSize: "14px",
                                textAlign: "center"
                            }}>
                                📧 이메일을 확인하고 인증 링크를 클릭해주세요!
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </>
    );
};

export default Signup;