
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SHEETS_ENDPOINT || 'https://script.google.com/macros/s/AKfycbyMhduh1yY7WCMK6rbLq3dDV1FMQ6TcGDTHjlBEGevFw-GPkqj0VZ20m_UHjmXWrRNFqQ/exec';

export const sendToGoogleSheet = async (record: any) => {
    if (!GOOGLE_SCRIPT_URL) {
        console.warn('Google Sheets export skipped: URL not configured.');
        return;
    }

    try {
        // Use 'no-cors' mode to avoid CORS issues with Google Apps Script
        // Note: In 'no-cors' mode, we can't read the response status, but the request will be sent.
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(record),
        });

        console.log('Sent to Google Sheets');
    } catch (error) {
        console.error('Failed to export to Google Sheets:', error);
        // We do NOT throw the error here because we don't want to break the main app flow
        // if the spreadsheet export fails.
    }
};
