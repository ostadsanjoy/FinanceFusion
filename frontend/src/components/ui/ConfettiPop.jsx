import React from 'react';
import Lottie from 'lottie-react';

export default function ConfettiPop({ x, y, animationData, size = 260, onComplete }) {
  if (!animationData) return null;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <Lottie animationData={animationData} loop={false} autoplay onComplete={onComplete} />
    </div>
  );
}