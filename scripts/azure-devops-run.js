const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Playwright tests in Azure DevOps environment');

// Create a .env file with Azure DevOps variables if they exist
try {
  const envVars = [
    'BASE_URL',
    'USERNAME',
    'PASSWORD',
    'API_KEY',
    'METRICS_PORT',
    // Add any other environment variables your tests need
  ];

  const envFileContent = envVars
    .filter(varName => process.env[varName])
    .map(varName => `${varName}=${process.env[varName]}`)
    .join('\n');

  if (envFileContent) {
    fs.writeFileSync(path.join(__dirname, '..', '.env'), envFileContent);
    console.log('Created .env file with Azure DevOps variables');
  }
} catch (error) {
  console.error('Error creating .env file:', error);
}

// Run the tests and handle the exit code
try {
  // You can customize the test command based on your needs
  const testCommand = process.env.TEST_COMMAND || 'npx playwright test';
  console.log(`Executing test command: ${testCommand}`);
  
  execSync(testCommand, { stdio: 'inherit' });
  
  console.log('Tests completed successfully');
  process.exit(0);
} catch (error) {
  console.error('Tests failed with error:', error.message);
  
  // Generate Allure report even if tests fail
  try {
    console.log('Generating Allure report...');
    execSync('npx allure generate allure-results --clean -o allure-report', { 
      stdio: 'inherit' 
    });
  } catch (reportError) {
    console.error('Failed to generate Allure report:', reportError.message);
  }
  
  process.exit(1);
}