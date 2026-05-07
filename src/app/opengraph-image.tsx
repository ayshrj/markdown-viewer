import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#F7F6F2",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: 64,
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#FBFAF7",
            border: "1px solid #D8DADD",
            borderRadius: 48,
            display: "flex",
            height: "100%",
            overflow: "hidden",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: 56,
              width: 600,
            }}
          >
            <div
              style={{
                color: "#263036",
                display: "flex",
                flexDirection: "column",
                gap: 24,
              }}
            >
              <div
                style={{
                  color: "#4D86B5",
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: 5,
                  textTransform: "uppercase",
                }}
              >
                Markdown Reader
              </div>
              <div
                style={{
                  color: "#263036",
                  fontSize: 96,
                  fontWeight: 850,
                  letterSpacing: -5,
                  lineHeight: 0.95,
                }}
              >
                {SITE_NAME}
              </div>
              <div
                style={{
                  color: "#5F666B",
                  fontSize: 32,
                  lineHeight: 1.35,
                }}
              >
                {SITE_DESCRIPTION}
              </div>
            </div>
            <div
              style={{
                color: "#5F666B",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              Multi-file sessions • Outline navigation • Math • Diagrams
            </div>
          </div>

          <div
            style={{
              alignItems: "center",
              background: "#FFFDFC",
              borderLeft: "1px solid #D8DADD",
              display: "flex",
              justifyContent: "center",
              width: 472,
            }}
          >
            <div
              style={{
                background: "#FFFDFC",
                border: "14px solid #263036",
                borderRadius: 40,
                display: "flex",
                flexDirection: "column",
                height: 390,
                justifyContent: "space-between",
                padding: 36,
                width: 330,
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    border: "8px solid #263036",
                    borderRadius: 14,
                    color: "#263036",
                    fontSize: 42,
                    fontWeight: 850,
                    padding: "10px 16px",
                  }}
                >
                  MD
                </div>
                <div
                  style={{
                    color: "#263036",
                    fontSize: 48,
                    fontWeight: 850,
                  }}
                >
                  H1
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                {[210, 240, 180, 130].map((lineWidth, index) => (
                  <div
                    key={lineWidth}
                    style={{
                      background: index === 0 ? "#4D86B5" : "#D8DADD",
                      borderRadius: 999,
                      height: 14,
                      width: lineWidth,
                    }}
                  />
                ))}
              </div>

              <div
                style={{
                  color: "#263036",
                  display: "flex",
                  fontSize: 52,
                  fontWeight: 800,
                  justifyContent: "center",
                }}
              >
                MD
                <span style={{ color: "#4D86B5" }}>Lens</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
