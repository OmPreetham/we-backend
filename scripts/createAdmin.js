// scripts/createAdmin.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { hashEmail, encryptData } from '../utils/encryption.js';
import User from '../models/User.js';

dotenv.config();

const URI = process.env.MONGO_URI

const createAdminUser = async () => {
    console.log('MONGO_URI:', process.env.MONGO_URI);
  try {
    await mongoose.connect(URI, {});

    const username = 'tamuccAdmin'; // Set your desired admin username
    const password = 'Password@123'; // Set a strong password
    const email = 'admin@islander.tamucc.edu'; // Use a valid email

    // Hash and encrypt the email
    const hashedEmail = hashEmail(email);
    const encryptedEmail = encryptData(hashedEmail);

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    const adminUser = new User({
      username,
      email: encryptedEmail,
      password,
      role: 'admin',
    });

    await adminUser.save();
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    mongoose.connection.close();
  }
};

createAdminUser();