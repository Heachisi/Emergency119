import React, { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import Emergency from '../images/EmergencyRed.png';
import NineOneOne from '../images/119Orange.png';
import Header from '../user/Header';
import { supabase } from '../supabase.js';

const Resetpw = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });

    const [validationState, setValidationState] = useState({
        passwordValid: false,
        passwordMatch: false
    });

    const [loading, setLoading] = useState(false);
    const [isValidSession, setIsValidSession] = useState(false);

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

    // 세션 확인 (비밀번호 재설정 토큰 검증)
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error || !session) {
                alert('유효하지 않은 접근입니다. 비밀번호 재설정 링크를 다시 확인해주세요.');
                navigate('/user/login');
                return;
            }

            setIsValidSession(true);
        };

        checkSession();
    }, [navigate]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // 비밀번호 재설정 처리
    const handleResetPassword = async () => {
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

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: formData.password
            });

            if (error) throw error;

            alert('비밀번호가 성공적으로 변경되었습니다.');
            navigate('/user/login');

        } catch (error) {
            console.error('비밀번호 재설정 오류:', error);
            alert(`비밀번호 재설정 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setLoading(false);
        }
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
                handleResetPassword();
            }
        }
    };


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
                        }}>Reset Password</h2>

                        {!isValidSession ? (
                            <div style={{
                                padding: "20px",
                                textAlign: "center",
                                color: "#666"
                            }}>
                                세션 확인 중...
                            </div>
                        ) : (
                            <>
                                {/* 비밀번호 입력 */}
                                <div style={{ marginBottom: "12px", textAlign: "left" }}>
                                    <label style={{
                                        display: "block",
                                        marginBottom: "5px",
                                        fontSize: "13px",
                                        fontWeight: "500"
                                    }}>새 비밀번호 <span style={{ color: "red" }}>*</span></label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => handleInputChange('password', e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, "2")}
                                        tabIndex="1"
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
                                <div style={{ marginBottom: "20px", textAlign: "left" }}>
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
                                        onKeyDown={(e) => handleKeyDown(e)}
                                        tabIndex="2"
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

                                {/* 비밀번호 재설정 버튼 */}
                                <button
                                    onClick={handleResetPassword}
                                    disabled={loading}
                                    style={{
                                        width: "100%",
                                        padding: "12px",
                                        background: loading ? "#ccc" : "#D52222",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        cursor: loading ? "not-allowed" : "pointer"
                                    }}
                                >
                                    {loading ? "처리 중..." : "비밀번호 재설정"}
                                </button>
                            </>
                        )}

                    </div>
                </div>
            </div>
        </>
    );
};

export default Resetpw;