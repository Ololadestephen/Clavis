"use client";

import { FileUp, Type } from "lucide-react";
import { useRef, useState } from "react";

const maxFileBytes = 2 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function SecretInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"note" | "file">("note");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [fileError, setFileError] = useState("");

  return (
    <div className="secret-input">
      <div className="segmented-control" role="tablist" aria-label="Secret type">
        <button
          className={mode === "note" ? "active" : ""}
          type="button"
          onClick={() => setMode("note")}
        >
          <Type size={16} />
          Text note
        </button>
        <button
          className={mode === "file" ? "active" : ""}
          type="button"
          onClick={() => setMode("file")}
        >
          <FileUp size={16} />
          File
        </button>
      </div>

      {mode === "note" ? (
        <label>
          Private note or credential
          <textarea aria-label="Private note or credential" />
        </label>
      ) : (
        <div className="file-picker">
          <span className="file-label">Private file</span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.json,.png,.jpg,.jpeg"
            aria-label="Private file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setFileError("");
              setFileName("");
              setFileSize("");

              if (!file) return;

              if (file.size > maxFileBytes) {
                event.target.value = "";
                setFileError("Choose a file smaller than 2 MB.");
                return;
              }

              setFileName(file.name);
              setFileSize(formatBytes(file.size));
            }}
          />
          <button className="file-drop" type="button" onClick={() => inputRef.current?.click()}>
            <FileUp size={22} />
            <span>{fileName || "Choose a private file"}</span>
            <small>{fileSize || "PDF, TXT, JSON, PNG, or JPG. Max 2 MB."}</small>
          </button>
          {fileError ? <p className="field-error">{fileError}</p> : null}
        </div>
      )}
    </div>
  );
}

export { maxFileBytes };
