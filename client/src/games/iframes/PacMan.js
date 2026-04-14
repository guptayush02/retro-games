import React from 'react';
export default function PacMan() {
  return (
    <iframe
      src="https://alejandro-ao.github.io/pacman-js/"
      title="Pac-Man"
      width={500}
      height={600}
      style={{border:'2px solid #0ff', margin:'0 auto', display:'block', background:'#000'}}
      allowFullScreen
    />
  );
}
