import { spawn } from 'child_process';
import * as path from 'path';

// First run the database initialization
console.log('Initializing database...');
const initProcess = spawn('npm', ['run', 'init-db'], { stdio: 'inherit' });

initProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`Database initialization failed with code ${code}`);
    process.exit(code);
  }
  
  console.log('Database initialized successfully. Starting application...');
  
  // Then start the application
  const startProcess = spawn('nest', ['start'], { stdio: 'inherit' });
  
  startProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Application exited with code ${code}`);
      process.exit(code);
    }
  });
}); 