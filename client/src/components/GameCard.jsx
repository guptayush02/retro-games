function GameCard({ game }) {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden hover:shadow-lg hover:shadow-purple-500 transition-shadow cursor-pointer">
      <img
        src={game.thumbnail}
        alt={game.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{game.title}</h3>
        <p className="text-gray-400 text-sm mb-3">{game.description}</p>
        <div className="flex justify-between items-center">
          <span className="bg-purple-600 px-3 py-1 rounded text-sm">{game.genre}</span>
          <span className="text-gray-400">👥 {game.players}</span>
        </div>
      </div>
    </div>
  );
}

export default GameCard;
