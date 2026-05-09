#!/bin/bash

set -e

echo "🎮 Setting up Retro Games Portal..."

if ! command -v node >/dev/null 2>&1; then
	echo "❌ Node.js is not installed. Please install Node.js 18+ and re-run setup."
	exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
	echo "❌ npm is not installed. Please install npm and re-run setup."
	exit 1
fi

echo "✅ Node: $(node --version)"
echo "✅ npm:  $(npm --version)"

# Ensure env file exists
if [ ! -f ".env" ]; then
	if [ -f ".env.example" ]; then
		cp .env.example .env
		echo "🧩 Created .env from .env.example"
	else
		echo "⚠️  .env.example not found. Please create a .env file manually."
	fi
fi

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Optional seed step
echo "🌱 Seeding sample games..."
if (cd server && npm run seed); then
	echo "✅ Seed completed"
else
	echo "⚠️  Seed failed. Make sure MONGODB_URI in .env is valid and MongoDB is reachable."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Verify MONGODB_URI in .env (root .env)"
echo "2. Run setup + start servers: ./setup.sh --dev"
echo "   OR run separately:"
echo "   - cd server && npm run dev"
echo "   - cd client && npm run dev"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5001"
echo ""
echo "📚 Documentation: See README.md and docs/ folder"

if [ "$1" = "--dev" ]; then
	echo ""
	echo "🚀 Starting backend + frontend in dev mode..."
	npx concurrently \
		--names "backend,frontend" \
		--prefix-colors "cyan,magenta" \
		"cd server && npm run dev" \
		"cd client && npm run dev"
fi
