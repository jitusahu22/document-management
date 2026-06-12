import axios from "axios";

const api = axios.create({
  baseURL: "https://apis.allsoft.co/api/documentManagement",
  headers: { "Content-Type": "application/json" },
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["token"] = token;
  }
  return config;
});


// POST /generateOTP  
export const generateOTP = (mobile_number) =>
  api.post("/generateOTP", { mobile_number });

// POST /validateOTP  

export const validateOTP = (mobile_number, otp) =>
  api.post("/validateOTP", { mobile_number, otp });

// POST /saveDocumentEntry 
export const uploadDocument = (formData) =>
  api.post("/saveDocumentEntry", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// POST /searchDocumentEntry 
export const searchDocuments = (filters) =>
  api.post("/searchDocumentEntry", filters);

// POST /documentTags  
export const fetchTags = (term = "") =>
  api.post("/documentTags", { term });
