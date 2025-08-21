const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
const writeFile = promisify(fs.writeFile);

// Directories to create
const directories = [
  'logs',
  'uploads',
  'uploads/media',
  'uploads/avatars',
  'uploads/documents',
  'config',
  'models',
  'controllers',
  'routes',
  'services',
  'middleware',
  'utils',
  'tests',
  'tests/unit',
  'tests/integration',
  'tests/fixtures',
  'scripts'
];

// Files to create
const files = [
  {
    path: '.env',
    content: `# Server Configuration
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Database
MONGO_URI=mongodb://localhost:27017/auracare

# CORS - Add your frontend URLs here
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Feature Flags
ALERT_SIMULATOR=off
VITALS_POLLER_INTERVAL_MS=3000

# External Services
FASTAPI_BASE_URL=http://localhost:8000

# Logging
LOG_LEVEL=info

# Test Credentials
TEST_PATIENT_ID=
TEST_PATIENT_TOKEN=
TEST_STAFF_TOKEN=
TEST_FAMILY_TOKEN=`
  },
  {
    path: '.gitignore',
    content: `# Dependencies
node_modules/

# Environment variables
.env

# Logs
logs/*.log

# Uploads
/uploads/**
!/uploads/.gitkeep

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Test coverage
coverage/

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local development
.env.local
.env.development.local
.env.test.local
.env.production.local`
  },
  {
    path: '.eslintrc.js',
    content: `module.exports = {
  env: {
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'import/prefer-default-export': 'off',
    'class-methods-use-this': 'off',
    'no-underscore-dangle': ['error', { allow: ['_id'] }],
    'import/extensions': ['error', 'ignorePackages', {
      js: 'never',
      jsx: 'never',
      ts: 'never',
      tsx: 'never',
    }],
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        moduleDirectory: ['node_modules', 'src/'],
      },
      alias: {
        map: [
          ['@', './'],
          ['@config', './config'],
          ['@controllers', './controllers'],
          ['@middleware', './middleware'],
          ['@models', './models'],
          ['@routes', './routes'],
          ['@services', './services'],
          ['@utils', './utils'],
        ],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
};`
  },
  {
    path: '.prettierrc',
    content: `{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "avoid"
}`
  },
  {
    path: 'README.md',
    content: `# AuraCare Backend

Backend service for the AuraCare ICU Patient Monitoring System.

## Getting Started

### Prerequisites

- Node.js 16+
- MongoDB 5.0+
- Redis (optional, for rate limiting)

### Installation

1. Clone the repository
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Copy .env.example to .env and update the values:
   \`\`\`bash
   cp .env.example .env
   \`\`\`
4. Run the setup script:
   \`\`\`bash
   node scripts/setup.js
   \`\`\`

### Development

Start the development server:
\`\`\`bash
npm run dev
\`\`\`

### Production

Build and start the production server:
\`\`\`bash
npm run build
npm start
\`\`\`

## Testing

Run tests:
\`\`\`bash
npm test
\`\`\`

## License

This project is licensed under the MIT License.`
  }
];

async function setup() {
  try {
    console.log('Setting up project structure...');
    
    // Create directories
    for (const dir of directories) {
      const dirPath = path.join(process.cwd(), dir);
      try {
        await access(dirPath);
        console.log(`Directory already exists: ${dir}`);
      } catch (err) {
        if (err.code === 'ENOENT') {
          await mkdir(dirPath, { recursive: true });
          console.log(`Created directory: ${dir}`);
        } else {
          throw err;
        }
      }
    }
    
    // Create files
    for (const file of files) {
      const filePath = path.join(process.cwd(), file.path);
      try {
        await access(filePath);
        console.log(`File already exists: ${file.path}`);
      } catch (err) {
        if (err.code === 'ENOENT') {
          await writeFile(filePath, file.content, 'utf8');
          console.log(`Created file: ${file.path}`);
        } else {
          throw err;
        }
      }
    }
    
    console.log('\n✅ Setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update the .env file with your configuration');
    console.log('2. Run \'npm install\' to install dependencies');
    console.log('3. Start the server with \'npm run dev\'');
    
  } catch (error) {
    console.error('❌ Error during setup:', error);
    process.exit(1);
  }
}

// Run setup
setup();
