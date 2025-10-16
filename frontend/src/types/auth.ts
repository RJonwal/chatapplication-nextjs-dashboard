interface AuthState{
  user: any,
  isLoading: boolean,
  error: any,
  message: string,
  success: boolean,
  token:string,
  profile:any,
}

interface AuthResponse {
    success: any;
    message: any;
    errors?: any;
    data: any;
    email: any;
    _id:any;
    firstName:string,
    lastName:string,
    company:any
}

interface RegisterFormData {
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    password:string;
}