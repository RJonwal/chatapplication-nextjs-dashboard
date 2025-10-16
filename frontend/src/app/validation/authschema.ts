import * as yup from "yup";


export const useRegiserSchema=()=>{
    return yup.object({
        firstName:yup.string()
        .required("Firstname is required"),
        lastName:yup.string()
        .required("Lastname is required"),
        company:yup.string()
        .required("Company is required"),
        email:yup.string()
        .required("Email is required")
            .email("Invalid email address")
            .matches(
                /^[^\s@]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                "Invalid email format"
            ),
        password:yup.string()
        .required("Password is required")
        .min(6, "Password must be at least 6 characters"),
    })
}

export const useLoginSchema=()=>{
    return yup.object({
      email:yup.string()
        .required("Email is required")
            .email("Invalid email address")
            .matches(
                /^[^\s@]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                "Invalid email format"
            ),
        password:yup.string()
        .required("Password is required")
        .min(6, "Password must be at least 6 characters"),
    })
}

export const useProfileSchema = () => {
  return yup.object().shape({
    firstName: yup.string().required("First name is required"),
    lastName: yup.string().required("Last name is required"),
    company: yup.string().required("Company is required"),
    password: yup
      .string()
      .nullable()
      .notRequired()
      .when([], {
        is: (val: any) => val?.length,
        then: (schema) =>
          schema
            .min(6, "Password must be at least 6 characters")
            .max(20, "Password must not exceed 20 characters"),
      }),
    image: yup
      .mixed<File>()
      .test("fileSize", "File size too large", (file) => {
        if (!file) return true; // optional
        return (file as any).size <= 2 * 1024 * 1024; // 2MB
      })
      .test("fileType", "Unsupported file format", (file) => {
        if (!file) return true;
        return ["image/jpeg", "image/png", "image/jpg"].includes(
          (file as any).type
        );
      })
      .nullable(),
  });
};

