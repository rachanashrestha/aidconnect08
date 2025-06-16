const User = require('../models/User');

const BADGES = {
  FIRST_HELP: {
    name: 'First Help',
    description: 'Completed your first request',
    icon: '🎯'
  },
  HELPER_LEVEL_1: {
    name: 'Helper Level 1',
    description: 'Completed 5 requests',
    icon: '🌟'
  },
  HELPER_LEVEL_2: {
    name: 'Helper Level 2',
    description: 'Completed 20 requests',
    icon: '⭐'
  },
  HELPER_LEVEL_3: {
    name: 'Helper Level 3',
    description: 'Completed 50 requests',
    icon: '👑'
  },
  STREAK_3: {
    name: '3-Day Streak',
    description: 'Helped for 3 days in a row',
    icon: '🔥'
  },
  STREAK_7: {
    name: '7-Day Streak',
    description: 'Helped for 7 days in a row',
    icon: '⚡'
  },
  STREAK_30: {
    name: '30-Day Streak',
    description: 'Helped for 30 days in a row',
    icon: '💫'
  },
  HIGH_RATING: {
    name: 'Highly Rated',
    description: 'Maintained a 4.5+ average rating',
    icon: '🏆'
  },
  URGENT_HELPER: {
    name: 'Urgent Helper',
    description: 'Helped with 10 urgent requests',
    icon: '🚑'
  }
};

const checkAndAwardBadges = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'volunteer') return;

    const { completedRequests, currentStreak, averageRating } = user.volunteerStats;

    // Check for completion-based badges
    if (completedRequests === 1) {
      await user.addBadge(BADGES.FIRST_HELP);
    }
    if (completedRequests === 5) {
      await user.addBadge(BADGES.HELPER_LEVEL_1);
    }
    if (completedRequests === 20) {
      await user.addBadge(BADGES.HELPER_LEVEL_2);
    }
    if (completedRequests === 50) {
      await user.addBadge(BADGES.HELPER_LEVEL_3);
    }

    // Check for streak-based badges
    if (currentStreak === 3) {
      await user.addBadge(BADGES.STREAK_3);
    }
    if (currentStreak === 7) {
      await user.addBadge(BADGES.STREAK_7);
    }
    if (currentStreak === 30) {
      await user.addBadge(BADGES.STREAK_30);
    }

    // Check for rating-based badge
    if (averageRating >= 4.5 && user.volunteerStats.totalRatings >= 5) {
      await user.addBadge(BADGES.HIGH_RATING);
    }
  } catch (error) {
    console.error('Error checking and awarding badges:', error);
  }
};

const updateVolunteerStats = async (userId, requestData) => {
  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'volunteer') return;

    // Update completed requests count
    user.volunteerStats.completedRequests += 1;

    // Update streak
    await user.updateStreak();

    // Update total hours if provided
    if (requestData.duration) {
      user.volunteerStats.totalHours += requestData.duration;
    }

    // Check for urgent helper badge
    if (requestData.emergencyLevel === 'urgent') {
      const urgentCount = await Request.countDocuments({
        volunteer: userId,
        emergencyLevel: 'urgent',
        status: 'completed'
      });
      if (urgentCount === 10) {
        await user.addBadge(BADGES.URGENT_HELPER);
      }
    }

    await user.save();
    await checkAndAwardBadges(userId);
  } catch (error) {
    console.error('Error updating volunteer stats:', error);
  }
};

module.exports = {
  checkAndAwardBadges,
  updateVolunteerStats,
  BADGES
}; 