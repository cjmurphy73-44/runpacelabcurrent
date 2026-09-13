const axios = require('axios');
const execSync = require('child_process').execSync;

async function reportBuild() {
  try {
    const commit = execSync('git rev-parse HEAD').toString().trim();
    await axios.post(`https://api.airtable.com/v0/${process.env.YOUR_BASE_ID}/Builds`, {
      fields: { 
        Status: 'Success', 
        'Commit Hash': commit 
      }
    }, { 
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } 
    });
    console.log('Build reported successfully');
  } catch (error) {
    console.error('Failed to report build:', error.message);
    process.exit(1);
  }
}

reportBuild();
