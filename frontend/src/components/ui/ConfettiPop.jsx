import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

export default function ConfettiPop({ x, y, size = 260, onComplete }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/lottie/confetti.json')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

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
      <Lottie animationData={data} loop={false} autoplay onComplete={onComplete} />
    </div>
  );
}