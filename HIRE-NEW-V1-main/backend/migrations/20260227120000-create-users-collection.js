module.exports = {
    async up(db, client) {
        // Ensure email index on users exists and is unique
        await db.collection('users').createIndex({ email: 1 }, { unique: true });

        // Add default credits/roles if missing
        await db.collection('users').updateMany(
            { role: { $exists: false } },
            { $set: { role: 'candidate' } }
        );
    },

    async down(db, client) {
        // Optional rollback logic: removing the index
        await db.collection('users').dropIndex('email_1').catch(() => console.log('Index did not exist.'));
    }
};
