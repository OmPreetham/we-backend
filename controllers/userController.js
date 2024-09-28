import User from '../models/User.js';

// Get Current Authenticated User
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;  // Get the userId from the authenticated request
    const user = await User.findById(userId).select('-password');  // Exclude password from response

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Server error fetching user details' });
  }
};

// Update User Profile
export const updateUsername = async (req, res) => {
  try {
    const userId = req.user.userId;  // Get the userId from the authenticated request
    const { username } = req.body;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingUsername = await User.findOne({ username })

    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' })
    }

    // Update fields if provided
    if (username) user.username = username;

    await user.save();

    res.status(200).json({ message: 'User profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
};

// Delete User Account
export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.userId;  // Get the userId from the authenticated request

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.deleteOne();

    res.status(200).json({ message: 'User account deleted successfully' });
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ error: 'Server error deleting account' });
  }
};
