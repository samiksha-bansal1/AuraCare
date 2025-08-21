#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting AuraCare Backend Setup...${NC}"

# Check for required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${YELLOW}❌ $1 is not installed. Please install it and try again.${NC}"
        exit 1
    fi
}

echo -e "\n🔍 Checking required tools..."
check_command node
check_command npm
check_command docker
check_command docker-compose

# Get Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${YELLOW}⚠️  Node.js version 16 or higher is required. Found version $NODE_VERSION.${NC}"
    exit 1
fi

# Install dependencies
echo -e "\n📦 Installing dependencies..."
npm install

# Set up environment variables
echo -e "\n⚙️  Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file from .env.example${NC}"
    echo -e "${YELLOW}ℹ️  Please update the .env file with your configuration${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Generate SSL certificates
echo -e "\n🔐 Generating SSL certificates..."
mkdir -p ssl/conf ssl/certs ssl/private
./scripts/generate-ssl.sh

# Create necessary directories
echo -e "\n📁 Creating necessary directories..."
mkdir -p logs uploads

# Build Docker images
echo -e "\n🐳 Building Docker images..."
docker-compose build

# Start services
echo -e "\n🚀 Starting development services..."
docker-compose up -d

# Wait for MongoDB to be ready
echo -e "\n⏳ Waiting for MongoDB to be ready..."
until docker exec auracare-mongo mongo --eval "print('MongoDB is ready')" >/dev/null 2>&1; do
    printf '.'
    sleep 1
done

echo -e "\n\n${GREEN}✨ Setup completed successfully!${NC}"
echo -e "\n📝 Next steps:"
echo -e "1. Update the .env file with your configuration"
echo -e "2. Run database migrations: ${YELLOW}npm run migrate${NC}"
echo -e "3. Create database indexes: ${YELLOW}npm run create-indexes${NC}"
echo -e "4. Start the development server: ${YELLOW}npm run dev${NC}"
echo -e "\n🌐 Access the following services:"
echo -e "- API: ${YELLOW}https://localhost:3000${NC}"
echo -e "- MongoDB Compass: ${YELLOW}http://localhost:8081${NC}"
echo -e "- Redis Commander: ${YELLOW}http://localhost:8082${NC}"
echo -e "\n🔧 For development, you can also run the app directly with: ${YELLOW}npm run dev${NC}"
