import mongoose from "mongoose";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import admin from "../lib/firebase.js";
import Notification from "../models/notifications.model.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select(
      "-password"
    );

    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: loggedInUserId, receiverId: user._id },
            { senderId: user._id, receiverId: loggedInUserId },
          ],
        })
          .sort({ createdAt: -1 })
          .lean();

        const unreadCount = await Message.countDocuments({
          senderId: user._id,
          receiverId: loggedInUserId,
          isRead: false,
        });

        let formattedMessage = null;
        if (lastMessage) {
          const dateObj = new Date(lastMessage.createdAt);
          formattedMessage = {
            content: lastMessage.text || "",
            attachment: lastMessage.attachment || null,
            created_time: dateObj.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              timeZone: "Asia/Kolkata",
            }),
            created_date: dateObj.toLocaleDateString("en-GB"),
          };
        }

        return {
          ...user.toObject(),
          lastMessage: formattedMessage,
          unreadCount,
        };
      })
    );

    res.status(200).json(usersWithLastMessage);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    const today = new Date();
    const groupedMessages = {};

    messages.forEach((msg) => {
      const dateObj = new Date(msg.createdAt);
      const createdDate = `${String(dateObj.getDate()).padStart(
        2,
        "0"
      )}-${String(dateObj.getMonth() + 1).padStart(
        2,
        "0"
      )}-${dateObj.getFullYear()}`;

      // Calculate difference in days using UTC to avoid timezone issues
      const todayUTC = new Date();
      const dayDiff = Math.floor(
        (Date.UTC(
          todayUTC.getFullYear(),
          todayUTC.getMonth(),
          todayUTC.getDate()
        ) -
          Date.UTC(
            dateObj.getFullYear(),
            dateObj.getMonth(),
            dateObj.getDate()
          )) /
          (1000 * 60 * 60 * 24)
      );

      // Determine date_time_label
      let dateLabel;
      if (dayDiff === 0) {
        dateLabel = "Today";
      } else if (dayDiff === 1) {
        dateLabel = "Yesterday";
      } else if (dayDiff < 7) {
        dateLabel = dateObj.toLocaleDateString("en-US", { weekday: "long" });
      } else {
        dateLabel = createdDate;
      }

      // Initialize array for this label if not exists
      if (!groupedMessages[dateLabel]) groupedMessages[dateLabel] = [];

      // Convert to IST (or your local timezone)
      const createdTime = dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });

      groupedMessages[dateLabel].push({
        id: msg._id,
        sender_id: msg.senderId,
        content: msg.text,
        attachment: msg.attachment || null,
        created_date: createdDate,
        created_time: createdTime,
        is_read: msg.isRead,
        is_edited: msg.edited || false,
        date_time_label: dateLabel,
      });
    });

    res.status(200).json({ messages: groupedMessages });
  } catch (error) {
    console.log("Error in getMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  const baseurl = process.env.BASE_URL;
  try {
    const { text } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const attachment = req.file
      ? {
          url: `${baseurl}/uploads/${req.file.filename}`,
          type: req.file.mimetype,
          name: req.file.originalname,
        }
      : null;
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      attachment,
      isRead: false,
      delivered: false,
    });

    await newMessage.save();

    // Format message for frontend
    const dateObj = new Date(newMessage.createdAt);
    const createdDate = `${String(dateObj.getDate()).padStart(2, "0")}-${String(
      dateObj.getMonth() + 1
    ).padStart(2, "0")}-${dateObj.getFullYear()}`;

    const today = new Date();
    const dayDiff = Math.floor(
      (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
        Date.UTC(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          dateObj.getDate()
        )) /
        (1000 * 60 * 60 * 24)
    );

    const dateLabel =
      dayDiff === 0
        ? "Today"
        : dayDiff === 1
        ? "Yesterday"
        : dayDiff < 7
        ? dateObj.toLocaleDateString("en-US", { weekday: "long" })
        : createdDate;

    const formattedMessage = {
      id: newMessage._id,
      sender_id: newMessage.senderId,
      receiver_id: newMessage.receiverId,
      content: newMessage.text,
      attachment: newMessage.attachment,
      created_date: createdDate,
      created_time: dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }),
      date_time_label: dateLabel,
      is_read: newMessage.isRead,
    };
    console.log(formattedMessage, "formattedMessage");

    // Send to receiver via socket
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", formattedMessage);
      const unreadCount = await Message.aggregate([
        {
          $match: {
            receiverId: new mongoose.Types.ObjectId(receiverId),
            isRead: false,
          },
        },
        { $group: { _id: "$senderId", count: { $sum: 1 } } },
      ]);
      io.to(receiverSocketId).emit("unreadCountsUpdate", unreadCount);
    }

      const notification = new Notification({
      senderId,
      receiverId,
      type: "message",
      title: "New Message",
      body: text.length > 50 ? text.substring(0, 50) + "..." : text,
      data: {
        messageId: newMessage._id.toString(),
      },
    });
    await notification.save();

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newNotification", notification);
    }
    // Send Firebase push notification
    try {
      // Get receiver from DB
      const receiver = await User.findById(receiverId);
      console.log(receiver, "receiver");

      if (receiver && receiver.fcmToken) {
        const response = await admin.messaging().send({
          token: receiver.fcmToken,
          notification: {
            title: "New Message",
            body: text.length > 50 ? text.substring(0, 50) + "..." : text,
          },
          data: {
            senderId: senderId.toString(),
            receiverId: receiverId.toString(),
            messageId: newMessage._id.toString(),
          },
        });
        console.log("Firebase notification sent successfully:", response);
      }
    } catch (err) {
      console.log("Firebase notification error:", err.message);
    }

    res.status(201).json(formattedMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { senderId } = req.params;
    const myId = req.user._id;

    await Message.updateMany(
      { senderId, receiverId: myId, isRead: false },
      { $set: { isRead: true } }
    );

    // Recalculate unread counts for sidebar
    const unreadCounts = await Message.aggregate([
      { $match: { receiverId: myId, isRead: false } },
      { $group: { _id: "$senderId", count: { $sum: 1 } } },
    ]);

     await Notification.updateMany(
      { senderId, receiverId: myId, isRead: false },
      { $set: { isRead: true } }
    );

     const notifications = await Notification.find({ receiverId: myId })
      .sort({ createdAt: -1 })
      .lean();

    const receiverSocketId = getReceiverSocketId(myId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("unreadCountsUpdate", unreadCounts);
      // io.to(receiverSocketId).emit("notificationsUpdate", updatedNotifications);
    }

    res.status(200).json({ success: true ,notifications});
  } catch (error) {
    console.log("Error in markMessagesAsRead:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /notifications
export const getNotifications = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    // console.log("ReceiverId:", receiverId);

    const notifications = await Notification.find({
      receiverId: new mongoose.Types.ObjectId(receiverId),
    })
      .sort({ createdAt: -1 })
      .lean();

    // console.log("Notifications:", notifications);

    res.status(200).json(notifications);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Update message instead of deleting
    const deletedMessage = await Message.findOneAndUpdate(
      { _id: messageId, senderId: userId },
      { $set: { text: "This message has been deleted",attachment: null, deleted: true } },
      { new: true }
    );

    if (!deletedMessage) {
      return res.status(404).json({ error: "Message not found or unauthorized" });
    }

    // Emit real-time update to receiver if online
    const receiverSocketId = getReceiverSocketId(deletedMessage.receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", {
        messageId: deletedMessage._id,
        text: deletedMessage.text,
      });
    }

    res.status(200).json({ success: true, message: "Message delete successfully" });
  } catch (error) {
    console.error("Error in deleteMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;
    const baseurl = process.env.BASE_URL;
    
    let attachment = null;

    if (req.file) {
      attachment = {
        url: `${baseurl}/uploads/${req.file.filename}`,
        type: req.file.mimetype,
        name: req.file.originalname,
      };
    }

    const updateFields = { edited: true };
    if (text !== undefined) updateFields.text = text;
    if (attachment) updateFields.attachment = attachment;


    const updatedMessage = await Message.findOneAndUpdate(
      { _id: messageId, senderId: userId },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({ error: "Message not found or unauthorized" });
    }

    const receiverSocketId = getReceiverSocketId(updatedMessage.receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageEdited", updatedMessage);
    }

    res.status(200).json({ success: true, message: "Message updated successfully",updatedMessage, });
  } catch (error) {
    console.error("Error in editMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
