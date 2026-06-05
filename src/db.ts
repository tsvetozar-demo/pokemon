import mongoose from "mongoose";
import config from "./config/config.json" with { type: 'json' };

const MONGO_URI = config.mongodb.url;

export const connect = async () => {
    console.log(`Connecting to MongoDB ...`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');
};