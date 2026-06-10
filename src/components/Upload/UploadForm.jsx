import React, { useState, useEffect, useCallback } from "react";
import DatePicker from "react-datepicker";
import CreatableSelect from "react-select/creatable";
import { uploadDocument, fetchTags } from "../../services/api";

const MINOR_OPTIONS = {
  Personal: ["John", "Tom", "Emily", "Sarah", "Mike"],
  Professional: ["Accounts", "HR", "IT", "Finance", "Operations", "Legal"],
};

// Inline button spinner
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white inline-block" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}

function UploadForm() {
  // ---- Form state ----
  const [documentDate, setDocumentDate] = useState(new Date());
  const [majorHead, setMajorHead] = useState("");
  const [minorHead, setMinorHead] = useState("");
  const [tagOptions, setTagOptions] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]); 
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null); // object URL for image thumbnails

  // ---- UI state ----
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadTags = useCallback(async () => {
    try {
      const res = await fetchTags("");
      const raw = res?.data?.data || res?.data || [];
      const opts = (Array.isArray(raw) ? raw : []).map((t) => {
        const name = t.tag_name || t.label || t;
        return { label: name, value: name };
      });
      setTagOptions(opts);
    } catch {
      // Non-fatal: user can still create tags manually
      setTagOptions([]);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);


  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // Validate type: images and PDFs only
    const isImage = f.type.startsWith("image/");
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isImage && !isPdf) {
      setError("Only image files and PDFs are allowed.");
      return;
    }

    setError("");
    setFile(f);

    // Build a thumbnail URL only for images
    if (isImage) {
      setFilePreview(URL.createObjectURL(f));
    } else {
      setFilePreview(null);
    }
  };

  // -------------------------------------------------------------------
  // Submit: validate -> build FormData -> POST
  // -------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // ---- Basic validation ----
    if (!file) return setError("Please select a file to upload.");
    if (!majorHead) return setError("Please select a Major Head category.");
    if (!minorHead) return setError("Please select a Minor Head category.");
    if (!documentDate) return setError("Please select a document date.");

    // Format date as YYYY-MM-DD
    const formattedDate = documentDate.toISOString().split("T")[0];

    // Build the data JSON the API expects
    const dataPayload = {
      major_head: majorHead,
      minor_head: minorHead,
      document_date: formattedDate,
      document_remarks: remarks,
      tags: selectedTags.map((t) => ({ tag_name: t.value })),
      user_id: localStorage.getItem("user_id") || "",
    };

    // Build multipart FormData
    const formData = new FormData();
    formData.append("file", file);
    formData.append("data", JSON.stringify(dataPayload));

    setLoading(true);
    try {
      await uploadDocument(formData);
      setSuccess("✅ Document uploaded successfully!");

      // Reset form (keep major/minor for convenience)
      setRemarks("");
      setSelectedTags([]);
      setFile(null);
      setFilePreview(null);
      // Refresh tags so newly created ones appear
      loadTags();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Upload failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
        <h2 className="text-xl font-bold text-blue-900 mb-6">Upload Document</h2>

        {/* Banners */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Date
            </label>
            <DatePicker
              selected={documentDate}
              onChange={(d) => setDocumentDate(d)}
              dateFormat="yyyy-MM-dd"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Major / Minor dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Major Head
              </label>
              <select
                value={majorHead}
                onChange={(e) => {
                  setMajorHead(e.target.value);
                  setMinorHead(""); // reset dependent dropdown
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                <option value="Personal">Personal</option>
                <option value="Professional">Professional</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minor Head
              </label>
              <select
                value={minorHead}
                onChange={(e) => setMinorHead(e.target.value)}
                disabled={!majorHead}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select sub-category</option>
                {majorHead &&
                  MINOR_OPTIONS[majorHead].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Tags creatable select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <CreatableSelect
              isMulti
              options={tagOptions}
              value={selectedTags}
              onChange={(vals) => setSelectedTags(vals || [])}
              placeholder="Select or create tags..."
              classNamePrefix="react-select"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Optional notes about this document..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* File input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File (Image or PDF)
            </label>
            <input
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700"
            />

            {/* File name preview */}
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: <span className="font-medium">{file.name}</span>
              </p>
            )}

            {/* Image thumbnail preview */}
            {filePreview && (
              <img
                src={filePreview}
                alt="preview"
                className="mt-3 h-32 w-auto rounded-lg border border-gray-200 object-cover"
              />
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? <Spinner /> : "Upload Document"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default UploadForm;