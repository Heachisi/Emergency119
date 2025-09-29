import React, { useState, useEffect } from 'react';

import Header from '../components/Header'; 
import FireFighter from '../images/fireFighter.png';
import FireGoblinBody from '../images/fireGoblinBody.png';
import Emergency from '../images/EmergencyWhite.png';
import NineOneOne from '../images/119White.png';
import Foryou from '../images/Foryou.png';

const HeroSection = () => {
  const [showBubble, setShowBubble] = useState(false);

  return (
   <>
     <Header/>
     <div style={{
       position: "relative",
       width: "100%",
       height: "calc(100vh - 45px)",
       overflow: "hidden"
     }}>
       {/* 배경 이미지 */}
       <img 
         src={FireFighter} 
         alt="소방관 배경"
         style={{  
           position: "absolute",
           top: 0,
           left: 0,
           width: "100%",
           height: "100%",
           objectFit: "cover",
           objectPosition: "center",
           zIndex: 1
         }}
       />
       
       {/* Emergency 텍스트 - 왼쪽 */}
       <img 
         src={Emergency} 
         alt="Emergency"
         style={{
           position: "absolute",
           left: "3%",
           top: "50%",
           transform: "translateY(-50%)",
           width: "600px",
           height: "auto",
           zIndex: 3,
           cursor: "pointer",
           transition: "transform 0.3s ease"
         }}
         onMouseEnter={(e) => {
           e.target.style.transform = "translateY(-50%) scale(1.05) rotate(-1deg)";
         }}
         onMouseLeave={(e) => {
           e.target.style.transform = "translateY(-50%) scale(1) rotate(0deg)";
         }}
       />
       
       {/* 119 텍스트 - 오른쪽 */}
       <img 
         src={NineOneOne} 
         alt="119"
         style={{
           position: "absolute",
           right: "10%",
           top: "50%",
           transform: "translateY(-50%)",
           width: "200px",
           height: "auto",
           zIndex: 3,
           cursor: "pointer",
           transition: "transform 0.3s ease"
         }}
         onMouseEnter={(e) => {
           e.target.style.transform = "translateY(-50%) scale(1.1) rotate(2deg)";
         }}
         onMouseLeave={(e) => {
           e.target.style.transform = "translateY(-50%) scale(1) rotate(0deg)";
         }}
       />
       
       {/* 소방관 캐릭터 - 중앙 */}
       <img 
         src={FireGoblinBody} 
         alt="소방관 캐릭터"
         style={{
           position: "absolute",
           left: "62%",
           top: "50%",
           transform: "translate(-50%, -50%)",
           width: "340px",
           height: "auto",
           zIndex: 4,
           cursor: "pointer",
           transition: "transform 0.3s ease"
         }}
         onMouseEnter={(e) => {
           e.target.style.transform = "translate(-50%, -50%) scale(1.1) translateY(-10px)";
           setShowBubble(true); // 말풍선 표시
         }}
         onMouseLeave={(e) => {
           e.target.style.transform = "translate(-50%, -50%) scale(1) translateY(0px)";
           setShowBubble(false); // 말풍선 숨김
         }}
       />

       {/* 말풍선 - 조건부 렌더링 */}
       {showBubble && (
         <img 
           src={Foryou} 
           alt="말풍선"
           style={{
             position: "absolute",
             left: "70%", // 소방도깨비 왼쪽에 위치
             top: "20%",  // 소방도깨비보다 위쪽에 위치
             transform: "translate(-50%, -50%)",
             cursor: "pointer",
             width: "230px", // 크기 조정
             height: "auto",
             zIndex: 5, // 소방도깨비보다 앞에
             opacity: showBubble ? 1 : 0,
             transition: "opacity 0.5s ease"
           }} 
         />
       )}
     </div>
   </>
  );
};

export default HeroSection;