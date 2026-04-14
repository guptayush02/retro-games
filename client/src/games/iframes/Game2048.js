import React from 'react';
export default function Game2048() {
  return (
    <iframe
      src="/2048/index.html"
      title="2048"
      width={400}
      height={500}
      style={{border:'2px solid #0ff', margin:'0 auto', display:'block', background:'#faf8ef'}}
      allowFullScreen
    />
  );
}
