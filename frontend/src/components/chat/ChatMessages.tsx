"use client";
import { useEffect, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { connectSocket, getSocket, disconnectSocket } from "../../lib/socket";
import { addMessage, clearUnread, deleteMessageThunk, editMessageThunk, fetchChatHistoryThunk, markMessagesAsReadThunk, moveUserToTop, sendMessageThunk, setOnlineUsers, setUnreadCounts } from "@/store/slices/messageSlice";
import ChatSidebar from "./ChatSidebar";
import Image from "next/image";
import { toast } from "react-toastify";
import { blockUserThunk } from "@/store/slices/authSlice";

const ChatMessages = () => {
  const dispatch = useAppDispatch();
  const hostName = process.env.NEXT_PUBLIC_IMAGE_URL!
  const { profile, user } = useAppSelector((state) => state.auth);
  const { selectedUser, messages, onlineUsers } = useAppSelector((state) => state.messages);
  // console.log(messages, "messagesssss");

  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<boolean>(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editText, setEditText] = useState("");
  const [editAttachment, setEditAttachment] = useState<File | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      connectSocket(userId);
    }

    const socket = getSocket();
    if (!socket) return;

    socket.on("initialUnreadCounts", (data) => {
      dispatch(setUnreadCounts(data));
    });

    socket.on("newMessage", (msg) => {
      console.log(msg, "newMessage");

      const currentUserId = localStorage.getItem("userId")?.replace(/"/g, "");

      const senderId = msg.sender_id || msg.senderId;
      const receiverId = msg.receiver_id || msg.receiverId;

      if (selectedUser && (senderId === selectedUser._id || receiverId === selectedUser._id)) {
        dispatch(addMessage(msg));
      }
      dispatch(moveUserToTop(senderId === currentUserId ? receiverId : senderId));

      if (senderId === currentUserId) return;

      if (selectedUser && senderId === selectedUser._id) {
        dispatch(markMessagesAsReadThunk(senderId));
        dispatch(clearUnread(senderId));
      }
      else {
        dispatch({
          type: "messages/incrementUnread",
          payload: senderId,
        });
      }
    });

    socket.on("getOnlineUsers", (users) => {
      dispatch(setOnlineUsers(users));
    });

    socket.on("unreadCountsUpdate", (data) => {
      dispatch(setUnreadCounts(data));
    });

    socket.on("userTyping", ({ senderId, isTyping }) => {
      if (selectedUser && senderId === selectedUser._id) {
        setIsTyping(isTyping);
      }
    });


    return () => {
      socket?.off("newMessage");
      socket?.off("unreadCountsUpdate");
      socket?.off("getOnlineUsers");
      socket?.off("userTyping");
      socket?.off("messageDeleted");
      disconnectSocket();
    };
  }, [dispatch, selectedUser]);

  useEffect(() => {
    if (selectedUser) {
      dispatch(fetchChatHistoryThunk(selectedUser._id));
    }
  }, [selectedUser, dispatch]);

  const handleSend = () => {
    if (!message.trim() && !attachment) return;
    if (!selectedUser) return;

    const formData = new FormData();
    formData.append("text", message);
    if (attachment) formData.append("attachment", attachment);
    console.log(attachment, "attachment");


    const dateObj = new Date();
    const createdDate = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;

    const dateLabel = "Today";

    const senderMsg = {
      id: Date.now().toString(),
      sender_id: localStorage.getItem("userId"),
      receiver_id: selectedUser._id,
      content: message,
      // attachment: attachment ? URL.createObjectURL(attachment) : null,
      // attachmentType: attachment?.type || null,
      // attachmentName: attachment?.name || null,
      attachment: attachment
        ? { url: URL.createObjectURL(attachment), type: attachment.type, name: attachment.name }
        : null,
      created_date: createdDate,
      created_time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }),
      date_time_label: dateLabel,
      is_read: false,
    };
    console.log(senderMsg, "senderMsg");

    dispatch(addMessage(senderMsg));

    dispatch(sendMessageThunk({ receiverId: selectedUser._id, formData }));

    setMessage("");
    setAttachment(null);

    const socket = getSocket();
    if (socket && selectedUser) {
      socket.emit("userTyping", {
        senderId: localStorage.getItem("userId"),
        receiverId: selectedUser._id,
        isTyping: false,
      });
    }
  };

  const handleTyping = (e: any) => {
    setMessage(e.target.value);

    const socket = getSocket();
    if (socket && selectedUser) {
      socket.emit("userTyping", {
        senderId: localStorage.getItem("userId"),
        receiverId: selectedUser._id,
        isTyping: true,
      });

      if (typingTimeout.current) clearTimeout(typingTimeout.current);

      typingTimeout.current = setTimeout(() => {
        socket.emit("userTyping", {
          senderId: localStorage.getItem("userId"),
          receiverId: selectedUser._id,
          isTyping: false,
        });
      }, 2000);
    }
  };


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  // console.log(attachment, "attachmentttttt"); 

  const handleBlock = async (userId: any) => {
    console.log(userId, "userId");

    try {
      const result = await dispatch(blockUserThunk(userId));
      if (result?.payload?.message === "User blocked successfully") {
        toast.success(result?.payload?.message);
        setIsBlocked(true);
        setMenuOpenId(false)
      } else if (result?.payload?.message === "User unblocked successfully") {
        toast.success(result?.payload?.message);
        setIsBlocked(false);
        setMenuOpenId(false)
      } else {
        toast.error(result?.payload?.message || "Something went wrong");
      }
    } catch (err: any) {
      toast.error(err?.message);
    }
  }

  const handleDelete = async (messageId: string) => {
    try {
      const result = await dispatch(deleteMessageThunk(messageId))
      if (selectedUser) {
        dispatch(fetchChatHistoryThunk(selectedUser._id));
      }
      setMenuOpenId(false)
      toast.success(result?.payload?.message)
    } catch (err: any) {
      toast.error(err?.message);
    }
  }

  const handleEditClick = (msg: any) => {
    setEditingMessage(msg);
    setEditText(msg.content);
    setIsEditModalOpen(true);
    setMenuOpenId(false);
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setEditingMessage(null);
    setEditText("");
  };

  const handleEditSubmit = async () => {
    if (!editingMessage) return;
    const formData = new FormData();
    formData.append("text", editText);
    if (editAttachment) formData.append("attachment", editAttachment);
    try {
      const result = await dispatch(editMessageThunk({
        messageId: editingMessage.id,
        formData
      }));
      if (selectedUser) {
        dispatch(fetchChatHistoryThunk(selectedUser._id));
      }
      toast.success(result.payload.message)
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <ChatSidebar />

      <div className="flex flex-col flex-1">
        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center h-full text-center
              w-full h-11 rounded-lg border px-4 text-sm
              bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
              dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400
              dark:focus:ring-brand-500 dark:focus:border-brand-500
            ">
            <h2 className="text-2xl font-bold">Welcome to Chatty!</h2>
            <p className="text-base-content/60">
              Select a conversation from the sidebar to start chatting
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center gap-2  w-full h-11 rounded-lg border px-4 py-8 text-sm
               bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400
               focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
               dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400
               dark:focus:ring-brand-500 dark:focus:border-brand-500
               ">
              <Image
                width={44}
                height={44}
                src={
                  selectedUser?.image
                    ? `${hostName}uploads/${selectedUser.image}`
                    : "/images/user/owner.jpg"
                }
                alt={`${selectedUser?.firstName}`}
                className="w-10 h-10 rounded-full"
              />

              <div className="flex-1">
                <h2 className="font-semibold">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h2>
                <p className="text-xs">
                  {isTyping ? (
                    <span className="italic text-gray-500">Typing...</span>
                  ) : onlineUsers.includes(selectedUser._id) ? (
                    <span className="text-green-500">● Online</span>
                  ) : (
                    <span className="text-gray-400">● Offline</span>
                  )}
                </p>
              </div>
              <span onClick={(e) => { e.preventDefault(); setMenuOpenId(!menuOpenId) }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="4" height="20" viewBox="0 0 4 20" fill="none">
                  <path d="M2 4C3.10457 4 4 3.10457 4 2C4 0.895431 3.10457 0 2 0C0.895431 0 0 0.895431 0 2C0 3.10457 0.895431 4 2 4Z" fill="#464B70" />
                  <path d="M2 11.9999C3.10457 11.9999 4 11.1044 4 9.99988C4 8.89531 3.10457 7.99988 2 7.99988C0.895431 7.99988 0 8.89531 0 9.99988C0 11.1044 0.895431 11.9999 2 11.9999Z" fill="#464B70" />
                  <path d="M2 19.9998C3.10457 19.9998 4 19.1043 4 17.9998C4 16.8952 3.10457 15.9998 2 15.9998C0.895431 15.9998 0 16.8952 0 17.9998C0 19.1043 0.895431 19.9998 2 19.9998Z" fill="#464B70" />
                </svg>
              </span>
              {menuOpenId && (
                <div className="absolute right-38 bg-white border shadow-md rounded-md w-28 z-50">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleBlock(selectedUser._id);
                    }}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-red-500 cursor-pointer"
                  >
                    {isBlocked ? "Unblock" : "Block"}
                  </button>

                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto  w-full h-11 rounded-lg border px-4 text-sm
              bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
              dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400
              dark:focus:ring-brand-500 dark:focus:border-brand-500
              ">
              {Object.entries(messages?.messages || {}).map(([dateLabel, msgs]) => {
                return (
                  <div key={dateLabel}>
                    <div className="text-center my-2 text-gray-500 text-sm font-medium">
                      {dateLabel}
                    </div>

                    {msgs.map((msg: any) => {
                      const currentUserId = localStorage.getItem("userId")?.replace(/"/g, "");
                      const isMyMessage = msg.sender_id === currentUserId;
                      return (
                        <div key={msg.id}>
                          <span className="italic text-gray-800 text-[11px] flex justify-end">{(msg.is_edited && isMyMessage) ? "edited" : null}</span>
                          <div
                            key={msg.id}
                            className={`flex ${isMyMessage ? "justify-end" : "justify-start"} mb-2`}
                          >
                            <div className="relative group bg-blue-100 p-3 rounded-lg max-w-sm dark:bg-gray-900 border border-gray-300">
                              <p>{msg.content}</p>
                              {/* Attachment preview */}
                              {msg.attachment && (
                                <>
                                  {/* Image */}
                                  <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer">
                                    {msg.attachment.type?.startsWith("image/") && (
                                      <img
                                        src={msg.attachment.url}
                                        alt={msg.attachment.name}
                                        className="w-full h-30 object-cover rounded-md mb-1"
                                      />
                                    )}
                                  </a>

                                  {/* Video */}
                                  {msg.attachment.type?.startsWith("video/") && (
                                    <video
                                      src={msg.attachment.url}
                                      //  alt={msg.attachment.name}
                                      controls
                                      className="w-full h-30 rounded-md mb-1"
                                    />
                                  )}

                                  {/* PDF */}
                                  {msg.attachment.type?.startsWith("application/pdf") && (
                                    <a
                                      href={msg.attachment.url}
                                      target="_blank"
                                      className="flex items-center gap-1 text-blue-600 underline mb-1"
                                    >
                                      {/* 📄 {attachment?.name} */}
                                      📄 {msg.attachment.type}
                                    </a>
                                  )}

                                  {/* Other files */}
                                  {!msg.attachment.type?.startsWith("image/") &&
                                    !msg.attachment.type?.startsWith("video/") &&
                                    msg.attachment.type !== "application/pdf" && (
                                      <a
                                        href={msg.attachment.url}
                                        target="_blank"
                                        className="flex items-center gap-1 text-blue-600 underline mb-1"
                                      >
                                        📎 {"file.pdf"}
                                      </a>
                                    )}
                                </>
                              )}
                              <span className="text-xs text-gray-500 block mt-1 text-right flex items-center justify-end gap-1">
                                {msg.created_time}
                                {isMyMessage && (
                                  <button
                                    onClick={() =>
                                      setMenuOpenId(menuOpenId === msg.id ? null : msg.id)
                                    }
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                                  >
                                    ⋮
                                  </button>
                                )}

                                {menuOpenId === msg.id && (
                                  <div className="absolute right-0 top-8 bg-white border shadow-md rounded-md w-28 z-50">
                                    <button className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                                      onClick={() => handleEditClick(msg)}
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-red-500 cursor-pointer"
                                      onClick={() => handleDelete(msg.id)}
                                    >
                                      🗑 Delete
                                    </button>
                                  </div>
                                )}

                                {msg.sender_id === currentUserId && (
                                  <span className="ml-1 flex items-center">
                                    {msg.is_read === false ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="27" height="15" viewBox="0 0 27 15" fill="none">
                                        <path d="M13.0745 9.70926L14.8158 11.4712L25.2562 0.907162L27 2.67157L14.8158 15L6.96766 7.0589L8.71143 5.29448L11.332 7.94609L13.0745 9.70801V9.70926ZM13.077 6.18043L19.1839 0L20.9227 1.75942L14.8158 7.93986L13.077 6.18043ZM9.59071 13.2368L7.84818 15L0 7.0589L1.74377 5.29448L3.4863 7.05765L3.48506 7.0589L9.59071 13.2368Z" fill="#5c5c5c" />
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="27" height="15" viewBox="0 0 27 15" fill="none">
                                        <path d="M13.0745 9.70926L14.8158 11.4712L25.2562 0.907162L27 2.67157L14.8158 15L6.96766 7.0589L8.71143 5.29448L11.332 7.94609L13.0745 9.70801V9.70926ZM13.077 6.18043L19.1839 0L20.9227 1.75942L14.8158 7.93986L13.077 6.18043ZM9.59071 13.2368L7.84818 15L0 7.0589L1.74377 5.29448L3.4863 7.05765L3.48506 7.0589L9.59071 13.2368Z" fill="#3F53FE" />
                                      </svg>
                                    )}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            {isEditModalOpen && (
              <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-blue-100 rounded-lg p-6 w-96 max-w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4">Edit Message</h3>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Edit your message..."
                    autoFocus
                  />

                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Attachment</label>

                    {!editAttachment  && editingMessage?.attachment && (
                      <div className="mb-3 relative">
                        {editingMessage.attachment.type?.startsWith("image/") && (
                          <img
                            src={editingMessage.attachment.url}
                            alt={editingMessage.attachment.name}
                            className="w-full h-32 object-cover rounded-md border"
                          />
                        )}
                        {editingMessage.attachment.type?.startsWith("video/") && (
                          <video
                            src={editingMessage.attachment.url}
                            controls
                            className="w-full h-32 rounded-md border"
                          />
                        )}
                        {editingMessage.attachment.type?.startsWith("application/pdf") && (
                          <a
                            href={editingMessage.attachment.url}
                            target="_blank"
                            className="text-blue-600 underline"
                          >
                            📄 {editingMessage.attachment.name}
                          </a>
                        )}
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/*,video/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setEditAttachment(file);
                      }}
                      className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                    />

                    {editAttachment && (
                      <div className="mt-3 relative">
                        {editAttachment.type.startsWith("image/") && (
                          <img
                            src={URL.createObjectURL(editAttachment)}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-md border"
                          />
                        )}
                        {editAttachment.type.startsWith("video/") && (
                          <video
                            src={URL.createObjectURL(editAttachment)}
                            controls
                            className="w-full h-32 rounded-md border"
                          />
                        )}
                        {editAttachment.type === "application/pdf" && (
                          <p className="mt-1 text-sm text-gray-700">
                            📄 {editAttachment.name}
                          </p>
                        )}

                        <button
                          onClick={() => setEditAttachment(null)}
                          className="absolute top-1 right-1 bg-gray-700 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Modal Actions */}
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEditSubmit}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="p-4 border-t flex items-center gap-2 dark:bg-gray-900">
              <input
                type="file"
                id="attachment"
                className="hidden"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              />
              <label
                htmlFor="attachment"
                className="cursor-pointer p-2 bg-gray-200 rounded-full"
              >
                📎
              </label>

              <input
                value={message}
                onChange={handleTyping}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Write Something..."
                className="flex-1 p-2 rounded-full border bg-gray-50"
              />

              {attachment && (
                <div className="flex items-center gap-2 mt-2">
                  {/* <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1"> */}
                  {/* {attachment.name} */}
                  {attachment.type.startsWith("image/") && (
                    <img
                      src={URL.createObjectURL(attachment)}
                      alt="preview"
                      className="w-20 h-20 object-cover rounded-md border"
                    />
                  )}
                  {/* Video preview */}
                  {attachment.type.startsWith("video/") && (
                    <video
                      src={URL.createObjectURL(attachment)}
                      className="w-32 h-20 rounded-md border"
                      controls
                    />
                  )}

                  {/* PDF or other files */}
                  {attachment.type === "application/pdf" && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md border dark:bg-gray-800 dark:text-white dark:border-gray-600">
                      📄 {attachment.name}
                    </div>
                  )}

                  {/* Fallback for other unknown file types */}
                  {!attachment.type.startsWith("image/") &&
                    !attachment.type.startsWith("video/") &&
                    attachment.type !== "application/pdf" && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md border dark:bg-gray-800 dark:text-white dark:border-gray-600">
                        📎 {attachment.name}
                      </div>
                    )}
                  <button
                    type="button"
                    className="text-red-500 font-bold"
                    onClick={() => setAttachment(null)}
                  >
                    ×
                  </button>
                  {/* </span> */}
                </div>
              )}
              <button
                type="button"
                onClick={handleSend}
                className="p-2 bg-blue-500 text-white rounded-full px-4"
              >
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatMessages;
