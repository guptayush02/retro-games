import React from 'react';

// Placeholder for Super Mario game
// For a real Mario game, you would use a canvas-based engine or an open-source implementation.
// This is a simple placeholder UI.

export default function Mario() {
  return (
    <div style={{textAlign:'center'}}>
      <h2>Super Mario</h2>
      <iframe
        src="/mario/main.html"
        title="Super Mario"
        width={640}
        height={480}
        style={{border: '2px solid #0ff', margin: '0 auto', display: 'block'}}
      />
      <div style={{marginTop: 10, color: '#888', fontSize: '0.9rem'}}>
        Powered by <a href="https://github.com/robertkleffner/mariohtml5" target="_blank" rel="noopener noreferrer">mariohtml5</a>
      </div>
    </div>
  );
}
