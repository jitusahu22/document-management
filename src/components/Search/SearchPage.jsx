import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from "react-select";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Search, Download, Eye, FileText } from "lucide-react";
import { searchDocuments, fetchTags } from "../../services/api";

const MINOR_OPTIONS = {
  Personal:     ["John", "Tom", "Emily", "Sarah", "Mike"],
  Professional: ["Accounts", "HR", "IT", "Finance", "Operations", "Legal"],
};

const PAGE_SIZE = 9;

function Spinner({ dark = false }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 inline-block ${dark ? "text-blue-600" : "text-white"}`}
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}

function PreviewModal({ doc, onClose }) {
  if (!doc) return null;

  const url   = doc.file_url || "";
  const lower = url.toLowerCase().split("?")[0];
  const isImage = /\.(png|jpe?g|gif|webp|bmp)$/.test(lower);
  const isPdf   = /\.pdf$/.test(lower);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <p className="font-semibold text-blue-900">{doc.major_head} / {doc.minor_head}</p>
            <p className="text-xs text-gray-400">Uploaded by {doc.uploaded_by}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-50 flex items-center justify-center">
          {isImage && <img src={url} alt="document preview" className="max-h-[65vh] w-auto rounded" />}
          {isPdf && <iframe src={url} title="pdf-preview" className="w-full h-[65vh] rounded border" />}
          {!isImage && !isPdf && (
            <p className="text-gray-400 text-center py-10">Preview not supported for this file type.</p>
          )}
        </div>
        <div className="px-5 py-3 border-t text-right">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchPage() {
  const [majorHead,    setMajorHead]    = useState("");
  const [minorHead,    setMinorHead]    = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagOptions,   setTagOptions]   = useState([]);
  const [fromDate,     setFromDate]     = useState(null);
  const [toDate,       setToDate]       = useState(null);

  const [results,    setResults]    = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [start,      setStart]      = useState(0);
  const [hasMore,    setHasMore]    = useState(false);

  const [loading,    setLoading]    = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [error,      setError]      = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);

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

  const buildFilters = (offset) => {
    const fmt = (d) => {
      if (!d) return "";
      const day   = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      return `${d.getFullYear()}-${month}-${day}`;
    };
    return {
      major_head:  majorHead,
      minor_head:  minorHead,
      from_date:   fmt(fromDate),
      to_date:     fmt(toDate),
      tags:        selectedTags.map((t) => ({ tag_name: t.value })),
      uploaded_by: "",
      start:       offset,
      length:      PAGE_SIZE,
      filterId:    "",
      search:      { value: "" },
    };
  };

  const runSearch = async (reset = true) => {
    setError("");
    setLoading(true);
    const offset = reset ? 0 : start;
    try {
      const res   = await searchDocuments(buildFilters(offset));
      const rows  = res?.data?.data || [];
      const total = res?.data?.recordsTotal || 0;
      if (reset) {
        setResults(rows);
        setStart(PAGE_SIZE);
      } else {
        setResults((prev) => [...prev, ...rows]);
        setStart(offset + PAGE_SIZE);
      }
      setTotalCount(total);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      setError(err?.response?.data?.message || "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    runSearch(true);
  };

  const fetchBlob = async (url) => {
    try {
      // In dev, route through the Vite CORS proxy to bypass cross-origin restrictions.
      // In production, fetch directly (server must allow CORS or be same-origin).
      const fetchUrl = import.meta.env.DEV
        ? `/cors-proxy?url=${encodeURIComponent(url)}`
        : url;
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.blob();
    } catch {
      return null;
    }
  };

  const getExtension = (url) => {
    const clean = url.split("?")[0];
    const match = clean.match(/\.(\w+)$/);
    return match ? `.${match[1]}` : "";
  };

  const downloadFile = async (doc) => {
    const url = doc.file_url;
    if (!url) return;
    const blob = await fetchBlob(url);
    if (blob) {
      const ext      = getExtension(url);
      const filename = `${doc.major_head}_${doc.minor_head}_${doc.document_id}${ext}`;
      saveAs(blob, filename);
    } else {      window.open(url, "_blank");
    }
  };

  const downloadAllAsZip = async () => {
    if (!results.length) return;
    setZipLoading(true);
    setError("");

    const zip = new JSZip();
    let filesAdded = 0;

    for (let idx = 0; idx < results.length; idx++) {
      const doc = results[idx];
      const url = doc.file_url;
      if (!url) continue;

      const blob = await fetchBlob(url);
      if (blob) {
        const ext      = getExtension(url);
        const filename = `${doc.major_head}_${doc.minor_head}_${doc.document_id}${ext}`;
        zip.file(filename, blob);
        filesAdded++;
      }
    }

    if (filesAdded === 0) {
      setError("Could not download any files. Try downloading individually.");
      setZipLoading(false);
      return;
    }

    try {
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "documents.zip");
    } catch {
      setError("Failed to create ZIP file.");
    } finally {
      setZipLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>

      <div className="flex-shrink-0 bg-white shadow-md z-30 px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-base font-bold text-blue-900 mb-3">Search Documents</h2>

          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-end">

              {/* Major Head */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Major Head</label>
                <select
                  value={majorHead}
                  onChange={(e) => { setMajorHead(e.target.value); setMinorHead(""); }}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="Personal">Personal</option>
                  <option value="Professional">Professional</option>
                </select>
              </div>

              {/* Minor Head */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Minor Head</label>
                <select
                  value={minorHead}
                  onChange={(e) => setMinorHead(e.target.value)}
                  disabled={!majorHead}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">All</option>
                  {majorHead && MINOR_OPTIONS[majorHead].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tags</label>
                <Select
                  isMulti
                  options={tagOptions}
                  value={selectedTags}
                  onChange={(vals) => setSelectedTags(vals || [])}
                  placeholder="Filter by tags..."
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({ ...base, minHeight: "38px", fontSize: "14px" }),
                    menu:    (base) => ({ ...base, zIndex: 9999 }),
                  }}
                />
              </div>

              {/* From Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                <DatePicker
                  selected={fromDate}
                  onChange={(d) => setFromDate(d)}
                  dateFormat="dd-MM-yyyy"
                  placeholderText="Start date"
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* To Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                <DatePicker
                  selected={toDate}
                  onChange={(d) => setToDate(d)}
                  dateFormat="dd-MM-yyyy"
                  placeholderText="End date"
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2 md:col-span-3 xl:col-span-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded-lg transition-colors disabled:opacity-60 text-sm whitespace-nowrap"
                >
                  {loading ? <Spinner /> : <><Search size={15} /> Search</>}
                </button>
              </div>

            </div>
          </form>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-6xl mx-auto">

          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium">{results.length}</span> of{" "}
                <span className="font-medium">{totalCount}</span> documents
              </p>
              <button
                onClick={downloadAllAsZip}
                disabled={zipLoading}
                className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                {zipLoading ? <Spinner /> : <><Download size={14} /> Download All as ZIP</>}
              </button>
            </div>
          )}

          {/* Document cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((doc, idx) => {
              const tags = doc.tags || [];

              return (
                <div
                  key={doc.document_id || idx}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">

                    <div className="flex items-start gap-2 min-w-0">
                      <FileText size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">
                          {doc.major_head} / {doc.minor_head}
                        </p>
                        <p className="text-xs text-gray-400">ID: {doc.document_id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card details */}
                  <div className="text-sm text-gray-600 space-y-1 flex-1">
                    <p><span className="font-medium">Date:</span> {formatDate(doc.document_date)}</p>
                    <p><span className="font-medium">Uploaded by:</span> {doc.uploaded_by || "-"}</p>
                    {doc.document_remarks && (
                      <p className="text-gray-500 text-xs italic mt-1 line-clamp-2">
                        "{doc.document_remarks}"
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium py-1.5 rounded-lg transition-colors"
                    >
                      <Eye size={14} /> Preview
                    </button>
                    <button
                      onClick={() => downloadFile(doc)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium py-1.5 rounded-lg transition-colors"
                    >
                      <Download size={14} /> Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && results.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <Search size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No documents found. Use the filters above and click Search.</p>
            </div>
          )}

          {hasMore && results.length > 0 && (
            <div className="text-center mt-6 pb-4">
              <button
                onClick={() => runSearch(false)}
                disabled={loading}
                className="border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-60 text-sm"
              >
                {loading ? <Spinner dark /> : "Load More"}
              </button>
            </div>
          )}
        </div>
      </div>

      <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}

export default SearchPage;