#!/bin/bash
echo "🚀 Setting up Guardian Local Server..."
cd figpal-bot

# Check if .env exists, if not create a template
if [ ! -f .env.local ]; then
    echo "⚠️ Creating .env.local template. PLEASE EDIT THIS FILE WITH YOUR API KEYS!"
    echo "XAI_API_KEY=your_key_here" > .env.local
fi

echo "📦 Installing dependencies..."
npm install

echo "✅ Starting server on port 3000..."
npm run dev
