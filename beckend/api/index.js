import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDB from "../src/db/index.js";
import axios from 'axios';
import userRouter from '../src/routes/user.router.js';
import fileRouter from '../src/routes/file.router.js';
import { app } from "../src/app.js";

// Configure environment variables
dotenv.config({
    path:"./.env"
});

// Initialize express
const app = express();

// Configure allowed origins
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
].filter(Boolean); // Remove any undefined values

// Configure CORS with credentials
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// Handle preflight requests
app.options('*', cors());

// Connect to MongoDB
let isConnected = false;

const connectToDatabase = async () => {
    if (isConnected) {
        return;
    }
    try {
        await connectDB();
        isConnected = true;
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};

// Routes
app.use("/api/v1/user", userRouter);
app.use("/api/v1/file", fileRouter);

app.post("/api/run", async (req, res) => {
    try {
        const { language, version, files } = req.body;
        const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
            language,
            version,
            files,
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// Handle favicon.ico requests
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Root route
app.get('/', (req, res) => {
    res.send('API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
    });
});

// Export the serverless function
export default async function handler(req, res) {
    try {
        // Connect to database if not connected
        await connectToDatabase();
        
        // Handle the request using the Express app
        return new Promise((resolve, reject) => {
            app(req, res, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    } catch (error) {
        console.error('Serverless function error:', error);
        return res.status(500).json({ 
            success: false,
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error'
        });
    }
}

const PORT = process.env.PORT || 8001

connectDB()
.then(()=>{
    app.listen(PORT,()=>{
        console.log(`Server listening on port: http://localhost:${PORT}`);
        
    })
})
.catch((err)=>{
    console.log(`MongoDB connection Error:- ${err}`);
    
})

app.get('/',(req,res)=>{
    res.send(`Hello world`)
}) 