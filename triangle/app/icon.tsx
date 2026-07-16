import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Same triangle glyph as the Header logo badge (icons.tsx's
// TriangleLogoIcon, path "M12 3 22 20H2Z") and the "Back to Terminal"
// links throughout the site — the favicon should match, not invent a
// separate mark.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0F17",
          borderRadius: 7,
        }}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="#60A5FA">
          <path d="M12 3 22 20H2Z" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
