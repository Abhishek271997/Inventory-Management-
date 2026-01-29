
async function main() {
    try {
        console.log("Fetching efficiency metrics...");
        const res = await fetch('http://localhost:3001/api/analytics/efficiency?days=30');
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Data:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}
main();
