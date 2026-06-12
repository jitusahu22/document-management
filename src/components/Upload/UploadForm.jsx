import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import CreatableSelect from "react-select/creatable";
import { uploadDocument, fetchTags } from "../../services/api";

const MINOR_OPTIONS = {
  Personal:     ["John", "Tom", "Emily", "Sarah", "Mike"],
  Professional: ["Accounts", "HR", "IT", "Finance", "Operations", "Legal"],
};

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white inline-block" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}

function UploadForm() {
  const [documentDate,  setDocumentDate]  = useState(new Date());
  const [majorHead,     setMajorHead]     = useState("");
  const [minorHead,     setMinorHead]     = useState("");
  const [selectedTags,  setSelectedTags]  = useState([]);
  const [tagOptions,    setTagOptions]    = useState([]);
  const [remarks,       setRemarks]       = useState("");
  const [file,          setFile]          = useState(null);
  const [imagePreview,  setImagePreview]  = useState(null);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadTags = async () => {
      try {
        const res = await fetchTags("");
        const raw = res?.data?.data || [];
        const options = raw.map((t) => ({
          label: t.label || t.tag_name,
          value: t.label || t.tag_name,
        }));
        setTagOptions(options);
      } catch {
        setTagOptions([]);
      }
    };
    loadTags();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const isImage = selected.type.startsWith("image/");
    const isPdf   = selected.type === "application/pdf" || selected.name.endsWith(".pdf");

    if (!isImage && !isPdf) {
      setError("Only image files (JPG, PNG) and PDFs are allowed.");
      return;
    }

    setError("");
    setFile(selected);
    setImagePreview(isImage ? URL.createObjectURL(selected) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!file)      return setError("Please select a file.");
    if (!majorHead) return setError("Please select a Major Head.");
    if (!minorHead) return setError("Please select a Minor Head.");

    const day   = String(documentDate.getDate()).padStart(2, "0");
    const month = String(documentDate.getMonth() + 1).padStart(2, "0");
    const year  = documentDate.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    const dataPayload = {
      major_head:       majorHead,
      minor_head:       minorHead,
      document_date:    formattedDate,
      document_remarks: remarks,
      tags:             selectedTags.map((t) => ({ tag_name: t.value })),
      user_id:          localStorage.getItem("user_id") || "",
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("data", JSON.stringify(dataPayload));

    setLoading(true);
    try {
      await uploadDocument(formData);
      setSuccess("Document uploaded successfully!");
      setRemarks("");
      setMajorHead("");
      setMinorHead("");
      setSelectedTags([]);
      setFile(null);
      setImagePreview(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-6 bg-gray-50">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-md p-6">

        <h2 className="text-xl font-bold text-blue-900 mb-4">Upload Document</h2>

        {error && (
          <div className="mb-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="space-y-4">

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Date</label>
                <DatePicker
                  selected={documentDate}
                  onChange={(d) => setDocumentDate(d)}
                  dateFormat="dd-MM-yyyy"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Major Head</label>
                  <select
                    value={majorHead}
                    onChange={(e) => { setMajorHead(e.target.value); setMinorHead(""); }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    <option value="Personal">Personal</option>
                    <option value="Professional">Professional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minor Head</label>
                  <select
                    value={minorHead}
                    onChange={(e) => setMinorHead(e.target.value)}
                    disabled={!majorHead}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select</option>
                    {majorHead && MINOR_OPTIONS[majorHead].map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <CreatableSelect
                  isMulti
                  options={tagOptions}
                  value={selectedTags}
                  onChange={(vals) => setSelectedTags(vals || [])}
                  placeholder="Select or type to create tags..."
                  classNamePrefix="react-select"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Pick existing tags or type a new one and press Enter.
                </p>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="Optional notes about this document..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">

              {/* File input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File (Image or PDF only)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-600
                    file:mr-3 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:bg-blue-600 file:text-white
                    file:cursor-pointer hover:file:bg-blue-700"
                />
              </div>

              <div
                className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden"
                style={{ height: "220px" }}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="w-full h-full object-contain rounded-xl"
                    style={{ maxWidth: "100%", maxHeight: "100%" }}
                  />
                ) : file && !imagePreview ? (
                  <div className="text-center text-gray-400 p-6">
                    <p className="text-4xl mb-2">📄</p>
                    <p className="text-sm font-medium text-gray-500">{file.name}</p>
                    <p className="text-xs text-gray-400 mt-1">PDF — no preview available</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-300 p-6">
                    <p className="text-4xl mb-2">🖼</p>
                    <p className="text-sm">Image preview will appear here</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {loading ? <Spinner /> : "Upload Document"}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}

export default UploadForm;