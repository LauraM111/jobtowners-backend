#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Use the password from .env file
echo "Using database credentials from .env file"

# Create database and user
mysql -u root -p${DB_PASSWORD} <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME};
EOF

echo "Database created successfully."

# Run the database initialization script
npm run init-db 