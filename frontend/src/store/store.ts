import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import messagesReducer from "./slices/messageSlice";

const store = configureStore({
    reducer:{
         auth: authReducer,
         messages: messagesReducer,
    }
})
export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;