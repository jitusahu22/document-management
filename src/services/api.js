// src/services/api.js

import axios from "axios";

const api = axios.create({
  baseURL: "https://apis.allsoft.co/api/documentManagement/",
  headers: {
    "Content-Type": "application/json",
  },
});


const authHeader = () => ({
  token: localStorage.getItem("token") || "",
});


export const generateOTP = (mobile_number) => {
  return api.post("/generateOTP", { mobile_number });
};


export const validateOTP = (mobile_number, otp) => {
  return api.post("/validateOTP", { mobile_number, otp });
};


export const uploadDocument = (formData) => {
  return api.post("/saveDocumentEntry", formData, {
    headers: {
      ...authHeader(),
      "Content-Type": "multipart/form-data",
    },
  });
};


export const searchDocuments = (filters) => {
  return api.post("/searchDocumentEntry", filters, {
    headers: authHeader(),
  });
};


export const fetchTags = (term = "") => {
  return api.post("/documentTags", { term }, { headers: authHeader() });
};

export default api;