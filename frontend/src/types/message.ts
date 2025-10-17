interface MessageState{
  users:User | any,
  isLoading: boolean,
  error: any,
  text: string,
  success: boolean,
  message:any,
  messages: Message[];
  onlineUsers: string[];
  selectedUser: User | null,
  unreadCounts: Record<string, number>;
  notifications:[];
}
interface Message {
  _id?: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt?: string;
  attachment?: string | null;
}

 interface User {
  _id: string;
  firstName: string;
  lastName: string;
  image:string;
}
interface MessageResponse {
    success: any;
    message: any;
    errors?: any;
    data: any;
    email: any;
    unreadCount:any
}