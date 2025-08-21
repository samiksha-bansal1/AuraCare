# AuraCare Backend Development Guide

This guide provides instructions for setting up and working with the AuraCare backend in a development environment.

## Prerequisites

- Node.js 16+ and npm 8+
- Docker and Docker Compose
- Git

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd auracare-backend
```

### 2. Set Up Environment Variables

Copy the example environment file and update it with your configuration:

```bash
cp .env.example .env
```

Edit the `.env` file with your specific configuration.

### 3. Install Dependencies

```bash
npm install
```

### 4. Set Up Development Environment

Run the setup script to configure your development environment:

```bash
npm run setup:dev
```

This will:
- Generate SSL certificates
- Create necessary directories
- Build and start Docker containers
- Wait for MongoDB to be ready

## Development Workflow

### Starting the Development Server

```bash
npm run dev
```

This will start the development server with hot-reload enabled.

### Running Tests

#### Unit Tests
```bash
npm test
```

#### Integration Tests
```bash
npm run test:integration
```

#### Test Coverage
```bash
npm run test:coverage
```

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Docker Commands

### Start Services
```bash
npm run docker:up
```

### Stop Services
```bash
npm run docker:down
```

### View Logs
```bash
npm run docker:logs
```

### Access MongoDB Shell
```bash
npm run docker:mongo
```

### Rebuild Containers
```bash
npm run docker:build
```

## Database Management

### Create Indexes
```bash
npm run create-indexes
```

### Run Migrations
```bash
npm run migrate
```

## API Documentation

Once the development server is running, you can access:

- **API Documentation**: `https://localhost:3000/api-docs`
- **Health Check**: `https://localhost:3000/health`

## Development Tools

- **MongoDB Compass**: `http://localhost:8081`
- **Redis Commander**: `http://localhost:8082`

## Debugging

### VS Code Debug Configuration

Add this to your `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug AuraCare Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/server.js",
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    }
  ]
}
```

## Deployment

### Production Build

1. Build the Docker image:
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```

2. Start the production services:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Environment Variables

Make sure to set the following environment variables in production:

```env
NODE_ENV=production
MONGO_URI=mongodb://username:password@mongodb:27017/auracare?authSource=admin
JWT_SECRET=your-secure-jwt-secret
CORS_ORIGINS=https://your-frontend-domain.com
```

## Monitoring

### Logs

Logs are stored in the `logs/` directory:
- `combined.log`: Combined application logs
- `error.log`: Error logs
- `audit.log`: Audit trail of all actions

### Health Check

```bash
curl https://your-api-domain.com/health
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Ensure no other services are running on ports 3000, 8081, 8082

2. **MongoDB Connection Issues**
   - Check if MongoDB is running: `docker ps | grep mongo`
   - Check logs: `docker logs auracare-mongo`

3. **SSL Certificate Errors**
   - Regenerate certificates: `npm run generate:ssl`
   - Clear browser cache

## Contributing

1. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "Add your feature"
   ```

3. Push to the branch:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
