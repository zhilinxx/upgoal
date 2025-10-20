// import mysql from "mysql2/promise";

// let pool;

// export const connectDB = async () => {
//   pool = mysql.createPool({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASS,
//     database: process.env.DB_NAME,
//     waitForConnections: true,
//     connectionLimit: 10,
//   });
//   console.log("✅ MySQL Connected!");
// };

// export const getDB = () => pool;

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

let db;

export const connectDB = async () => {
  if (!db) {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    console.log("✅ MySQL connected");
  }
};

export const getDB = () => {
  if (!db) throw new Error("Database not connected");
  return db;
};
