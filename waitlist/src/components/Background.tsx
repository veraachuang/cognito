import React from 'react';

const Background = () => {
  return (
    <div className="fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[#f5f2eb] opacity-100"></div>
      <div className="absolute inset-0 bg-noise opacity-20"></div>
    </div>
  );
};

export default Background;