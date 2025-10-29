import axiosInstance from "@/lib/axios";

const hostName = process.env.NEXT_PUBLIC_SITE_URL!

export async function chatSidebar(): Promise<any> {
    try {
        const response = await axiosInstance.get(`${hostName}messages/users`, {
            headers: {
                'Content-Type': 'application/json',
            },
            withCredentials: true
        })
        return response.data      

    } catch (error: any) {
        if (error.response && error.response.data) {
            return error.response.data;
        }
        return { success: false, message: error.message || "Something went wrong" };
    }
}

export async function sendChatMessage(receiverId: string, formData: FormData) {
  try {
    const res = await axiosInstance.post(
      `${hostName}messages/send/${receiverId}`,
      formData,
      {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return res.data;
  } catch (error: any) {
    if (error.response && error.response.data) return error.response.data;
    return { success: false, message: error.message || "Something went wrong" };
  }
}


export async function chathistory(id: string) {
     try {
    const res = await axiosInstance.get(
        `${hostName}messages/${id}`,
        { withCredentials: true }
    );
    return res.data;

    } catch (error: any) {
        if (error.response && error.response.data) {
            return error.response.data;
        }
        return { success: false, message: error.message || "Something went wrong" };
    }

}

export async function markMessagesAsReadApi(senderId: string) {
  try {
    const res = await axiosInstance.put(`${hostName}messages/mark-read/${senderId}`,{}, {
      withCredentials: true,
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  } catch (error: any) {
    if (error.response && error.response.data) return error.response.data;
    return { success: false, message: error.message || "Something went wrong" };
  }
}


export async function fetchNotificationAction(receiverId: string) {
  try {
    const res = await axiosInstance.get(`${hostName}messages/get-notifications/${receiverId}`, {
      withCredentials: true,
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
    
  } catch (error: any) {
    if (error.response && error.response.data) return error.response.data;
    return { success: false, message: error.message || "Something went wrong" };
  }
}

export async function deleteMessage(messageId: string) {
  try {
    const res = await axiosInstance.delete(`${hostName}messages/delete/${messageId}`, {
      withCredentials: true,
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
    
  } catch (error: any) {
    if (error.response && error.response.data) return error.response.data;
    return { success: false, message: error.message || "Something went wrong" };
  }
}

export async function editMessage(messageId: string, formData: FormData) {
  try {
    const res = await axiosInstance.put(`${hostName}messages/edit/${messageId}`,formData,{
      withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
    
  } catch (error: any) {
    if (error.response && error.response.data) return error.response.data;
    return { success: false, message: error.message || "Something went wrong" };
  }
}
