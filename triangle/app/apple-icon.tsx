import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        }}
      >
        <svg width={112} height={112} viewBox="0 0 24 24" fill="#60A5FA">
          <path d="M12 3 22 20H2Z" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
