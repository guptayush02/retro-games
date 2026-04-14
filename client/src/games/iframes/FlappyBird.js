import React from 'react';
export default function FlappyBird() {
  return (
    <iframe
      src="https://nebez.github.io/floppybird/"
      title="Flappy Bird"
      width={400}
      height={600}
      style={{border:'2px solid #0ff', margin:'0 auto', display:'block', background:'#70c5ce'}}
      allowFullScreen
    />
  );
}
