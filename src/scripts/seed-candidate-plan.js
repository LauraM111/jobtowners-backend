const { exec } = require('child_process');

console.log('Running candidate plan seeder...');
exec('ts-node -r tsconfig-paths/register src/scripts/seeders/candidate-plan.seeder.ts', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(stdout);
}); 