import { google } from 'googleapis';
import fs from 'fs';

// Helper to authenticate
const getAuthClient = () => {
    try {
        if (!fs.existsSync('./google_credentials.json')) {
            console.warn("google_credentials.json not found. Google Sheets logging disabled.");
            return null;
        }
        const auth = new google.auth.GoogleAuth({
            keyFile: './google_credentials.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        return auth;
    } catch (error) {
        console.error("Error loading Google Credentials:", error.message);
        return null;
    }
};

export const saveToGoogleSheet = async (logData) => {
    const auth = getAuthClient();
    if (!auth) return;

    const spreadsheetId = '1i0ScZU5zC6JSZmL8cYZkVz_1Qvq-M1zDJIIij_lG0hc';
    const sheets = google.sheets({ version: 'v4', auth });

    // Format Data for Sheet (Row)
    // ID, Engineer, Date, Area, System, Component, Action, Spare Part, Qty, Work Status, Remarks
    const values = [
        [
            new Date().toISOString(), // Use timestamp as ID/Time
            logData.engineer,
            logData.date,
            logData.area,
            logData.system,
            logData.component,
            logData.action,
            logData.spare_part_used || 'N/A',
            logData.qty_used || 0,
            logData.work_status,
            logData.remarks
        ]
    ];

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:K', // Assumes Sheet1, Columns A to K
            valueInputOption: 'USER_ENTERED',
            resource: {
                values,
            },
        });
        console.log('Successfully wrote to Google Sheet');
    } catch (error) {
        console.error('Error writing to Google Sheet:', error.message);
    }
};
