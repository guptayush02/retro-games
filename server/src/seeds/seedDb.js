import connectDB from '../db.js';
import Game from '../models/Game.js';
import { readFileSync } from 'node:fs';

// ─── Famobi / html5games.com helpers ────────────────────────────────────────
const toPascalCase = (slug) =>
  slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

const famobiThumb = (slug) =>
  `https://download.famobi.com/portal/html5games/images/tmp/180/${toPascalCase(slug)}Teaser.jpg`;

const famobiUrl = (slug) => `https://play.famobi.com/${slug}`;

const nativeThumb = (fileName) => `/images/games/${fileName}`;

let thumbnailOverrides = {};

try {
  thumbnailOverrides = JSON.parse(
    readFileSync(new URL('./gameImageOverrides.json', import.meta.url), 'utf8')
  );
} catch {
  thumbnailOverrides = {};
}

const famobi = (slug, title, description, genre, gameType = 'single-player', maxPlayers = 1) => ({
  title,
  description,
  genre,
  thumbnail: thumbnailOverrides[title] || famobiThumb(slug),
  gameType,
  maxPlayers,
  sourceType: 'embed',
  launchUrl: famobiUrl(slug),
  provider: 'famobi',
  licenseStatus: 'unknown',
});

// ─── Open-source racing games helper ──────────────────────────────────────────
const openSource = (title, description, genre, launchUrl, license = 'open-source', gameType = 'single-player', maxPlayers = 1) => ({
  title,
  description,
  genre,
  thumbnail: thumbnailOverrides[title] || null,
  gameType,
  maxPlayers,
  sourceType: 'embed',
  launchUrl,
  provider: 'open-source',
  licenseStatus: license,
});

// ─── Game data ────────────────────────────────────────────────────────────────
const seedDatabase = async () => {
  try {
    console.log('Seeding database with sample games...');
    await connectDB();

    const games = [
      // ── Native (built-in) games ──────────────────────────────────────────
      {
        title: 'Tic-Tac-Toe',
        description: 'Classic 3x3 game of Tic-Tac-Toe. Be the first to get three in a row.',
        genre: 'Puzzle',
        gameType: 'multiplayer',
        thumbnail: nativeThumb('tic-tac-toe.svg'),
        maxPlayers: 2,
        sourceType: 'native',
        provider: 'internal',
        licenseStatus: 'licensed',
      },
      {
        title: 'Snake',
        description: 'Classic snake game. Move the snake to eat food and grow longer.',
        genre: 'Arcade',
        gameType: 'single-player',
        thumbnail: nativeThumb('snake.svg'),
        maxPlayers: 1,
        sourceType: 'native',
        provider: 'internal',
        licenseStatus: 'licensed',
      },
      {
        title: 'Chess',
        description: 'Play chess against an opponent in real-time.',
        genre: 'Strategy',
        gameType: 'multiplayer',
        thumbnail: nativeThumb('chess.svg'),
        maxPlayers: 2,
        sourceType: 'native',
        provider: 'internal',
        licenseStatus: 'licensed',
      },
      {
        title: 'Quiz Battle',
        description: 'Test your knowledge in rapid-fire quiz battles.',
        genre: 'Trivia',
        gameType: 'multiplayer',
        thumbnail: nativeThumb('quiz-battle.svg'),
        maxPlayers: 4,
        sourceType: 'native',
        provider: 'internal',
        licenseStatus: 'licensed',
      },

      // ── Famobi / html5games.com games ────────────────────────────────────
      // Racing
      famobi('moto-x3m', 'Moto X3M', 'Perform stunts and race through deadly obstacle tracks on your motorbike.', 'Racing'),
      famobi('moto-x3m-pool-party', 'Moto X3M Pool Party', 'Race through pool-party obstacle tracks with flips and stunts.', 'Racing'),
      famobi('moto-x3m-winter', 'Moto X3M Winter', 'Race on icy winter tracks full of dangerous obstacles.', 'Racing'),
      famobi('moto-x3m-spooky-land', 'Moto X3M Spooky Land', 'Halloween-themed motorbike racing with creepy obstacles.', 'Racing'),
      famobi('cars-arena', 'Cars Arena', 'Battle other cars in a shrinking arena — last car wins!', 'Racing'),

      // ── Open-source HTML5 Racing Games ──────────────────────────────────
      // Car Racing
      openSource('PolyTrack', 'High-speed low-poly racing game with track editor, replay system, and mobile support. Inspired by TrackMania.', 'Racing', 'https://kodub.itch.io/polytrack', 'proprietary-free', 'single-player', 1),
      openSource('Carnof', 'Fast-paced 2-player multiplayer arcade racer with split-screen support playable in any modern browser.', 'Racing', 'https://kosmonaut.itch.io/carnof', 'open-source', 'multiplayer', 2),
      openSource('Retro Racing', 'Game Boy-style retro racer with obstacle avoidance gameplay. Collect coins while dodging obstacles with increasing difficulty.', 'Racing', 'https://snow140.itch.io/retro-racing', 'open-source', 'single-player', 1),

      // Motorcycle/Bike Racing
      openSource('Moto Racer', 'Lightweight motorcycle racing game inspired by Road Rash. Built with HTML5 Canvas and pure JavaScript. Race through 3 laps with checkpoint-based racing.', 'Racing', 'https://jgzuo.github.io/moto-racer', 'MIT', 'single-player', 1),
      openSource('Mountain Motorcycle Racing', 'Procedurally generated motorcycle racing game with challenging terrain and progressive difficulty. Perfect for thrill seekers.', 'Racing', 'https://jmirarchi.itch.io/mountain-motorcycle-racing', 'open-source', 'single-player', 1),

      // 3D Racing
      openSource('Racing 3D WebGL', '3D car racing simulation built with JavaScript and WebGL. Classic racing game mechanics with impressive 3D graphics rendering.', 'Racing', 'https://mgrzeszczak.github.io/racing-3d', 'open-source', 'single-player', 1),
      openSource('Racing JS', '3D browser-based racing game with multiple environments and game modes. Built with Three.js and WebGL for immersive racing experience.', 'Racing', 'https://antonio-r1.github.io/racing-js', 'open-source', 'single-player', 1),
      openSource('Car Race Game', 'Simple yet engaging car racing game with obstacle avoidance gameplay and scoring system built with HTML5 and JavaScript.', 'Racing', 'https://keshavrajur.github.io/Car-Race/Main_menu.html', 'open-source', 'single-player', 1),
      openSource('Speed Road', 'Fast-paced top-down arcade racing game with multiple levels and difficulty modes. Dodge obstacles and reach the finish line.', 'Racing', 'https://playcanvas.com/play/1299876', 'proprietary-free', 'single-player', 1),


      // Arcade / Action
      famobi('om-nom-run', 'Om Nom Run', 'Run alongside Om Nom avoiding obstacles and collecting coins in this endless runner.', 'Arcade'),
      famobi('om-nom-tower-3d', 'Om Nom Tower 3D', 'Build the tallest tower with Om Nom in this satisfying 3D stacker.', 'Arcade'),
      famobi('fun-race-3d', 'Fun Race 3D', 'Navigate quirky obstacle courses and race to the finish line.', 'Arcade'),
      famobi('temple-blocks', 'Temple Blocks', 'Jump from block to block avoiding obstacles in this temple runner.', 'Arcade'),
      famobi('bouncemasters', 'Bouncemasters', 'Launch the penguin as far as possible with crazy power-ups.', 'Arcade'),
      famobi('giant-rush', 'Giant Rush', 'Grow your crowd and crush enemies in this addictive runner.', 'Arcade'),
      famobi('pengu-slide', 'Pengu Slide', 'Slide the penguin across icy platforms in this fun casual game.', 'Arcade'),
      famobi('teeth-runner', 'Teeth Runner', 'Collect teeth power-ups to grow huge and smash through obstacles.', 'Arcade'),
      famobi('who-dies-last', 'Who Dies Last', 'Survive as long as possible in this chaotic last-man-standing game.', 'Arcade'),
      famobi('glass-break', 'Glass Break', 'Smash glass objects in satisfying and creative ways.', 'Arcade'),
      famobi('star-stars-arena', 'Star Stars Arena', 'Battle enemies in a fast-paced star-shooting arena.', 'Arcade'),
      famobi('dye-hard', 'Dye Hard', 'Color the entire level with your dye cannon before time runs out.', 'Arcade'),

      // Puzzle
      famobi('cut-the-rope-2', 'Cut the Rope 2', 'Cut ropes at the right time to feed candy to Om Nom.', 'Puzzle'),
      famobi('cut-the-rope-magic', 'Cut the Rope Magic', 'Om Nom transforms into magical creatures in this rope-cutting adventure.', 'Puzzle'),
      famobi('cut-the-rope-time-travel', 'Cut the Rope Time Travel', 'Travel through time helping Om Nom ancestors get their candy.', 'Puzzle'),
      famobi('cut-the-rope-experiment', 'Cut the Rope Experiment', 'Science-themed rope-cutting puzzles with new gadgets.', 'Puzzle'),
      famobi('cannon-balls-3d', 'Cannon Balls 3D', 'Aim and fire cannon balls to knock down all targets.', 'Puzzle'),
      famobi('tower-crash-3d', 'Tower Crash 3D', 'Knock down towers using balls and physics.', 'Puzzle'),
      famobi('element-blocks', 'Element Blocks', 'Combine elemental blocks to clear the board in this logic puzzle.', 'Puzzle'),
      famobi('onet-connect-classic', 'Onet Connect Classic', 'Connect matching tile pairs with a line to clear the board.', 'Puzzle'),
      famobi('state-connect', 'State Connect', 'Connect US states using roads without crossing paths.', 'Puzzle'),
      famobi('peet-a-lock', 'Peet a Lock', 'Unlock the door by cutting the right ropes in the correct order.', 'Puzzle'),
      famobi('jelly-run-2048', 'Jelly Run 2048', 'Merge jellies and combine numbers to reach 2048.', 'Puzzle'),
      famobi('totemia-cursed-marbles', 'Totemia: Cursed Marbles', 'Shoot marble balls to match colors before they reach the end.', 'Puzzle'),

      // Match 3 / Bubble Shooter
      famobi('garden-bloom', 'Garden Bloom', 'Match flowers and clear the garden in this colorful match-3 game.', 'Match 3'),
      famobi('zoo-boom', 'Zoo Boom', 'Match animal bubbles to free the zoo animals.', 'Match 3'),
      famobi('bubble-woods', 'Bubble Woods', 'Shoot and match bubbles in the enchanted forest.', 'Bubble Shooter'),
      famobi('bubble-tower-3d', 'Bubble Tower 3D', 'Shoot 3D bubbles to form matches and clear the tower.', 'Bubble Shooter'),

      // Sports
      famobi('3d-free-kick', '3D Free Kick', 'Take free kicks and score goals in this realistic 3D football game.', 'Sport'),
      famobi('8-ball-billiards-classic', '8 Ball Billiards Classic', 'Play classic 8-ball pool against the computer or a friend.', 'Sport', 'multiplayer', 2),
      famobi('archery-world-tour', 'Archery World Tour', 'Compete in archery championships across the world.', 'Sport'),
      famobi('table-tennis-world-tour', 'Table Tennis World Tour', 'Play table tennis and climb the world rankings.', 'Sport'),

      // Cards / Board
      famobi('solitaire-klondike', 'Solitaire Klondike', 'Classic Klondike solitaire card game — sort all cards to win.', 'Cards'),

      // IO Games
      famobi('paper-io-2', 'Paper.io 2', 'Expand your territory by drawing loops without getting cut by rivals.', 'IO Games', 'multiplayer', 8),

      // Mahjong
      famobi('mahjong-classic', 'Mahjong Classic', 'Clear all tiles by matching identical pairs in this classic Mahjong game.', 'Mahjong'),
    ];

    let created = 0;
    let skipped = 0;

    for (const game of games) {
      const result = await Game.updateOne(
        { title: game.title },
        { $set: game, $setOnInsert: { isActive: true } },
        { upsert: true }
      );
      if (result.upsertedCount > 0) created++;
      else skipped++;
    }

    console.log(`✅ Database seeded — ${created} created, ${skipped} already existed`);
  } catch (err) {
    console.error('❌ Error seeding database:', err);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
};

seedDatabase();
