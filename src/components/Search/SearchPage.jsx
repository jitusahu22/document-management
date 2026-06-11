import React, { useState, useEffect, useCallback } from "react";
import DatePicker from "react-datepicker";
import Select from "react-select";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { searchDocuments, fetchTags } from "../../services/api";

const MINOR_OPTIONS = {
  Personal: ["John", "Tom", "Emily", "Sarah", "Mike"],
  Professional: ["Accounts", "HR", "IT", "Finance", "Operations", "Legal"],
};

const PAGE_SIZE = 10;

// Inline spinner
function Spinner({ light = true }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 inline-block ${light ? "text-white" : "text-blue-600"}`}
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}

function PreviewModal({ doc, onClose }) {
  if (!doc) return null;
  const url = doc.file_url || doc.fileUrl || doc.url || "";
  const name = doc.file_name || doc.fileName || "document";
  const lower = (url || name).toLowerCase();

  const isImage = /\.(png|jpe?g|gif|bmp|webp|svg)$/.test(lower);
  const isPdf = /\.pdf$/.test(lower);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-blue-900 truncate">{name}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-gray-50">
          {isImage && (
            <img src={url} alt={name} className="max-h-[70vh] w-auto rounded" />
          )}
          {isPdf && (
            <iframe
              src={url}
              title="pdf-preview"
              className="w-full h-[70vh] rounded border"
            />
          )}
          {!isImage && !isPdf && (
            <p className="text-gray-500 text-center py-10">
              Preview not supported for this file type.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchPage() {

  const [majorHead, setMajorHead] = useState("");
  const [minorHead, setMinorHead] = useState("");
  const [tagOptions, setTagOptions] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const [results, setResults] = useState([]);
  const [start, setStart] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchTags("");
        const raw = res?.data?.data || res?.data || [];
        const opts = (Array.isArray(raw) ? raw : []).map((t) => {
          const name = t.tag_name || t.label || t;
          return { label: name, value: name };
        });
        setTagOptions(opts);
      } catch {
        setTagOptions([]);
      }
    })();
  }, []);

  const buildFilters = useCallback(
    (offset) => ({
      major_head: majorHead,
      minor_head: minorHead,
      from_date: fromDate ? fromDate.toISOString().split("T")[0] : "",
      to_date: toDate ? toDate.toISOString().split("T")[0] : "",
      tags: selectedTags.map((t) => ({ tag_name: t.value })),
      uploaded_by: "",
      start: offset,
      length: PAGE_SIZE,
      filterId: "",
      search: { value: "" },
    }),
    [majorHead, minorHead, fromDate, toDate, selectedTags]
  );

  const runSearch = useCallback(
    async (reset = true) => {
      setError("");
      const offset = reset ? 0 : start;
      reset ? setLoading(true) : setLoading(true);

      try {
        const res = await searchDocuments(buildFilters(offset));
        const data = res?.data?.data || res?.data || [];
        const rows = Array.isArray(data) ? data : [];

        if (reset) {
          setResults(rows);
        } else {
          setResults((prev) => [...prev, ...rows]);
        }

        setHasMore(rows.length === PAGE_SIZE);
        setStart(offset + PAGE_SIZE);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Search failed. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [buildFilters, start]
  );


  const handleSearch = (e) => {
    e.preventDefault();
    setStart(0);
    runSearch(true);
  };

  const downloadFile = async (doc) => {
    const url = doc.file_url || doc.fileUrl || doc.url;
    const name = doc.file_name || doc.fileName || "document";
    if (!url) return;
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      saveAs(blob, name);
    } catch {
      window.open(url, "_blank");
    }
  };

  const downloadAllAsZip = async () => {
    if (!results.length) return;
    setZipLoading(true);
    const zip = new JSZip();

    try {
      await Promise.all(
        results.map(async (doc, idx) => {
          const url = doc.file_url || doc.fileUrl || doc.url;
          const name = doc.file_name || doc.fileName || `file_${idx}`;
          if (!url) return;
          try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            zip.file(name, blob);
          } catch {
            // skip files that fail to fetch
          }
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "documents.zip");
    } catch {
      setError("Failed to build ZIP archive.");
    } finally {
      setZipLoading(false);
    }
  };


  const getTagNames = (doc) => {
    const tags = doc.tags || [];
    return tags.map((t) => t.tag_name || t).filter(Boolean);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-blue-900 mb-5">Search Documents</h2>

        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Major Head */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Major Head</label>
            <select
              value={majorHead}
              onChange={(e) => {
                setMajorHead(e.target.value);
                setMinorHead("");
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="Personal">Personal</option>
              <option value="Professional">Professional</option>
            </select>
          </div>

          {/* Minor Head */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minor Head</label>
            <select
              value={minorHead}
              onChange={(e) => setMinorHead(e.target.value)}
              disabled={!majorHead}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">All</option>
              {majorHead &&
                MINOR_OPTIONS[majorHead].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <Select
              isMulti
              options={tagOptions}
              value={selectedTags}
              onChange={(vals) => setSelectedTags(vals || [])}
              placeholder="Filter by tags..."
              classNamePrefix="react-select"
            />
          </div>

          {/* From Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <DatePicker
              selected={fromDate}
              onChange={(d) => setFromDate(d)}
              dateFormat="yyyy-MM-dd"
              placeholderText="Start date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <DatePicker
              selected={toDate}
              onChange={(d) => setToDate(d)}
              dateFormat="yyyy-MM-dd"
              placeholderText="End date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Search button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? <Spinner /> : "Search"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">{results.length} result(s)</p>
          <button
            onClick={downloadAllAsZip}
            disabled={zipLoading}
            className="bg-blue-800 hover:bg-blue-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            {zipLoading ? <Spinner /> : "⬇ Download All as ZIP"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((doc, idx) => {
          const name = doc.file_name || doc.fileName || `Document ${idx + 1}`;
          return (
            <div
              key={doc.document_id || doc.id || idx}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col"
            >
              <h3 className="font-semibold text-gray-800 truncate" title={name}>
                📄 {name}
              </h3>

              <div className="mt-2 text-sm text-gray-600 space-y-1 flex-1">
                <p>
                  <span className="font-medium">Category:</span>{" "}
                  {doc.major_head || "-"} / {doc.minor_head || "-"}
                </p>
                <p>
                  <span className="font-medium">Date:</span>{" "}
                  {doc.document_date || "-"}
                </p>
                <p>
                  <span className="font-medium">Uploaded by:</span>{" "}
                  {doc.uploaded_by || doc.user_id || "-"}
                </p>

                {/* Tag chips */}
                {getTagNames(doc).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {getTagNames(doc).map((t, i) => (
                      <span
                        key={i}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium py-1.5 rounded-lg transition-colors"
                >
                  Preview
                </button>
                <button
                  onClick={() => downloadFile(doc)}
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium py-1.5 rounded-lg transition-colors"
                >
                  Download
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* No results message */}
      {!loading && results.length === 0 && (
        <p className="text-center text-gray-400 py-10">
          No documents found. Try adjusting your filters.
        </p>
      )}

      {hasMore && results.length > 0 && (
        <div className="text-center mt-6">
          <button
            onClick={() => runSearch(false)}
            disabled={loading}
            className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? <Spinner light={false} /> : "Load More"}
          </button>
        </div>
      )}

      <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}

export default SearchPage;