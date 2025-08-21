module.exports = {
  apps: [
    {
      name: 'auracare-api',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'auracare-worker',
      script: './workers/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'your-production-host',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/auracare-backend.git',
      path: '/var/www/auracare',
      'post-deploy': 'npm install --production && npm run migrate && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
