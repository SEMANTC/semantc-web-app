import React, { useState, useEffect } from 'react';

export const ProcessingIndicator: React.FC = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prevDots => (prevDots.length >= 3 ? '' : prevDots + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-gray-500 italic opacity-70 animate-pulse">
      processing{dots}
    </div>
  );
};