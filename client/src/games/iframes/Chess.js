import React from 'react';
export default function Chess() {
  return (
    <iframe
      src="/chess.js/website/index.html"
      title="Chess"
      width={480}
      height={640}
      style={{border:'2px solid #0ff', margin:'0 auto', display:'block', background:'#fff'}}
      allowFullScreen
    />
  );
}
