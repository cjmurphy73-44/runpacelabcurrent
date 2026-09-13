import axios from 'axios';

export const logToAirtable = async (level, message, context) => {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.YOUR_BASE_ID;

  try {
    await axios.post(`https://api.airtable.com/v0/${BASE_ID}/Errors`, {
      fields: { 
        Source: 'Frontend', 
        Severity: level, 
        Message: message, 
        Context: JSON.stringify(context) 
      }
    }, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
  } catch (e) {
    console.error("Monitoring failed", e);
  }
};
