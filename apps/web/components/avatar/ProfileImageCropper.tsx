"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type Point = { x: number; y: number };

type ProfileImageCropperProps = {
  file: File | null;
  isSaving?: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

export function ProfileImageCropper({ file, isSaving = false, error, onCancel, onConfirm }: ProfileImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<Point | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!file) return;

    let revokedUrl: string | null = null;
    const url = URL.createObjectURL(file);
    revokedUrl = url;
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setImageUrl(url);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.onerror = () => setLocalError("Bildet kunne ikke åpnes. Velg et annet bilde.");
    image.src = url;

    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
      imageRef.current = null;
    };
  }, [file]);

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const size = canvas.width;
    context.clearRect(0, 0, size, size);
    context.fillStyle = "#f6efe7";
    context.fillRect(0, 0, size, size);

    const baseScale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const scale = baseScale * zoom;
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const x = (size - width) / 2 + offset.x;
    const y = (size - height) / 2 + offset.y;

    context.drawImage(image, x, y, width, height);
  }, [offset, zoom]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview, imageUrl]);

  const visibleError = localError || error;

  function move(clientX: number, clientY: number) {
    const current = dragRef.current;
    if (!current) return;
    const next = { x: clientX, y: clientY };
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    dragRef.current = next;
    setOffset((value) => ({ x: value.x + dx, y: value.y + dy }));
  }

  async function handleConfirm() {
    const image = imageRef.current;
    if (!file || !image) return;

    try {
      const blob = await renderCroppedBlob(image, zoom, offset);
      const extension = blob.type === "image/webp" ? "webp" : "jpg";
      onConfirm(new File([blob], `profile-image.${extension}`, { type: blob.type }));
    } catch {
      setLocalError("Kunne ikke klargjøre bildet. Prøv igjen.");
    }
  }

  const zoomLabel = useMemo(() => `${Math.round(zoom * 100)} %`, [zoom]);

  if (!file) return null;

  return (
    <div className="profile-image-cropper" role="presentation">
      <button className="profile-image-cropper__backdrop" type="button" aria-label="Avbryt beskjæring" onClick={onCancel} disabled={isSaving} />
      <section className="profile-image-cropper__panel" role="dialog" aria-modal="true" aria-labelledby="profile-image-cropper-title">
        <div className="profile-image-cropper__handle" aria-hidden="true" />
        <h2 id="profile-image-cropper-title">Tilpass profilbildet</h2>
        <p className="profile-image-cropper__hint">Flytt bildet og zoom for å plassere ansiktet i den kvadratiske rammen.</p>
        <div
          className="profile-image-cropper__stage"
          onPointerDown={(event) => { dragRef.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={(event) => move(event.clientX, event.clientY)}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
        >
          <canvas ref={canvasRef} className="profile-image-cropper__canvas" height={OUTPUT_SIZE} width={OUTPUT_SIZE} />
        </div>
        <label className="profile-image-cropper__zoom">
          <span>Zoom ({zoomLabel})</span>
          <input min={MIN_ZOOM} max={MAX_ZOOM} step="0.01" type="range" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} disabled={isSaving} />
        </label>
        {visibleError ? <p className="profile-edit-sheet__error" role="alert">{visibleError}</p> : null}
        <div className="profile-edit-sheet__actions">
          <button className="profile-edit-sheet__button profile-edit-sheet__button--secondary" type="button" onClick={onCancel} disabled={isSaving}>Avbryt</button>
          <button className="profile-edit-sheet__button profile-edit-sheet__button--primary" type="button" onClick={() => void handleConfirm()} disabled={isSaving}>{isSaving ? "Lagrer…" : "Bruk bilde"}</button>
        </div>
      </section>
    </div>
  );
}

async function renderCroppedBlob(image: HTMLImageElement, zoom: number, offset: Point): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const baseScale = Math.max(OUTPUT_SIZE / image.naturalWidth, OUTPUT_SIZE / image.naturalHeight);
  const scale = baseScale * zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = (OUTPUT_SIZE - width) / 2 + offset.x;
  const y = (OUTPUT_SIZE - height) / 2 + offset.y;
  context.drawImage(image, x, y, width, height);

  const type = supportsWebP() ? "image/webp" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  if (!blob) throw new Error("Could not create cropped image");
  return blob;
}

function supportsWebP(): boolean {
  const canvas = document.createElement("canvas");
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}
