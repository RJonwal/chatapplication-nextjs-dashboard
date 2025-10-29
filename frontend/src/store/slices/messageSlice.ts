"use client";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { registerAction } from "../action/authAction";
import { chathistory, chatSidebar, deleteMessage, editMessage, fetchNotificationAction, markMessagesAsReadApi, sendChatMessage } from "../action/messageAction";

const initialState: MessageState = {
  users: [],
  isLoading: false,
  error: null,
  text: '',
  message: "",
  messages: [],
  success: false,
  onlineUsers: [],
  selectedUser: null,
  unreadCounts: {},
  notifications:[]
};

const updatedInitialState: MessageState = {
  ...initialState,
};

export const chatSidebarThunk = createAsyncThunk<
  MessageResponse,
  void,
  { rejectValue: MessageResponse }
>("auth/chat-sidebar", async (_, { rejectWithValue }) => {
  const response = await chatSidebar()
  return response;
})

export const sendMessageThunk = createAsyncThunk(
  "chat/sendMessage",
  async ({ receiverId, formData }: { receiverId: string; formData: FormData }) => {
    return await sendChatMessage(receiverId, formData);
  }
);

export const fetchChatHistoryThunk = createAsyncThunk(
  "chat/fetchChatHistory",
  async (id: string, { rejectWithValue }) => {
    try {
      return await chathistory(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data || "Failed to fetch messages");
    }
  }
);

export const markMessagesAsReadThunk = createAsyncThunk(
  "chat/markMessagesAsRead",
  async (senderId: string, { rejectWithValue }) => {
    try {
    const response =   await markMessagesAsReadApi(senderId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || "Failed to mark messages as read");
    }
  }
);


export const fetchNotificationThunk = createAsyncThunk(
  "chat/notifications",
  async (receiverId: string, { rejectWithValue }) => {
    try {
     const response =await fetchNotificationAction(receiverId);
      return response;      
    } catch (error: any) {
      return rejectWithValue(error.response?.data || "Failed to mark messages as read");
    }
  }
)

export const deleteMessageThunk = createAsyncThunk(
  "chat/deletemessage",
  async (messageId: string, { rejectWithValue }) => {
    try {
    const response = await deleteMessage(messageId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || "Failed to mark messages as read");
    }
  }
);


export const editMessageThunk = createAsyncThunk(
  "chat/editmessage",
  async ({ messageId, text }: { messageId: string; text: string }, { rejectWithValue }) => {
    try {
    const response=  await editMessage(messageId,text);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || "Failed to mark messages as read");
    }
  }
);

const chatSlice = createSlice({
  name: "auth",
  initialState: updatedInitialState,
  reducers: {
    clearMessages: (state) => {
      state.error = null;
      state.message = '';
    },
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
    addMessage: (state, action) => {
     const msg = action.payload;
     const dateLabel = msg.date_time_label || "Today";

     if (!state.messages.messages) {
       state.messages.messages = {};
     }

     if (!state.messages.messages[dateLabel]) {
       state.messages.messages[dateLabel] = [];
    }

    state.messages.messages[dateLabel]?.push(msg);
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    setUnreadCounts: (state, action) => {
      const arr = action.payload || [];
      const map: Record<string, number> = {};
      arr.forEach((it:any) => {
        if (it && it._id) map[String(it._id)] = it.count || 0;
      });
      state.unreadCounts = map;
    },
    // clearUnread: (state, action) => {
    //   state.unreadCounts[action.payload] = 0;
    // },
    clearUnread: (state, action) => {
     const userId = action.payload;
     state.unreadCounts[userId] = 0;

     const userIndex = state.users.findIndex((u:any) => u._id === userId);
      if (userIndex !== -1) {
       state.users[userIndex].unreadCount = 0;
      }
     },
    incrementUnread: (state, action) => {
     const userId = action.payload;
     state.unreadCounts[userId] = (state.unreadCounts[userId] || 0) + 1;
     },
    moveUserToTop: (state, action) => {
    // console.log(action,"action111");
    
    const userId = action.payload;
    console.log(userId,"userId");
    
    const index = state.users.findIndex((u: { _id: any }) => u._id === userId);
    // console.log(index,"index");
    // console.log("Looking for:", userId, "in", state.users.map(u => u._id));

    if (index > -1) {
      const [user] = state.users.splice(index, 1);
      
      state.users.unshift(user);
    }
  },
  },
  extraReducers: (builder) => {
    builder.addCase(chatSidebarThunk.pending, (state) => {
      state.isLoading = true,
        state.error = null
    })
    builder.addCase(chatSidebarThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.success = true;
      state.users = action.payload;
    })
    builder.addCase(chatSidebarThunk.rejected, (state, action) => {
      state.isLoading = true
    })
    builder.addCase(sendMessageThunk.pending, (state) => {
      state.isLoading = true,
        state.error = null
    })
    builder.addCase(sendMessageThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.success = true;
    })
    builder.addCase(sendMessageThunk.rejected, (state, action) => {
      state.isLoading = true
      state.error = action.payload;
    })

    builder.addCase(fetchChatHistoryThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });

    builder.addCase(fetchChatHistoryThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.success = true;
      state.messages = action.payload;
    });

    builder.addCase(fetchChatHistoryThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
      builder.addCase(markMessagesAsReadThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(markMessagesAsReadThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.success = true;
      // const senderId = action.payload as string;
      // state.unreadCounts[senderId] = 0;
      const notifications = action.payload.notifications;
        notifications.forEach((n: any) => {
        state.unreadCounts[n.senderId] = 0;
         });
       state.notifications = notifications;
    });

    builder.addCase(markMessagesAsReadThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
      builder.addCase(fetchNotificationThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchNotificationThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.success = true;
      state.notifications = action.payload;
    });

    builder.addCase(fetchNotificationThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
         builder.addCase(deleteMessageThunk.pending, (state) => {
             state.isLoading = true;
             state.error = null;
    });
        builder.addCase(deleteMessageThunk.fulfilled, (state, action) => {
             state.isLoading = false;
             state.success = true;
             // state.messages = action.payload;
    });
        builder.addCase(deleteMessageThunk.rejected, (state, action) => {
             state.isLoading = false;
             state.error = action.payload as string;
    });
        builder.addCase(editMessageThunk.pending, (state) => {
             state.isLoading = true;
             state.error = null;
    });
        builder.addCase(editMessageThunk.fulfilled, (state, action) => {
             state.isLoading = false;
             state.success = true;
             // state.messages = action.payload;
    });
        builder.addCase(editMessageThunk.rejected, (state, action) => {
             state.isLoading = false;
             state.error = action.payload as string;
    });
  }
})

export const { clearMessages, setSelectedUser, addMessage, setMessages, setOnlineUsers,setUnreadCounts,clearUnread,moveUserToTop } = chatSlice.actions;
export default chatSlice.reducer;