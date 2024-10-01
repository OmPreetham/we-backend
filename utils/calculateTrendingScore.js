// utils/calculateTrendingScore.js

export const calculateTrendingScore = (post) => {
    const { upvoteCount, downvoteCount, commentCount, createdAt } = post;
    const netVotes = upvoteCount - downvoteCount;
    const hoursSinceCreation = (Date.now() - new Date(createdAt).getTime()) / 36e5; // Convert milliseconds to hours
    const weight = 2; // Adjust this weight as needed
  
    // Add 2 to hours to prevent division by zero and dampen time effect
    const score = (netVotes + commentCount * weight) / (hoursSinceCreation + 2);
  
    return score;
  };