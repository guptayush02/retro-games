import React from 'react';
export default function SpaceInvaders() {
  return (
    <iframe
      src="https://daleharvey.github.io/space-invaders/"
      title="Space Invaders"
      width={480}
      height={320}
      style={{border:'2px solid #0ff', margin:'0 auto', display:'block', background:'#000'}}
      allowFullScreen
    />
  );
}
