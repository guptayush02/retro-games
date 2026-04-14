import React from 'react';
export default function SpaceShooter() {
  return (
    <iframe
    //   src="https://playclassic.games/games/shooter/html5/space-shooter/"
        src="/HTML5-Asteroids/index.html"
        title="Space Shooter"
        width={480}
        height={640}
        style={{border:'2px solid #0ff', margin:'0 auto', display:'block', background:'#000'}}
        allowFullScreen
    />
  );
}
