const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const clearDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hirecircle');

        console.log('Connected to MongoDB. Wiping all collections for production release...');
        const collections = Object.keys(mongoose.connection.collections);

        for (const collectionName of collections) {
            const collection = mongoose.connection.collections[collectionName];
            await collection.deleteMany({});
            console.log(`Cleared collection: ${collectionName}`);
        }

        console.log('Database wiped successfully. Ready for production.');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error wiping database:', error);
        process.exit(1);
    }
};

clearDB();
