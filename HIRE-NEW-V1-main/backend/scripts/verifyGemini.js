require('dotenv').config({ path: '.env' });

const key = String(process.env.GOOGLE_API_KEY || '').trim();
const model = String(process.env.VERIFY_GEMINI_MODEL || 'gemini-2.5-flash').trim();

if (!key) {
    throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
}

const run = async () => {
    const body = {
        contents: [{
            parts: [{
                text: 'Extract role, city, salary, experience as JSON from: I am a 4 year Node developer in Bangalore expecting 15 LPA.',
            }],
        }],
    };

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }
    );

    const data = await res.json();
    console.log(JSON.stringify({ model, status: res.status, ok: res.ok, data }, null, 2));
    if (!res.ok) {
        process.exit(1);
    }
};

run().catch((error) => {
    console.error(error?.message || error);
    process.exit(1);
});
