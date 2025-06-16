const Notification = require('../models/Notification');
const User = require('../models/User');

const createNotification = async ({
  recipientId,
  senderId,
  requestId,
  type,
  title,
  message,
  data = {}
}) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      request: requestId,
      type,
      title,
      message,
      data
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

const notifyRequestAccepted = async (request, volunteer) => {
  try {
    await createNotification({
      recipientId: request.requester,
      senderId: volunteer._id,
      requestId: request._id,
      type: 'request_accepted',
      title: 'Request Accepted',
      message: `${volunteer.name} has accepted your request "${request.title}"`,
      data: {
        requestId: request._id,
        volunteerId: volunteer._id
      }
    });
  } catch (error) {
    console.error('Error creating request accepted notification:', error);
  }
};

const notifyRequestCompleted = async (request, volunteer) => {
  try {
    await createNotification({
      recipientId: request.requester,
      senderId: volunteer._id,
      requestId: request._id,
      type: 'request_completed',
      title: 'Request Completed',
      message: `${volunteer.name} has marked your request "${request.title}" as completed`,
      data: {
        requestId: request._id,
        volunteerId: volunteer._id
      }
    });
  } catch (error) {
    console.error('Error creating request completed notification:', error);
  }
};

const notifyNewMessage = async (message, sender, receiver) => {
  try {
    await createNotification({
      recipientId: receiver._id,
      senderId: sender._id,
      type: 'new_message',
      title: 'New Message',
      message: `You have a new message from ${sender.name}`,
      data: {
        messageId: message._id,
        conversationId: message.conversation
      }
    });
  } catch (error) {
    console.error('Error creating new message notification:', error);
  }
};

const notifyRequestCreated = async (request, requester) => {
  try {
    // Notify nearby volunteers
    const nearbyVolunteers = await User.find({
      role: 'volunteer',
      location: {
        $near: {
          $geometry: request.location,
          $maxDistance: 10000 // 10km radius
        }
      }
    });

    for (const volunteer of nearbyVolunteers) {
      await createNotification({
        recipientId: volunteer._id,
        senderId: requester._id,
        requestId: request._id,
        type: 'request_created',
        title: 'New Request Nearby',
        message: `A new request "${request.title}" has been created near you`,
        data: {
          requestId: request._id,
          requesterId: requester._id
        }
      });
    }
  } catch (error) {
    console.error('Error creating request created notifications:', error);
  }
};

module.exports = {
  createNotification,
  notifyRequestAccepted,
  notifyRequestCompleted,
  notifyNewMessage,
  notifyRequestCreated
}; 